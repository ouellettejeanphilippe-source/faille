/*
 * LES REPÈRES DU MOTEUR : chaque vraie partie des shards (`matchs`) rejouée
 * entre ses deux vraies équipes, et ce qui en sort mis contre ce qui s'est
 * passé. La borne de chaque repère est l'intervalle de la mesure elle-même
 * (deux erreurs types de part et d'autre), jamais plus serrée.
 *
 * Partagé par check_feuilles (qui juge) et calibrer (qui cherche les réglages).
 */
import { jouerPartie } from '../../js/moteur.js';
import { graineDe } from '../../js/hasard.js';

const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const COURTE = 0.75;   // une partie courte : moins des trois quarts de la durée de son époque
const et = xs => { const m = moyenne(xs); return Math.sqrt(moyenne(xs.map(x => (x - m) ** 2))); };

/** Les vraies parties rejouables : { l, k, tempo, id, a, b }. `splits` : lireSplits(). */
export const vraiesParties = splits => splits.flatMap(({ split, tempo, equipes }) => split.matchs?.map((l, k) => ({ l, k, tempo, split, id: split.id, a: equipes.get(l[0]), b: equipes.get(l[1]) })) ?? [])
  .filter(x => x.a && x.b && x.l[3] !== null && x.l[2] !== null);

/**
 * Les repères : [{ nom, reel, sim, min, max }] ; `rejouer` : combien de fois chaque partie.
 * `graine(n)` : le décalage des graines (pour vérifier qu'une borne ne tient pas à un tirage).
 */
export function reperes(vraies, rejouer = 8, decalage = 0) {
  // Les aides de chaque vraie équipe de chaque split rejoué : [aides, éliminations] de ses joueurs.
  const aides = [...new Set(vraies.map(x => x.split))].flatMap(sp => sp.equipes.map(e => [e.joueurs.reduce((s, j) => s + j.a, 0), e.joueurs.reduce((s, j) => s + j.k, 0)]));
  const combat = e => moyenne(Object.values(e.cinq).map(j => j.valeur));
  const PALIERS = [0, 0.1, 0.2, 0.4, Infinity];
  const vide = () => ({ duree: [], courtes: [], k: [], partK: [], bleu: [], fav: PALIERS.slice(1).map(() => []), toursG: [], toursP: [], inhibG: [], inhibP: [], ecartOr: [], dragons: [], nashor: [], herauts: [], plusDragons: [], plusNashor: [], plusHerauts: [] });
  const reel = vide(), sim = { ...vide(), aides: 0, elims: 0 };
  const mesurer = (o, f, x) => {
    // f : [durée, gagnant (0 bleu), k[2], or[2], tours[2], dragons[2], nashor[2], hérauts[2], inhibiteurs[2]] ; null quand non mesuré.
    const [duree, g, k, or, tours, dragons, nashor, herauts, inhib] = f;
    o.duree.push(duree / x.tempo.duree);
    o.courtes.push(duree < COURTE * x.tempo.duree ? 1 : 0);
    o.bleu.push(g === 0 ? 1 : 0);
    const ecart = combat(x.a) - combat(x.b);
    if (ecart) o.fav[PALIERS.findIndex((p, i) => Math.abs(ecart) >= p && Math.abs(ecart) < PALIERS[i + 1])].push((ecart > 0) === (g === 0) ? 1 : 0);
    if (k) o.k.push(k[0] + k[1]);
    if (k && k[0] + k[1] > 0) o.partK.push(k[g] / (k[0] + k[1]));
    if (inhib) { o.inhibG.push(inhib[g]); o.inhibP.push(inhib[1 - g]); }
    if (herauts) o.herauts.push(herauts[0] + herauts[1]);
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
    const reelle = [l[2], l[3] === 1 ? 0 : 1, paire(l, 4), paire(l, 6), paire(l, 8), paire(l, 10), paire(l, 12), paire(l, 14), paire(l, 16)];
    mesurer(reel, reelle, x);
    for (let n = 0; n < rejouer; n++) {
      const f = jouerPartie(x.a, x.b, graineDe(n + decalage, `${x.id}-${x.k}`));
      const E = f.equipes, deux = cle => [E[0][cle], E[1][cle]];
      // Le moteur se mesure là où la vraie partie l'a été : mêmes colonnes absentes.
      mesurer(sim, [f.duree, f.gagnant, reelle[2] && deux('k'), reelle[3] && deux('or'), reelle[4] && deux('tours'), reelle[5] && deux('dragons'), reelle[6] && deux('barons'), reelle[7] && deux('herauts'), reelle[8] && deux('inhib')], x);
      sim.aides += f.equipes.reduce((s, e) => s + e.joueurs.reduce((t, j) => t + j.a, 0), 0);
      sim.elims += f.equipes[0].k + f.equipes[1].k;
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
  juger('la part des éliminations au gagnant', reel.partK, sim.partK);
  juger('victoires du côté bleu', reel.bleu, sim.bleu);
  PALIERS.slice(1).forEach((p, i) => juger(`le favori des cotes gagne, écart de ${PALIERS[i]} à ${p}`, reel.fav[i], sim.fav[i]));
  juger('tours du gagnant', reel.toursG, sim.toursG);
  juger('tours du perdant', reel.toursP, sim.toursP);
  juger('inhibiteurs du gagnant', reel.inhibG, sim.inhibG);
  juger('inhibiteurs du perdant', reel.inhibP, sim.inhibP);
  juger('écart d\'or final, sur l\'or moyen', reel.ecartOr, sim.ecartOr);
  juger('dragons par partie', reel.dragons, sim.dragons);
  juger('Nashor par partie', reel.nashor, sim.nashor);
  juger('hérauts par partie', reel.herauts, sim.herauts);
  juger(`parties courtes (moins de ${COURTE} de la durée de l'époque)`, reel.courtes, sim.courtes);
  // Les aides : le total des fiches des joueurs (les shards n'ont pas les aides partie par partie), une équipe d'un split par mesure.
  const ratios = aides.filter(([, k]) => k > 0).map(([a, k]) => a / k);
  if (ratios.length) {
    const marge = 2 * et(ratios) / Math.sqrt(ratios.length);
    const r = moyenne(ratios);
    out.push({ nom: `aides par élimination (réel ${r.toFixed(3)}, ${ratios.length} équipes)`, reel: r, sim: sim.aides / sim.elims, min: r - marge, max: r + marge });
  }
  juger('le camp qui prend plus de dragons gagne', reel.plusDragons, sim.plusDragons);
  juger('le camp qui prend plus de Nashor gagne', reel.plusNashor, sim.plusNashor);
  juger('le camp qui prend plus de hérauts gagne', reel.plusHerauts, sim.plusHerauts);
  return out;
}
