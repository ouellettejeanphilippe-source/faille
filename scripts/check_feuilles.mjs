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
import { jouerPartie, creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from '../js/sim.js';
import { graineDe } from '../js/hasard.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const splits = lireSplits();
const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const et = xs => { const m = moyenne(xs); return Math.sqrt(moyenne(xs.map(x => (x - m) ** 2))); };

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

/* 2. Les repères : les vraies parties, rejouées. */
const REJOUER = 8;
const vraies = splits.flatMap(({ split, tempo, equipes }) => split.matchs?.map((l, k) => ({ l, k, tempo, id: split.id, a: equipes.get(l[0]), b: equipes.get(l[1]) })) ?? [])
  .filter(x => x.a && x.b && x.l[3] !== null && x.l[2] !== null);
exiger('les shards portent leurs parties (`matchs`)', vraies.length > 0, vraies.length ? `${vraies.length} parties` : 'relance l\'Action « Bâtir les splits »');

if (vraies.length) {
  const combat = e => moyenne(Object.values(e.cinq).map(j => j.valeur));
  const PALIERS = [0, 0.1, 0.2, 0.4, Infinity];
  const reel = { duree: [], k: [], bleu: [], fav: PALIERS.slice(1).map(() => []), toursG: [], toursP: [], ecartOr: [], dragons: [], nashor: [] };
  const sim = structuredClone(reel);
  const mesurer = (o, f, x) => {
    // f : [durée, gagnant (0 bleu), k[2], or[2], tours[2], dragons[2], nashor[2]] ; null quand non mesuré.
    const [duree, g, k, or, tours, dragons, nashor] = f;
    o.duree.push(duree / x.tempo.duree);
    o.bleu.push(g === 0 ? 1 : 0);
    const ecart = combat(x.a) - combat(x.b);
    if (ecart) o.fav[PALIERS.findIndex((p, i) => Math.abs(ecart) >= p && Math.abs(ecart) < PALIERS[i + 1])].push((ecart > 0) === (g === 0) ? 1 : 0);
    if (k) o.k.push(k[0] + k[1]);
    if (or && or[0] + or[1] > 0) o.ecartOr.push(Math.abs(or[0] - or[1]) / ((or[0] + or[1]) / 2));
    if (tours) { o.toursG.push(tours[g]); o.toursP.push(tours[1 - g]); }
    if (dragons) o.dragons.push(dragons[0] + dragons[1]);
    if (nashor) o.nashor.push(nashor[0] + nashor[1]);
  };
  const paire = (l, i) => (l[i] === null || l[i + 1] === null ? null : [l[i], l[i + 1]]);
  for (const x of vraies) {
    const { l } = x;
    const reelle = [l[2], l[3] === 1 ? 0 : 1, paire(l, 4), paire(l, 6), paire(l, 8), paire(l, 10), paire(l, 12)];
    mesurer(reel, reelle, x);
    for (let n = 0; n < REJOUER; n++) {
      const f = jouerPartie(x.a, x.b, graineDe(n, `${x.id}-${x.k}`));
      const E = f.equipes, deux = cle => [E[0][cle], E[1][cle]];
      // Le moteur se mesure là où la vraie partie l'a été : mêmes colonnes absentes.
      mesurer(sim, [f.duree, f.gagnant, reelle[2] && deux('k'), reelle[3] && deux('or'), reelle[4] && deux('tours'), reelle[5] && deux('dragons'), reelle[6] && deux('barons')], x);
    }
  }
  const juger = (nom, r, s) => {
    if (!r.length) { informer(nom, 'non mesuré'); return; }
    const marge = 2 * et(r) / Math.sqrt(r.length);
    borne(`${nom} (réel ${moyenne(r).toFixed(3)}, ${r.length} parties)`, moyenne(s), moyenne(r) - marge, moyenne(r) + marge);
  };
  juger('durée, sur celle de l\'époque', reel.duree, sim.duree);
  // L'écart type d'un écart type mesuré sur n parties : σ / √(2n).
  const margeEt = 2 * et(reel.duree) / Math.sqrt(2 * reel.duree.length);
  borne('écart type de la durée, sur celle de l\'époque', et(sim.duree), et(reel.duree) - margeEt, et(reel.duree) + margeEt);
  juger('éliminations par partie', reel.k, sim.k);
  juger('victoires du côté bleu', reel.bleu, sim.bleu);
  PALIERS.slice(1).forEach((p, i) => juger(`le favori des cotes gagne, écart de ${PALIERS[i]} à ${p}`, reel.fav[i], sim.fav[i]));
  juger('tours du gagnant', reel.toursG, sim.toursG);
  juger('tours du perdant', reel.toursP, sim.toursP);
  juger('écart d\'or final, sur l\'or moyen', reel.ecartOr, sim.ecartOr);
  juger('dragons par partie', reel.dragons, sim.dragons);
  juger('Nashor par partie', reel.nashor, sim.nashor);
}

verdict('Les feuilles de match');
