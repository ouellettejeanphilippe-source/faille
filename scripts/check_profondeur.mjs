/*
 * LA PROFONDEUR DU ROGUE : MENER, ÇA COMPTE-T-IL ? (Cap 82-0, scripts/check_profondeur.mjs ; docs/parite-cap82.md E5.)
 *
 * Trois robots jouent les mêmes dés (scripts/lib/robot.mjs, `POLITIQUES`) : le robot d'avant ('defaut'), l'attentif,
 * qui lit ses joueurs, et le distrait, qui clique au hasard. L'écart entre l'attentif et le distrait, c'est la
 * profondeur du jeu. Deux parties :
 *
 *   1. MENER UNE VRAIE ÉQUIPE : dans quatre Mondiaux, la meilleure équipe (à sa vraie fiche) et celle du milieu,
 *      chacune lancée telle quelle dans un split du Rogue, GRAINES fois par politique, sur les mêmes graines. Les deux
 *      bouts : le cinq moyen bien mené finit-il parfois premier ? le bon cinq mal mené rate-t-il parfois les séries ?
 *   2. LES CAMPAGNES : de zéro, RUNS_CAMPAGNE runs par politique ; les médailles achètent les déblocages, la
 *      collection grossit, un titre ouvre l'exigence suivante, et chaque robot monte au plus haut cran ouvert.
 *      L'attentif gagne son premier titre entre la run 3 et la run 8 (la médiane) ; après, il le regagne sans le
 *      gagner d'office (le quart aux deux tiers de ses runs) ; le distrait ne le gagne jamais.
 *
 * Ce n'est pas une vérification de la CI : comme chez Cap 82-0, ce script est le juge des tranches qui règlent la
 * courbe d'une run (le jalon 8 : P3, P5, P11, P16), et il est rouge tant qu'elle n'est pas la bonne.
 *
 *   node scripts/check_profondeur.mjs                                   (une demi-minute)
 *   GRAINES=1 CAMPAGNES=1 RUNS_CAMPAGNE=4 node scripts/check_profondeur.mjs
 */
import { hasard, piger, graineDe } from '../js/hasard.js';
import { ROLES } from '../js/canaux.js';
import { classement } from '../js/sim.js';
import { tirerEtoiles, cleDe } from '../js/gestion.js';
import { nouvellePartie, contratDe, refDe } from '../js/partie.js';
import { COACHS } from '../js/rogue.js';
import { nouveauMeta, noter, acheter, DEBLOCAGES, deblocagesDe, collectionDe, vedetteDe, choisirVedette, choisirExigence, exigenceMax, exigenceDe, clubDe } from '../js/meta.js';
import { contexte, jouerUneRun, jouerLeSplit, collectionPour, POLITIQUES } from './lib/robot.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const GRAINES = Number(process.env.GRAINES ?? 4);
const CAMPAGNES = Number(process.env.CAMPAGNES ?? 2);
const RUNS_CAMPAGNE = Number(process.env.RUNS_CAMPAGNE ?? 12);
const SPLITS_CLUBS = ['mondial-2014', 'mondial-2017', 'mondial-2020', 'mondial-2023'];
/* Après son premier titre, la part des runs que l'attentif gagne encore : ni jamais, ni d'office (Cap 82-0, `APRES`). */
const APRES = [0.25, 2 / 3];
const SPLITS_MAX = 6;
const moy = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const v1 = x => x.toFixed(1).replace('.', ',');
const signe = x => `${x >= 0 ? '+' : '−'}${v1(Math.abs(x))}`;

const C = contexte();
const { ctx, ids, lire } = C;
exiger('des splits à lire', ids.length > 0, `${ids.length} splits`);
const t0 = Date.now();
console.log('\n  La profondeur du Rogue : l\'attentif, le distrait et le robot d\'avant, sur les mêmes dés\n');

/* 1. MENER UNE VRAIE ÉQUIPE */

/* Le cinq d'une vraie équipe : à chaque rôle, celui qui y a le plus joué. */
const cinqDe = (id, e) => Object.fromEntries(ROLES.map(r => {
  const j = e.joueurs.filter(x => x.r === r).sort((a, b) => b.pj - a.pj)[0];
  return [r, j && contratDe(ctx, { id, e: e.nom, n: j.n, r })];
}));
const clubs = SPLITS_CLUBS.filter(id => ctx.splits.has(id)).flatMap(id => {
  const eqs = ctx.splits.get(id).split.equipes.filter(e => e.v + e.d >= 6 && ROLES.every(r => e.joueurs.some(j => j.r === r)))
    .sort((a, b) => b.v / (b.v + b.d) - a.v / (a.v + a.d));
  return [{ id, e: eqs[0], genre: 'bon' }, { id, e: eqs[Math.floor(eqs.length / 2)], genre: 'moyen' }];
});
const mener = new Map();
for (const k of clubs) for (const politique of POLITIQUES) {
  const out = [];
  for (let g = 0; g < GRAINES; g++) {
    const graine = graineDe(7000 + g, `${k.id}|${k.e.nom}`);
    const P = nouvellePartie(graine, { coach: 'stratege' });
    P.eff.cinq = cinqDe(k.id, k.e);
    await jouerLeSplit(P, C, hasard(graineDe(graine, `clic-${politique}`)), politique);
    const passe = P.run.passes[0];
    // Le mandat du premier split d'une run sans exigence est « faire les séries » : rempli, c'est qualifié.
    out.push({ v: passe.fiche[0], rang: passe.rang, series: passe.rempli, titre: passe.champion });
  }
  mener.set(`${k.id}|${k.e.nom}|${politique}`, out);
}
const ecarts = { 'attentif − distrait': [], 'attentif − défaut': [], 'défaut − distrait': [] };
let premiers = 0, rates = 0;
for (const k of clubs) {
  const [d, a, z] = POLITIQUES.map(p => mener.get(`${k.id}|${k.e.nom}|${p}`));
  const resume = o => `${v1(moy(o.map(x => x.v)))} V, ${v1(moy(o.map(x => x.rang)))}e, 1er ${o.filter(x => x.rang === 1).length}/${o.length}, séries ${o.filter(x => x.series).length}/${o.length}`;
  informer(`${k.e.nom} · ${k.id} (${k.genre}, ${k.e.v}-${k.e.d} en vrai)`, `attentif ${resume(a)} · défaut ${resume(d)} · distrait ${resume(z)}`);
  a.forEach((x, g) => { ecarts['attentif − distrait'].push(x.v - z[g].v); ecarts['attentif − défaut'].push(x.v - d[g].v); ecarts['défaut − distrait'].push(d[g].v - z[g].v); });
  if (k.genre === 'moyen') premiers += a.filter(x => x.rang === 1).length;
  if (k.genre === 'bon') rates += z.filter(x => !x.series).length;
}
for (const [nom, l] of Object.entries(ecarts)) {
  const m = moy(l), se = Math.sqrt(moy(l.map(x => (x - m) ** 2)) / Math.max(1, l.length - 1));
  informer(`l'écart ${nom}`, `${signe(m)} V par split de 18 (± ${v1(se)}, ${l.length} splits appariés)`);
}
const nMoyen = clubs.filter(k => k.genre === 'moyen').length * GRAINES, nBon = clubs.filter(k => k.genre === 'bon').length * GRAINES;
exiger('un cinq moyen bien mené peut finir premier', premiers > 0, `${premiers} fois sur ${nMoyen} (l'attentif, les équipes du milieu)`);
exiger('un bon cinq mal mené peut rater les séries', rates > 0, `${rates} fois sur ${nBon} (le distrait, les meilleures équipes)`);

/* 2. LES CAMPAGNES */

/* Les déblocages qu'un robot achète après chaque run : le premier qui s'achète, dans l'ordre du méta, tant qu'il y en a. */
const acheterDans = m => { while (Object.keys(DEBLOCAGES).some(id => acheter(m, `deb:${id}`))); };
async function campagne(politique, c) {
  const m = nouveauMeta();
  const clic = hasard(graineDe(9000 + c, `campagne-${politique}`));
  // Ton joueur de concession : l'attentif prend la meilleure des trois Étoiles, le distrait une au hasard, le robot d'avant la première.
  const etoiles = (await tirerEtoiles(hasard(graineDe(9000 + c, 'etoiles')), ids, lire)).map(ref => contratDe(ctx, ref));
  const vedette = politique === 'attentif' ? [...etoiles].sort((a, b) => b.moteur.valeur - a.moteur.valeur)[0] : politique === 'distrait' ? piger(etoiles, clic) : etoiles[0];
  choisirVedette(m, cleDe(vedette.ref));
  const runs = [];
  let premiere = null;
  for (let r = 0; r < RUNS_CAMPAGNE; r++) {
    choisirExigence(m, exigenceMax(m));
    const exig = exigenceDe(m);
    const coach = politique === 'distrait' ? piger(Object.keys(COACHS), clic) : 'stratege';
    const P = await jouerUneRun(graineDe(9000 + c, `run-${r}`), C, { deb: deblocagesDe(m), club: clubDe(m), coach, col: collectionPour(ctx, [...collectionDe(m).keys()]), vedette: vedetteDe(m), exig }, SPLITS_MAX, politique);
    noter(m, `r${r}`, P, r + 1);
    acheterDans(m);
    const titre = P.run.fin === 'gagnee';
    runs.push({ splits: P.run.passes.length, titre, exig });
    if (titre && premiere === null) premiere = r + 1;
  }
  return { politique, c, runs, premiere, deblocages: deblocagesDe(m).length, cartes: collectionDe(m).size };
}
const camp = {};
for (const politique of POLITIQUES) {
  camp[politique] = [];
  for (let c = 0; c < CAMPAGNES; c++) camp[politique].push(await campagne(politique, c));
}
for (const politique of POLITIQUES) for (const r of camp[politique]) {
  informer(`campagne ${r.c + 1}, ${politique}`, `${r.premiere ? `1er titre à la run ${r.premiere}` : `pas de titre en ${RUNS_CAMPAGNE} runs`} · ${r.runs.filter(x => x.titre).length} titre(s) · ${r.deblocages} déblocages, ${r.cartes} cartes au bout · splits par run : ${r.runs.map(x => `${x.splits}${x.titre ? '🏆' : ''}${x.exig ? `🔺${x.exig}` : ''}`).join(' ')}`);
}
if (CAMPAGNES > 0) {
  const attentif = camp.attentif, distrait = camp.distrait;
  const premieres = attentif.map(r => r.premiere ?? RUNS_CAMPAGNE + 1).sort((a, b) => a - b);
  const mediane = premieres.length % 2 ? premieres[(premieres.length - 1) / 2] : (premieres[premieres.length / 2 - 1] + premieres[premieres.length / 2]) / 2;
  exiger('l\'attentif gagne son premier titre entre la run 3 et la run 8 (la médiane des campagnes)', mediane >= 3 && mediane <= 8,
    `médiane ${v1(mediane)} · ${attentif.map(r => (r.premiere ? `run ${r.premiere}` : `> ${RUNS_CAMPAGNE}`)).join(' · ')}`);
  const apres = attentif.flatMap(r => (r.premiere ? r.runs.slice(r.premiere) : []));
  const taux = apres.filter(x => x.titre).length / Math.max(1, apres.length);
  exiger(`après son premier titre, l'attentif le regagne, sans le gagner d'office (${Math.round(100 * APRES[0])} à ${Math.round(100 * APRES[1])} % des runs)`, apres.length > 0 && taux >= APRES[0] && taux <= APRES[1],
    `${apres.filter(x => x.titre).length} titre(s) en ${apres.length} runs (${Math.round(100 * taux)} %)`);
  const titresDistrait = distrait.reduce((a, r) => a + r.runs.filter(x => x.titre).length, 0);
  exiger(`le distrait ne gagne jamais le titre en ${RUNS_CAMPAGNE} runs`, titresDistrait === 0, `${titresDistrait} titre(s) en ${distrait.length * RUNS_CAMPAGNE} runs`);
}
informer('le temps', `${((Date.now() - t0) / 1000).toFixed(0)} s (${GRAINES} graines par équipe et par politique, ${CAMPAGNES} campagne(s) de ${RUNS_CAMPAGNE} runs par politique)`);
verdict('La profondeur du Rogue');
