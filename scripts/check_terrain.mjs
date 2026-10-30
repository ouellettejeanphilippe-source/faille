/*
 * LA FAILLE DU DIRECT (js/terrain.js), sur toutes les parties de quelques
 * splits de vraies équipes. Ce que la carte montre est LU dans la feuille ;
 * seule la place exacte est illustrative. On vérifie :
 *
 *   tout est placé       chaque événement du fil a sa place, dans la carte ;
 *   les tours tiennent   celles qui tombent sont celles de la feuille, camp par
 *                        camp ; une ligne tombe dans l'ordre (l'extérieure
 *                        d'abord) ; le nexus ne tombe qu'une fois sa ligne
 *                        d'assaut ouverte jusqu'à l'inhibiteur ;
 *   les mots disent vrai un combat d'équipe a au moins trois éliminations à
 *                        moins d'une minute l'une de l'autre ; une bataille a
 *                        son objectif pendant ; un gank, le jungler du camp ;
 *                        une poussée de côté, aucune élimination autour ;
 *   les joueurs          les dix ont toujours une place dans la carte ; un mort
 *                        attend à sa fontaine ; en phase de lignes, un laner
 *                        hors combat est dans sa ligne ;
 *                        un rappel se fait en phase de lignes, à sa fontaine ;
 *                        les sbires marchent dans la carte, pendant la partie ;
 *   il rejoue            la même graine redonne la même carte ;
 *   il varie             chaque genre de moment sort dans les parties.
 *
 *   node scripts/check_terrain.mjs
 */
import { creerSplit, jouerJournee } from '../js/sim.js';
import { LIGNES_FIN } from '../js/canaux.js';
import { terrainDe, positionsDe, rappelsDe, vaguesDe, GENRES, BASES } from '../js/terrain.js';
import { graineDe } from '../js/hasard.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const splits = lireSplits();
exiger('des splits à lire', splits.length > 0);
const fautes = { rappels: 0, sbires: 0, joueurs: 0, morts: 0, lignes: 0, place: 0, tours: 0, ordre: 0, nexus: 0, combat: 0, bataille: 0, gank: 0, poussee: 0, rejoue: 0 };
const vus = {};
let parties = 0, moments = 0;
const dans = e => e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100;
// Sept ligues du moteur d'aujourd'hui, et une du moteur d'avant (une vieille sauvegarde se regarde encore).
for (let g = 1; g <= 8; g++) {
  const L = creerSplit(ligueDEssai(splits, 10, g), { graine: g * 41, rondes: 2, bo: 1, moteur: g === 8 ? 1 : 2 });
  while (jouerJournee(L));
  for (const s of L.journees.flat()) {
    for (const p of s.parties) {
      parties++;
      const f = p.feuille;
      const graine = graineDe(L.graine, `${s.cle}-terrain`);
      const T = terrainDe(f, ['A', 'B'], graine);
      if (JSON.stringify(terrainDe(f, ['A', 'B'], graine)) !== JSON.stringify(T)) fautes.rejoue++;
      if (T.evenements.length !== f.fil.length || !T.evenements.every(dans)) fautes.place++;
      // Les tours : celles qui tombent, camp par camp, comme la feuille ; une ligne dans l'ordre.
      for (const camp of [0, 1]) {
        const tombees = T.tours.filter(t => t.camp === 1 - camp && t.tombe !== null).length;
        if (tombees !== f.equipes[camp].tours) fautes.tours++;
        for (const l of ['haut', 'milieu', 'bas']) {
          const ligne = T.tours.filter(t => t.camp === camp && t.ligne === l).sort((a, b) => a.k - b.k);
          for (let k = 1; k < 3; k++) if (ligne[k].tombe !== null && (ligne[k - 1].tombe === null || ligne[k - 1].tombe > ligne[k].tombe)) fautes.ordre++;
        }
      }
      // Les dix joueurs, minute par minute : dans la carte ; un mort à sa fontaine ; un laner tranquille dans sa ligne en phase de lignes.
      for (let t = 1; t < f.duree; t += 1) {
        const pos = positionsDe(T, f, t);
        if (pos.length !== 2 || pos.some(eq => eq.length !== 5 || !eq.every(dans))) fautes.joueurs++;
        pos.forEach((eq, camp) => eq.forEach((x, i) => {
          if (x.mort && Math.hypot(x.x - BASES[camp][0], x.y - BASES[camp][1]) > 5) fautes.morts++;
          // Dans le coup : un combat de la dernière minute, ou celui vers lequel il marche (la demi-minute qui vient).
          const recent = f.fil.some(e => e.quoi === 'elim' && e.t - t <= 0.6 && t - e.t < 1 && ((e.camp === camp && [e.tueur, ...e.aides].includes(i)) || (e.camp !== camp && e.victime === i)));
          if (t < LIGNES_FIN && !x.mort && !x.corps && !recent && i === 0 && !(x.x < 14 || x.y < 14)) fautes.lignes++;
        }));
      }
      if (JSON.stringify(positionsDe(T, f, 20)) !== JSON.stringify(positionsDe(terrainDe(f, ['A', 'B'], graine), f, 20))) fautes.rejoue++;
      // Les rappels : en phase de lignes, jamais pendant un combat du joueur ; au rappel, il est à sa fontaine.
      const rappels = rappelsDe(T, f, graine);
      rappels.forEach((eq, camp) => eq.forEach((ts, i) => ts.forEach(r => {
        if (r >= LIGNES_FIN || r < 5) fautes.rappels++;
        const p = positionsDe(T, f, r + 0.3, rappels)[camp][i];
        if (!p.mort && !p.corps && Math.hypot(p.x - BASES[camp][0], p.y - BASES[camp][1]) > 5 && !f.fil.some(e => e.quoi === 'elim' && Math.abs(e.t - r) < 1.5)) fautes.rappels++;
      })));
      // Les sbires : dans la carte, seulement pendant la partie.
      if (!vaguesDe(T, f, 10).every(dans) || vaguesDe(T, f, 0.5).length || vaguesDe(T, f, f.duree).length) fautes.sbires++;
      const perdant = 1 - f.gagnant;
      const ouverte = ['haut', 'milieu', 'bas'].some(l => T.tours.filter(t => t.camp === perdant && t.ligne === l).every(t => t.tombe !== null));
      if (!ouverte || T.tours.filter(t => t.camp === perdant && t.ligne === null).some(t => t.tombe === null)) fautes.nexus++;
      // Les mots disent ce que la feuille dit.
      const elims = f.fil.filter(x => x.quoi === 'elim');
      for (const a of T.actions) {
        moments++;
        vus[a.genre] = (vus[a.genre] || 0) + 1;
        const pendant = elims.filter(x => x.t >= a.debut && x.t <= a.t);
        if (a.genre === 'combat' && pendant.length < 3) fautes.combat++;
        if (a.genre.startsWith('bataille')) {
          const quoi = a.genre === 'batailleNashor' ? 'nashor' : 'dragon';
          if (!f.fil.some(x => x.quoi === quoi && x.t >= a.debut - 0.5 && x.t <= a.t) || pendant.length < 2) fautes.bataille++;
        }
        if (a.genre === 'gank' && !pendant.some(x => x.t < LIGNES_FIN && [x.tueur, ...x.aides].some(i => f.equipes[x.camp].joueurs[i].r === 'jungle'))) fautes.gank++;
        if (a.genre === 'poussee' && elims.some(x => Math.abs(x.t - a.t) <= 1)) fautes.poussee++;
      }
    }
  }
}
exiger('chaque événement du fil est placé, dans la carte', !fautes.place, `${parties} parties`);
exiger('les dix joueurs ont leur place, dans la carte', !fautes.joueurs);
exiger('un mort attend à sa fontaine', !fautes.morts);
exiger('en phase de lignes, le haut tient sa ligne', !fautes.lignes);
exiger('un rappel en phase de lignes, à sa fontaine', !fautes.rappels);
exiger('les sbires marchent dans la carte, pendant la partie', !fautes.sbires);
exiger('les tours tombées sont celles de la feuille', !fautes.tours);
exiger('une ligne tombe dans l\'ordre', !fautes.ordre);
exiger('le nexus tombe par une ligne ouverte', !fautes.nexus);
exiger('un combat d\'équipe : trois éliminations au moins', !fautes.combat);
exiger('une bataille : son objectif et un combat', !fautes.bataille);
exiger('un gank : le jungler dans le coup', !fautes.gank);
exiger('une poussée de côté : personne ne meurt autour', !fautes.poussee);
exiger('la même graine redonne la même carte', !fautes.rejoue);
const absents = Object.keys(GENRES).filter(k => !vus[k]);
exiger('chaque genre de moment sort', !absents.length, absents.join(', ') || `${moments} moments, ${(moments / parties).toFixed(1).replace('.', ',')} par partie`);
informer('les moments', Object.entries(vus).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${GENRES[k][0]} ${n}`).join(' · '));
verdict('La Faille du direct');
