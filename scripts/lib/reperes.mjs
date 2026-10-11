/*
 * LES REPÈRES DU MOTEUR : chaque vraie partie des shards (`matchs`) rejouée
 * entre ses deux vraies équipes, et ce qui en sort mis contre ce qui s'est
 * passé. La borne de chaque repère est l'intervalle de la mesure elle-même
 * (deux erreurs types de part et d'autre), jamais plus serrée.
 *
 * Partagé par check_feuilles (qui juge) et calibrer (qui cherche les réglages).
 */
import { jouerPartie } from '../../js/sim.js';
import { graineDe } from '../../js/hasard.js';

const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const et = xs => { const m = moyenne(xs); return Math.sqrt(moyenne(xs.map(x => (x - m) ** 2))); };

/** Les vraies parties rejouables : { l, k, tempo, id, a, b }. `splits` : lireSplits(). */
export const vraiesParties = splits => splits.flatMap(({ split, tempo, equipes }) => split.matchs?.map((l, k) => ({ l, k, tempo, id: split.id, a: equipes.get(l[0]), b: equipes.get(l[1]) })) ?? [])
  .filter(x => x.a && x.b && x.l[3] !== null && x.l[2] !== null);

/**
 * Les repères : [{ nom, reel, sim, min, max }] ; `rejouer` : combien de fois chaque partie.
 * `graine(n)` : le décalage des graines (pour vérifier qu'une borne ne tient pas à un tirage).
 */
export function reperes(vraies, rejouer = 8, decalage = 0) {
  const combat = e => moyenne(Object.values(e.cinq).map(j => j.valeur));
  const PALIERS = [0, 0.1, 0.2, 0.4, Infinity];
  const vide = () => ({ duree: [], k: [], bleu: [], fav: PALIERS.slice(1).map(() => []), toursG: [], toursP: [], ecartOr: [], dragons: [], nashor: [], plusDragons: [], plusNashor: [], plusHerauts: [] });
  const reel = vide(), sim = vide();
  const mesurer = (o, f, x) => {
    // f : [durée, gagnant (0 bleu), k[2], or[2], tours[2], dragons[2], nashor[2], hérauts[2]] ; null quand non mesuré.
    const [duree, g, k, or, tours, dragons, nashor, herauts] = f;
    o.duree.push(duree / x.tempo.duree);
    o.bleu.push(g === 0 ? 1 : 0);
    const ecart = combat(x.a) - combat(x.b);
    if (ecart) o.fav[PALIERS.findIndex((p, i) => Math.abs(ecart) >= p && Math.abs(ecart) < PALIERS[i + 1])].push((ecart > 0) === (g === 0) ? 1 : 0);
    if (k) o.k.push(k[0] + k[1]);
    if (or && or[0] + or[1] > 0) o.ecartOr.push(Math.abs(or[0] - or[1]) / ((or[0] + or[1]) / 2));
    if (tours) { o.toursG.push(tours[g]); o.toursP.push(tours[1 - g]); }
    if (dragons) o.dragons.push(dragons[0] + dragons[1]);
    if (nashor) o.nashor.push(nashor[0] + nashor[1]);
    // Ce que vaut un objectif : le camp qui en prend le plus gagne-t-il ? (les parties à égalité ne disent rien)
    const plus = (dans, y) => { if (y && y[0] !== y[1]) dans.push((y[0] > y[1]) === (g === 0) ? 1 : 0); };
    plus(o.plusDragons, dragons); plus(o.plusNashor, nashor); plus(o.plusHerauts, herauts);
  };
  const paire = (l, i) => (l[i] === null || l[i + 1] === null ? null : [l[i], l[i + 1]]);
  for (const x of vraies) {
    const { l } = x;
    const reelle = [l[2], l[3] === 1 ? 0 : 1, paire(l, 4), paire(l, 6), paire(l, 8), paire(l, 10), paire(l, 12), paire(l, 14)];
    mesurer(reel, reelle, x);
    for (let n = 0; n < rejouer; n++) {
      const f = jouerPartie(x.a, x.b, graineDe(n + decalage, `${x.id}-${x.k}`));
      const E = f.equipes, deux = cle => [E[0][cle], E[1][cle]];
      // Le moteur se mesure là où la vraie partie l'a été : mêmes colonnes absentes.
      mesurer(sim, [f.duree, f.gagnant, reelle[2] && deux('k'), reelle[3] && deux('or'), reelle[4] && deux('tours'), reelle[5] && deux('dragons'), reelle[6] && deux('barons'), reelle[7] && deux('herauts')], x);
    }
  }
  const out = [];
  const juger = (nom, r, s) => {
    if (!r.length) return;
    const marge = 2 * et(r) / Math.sqrt(r.length);
    out.push({ nom: `${nom} (réel ${moyenne(r).toFixed(3)}, ${r.length} parties)`, reel: moyenne(r), sim: moyenne(s), min: moyenne(r) - marge, max: moyenne(r) + marge });
  };
  juger('durée, sur celle de l\'époque', reel.duree, sim.duree);
  // L'écart type d'un écart type mesuré sur n parties : σ / √(2n).
  const margeEt = 2 * et(reel.duree) / Math.sqrt(2 * reel.duree.length);
  out.push({ nom: 'écart type de la durée, sur celle de l\'époque', reel: et(reel.duree), sim: et(sim.duree), min: et(reel.duree) - margeEt, max: et(reel.duree) + margeEt });
  juger('éliminations par partie', reel.k, sim.k);
  juger('victoires du côté bleu', reel.bleu, sim.bleu);
  PALIERS.slice(1).forEach((p, i) => juger(`le favori des cotes gagne, écart de ${PALIERS[i]} à ${p}`, reel.fav[i], sim.fav[i]));
  juger('tours du gagnant', reel.toursG, sim.toursG);
  juger('tours du perdant', reel.toursP, sim.toursP);
  juger('écart d\'or final, sur l\'or moyen', reel.ecartOr, sim.ecartOr);
  juger('dragons par partie', reel.dragons, sim.dragons);
  juger('Nashor par partie', reel.nashor, sim.nashor);
  juger('le camp qui prend plus de dragons gagne', reel.plusDragons, sim.plusDragons);
  juger('le camp qui prend plus de Nashor gagne', reel.plusNashor, sim.plusNashor);
  juger('le camp qui prend plus de hérauts gagne', reel.plusHerauts, sim.plusHerauts);
  return out;
}
