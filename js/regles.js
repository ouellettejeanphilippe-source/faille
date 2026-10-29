/*
 * LES RÈGLES, en une page (le manuel de Cap 82-0). Chaque chiffre vient de la
 * constante que le jeu joue : changer une règle change sa page.
 */
import { esc } from './util.js';
import { PLAFOND, TARIFS } from './cotes.js';
import { RELANCES, MARCHE, MANDATS, OBJECTIF, ELAN, COMMANDITAIRES, ENTRAINEMENT, PACKS_JOUEURS, chancesJoueurs } from './gestion.js';
import { GARDES } from './partie.js';
import { JETONS, PLAN, PACKS, RARETES, PRIX_COACH, chances } from './rogue.js';
import { BANS } from './repechage.js';
import { MEDAILLES, RANGS, DEBLOCAGES, FINITIONS, EXIGENCES, PRIME_EXIGENCE } from './meta.js';
import { TROPHEES, GALONS } from './palmares.js';
import { STRATEGIES } from './strategie.js';

const liste = items => `<ul class="regles-liste">${items.map(x => `<li>${x}</li>`).join('')}</ul>`;

/** La page des règles. */
export function ecranRegles() {
  const niveau = TARIFS.find(([, c]) => c === MARCHE.coutMax);
  return `<h2>Les règles</h2>
    <h3>La run</h3>
    ${liste([
    `Le proprio fixe un mandat à chaque split, plus haut à chaque fois : ${MANDATS.map(([, m], k) => `${k + 1}. ${esc(m)}`).join(' ; ')}. Rempli, tu passes au split suivant ; manqué, la run finit.`,
    'Un titre gagne la run.',
    `Entre deux splits, tu gardes jusqu'à ${GARDES} joueurs ; un joueur qui a joué un split réel plus récent y vieillit. La roulette comble le reste.`,
  ])}
    <h3>Ton cinq</h3>
    ${liste([
    `Un joueur par rôle, sous un plafond de ${PLAFOND} points. Le coût suit le niveau : ${TARIFS.map(([n, c]) => `${esc(n)} ${c}`).join(' · ')}.`,
    'Un joueur ne se signe que si ce qui reste du plafond paie encore la case vide la moins chère pour chaque rôle à combler.',
    `La roulette sort un split et une équipe ; à chaque repêchage, ${Object.values(RELANCES).map(([m, n]) => `${n} « ${esc(m)} »`).join(', ')}.`,
  ])}
    <h3>Le split</h3>
    ${liste([
    'Ton cinq contre neuf vrais vestiaires de toutes les époques, chacun deux fois, en une partie. Puis les six premiers en séries de cinq parties ; les deux premiers attendent en demi-finale.',
    `Avant chacune de tes séries, le repêchage des champions : ${BANS} bannissements de chaque côté, puis un champion pour chacun de tes joueurs dans son vrai bassin. Loin de son plus joué, un joueur est moins à l'aise.`,
    `Ta stratégie (${Object.values(STRATEGIES).map(s => s[0]).join(' ')}) : son gain suit ce que tes joueurs savent faire, son prix se paie toujours.`,
    `L'entraînement : un joueur à la fois travaille un champion de son rôle ; ${ENTRAINEMENT.journees} journées plus tard, il entre à son bassin, « entraîné ».`,
  ])}
    <h3>Le marché</h3>
    ${liste([
    `Jusqu'à la date limite (la mi-split), ${MARCHE.offre} agents libres par journée, ${esc(niveau ? niveau[0] : '')} au plus, ${MARCHE.prix} 🪙 la signature. Ton banc, un sixième joueur, compte sous le plafond.`,
    ...Object.entries(PACKS_JOUEURS).map(([id, p]) => `${esc(p.nom)} : ${p.prix} 🪙, ${p.n} joueurs, ${chancesJoueurs(id).slice(0, 2).map(([n, k]) => `${esc(n)} 1 pack sur ${k}`).join(', ')}. Tu en signes un sans frais, avant la journée suivante ; les trois vont à ta collection.`),
  ])}
    <h3>Les jetons 🪙</h3>
    ${liste([
    `${JETONS.depart} au départ ; ${JETONS.victoire} par série gagnée, ${JETONS.defaite} par série perdue, ${JETONS.ronde} par ronde de séries gagnée.`,
    `Le proprio : ${OBJECTIF.jetons} par objectif de ${OBJECTIF.journees} journées atteint, ${ELAN.jetons} pour ${ELAN.suite} victoires de suite.`,
    `Le commanditaire, choisi parmi trois avant la première journée : ${Object.values(COMMANDITAIRES).map(([ico, nom, , j]) => `${ico} ${esc(nom)} ${j}`).join(' · ')} par partie réussie.`,
  ])}
    <h3>Le plan de jeu</h3>
    ${liste([
    `${PLAN} cartes au plus, qui jouent toutes tes séries. ${Object.entries(PACKS).map(([id, p]) => `${esc(p.nom)} ${p.prix} 🪙 (${chances(id).filter(([r]) => r !== 'commune').map(([r, n]) => `${esc(RARETES[r])} 1 sur ${n}`).join(', ')})`).join(' · ')}.`,
    `Un coach à la fois, ${PRIX_COACH} 🪙 ; sa confiance monte à chaque série jouée avec une carte de sa couleur au plan.`,
  ])}
    <h3>Les médailles 🏅 et la collection</h3>
    ${liste([
    `Une run rapporte ${MEDAILLES.split} par split joué, ${MEDAILLES.mandat} par mandat rempli, ${MEDAILLES.ronde} par ronde de séries gagnée, ${MEDAILLES.titre} par titre, ${MEDAILLES.run} de plus si elle est gagnée.`,
    `Les rangs, à vie : ${RANGS.map(([n, r]) => `${esc(r)} ${n}`).join(' · ')}.`,
    `Les déblocages : ${Object.values(DEBLOCAGES).map(d => `${d.ico} ${esc(d.nom)} ${d.prix}`).join(' · ')}.`,
    `La collection : une copie par run où le joueur est passé chez toi ; ${FINITIONS.map(([n, f]) => `${n} ${esc(f)}`).join(' · ')}.`,
    `Les exigences 🔺, après un premier titre : un cran à la fois, chacun ajouté à ceux d'avant — ${EXIGENCES.map((x, k) => `${k + 1}. ${esc(x.nom)} (${esc(x.mot)})`).join(' ; ')}. Chaque cran paie ${Math.round(100 * PRIME_EXIGENCE)} % de médailles de plus ; gagner au plus haut ouvre le suivant.`,
  ])}
    <h3>Les trophées et les galons</h3>
    ${liste([
    ...Object.values(TROPHEES).map(([ico, nom, mot]) => `${ico} ${esc(nom)} : ${esc(mot)}.`),
    ...Object.values(GALONS).map(([ico, nom, mot]) => `${ico} ${esc(nom)}, un galon : ${esc(mot)}.`),
  ])}`;
}
