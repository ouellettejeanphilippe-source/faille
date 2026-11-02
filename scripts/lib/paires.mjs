/*
 * MESURER EN PAIRES (la règle de Cap 82-0 : *on mesure en paires, sinon on ne mesure rien*). Le harnais de check_rogue,
 * partagé avec scripts/impact.mjs et check_chiffres : la même ligue de dix vraies équipes jouée sous la même graine,
 * l'effet donné aux équipes paires (passe A) puis aux impaires (passe B) ; pour chaque équipe, ses victoires avec
 * l'effet moins ses victoires sans. La forme se lit sur les parties d'une équipe traitée contre une équipe qui ne l'est
 * pas, comparées aux mêmes parties dans une passe où personne n'a rien (la passe neutre, jouée une fois par ligue).
 */
import { creerSplit, jouerJournee } from '../../js/sim.js';
import { ligueDEssai } from './vestiaires.mjs';

const moyenne = xs => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
/*
 * L'ERREUR TYPE D'UNE MOYENNE, PAR LIGUE (robuste aux grappes). Un effet ne vaut pas la même chose dans toutes les
 * ligues : il dépend des équipes qui le portent et de celles d'en face. L'erreur partie par partie l'oublie et promet
 * trop ; on somme donc les écarts ligue par ligue (`grappe` : la ligue de chaque partie).
 */
const erreurParGrappe = (residus, grappe) => {
  const parLigue = new Map();
  residus.forEach((r, k) => parLigue.set(grappe[k], (parLigue.get(grappe[k]) || 0) + r));
  const g = parLigue.size;
  return g > 1 ? Math.sqrt((g / (g - 1)) * [...parLigue.values()].reduce((s, x) => s + x * x, 0)) / residus.length : 0;
};

/* Ce que l'écran dit d'un effet (js/impact.js) : vu du côté de l'équipe qui le porte, par partie. */
export const STATS_DE_LA_FEUILLE = ['elim', 'morts', 'dragons', 'nashor', 'herauts', 'tours', 'duree'];
const objectifs = e => e.dragons + e.barons + e.herauts;
/** Le profil d'une partie ; `nous` : le côté de l'équipe traitée. */
export const profil = (f, nous) => ({
  duree: f.duree, k: f.equipes[0].k + f.equipes[1].k, tours: f.equipes[0].tours + f.equipes[1].tours,
  objectifs: objectifs(f.equipes[0]) + objectifs(f.equipes[1]), nosObjectifs: objectifs(f.equipes[nous]) - objectifs(f.equipes[1 - nous]),
  // Ce que l'équipe prend de plus que l'autre, objectif par objectif (la signature d'une stratégie).
  ...Object.fromEntries(['dragons', 'barons', 'herauts', 'tours'].map(o => [`nos_${o}`, f.equipes[nous][o] - f.equipes[1 - nous][o]])),
  // Ce que l'écran dit : ses éliminations, ses morts, ses objectifs et ses tours à elle, la durée.
  elim: f.equipes[nous].k, morts: f.equipes[1 - nous].k, dragons: f.equipes[nous].dragons, nashor: f.equipes[nous].barons,
  herauts: f.equipes[nous].herauts, tours_nous: f.equipes[nous].tours,
});
const CLES_DE_FORME = ['duree', 'k', 'tours', 'objectifs', 'nosObjectifs', 'nos_dragons', 'nos_barons', 'nos_herauts', 'nos_tours', 'elim', 'morts', 'dragons', 'nashor', 'herauts', 'tours_nous'];

/** `nombre` ligues d'essai de dix vraies équipes, de la graine `depuis` en montant. */
export const liguesDEssai = (splits, nombre, depuis = 500) => Array.from({ length: nombre }, (_, l) => ligueDEssai(splits, 10, depuis + l));

/**
 * Une passe : la ligue `ligue` sous la graine `graine`, `traitee(i)` dit si l'équipe i porte l'effet. `effet` : une
 * source sur les canaux, ou une fonction de l'équipe (une stratégie, qui dépend de ses joueurs) ; `pouvoirs` : ceux
 * d'un coach ; `serie` : (L, s, traitees) → pose s.effets avant la journée (le repêchage).
 */
export function passe(ligue, graine, traitee, { effet = null, serie = null, pouvoirs = null } = {}) {
  const sur = e => (typeof effet === 'function' ? effet(e) : effet);
  const porter = e => ({ ...e, ...(effet ? { effets: sur(e) } : {}), ...(pouvoirs ? { pouvoirs } : {}) });
  const L = creerSplit(ligue.map((e, i) => ((effet || pouvoirs) && traitee(i) ? porter(e) : e)), { graine, rondes: 2, bo: 1 });
  while (L.jour < L.journees.length) {
    if (serie) for (const s of L.journees[L.jour]) serie(L, s, traitee);
    jouerJournee(L);
  }
  return L;
}
const victoires = L => L.equipes.map((_, i) => L.journees.flat().filter(s => s.gagnant === i).length);

/**
 * Un banc de mesure : des ligues, leurs graines, et la passe neutre de chacune, jouée une seule fois.
 * `mesurer(opts)` rend { dv, parEquipe, joue, forme, ecarts, parties } :
 *   dv          les victoires de plus par split de 18, en moyenne ;
 *   parEquipe   [[équipe, ΔV]] (le fit d'une stratégie se lit dessus) ;
 *   joue        `opts.pouvoir` : la part des parties où il a joué (la forme ne lit que celles-là) ;
 *   forme       l'écart moyen de chaque clé de `profil`, par partie, contre la passe neutre ;
 *   ecarts      { clé : [écarts par partie] } ; `parties` : [l'équipe traitée de chaque partie mesurée] ;
 *   grappe      [la ligue de chaque partie mesurée] (l'erreur type se compte par ligue).
 */
export function banc(splits, nombre, depuis = 500) {
  const ligues = liguesDEssai(splits, nombre, depuis);
  // Les graines de check_rogue d'avant : la ligue 500 + l sous la graine 7000 + l (un autre banc, d'autres graines).
  const graine = l => 6500 + depuis + l;
  const neutres = ligues.map((ligue, l) => passe(ligue, graine(l), () => false));
  function mesurer(opts) {
    const dv = [], parEquipe = [], ecarts = Object.fromEntries(CLES_DE_FORME.map(c => [c, []])), parties = [], grappe = [];
    let jouees = 0, toutes = 0;
    ligues.forEach((ligue, l) => {
      const pair = i => i % 2 === 0, impair = i => i % 2 === 1;
      const A = passe(ligue, graine(l), pair, opts), B = passe(ligue, graine(l), impair, opts), O = neutres[l];
      const vA = victoires(A), vB = victoires(B);
      vA.forEach((_, i) => { const d = pair(i) ? vA[i] - vB[i] : vB[i] - vA[i]; dv.push(d); parEquipe.push([ligue[i], d]); });
      const neutre = O.journees.flat();
      A.journees.flat().forEach((s, k) => {
        if (pair(s.a) === pair(s.b)) return;
        s.parties.forEach((p, n) => {
          const nous = pair(p.bleu) ? 0 : 1;
          if (opts.pouvoir) {
            toutes++;
            if (!p.feuille.pouvoirs.some(x => x.camp === nous && x.id === opts.pouvoir)) return;
            jouees++;
          }
          const x = profil(p.feuille, nous), y = profil(neutre[k].parties[n].feuille, nous);
          for (const c of CLES_DE_FORME) ecarts[c].push(x[c] - y[c]);
          parties.push(ligue[pair(s.a) ? s.a : s.b]);
          grappe.push(l);
        });
      });
    });
    return { dv: moyenne(dv), parEquipe, joue: toutes ? jouees / toutes : null, forme: Object.fromEntries(CLES_DE_FORME.map(c => [c, moyenne(ecarts[c])])), ecarts, parties, grappe };
  }
  return { ligues, mesurer };
}

/** L'impact d'une mesure, ce que l'écran dit : { clé : [moyenne, erreur type] } pour chaque stat de la feuille. */
export function impactDe(m) {
  const cle = c => (c === 'tours' ? 'tours_nous' : c);
  return Object.fromEntries(STATS_DE_LA_FEUILLE.map(c => {
    const xs = m.ecarts[cle(c)];
    const my = moyenne(xs);
    return [c, [my, erreurParGrappe(xs.map(x => x - my), m.grappe)]];
  }));
}

/**
 * L'impact d'une stratégie, qui suit le fit de l'équipe qui la joue : une droite par stat, l'écart d'une partie contre
 * le fit de l'équipe traitée (les moindres carrés). Rend { a, b, se } : a + b × fit, et l'erreur type au fit moyen
 * (par ligue, comme une moyenne).
 */
export function droiteDe(m, fitDe) {
  const fits = m.parties.map(fitDe);
  const mf = moyenne(fits), vf = moyenne(fits.map(f => (f - mf) ** 2)) || 1;
  const out = { a: {}, b: {}, se: {} };
  for (const c of STATS_DE_LA_FEUILLE) {
    const xs = m.ecarts[c === 'tours' ? 'tours_nous' : c];
    const my = moyenne(xs);
    const b = moyenne(xs.map((y, k) => (fits[k] - mf) * (y - my))) / vf;
    out.a[c] = my - b * mf;
    out.b[c] = b;
    out.se[c] = erreurParGrappe(xs.map((y, k) => y - (out.a[c] + b * fits[k])), m.grappe);
  }
  return out;
}
