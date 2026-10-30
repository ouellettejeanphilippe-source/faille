/*
 * LES PHOTOS ET LES LOGOS, UNE FOIS. Le serveur d'images de Leaguepedia
 * refuse les pages des autres sites (un référent étranger rend 404, mesuré le
 * 10 octobre 2026) : on ne contourne pas ça. On télécharge chaque image une
 * seule fois, à la taille de la carte, dans img/lp/. Ce dossier est HORS DU
 * DÉPÔT (comme les photos d'action de Cap 82-0) : l'Action « Publier »
 * (pages.yml) le remplit au déploiement et le garde en cache. Une image déjà
 * là n'est pas redemandée.
 *
 * Les chemins viennent des shards (`photo`, `logo` : « e/e6/Fichier.png »,
 * scripts/build_splits.mjs) ; le fichier local est img/lp/<chemin>.webp.
 *
 * LES PORTRAITS SONT RECADRÉS, comme les visages de Cap 82-0 (JP : *photos des
 * joueurs officielles comme hockey ?*) : les photos de Leaguepedia sont pour la
 * plupart les détourées des séances officielles, la tête n'importe où dans un
 * grand vide ; scripts/recadrer.py (Pillow, outil de fabrication) trouve la
 * tête par la transparence et la pose toujours à la même place d'un portrait
 * 5:7, le fond transparent gardé. Sans Pillow, la photo reste telle quelle.
 *
 *   node scripts/images.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exiger, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = 'https://static.wikia.nocookie.net/lolesports_gamepedia_en/images';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const LARGEUR = { photo: 480, logo: 96 };   // la photo plus large que la carte : le recadrage zoome sur la tête
const PAUSE = 150;
const LOT = 40;                              // des portraits recadrés par appel de Python
const dormir = ms => new Promise(r => setTimeout(r, ms));
const PYTHON = process.env.PYTHON || 'python3';

/* Les portraits téléchargés, recadrés par lots ; rend ce que Python a dit de chacun (famille), ou null s'il manque. */
function recadrer(paires) {
  const faits = new Map();
  for (let i = 0; i < paires.length; i += LOT) {
    const lot = paires.slice(i, i + LOT);
    const r = spawnSync(PYTHON, [path.join(ROOT, 'scripts/recadrer.py'), ...lot.flat()], { encoding: 'utf8' });
    if (r.status !== 0 && !r.stdout) return null;
    for (const l of r.stdout.split('\n')) { const [cible, famille] = l.split(' '); if (cible && famille) faits.set(cible, famille); }
  }
  return faits;
}

const voulues = new Map();
const dossier = path.join(ROOT, 'data/splits');
for (const f of fs.readdirSync(dossier).filter(f => f.endsWith('.json'))) {
  for (const e of JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')).equipes) {
    if (e.logo) voulues.set(e.logo, LARGEUR.logo);
    for (const j of e.joueurs) if (j.photo) voulues.set(j.photo, LARGEUR.photo);
  }
}

let nouvelles = 0, deja = 0;
const ratees = [];
const brutes = [];   // [source téléchargée, cible] des portraits à recadrer
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faille-portraits-'));
for (const [chemin, largeur] of voulues) {
  const cible = path.join(ROOT, 'img/lp', `${decodeURIComponent(chemin)}.webp`);
  if (fs.existsSync(cible)) { deja++; continue; }
  await dormir(PAUSE);
  try {
    const rep = await fetch(`${SOURCE}/${chemin}/revision/latest/scale-to-width-down/${largeur}`, { headers: { 'User-Agent': AGENT } });
    if (!rep.ok) throw new Error(String(rep.status));
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    const octets = Buffer.from(await rep.arrayBuffer());
    if (largeur === LARGEUR.photo) {
      const brute = path.join(tmp, `${brutes.length}.img`);
      fs.writeFileSync(brute, octets);
      brutes.push([brute, cible]);
    } else fs.writeFileSync(cible, octets);
    nouvelles++;
  } catch (err) {
    ratees.push(`${decodeURIComponent(chemin)} (${err.message})`);
  }
}
// Les portraits, recadrés ; sans Pillow (ou une image que Python n'a pas pu lire), la photo reste telle quelle.
const familles = { detouree: 0, opaque: 0, brute: 0 };
const faits = brutes.length ? recadrer(brutes) : new Map();
for (const [brute, cible] of brutes) {
  const f = faits && faits.get(cible);
  if (f && fs.existsSync(cible)) familles[f] = (familles[f] || 0) + 1;
  else { fs.copyFileSync(brute, cible); familles.brute++; }
}
fs.rmSync(tmp, { recursive: true, force: true });

informer('images', `${voulues.size} voulues : ${nouvelles} téléchargées, ${deja} déjà là`);
informer('portraits recadrés', `${familles.detouree} détourés, ${familles.opaque} opaques${familles.brute ? `, ${familles.brute} laissés tels quels (Pillow absent ?)` : ''}`);
if (!faits && brutes.length) informer('Pillow', 'python3 et Pillow manquent : les portraits ne sont pas recadrés (pip install pillow)');
// Une image ratée n'empêche pas de jouer (les initiales la remplacent), mais plus de 2 % dit qu'il y a un problème.
exiger('presque toutes les images sont là', ratees.length <= 0.02 * voulues.size, ratees.length ? `${ratees.length} ratées : ${ratees.slice(0, 5).join(', ')}` : 'aucune ratée');
verdict('Les images');
