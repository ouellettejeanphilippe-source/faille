/*
 * LE TEST DE FUMÉE (repris de Cap 82-0), avec Playwright, à 390 px de large.
 * Il joue comme un joueur, par les boutons de l'écran :
 *
 *   1. l'écran titre, « Nouvelle partie », le départ (ton coach, ton joueur
 *      de concession), « Commencer la run » ;
 *   2. le départ du Rogue : les cases (prendre, ou personne), le pack de départ,
 *      qui s'ouvre (le paquet, la pile de cartes, l'étalage) ;
 *   3. le split : la ligne d'À faire, qui ouvre son choix en plein écran ; une journée et son repêchage des
 *      champions (un bannissement, un champion choisi), hier soir ;
 *   4. le direct : la Faille dessinée, un moment nommé, « La fin », fermer ;
 *   5. les sections de Cap 82-0 : les Joueurs, le Cinq (la carte d'un joueur), le
 *      Marché (agents, packs de joueurs, plan de jeu, album), la Ligue (classement,
 *      calendrier, meneurs, palmarès) ;
 *   6. jusqu'aux séries, les séries, le bilan, ceux qui restent ;
 *   7. le menu : déblocages, collection (un album, une carte), palmarès,
 *      parties (exporter, puis importer ce fichier), règles, le titre ;
 *   8. la page rechargée : « Continuer » reprend la même partie ;
 *   9. le 18-0 : la roulette et le vestiaire (la carte d'un joueur), le split
 *      d'un coup, les séries, le bilan ; l'exhibition, en direct.
 *
 * Il échoue sur une erreur de la console (hors images absentes : img/lp
 * n'est copié qu'au déploiement), un débordement horizontal, une page qui
 * défile (chaque écran tient en un écran : seul son corps défile en dedans),
 * un bouton qui ne mène nulle part.
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
const sansDebordement = async ou => {
  const d = await page.evaluate(() => ({ large: document.documentElement.scrollWidth > window.innerWidth + 1, haut: document.documentElement.scrollHeight > window.innerHeight + 1 }));
  if (d.large) debordements.push(ou);
  if (d.haut) debordements.push(`${ou} (la page défile)`);
};
/*
 * L'OUVERTURE D'UN PACK (js/ouverture.js) : le paquet fermé, la déchirure, la pile (la carte du dessus se
 * retourne), l'étalage de toutes les cartes, « Continuer ». Le paquet flotte : on touche la scène.
 */
const scene = { position: { x: 195, y: 260 } };
const passerOuverture = async (n, nom) => {
  await page.waitForSelector('#ouverture:not([hidden]) .paquet', { timeout: 15000 });
  const ferme = await page.$eval('#ouverture .ouv', e => e.classList.contains('etat-ferme'));
  await page.click('#ouverture .ouv-scene', scene);
  await pause(700);
  const pile = !n || await page.$eval('#ouverture .ouv', e => e.classList.contains('etat-pile') || e.classList.contains('etat-walkout'));
  let vues = 0;
  for (let k = 0; k < 3 * n + 4 && !(await visible('#ouverture .ouv-fin')); k++) {
    if (await page.$('#ouverture .ouv-carte[data-pile="0"].retournee')) vues++;
    await page.click('#ouverture .ouv-scene', scene);
    await pause(await page.$('#ouverture .walkout') ? 2400 : 450);
  }
  const etale = (await page.$$('#ouverture .ouv-etalage .ouv-mini')).length;
  await sansDebordement(`l'ouverture : ${nom}`);
  etape(`${nom} s'ouvre : le paquet, ses cartes une à une, l'étalage`, ferme && pile && vues >= Math.min(1, n) && etale === n, `${vues} vues, ${etale} à l'étalage`);
  await page.click('#ouverture .ouv-fin');
  await pause(250);
  etape(`${nom} : « Continuer » rend l'écran`, !(await visible('#ouverture')));
};
const etapes = [];
const etape = (nom, ok, detail = '') => { etapes.push(nom); exiger(nom, ok, detail); };

/* 1. Le titre et le départ. */
await page.goto(base);
await page.waitForSelector('#t-nouvelle', { timeout: 15000 });
etape('l\'écran titre', await visible('#titre'));
await page.click('#t-nouvelle');
await pause(200);
etape('le départ d\'une partie', await visible('#depart') && !!(await page.$('#d-commencer')) && !!(await page.$('#depart [data-mode="rogue"].on')));
await page.click('#depart [data-coach-choisi="stratege"]');
await pause(150);
etape('un coach se choisit au départ', !!(await page.$('#depart [data-coach-choisi="stratege"].on')));
await page.waitForSelector('#depart [data-vedette]', { timeout: 15000 });
etape('trois étoiles de concession à la première run', (await page.$$('#depart [data-vedette]')).length === 3 && await page.$eval('#d-commencer', e => e.disabled));
await page.click('#depart [data-vedette]');
await pause(300);
etape('ta vedette choisie ouvre « Commencer »', !(await page.$('#depart [data-vedette]')) && !(await page.$eval('#d-commencer', e => e.disabled)));
await sansDebordement('le départ');
await page.click('#d-commencer');
await pause(800);

/* 2. Le départ du Rogue : les cases, puis le pack de départ. */
const departParCases = async () => {
  let cases = 0, prises = 0;
  for (let k = 0; k < 12; k++) {
    await page.waitForSelector('#depart-cases [data-case-passer], #pack:not([hidden]), #jouer:not([hidden])', { timeout: 15000 });
    const prendre = await page.$('#depart-cases [data-case-prendre]:not([disabled])');
    const passer = await page.$('#depart-cases [data-case-passer]');
    if (!prendre && !passer) break;
    cases++;
    if (prendre) { prises++; await prendre.click(); } else await passer.click();
    await pause(400);
  }
  return { cases, prises };
};
const d1 = await departParCases();
etape('les cases du départ : ta vedette prise', d1.cases >= 1 && d1.prises >= 1, `${d1.cases} cases, ${d1.prises} prises`);
etape('le pack de départ attend', await visible('#pack') && !!(await page.$('#depart-cases h3')));
await page.click('#pack');
await passerOuverture(5 - d1.prises, 'le pack de départ');
etape('le pack comble les rôles vides de bouche-trous', (await page.$$('#alignement .case.pleine')).length === 5);
await sansDebordement('le départ du Rogue');
etape('ton cinq est complet', await visible('#jouer'));
await page.click('#jouer');
await pause(1500);

/* 3. Le split : la décision, une journée, son repêchage des champions, hier soir. */
etape('le Bureau et sa décision : une ligne d\'À faire', await visible('#vue') && !!(await page.$('#vue [data-afaire]')) && !(await page.$('#vue [data-choix]')));
await sansDebordement('la Boîte');
await page.click('#vue [data-afaire]');
await pause(250);
etape('la ligne ouvre son choix en plein écran : la voix, le fait, ses réponses', await visible('#choix') && (await page.$$('#choix .option[data-choix]')).length >= 2 && !!(await page.$('#choix .feuille-voix')));
await page.keyboard.press('Escape');
await pause(150);
etape('« Plus tard » le laisse dans la boîte', !(await visible('#choix')) && !!(await page.$('#vue [data-afaire]')) && await visible('#decision'));
await page.click('#decision');
await pause(250);
await page.click('#choix [data-choix]');
await pause(250);
etape('réglé, le choix se ferme', !(await visible('#choix')) && !(await page.$('#vue [data-afaire]')));
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
await page.click('.navtab[data-section="joueurs"]');
await pause(300);
await page.click('#vue [data-tri="k"]');
await pause(150);
etape('le tableau des joueurs se trie', (await page.$$('#vue .tableau-joueurs tbody tr')).length >= 5 && !!(await page.$('#vue [data-tri="k"].on')));
await page.click('#vue [data-vue-joueurs="vraie"]');
await pause(150);
await sansDebordement('les joueurs');
await page.click('.navtab[data-section="cinq"]');
await pause(200);
await page.click('#vue [data-contrat]');
await pause(300);
etape('la carte d\'un joueur de ton effectif, ses stats chez toi', !!(await page.$('#carte .verso-chez-toi')));
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
  await passerOuverture(3, 'un pack de joueurs');
  etape('ses trois joueurs attendent leur signature', (await page.$$('#vue .joueur.agent')).length === 3);
}
await page.click('.soustab[data-sous="plan"]');
await pause(200);
etape('le plan de jeu', !!(await page.$('#vue [data-pack]')));
await page.click('.soustab[data-sous="album"]');
await pause(300);
etape('l\'Album du Marché : ta collection', (await page.$$('#vue .album-ligne')).length >= 1);
await page.click('.navtab[data-section="ligue"]');
for (const k of ['calendrier', 'meneurs', 'palmares', 'classement']) {
  await page.click(`.soustab[data-sous="${k}"]`);
  await pause(150);
  await sansDebordement(`la ligue, ${k}`);
}
etape('les meneurs, le palmarès et le classement', !!(await page.$('#vue .classement li')) && (await page.$$('.navtab:not([hidden])')).length === 5);

/* « Regarder » : la journée se joue et sa partie s'ouvre en direct. */
await page.click('.navtab[data-section="bureau"]');
await pause(200);
for (let k = 0; k < 4 && !(await visible('#regarder')); k++) {
  if (await visible('#decision')) { await page.click('#decision'); await pause(150); await page.click('#choix [data-choix]'); await pause(150); }
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
  if (await visible('#choix')) { await page.click('#choix [data-choix]'); await pause(150); continue; }
  if (await visible('#ouverture')) { await page.keyboard.press('Escape'); await pause(150); continue; }
  for (const id of ['#decision', '#jusqua', '#series', '#ronde', '#bilan-ouvrir']) {
    if (await visible(id)) { await page.click(id); await pause(350); break; }
  }
}
etape('le bilan du split', await visible('#bilan'));
await pause(1500);
await sansDebordement('le bilan');
if (await page.$('#bilan-suivant')) {
  etape('le bilan dit que ceux qui restent se tirent au loto', !(await page.$('#bilan [data-garder]')) && (await page.$$('#bilan .alignement .case')).length >= 5);
  await page.click('#bilan-suivant');
  await pause(600);
  await page.waitForSelector('#depart-cases [data-case-prendre], #depart-cases [data-case-passer]', { timeout: 15000 });
  etape('le split suivant commence au départ : ceux qui restent au loto, en cartes', await visible('#bati') && (await page.$$('#depart-cases .loto-carte .carton-recto')).length >= 1 && (await page.$$('#depart-cases .loto-carte')).length <= 3);
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
    etape('une carte de ta collection, son édition', !!(await page.$('#carte .verso-edition')) && !!(await page.$('#carte .fiche[class*="ed-"]')));
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

/* 9. LE 18-0 : la roulette, le vestiaire, le split d'un coup, les séries partie par partie, le bilan. Puis l'exhibition. */
await page.click('#menuBtn');
await pause(200);
await page.click('#m-titre');
await pause(300);
await page.click('#t-nouvelle');
await pause(200);
await page.click('#depart [data-mode="dixhuit"]');
await pause(200);
etape('le 18-0 se choisit au départ : ni coach, ni déblocage', !!(await page.$('#depart [data-mode="dixhuit"].on')) && !(await page.$('#depart [data-coach-choisi]')) && /18-0/.test(await page.$eval('#d-commencer', e => e.textContent)));
await page.click('#d-commencer');
await pause(400);
etape('le 18-0 part à la roulette', await visible('#bati') && await visible('#roulette') && !(await visible('#pack')));
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
    etape('la carte d\'un joueur du vestiaire : un carton 5:7 dans la série de son année', await visible('#carte .carton-recto') && !!(await page.$('#carte .fiche[class*="cs-"]')));
    const boite = await page.$eval('#carte .carton-recto', e => { const r = e.getBoundingClientRect(); return r.width / r.height; });
    etape('le carton est au format 5:7', Math.abs(boite - 5 / 7) < 0.02, boite.toFixed(3));
    await page.click('#carte .fiche-plaque [data-retourner]');
    await pause(700);
    etape('la carte se retourne : les stats au verso', !!(await page.$('#carte .fiche.au-verso')) && await visible('#carte .carton-verso .verso-stats'));
    await sansDebordement('la carte');
    await page.keyboard.press('Escape');
    await pause(150);
  }
  await b.click();
  await pause(150);
}
await sansDebordement('le repêchage du 18-0');
etape('le cinq du 18-0 est complet', await visible('#jouer'));
await page.click('#jouer');
await pause(2500);
etape('le 18-0 joue le split d\'un coup, droit au classement', await visible('#split') && await visible('#series') && !(await visible('#journee')) && !!(await page.$('#vue .classement li')) && (await page.$$('.navtab:not([hidden])')).length === 4);
await page.click('.navtab[data-section="bureau"]');
await pause(200);
etape('au 18-0, le Bureau sans décision ni plan', !(await page.$('#vue [data-choix]')) && !(await page.$('#ouvrir-strategie')) && (await page.$$('.soustab')).length === 2);
await sansDebordement('le Bureau du 18-0');
for (let k = 0; k < 40 && !(await visible('#bilan')); k++) {
  if (await visible('#repechage')) { etape('au 18-0, le jeu repêche', false); break; }
  for (const id of ['#series', '#ronde', '#bilan-ouvrir']) {
    if (await visible(id)) { await page.click(id); await pause(350); break; }
  }
}
etape('le bilan du 18-0 finit la partie', await visible('#bilan') && !!(await page.$('#bilan-nouvelle')) && /18-0/.test(await page.$eval('#bilan h1', e => e.textContent)));
await sansDebordement('le bilan du 18-0');
await page.click('#bilan-titre');
await pause(300);
await page.click('#t-exhibition');
await page.waitForSelector('#exhib-jouer:not([disabled])', { timeout: 15000 });
etape('l\'exhibition : deux vrais vestiaires', await visible('#exhibition') && (await page.$$('#exhibition .case')).length === 2);
await page.click('#exhib-jouer');
await pause(2000);
etape('l\'exhibition se joue en direct', await visible('#direct') && (await page.$$('#direct .tf-joueur .tf-nom')).length === 10);
await page.click('#dt-fin');
await pause(200);
await page.click('#direct [data-retour]');
await pause(150);

exiger('rien ne déborde à 390 px', !debordements.length, debordements.join(', ') || `${etapes.length} étapes`);
exiger('zéro erreur dans la console', !erreurs.length, erreurs.slice(0, 3).join(' · '));
informer('le parcours', `${etapes.length} étapes`);
await navigateur.close();
verdict('Le test de fumée');
