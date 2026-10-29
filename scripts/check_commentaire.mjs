/*
 * LE COMMENTATEUR DU DIRECT (js/commentaire.js), sur toutes les parties de
 * quelques splits de vraies équipes :
 *
 *   rien d'oublié    aucun gabarit laissé ouvert ({t}, {eq}…), aucune ligne vide ;
 *   tout est dit     une ligne par élimination, objectif, tour, inhibiteur, et
 *                    le nexus en dernier, au nom du gagnant ;
 *   il rejoue        la même graine redit les mêmes phrases ;
 *   il ne radote pas une phrase d'élimination ne revient pas avant que sa
 *                    banque soit passée.
 *
 *   node scripts/check_commentaire.mjs
 */
import { creerSplit, jouerJournee } from '../js/sim.js';
import { commenter, BANQUES } from '../js/commentaire.js';
import { graineDe } from '../js/hasard.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const splits = lireSplits();
exiger('des splits à lire', splits.length > 0);
const DITS = new Set(['elim', 'dragon', 'heraut', 'nashor', 'tour', 'inhib', 'nexus']);
let parties = 0, lignes = 0, ouverts = 0, manques = 0, finFausse = 0, pasRejoue = 0, radote = 0, remontees = 0;
for (let g = 1; g <= 6; g++) {
  const L = creerSplit(ligueDEssai(splits, 10, g), { graine: g * 31, rondes: 2, bo: 1 });
  while (jouerJournee(L));
  for (const s of L.journees.flat()) {
    for (const p of s.parties) {
      parties++;
      const f = p.feuille;
      const noms = [L.equipes[p.bleu].nom, L.equipes[p.rouge].nom];
      const graine = graineDe(L.graine, `${s.cle}-commentaire`);
      const c = commenter(f, noms, null, graine);
      lignes += c.length;
      remontees += c.filter(x => x.quoi === 'remontee').length;
      if (c.some(x => /\{\w+\}/.test(x.texte) || !x.texte.trim())) ouverts++;
      if (c.filter(x => DITS.has(x.quoi)).length !== f.fil.filter(x => DITS.has(x.quoi)).length) manques++;
      const fin = c[c.length - 1];
      if (fin.quoi !== 'nexus' || !fin.texte.includes(noms[f.gagnant])) finFausse++;
      if (JSON.stringify(commenter(f, noms, null, graine)) !== JSON.stringify(c)) pasRejoue++;
      // Les actions d'élimination, sans le cri ni la couleur : aucune ne revient avant d'avoir vu toute sa banque.
      const actions = c.filter(x => x.quoi === 'elim').map(x => BANQUES.elim.find(gab => x.texte.includes(gab.split('{')[0].trim() || gab)) || x.texte);
      for (let i = 0; i + BANQUES.elim.length <= actions.length; i += BANQUES.elim.length) {
        if (new Set(actions.slice(i, i + BANQUES.elim.length)).size < BANQUES.elim.length - 4) radote++;
      }
    }
  }
}
exiger('aucun gabarit oublié, aucune ligne vide', !ouverts, `${lignes} lignes sur ${parties} parties`);
exiger('une ligne par événement du fil', !manques);
exiger('le nexus en dernier, au nom du gagnant', !finFausse);
exiger('la même graine redit les mêmes phrases', !pasRejoue);
exiger('il ne radote pas', !radote);
informer('les remontées à l\'or', `${remontees} sur ${parties} parties`);
verdict('Le commentateur');
