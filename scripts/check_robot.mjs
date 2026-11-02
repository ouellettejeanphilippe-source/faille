/*
 * LE ROBOT « PREMIER SIGNER » — combien gagne un cinq bâti sans réfléchir ?
 * (Cap 82-0, scripts/check_robot.mjs.)
 *
 * LE 18-0 : la roulette sort un split et une équipe ; le vestiaire est rangé
 * comme à l'écran (l'ordre du shard) et le robot signe le PREMIER joueur dont
 * le bouton est permis (un rôle vide, et le reste du plafond paie les cases
 * vides : `signables`, le même que l'écran) ; jamais de relance. Puis le split
 * d'un coup, les séries partie par partie, le repêchage automatique. Un tel
 * cinq est une équipe moyenne : il ne gagne pas plus de titres qu'une équipe
 * moyenne de la ligue (une sur dix), et il fait les séries sans les faire
 * d'office (la ligue en qualifie six sur dix).
 *
 * LE ROGUE : le robot d'avant (scripts/lib/robot.mjs, 'defaut'), sans
 * déblocage ni collection, run après run. La première run reste dure : il
 * gagne le titre dans une run sur dix au plus (Cap 82-0 : la Coupe par run
 * sous 10 %).
 *
 * Les bornes de Cap 82-0 (la Coupe du robot de 0 à 5 %, les séries de 20 à
 * 65 %, pour une ligue de 32 où 16 font les séries) ramenées à une ligue de
 * 10 où 6 font les séries : le titre au plus au taux d'une équipe moyenne, les
 * séries de la moitié de ce taux à vingt points au-dessus.
 *
 *   node scripts/check_robot.mjs                 40 splits au 18-0, 40 runs au Rogue
 *   SPLITS=10 RUNS=10 node scripts/check_robot.mjs
 */
import { hasard, graineDe } from '../js/hasard.js';
import { equipeReelle, classement } from '../js/sim.js';
import { tirer, tirerAdversaires, signables } from '../js/gestion.js';
import { nouvellePartie, appliquer, vestiaireDe } from '../js/partie.js';
import { contexte, jouerUneRun } from './lib/robot.mjs';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const SPLITS = Number(process.env.SPLITS ?? 40);
const RUNS = Number(process.env.RUNS ?? 40);
const EQUIPES = 10, QUALIFIEES = 6;
const pct = x => `${Math.round(100 * x)} %`;
const moy = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);

const C = contexte();
const { ctx, ids, lire } = C;
exiger('des splits à lire', ids.length > 0, `${ids.length} splits`);
const t0 = Date.now();

/* LE 18-0, premier Signer. */
async function unDixHuit(graine) {
  const de = hasard(graineDe(graine, 'premier-signer'));
  const P = nouvellePartie(graine, { mode: 'dixhuit' });
  const agir = a => appliquer(P, a, ctx);
  let roulettes = 0;
  while (Object.keys(P.eff.cinq).length < 5) {
    if (!P.tirage) {
      const t = await tirer(de, ids, lire, P.eff, 'tour');
      if (!t) return null;
      agir({ t: 'tirage', mode: 'tour', ...t });
      roulettes++;
    }
    const v = vestiaireDe(P, ctx);
    const [j] = signables(P.eff, v.equipe, v.profils.joueurs);
    agir({ t: 'signer', n: j.n, r: j.r });
  }
  agir({ t: 'lancer', adversaires: await tirerAdversaires(de, ids, lire, equipeReelle), graine: Math.floor(de() * 2 ** 32) });
  agir({ t: 'jusqua' });
  const c = classement(P.L);
  const k = c.findIndex(l => l.i === 0);
  agir({ t: 'series' });
  const series = P.L.series.rondes.flat().some(s => s.a === 0 || s.b === 0);
  while (P.L.series.champion === null) agir({ t: 'ronde' });
  const titre = P.L.series.champion === 0;
  agir({ t: 'bilan' });
  return { v: c[k].v, d: c[k].d, rang: k + 1, series, titre, roulettes };
}

const dixhuit = [];
for (let g = 1; g <= SPLITS; g++) dixhuit.push(await unDixHuit(1000 + g));
const ok = dixhuit.filter(Boolean);
exiger('chaque robot complète son cinq', ok.length === dixhuit.length, `${ok.length}/${dixhuit.length}, ${moy(ok.map(r => r.roulettes)).toFixed(1).replace('.', ',')} roulettes par cinq`);
informer('le 18-0 : la fiche moyenne', `${moy(ok.map(r => r.v)).toFixed(1).replace('.', ',')}-${moy(ok.map(r => r.d)).toFixed(1).replace('.', ',')} · ${moy(ok.map(r => r.rang)).toFixed(1).replace('.', ',')}e en moyenne`);
informer('le 18-0 : les séries', `${pct(moy(ok.map(r => (r.series ? 1 : 0))))} en séries · ${ok.filter(r => r.titre).length} titre(s) sur ${ok.length}`);
borne('le 18-0 : le titre du robot (une équipe moyenne en gagne un sur dix)', moy(ok.map(r => (r.titre ? 1 : 0))), 0, 1 / EQUIPES);
borne('le 18-0 : les séries du robot', moy(ok.map(r => (r.series ? 1 : 0))), QUALIFIEES / EQUIPES / 2, QUALIFIEES / EQUIPES + 0.2);

/* LE ROGUE : le robot d'avant, sans déblocage ni collection. */
const runs = [];
for (let g = 1; g <= RUNS; g++) {
  const P = await jouerUneRun(2000 + g, C, { coach: 'stratege' }, 6);
  runs.push({ splits: P.run.passes.length, titre: P.run.fin === 'gagnee' });
}
informer('le Rogue : les runs du robot d\'avant', `${RUNS} runs · ${moy(runs.map(r => r.splits)).toFixed(2).replace('.', ',')} split(s) par run · ${runs.filter(r => r.titre).length} titre(s)`);
borne('le Rogue : le titre par run du robot d\'avant (la première run reste dure)', moy(runs.map(r => (r.titre ? 1 : 0))), 0, 0.1);

verdict(`Le robot « premier Signer » · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
