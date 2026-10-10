/*
 * LE PLAFOND (js/cotes.js) — le coût suit le niveau, et le cinq se complète toujours.
 *
 *   1. Sur les vrais splits : deux joueurs du même niveau coûtent pareil, et
 *      un niveau plus haut coûte plus. Le coût ne dit donc rien que le niveau
 *      ne dise déjà (aucune cote dans le DOM).
 *   2. Des repêchages entiers, comme la roulette du jeu (js/main.js) : on
 *      retire tant que le vestiaire n'a personne de signable, on signe au
 *      hasard parmi les signables. Chaque repêchage finit ses cinq rôles sous
 *      le plafond, sans jamais user les vingt tirages d'un tour de roulette.
 *
 *   node scripts/check_plafond.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit, PLAFOND, signable } from '../js/cotes.js';
import { hasard, piger } from '../js/hasard.js';
import { exiger, informer, verdict } from './verdict.mjs';

const DOSSIER = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'data/splits');
const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
const ORDRE = ['Remplaçant', 'Régulier', 'Pilier', '★ Étoile', '★ Phénomène'];
const REPECHAGES = 2000;
const ESSAIS = 20;   // les tirages d'un tour de roulette (js/main.js, tourner)

const splits = fs.existsSync(DOSSIER)
  ? fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort().map(f => {
    const split = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8'));
    return { split, profils: profilsDuSplit(split).joueurs };
  })
  : [];
exiger('des splits à lire', splits.length > 0, `${splits.length} splits`);

// 1. Le coût suit le niveau.
const couts = new Map();
let joueurs = 0;
for (const { profils } of splits) {
  for (const p of profils.values()) {
    joueurs++;
    if (!couts.has(p.niveau)) couts.set(p.niveau, new Set());
    couts.get(p.niveau).add(p.cout);
  }
}
const uniques = [...couts.values()].every(s => s.size === 1);
exiger('un niveau, un coût', uniques, [...couts].map(([n, s]) => `${n} ${[...s].join('/')}`).join(' · '));
const parNiveau = ORDRE.filter(n => couts.has(n)).map(n => [...couts.get(n)][0]);
exiger('un niveau plus haut coûte plus', parNiveau.every((c, k) => !k || c > parNiveau[k - 1]), `${parNiveau.join(' < ')} (${joueurs} joueurs)`);

// 2. Des repêchages entiers.
const de = hasard(82);
let echecs = 0, tiragesMax = 0, depense = 0;
for (let n = 0; n < REPECHAGES; n++) {
  const pris = {};
  let reste = PLAFOND;
  for (let tour = 0; tour < ROLES.length; tour++) {
    const libres = ROLES.filter(r => !pris[r]);
    let signe = false;
    for (let essai = 0; essai < ESSAIS && !signe; essai++) {
      const { split, profils } = piger(splits, de);
      const equipe = piger(split.equipes, de);
      const ok = equipe.joueurs.filter(j => libres.includes(j.r) && signable(profils.get(j).cout, reste, libres.length));
      if (!ok.length) continue;
      const j = piger(ok, de);
      pris[j.r] = true;
      reste -= profils.get(j).cout;
      tiragesMax = Math.max(tiragesMax, essai + 1);
      signe = true;
    }
    if (!signe) { echecs++; break; }
  }
  if (reste < 0) echecs++;
  depense += PLAFOND - reste;
}
exiger('chaque repêchage complète son cinq sous le plafond', !echecs, `${REPECHAGES - echecs}/${REPECHAGES} repêchages`);
exiger(`un tour de roulette trouve toujours en ${ESSAIS} tirages`, tiragesMax <= ESSAIS, `${tiragesMax} tirages au plus`);
// Se lit sans se juger : ce que dépense un repêcheur qui signe au hasard (le plafond mord-il ?).
informer('dépense moyenne au hasard', `${(depense / REPECHAGES).toFixed(1)} pts sur ${PLAFOND}`);

verdict('Le plafond');
