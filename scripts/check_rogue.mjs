/*
 * LE ROGUE, MESURÉ EN PAIRES (la règle de Cap 82-0). Un adjoint, un pouvoir du
 * coach, un lien, un repêchage se mesurent ainsi : la même ligue de dix vraies équipes
 * jouée sous la même graine, l'effet donné aux équipes paires (passe A) puis
 * aux impaires (passe B). Pour chaque équipe, ses victoires avec l'effet moins
 * ses victoires sans : la force des équipes s'annule, il reste l'effet.
 *
 * La forme (la durée, les éliminations, les tours, les objectifs neutres) se
 * lit sur les parties d'une équipe traitée contre une équipe qui ne l'est pas,
 * comparées aux mêmes parties dans une troisième passe où personne n'a rien.
 *
 * Les bornes, par saison de 18 parties :
 *   un lien rapporte au plus MAX_V[rareté] victoires, dans un sens ou l'autre ;
 *   un pouvoir de coach, MAX_V.rare (grandi d'un talent, MAX_V.legendaire), et le coach
 *   entier (ses trois), MAX_V.legendaire ; le personnage complet (niveau 5, deux
 *   talents) a le droit de peser plus, jusqu'à PERSONNAGE_MAX : c'est la récompense
 *   d'une run qui a duré (Cap 82-0) ;
 *   un pouvoir joue dans 25 à 75 % des parties, et se VOIT dans celles où il joue ;
 *   un adjoint (js/adjoints.js, la V22 de Cap 82-0) est un style : un gain et un prix,
 *     deux par coach ; posté à chaque partie, puis ramené à la part des parties qu'une
 *     carte peut jouer (son séjour en synergie, puis son repos), il reste sous la borne
 *     d'une peu commune de Cap 82-0 ramenée à un split (ADJOINT_V), cadeau comme piège,
 *     et il se voit sur sa signature ;
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
import { banc } from './lib/paires.mjs';
import { REFERENCE, choixParDefaut, classesDe, effetsDuRepechage, effetsDeComposition, repecher } from '../js/repechage.js';
import { COACHS, JETONS, LIENS, liensDe, nouveauRogue, jetonsDe, effetsDeToi, pouvoirsDuPersonnage, noterJoue } from '../js/rogue.js';
import { ADJOINTS, SEJOUR_SYNERGIE, REPOS } from '../js/adjoints.js';
import { objectifsDe, OBJECTIF, ELAN } from '../js/gestion.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { classes } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/champions.json'), 'utf8'));
const splits = lireSplits();

const LIGUES = 12, EQUIPES = 10;
const MAX_V = { commune: 0.6, peu: 1, rare: 1.5, legendaire: 2.5 };
const PERSONNAGE_MAX = 4;
/* Un adjoint : la borne d'une peu commune de Cap 82-0 (±1,5 V sur 82), ramenée à un split, et la part des parties qu'il peut jouer. */
const ADJOINT_V = (1.5 * 18) / 82, PART = SEJOUR_SYNERGIE / (SEJOUR_SYNERGIE + REPOS);
// Le banc de mesure (scripts/lib/paires.mjs) : les mêmes ligues et les mêmes graines qu'avant, la passe neutre jouée une fois.
const { ligues, mesurer } = splits.length ? banc(splits, LIGUES) : { ligues: [], mesurer: null };
const ecrire = f => `durée ${f.duree.toFixed(2)} min, élim. ${f.k.toFixed(2)}, tours ${f.tours.toFixed(2)}, objectifs ${f.objectifs.toFixed(2)} (les siens ${f.nosObjectifs.toFixed(2)})`;

if (splits.length) {
  /* Le témoin : sans effet, les passes sont identiques. */
  const temoin = mesurer({ effet: null });
  exiger('sans effet, les deux passes sont identiques', temoin.dv === 0 && Object.values(temoin.forme).every(x => x === 0), `ΔV ${temoin.dv}`);

  /*
   * LES ADJOINTS : chacun un style — un canal qui donne, un qui coûte —, deux par coach ; posté à chaque partie,
   * puis ramené à la part des parties qu'une carte peut jouer, sous ADJOINT_V ; et chacun se voit sur sa signature.
   */
  const RELATIFS = new Set(['ligne', 'combat', 'objectifs', 'dragons', 'heraut', 'nashor', 'split', 'tardif']);
  const pasStyle = Object.entries(ADJOINTS).filter(([, A]) => !A.ico || !A.nom || !A.style || !A.dit || /\d/.test(A.dit) || !COACHS[A.voie]
    || !Object.entries(A.effet).some(([c, v]) => RELATIFS.has(c) && v > 0) || !Object.entries(A.effet).some(([c, v]) => RELATIFS.has(c) && v < 0) || 'heraut' in A.effet).map(([k]) => k);
  const parCoach = Object.keys(COACHS).map(co => Object.values(ADJOINTS).filter(A => A.voie === co).length);
  exiger('chaque adjoint est un style : un gain, un prix (jamais en héraut), une réplique sans chiffre ; deux par coach', !pasStyle.length && parCoach.every(n => n === 2), pasStyle.join(', ') || `${Object.keys(ADJOINTS).length} adjoints, ${parCoach.join('/')} par coach`);
  const SIGNE_ADJOINT = {
    plongee: ['k', 1], escarmouches: ['k', 0.8], dragons: ['nos_dragons', 0.25], vision: ['k', -0.8],
    tardif: ['duree', 0.4], ferme: ['k', -0.8], ingenieur: ['nos_tours', 0.4], finisseur: ['duree', -0.4],
  };
  for (const [id, A] of Object.entries(ADJOINTS)) {
    const m = mesurer({ effet: A.effet });
    borne(`${A.ico} ${A.nom} : victoires de plus par split, à la part des parties qu'il peut jouer`, m.dv * PART, -ADJOINT_V, ADJOINT_V);
    const [cle, seuil] = SIGNE_ADJOINT[id];
    exiger(`${A.ico} ${A.nom} se voit : ${cle}`, Math.sign(m.forme[cle]) === Math.sign(seuil) && Math.abs(m.forme[cle]) >= Math.abs(seuil), `${m.forme[cle].toFixed(2)} par partie où il est en poste (au moins ${seuil})`);
  }

  /* Les liens d'origine, comme des cartes de leur rareté. */
  for (const [ico, nom, rarete, eff] of Object.values(LIENS)) {
    const m = mesurer({ effet: eff });
    borne(`${ico} ${nom} (${rarete}) : victoires de plus par saison`, m.dv, -MAX_V[rarete], MAX_V[rarete]);
    informer(`${ico} ${nom} : la forme`, ecrire(m.forme));
  }

  /*
   * Les coachs : chaque pouvoir seul, puis les trois ensemble (le palier III), sans carte. Un pouvoir ne frappe
   * qu'une phase : il se voit sur SA signature, les parties où il joue.
   */
  const SIGNE_POUVOIR = {
    traque: ['k', 0.5], curee: ['duree', -0.5], carnage: ['k', 0.5],
    controle: ['nos_dragons', 0.25], vision: ['nos_herauts', 0.1], baron: ['nos_barons', 0.15],
    ferme: ['k', -0.5], endurance: ['duree', 0.5], dernierMot: ['k', 0.5],
    siege: ['nos_tours', 0.3], beton: ['nos_herauts', 0.1], percee: ['duree', -0.5],
  };
  for (const [id, co] of Object.entries(COACHS)) {
    for (const x of co.pouvoirs) {
      const m = mesurer({ pouvoirs: [x], pouvoir: x.id });
      borne(`${co.ico} ${x.nom} (${x.condition}) : victoires de plus`, m.dv, -MAX_V.rare, MAX_V.rare);
      borne(`${co.ico} ${x.nom} : la part des parties où il joue`, m.joue, 0.25, 0.75);
      const [cle, seuil] = SIGNE_POUVOIR[x.id];
      exiger(`${co.ico} ${x.nom} se voit les parties où il joue : ${cle}`, Math.sign(m.forme[cle]) === Math.sign(seuil) && Math.abs(m.forme[cle]) >= Math.abs(seuil), `${m.forme[cle].toFixed(2)} par partie (au moins ${seuil})`);
    }
    const m = mesurer({ pouvoirs: co.pouvoirs });
    borne(`${co.ico} ${co.nom}, ses trois pouvoirs : victoires de plus`, m.dv, -MAX_V.legendaire, MAX_V.legendaire);
    informer(`${co.ico} ${co.nom}, ses trois pouvoirs : la forme`, ecrire(m.forme));
    // Un talent : le pouvoir grandi reste sous la borne d'une légendaire, et se voit encore.
    for (const x of pouvoirsDuPersonnage(id, 5, co.pouvoirs.map(p => p.id))) {
      const t = mesurer({ pouvoirs: [x], pouvoir: x.id });
      borne(`${co.ico} ${x.nom}, grandi d'un talent : victoires de plus`, t.dv, -MAX_V.legendaire, MAX_V.legendaire);
      const [cle, seuil] = SIGNE_POUVOIR[x.id];
      exiger(`${co.ico} ${x.nom}, grandi, se voit encore : ${cle}`, Math.abs(t.forme[cle]) >= Math.abs(seuil), `${t.forme[cle].toFixed(2)} par partie`);
    }
    // Le personnage complet : niveau 5, deux talents (sur les deux premiers pouvoirs).
    const plein = mesurer({ pouvoirs: pouvoirsDuPersonnage(id, 5, co.pouvoirs.slice(0, 2).map(p => p.id)) });
    borne(`${co.ico} ${co.nom}, le personnage complet : victoires de plus`, plein.dv, -MAX_V.legendaire, PERSONNAGE_MAX);
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

/* Les liens se lisent sur les contrats : le même vestiaire (split et équipe), la même équipe d'un split à l'autre. */
{
  const c = (id, e) => ({ ref: { id, e } });
  const cinq = { haut: c('m1', 'A'), jungle: c('m1', 'A'), milieu: c('m1', 'A'), bas: c('m2', 'A'), soutien: c('m2', 'A') };
  exiger('les liens se lisent sur les vestiaires d\'origine', JSON.stringify(liensDe(cinq)) === JSON.stringify(['duoBas', 'duoCentre', 'vestiaire', 'couleurs']), liensDe(cinq).join(', '));
  const epars = { haut: c('m1', 'A'), jungle: c('m2', 'B'), milieu: c('m3', 'C'), bas: c('m4', 'D'), soutien: c('m4', 'E') };
  exiger('un cinq de cinq vestiaires n\'a aucun lien', !liensDe(epars).length);
}

/* Les jetons. */
if (splits.length) {
  // Une ligue jouée avec ton cinq : les jetons se recomptent des résultats.
  const R = nouveauRogue(9);
  R.achats.push({ quoi: 'marche', prix: 12 });
  const L = creerSplit([...ligues[0]], { graine: 9, rondes: 2, bo: 1 });
  while (L.jour < L.journees.length) {
    L.equipes[0] = { ...L.equipes[0], effets: effetsDeToi(liensDe({}), null, [ADJOINTS.dragons.effet]) };
    jouerJournee(L);
    noterJoue(R, L.journees[L.jour - 1].find(s => s.a === 0 || s.b === 0).gagnant === 0);
  }
  creerSeries(L);
  while (jouerRonde(L));
  const tes = [...L.journees.flat(), ...L.series.rondes.flat()].filter(s => s.a === 0 || s.b === 0);
  const v = tes.filter(s => s.gagnant === 0).length;
  const rondes = L.series.rondes.flat().filter(s => s.gagnant === 0).length;
  // Les primes du proprio (js/gestion.js) : les objectifs atteints, et l'élan — quatre victoires de suite en saison, comptées ici à la main.
  const suite = L.journees.map(j => j.find(s => s.a === 0 || s.b === 0).gagnant === 0).reduce(([n, m], x) => [x ? n + 1 : 0, Math.max(m, x ? n + 1 : 0)], [0, 0])[1];
  const primes = objectifsDe(L).filter(o => o.etat === 'atteint').length * OBJECTIF.jetons + (suite >= ELAN.suite ? ELAN.jetons : 0);
  const attendu = JETONS.depart + v * JETONS.victoire + (tes.length - v) * JETONS.defaite + rondes * JETONS.ronde + primes - R.achats.reduce((s, a) => s + a.prix, 0);
  exiger('les jetons se recomptent des résultats et des achats', jetonsDe(L, R) === attendu, `${jetonsDe(L, R)} jetons, ${v} séries gagnées sur ${tes.length}, ${primes} de primes`);
  exiger('chaque série jouée se note, et rien d\'autre', R.joue.length === L.journees.length && R.joue.every(x => Object.keys(x).join() === 'gagne'), `${R.joue.length} séries`);
}

verdict('Le rogue, en paires');
