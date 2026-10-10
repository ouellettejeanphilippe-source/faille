/*
 * LE ROGUE, MESURÉ EN PAIRES (la règle de Cap 82-0). Une carte, un palier de
 * coach, un repêchage se mesurent ainsi : la même ligue de dix vraies équipes
 * jouée sous la même graine, l'effet donné aux équipes paires (passe A) puis
 * aux impaires (passe B). Pour chaque équipe, ses victoires avec l'effet moins
 * ses victoires sans : la force des équipes s'annule, il reste l'effet.
 *
 * La forme (la durée, les éliminations, les tours, les objectifs neutres) se
 * lit sur les parties d'une équipe traitée contre une équipe qui ne l'est pas,
 * comparées aux mêmes parties dans une troisième passe où personne n'a rien.
 *
 * Les bornes, par saison de 18 parties :
 *   une carte rapporte au plus MAX_V[rareté] victoires, dans un sens ou l'autre ;
 *   une rare, une légendaire et un coach au palier III se VOIENT sur la feuille :
 *     ±1 min de durée, ou ±2 éliminations, ou ±0,6 tour, ou ±0,3 objectif par
 *     partie, ou ±0,3 objectif de plus pour elle que pour l'adversaire ;
 *   le repêchage automatique (les bannissements des deux côtés) ne penche pas :
 *     ±MAX_V.commune.
 *
 * Et les invariants : sans effet, les deux passes sont identiques ; la
 * composition de référence est celle des vraies équipes ; les packs rejouent ;
 * les jetons se recomptent.
 *
 *   node scripts/check_rogue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerSplit, jouerJournee, creerSeries, jouerRonde } from '../js/sim.js';
import { REFERENCE, choixParDefaut, classesDe, effetsDuRepechage, effetsDeComposition, repecher } from '../js/repechage.js';
import { CARTES, COACHS, PACKS, JETONS, couleurDe, nouveauRogue, ouvrirPack, prixDuPack, jetonsDe, effetsDeToi, basculer, engager, noterJoue, confiance } from '../js/rogue.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { classes } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/champions.json'), 'utf8'));
const splits = lireSplits();
const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

const LIGUES = 12, EQUIPES = 10;
const MAX_V = { commune: 0.6, peu: 1, rare: 1.5, legendaire: 2.5 };
const VISIBLE = { duree: 1, k: 2, tours: 0.6, objectifs: 0.3, nosObjectifs: 0.3 };
const ligues = Array.from({ length: LIGUES }, (_, l) => ligueDEssai(splits, EQUIPES, 500 + l));

/*
 * Une passe : la ligue `l`, `traitee(i)` dit si l'équipe i porte l'effet.
 * `effet` : une source sur les canaux (portée par l'équipe), ou `serie` :
 * (L, s, traitees) → pose s.effets avant la journée (le repêchage).
 */
function passe(l, traitee, { effet = null, serie = null }) {
  const L = creerSplit(ligues[l].map((e, i) => (effet && traitee(i) ? { ...e, effets: effet } : e)), { graine: 7000 + l, rondes: 2, bo: 1 });
  while (L.jour < L.journees.length) {
    if (serie) for (const s of L.journees[L.jour]) serie(L, s, traitee);
    jouerJournee(L);
  }
  return L;
}
const victoires = L => L.equipes.map((_, i) => L.journees.flat().filter(s => s.gagnant === i).length);
const objectifs = e => e.dragons + e.barons + e.herauts;
/* Le profil d'une partie ; `nous` : le côté de l'équipe traitée. */
const profil = (f, nous) => ({
  duree: f.duree, k: f.equipes[0].k + f.equipes[1].k, tours: f.equipes[0].tours + f.equipes[1].tours,
  objectifs: objectifs(f.equipes[0]) + objectifs(f.equipes[1]), nosObjectifs: objectifs(f.equipes[nous]) - objectifs(f.equipes[1 - nous]),
});

/** ΔV moyen (par saison de 18), et l'écart de forme contre les équipes non traitées. */
function mesurer(opts) {
  const dv = [], forme = Object.fromEntries(Object.keys(VISIBLE).map(c => [c, []]));
  for (let l = 0; l < LIGUES; l++) {
    const pair = i => i % 2 === 0, impair = i => i % 2 === 1;
    const A = passe(l, pair, opts), B = passe(l, impair, opts), O = passe(l, () => false, {});
    const vA = victoires(A), vB = victoires(B);
    vA.forEach((_, i) => dv.push(pair(i) ? vA[i] - vB[i] : vB[i] - vA[i]));
    // La forme : passe A, une équipe paire contre une impaire, partie pour partie contre la passe neutre.
    A.journees.flat().forEach((s, k) => {
      if (pair(s.a) === pair(s.b)) return;
      const o = O.journees.flat()[k];
      s.parties.forEach((p, n) => {
        const nous = pair(p.bleu) ? 0 : 1;
        const x = profil(p.feuille, nous), y = profil(o.parties[n].feuille, nous);
        for (const c of Object.keys(forme)) forme[c].push(x[c] - y[c]);
      });
    });
  }
  return { dv: moyenne(dv), forme: Object.fromEntries(Object.entries(forme).map(([c, xs]) => [c, moyenne(xs)])) };
}
const voit = f => Object.entries(VISIBLE).some(([c, s]) => Math.abs(f[c]) >= s);
const ecrire = f => `durée ${f.duree.toFixed(2)} min, élim. ${f.k.toFixed(2)}, tours ${f.tours.toFixed(2)}, objectifs ${f.objectifs.toFixed(2)} (les siens ${f.nosObjectifs.toFixed(2)})`;

if (splits.length) {
  /* Le témoin : sans effet, les passes sont identiques. */
  const temoin = mesurer({ effet: null });
  exiger('sans effet, les deux passes sont identiques', temoin.dv === 0 && Object.values(temoin.forme).every(x => x === 0), `ΔV ${temoin.dv}`);

  /* Les cartes. */
  for (const [id, [ico, nom, rarete, eff]] of Object.entries(CARTES)) {
    const m = mesurer({ effet: eff });
    borne(`${ico} ${nom} (${rarete}) : victoires de plus par saison`, m.dv, -MAX_V[rarete], MAX_V[rarete]);
    if (rarete === 'rare' || rarete === 'legendaire') exiger(`${ico} ${nom} se voit sur la feuille`, voit(m.forme), ecrire(m.forme));
    else informer(`${ico} ${nom} : la forme`, `${ecrire(m.forme)} · coach : ${couleurDe(id) || 'neutre'}`);
  }

  /* Les coachs, au palier III, sans carte. */
  for (const [id, co] of Object.entries(COACHS)) {
    const m = mesurer({ effet: co.paliers[2] });
    borne(`${co.ico} ${co.nom} au palier III : victoires de plus`, m.dv, -MAX_V.legendaire, MAX_V.legendaire);
    exiger(`${co.ico} ${co.nom} au palier III se voit sur la feuille`, voit(m.forme), ecrire(m.forme));
    const cartes = Object.keys(CARTES).filter(c => couleurDe(c) === id);
    exiger(`${co.ico} ${co.nom} a au moins deux cartes de sa couleur`, cartes.length >= 2, cartes.join(', '));
  }

  /* Le repêchage. */
  const eqs = splits.flatMap(s => [...s.equipes.values()]);
  const ref = {};
  for (const e of eqs) for (const [k, v] of Object.entries(classesDe(choixParDefaut(e, new Set()), classes))) ref[k] = (ref[k] || 0) + v / eqs.length;
  exiger('la composition de référence est celle des vraies équipes', Object.keys(REFERENCE).every(k => Math.abs(ref[k] - REFERENCE[k]) < 0.02),
    Object.entries(ref).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', '));
  // Deux joueurs d'une équipe ne prennent pas le même champion : le second perd un peu, et c'est rare.
  const doublons = eqs.filter(e => Object.values(effetsDuRepechage(e, choixParDefaut(e, new Set()), classes).confort).some(x => x !== 0));
  borne('sans bannissement, la part des équipes dont un joueur perd du confort', doublons.length / eqs.length, 0, 0.1);
  // Une classe de plus que la moyenne, toutes les autres à la moyenne : la forme qu'elle donne.
  for (const cl of Object.keys(REFERENCE)) {
    const c = classesDe({}, classes);
    for (const k of Object.keys(REFERENCE)) c[k] = REFERENCE[k] + (k === cl ? 1 : 0);
    const m = mesurer({ effet: effetsDeComposition(c) });
    borne(`un ${cl} de plus au repêchage : victoires de plus`, m.dv, -MAX_V.commune, MAX_V.commune);
    informer(`un ${cl} de plus : la forme`, ecrire(m.forme));
  }
  // Le repêchage automatique, des deux côtés, dans chaque série où joue une équipe traitée.
  const auto = (L, s, traitee) => {
    if (traitee(s.a)) repecher(L, s, classes, { toi: s.a });
    else if (traitee(s.b)) repecher(L, s, classes, { toi: s.b });
  };
  const m = mesurer({ serie: auto });
  borne('le repêchage automatique ne penche pas : victoires de plus', m.dv, -MAX_V.commune, MAX_V.commune);
  informer('le repêchage automatique : la forme', ecrire(m.forme));
  // Les bannissements seuls : l'équipe traitée bannit, l'adversaire ne bannit rien.
  const bansSeuls = (L, s, traitee) => {
    const toi = traitee(s.a) ? s.a : traitee(s.b) ? s.b : null;
    if (toi === null) return;
    const lui = s.a === toi ? s.b : s.a;
    repecher(L, s, classes, { toi, mesChoix: choixParDefaut(L.equipes[toi], new Set()) });
    const choix = choixParDefaut(L.equipes[lui], new Set(s.repechage.bans));
    const eff = effetsDuRepechage(L.equipes[lui], choix, classes);
    s.effets = s.a === toi ? [null, eff] : [eff, null];
  };
  const b = mesurer({ serie: bansSeuls });
  borne('trois bannissements valent quelque chose, sans tout décider', b.dv, 0.2, MAX_V.rare);
  informer('les bannissements seuls : la forme', ecrire(b.forme));
}

/* Les packs et les jetons. */
const ids = Object.keys(CARTES);
exiger('chaque carte a sa rareté et ses canaux', ids.every(id => CARTES[id][2] in MAX_V && Object.keys(CARTES[id][3]).length));
exiger('les chances de chaque pack font 100', Object.values(PACKS).every(p => Object.values(p.cotes).reduce((s, x) => s + x, 0) === 100));
const ouvrir = graine => {
  const R = nouveauRogue(graine);
  R.achats.push({ quoi: 'don', prix: -1000 });
  const sorties = [];
  for (let k = 0; k < 12; k++) sorties.push(ouvrirPack(null, R, ['bronze', 'argent', 'or'][k % 3]));
  return { R, sorties };
};
const o1 = ouvrir(42), o2 = ouvrir(42), o3 = ouvrir(43);
exiger('la même graine ouvre les mêmes packs', JSON.stringify(o1.sorties) === JSON.stringify(o2.sorties));
exiger('une autre graine, d\'autres packs', JSON.stringify(o1.sorties) !== JSON.stringify(o3.sorties));
exiger('une carte ne se tire qu\'une fois', new Set(o1.R.cartes).size === o1.R.cartes.length, `${o1.R.cartes.length} cartes sur ${ids.length}`);
exiger('chaque pack hausse le suivant', prixDuPack(o1.R, 'bronze') > PACKS.bronze.prix, `${PACKS.bronze.prix} → ${prixDuPack(o1.R, 'bronze')} jetons après 12 packs`);
const pauvre = nouveauRogue(1);
exiger('sans les jetons, pas de pack', ouvrirPack(null, pauvre, 'or') === null && !pauvre.achats.length, `${jetonsDe(null, pauvre)} jetons au départ`);

if (splits.length) {
  // Une ligue jouée avec ton cinq : les jetons se recomptent des résultats.
  const R = nouveauRogue(9);
  R.achats.push({ quoi: 'don', prix: -100 });
  const L = creerSplit([...ligues[0]], { graine: 9, rondes: 2, bo: 1 });
  ouvrirPack(L, R, 'bronze');
  basculer(R, R.cartes[0]);
  engager(L, R, couleurDe(R.cartes[0]) || 'stratege');
  while (L.jour < L.journees.length) {
    L.equipes[0] = { ...L.equipes[0], effets: effetsDeToi(R) };
    jouerJournee(L);
    noterJoue(R, 1);
  }
  creerSeries(L);
  while (jouerRonde(L));
  const tes = [...L.journees.flat(), ...L.series.rondes.flat()].filter(s => s.a === 0 || s.b === 0);
  const v = tes.filter(s => s.gagnant === 0).length;
  const rondes = L.series.rondes.flat().filter(s => s.gagnant === 0).length;
  const attendu = JETONS.depart + v * JETONS.victoire + (tes.length - v) * JETONS.defaite + rondes * JETONS.ronde - R.achats.reduce((s, a) => s + a.prix, 0);
  exiger('les jetons se recomptent des résultats et des achats', jetonsDe(L, R) === attendu, `${jetonsDe(L, R)} jetons, ${v} séries gagnées sur ${tes.length}`);
  exiger('la confiance du coach suit les séries jouées à sa couleur', confiance(R).palier === (couleurDe(R.plan[0]) === R.coach.id ? 3 : 0), `${confiance(R).series} séries, palier ${confiance(R).palier}`);
}

verdict('Le rogue, en paires');
