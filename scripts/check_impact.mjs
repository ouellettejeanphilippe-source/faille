/*
 * L'IMPACT EN CHIFFRES DE PARTIE : LA TABLE ET SES MOTS (Cap 82-0, scripts/check_impact.mjs ; docs/parite-cap82.md B1).
 *
 *   la table est complète   chaque effet que l'écran chiffre (scripts/lib/effets.mjs) a sa ligne dans js/impacts.js,
 *                           et la table n'a rien de plus ;
 *   la table est à jour     chaque effet a la signature de sa définition d'aujourd'hui, et le moteur est celui qu'on
 *                           a mesuré (MOTEUR_MESURE) — sinon, `node scripts/impact.mjs` la refait ;
 *   le témoin à zéro        sans effet, les deux passes d'une paire sont identiques : rien ne bouge ;
 *   les mots                jamais un « % », jamais une victoire ; le signe dit le sens de la moyenne ; une ligne
 *                           dite dépasse son pas et deux erreurs types (js/impact.js `PAS`, `BRUIT`).
 *
 * Que la table égale ce que le moteur joue, c'est check_chiffres.
 *
 *   node scripts/check_impact.mjs
 */
import { IMPACTS, MOTEUR_MESURE } from '../js/impacts.js';
import { impactDe, motsDeStats, chiffresDe, phraseDe, PAS, BRUIT } from '../js/impact.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { banc, STATS_DE_LA_FEUILLE } from './lib/paires.mjs';
import { effetsAChiffrer, empreinteDuMoteur } from './lib/effets.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const effets = effetsAChiffrer();
const cles = new Set(effets.map(e => e.cle));
const manquants = effets.filter(e => !IMPACTS[e.cle]).map(e => e.cle);
const deTrop = Object.keys(IMPACTS).filter(k => !cles.has(k));
exiger('chaque effet chiffré a sa ligne dans js/impacts.js', !manquants.length, manquants.join(', ') || `${effets.length} effets`);
exiger('la table n\'a rien de plus que les effets', !deTrop.length, deTrop.join(', ') || 'rien');
const perimes = effets.filter(e => IMPACTS[e.cle] && IMPACTS[e.cle].sig !== e.sig).map(e => e.cle);
exiger('chaque effet a été mesuré tel qu\'il est (sinon : node scripts/impact.mjs)', !perimes.length, perimes.join(', ') || 'les signatures tiennent');
exiger('le moteur est celui qu\'on a mesuré (sinon : node scripts/impact.mjs)', MOTEUR_MESURE === empreinteDuMoteur(), `${MOTEUR_MESURE} · ${empreinteDuMoteur()}`);
exiger('chaque ligne de la table porte toutes les stats de la feuille', Object.values(IMPACTS).every(x => x.d && STATS_DE_LA_FEUILLE.every(c => x.d[c])));

/* Le témoin à zéro : deux ligues, sans effet. */
const splits = lireSplits();
if (splits.length) {
  const { mesurer } = banc(splits, 2, 300);
  const t = mesurer({});
  exiger('sans effet, rien ne bouge : le témoin est à zéro', t.dv === 0 && Object.values(t.forme).every(x => x === 0), `ΔV ${t.dv}, ${t.ecarts.elim.length} parties`);
}

/* Les mots. */
const fautes = [];
let dites = 0, muets = [];
for (const e of effets) {
  const d = impactDe(e.cle);
  const lignes = chiffresDe(e.cle, { max: 7 });
  if (!lignes.length) muets.push(e.cle);
  for (const l of lignes) {
    dites++;
    const [m, se] = d[l.cle];
    if (/%|victoire/i.test(l.txt)) fautes.push(`${e.cle} : « ${l.txt} »`);
    if ((m > 0) !== l.txt.startsWith('+')) fautes.push(`${e.cle} : le signe de « ${l.txt} » contre ${m}`);
    if (Math.abs(m) < PAS[l.cle] || Math.abs(m) < BRUIT * se) fautes.push(`${e.cle} : « ${l.txt} » sous le bruit (${m} ± ${se})`);
  }
  if (/%|victoire/i.test(phraseDe(e.cle))) fautes.push(`${e.cle} : ${phraseDe(e.cle)}`);
}
exiger('les mots : jamais un « % » ni une victoire, le bon signe, rien sous le bruit', !fautes.length, fautes.slice(0, 4).join(' · ') || `${dites} lignes dites`);
// Le plus fort d'abord, et seulement ce qui dépasse le bruit.
const essai = motsDeStats({ elim: [0.4, 0.1], morts: [-1.2, 0.1], dragons: [0.05, 0.01], nashor: [0.3, 0.2], herauts: [0, 0], tours: [0, 0], duree: [0, 0] }, 7);
exiger('les mots : le plus fort d\'abord, rien sous le pas ni sous le bruit', essai.map(x => x.txt).join(' · ') === '−1,2 mort · +0,4 élimination' && essai[0].bon === true, essai.map(x => x.txt).join(' · '));
informer('les effets que l\'écran chiffre', `${effets.length} : ${effets.length - muets.length} se voient sur la feuille, ${muets.length} n'y montrent rien de net${muets.length ? ` (${muets.join(', ')})` : ''}`);

verdict('L\'impact en chiffres de partie : la table et ses mots');
