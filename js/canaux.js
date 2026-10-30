/*
 * LES CANAUX DU MOTEUR (MOTEUR.md, « Les canaux »), partagés par ses deux
 * versions : le moteur d'aujourd'hui (js/moteur.js, une partie comme une
 * vraie) et celui des sauvegardes d'avant la version 6 (js/moteur-v1.js).
 *
 * Une source d'effets est un objet dont chaque clé est un canal ; elles se
 * somment en un seul endroit (sommerEffets), puis chaque canal reste dans sa
 * borne.
 *
 *   ligne      écarts types ajoutés aux trois lignes (la phase de lignes)
 *   combat     écarts types ajoutés au combat (escarmouches, tours, combats d'équipe)
 *   objectifs  écarts types ajoutés aux objectifs (dragons, héraut, Nashor)
 *   dragons, heraut, nashor   écarts types ajoutés à CET objectif seulement (une priorité)
 *   split      écarts types ajoutés aux tours que l'équipe dispute (la pression d'une ligne de côté)
 *   tardif     écarts types de combat qui comptent selon l'heure : moins tôt,
 *              plus tard (× 2 (t ÷ durée de l'époque − PIVOT), de −1 à 1)
 *   rythme     × le débit des éliminations de la partie, pour les deux équipes
 *   siege      × le débit des tours de la partie, pour les deux équipes
 *   fin        × la hâte de la fin : plus de 1, on ferme tôt ; moins, on étire
 *   confort    { rôle : écarts types } ajoutés à toutes les sous-cotes d'un joueur
 *              (son champion : js/repechage.js)
 *
 * Les trois multiplicatifs touchent la partie entière : chaque équipe en
 * porte la racine, et la partie prend le produit des deux.
 *
 * LES PHASES d'une partie (les pouvoirs du coach, js/rogue.js) : la phase de
 * lignes jusqu'à LIGNES_FIN (les plaques tombent à 14 min, V8.23), le milieu
 * de partie jusqu'à MILIEU_FIN, puis la fin de partie.
 */
export const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
export const LIGNES_FIN = 14;
export const MILIEU_FIN = 25;
export const PIVOT = 0.8;   // l'heure où le tardif ne compte ni pour ni contre, en part de la durée de l'époque

const NEUTRE = { ligne: 0, combat: 0, objectifs: 0, dragons: 0, heraut: 0, nashor: 0, split: 0, tardif: 0, rythme: 1, siege: 1, fin: 1 };
const BORNES = {
  ligne: [-0.5, 0.5], combat: [-0.4, 0.4], objectifs: [-0.5, 0.5], dragons: [-2.5, 2.5], heraut: [-2.5, 2.5], nashor: [-2.5, 2.5], split: [-2.5, 2.5],
  tardif: [-0.8, 0.8], rythme: [0.7, 1.4], siege: [0.7, 1.4], fin: [0.7, 1.4], confort: [-1, 0],
};
const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);

/** La somme de plusieurs sources d'effets (null permis), chaque canal dans sa borne. */
export function sommerEffets(sources) {
  const e = { ...NEUTRE, confort: Object.fromEntries(ROLES.map(r => [r, 0])) };
  for (const src of sources) {
    if (!src) continue;
    for (const [c, v] of Object.entries(src)) {
      if (c === 'confort') for (const [r, x] of Object.entries(v)) e.confort[r] += x;
      else if (MULTIPLIE.has(c)) e[c] *= v;
      else e[c] += v;
    }
  }
  const borner = (v, [a, b]) => Math.max(a, Math.min(b, v));
  for (const c of Object.keys(NEUTRE)) e[c] = borner(e[c], BORNES[c]);
  for (const r of ROLES) e.confort[r] = borner(e.confort[r], BORNES.confort);
  return e;
}

export const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
export const sigmoide = x => 1 / (1 + Math.exp(-x));

/* Ce que pèse une équipe à chaque phase, sur l'échelle des sous-cotes, ses effets compris (E : sommerEffets). */
export function puissances(eq, E) {
  const c = eq.cinq;
  const s = (r, axe) => (c[r].sous[axe] || 0) + E.confort[r];
  const combat = moyenne(ROLES.map(r => c[r].valeur + E.confort[r])) + E.combat;
  const ligne = {
    haut: moyenne([s('haut', 'ligne'), s('haut', 'pression'), s('jungle', 'implication')]) + E.ligne,
    milieu: moyenne([s('milieu', 'ligne'), s('milieu', 'pression'), s('jungle', 'implication')]) + E.ligne,
    bas: moyenne([s('bas', 'ligne'), s('soutien', 'implication'), s('soutien', 'vision'), s('jungle', 'implication')]) + E.ligne,
  };
  return {
    combat, ligne,
    ferme: moyenne(ROLES.map(r => s(r, 'ligne'))),
    objectifs: moyenne([combat, s('jungle', 'objectifs'), s('soutien', 'vision')]) + E.objectifs,
  };
}

/* Un indice tiré selon des poids ; des poids tous nuls tirent au hasard égal. */
export function selon(poids, de) {
  const tot = poids.reduce((s, p) => s + p, 0);
  if (!(tot > 0)) return Math.floor(de() * poids.length);
  let x = de() * tot;
  for (let i = 0; i < poids.length; i++) { x -= poids[i]; if (x < 0) return i; }
  return poids.length - 1;
}

/* Le tempo d'une équipe faite de plusieurs splits, ou d'une partie entre deux équipes : la moyenne de ce qui est mesuré. */
export function melangerTempos(tempos) {
  const t = {};
  for (const cle of Object.keys(tempos[0])) {
    const xs = tempos.map(x => x[cle]).filter(x => x !== null && x !== undefined);
    t[cle] = xs.length ? moyenne(xs) : null;
  }
  return t;
}
