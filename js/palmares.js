/*
 * LE PALMARÈS D'UN SPLIT, lu dans ses feuilles (repris de Cap 82-0 : on ne
 * décerne que ce que les colonnes décident, jamais ce qu'un vote déciderait).
 * Pur : la partie (js/partie.js) le grave au bilan, l'écran le montre, les
 * scripts le recomptent.
 *
 *   les stats      chaque joueur de chaque équipe, ses parties jouées dans TA
 *                  ligue : éliminations, morts, aides, or, minutes ;
 *   les meneurs    les premiers de la ligue, colonne par colonne ;
 *   les trophées   cinq, décernés au bilan, chacun par une colonne ;
 *   les galons     ce qu'un de tes joueurs a fait CHEZ TOI dans le split, gravé
 *                  avec la partie et l'adversaire (« 13 éliminations, contre
 *                  T1 ») ; ils vont à sa carte, dans ta collection ;
 *   les records    le meilleur de ta run, partie par partie : le panthéon.
 *
 * Les seuils des galons sont mesurés sur le moteur (scripts/check_meta.mjs) :
 * chacun sort dans une part des splits, pas à chaque fois.
 */

const RONDES_MOTS = ['en quart de finale', 'en demi-finale', 'en finale'];

/* Toutes les séries jouées d'un split, la saison puis les séries ; `k` : la ronde des séries (null en saison). */
function jouees(L) {
  const saison = L.journees.slice(0, L.jour).flat().map(s => ({ s, k: null }));
  const series = L.series ? L.series.rondes.flatMap((r, k) => r.filter(s => s.gagnant !== null).map(s => ({ s, k }))) : [];
  return [...saison, ...series];
}

/* Chaque partie jouée, vue d'une équipe : { i (l'équipe), x (son côté), f (la feuille), adv, k (ronde), s }. */
function partiesDe(L, i = null) {
  const out = [];
  for (const { s, k } of jouees(L)) {
    for (const p of s.parties) {
      [p.bleu, p.rouge].forEach((eq, x) => {
        if (i === null || eq === i) out.push({ i: eq, x, f: p.feuille, adv: x ? p.bleu : p.rouge, k, s });
      });
    }
  }
  return out;
}

/** Les stats de chaque joueur de la ligue : [{ i, n, r, pj, v, k, m, a, or, min }], un joueur par équipe, nom et rôle. */
export function statsDuSplit(L) {
  const lignes = new Map();
  for (const { i, x, f } of partiesDe(L)) {
    for (const j of f.equipes[x].joueurs) {
      const cle = `${i}|${j.n}|${j.r}`;
      const l = lignes.get(cle) || { i, n: j.n, r: j.r, pj: 0, v: 0, k: 0, m: 0, a: 0, or: 0, min: 0 };
      l.pj++; l.v += f.gagnant === x ? 1 : 0;
      l.k += j.k; l.m += j.m; l.a += j.a; l.or += j.or; l.min += f.duree;
      lignes.set(cle, l);
    }
  }
  return [...lignes.values()];
}

/** Le KDA d'une ligne de stats : (éliminations + aides) ÷ morts (une mort au moins). */
export const kda = l => (l.k + l.a) / Math.max(1, l.m);
/* Assez de parties pour un classement par moyenne : les deux tiers des parties de son équipe (sa saison et ses séries). */
const assidus = lignes => {
  const max = new Map();
  for (const l of lignes) max.set(l.i, Math.max(max.get(l.i) || 0, l.pj));
  return lignes.filter(l => l.pj >= Math.max(1, Math.ceil((2 * max.get(l.i)) / 3)));
};

/*
 * LES MENEURS : [icône, colonne, comment la lire, au total ou par moyenne].
 * Une moyenne ne classe que les assidus.
 */
export const MENEURS = {
  k: ['🗡️', 'Éliminations', l => l.k, false],
  a: ['🤝', 'Aides', l => l.a, false],
  kda: ['⚖️', 'KDA', kda, true],
  or: ['💰', 'Or par minute', l => l.or / Math.max(1, l.min), true],
};

/** Les `n` premiers de la ligue dans une colonne de MENEURS : [{ ligne, val }]. */
export function meneurs(L, cle, n = 5, stats = statsDuSplit(L)) {
  const [, , lire, moyenne] = MENEURS[cle];
  return (moyenne ? assidus(stats) : stats).map(ligne => ({ ligne, val: lire(ligne) })).sort((a, b) => b.val - a.val || a.ligne.i - b.ligne.i).slice(0, n);
}

/*
 * LES TROPHÉES DU SPLIT, chacun par une colonne : [icône, nom, ce qui le décide].
 * `qui` rend la ligne gagnante, ou null.
 */
const meilleur = (lignes, f) => lignes.reduce((m, l) => (!m || f(l) > f(m) ? l : m), null);
export const TROPHEES = {
  mvp: ['⭐', 'Joueur du split', 'le plus d\'éliminations et d\'aides par partie, chez les assidus', (L, st) => meilleur(assidus(st), l => (l.k + l.a) / l.pj)],
  bourreau: ['🗡️', 'Le bourreau', 'le plus d\'éliminations', (L, st) => meilleur(st, l => l.k)],
  intouchable: ['🛡️', 'L\'intouchable', 'le moins de morts par partie, chez les assidus', (L, st) => meilleur(assidus(st), l => -l.m / l.pj)],
  or: ['💰', 'Le roi de l\'or', 'le plus d\'or par minute, chez les assidus', (L, st) => meilleur(assidus(st), l => l.or / l.min)],
  finales: ['🏅', 'Joueur de la finale', 'chez le champion, le plus d\'éliminations et d\'aides en finale', L => {
    const S = L.series;
    const finale = S && S.champion !== null && S.rondes[2] && S.rondes[2][0];
    if (!finale) return null;
    const st = statsDuSplit({ ...L, journees: [], jour: 0, series: { rondes: [[], [], [finale]] } }).filter(l => l.i === S.champion);
    return meilleur(st, l => l.k + l.a);
  }],
};

/** Les trophées d'un split fini : [{ id, i, n, r, val }] — `val` : la colonne qui l'a décidé, pour l'écran. */
export function tropheesDuSplit(L) {
  const st = statsDuSplit(L);
  return Object.entries(TROPHEES).map(([id, [, , , qui]]) => {
    const l = qui(L, st);
    return l ? { id, i: l.i, n: l.n, r: l.r } : null;
  }).filter(Boolean);
}

/*
 * LES GALONS : ce qu'un de tes joueurs a fait chez toi dans un split.
 * [icône, nom, ce qu'il faut]. Mesurés sur le moteur (check_meta) : rares,
 * pas introuvables.
 */
const SEUILS = { dechaine: 12, intouchable: 22, centurion: 100, omnipresent: 220 };
export const GALONS = {
  dechaine: ['🔥', 'Déchaîné', `${SEUILS.dechaine} éliminations ou plus dans une partie`],
  intouchable: ['🧊', 'Sans une égratignure', `une partie gagnée sans mourir, avec ${SEUILS.intouchable} éliminations et aides ou plus`],
  centurion: ['💯', 'Centurion', `${SEUILS.centurion} éliminations dans un split`],
  omnipresent: ['🌐', 'Partout à la fois', `${SEUILS.omnipresent} aides dans un split`],
  finale: ['🏅', 'Joueur de la finale', 'le trophée, avec ton cinq champion'],
  titre: ['🏆', 'Champion', 'le titre du split, dans ton cinq de la finale'],
};

/** Les galons de tes joueurs (l'équipe 0) dans un split fini : [{ id, n, r, quoi }] — `quoi` : la partie, en mots. */
export function galonsDuSplit(L) {
  const out = [];
  const vus = new Set();
  const graver = (id, n, r, quoi) => {
    const cle = `${id}|${n}|${r}`;
    if (vus.has(cle)) return;
    vus.add(cle);
    out.push({ id, n, r, quoi });
  };
  const nomAdv = i => L.equipes[i].nom;
  const quand = (k, adv) => `${k === null ? 'en saison' : RONDES_MOTS[k]}, contre ${nomAdv(adv)}`;
  for (const { x, f, adv, k } of partiesDe(L, 0)) {
    for (const j of f.equipes[x].joueurs) {
      if (j.k >= SEUILS.dechaine) graver('dechaine', j.n, j.r, `${j.k} éliminations ${quand(k, adv)}`);
      if (f.gagnant === x && j.m === 0 && j.k + j.a >= SEUILS.intouchable) graver('intouchable', j.n, j.r, `${j.k}/0/${j.a} ${quand(k, adv)}`);
    }
  }
  for (const l of statsDuSplit(L).filter(x => x.i === 0)) {
    if (l.k >= SEUILS.centurion) graver('centurion', l.n, l.r, `${l.k} éliminations en ${l.pj} parties`);
    if (l.a >= SEUILS.omnipresent) graver('omnipresent', l.n, l.r, `${l.a} aides en ${l.pj} parties`);
  }
  const S = L.series;
  if (S && S.champion === 0) {
    const finale = S.rondes[2][0];
    const p = finale.parties[finale.parties.length - 1];
    const x = p.bleu === 0 ? 0 : 1;
    const contre = finale.a === 0 ? finale.b : finale.a;
    for (const j of p.feuille.equipes[x].joueurs) graver('titre', j.n, j.r, `${finale.v[0]}-${finale.v[1]} en finale contre ${nomAdv(contre)}`);
    const t = tropheesDuSplit(L).find(x2 => x2.id === 'finales');
    if (t && t.i === 0) graver('finale', t.n, t.r, `contre ${nomAdv(contre)}`);
  }
  return out;
}

/*
 * LES RECORDS de ta run, split par split : le meilleur de chacun, que le
 * panthéon compare d'une run à l'autre. [icône, nom, unité].
 */
export const RECORDS = {
  elims: ['🗡️', 'Le plus d\'éliminations dans une partie', 'élim.'],
  equipe: ['💥', 'Le plus d\'éliminations d\'équipe dans une partie', 'élim.'],
  eclair: ['⚡', 'La victoire la plus rapide', 'min'],
  suite: ['📈', 'La plus longue suite de victoires en saison', 'victoires'],
};

/** Les records d'un split pour ton cinq : { id: { val, quoi } } — `eclair` se compte à l'envers (moins, c'est mieux). */
export function recordsDuSplit(L) {
  const r = {};
  const garder = (id, val, quoi, moins = false) => {
    if (!r[id] || (moins ? val < r[id].val : val > r[id].val)) r[id] = { val, quoi };
  };
  for (const { x, f, adv } of partiesDe(L, 0)) {
    const contre = L.equipes[adv].nom;
    for (const j of f.equipes[x].joueurs) garder('elims', j.k, `${j.n}, contre ${contre}`);
    garder('equipe', f.equipes[x].k, `contre ${contre}`);
    if (f.gagnant === x) garder('eclair', Math.round(f.duree * 10) / 10, `contre ${contre}`, true);
  }
  let n = 0, max = 0;
  for (const jour of L.journees.slice(0, L.jour)) {
    const s = jour.find(y => y.a === 0 || y.b === 0);
    if (!s) continue;
    n = s.gagnant === 0 ? n + 1 : 0;
    max = Math.max(max, n);
  }
  if (max) r.suite = { val: max, quoi: 'en saison' };
  return r;
}
