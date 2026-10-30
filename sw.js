/*
 * Le jeu hors ligne, après une première visite. La coquille est préchargée ;
 * tout le reste de la même origine (les splits) passe réseau d'abord et se
 * garde au passage. Changer VERSION jette l'ancien cache à l'activation.
 */
const VERSION = 'faille-0.12.0';  // 0.12.0 : le moteur v2, une partie comme une vraie (sorts, niveaux, combats, monstres et tours de leur époque)

const FICHIERS = [
  './', 'index.html', 'style.css',
  // Le graphe de modules au complet — scripts/check_coquille.mjs le vérifie.
  'js/main.js', 'js/data.js', 'js/hasard.js', 'js/util.js', 'js/pile.js', 'js/cotes.js', 'js/fiche.js', 'js/images.js', 'js/sim.js', 'js/canaux.js', 'js/moteur.js', 'js/moteur-v1.js', 'js/split.js',
  'js/repechage.js', 'js/tableau-repechage.js', 'js/rogue.js', 'js/boutique.js', 'js/gestion.js', 'js/partie.js', 'js/bureau.js', 'js/strategie.js',
  'js/palmares.js', 'js/meta.js', 'js/sauvegardes.js', 'js/menu.js', 'js/depart.js', 'js/vitrine.js', 'js/regles.js', 'js/direct.js', 'js/commentaire.js', 'js/terrain.js', 'js/sons.js', 'js/soir.js',
  'data/index.json', 'data/champions.json',
  // La condensée de Cap 82-0 (OFL 1.1), et les polices des séries de cartes (fonts/POLICES.txt).
  'fonts/BarlowCondensed-700-latin.woff2', 'fonts/BarlowCondensed-700-latin-ext.woff2', 'fonts/BarlowCondensed-800-latin.woff2', 'fonts/BarlowCondensed-800-latin-ext.woff2',
  'fonts/PlayfairDisplay-700-latin.woff2', 'fonts/Michroma-400-latin.woff2', 'fonts/Anton-400-latin.woff2', 'fonts/RussoOne-400-latin.woff2', 'fonts/Oswald-500-latin.woff2',
  'fonts/BebasNeue-400-latin.woff2', 'fonts/Rajdhani-700-latin.woff2', 'fonts/Orbitron-700-latin.woff2', 'fonts/Exo2-800i-latin.woff2', 'fonts/Graduate-400-latin.woff2',
  'fonts/Teko-500-latin.woff2', 'fonts/Kanit-900i-latin.woff2', 'fonts/BigShouldersDisplay-700-latin.woff2', 'fonts/ArchivoBlack-400-latin.woff2', 'fonts/Righteous-400-latin.woff2',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION)
    .then(c => Promise.allSettled(FICHIERS.map(f => c.add(new Request(f, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('faille-') && k !== VERSION && k !== IMAGES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function reseauDabord(req) {
  const cache = await caches.open(VERSION);
  try {
    const rep = await fetch(req);
    if (rep && rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch {
    const enCache = await cache.match(req, { ignoreSearch: true });
    if (enCache) return enCache;
    if (req.mode === 'navigate') {
      const page = await cache.match('index.html') || await cache.match('./');
      if (page) return page;
    }
    throw new Error('hors ligne');
  }
}

/* Les images (photos et logos copiés dans img/lp, champions de Data Dragon) : le tiroir d'abord, borné. */
const IMAGES = 'faille-images';
const IMAGES_MAX = 2000;
const estImage = url => url.hostname === 'ddragon.leagueoflegends.com' || (url.origin === self.location.origin && url.pathname.includes('/img/'));
async function imageDabord(req) {
  const cache = await caches.open(IMAGES);
  const enCache = await cache.match(req);
  if (enCache) return enCache;
  const rep = await fetch(req);
  if (rep && (rep.ok || rep.type === 'opaque')) {
    cache.put(req, rep.clone());
    const cles = await cache.keys();
    if (cles.length > IMAGES_MAX) await Promise.all(cles.slice(0, cles.length - IMAGES_MAX).map(k => cache.delete(k)));
  }
  return rep;
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (estImage(url)) { ev.respondWith(imageDabord(req)); return; }
  if (url.origin !== self.location.origin) return;
  ev.respondWith(reseauDabord(req));
});
