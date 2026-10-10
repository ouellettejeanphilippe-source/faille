/*
 * Le jeu hors ligne, après une première visite. La coquille est préchargée ;
 * tout le reste de la même origine (les splits) passe réseau d'abord et se
 * garde au passage. Changer VERSION jette l'ancien cache à l'activation.
 */
const VERSION = 'faille-0.4.0';  // 0.4.0 : le rogue — le repêchage, la boutique, le coach

const FICHIERS = [
  './', 'index.html', 'style.css',
  // Le graphe de modules au complet — scripts/check_coquille.mjs le vérifie.
  'js/main.js', 'js/data.js', 'js/hasard.js', 'js/util.js', 'js/pile.js', 'js/cotes.js', 'js/fiche.js', 'js/images.js', 'js/sim.js', 'js/split.js',
  'js/repechage.js', 'js/tableau-repechage.js', 'js/rogue.js', 'js/boutique.js',
  'data/index.json', 'data/champions.json',
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
