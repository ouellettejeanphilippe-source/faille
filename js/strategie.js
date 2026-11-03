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
 * gagnent à leur fit : c'était la stratégie d'avant (plus bas), qui donnait
 * de la force à qui avait les bons joueurs.
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
import { sommerEffets, melangerTempos } from './canaux.js';

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
 * LA STRATÉGIE D'AVANT LA VERSION 8, AU FIT : une partie d'avant la rejoue
 * telle quelle, et le moteur d'avant la version 6 (js/moteur-v1.js) aussi.
 * Son GAIN suivait le fit (les sous-cotes des joueurs qu'elle demandait),
 * son PRIX se payait en entier, et un plan bien ajusté rendait toute
 * l'équipe meilleure au combat. Mesuré (check_profondeur, jalon 8) : elle
 * donnait de la force à qui avait les bons joueurs, de +0,7 à +2,1 victoires
 * par split au tiers le mieux ajusté.
 * [icône, nom, ce qu'elle fait, ce qu'elle demande [[rôle, axe]], gain (selon le fit), prix (entier)]
 */
export const STRATEGIES_AU_FIT = {
  dragons: ['🐉', 'Le contrôle des dragons', 'Le jungler et le duo du bas tiennent le fleuve : les dragons, puis l\'âme.',
    [['jungle', 'objectifs'], ['soutien', 'vision'], ['bas', 'ligne']], { dragons: 2 }, { heraut: -0.8, nashor: -0.3 }],
  nashor: ['🟣', 'Jouer autour du Nashor', 'On cède le début, on prépare la vision et on force le Nashor.',
    [['jungle', 'objectifs'], ['milieu', 'implication'], ['soutien', 'vision']], { nashor: 2, tardif: 0.15 }, { dragons: -0.6, heraut: -0.3 }],
  heraut: ['🦀', 'Le héraut et les tours', 'Le haut de la carte d\'abord : le héraut, puis les tours qui tombent.',
    [['jungle', 'pression'], ['haut', 'pression'], ['milieu', 'pression']], { heraut: 2, siege: 1.2 }, { dragons: -0.8, tardif: -0.15 }],
  split: ['🪓', 'Pousser en solitaire', 'Ton haut pousse sa ligne seul pendant que les quatre autres tiennent.',
    [['haut', 'ligne'], ['haut', 'pression'], ['haut', 'survie']], { split: 1.5 }, { combat: -0.08 }],
  combats: ['💥', 'Les combats à cinq', 'On se regroupe tôt et on cherche le combat.',
    [['jungle', 'implication'], ['soutien', 'implication'], ['bas', 'degats']], { combat: 0.15, objectifs: 0.35, rythme: 1.05 }, { ligne: -0.03 }],
  agression: ['🐺', 'L\'agression précoce', 'Le jungler visite les lignes, les lignes poussent : on ferme avant le tardif.',
    [['jungle', 'implication'], ['milieu', 'ligne'], ['haut', 'ligne']], { ligne: 0.3, fin: 1.18 }, { tardif: -0.3 }],
  tardif: ['⏳', 'Jouer pour le tardif', 'Le tireur fait sa ferme : on cède le héraut et on étire la partie jusqu\'au Nashor.',
    [['bas', 'degats'], ['bas', 'ligne'], ['milieu', 'degats']], { nashor: 2.5, dragons: 1, fin: 0.74 }, { ligne: -0.04, heraut: -0.5 }],
};
const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);
/* Le fit : la moyenne des sous-cotes demandées, en écarts types. */
const fitDe = (id, cinq) => STRATEGIES_AU_FIT[id][3].reduce((s, [r, axe]) => s + (cinq[r].sous[axe] || 0), 0) / STRATEGIES_AU_FIT[id][3].length;
/* Moitié du gain à fit nul, rien à contre-emploi marqué, une fois et demie sur mesure ; l'exécution, de −EXECUTION/2 à +EXECUTION. */
const echelle = fit => Math.max(0, Math.min(1.5, 0.5 + fit));
const EXECUTION = 0.5;
/** (Avant la version 8) les effets d'une stratégie pour ce cinq, à son fit (null : aucune). */
export function effetAuFit(id, cinq) {
  if (!id) return null;
  const [, , , , gain, prix] = STRATEGIES_AU_FIT[id];
  const k = echelle(fitDe(id, cinq));
  const g = Object.fromEntries(Object.entries(gain).map(([c, v]) => [c, MULTIPLIE.has(c) ? v ** k : v * k]));
  return sommerEffets([g, prix, { combat: EXECUTION * (k - 0.5) }]);
}

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
