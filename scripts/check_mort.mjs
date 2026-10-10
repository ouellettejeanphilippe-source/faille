/*
 * ZÉRO CODE INUTILE (repris de Cap 82-0). Échoue sur une déclaration du haut
 * d'un module de js/ que rien ne lit, un `export` que personne n'importe, un
 * nom importé jamais employé, une classe de style.css qu'aucun élément ne
 * porte. Le décompte est prudent (scripts/lib/mort.mjs) : il ne condamne
 * jamais un vivant.
 *
 *   node scripts/check_mort.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exiger, verdict } from './verdict.mjs';
import { lireSources, declarations, occurrences, occurrencesClasse, importeDeHors, importsInutiles, classesCss, prefixesDynamiques } from './lib/mort.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { code } = lireSources(ROOT);
const jsFiles = Object.keys(code).filter(f => f.startsWith('js/'));

const mortes = [], exportsDeTrop = [];
for (const f of jsFiles) {
  for (const d of declarations(code[f])) {
    const ici = occurrences(code[f], d.nom) - 1;
    const ailleurs = d.exporte ? Object.entries(code).filter(([g]) => g !== f).reduce((a, [, c]) => a + occurrences(c, d.nom), 0) : 0;
    if (ici + ailleurs <= 0) { mortes.push(`${f}:${d.ligne} ${d.nom}`); continue; }
    if (!d.exporte || importeDeHors(code, f, d.nom).length) continue;
    // Une ligne qui exporte plusieurs constantes (ou dont le corps en nomme d'autres) se juge entière.
    const ligne = code[f].split('\n')[d.ligne - 1];
    const noms = [...ligne.matchAll(/(?:^export\s+(?:const|let|var)\s+|,\s*)([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]);
    if (noms.length > 1 && noms.some(n => n !== d.nom && importeDeHors(code, f, n).length)) continue;
    exportsDeTrop.push(`${f}:${d.ligne} ${d.nom}`);
  }
}
exiger('aucune déclaration morte dans js/', !mortes.length, mortes.join(' · ') || 'aucune');
exiger('aucun « export » que personne n\'importe', !exportsDeTrop.length, exportsDeTrop.join(' · ') || 'aucun');

const imports = [];
for (const f of jsFiles) for (const n of importsInutiles(code[f])) imports.push(`${f} ${n}`);
exiger('aucun nom importé pour rien', !imports.length, imports.join(' · ') || 'chaque nom importé sert');

const classes = classesCss(fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8'));
const prefixes = [...prefixesDynamiques(code)];
const tout = Object.entries(code).filter(([f]) => f.startsWith('js/') || f === 'index.html').map(([, c]) => c).join('\n');
const classesMortes = [...classes].filter(c => !occurrencesClasse(tout, c) && !prefixes.some(p => c.startsWith(p)));
exiger('aucune classe CSS sans élément', !classesMortes.length, classesMortes.join(' ') || `${classes.size} classes`);

verdict('Le code mort');
