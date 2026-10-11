/*
 * LES FEUILLES DE MATCH, ET LE MOTEUR CONTRE LES VRAIES PARTIES.
 *
 *   1. Les égalités de la feuille, sur des splits complets (saison et
 *      séries) entre vraies équipes tirées dans tous les splits. Elles se
 *      ferment PAR CONSTRUCTION dans js/sim.js — « par construction » est une
 *      affirmation, ce script en fait une mesure :
 *        les éliminations d'une équipe = celles de ses joueurs = les morts de l'autre ;
 *        l'or d'une équipe = celui de ses joueurs ;
 *        le fil compte ce que la feuille compte (éliminations, tours, dragons…) ;
 *        jamais plus de quatre aides par élimination, ni le tueur parmi elles ;
 *        le vainqueur a fait tomber le nexus : cinq tours, un inhibiteur, après 15 min ;
 *        dans la ligue, chaque élimination est une mort.
 *
 *   2. Les repères : chaque vraie partie des shards (`matchs`) rejouée entre
 *      les deux mêmes équipes, et le moteur jugé contre ce qui s'est passé.
 *      La borne de chaque repère est l'intervalle de la mesure elle-même
 *      (deux erreurs types de part et d'autre), jamais plus serrée.
 *
 *   node scripts/check_feuilles.mjs
 */
import { creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from '../js/sim.js';
import { vraiesParties, reperes } from './lib/reperes.mjs';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, borne, verdict } from './verdict.mjs';

const splits = lireSplits();

/* 1. Les égalités. */
const fautes = {};
const faute = (nom, detail) => { (fautes[nom] ||= []).push(detail); };
let parties = 0, elims = 0, morts = 0;
const QUOI = { elim: 'k', tour: 'tours', dragon: 'dragons', heraut: 'herauts', nashor: 'barons', inhib: 'inhib' };

function verifier(f, ou) {
  parties++;
  const [A, B] = f.equipes;
  for (const [i, e] of f.equipes.entries()) {
    const autre = f.equipes[1 - i];
    if (e.k !== e.joueurs.reduce((s, j) => s + j.k, 0)) faute('éliminations de l\'équipe = celles des joueurs', ou);
    if (autre.k !== e.joueurs.reduce((s, j) => s + j.m, 0)) faute('morts d\'une équipe = éliminations de l\'autre', ou);
    if (Math.abs(e.or - e.joueurs.reduce((s, j) => s + j.or, 0)) > 1e-6 * Math.max(1, e.or)) faute('or de l\'équipe = celui des joueurs', ou);
    for (const [quoi, cle] of Object.entries(QUOI)) {
      if (f.fil.filter(x => x.quoi === quoi && x.camp === i).length !== e[cle]) faute(`le fil compte les ${cle}`, ou);
    }
    if (e.tours > 11) faute('au plus onze tours', ou);
  }
  for (const x of f.fil.filter(x => x.quoi === 'elim')) {
    if (x.aides.length > 4 || x.aides.includes(x.tueur)) faute('au plus quatre aides, jamais le tueur', ou);
  }
  const g = f.equipes[f.gagnant];
  const fin = f.fil[f.fil.length - 1];
  if (!(g.tours >= 5 && g.inhib >= 1 && f.duree >= 15 && fin.quoi === 'nexus' && fin.camp === f.gagnant)) faute('le vainqueur fait tomber le nexus', ou);
  if (!f.fil.every((x, k) => !k || x.t >= f.fil[k - 1].t)) faute('le fil suit l\'horloge', ou);
  elims += A.k + B.k;
  morts += [A, B].reduce((s, e) => s + e.joueurs.reduce((t, j) => t + j.m, 0), 0);
}

const LIGUES = 3, EQUIPES = 10;
let seriesFautives = 0, champions = 0;
for (let l = 0; l < LIGUES && splits.length; l++) {
  const L = creerSplit(ligueDEssai(splits, EQUIPES, 82 + l), { graine: 1000 + l, rondes: 2, bo: 1 });
  while (jouerJournee(L));
  creerSeries(L);
  while (jouerRonde(L));
  const toutes = [...L.journees.flat(), ...L.series.rondes.flat()];
  for (const s of toutes) {
    s.parties.forEach((p, k) => verifier(p.feuille, `ligue ${l}, ${s.cle}-${k}`));
    const besoin = Math.ceil(s.bo / 2);
    if (Math.max(...s.v) !== besoin || s.v[0] + s.v[1] !== s.parties.length || s.gagnant !== (s.v[0] > s.v[1] ? s.a : s.b)) seriesFautives++;
  }
  const rangs = classement(L);
  if (rangs.reduce((s, r) => s + r.v, 0) !== L.journees.flat().length || rangs.some(r => r.v + r.d !== 2 * (EQUIPES - 1))) seriesFautives++;
  if (L.series.champion !== null && L.series.rondes.length === 3) champions++;
}
for (const nom of ['éliminations de l\'équipe = celles des joueurs', 'morts d\'une équipe = éliminations de l\'autre', 'or de l\'équipe = celui des joueurs',
  ...Object.values(QUOI).map(c => `le fil compte les ${c}`), 'au plus onze tours', 'au plus quatre aides, jamais le tueur', 'le vainqueur fait tomber le nexus', 'le fil suit l\'horloge']) {
  exiger(nom, !fautes[nom], fautes[nom] ? `${fautes[nom].length} feuille(s), dont ${fautes[nom][0]}` : `${parties} parties`);
}
exiger('dans la ligue, chaque élimination est une mort', elims === morts, `${elims} éliminations, ${morts} morts`);
exiger('chaque série finit à sa dernière victoire, chaque équipe joue ses 18', !seriesFautives, `${seriesFautives} écart(s)`);
exiger('les séries couronnent un champion', champions === LIGUES, `${champions} sur ${LIGUES}`);

/* 2. Les repères : les vraies parties, rejouées (scripts/lib/reperes.mjs). */
const vraies = vraiesParties(splits);
exiger('les shards portent leurs parties (`matchs`)', vraies.length > 0, vraies.length ? `${vraies.length} parties` : 'relance l\'Action « Bâtir les splits »');
for (const r of vraies.length ? reperes(vraies) : []) borne(r.nom, r.sim, r.min, r.max);

verdict('Les feuilles de match');
