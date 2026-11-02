/*
 * L'IMPACT EN CHIFFRES DE PARTIE (Cap 82-0, js/impact.js ; JP, Cap 82-0 : *les pourcentages, ça me dit fuck all ce que
 * ça impacte dans le match*). Ce qu'un effet change se dit en ce que le joueur lit sur la feuille d'une partie — des
 * éliminations, des morts, des dragons, des Nashor, des hérauts, des tours, des minutes —, jamais en cote, jamais en
 * victoires, jamais en « % ».
 *
 * UN SEUL CHIFFRE, MESURÉ. Le moteur de Faille joue des événements (MOTEUR.md) : aucune formule ne dit d'avance ce
 * qu'une carte rapporte. Chaque effet est donc mesuré en paires (scripts/impact.mjs, le banc de check_rogue) et la
 * table vit dans js/impacts.js : ce que l'écran annonce est la moyenne que le moteur joue, et check_chiffres le
 * remesure sur d'autres ligues. Une ligne sous le bruit ne se dit pas : il lui faut deux erreurs types et un pas qu'on
 * lit sur une feuille (`PAS`). Pur : aucun DOM, aucun hasard.
 */
import { IMPACTS } from './impacts.js';
import { virgule } from './util.js';

/* Le mot d'une stat, au singulier et au pluriel ; dans quel sens elle sert l'équipe (la durée ne sert ni l'un ni l'autre). */
const MOTS = {
  elim: ['élimination', 'éliminations', 1], morts: ['mort', 'morts', -1], dragons: ['dragon', 'dragons', 1], nashor: ['Nashor', 'Nashor', 1],
  herauts: ['héraut', 'hérauts', 1], tours: ['tour', 'tours', 1], duree: ['min', 'min', 0],
};
/* Le plus petit écart qu'on lit sur une feuille, par partie : sous lui, un chiffre ne dit rien. */
export const PAS = { elim: 0.3, morts: 0.3, dragons: 0.08, nashor: 0.05, herauts: 0.05, tours: 0.15, duree: 0.3 };
/* Combien d'erreurs types une ligne doit dépasser pour se dire. */
export const BRUIT = 2;

/** L'impact mesuré d'un effet, par partie : { stat : [moyenne, erreur type] } ; une stratégie, au fit `fit`. null : jamais mesuré. */
export function impactDe(cle, fit = 0) {
  const x = IMPACTS[cle];
  if (!x) return null;
  if (!x.a) return x.d;
  return Object.fromEntries(Object.keys(MOTS).map(c => [c, [x.a[c] + x.b[c] * fit, x.se[c]]]));
}

/**
 * Un impact en puces, le plus fort d'abord : [{ cle, txt, bon }] — « +1,1 élimination », « −0,7 min ». `bon` : vrai
 * si la ligne sert l'équipe, faux si elle lui coûte, null pour la durée. Seules les lignes au-dessus du bruit.
 */
export function motsDeStats(d, max = 3) {
  if (!d) return [];
  return Object.keys(MOTS).filter(c => d[c] && Math.abs(d[c][0]) >= PAS[c] && Math.abs(d[c][0]) >= BRUIT * d[c][1])
    .sort((a, b) => Math.abs(d[b][0]) / PAS[b] - Math.abs(d[a][0]) / PAS[a]).slice(0, max)
    .map(c => {
      const [m] = d[c];
      const [un, plusieurs, sens] = MOTS[c];
      const n = Math.abs(m);
      return { cle: c, txt: `${m > 0 ? '+' : '−'}${virgule(n)} ${n >= 2 ? plusieurs : un}`, bon: sens ? (m > 0) === (sens > 0) : null };
    });
}

/**
 * L'impact d'une somme d'effets mesurés, chacun à son poids : [[clé, poids]] → { stat : [moyenne, erreur type] }. La
 * composition d'un repêchage : chaque classe de plus que la référence, au prix mesuré d'une classe de plus
 * (« classe:mage »). Les erreurs se somment comme des erreurs indépendantes.
 */
export function impactCompose(parts) {
  const out = Object.fromEntries(Object.keys(MOTS).map(c => [c, [0, 0]]));
  for (const [cle, w] of parts) {
    const d = impactDe(cle);
    if (!d || !w) continue;
    for (const c of Object.keys(MOTS)) out[c] = [out[c][0] + w * d[c][0], Math.hypot(out[c][1], w * d[c][1])];
  }
  return out;
}

/** Ce qu'un effet change, en puces (motsDeStats) ; `fit` pour une stratégie. */
export const chiffresDe = (cle, { fit = 0, max = 3 } = {}) => motsDeStats(impactDe(cle, fit), max);

/**
 * Ce qu'un effet change, en une phrase : « ≈ +1,1 élimination · −0,7 min par partie », ou « rien de net sur la
 * feuille ». `quand` : un pouvoir, qui se lit les parties où il joue.
 */
export function phraseDe(cle, { quand = false, ...opts } = {}) {
  const l = chiffresDe(cle, opts);
  return l.length ? `≈ ${l.map(x => x.txt).join(' · ')} ${quand ? 'les parties où il joue' : 'par partie'}` : 'rien de net sur la feuille';
}
