/*
 * LE TEST DE FUMÉE (repris de Cap 82-0), avec Playwright, à 390 px de large.
 * Il joue comme un joueur, par les boutons de l'écran :
 *
 *   1. l'écran titre, « Nouvelle run », le départ (ton club), « Commencer » ;
 *   2. le repêchage de ton cinq, à la roulette (relances au besoin) ;
 *   3. le split : la décision du Bureau, une journée et son repêchage des
 *      champions (un bannissement, un champion choisi), hier soir ;
 *   4. le direct : la Faille dessinée, un moment nommé, « La fin », fermer ;
 *   5. les sections : l'Effectif (la carte d'un joueur), le Marché (agents,
 *      packs de joueurs, plan de jeu), la Ligue (classement, calendrier, meneurs) ;
 *   6. jusqu'aux séries, les séries, le bilan, ceux qui restent ;
 *   7. le menu : déblocages, collection (un album, une carte), palmarès,
 *      parties (exporter, puis importer ce fichier), règles, le titre ;
 *   8. la page rechargée : « Continuer » reprend la même partie.
 *
 * Il échoue sur une erreur de la console (hors images absentes : img/lp
 * n'est copié qu'au déploiement), un débordement horizontal, un bouton qui
 * ne mène nulle part.
 *
 *   python3 -m http.server 8000 &
 *   node scripts/smoke.mjs http://localhost:8000
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exiger, informer, verdict } from './verdict.mjs';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(`${execSync('npm root -g').toString().trim()}/playwright`); }
const base = process.argv[2] || 'http://localhost:8000';
const navigateur = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const erreurs = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(e.message));
page.on('dialog', d => d.accept());

const pause = ms => page.waitForTimeout(ms);
const visible = sel => page.$eval(sel, e => !e.hidden && !!(e.offsetWidth || e.offsetHeight)).catch(() => false);
const debordements = [];
const sansDebordement = async ou => { if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) debordements.push(ou); };
const etapes = [];
const etape = (nom, ok, detail = '') => { etapes.push(nom); exiger(nom, ok, detail); };

/* 1. Le titre et le départ. */
await page.goto(base);
await page.waitForSelector('#t-nouvelle', { timeout: 15000 });
etape('l\'écran titre', await visible('#titre'));
await page.click('#t-nouvelle');
await pause(200);
etape('le départ d\'une run', await visible('#depart') && !!(await page.$('#d-commencer')));
await page.click('#depart [data-coach-choisi="stratege"]');
await pause(150);
etape('un coach se choisit au départ', !!(await page.$('#depart [data-coach-choisi="stratege"].on')));
await page.click('#d-commencer');
await pause(300);

/* 2. Le repêchage de ton cinq. */
for (let k = 0; k < 30 && !(await visible('#jouer')); k++) {
  await page.click('#roulette');
  await pause(350);
  let b = await page.$('#vestiaire-liste button.signer:not([disabled])');
  while (!b) {
    const r = await page.$('#relances button:not([disabled])');
    if (!r) break;
    await r.click();
    await pause(350);
    b = await page.$('#vestiaire-liste button.signer:not([disabled])');
  }
  if (!b) { await page.keyboard.press('Escape'); continue; }
  if (k === 0) {
    // La carte d'un joueur du vestiaire, puis on signe depuis la rangée.
    await page.click('#vestiaire-liste .joueur');
    await pause(200);
    etape('la carte d\'un joueur du vestiaire', await visible('#carte .carte'));
    await page.keyboard.press('Escape');
    await pause(150);
  }
  await b.click();
  await pause(150);
}
await sansDebordement('le repêchage');
etape('ton cinq est complet', await visible('#jouer'));
await page.click('#jouer');
await pause(1500);

/* 3. Le split : la décision, une journée, son repêchage des champions, hier soir. */
etape('le Bureau et sa décision', await visible('#vue') && !!(await page.$('#vue [data-choix]')));
await page.click('#vue [data-choix]');
await pause(200);
etape('la bande des chiffres et la partie de ce soir', !!(await page.$('#bande .bande')) && !!(await page.$('#vue [data-soir]')) && /Jouer ce soir/.test(await page.$eval('#journee', e => e.textContent)));
await page.click('#vue [data-soir]');
await pause(250);
etape('« Ce soir » : l\'affiche et leur cinq', await visible('#soir') && (await page.$$('#soir .soir-cinq li')).length === 5);
await sansDebordement('ce soir');
await page.keyboard.press('Escape');
await pause(150);
await page.click('#journee');
await pause(400);
etape('le repêchage des champions', await visible('#repechage'));
const ban = await page.$('#repechage [data-ban]:not([disabled]):not(.banni)');
if (ban) { await ban.click(); await pause(100); }
await page.click('#repe-jouer');
await pause(500);
etape('hier soir dit ta série', !!(await page.$('#vue .hier')));
await sansDebordement('le Bureau');
await page.click('#vue [data-sommaire]');
await pause(300);
etape('le sommaire : trois étoiles, le pointage, la Faille de la partie', await visible('#sommaire') && (await page.$$('#sommaire .etoiles-liste li')).length === 3 && !!(await page.$('#sommaire .tf-carte')));
await sansDebordement('le sommaire');
await page.keyboard.press('Escape');
await pause(150);
for (const k of ['proprio', 'coach', 'vestiaire']) {
  await page.click(`.soustab[data-sous="${k}"]`);
  await pause(150);
  await sansDebordement(`le Bureau, ${k}`);
  if (k === 'coach') etape('ton coach au Bureau : son niveau, ses pouvoirs', !!(await page.$('#vue .coach-carte .coach-niveau')) && (await page.$$('#vue .coach-pouvoirs li')).length === 3);
}
await page.click('.soustab[data-sous="boite"]');
await pause(150);

/* 4. Le direct et la Faille. */
await page.click('#vue [data-direct]');
await pause(2500);
etape('le direct dessine la Faille', await visible('#direct') && (await page.$$('#direct .tf-tour')).length === 22 && (await page.$$('#direct .tf-camp')).length === 12);
etape('les dix joueurs, sur la carte et au tableau', (await page.$$('#direct .tf-joueur .tf-nom')).length === 10 && (await page.$$('#direct .dt-camp li')).length === 10);
await page.click('#dt-vite');
await pause(2500);
const moment = await page.$eval('#direct .tf-action', e => e.textContent.trim()).catch(() => '');
etape('un moment de la partie se nomme', moment.length > 0, moment);
await page.click('#dt-fin');
await pause(300);
etape('la fin du direct, sa vedette', !!(await page.$('#direct .dt-fin')));
await sansDebordement('le direct');
await page.click('#direct [data-retour]');
await pause(200);

/* 5. Les sections. */
await page.click('.navtab[data-section="effectif"]');
await pause(300);
await page.click('.soustab[data-sous="joueurs"]');
await pause(200);
await page.click('#vue [data-tri="k"]');
await pause(150);
etape('le tableau des joueurs se trie', (await page.$$('#vue .tableau-joueurs tbody tr')).length >= 5 && !!(await page.$('#vue [data-tri="k"].on')));
await page.click('#vue [data-vue-joueurs="vraie"]');
await pause(150);
await sansDebordement('les joueurs');
await page.click('.soustab[data-sous="cinq"]');
await pause(150);
await page.click('#vue [data-contrat]');
await pause(300);
etape('la carte d\'un joueur de ton effectif, ses stats chez toi', !!(await page.$('#carte .carte-chez-toi')));
await page.keyboard.press('Escape');
await page.click('#ouvrir-strategie');
await pause(200);
await page.click('#strategie [data-strategie]:not(.active)');
await pause(200);
etape('une stratégie se choisit', !(await visible('#strategie')));
await page.click('.navtab[data-section="marche"]');
await pause(800);
etape('les agents libres', !!(await page.$('#vue .liste-joueurs, #vue .sous')));
await page.click('.soustab[data-sous="joueurs"]');
await pause(200);
const pj = await page.$('#vue [data-pack-joueurs]:not([disabled])');
if (pj) {
  await pj.click();
  await pause(1000);
  etape('un pack de joueurs s\'ouvre', (await page.$$('#vue .joueur.agent')).length === 3);
}
await page.click('.soustab[data-sous="plan"]');
await pause(200);
etape('le plan de jeu', !!(await page.$('#vue [data-pack]')));
await page.click('.navtab[data-section="ligue"]');
for (const k of ['calendrier', 'meneurs', 'classement']) {
  await page.click(`.soustab[data-sous="${k}"]`);
  await pause(150);
  await sansDebordement(`la ligue, ${k}`);
}
etape('les meneurs et le classement', !!(await page.$('#vue .classement li')));

/* « Regarder » : la journée se joue et sa partie s'ouvre en direct. */
await page.click('.navtab[data-section="bureau"]');
await pause(200);
for (let k = 0; k < 4 && !(await visible('#regarder')); k++) {
  const choix = await page.$('#vue [data-choix]');
  if (choix) { await choix.click(); await pause(150); }
}
if (await visible('#regarder')) {
  await page.click('#regarder');
  await pause(400);
  if (await visible('#repechage')) { await page.click('#repe-auto'); await pause(500); }
  etape('« Regarder » ouvre la partie en direct', await visible('#direct'));
  await page.click('#dt-fin');
  await pause(200);
  await page.click('#direct [data-retour]');
  await pause(150);
}

/* 6. Jusqu'aux séries, les séries, le bilan. */
for (let k = 0; k < 60 && !(await visible('#bilan')); k++) {
  if (await visible('#repechage')) { await page.click('#repe-auto'); await pause(250); continue; }
  const choix = await page.$('#vue [data-choix]');
  if (choix && await choix.isVisible()) { await choix.click(); await pause(150); continue; }
  for (const id of ['#decision', '#jusqua', '#series', '#ronde', '#bilan-ouvrir']) {
    if (await visible(id)) { await page.click(id); await pause(350); break; }
  }
}
etape('le bilan du split', await visible('#bilan'));
await pause(1500);
await sansDebordement('le bilan');
if (await page.$('#bilan-suivant')) {
  const garder = await page.$('#bilan [data-garder]:not([disabled])');
  if (garder) { await garder.click(); await pause(150); }
  await page.click('#bilan-suivant');
  await pause(400);
  etape('le split suivant commence au repêchage', await visible('#bati'));
} else etape('la run finit au bilan', !!(await page.$('#bilan-nouvelle')));

/* 7. Le menu. */
await page.click('#menuBtn');
await pause(200);
for (const o of ['deblocages', 'collection', 'palmares', 'parties', 'regles']) {
  await page.click(`#menu [data-ouvrir="${o}"]`);
  await pause(300);
  etape(`le menu ouvre ${o}`, await visible(`#${o}`));
  await sansDebordement(o);
  if (o === 'collection') {
    for (const l of await page.$$('#collection .album-ligne')) {
      if (!/Aucune/.test(await l.innerText())) { await l.click(); break; }
    }
    await pause(600);
    await page.click('#album [data-carte-col]');
    await pause(300);
    etape('une carte de ta collection', !!(await page.$('#carte .carte-finition')));
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  }
  if (o === 'parties') {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click('#parties [data-exporter]')]);
    const fichier = path.join(os.tmpdir(), `faille-smoke-${process.pid}.json`);
    await dl.saveAs(fichier);
    etape('une partie s\'exporte', JSON.parse(fs.readFileSync(fichier, 'utf8')).faille === 1);
    await page.setInputFiles('#importer', fichier);
    await pause(1500);
    etape('et s\'importe', await visible('#bati') || await visible('#split') || await visible('#bilan'));
    fs.rmSync(fichier, { force: true });
    await page.click('#menuBtn');
    await pause(200);
    continue;
  }
  await page.keyboard.press('Escape');
  await pause(150);
}
await page.click('#m-titre');
await pause(300);
etape('quitter vers le titre', await visible('#titre') && !!(await page.$('#t-continuer')));

/* 8. Rechargée, la page reprend la même partie. */
const avant = await page.$eval('#t-continuer small', e => e.textContent);
await page.reload();
await page.waitForSelector('#t-continuer', { timeout: 15000 });
await page.click('#t-continuer');
await pause(1500);
const apres = await page.$eval('#teteEtat', e => e.textContent);
etape('« Continuer » reprend la partie', /split/i.test(apres), `${avant} → ${apres}`);

exiger('rien ne déborde à 390 px', !debordements.length, debordements.join(', ') || `${etapes.length} étapes`);
exiger('zéro erreur dans la console', !erreurs.length, erreurs.slice(0, 3).join(' · '));
informer('le parcours', `${etapes.length} étapes`);
await navigateur.close();
verdict('Le test de fumée');
