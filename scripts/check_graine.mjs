/*
 * LA GRAINE REJOUE. La même graine donne la même suite, une autre graine une
 * autre, et aucun `Math.random` ne se glisse dans js/ : tout le hasard passe
 * par hasard() (js/hasard.js).
 *
 *   node scripts/check_graine.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasard } from '../js/hasard.js';
import { exiger, borne, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const suite = (graine, n) => { const de = hasard(graine); return Array.from({ length: n }, de); };

const a = suite(82, 10000), b = suite(82, 10000), c = suite(83, 10000);
exiger('la même graine, la même suite', a.every((x, i) => x === b[i]), '10 000 tirages');
exiger('une autre graine, une autre suite', a.some((x, i) => x !== c[i]));
exiger('chaque tirage dans [0, 1[', a.every(x => x >= 0 && x < 1));
borne('la moyenne des tirages', a.reduce((s, x) => s + x, 0) / a.length, 0.49, 0.51);

const fautifs = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))
  .filter(f => /Math\.random\s*\(/.test(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')));
exiger('aucun Math.random dans js/', !fautifs.length, fautifs.join(', ') || 'tout passe par hasard()');

verdict('La graine');
