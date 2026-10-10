/*
 * LA COQUILLE HORS LIGNE — sw.js liste-t-il tout ce que la page charge ?
 * Part de index.html, suit les `import` de proche en proche, ramasse ce que
 * la page et la feuille de style demandent, et compare au tableau FICHIERS.
 * Les splits (data/splits/) n'y sont pas exprès : ils se gardent au passage.
 *
 *   node scripts/check_coquille.mjs
 */
import { readFileSync } from 'node:fs';
import { exiger, informer, verdict } from './verdict.mjs';

const lire = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const sw = lire('sw.js');
const bloc = sw.match(/const FICHIERS = \[([\s\S]*?)\];/);
const FICHIERS = new Set((bloc ? bloc[1] : '').match(/'[^']+'/g)?.map(s => s.slice(1, -1)) ?? []);
const normaliser = p => p.replace(/^\.\//, '').replace(/^\//, '');

function graphe() {
  const html = lire('index.html');
  const vus = new Set();
  const file = [...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)].map(m => normaliser(m[1]));
  while (file.length) {
    const f = file.shift();
    if (vus.has(f)) continue;
    vus.add(f);
    const dossier = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '';
    for (const m of lire(f).matchAll(/from\s+'([^']+)'/g)) {
      if (m[1].startsWith('.')) file.push(new URL(m[1], `file:///${dossier}/`).pathname.slice(1));
    }
  }
  return [...vus].sort();
}

const modules = graphe();
const manquants = modules.filter(f => !FICHIERS.has(f));
exiger('tous les modules du graphe sont dans FICHIERS', !manquants.length, manquants.join(', ') || `${modules.length} modules`);

const statiques = new Set(['data/index.json']);
for (const m of lire('index.html').matchAll(/(?:href|src)="((?!https?:|data:|#)[^"]+)"/g)) {
  const p = normaliser(m[1]);
  if (!p.endsWith('.js')) statiques.add(p);
}
for (const m of lire('style.css').matchAll(/url\(([^)]+)\)/g)) {
  const p = normaliser(m[1].replace(/['"]/g, '').trim());
  if (!p.startsWith('data:') && !p.startsWith('http') && !p.startsWith('#')) statiques.add(p);
}
const absents = [...statiques].filter(f => !FICHIERS.has(f)).sort();
exiger('styles et index des splits sont dans FICHIERS', !absents.length, absents.join(', ') || `${statiques.size} fichiers`);

const morts = [...FICHIERS].filter(f => { try { lire(f === './' ? 'index.html' : f); return false; } catch { return true; } });
exiger('aucun chemin mort dans FICHIERS', !morts.length, morts.join(', ') || `${FICHIERS.size} chemins`);

informer('modules suivis', modules.join(' '));
verdict('La coquille hors ligne');
