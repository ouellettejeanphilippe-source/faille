/*
 * LE PLAN DE MATCH (jalon 8, P4 ; Cap 82-0, la V17 : *un plan change la FORME
 * du match, pas sa force*). Avant chaque partie, ton cinq choisit ce qu'il
 * priorise — les dragons, le héraut, la poussée de côté, les combats à cinq,
 * l'agression, le tardif — ou joue sa partie. La décision dure jusqu'à la
 * suivante ; elle se change avant chaque partie, séries comprises.
 *
 * Chaque plan paie ce qu'il donne : son gain (une priorité, une ligne, un
 * rythme) et son prix (ce qu'il cède) passent par les canaux du moteur, et
 * joué à chaque partie, il ne vaut presque rien en victoires, en moyenne des
 * ligues. Ce qui change, c'est la feuille : plus de dragons, des tours de
 * côté, une partie plus courte ou plus longue. Et contre qui : selon les deux
 * cinq et leur époque, l'un ou l'autre rend le plus, et aucun ne rend le plus
 * contre tous (`check_plan_de_match`). Tes joueurs ne le paient ni ne le
 * gagnent à leur fit : c'était la stratégie d'avant la version 8, qui donnait
 * de la force à qui avait les bons joueurs (MOTEUR.md § 10).
 *
 * Le Nashor n'a plus son plan : mesuré contre quatre-vingts adversaires, il
 * n'était jamais le meilleur, et il doublait le tardif, qui le prend.
 *
 * Mesuré (docs/parite-cap82.md B6) : chaque prix est réglé pour que le plan
 * vaille zéro victoire sur 96 ligues d'essai ; le héraut, qui n'existe pas
 * avant 2016, ne se joue que dans une partie qui en a un (`depuis`), et aucun
 * autre ne paie en héraut : un prix qu'une époque ne connaît pas serait gratuit.
 * [ico, nom, ce qu'il fait, ce qu'il donne, ce qu'il coûte, ses canaux, depuis]
 */
import { melangerTempos } from './canaux.js';

export const PLANS = {
  dragons: ['🐉', 'Le contrôle des dragons', 'Le jungler et le duo du bas tiennent le fleuve : les dragons, puis l\'âme.', 'Plus de dragons', 'Le Nashor et le haut de la carte leur reviennent plus souvent',
    { dragons: 1.5, nashor: -0.32, split: -0.32 }],
  heraut: ['🦀', 'Le héraut et les tours', 'Le haut de la carte d\'abord : le héraut, puis les tours qui tombent.', 'Le héraut, des tours plus tôt, une partie plus courte', 'Les dragons et le Nashor cédés',
    { heraut: 1.5, siege: 1.1, dragons: -0.79, nashor: -0.59 }, 2016],
  split: ['🪓', 'Pousser en solitaire', 'Ton haut pousse sa ligne seul pendant que les quatre autres tiennent.', 'Des tours de côté', 'À quatre, les combats et les objectifs coûtent',
    { split: 0.8, combat: -0.14, objectifs: -0.23 }],
  combats: ['💥', 'Les combats à cinq', 'On se regroupe tôt et on cherche le combat.', 'Plus de combats, et les objectifs qui suivent', 'Des lignes moins bien jouées',
    { combat: 0.11, objectifs: 0.26, rythme: 1.04, ligne: -0.17 }],
  agression: ['🐺', 'L\'agression précoce', 'Le jungler visite les lignes, les lignes poussent : on ferme avant le tardif.', 'Les lignes, une partie plus courte', 'Les dragons et le Nashor cédés',
    { ligne: 0.12, fin: 1.1, nashor: -1.05, dragons: -0.53, combat: -0.05 }],
  tardif: ['⏳', 'Jouer pour le tardif', 'Le tireur fait sa ferme : on étire la partie jusqu\'au Nashor.', 'Le Nashor et les dragons, une partie plus longue', 'La phase de lignes cédée',
    { nashor: 1.9, dragons: 0.75, fin: 0.8, ligne: -0.14 }],
};

/** L'année d'une partie entre deux équipes du moteur : celle de leurs époques mêlées (js/moteur.js `regles`). */
export const anneeEntre = (a, b) => Math.round(melangerTempos([a.tempo, b.tempo]).annee ?? 2020);
/** Le plan se joue-t-il dans une partie de cette année ? Le héraut n'existe pas avant 2016. */
export const planJoue = (id, annee) => !!PLANS[id] && !(PLANS[id][6] && annee < PLANS[id][6]);
/** Les canaux d'un plan pour une partie de cette année (null : ta partie, ou un plan que l'époque ne connaît pas). */
export const effetDuPlan = (id, annee) => (id && planJoue(id, annee) ? PLANS[id][5] : null);

/*
 * L'IDENTITÉ D'UNE VRAIE ÉQUIPE : l'objectif qu'elle prenait le plus au-dessus
 * de la moyenne de son split, par partie (ses vraies parties, e.obj). Les vraies
 * équipes jouent leur vraie partie (elles sont la calibration) : aucun plan ne
 * s'ajoute à elles, leur identité se dit. Rend { id, sien, moyenne } — id : une
 * clé d'IDENTITES, ou null si rien ne dépasse.
 */
const OBJETS = { dragons: 'dragons', nashor: 'barons', heraut: 'herauts', split: 'tours' };
export const IDENTITES = { dragons: ['🐉', 'les dragons'], nashor: ['🟣', 'le Nashor'], heraut: ['🦀', 'le héraut'], split: ['🪓', 'les tours'] };
export function identiteDe(split, e) {
  const parPartie = (eq, o) => (eq.obj && eq.obj[o] && eq.obj[o][1] ? eq.obj[o][0] / eq.obj[o][1] : null);
  let mieux = null;
  for (const [id, o] of Object.entries(OBJETS)) {
    const sien = parPartie(e, o);
    const xs = split.equipes.map(x => parPartie(x, o)).filter(x => x !== null);
    if (sien === null || !xs.length) continue;
    const moyenne = xs.reduce((s, x) => s + x, 0) / xs.length;
    const ecart = moyenne ? sien / moyenne - 1 : 0;
    if (ecart > 0.1 && (!mieux || ecart > mieux.ecart)) mieux = { id, sien, moyenne, ecart };
  }
  return mieux;
}
