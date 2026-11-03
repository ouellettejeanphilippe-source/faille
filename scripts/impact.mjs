/*
 * MESURER L'IMPACT DE CHAQUE EFFET, ET L'ÉCRIRE (js/impacts.js ; docs/parite-cap82.md B1, la règle de Cap 82-0 : *un
 * effet se dit en ce que le joueur lit dans la feuille*). Chaque effet de scripts/lib/effets.mjs, sur le banc de
 * scripts/lib/paires.mjs (ses propres ligues, d'autres graines que check_rogue et check_chiffres) : ce qu'il change
 * par partie à l'équipe qui le porte — ses éliminations, ses morts, ses dragons, ses Nashor, ses hérauts, ses tours,
 * la durée —, avec l'erreur type de chaque chiffre. Un pouvoir se lit les parties où il joue ; un plan de match, les
 * parties où il se joue.
 *
 * Ce script ne juge rien : check_impact dit si la table est à jour, check_chiffres si elle égale ce que le moteur joue.
 * À relancer quand un effet ou le moteur change (check_impact le demande) :
 *
 *   node scripts/impact.mjs            (une minute et demie, LIGUES=40)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lireSplits } from './lib/vestiaires.mjs';
import { banc, impactDe, STATS_DE_LA_FEUILLE } from './lib/paires.mjs';
import { effetsAChiffrer, empreinteDuMoteur } from './lib/effets.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIGUES = Number(process.env.LIGUES ?? 40);
const DEPUIS = 900;
const t0 = Date.now();
const splits = lireSplits();
if (!splits.length) { console.error('aucun split dans data/splits/'); process.exit(1); }
const { mesurer } = banc(splits, LIGUES, DEPUIS);

const r3 = x => Math.round(x * 1000) / 1000;
const table = {};
let parties = 0;
for (const e of effetsAChiffrer()) {
  const m = mesurer(e.opts);
  const n = m.ecarts.elim.length;
  parties += n;
  const d = impactDe(m);
  table[e.cle] = { sig: e.sig, n, ...(e.genre === 'pouvoir' ? { joue: r3(m.joue) } : {}), d: Object.fromEntries(STATS_DE_LA_FEUILLE.map(c => [c, d[c].map(r3)])) };
  process.stdout.write('.');
}

const lignes = Object.entries(table).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
const texte = `/*
 * L'IMPACT DE CHAQUE EFFET, MESURÉ EN PAIRES — écrit par scripts/impact.mjs, ne pas éditer à la main.
 *
 * Par partie, à l'équipe qui porte l'effet : ses éliminations (elim), ses morts, ses dragons, ses Nashor, ses hérauts,
 * ses tours, la durée en minutes ; chaque chiffre [moyenne, erreur type]. Un pouvoir se lit les parties où il joue
 * (joue : leur part) ; un plan de match, les parties où il se joue.
 * ${LIGUES} ligues d'essai, ${parties} parties mesurées. js/impact.js le dit à l'écran ; check_impact juge que la table
 * est à jour (MOTEUR_MESURE, les signatures), check_chiffres qu'elle égale ce que le moteur joue.
 */
export const MOTEUR_MESURE = ${empreinteDuMoteur()};
export const IMPACTS = {
${lignes}
};
`;
fs.writeFileSync(path.join(ROOT, 'js/impacts.js'), texte);
console.log(`\njs/impacts.js : ${Object.keys(table).length} effets, ${parties} parties, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
