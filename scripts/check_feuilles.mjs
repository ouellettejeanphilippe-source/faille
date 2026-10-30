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
 *      Et la partie comme une vraie (js/moteur.js) se tient d'un bout à l'autre :
 *        un mort ne tue, n'aide ni ne meurt avant sa réapparition ;
 *        un sort d'invocateur ne resert pas avant sa recharge ;
 *        une ligne tombe dans l'ordre (l'extérieure, l'intérieure, celle de
 *        l'inhibiteur, l'inhibiteur), les tours du nexus quand un inhibiteur
 *        est à terre, le nexus après elles ; un inhibiteur ne retombe qu'après
 *        avoir repoussé ; cinq plaques au plus par tour, avant 14:00 ;
 *        un doublé (un triplé…) suit l'élimination d'avant du même tueur ;
 *        les niveaux de 1 à 18, les monstres de l'époque seulement.
 *
 *   2. Les repères : chaque vraie partie des shards (`matchs`) rejouée entre
 *      les deux mêmes équipes, et le moteur jugé contre ce qui s'est passé.
 *      La borne de chaque repère est l'intervalle de la mesure elle-même
 *      (deux erreurs types de part et d'autre), jamais plus serrée.
 *
 *   node scripts/check_feuilles.mjs
 */
import { creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from '../js/sim.js';
import { SORTS, regles } from '../js/moteur.js';
import { LIGNES_FIN } from '../js/canaux.js';
import { vraiesParties, reperes } from './lib/reperes.mjs';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, borne, verdict } from './verdict.mjs';

const splits = lireSplits();

/* 1. Les égalités. */
const fautes = {};
const faute = (nom, detail) => { (fautes[nom] ||= []).push(detail); };
let parties = 0, elims = 0, morts = 0;
const QUOI = { elim: 'k', tour: 'tours', dragon: 'dragons', heraut: 'herauts', nashor: 'barons', inhib: 'inhib', plaque: 'plaques', atakhan: 'atakhan' };

function verifier(f, ou) {
  parties++;
  const [A, B] = f.equipes;
  for (const [i, e] of f.equipes.entries()) {
    const autre = f.equipes[1 - i];
    if (e.k !== e.joueurs.reduce((s, j) => s + j.k, 0)) faute('éliminations de l\'équipe = celles des joueurs', ou);
    if (autre.k !== e.joueurs.reduce((s, j) => s + j.m, 0)) faute('morts d\'une équipe = éliminations de l\'autre', ou);
    if (Math.abs(e.or - e.joueurs.reduce((s, j) => s + j.or, 0)) > 1e-6 * Math.max(1, e.or)) faute('or de l\'équipe = celui des joueurs', ou);
    for (const [quoi, cle] of Object.entries(QUOI)) {
      if (e[cle] !== undefined && f.fil.filter(x => x.quoi === quoi && x.camp === i).length !== e[cle]) faute(`le fil compte les ${cle}`, ou);
    }
    if (e.larves !== undefined && f.fil.filter(x => x.quoi === 'larves' && x.camp === i).reduce((s, x) => s + x.n, 0) !== e.larves) faute('le fil compte les larves', ou);
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
  if (f.moteur === 2) verifierV2(f, ou);
}

/* La partie comme une vraie (js/moteur.js) : ce que le fil raconte se tient. */
const V2 = ['un mort ne joue pas avant sa réapparition', 'un sort ne resert pas avant sa recharge', 'une ligne tombe dans l\'ordre, le nexus en dernier',
  'un inhibiteur ne retombe qu\'après avoir repoussé', 'cinq plaques au plus par tour, avant 14:00', 'un doublé suit l\'élimination d\'avant du même tueur',
  'les niveaux de 1 à 18, les sbires et les sorts de chacun', 'les monstres de l\'époque seulement'];
function verifierV2(f, ou) {
  const X = regles(f.annee);
  const mortJusqua = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  const pret = f.equipes.map(e => e.joueurs.map(j => j.sorts.map(() => 0)));
  const sort = (c, i, s, t) => {
    const k = f.equipes[c].joueurs[i].sorts.indexOf(s);
    if (k < 0 || pret[c][i][k] > t + 1e-9) faute(V2[1], `${ou} à ${t.toFixed(2)}`);
    else pret[c][i][k] = t + SORTS[s][2](X.annee) / 60;
  };
  const tombees = [{ haut: 0, milieu: 0, bas: 0 }, { haut: 0, milieu: 0, bas: 0 }], inhib = [{}, {}], nexusTours = [0, 0], plaques = [{}, {}];
  const dernier = new Map();
  for (const x of f.fil) {
    const t = x.t, c = x.camp;
    if (x.quoi === 'elim') {
      for (const i of [x.tueur, ...x.aides]) if (mortJusqua[c][i] > t + 1e-9) faute(V2[0], `${ou} à ${t.toFixed(2)}`);
      if (mortJusqua[1 - c][x.victime] > t + 1e-9 || !(x.retour > 0)) faute(V2[0], `${ou} à ${t.toFixed(2)}`);
      mortJusqua[1 - c][x.victime] = t + x.retour;
      for (const [cs, i, s] of x.sorts) sort(cs, i, s, t);
      const cle = `${c}-${x.tueur}`, avant = dernier.get(cle);
      if (x.multi && !(avant && avant.multi === x.multi - 1 && t - avant.t <= (x.multi === 5 ? 0.5 : 1 / 6) + 1e-9)) faute(V2[5], `${ou} à ${t.toFixed(2)}`);
      dernier.set(cle, { t, multi: x.multi || 1 });
    } else if (x.quoi === 'fuite') sort(c, x.i, x.sort, t);
    else if (x.quoi === 'tp') sort(c, x.i, 'T', t);
    else if (x.quoi === 'tour') {
      const eux = 1 - c;
      if (x.ligne) { if (x.palier !== tombees[eux][x.ligne]++) faute(V2[2], ou); }
      else if (x.palier !== 3 || !Object.values(inhib[eux]).some(v => v === 'bas') || nexusTours[eux]++ >= 2) faute(V2[2], ou);
    } else if (x.quoi === 'inhib') {
      if (tombees[1 - c][x.ligne] < 3) faute(V2[2], ou);
      if (inhib[1 - c][x.ligne] === 'bas') faute(V2[3], ou);
      inhib[1 - c][x.ligne] = 'bas';
    } else if (x.quoi === 'repousse') {
      if (inhib[c][x.ligne] !== 'bas') faute(V2[3], ou);
      inhib[c][x.ligne] = 'debout';
    } else if (x.quoi === 'plaque') {
      plaques[1 - c][x.ligne] = (plaques[1 - c][x.ligne] || 0) + 1;
      if (plaques[1 - c][x.ligne] > 5 || t >= LIGNES_FIN || !X.plaque) faute(V2[4], ou);
    } else if (x.quoi === 'nexus') {
      if (nexusTours[1 - c] < 2) faute(V2[2], ou);
    }
    if ((x.quoi === 'heraut' && !X.heraut) || (x.quoi === 'larves' && !X.larves) || (x.quoi === 'atakhan' && !X.atakhan)
      || (x.quoi === 'dragon' && x.type && x.type !== 'ancestral' && !(X.types || []).includes(x.type)) || (x.quoi === 'dragon' && x.ancestral && !X.ancestral)) faute(V2[7], ou);
  }
  for (const e of f.equipes) {
    for (const j of e.joueurs) if (!(j.niv >= 1 && j.niv <= 18) || !(j.cs >= 0) || j.sorts.length !== 2 || j.sorts.some(s => !SORTS[s])) faute(V2[6], ou);
  }
  if (f.niveaux.length !== f.courbe.length || f.sbires.length !== f.courbe.length) faute(V2[6], ou);
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
  ...Object.values(QUOI).map(c => `le fil compte les ${c}`), 'le fil compte les larves', 'au plus onze tours', 'au plus quatre aides, jamais le tueur', 'le vainqueur fait tomber le nexus', 'le fil suit l\'horloge', ...V2]) {
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
