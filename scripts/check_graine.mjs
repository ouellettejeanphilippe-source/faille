/*
 * LA GRAINE REJOUE. La même graine donne la même suite, une autre graine une
 * autre, et aucun `Math.random` ne se glisse dans js/ : tout le hasard passe
 * par hasard() (js/hasard.js).
 *
 * Et le split rejoue : la même graine donne la même saison et les mêmes
 * séries, partie pour partie ; jouées une journée à la fois, avec du hasard
 * tiré ailleurs entre deux, elles donnent la même chose que d'un bloc.
 *
 *   node scripts/check_graine.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasard } from '../js/hasard.js';
import { creerSplit, jouerJournee, creerSeries, jouerRonde } from '../js/sim.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
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

/* Le split, d'un bloc ou au jour le jour. */
const splits = lireSplits();
if (splits.length) {
  const equipes = ligueDEssai(splits, 10, 7);
  // L'empreinte d'un split : chaque partie, sa durée, son vainqueur, ses éliminations ; puis le champion.
  const empreinte = L => JSON.stringify([...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])]
    .map(s => s.parties.map(p => [p.bleu, p.feuille.duree, p.feuille.gagnant, p.feuille.equipes.map(e => e.k)])).concat([L.series && L.series.champion]));
  const jouer = (graine, entreDeux) => {
    const L = creerSplit(equipes, { graine, rondes: 2, bo: 1 });
    while (jouerJournee(L)) entreDeux();
    creerSeries(L);
    while (jouerRonde(L)) entreDeux();
    return empreinte(L);
  };
  const ailleurs = hasard(5);
  const bloc = jouer(82, () => {}), jourParJour = jouer(82, () => { for (let i = 0; i < 17; i++) ailleurs(); });
  exiger('la même graine, le même split', bloc === jouer(82, () => {}), `${equipes.length} équipes, saison et séries`);
  exiger('au jour le jour comme d\'un bloc', bloc === jourParJour, 'du hasard tiré ailleurs entre chaque journée');
  exiger('une autre graine, un autre split', bloc !== jouer(83, () => {}));
  const L = creerSplit(equipes, { graine: 82, rondes: 2, bo: 1 });
  jouerJournee(L);
  exiger('les journées à venir ne sont pas jouées', L.journees.slice(1).flat().every(s => !s.parties.length && s.gagnant === null));
}

verdict('La graine');
