/*
 * CHERCHER LES RÉGLAGES DU MOTEUR (MOTEUR.md §4). Une recherche locale :
 * chaque réglage bouge d'un pas, on garde ce qui rapproche les repères de
 * leur borne (scripts/lib/reperes.mjs), le pas rétrécit quand rien ne
 * s'améliore. Ce script ne juge rien : check_feuilles juge. Il écrit les
 * réglages trouvés, à recopier dans REGLAGES (js/sim.js).
 *
 *   node scripts/calibrer.mjs [évaluations]
 */
import { regler } from '../js/sim.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { vraiesParties, reperes } from './lib/reperes.mjs';
import { informer, verdict } from './verdict.mjs';

const vraies = vraiesParties(lireSplits());
const EVALS = Number(process.argv[2]) || 200;
const REJOUER = 4;

/* Les réglages cherchés, leur départ et leur pas. */
const DEPART = {
  'obj.boule': [0.52, 0.04], 'obj.bouleHeraut': [0.3, 0.1], 'obj.dragon': [0.07, 0.02], 'obj.ame': [0.225, 0.05], 'obj.nashor': [0.26, 0.05], 'obj.heraut': [0.27, 0.1],
  tours: [0.882, 0.02], 'fin.base': [0.29, 0.01], 'fin.pente': [4.3, 0.1], 'fin.avance': [0.27, 0.03], force: [0.3, 0.01], ferme: [0.025, 0.002],
};
const forme = x => {
  const r = {};
  for (const [k, v] of Object.entries(x)) {
    const [a, b] = k.split('.');
    if (b) r[a] = { ...(r[a] || {}), [b]: v }; else r[a] = v;
  }
  return r;
};
/* Le coût : ce qui sort de chaque borne, en largeurs de borne ; dedans, un rien pour viser le milieu. */
const cout = x => {
  regler(forme(x));
  return reperes(vraies, REJOUER).reduce((s, r) => {
    const mi = (r.min + r.max) / 2, demi = (r.max - r.min) / 2;
    const e = Math.abs(r.sim - mi) / demi;
    return s + (e > 0.6 ? 10 * (e - 0.6) : 0) + 0.1 * e;
  }, 0);
};

let x = Object.fromEntries(Object.entries(DEPART).map(([k, [v]]) => [k, v]));
const pas = Object.fromEntries(Object.entries(DEPART).map(([k, [, p]]) => [k, p]));
let c = cout(x);
for (let n = 0; n < EVALS; n++) {
  const k = Object.keys(x)[n % Object.keys(x).length];
  let mieux = false;
  for (const sens of [1, -1]) {
    const y = { ...x, [k]: Math.max(0, x[k] + sens * pas[k]) };
    const cy = cout(y);
    if (cy < c) { x = y; c = cy; mieux = true; break; }
  }
  if (!mieux) pas[k] /= 2;
  if (n % Object.keys(x).length === 0) console.log(n, c.toFixed(3), JSON.stringify(Object.fromEntries(Object.entries(x).map(([a, v]) => [a, +v.toFixed(4)]))));
}
informer('le coût', c.toFixed(3));
informer('les réglages trouvés', JSON.stringify(forme(Object.fromEntries(Object.entries(x).map(([a, v]) => [a, +v.toFixed(4)])))));
verdict('La calibration');
