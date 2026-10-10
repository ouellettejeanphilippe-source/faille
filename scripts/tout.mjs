/*
 * LES VÉRIFICATIONS RAPIDES, D'UN COUP. Lance chaque script l'un après
 * l'autre et sort en échec si un seul échoue. La CI l'appelle ; en local :
 *
 *   node scripts/tout.mjs                  # la liste rapide
 *   node scripts/tout.mjs check_graine     # seulement celui-là
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RAPIDES = ['check_graine', 'check_coquille', 'check_mort', 'check_cotes', 'check_feuilles'];
const liste = process.argv.slice(2).length ? process.argv.slice(2) : RAPIDES;
let echecs = 0;
for (const nom of liste) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ICI, `${nom.replace(/\.mjs$/, '')}.mjs`)], { encoding: 'utf8', env: process.env });
  const sortie = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0;
  if (!ok) echecs++;
  console.log(`${ok ? '✓' : '✗'} ${nom.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s`);
  if (!ok) console.log(sortie.split('\n').filter(l => /✗|Error|at /.test(l)).slice(0, 8).map(l => `    ${l}`).join('\n'));
}
console.log(echecs ? `\n${echecs} script(s) en échec.` : `\n${liste.length} scripts, tous verts.`);
process.exitCode = echecs ? 1 : 0;
