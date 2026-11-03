/*
 * LE ROGUE (repris de Cap 82-0) : les jetons, les coachs, les liens d'origine.
 * Tout passe par les canaux du moteur (js/sim.js) et chaque coach, chaque
 * lien, est mesuré EN PAIRES (check_rogue) : la même ligue jouée deux fois
 * sous la même graine, l'effet donné à la moitié des équipes puis à l'autre.
 *
 *   les jetons   jamais gardés : recomptés des résultats, des primes et des
 *                achats (jetonsDe), sur toute la run (les splits finis dans
 *                `reports`, comptés de leurs résultats par gainsDe) ;
 *   le coach     un personnage (Cap 82-0, V21), choisi au départ de la run, qui
 *                la fait au complet : son EXPÉRIENCE se recompte des résultats
 *                (comme les jetons) ; son NIVEAU (1 à 5) ouvre ses trois
 *                POUVOIRS aux niveaux 1, 3 et 5, et un TALENT aux niveaux 2 et 4
 *                fait grandir celui que tu choisis. Un pouvoir lit la partie au
 *                début d'une phase (lignes, milieu, fin) et la frappe le temps
 *                de la phase, quand sa condition tient (js/sim.js). Sa main
 *                d'adjoints : js/adjoints.js.
 *
 * Le plan de jeu de quinze cartes et ses packs sont partis à la version 9
 * (Cap 82-0, la V13-2 ; docs/parite-cap82.md, la Q1) : ses meilleures idées
 * sont des styles d'adjoint.
 */
import { sommerEffets } from './canaux.js';
import { gainsDe, OBJECTIF, ELAN } from './gestion.js';

export const JETONS = { depart: 20, victoire: 4, defaite: 1, ronde: 20 };
/*
 * LES COACHS : leurs trois pouvoirs, ouverts aux niveaux NIVEAU_DES_POUVOIRS. Un pouvoir :
 * [id, nom, phase ('lignes', 'milieu', 'tardif'), sa condition en mots,
 * quand(etat), effet]. `etat` : ce qui est déjà joué, vu de ton camp — bleu,
 * avance (l'or), tours, dragons, k (les éliminations). Chacun joue à peu près
 * une partie sur deux, et fort quand il joue : check_rogue le borne et le voit.
 */
const pouvoir = (id, nom, phase, condition, quand, effet) => ({ id, nom, phase, condition, quand, effet });
export const COACHS = {
  agresseur: { ico: '🐺', nom: 'L\'agresseur', pouvoirs: [
    pouvoir('traque', 'La traque', 'lignes', 'en phase de lignes, du côté rouge', e => !e.bleu, { ligne: 0.18, rythme: 1.25 }),
    pouvoir('curee', 'La curée', 'milieu', 'au milieu de partie, en avance à l\'or', e => e.avance > 0, { combat: 0.15, rythme: 1.3, fin: 1.4 }),
    pouvoir('carnage', 'Le carnage', 'tardif', 'en fin de partie, en retard à l\'or', e => e.avance < 0, { combat: 0.22, rythme: 1.4 }),
  ] },
  stratege: { ico: '🐉', nom: 'Le stratège', pouvoirs: [
    pouvoir('controle', 'Le contrôle du fleuve', 'milieu', 'au milieu de partie, pas en avance aux dragons', e => e.dragons <= 0, { dragons: 2.2, objectifs: 0.12 }),
    pouvoir('vision', 'La vision du héraut', 'lignes', 'en phase de lignes, du côté bleu', e => e.bleu, { heraut: 2.5, objectifs: 0.3 }),
    pouvoir('baron', 'L\'appel du Nashor', 'tardif', 'en fin de partie, à 4 000 d\'or ou moins d\'écart', e => Math.abs(e.avance) <= 4000, { nashor: 2.2, objectifs: 0.25 }),
  ] },
  patient: { ico: '⏳', nom: 'Le patient', pouvoirs: [
    pouvoir('ferme', 'La ferme', 'lignes', 'en phase de lignes, du côté rouge', e => !e.bleu, { ligne: 0.14, rythme: 0.8 }),
    pouvoir('endurance', 'L\'endurance', 'tardif', 'en fin de partie, en retard à l\'or', e => e.avance < 0, { fin: 0.7, tardif: 0.3 }),
    pouvoir('dernierMot', 'Le dernier mot', 'tardif', 'en fin de partie, à 4 000 d\'or ou moins d\'écart', e => Math.abs(e.avance) <= 4000, { combat: 0.2, tardif: 0.3, rythme: 1.3 }),
  ] },
  assiegeant: { ico: '🏰', nom: 'L\'assiégeant', pouvoirs: [
    pouvoir('siege', 'Le siège', 'milieu', 'au milieu de partie, autant de tours ou plus', e => e.tours >= 0, { siege: 1.35, split: 1.6 }),
    pouvoir('beton', 'Le héraut au front', 'lignes', 'en phase de lignes, du côté bleu', e => e.bleu, { heraut: 2.2, siege: 1.2 }),
    pouvoir('percee', 'La percée', 'tardif', 'en fin de partie, en avance à l\'or', e => e.avance > 0, { fin: 1.4, siege: 1.3, combat: 0.1 }),
  ] },
};
/** Un pouvoir par son id : [coach, pouvoir]. */
export const pouvoirDe = id => Object.entries(COACHS).map(([c, co]) => [c, co.pouvoirs.find(x => x.id === id)]).find(([, x]) => x) || [null, null];

const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);

/*
 * L'ÉTAT D'UNE PARTIE DE ROGUE : des décisions, rien de compté. `joue` garde
 * chacune de tes séries jouées dans la run (le séjour d'un adjoint s'y compte).
 */
export const nouveauRogue = graine => ({ graine, achats: [], coach: null, joue: [], reports: [], primes: [] });

/** Ce que valent en jetons les gains d'un split (gainsDe). */
export const valeurDesGains = g => g.v * JETONS.victoire + g.d * JETONS.defaite + g.rondes * JETONS.ronde + g.objectifs * OBJECTIF.jetons + g.elan * ELAN.jetons + g.commandite;

/** Les jetons : le départ, les splits finis de la run, le split en cours, les primes, moins tes achats. */
export function jetonsDe(L, R) {
  const gagnes = [...R.reports, ...(L ? [gainsDe(L)] : [])].reduce((s, g) => s + valeurDesGains(g), 0);
  return JETONS.depart + gagnes + R.primes.reduce((s, p) => s + p.jetons, 0) - R.achats.reduce((s, a) => s + a.prix, 0);
}

/*
 * LES LIENS D'ORIGINE (repris des « liens » de LoL Esports Manager) : des
 * joueurs de ton cinq qui ont joué ensemble pour vrai. Une vraie équipe a
 * déjà les siens dans la partie calibrée ; un lien rend à ton cinq, fait de
 * plusieurs vestiaires, une part de ce qu'elle a. Chacun passe par les
 * canaux et se mesure en paires comme une carte, à sa rareté (check_rogue).
 *   [icône, nom, rareté, effets, condition sur les contrats du cinq]
 */
const memeVestiaire = (a, b) => a && b && a.ref.id === b.ref.id && a.ref.e === b.ref.e;
const plusGrand = (cinq, cle) => Math.max(0, ...Object.values([...cinq].reduce((n, c) => ({ ...n, [cle(c)]: (n[cle(c)] || 0) + 1 }), {})));
export const LIENS = {
  duoBas: ['🤝', 'Duo d\'origine au bas', 'peu', { ligne: 0.05 }, c => memeVestiaire(c.bas, c.soutien)],
  duoCentre: ['🧭', 'Duo d\'origine milieu-jungle', 'peu', { ligne: 0.03, rythme: 1.06 }, c => memeVestiaire(c.milieu, c.jungle)],
  vestiaire: ['🏠', 'Vestiaire d\'origine', 'peu', { combat: 0.04 }, c => plusGrand(Object.values(c), x => `${x.ref.id}|${x.ref.e}`) >= 3],
  couleurs: ['🎽', 'Les couleurs du club', 'commune', { objectifs: 0.06 }, c => plusGrand(Object.values(c), x => x.ref.e) >= 3],
};

/** Les liens actifs d'un cinq ({ rôle : contrat }). */
export const liensDe = cinq => Object.keys(LIENS).filter(id => LIENS[id][4](cinq));

/** Les effets de ton cinq : ses liens d'origine, ton plan de match (js/strategie.js) et les styles de tes adjoints en poste (js/adjoints.js), sommés par le moteur. */
export function effetsDeToi(liens = [], plan = null, styles = []) {
  return sommerEffets([plan, ...liens.map(id => LIENS[id][3]), ...styles]);
}

/*
 * LE COACH, UN PERSONNAGE (version 4). Son expérience : ce que rapportent tes
 * résultats (XP), recompté des splits finis et de celui en cours (la couleur
 * des cartes du plan est partie avec lui, à la version 9) ; `depart` : ce
 * qu'un déblocage lui donne. Ses niveaux (SEUILS_NIVEAU), ses pouvoirs aux niveaux
 * NIVEAU_DES_POUVOIRS, ses talents aux niveaux NIVEAU_DES_TALENTS : un talent
 * fait grandir un pouvoir de TALENT (moitié), ouvert ou pas encore.
 */
export const XP = { serie: 1, ronde: 2, titre: 3 };
export const SEUILS_NIVEAU = [0, 8, 20, 36, 56];
export const NIVEAU_DES_POUVOIRS = [1, 3, 5];
export const NIVEAU_DES_TALENTS = [2, 4];
export const TALENT = 0.5;

/** L'expérience de ton coach : le départ, les résultats de la run (les splits finis, celui en cours). */
export function xpDe(L, R, depart = 0) {
  if (!R.coach) return 0;
  return depart + [...R.reports, ...(L ? [gainsDe(L)] : [])].reduce((s, g) => s + g.v * XP.serie + g.rondes * XP.ronde + (g.titre || 0) * XP.titre, 0);
}

/** Le niveau (1 à 5) que vaut une expérience, et ce qui manque pour le suivant. */
export function niveauDe(xp) {
  const n = SEUILS_NIVEAU.filter(s => xp >= s).length;
  return { n, prochain: SEUILS_NIVEAU[n] ?? null };
}

/* Un pouvoir grandi de son talent : chaque canal de moitié plus loin du neutre. */
const grandir = effet => Object.fromEntries(Object.entries(effet).map(([c, v]) => [c, MULTIPLIE.has(c) ? v ** (1 + TALENT) : v * (1 + TALENT)]));

/** Les pouvoirs que joue le coach `id` à ce niveau, ses talents (des ids de pouvoirs) compris. */
export function pouvoirsDuPersonnage(id, niveau, talents = []) {
  return COACHS[id].pouvoirs.filter((_, k) => niveau >= NIVEAU_DES_POUVOIRS[k])
    .map(x => (talents.includes(x.id) ? { ...x, effet: grandir(x.effet) } : x));
}

/** Note la série que ton cinq vient de jouer, et si elle est gagnée. */
export function noterJoue(R, gagne) {
  R.joue.push({ gagne });
}

