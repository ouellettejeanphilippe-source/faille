/*
 * L'ESSAI DU ROGUE (Cap 82-0, scripts/essai_rogue.mjs ; docs/parite-cap82.md H22, H23). Un DG robot joue une run dans
 * Chromium, à 390 × 844, par les boutons de l'écran, du titre au bilan de son premier split : le départ (le coach, la
 * vedette, les cases, le pack de départ), puis chaque journée et ses décisions, les séries, le bilan. Trois fois dans
 * la saison (la première journée, la date limite, les séries), il visite chaque section et chaque sous-onglet, « Ce
 * soir », le sommaire d'hier soir et le choix qui attend.
 *
 * Sur chaque écran qu'il voit, deux mesures :
 *   LA HAUTEUR, en écrans : ce que la boîte qui défile (le corps de l'écran, ou la couche du dessus) porte, sur ce
 *     qu'elle montre — 1,0, il tient sans défiler ; 1,5, il faut défiler d'une demi-boîte. La règle (CLAUDE.md : un
 *     écran tient en un écran) vise 1,0 ; Cap 82-0 borne ses sous-onglets à 1,3. Ici, chaque écran se dit, et ceux
 *     qui dépassent `BORNE` se nomment : c'est le chantier de P17. Rien ne se juge encore sur la hauteur.
 *   LE BORD : rien ne colle à moins de 8 px des bords de l'écran (scripts/lib/bords.mjs, repris de Cap 82-0) — jugé.
 *
 * Il échoue aussi sur une erreur de la console, et si son parcours se perd (une étape qui ne mène nulle part).
 *
 *   python3 -m http.server 8000 &
 *   node scripts/essai_rogue.mjs http://localhost:8000
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { collesAuBord, MARGE } from './lib/bords.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(`${execSync('npm root -g').toString().trim()}/playwright`); }
const base = process.argv[2] || 'http://localhost:8000';
const BORNE = 1.3;
const navigateur = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
const erreurs = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(e.message));
page.on('dialog', d => d.accept());

const pause = ms => page.waitForTimeout(ms);
const visible = sel => page.$eval(sel, e => !e.hidden && !!(e.offsetWidth || e.offsetHeight)).catch(() => false);
const cliquer = async (sel, ms = 250) => { await page.click(sel); await pause(ms); };
const t0 = Date.now();

/* LA HAUTEUR D'UN ÉCRAN : la couche du dessus (une feuille : son corps), sinon le corps de l'écran visible. */
const hauteurDeLEcran = () => page.evaluate(() => {
  const vu = e => !e.hidden && !!(e.offsetWidth || e.offsetHeight);
  const couches = [...document.querySelectorAll('.couche')].filter(vu);
  const haut = couches.sort((a, b) => (+getComputedStyle(a).zIndex || 0) - (+getComputedStyle(b).zIndex || 0)).pop();
  const ecran = [...document.querySelectorAll('.ecran')].find(vu);
  const boite = haut ? (haut.querySelector(':scope > .corps') || haut) : ecran && (ecran.querySelector(':scope > .corps') || ecran);
  return boite ? boite.scrollHeight / Math.max(1, boite.clientHeight) : 0;
});
const ecrans = new Map();
const bords = new Map();
let vus = 0;
async function mesurer(nom) {
  await pause(150);
  const h = await hauteurDeLEcran();
  ecrans.set(nom, Math.max(h, ecrans.get(nom) || 0));
  for (const f of await collesAuBord(page)) bords.set(`${nom} : ${f}`, f);
  vus++;
}

/* L'OUVERTURE D'UN PACK : on touche la scène jusqu'à l'étalage, puis « Continuer ». */
async function passerOuverture() {
  await page.waitForSelector('#ouverture:not([hidden]) .paquet', { timeout: 15000 });
  for (let k = 0; k < 30 && !(await visible('#ouverture .ouv-fin')); k++) {
    await page.click('#ouverture .ouv-scene', { position: { x: 195, y: 260 } });
    await pause(await page.$('#ouverture .walkout') ? 2400 : 400);
  }
  await mesurer('l\'ouverture d\'un pack, l\'étalage');
  await cliquer('#ouverture .ouv-fin');
}

/* UNE VISITE : chaque section et chaque sous-onglet, puis « Ce soir », le sommaire d'hier soir, le choix qui attend. */
async function visiter(quand) {
  for (const section of await page.$$eval('.navtab[data-section]:not([hidden])', l => l.map(e => e.dataset.section))) {
    await cliquer(`.navtab[data-section="${section}"]`, 300);
    const sous = await page.$$eval('#sousnav:not([hidden]) .soustab[data-sous]', l => l.map(e => e.dataset.sous)).catch(() => []);
    if (!sous.length) await mesurer(`${section}`);
    for (const s of sous) {
      await cliquer(`.soustab[data-sous="${s}"]`, 300);
      await mesurer(`${section} › ${s}`);
    }
  }
  await cliquer('.navtab[data-section="bureau"]', 300);
  if (await page.$('.soustab[data-sous="boite"]')) await cliquer('.soustab[data-sous="boite"]', 200);
  if (await page.$('#vue [data-soir]')) {
    await cliquer('#vue [data-soir]', 300);
    await mesurer('ce soir');
    await page.keyboard.press('Escape'); await pause(200);
  }
  if (await page.$('#vue [data-sommaire]')) {
    await cliquer('#vue [data-sommaire]', 300);
    await mesurer('le sommaire');
    await page.keyboard.press('Escape'); await pause(200);
  }
  if (await visible('#decision')) {
    await cliquer('#decision', 300);
    await mesurer('un choix, en plein écran');
    await page.keyboard.press('Escape'); await pause(200);
  }
  informer(`la visite : ${quand}`, `${vus} écrans mesurés jusqu'ici`);
}

/* 1. LE DÉPART : le coach, la vedette, les cases, le pack de départ. */
await page.goto(base);
await page.waitForSelector('#t-nouvelle', { timeout: 15000 });
await mesurer('l\'écran titre');
await cliquer('#t-nouvelle', 300);
await cliquer('#depart [data-coach-choisi="stratege"]', 200);
await page.waitForSelector('#depart [data-vedette]', { timeout: 15000 });
await mesurer('le départ : ton coach, ta vedette');
await cliquer('#depart [data-vedette]', 300);
await cliquer('#d-commencer', 800);
for (let k = 0; k < 12; k++) {
  await page.waitForSelector('#depart-cases [data-case-passer], #pack:not([hidden]), #jouer:not([hidden])', { timeout: 15000 });
  const prendre = await page.$('#depart-cases [data-case-prendre]:not([disabled])');
  const passer = await page.$('#depart-cases [data-case-passer]');
  if (!prendre && !passer) break;
  await mesurer('le départ : une case et son loto');
  await (prendre || passer).click();
  await pause(400);
}
let perdu = false;
if (await visible('#pack')) {
  await mesurer('le départ : le pack de départ');
  await cliquer('#pack', 300);
  await passerOuverture();
}
if (!(await visible('#jouer'))) perdu = 'le cinq ne se complète pas au départ';
await mesurer('le départ : ton cinq');
if (!perdu) await cliquer('#jouer', 1500);

/* 2. LE SPLIT : une journée à la fois, ses décisions ; trois visites ; les séries ; le bilan. */
const etat = () => page.$eval('#teteEtat', e => e.textContent).catch(() => '');
const DATE_LIMITE = 9;
const visites = new Set();
let pas = 0, jouees = 0;
for (; !perdu && pas < 400 && !(await visible('#bilan')); pas++) {
  if (await visible('#ouverture')) { await passerOuverture(); continue; }
  if (await visible('#repechage')) { await mesurer('le repêchage des champions'); await cliquer('#repe-auto', 400); continue; }
  if (await visible('#choix')) { await mesurer('un choix, en plein écran'); await cliquer('#choix [data-choix]', 300); continue; }
  if (await visible('#decision')) { await cliquer('#decision', 300); continue; }
  const series = (await visible('#series')) || (await visible('#ronde'));
  const moment = series ? 'les séries' : jouees === 0 ? 'la première journée' : jouees === DATE_LIMITE ? 'la date limite' : null;
  if (moment && !visites.has(moment)) { visites.add(moment); await visiter(moment); continue; }
  let fait = false;
  for (const id of ['#journee', '#series', '#ronde', '#bilan-ouvrir']) {
    if (!(await visible(id))) continue;
    await cliquer(id, 350);
    if (id === '#journee') jouees++;
    fait = true;
    break;
  }
  if (!fait) perdu = `rien à toucher après ${pas} pas (${await etat()})`;
}
if (!perdu && !(await visible('#bilan'))) perdu = `pas de bilan après ${pas} pas`;
if (!perdu) {
  await pause(1200);
  await mesurer('le bilan du split');
}

/* 3. LE RAPPORT. */
const v2 = x => x.toFixed(2).replace('.', ',');
informer('les écrans, en hauteurs d\'écran', [...ecrans].map(([k, h]) => `${k} ${v2(h)}`).join(' · '));
const longs = [...ecrans].filter(([, h]) => h > BORNE).sort((a, b) => b[1] - a[1]);
informer(`au-dessus de ${v2(BORNE)} écran (le chantier de P17)`, longs.length ? longs.map(([k, h]) => `${k} ${v2(h)}`).join(' · ') : 'aucun');
exiger('le parcours va du titre au bilan du premier split', !perdu, perdu || `${pas} pas, ${visites.size} visites`);
exiger(`rien ne colle au bord (${MARGE} px)`, !bords.size, bords.size ? [...bords.keys()].slice(0, 8).join(' | ') + (bords.size > 8 ? ` (+${bords.size - 8})` : '') : `${vus} écrans mesurés`);
exiger('zéro erreur dans la console', !erreurs.length, erreurs.slice(0, 3).join(' · '));
informer('le temps', `${((Date.now() - t0) / 1000).toFixed(0)} s`);
await navigateur.close();
verdict('L\'essai du Rogue, à 390 × 844');
