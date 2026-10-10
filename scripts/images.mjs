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
 *   node scripts/images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exiger, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = 'https://static.wikia.nocookie.net/lolesports_gamepedia_en/images';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const LARGEUR = { photo: 240, logo: 96 };
const PAUSE = 150;
const dormir = ms => new Promise(r => setTimeout(r, ms));

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
for (const [chemin, largeur] of voulues) {
  const cible = path.join(ROOT, 'img/lp', `${decodeURIComponent(chemin)}.webp`);
  if (fs.existsSync(cible)) { deja++; continue; }
  await dormir(PAUSE);
  try {
    const rep = await fetch(`${SOURCE}/${chemin}/revision/latest/scale-to-width-down/${largeur}`, { headers: { 'User-Agent': AGENT } });
    if (!rep.ok) throw new Error(String(rep.status));
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.writeFileSync(cible, Buffer.from(await rep.arrayBuffer()));
    nouvelles++;
  } catch (err) {
    ratees.push(`${decodeURIComponent(chemin)} (${err.message})`);
  }
}

informer('images', `${voulues.size} voulues : ${nouvelles} téléchargées, ${deja} déjà là`);
// Une image ratée n'empêche pas de jouer (les initiales la remplacent), mais plus de 2 % dit qu'il y a un problème.
exiger('presque toutes les images sont là', ratees.length <= 0.02 * voulues.size, ratees.length ? `${ratees.length} ratées : ${ratees.slice(0, 5).join(', ')}` : 'aucune ratée');
verdict('Les images');
