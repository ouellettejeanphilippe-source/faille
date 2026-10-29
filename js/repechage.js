/*
 * LE REPÊCHAGE DES CHAMPIONS — le deck d'une série (MOTEUR.md, « Le
 * repêchage »). Avant chacune de tes séries : l'adversaire bannit trois de
 * tes champions, tu bannis trois des siens, tu choisis un champion pour
 * chacun de tes cinq dans son vrai bassin, puis l'adversaire prend, joueur
 * par joueur, son plus joué qui reste. Tes choix passent avant les siens :
 * prendre le champion fétiche d'un adversaire le lui enlève.
 *
 * Ce que ça change passe par les canaux du moteur (js/sim.js), rien d'autre :
 *
 *   le confort      un joueur sur un champion qu'il a moins joué que son plus
 *                   joué perd des écarts types sur toutes ses sous-cotes :
 *                   CONFORT × (1 − √(ses parties dessus ÷ celles sur son plus
 *                   joué)) ; hors de son bassin, CONFORT entier. Sur son plus
 *                   joué, rien : les vraies équipes, sans repêchage, jouent
 *                   la partie calibrée ;
 *   la composition  les classes des cinq champions (Data Dragon) donnent la
 *                   forme de la partie, comptées contre la composition MOYENNE
 *                   des vraies équipes (REFERENCE, mesurée par check_rogue) :
 *                   une composition ordinaire ne change rien.
 *
 * L'adversaire bannit tes plus joués (bansAuto) : tu le sais d'avance, et
 * ton repêchage se prépare autour.
 */

const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
export const BANS = 3;
export const HORS = null;          // un joueur dont tout le bassin est pris joue hors de son bassin
const CONFORT = 0.6;
const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);

/*
 * LA COMPOSITION : ce que vaut une classe de plus que la moyenne, canal par
 * canal (un champion à deux classes compte pour moitié dans chacune). Les
 * multiplicatifs s'élèvent à la puissance de l'écart, les autres s'y multiplient.
 */
const COMPOSITION = {
  assassin: { rythme: 1.07, fin: 1.05 },       // des éliminations, et la partie se ferme tôt
  tireur: { tardif: 0.16, fin: 0.95 },         // faible tôt, fort tard : on étire la partie
  tank: { objectifs: 0.05, rythme: 0.96 },     // une ligne de front qui tient les objectifs
  mage: { siege: 1.06, tardif: 0.05 },         // le harcèlement qui fait tomber les tours
  combattant: { ligne: 0.05, tardif: -0.08 },  // la phase de lignes, puis il s'essouffle
  soutien: { objectifs: 0.04, rythme: 0.97 },  // la vision autour des objectifs
};
/* La composition moyenne des vraies équipes, chacun sur son plus joué — mesurée sur les shards (check_rogue). */
export const REFERENCE = { assassin: 0.54, tireur: 0.78, tank: 0.84, mage: 1.27, combattant: 0.85, soutien: 0.73 };

/** Les champions d'un joueur du moteur qu'il peut prendre : son bassin, moins ce qui est interdit. */
export const permis = (j, interdits) => j.bassin.filter(([c]) => !interdits.has(c));

/**
 * Les bannissements qui font le plus mal à `eq` : le plus joué de chacun des
 * cinq, les plus joués d'abord. C'est ainsi que l'adversaire bannit contre
 * toi, et ton repêchage automatique contre lui : à jeu égal, rien ne penche.
 */
export function bansAuto(eq, interdits = new Set()) {
  const tops = new Map();
  for (const r of ROLES) {
    const c = permis(eq.cinq[r], interdits)[0];
    if (c) tops.set(c[0], Math.max(c[1], tops.get(c[0]) || 0));
  }
  return [...tops].sort((a, b) => b[1] - a[1]).slice(0, BANS).map(([c]) => c);
}

/** Le repêchage d'une vraie équipe : à chaque rôle, son plus joué qui reste ; jamais deux fois le même. */
export function choixParDefaut(eq, interdits) {
  const pris = new Set(interdits);
  const choix = {};
  for (const r of ROLES) {
    const c = permis(eq.cinq[r], pris)[0];
    choix[r] = c ? c[0] : HORS;
    if (c) pris.add(c[0]);
  }
  return choix;
}

/** Ce que coûte à un joueur le champion `c` : des écarts types, de −CONFORT à 0. */
export function confort(j, c) {
  const top = j.bassin[0];
  const sur = c === HORS ? null : j.bassin.find(([x]) => x === c);
  if (!top || !sur) return -CONFORT;
  return -CONFORT * (1 - Math.sqrt(sur[1] / top[1]));
}

/** Les classes d'un repêchage : { classe : nombre de champions }, un champion à deux classes pour moitié dans chacune. */
export function classesDe(choix, classes) {
  const n = Object.fromEntries(Object.keys(COMPOSITION).map(k => [k, 0]));
  for (const c of Object.values(choix)) {
    const tags = (c !== HORS && classes[c]) || [];
    for (const t of tags) n[t] += 1 / tags.length;
  }
  return n;
}

/** Ce que donne une composition ({ classe : nombre }) sur les canaux, comptée contre REFERENCE. */
export function effetsDeComposition(n) {
  const e = {};
  for (const [cl, canaux] of Object.entries(COMPOSITION)) {
    const ecart = n[cl] - REFERENCE[cl];
    for (const [c, v] of Object.entries(canaux)) {
      if (MULTIPLIE.has(c)) e[c] = (e[c] ?? 1) * v ** ecart;
      else e[c] = (e[c] ?? 0) + v * ecart;
    }
  }
  return e;
}

/** Les effets d'un repêchage sur les canaux du moteur. `classes` : data/champions.json (classes). */
export function effetsDuRepechage(eq, choix, classes) {
  return { ...effetsDeComposition(classesDe(choix, classes)), confort: Object.fromEntries(ROLES.map(r => [r, confort(eq.cinq[r], choix[r])])) };
}

/* Le repêchage de `toi` contre son adversaire de la série s : ce qui s'affiche, et ce que le moteur joue, dans l'ordre (a, b). */
function brouillon(L, s, classes, { mesBans = null, mesChoix = null, toi = 0 }) {
  const lui = s.a === toi ? s.b : s.a;
  const moi = L.equipes[toi], eux = L.equipes[lui];
  const contreMoi = bansAuto(moi);
  const bans = mesBans || bansAuto(eux, new Set(contreMoi));
  const tous = new Set([...contreMoi, ...bans]);
  const choixMoi = mesChoix || choixParDefaut(moi, tous);
  const choixEux = choixParDefaut(eux, new Set([...tous, ...Object.values(choixMoi).filter(c => c !== HORS)]));
  const effMoi = effetsDuRepechage(moi, choixMoi, classes), effEux = effetsDuRepechage(eux, choixEux, classes);
  return {
    repechage: { contreMoi, bans, choix: s.a === toi ? [choixMoi, choixEux] : [choixEux, choixMoi] },
    effets: s.a === toi ? [effMoi, effEux] : [effEux, effMoi],
  };
}

/*
 * LE REPÊCHAGE D'UNE SÉRIE de la ligue L où joue l'équipe `toi` (0 : ton
 * cinq). `mesBans` et `mesChoix` : les tiens ; absents, le repêchage
 * automatique (bansAuto, choixParDefaut). Pose s.repechage (ce qui
 * s'affiche) et s.effets (ce que js/sim.js joue), dans l'ordre de la série
 * (a, b), pour toutes ses parties.
 */
export function repecher(L, s, classes, options = {}) {
  const b = brouillon(L, s, classes, options);
  s.repechage = b.repechage;
  s.effets = b.effets;
  return s;
}

/*
 * LE REPÊCHAGE D'UNE PARTIE, la prochaine de la série (ta série de séries se
 * joue partie par partie : un repêchage avant chacune). Pose
 * s.repechages[k] et s.effetsParPartie[k], k étant la partie qui vient.
 */
export function repecherPartie(L, s, classes, options = {}) {
  const k = s.parties.length;
  const b = brouillon(L, s, classes, options);
  (s.repechages ||= [])[k] = b.repechage;
  (s.effetsParPartie ||= [])[k] = b.effets;
  return s;
}

/** La prochaine partie de la série attend-elle son repêchage ? */
export const attendRepechage = s => !s.repechages || !s.repechages[s.parties.length];

/** Le repêchage de la partie k d'une série (le sien, sinon celui de la série), ou null. */
export const repechageDe = (s, k) => (s.repechages && s.repechages[k]) || s.repechage || null;
