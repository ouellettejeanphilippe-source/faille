/*
 * LE CATALOGUE DES SPLITS. Les noms des tournois changent d'une époque à
 * l'autre (NA LCS → LCS → LTA Nord, EU LCS → LEC, OGN Champions → LCK) : on
 * ne les écrit pas à la main, on les lit dans la table `Tournaments` de
 * Leaguepedia. Un split = une ligue, une année, une saison (printemps, été…),
 * sa saison régulière ET ses séries ; les qualifications, promotions et
 * relégations n'en sont pas.
 *
 * Les Mondiaux gardent leur entrée à eux (scripts/splits.json, ligue
 * « Mondial ») : c'est là que vivent les équipes des autres régions.
 *
 *   node scripts/catalogue.mjs        # réécrit scripts/splits.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargo } from './lib/leaguepedia.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FICHIER = path.join(ROOT, 'scripts/splits.json');

// Le début du nom d'un tournoi → la ligue du jeu.
const LIGUES = [
  ['NA LCS ', 'LCS'], ['LCS ', 'LCS'], ['LTA North ', 'LCS'],
  ['EU LCS ', 'LEC'], ['LEC ', 'LEC'],
  ['OGN Champions ', 'LCK'], ['Champions ', 'LCK'], ['LCK ', 'LCK'],
  ['LPL ', 'LPL'],
];
const ECARTES = /Promotion|Qualif|Relegation|Regional|Academy|Challengers|All-Star|Rift Rivals|Expansion|Showmatch|Cup Qualifier/i;
const SAISONS = { spring: 'Printemps', summer: 'Été', winter: 'Hiver', split: 'Split', cup: 'Coupe' };
const slug = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const tournois = await cargo('Tournaments', { nom: 'Name', page: 'OverviewPage', annee: 'Year', saison: 'Split', niveau: 'TournamentLevel', qualif: 'IsQualifier' },
  `Year >= 2011 AND (${LIGUES.map(([p]) => `Name LIKE '${p}%'`).join(' OR ')})`);

const splits = new Map();
for (const t of tournois) {
  const ligue = LIGUES.find(([p]) => t.nom.startsWith(p));
  if (!ligue || ECARTES.test(t.nom) || [true, 1, '1', 'Yes', 'true'].includes(t.qualif) || (t.niveau && t.niveau !== 'Primary')) continue;
  const annee = Number(t.annee);
  // La saison : la colonne Split, sinon le mot du nom qui suit l'année.
  const brut = t.saison || (t.nom.match(new RegExp(`${annee}\\s+(\\S+)`)) || [])[1] || 'Saison';
  const mot = Object.entries(SAISONS).find(([en]) => brut.toLowerCase().startsWith(en));
  const saison = mot ? brut.replace(new RegExp(`^${mot[0]}`, 'i'), mot[1]) : brut;
  const id = slug(`${ligue[1]}-${annee}-${saison}`);
  if (!splits.has(id)) splits.set(id, { id, nom: `${ligue[1]} ${annee} · ${saison}`, ligue: ligue[1], annee, pages: [] });
  if (!splits.get(id).pages.includes(t.page)) splits.get(id).pages.push(t.page);
}

const mondiaux = JSON.parse(fs.readFileSync(FICHIER, 'utf8')).filter(s => s.ligue === 'Mondial');
const tous = [...mondiaux, ...[...splits.values()].sort((a, b) => a.annee - b.annee || a.ligue.localeCompare(b.ligue) || a.id.localeCompare(b.id))];
fs.writeFileSync(FICHIER, `[\n${tous.map(s => `  ${JSON.stringify(s)}`).join(',\n')}\n]\n`);
for (const s of splits.values()) console.log(`${s.id.padEnd(28)} ${s.pages.join(' | ')}`);
console.log(`\nscripts/splits.json : ${mondiaux.length} Mondiaux, ${splits.size} splits de ligue`);
