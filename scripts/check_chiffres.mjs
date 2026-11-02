/*
 * CE QUE L'ÉCRAN ANNONCE ÉGALE CE QUE LE MOTEUR JOUE (Cap 82-0, scripts/check_chiffres.mjs ; docs/parite-cap82.md B1).
 *
 * La table js/impacts.js a été mesurée sur ses ligues à elle (scripts/impact.mjs). Ce script remesure chaque effet en
 * paires sur d'autres ligues — celles de check_rogue — et juge chaque ligne que l'écran dit (js/impact.js `chiffresDe`) :
 * la remesure tombe à `Z` erreurs types de la table (les deux erreurs, sommées, chacune comptée par ligue), et
 * jamais nettement de l'autre côté de zéro. Une stratégie se juge au fit moyen de la remesure, sur sa droite.
 *
 * POURQUOI QUATRE ERREURS TYPES. Le juge pose environ deux cents questions d'un coup (une par ligne dite) : à trois
 * erreurs types chacune, il crierait par hasard quatre fois sur dix. Quatre, c'est la correction de Bonferroni pour
 * deux cents lignes à 1 % pour tout le juge : un rouge y est une vraie différence, pas un tirage.
 *
 *   node scripts/check_chiffres.mjs            (une demi-minute, LIGUES=12)
 */
import { IMPACTS } from '../js/impacts.js';
import { impactDe, chiffresDe } from '../js/impact.js';
import { fitDe } from '../js/strategie.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { banc, impactDe as mesureDe, droiteDe } from './lib/paires.mjs';
import { effetsAChiffrer } from './lib/effets.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const LIGUES = Number(process.env.LIGUES ?? 12);
const Z = 4;
const t0 = Date.now();
const splits = lireSplits();
exiger('des splits à lire', splits.length > 0, `${splits.length} splits`);
const { mesurer } = banc(splits, LIGUES, 500);
const moyenne = xs => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

const fautes = [];
let jugees = 0;
for (const e of effetsAChiffrer()) {
  if (!IMPACTS[e.cle]) continue;
  const m = mesurer(e.opts);
  let fit = 0, ici;
  if (e.genre === 'strategie') {
    const f = eq => fitDe(e.id, eq.cinq);
    fit = moyenne(m.parties.map(f));
    const d = droiteDe(m, f);
    ici = Object.fromEntries(Object.keys(d.a).map(c => [c, [d.a[c] + d.b[c] * fit, d.se[c]]]));
  } else ici = mesureDe(m);
  const table = impactDe(e.cle, fit);
  for (const l of chiffresDe(e.cle, { fit, max: 7 })) {
    jugees++;
    const [t, set] = table[l.cle], [r, ser] = ici[l.cle];
    const tolerance = Z * Math.hypot(set, ser);
    // Faux : loin de la table, ou nettement de l'autre côté de zéro (au-delà de deux erreurs types de la remesure).
    if (Math.abs(t - r) > tolerance || (Math.sign(t) === -Math.sign(r) && Math.abs(r) > 2 * ser)) fautes.push(`${e.cle} ${l.cle} : l'écran dit ${l.txt}, la remesure ${r.toFixed(2)} ± ${ser.toFixed(2)}`);
  }
}
exiger(`chaque ligne que l'écran dit se remesure, à ${Z} erreurs types, du même côté de zéro`, !fautes.length, fautes.slice(0, 5).join(' · ') || `${jugees} lignes`);
informer('le temps', `${((Date.now() - t0) / 1000).toFixed(0)} s, ${LIGUES} ligues`);
verdict('Ce que l\'écran annonce, contre ce que le moteur joue');
