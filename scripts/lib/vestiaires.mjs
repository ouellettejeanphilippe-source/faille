/*
 * LES VRAIES ÉQUIPES, pour les scripts du moteur (check_feuilles, check_graine).
 * Chaque split de data/splits/ avec ses profils (js/cotes.js), son tempo et
 * ses équipes telles que le moteur les lit (js/sim.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit } from '../../js/cotes.js';
import { tempoDuSplit, equipeReelle } from '../../js/sim.js';
import { hasard, piger } from '../../js/hasard.js';

const DOSSIER = path.join(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))), 'data/splits');

/** [{ split, tempo, equipes: Map(nom → équipe du moteur) }], un par shard. */
export function lireSplits() {
  if (!fs.existsSync(DOSSIER)) return [];
  return fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort().map(f => {
    const split = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8'));
    const profils = profilsDuSplit(split);
    const tempo = tempoDuSplit(split);
    const equipes = new Map(split.equipes.map(e => [e.nom, equipeReelle(split, e, profils, tempo)]).filter(([, e]) => e));
    return { split, tempo, equipes };
  });
}

/** Une ligue de `n` vraies équipes tirées dans tous les splits, comme la roulette du jeu. */
export function ligueDEssai(splits, n, graine) {
  const de = hasard(graine);
  const toutes = splits.flatMap(s => [...s.equipes.values()]);
  const choisies = new Set();
  while (choisies.size < Math.min(n, toutes.length)) choisies.add(piger(toutes, de));
  return [...choisies];
}
