/*
 * LA STRATÉGIE : le plan de match de ton cinq, au centre du split. Prioriser
 * les dragons, le Nashor, le héraut, pousser en solitaire, chercher les
 * combats à cinq, agresser tôt, jouer pour le tardif — et chacune DEMANDE
 * des joueurs : un jungler d'objectifs, un haut qui gagne sa ligne…
 *
 * Comme les systèmes de Cap 82-0 : le GAIN d'une stratégie suit son fit (les
 * sous-cotes des joueurs qu'elle demande, à leur rôle, dans leur split), son
 * PRIX se paie en entier. Bien ajustée, elle rapporte ; à contre-emploi, elle
 * coûte. Tout passe par les canaux du moteur (js/sim.js) et se mesure en
 * paires (check_rogue) ; le fit se dit en mots, comme un badge, jamais en cote.
 *
 * Les vraies équipes jouent leur vraie partie : leur identité (ce qu'elles
 * prenaient de plus que leur split) se lit sur leurs vraies parties, et le
 * dépisteur la dit.
 */
import { sommerEffets } from './sim.js';

const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);

/* [icône, nom, ce qu'elle fait, ce qu'elle demande [[rôle, axe]], gain (selon le fit), prix (entier)] */
export const STRATEGIES = {
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

/* Les paliers du fit, et d'une demande, comme ceux d'un badge : des mots. */
const FITS = [[0.5, 'Sur mesure'], [0.15, 'Bon fit'], [-0.15, 'Fit moyen'], [-Infinity, 'À contre-emploi']];
const DEMANDES = [[0.3, '✓'], [-0.3, '≈'], [-Infinity, '✗']];

/** Le fit d'une stratégie pour un cinq du moteur ({ rôle : joueur }) : la moyenne des sous-cotes demandées, en écarts types. */
export function fitDe(id, cinq) {
  const demande = STRATEGIES[id][3];
  return demande.reduce((s, [r, axe]) => s + (cinq[r].sous[axe] || 0), 0) / demande.length;
}

/** Le fit en mots, et chaque demande avec son signe (✓ ≈ ✗). */
export function lireFit(id, cinq) {
  const fit = fitDe(id, cinq);
  return {
    mot: FITS.find(([s]) => fit >= s)[1],
    demandes: STRATEGIES[id][3].map(([r, axe]) => [r, axe, DEMANDES.find(([s]) => (cinq[r].sous[axe] || 0) >= s)[1]]),
  };
}

/** Ce que gagne une stratégie : moitié à fit nul, rien à contre-emploi marqué, une fois et demie sur mesure. */
const echelle = fit => Math.max(0, Math.min(1.5, 0.5 + fit));
/*
 * L'EXÉCUTION : un plan que tes joueurs savent jouer rend toute l'équipe
 * meilleure au combat ; un plan à contre-emploi la défait. Nulle à fit nul,
 * de −EXECUTION/2 à +EXECUTION écarts types de combat (le système de Cap 82-0).
 */
const EXECUTION = 0.5;

/** Les effets d'une stratégie pour ce cinq, sur les canaux (null : aucune stratégie). */
export function effetDeStrategie(id, cinq) {
  if (!id) return null;
  const [, , , , gain, prix] = STRATEGIES[id];
  const k = echelle(fitDe(id, cinq));
  const g = Object.fromEntries(Object.entries(gain).map(([c, v]) => [c, MULTIPLIE.has(c) ? v ** k : v * k]));
  return sommerEffets([g, prix, { combat: EXECUTION * (k - 0.5) }]);
}

/*
 * L'IDENTITÉ D'UNE VRAIE ÉQUIPE : l'objectif qu'elle prenait le plus au-dessus
 * de la moyenne de son split, par partie (ses vraies parties, e.obj). Rend
 * { id, sien, moyenne } — id : une stratégie, ou null si rien ne dépasse.
 */
const OBJETS = { dragons: 'dragons', nashor: 'barons', heraut: 'herauts', split: 'tours' };
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
