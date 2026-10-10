/*
 * Le jeu hors ligne, après une première visite. La coquille est préchargée ;
 * tout le reste de la même origine (les splits) passe réseau d'abord et se
 * garde au passage. Changer VERSION jette l'ancien cache à l'activation.
 */
const VERSION = 'faille-0.1.0';

const FICHIERS = [
  './', 'index.html', 'style.css',
  // Le graphe de modules au complet — scripts/check_coquille.mjs le vérifie.
  'js/main.js', 'js/data.js', 'js/hasard.js', 'js/util.js', 'js/pile.js', 'js/cotes.js',
  'data/index.json',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION)
    .then(c => Promise.allSettled(FICHIERS.map(f => c.add(new Request(f, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('faille-') && k !== VERSION).map(k => caches.delete(k))))
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

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(reseauDabord(req));
});
