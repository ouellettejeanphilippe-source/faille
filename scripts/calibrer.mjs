/*
 * CHERCHER LES RÉGLAGES DU MOTEUR (MOTEUR.md §4). Une recherche locale :
 * chaque réglage bouge d'un pas, on garde ce qui rapproche les repères de
 * leur borne (scripts/lib/reperes.mjs), le pas rétrécit quand rien ne
 * s'améliore. Ce script ne juge rien : check_feuilles juge. Il écrit les
 * réglages trouvés, à recopier dans REGLAGES (js/moteur.js) et dans DEPART.
 *
 *   node scripts/calibrer.mjs [évaluations]
 *   REJOUER=4 DECALAGES=0,100 node scripts/calibrer.mjs 300   # plus lent, plus sûr
 */
import { regler } from '../js/moteur.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { vraiesParties, reperes } from './lib/reperes.mjs';
import { informer, verdict } from './verdict.mjs';

const vraies = vraiesParties(lireSplits());
const EVALS = Number(process.argv[2]) || 200;
const REJOUER = Number(process.env.REJOUER) || 2;

/* Les réglages cherchés, leur départ (ceux de REGLAGES, js/moteur.js) et leur pas. */
const DEPART = {
  force: [0.3743, 0.008], boule: [0.1109, 0.008], nombre: [0.3264, 0.015], cote: [0.3039, 0.015], ferme: [0.0101, 0.004], emprise: [0.0113, 0.002], rythme: [1.8019, 0.03], aide: [0.785, 0.02],
  tours: [3.5843, 0.12], pousse: [0.785, 0.02], 'fin.pente': [1.53, 0.08], 'fin.avance': [0.045, 0.004], 'fin.base': [0.3856, 0.05],
  'obj.boule': [1.5449, 0.08], 'obj.dispute': [0.2318, 0.08], 'obj.dragon': [0.0564, 0.008], 'obj.ame': [0.4963, 0.03], 'obj.nashor': [0.2446, 0.03], 'obj.heraut': [0.7893, 0.06],
  'obj.rythme': [1.23, 0.02], 'obj.rythmeNashor': [1.4205, 0.04],
};
const forme = x => {
  const r = {};
  for (const [k, v] of Object.entries(x)) {
    const [a, b] = k.split('.');
    if (b) r[a] = { ...(r[a] || {}), [b]: v }; else r[a] = v;
  }
  return r;
};
/*
 * Le coût : ce qui sort de la moitié de chaque borne, en largeurs de borne ; dedans, un rien pour viser le milieu.
 * Plusieurs jeux de graines (DECALAGES="0,100"), leurs repères moyennés : une borne ne doit pas tenir à un tirage.
 */
const DECALAGES = (process.env.DECALAGES || '0').split(',').map(Number);
const cout = x => {
  regler(forme(x));
  const jeux = DECALAGES.map(d => reperes(vraies, REJOUER, d));
  return jeux[0].map((r, k) => ({ ...r, sim: jeux.reduce((s, j) => s + j[k].sim, 0) / jeux.length })).reduce((s, r) => {
    const mi = (r.min + r.max) / 2, demi = (r.max - r.min) / 2;
    const e = Math.abs(r.sim - mi) / demi;
    return s + (e > 0.5 ? 10 * (e - 0.5) : 0) + 0.1 * e;
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
