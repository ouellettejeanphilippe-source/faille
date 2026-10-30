/*
 * LE SPLIT (MOTEUR.md §5) : le tempo de chaque époque, les équipes telles que
 * le moteur les lit, le split au jour le jour et ses séries. Une partie se
 * joue dans js/moteur.js (une partie comme une vraie, MOTEUR.md) ; une
 * sauvegarde d'avant la version 6 joue le moteur gelé de js/moteur-v1.js
 * (`moteur: 1` à la création du split), pour se rejouer pareil.
 *
 * Tout le hasard d'une partie vient de son dé : hasard(graineDe(…)).
 */
import { graineDe } from './hasard.js';
import { ROLES, moyenne } from './canaux.js';
import { jouerPartie } from './moteur.js';
import { jouerPartieV1 } from './moteur-v1.js';

const somme = (xs, f) => xs.reduce((s, x) => s + f(x), 0);

/*
 * LE TEMPO D'UN SPLIT, mesuré sur ses vraies parties. Par équipe et par
 * partie, sauf `duree` (minutes) et `bleu` (la part des parties gagnées du
 * côté bleu). null : le split ne le mesure pas, et le moteur s'en passe.
 * `matchs` : une ligne par partie (scripts/build_splits.mjs).
 */
const M = { duree: 2, gagnant: 3, k: 4, or: 6, tours: 8, dragons: 10, barons: 12, herauts: 14 };
export function tempoDuSplit(split) {
  const joueurs = split.equipes.flatMap(e => e.joueurs);
  const lignes = (split.matchs || []).filter(l => l[M.duree] !== null && l[M.gagnant] !== null);
  const parEq = o => {
    const [s, n] = split.equipes.reduce((t, e) => [t[0] + e.obj[o][0], t[1] + e.obj[o][1]], [0, 0]);
    return n ? s / n : null;
  };
  const deux = (i, repli) => {
    const ls = lignes.filter(l => l[i] !== null && l[i + 1] !== null);
    return ls.length ? somme(ls, l => l[i] + l[i + 1]) / (2 * ls.length) : repli;
  };
  const orMesure = joueurs.filter(j => j.or[1]);
  return {
    duree: lignes.length ? moyenne(lignes.map(l => l[M.duree])) : somme(joueurs, j => j.min) / somme(joueurs, j => j.pj),
    k: deux(M.k, somme(joueurs, j => j.k) / (2 * split.parties)),
    or: deux(M.or, orMesure.length ? (5 * somme(orMesure, j => j.or[0])) / somme(orMesure, j => j.or[1]) : null),
    ...Object.fromEntries(['tours', 'dragons', 'barons', 'herauts'].map(o => [o, deux(M[o], parEq(o))])),
    bleu: lignes.length ? lignes.filter(l => l[M.gagnant] === 1).length / lignes.length : null,
    // Le moteur d'aujourd'hui (js/moteur.js) : l'année fait les règles de l'époque ; les larves du Néant (2024 →), par équipe et par partie.
    annee: split.annee ?? null,
    larves: split.equipes.some(e => e.obj.larves && e.obj.larves[0]) ? parEq('larves') : null,
  };
}

/** Un joueur tel que le moteur le lit : ses sous-cotes et ses vraies parts dans son split. */
export function joueurDuMoteur(j, profil) {
  return {
    n: j.n, r: j.r, valeur: profil.valeur, sous: profil.sous,
    bassin: j.champs,                                      // [[champion, parties, victoires]], du plus joué au moins joué
    // Le moteur d'aujourd'hui (js/moteur.js) : ses sbires par minute, ses sorts d'invocateur sur son plus joué, ses objets les plus achetés.
    csMin: j.cs && j.cs[2] ? j.cs[0] / j.cs[2] : null,
    visionMin: j.vision && j.vision[2] ? j.vision[0] / j.vision[2] : null,
    sorts: j.sorts && j.sorts[0] ? j.sorts[0] : null,
    objets: j.objets || [],
    part: {
      k: j.eqK ? j.k / j.eqK : 0,                          // sa part des éliminations de l'équipe
      a: j.eqK > j.k ? j.a / (j.eqK - j.k) : 0,            // la chance d'aider sur une élimination qu'il ne fait pas
      m: j.m / j.pj,                                       // ses morts par partie
      or: j.eqOr ? j.or[0] / j.eqOr : 0,                   // sa part de l'or de l'équipe
    },
  };
}

/** Une vraie équipe d'un split : à chaque rôle, celui qui l'a le plus joué. null s'il manque un rôle. */
export function equipeReelle(split, e, profils, tempo) {
  const cinq = {};
  for (const r of ROLES) {
    const j = e.joueurs.filter(x => x.r === r).sort((a, b) => b.pj - a.pj)[0];
    if (!j) return null;
    cinq[r] = joueurDuMoteur(j, profils.joueurs.get(j));
  }
  return { nom: e.nom, split: split.nom, logo: e.logo || null, cinq, tempo };
}

/*
 * LE SPLIT AU JOUR LE JOUR (la règle de Cap 82-0 : rien ne se joue d'avance).
 * creerSplit pose le calendrier — une ronde où chacun croise chacun, deux
 * fois, côtés inversés au retour ; chaque rencontre est une série (BO1 ou
 * BO3) ; `moteur` : 2 (js/moteur.js), ou 1 pour une sauvegarde d'avant la
 * version 6 (js/moteur-v1.js, gelé). jouerJournee joue UNE journée. Chaque partie a son propre dé, tiré
 * de la graine du split et de sa place au calendrier : jouées une à une ou
 * d'un bloc, avec ou sans hasard tiré ailleurs entre deux, elles donnent la
 * même chose (check_graine).
 */
export function creerSplit(equipes, { graine, rondes = 2, bo = 1, moteur = 2 }) {
  const n = equipes.length + (equipes.length % 2);
  const places = [...equipes.keys(), ...(n > equipes.length ? [null] : [])];
  const aller = [];
  // La ronde à la ronde (méthode du cercle) : la première place reste, les autres tournent.
  for (let j = 0; j < n - 1; j++) {
    const tour = [places[0], ...places.slice(1).map((_, i) => places[1 + ((i + j) % (n - 1))])];
    const jour = [];
    for (let i = 0; i < n / 2; i++) {
      const [a, b] = j % 2 ? [tour[n - 1 - i], tour[i]] : [tour[i], tour[n - 1 - i]];
      if (a !== null && b !== null) jour.push([a, b]);
    }
    aller.push(jour);
  }
  const journees = [];
  for (let r = 0; r < rondes; r++) journees.push(...aller.map(jour => jour.map(([a, b]) => (r % 2 ? [b, a] : [a, b]))));
  return {
    equipes, graine, moteur, jour: 0, series: null,
    journees: journees.map((jour, j) => jour.map(([a, b], i) => ({ a, b, bo, cle: `j${j}-${i}`, parties: [], v: [0, 0], gagnant: null }))),
  };
}

/*
 * Une série jusqu'à sa dernière partie, ou `max` parties de plus (ta série de
 * séries se joue partie par partie). Le perdant de la partie d'avant prend le
 * côté bleu (la règle des ligues). Chaque partie a son dé : jouée seule ou
 * d'un bloc, elle donne la même chose.
 */
function jouerSerie(L, s, max = Infinity) {
  const besoin = Math.ceil(s.bo / 2);
  for (let n = 0; n < max && s.v[0] < besoin && s.v[1] < besoin; n++) {
    const k = s.parties.length;
    const bleu = k && s.parties[k - 1].gagnant === 0 ? 1 : 0;
    const camps = bleu ? [s.b, s.a] : [s.a, s.b];
    // Le repêchage de la partie (js/repechage.js), sinon celui de la série : ses effets suivent chaque équipe d'un côté à l'autre.
    const eff = (s.effetsParPartie && s.effetsParPartie[k]) || s.effets;
    const effets = eff ? (bleu ? [eff[1], eff[0]] : eff) : undefined;
    const f = (L.moteur === 1 ? jouerPartieV1 : jouerPartie)(L.equipes[camps[0]], L.equipes[camps[1]], graineDe(L.graine, `${s.cle}-${k}`), effets);
    const gagnant = camps[f.gagnant] === s.a ? 0 : 1;
    s.parties.push({ bleu: camps[0], rouge: camps[1], feuille: f, gagnant });
    s.v[gagnant]++;
  }
  if (s.v[0] >= besoin || s.v[1] >= besoin) s.gagnant = s.v[0] > s.v[1] ? s.a : s.b;
}

/** Joue la prochaine journée de la saison. Faux s'il n'en reste plus. */
export function jouerJournee(L) {
  if (L.jour >= L.journees.length) return false;
  for (const s of L.journees[L.jour]) jouerSerie(L, s);
  L.jour++;
  return true;
}

/**
 * Le classement : les séries gagnées, puis l'écart des parties, puis le face-à-face ;
 * l'ordre d'inscription tranche le reste. Rend [{ i, v, d, pv, pd }] du premier au dernier.
 */
export function classement(L) {
  const lignes = L.equipes.map((_, i) => ({ i, v: 0, d: 0, pv: 0, pd: 0 }));
  const jouees = L.journees.slice(0, L.jour).flat();
  for (const s of jouees) {
    lignes[s.gagnant].v++;
    lignes[s.gagnant === s.a ? s.b : s.a].d++;
    lignes[s.a].pv += s.v[0]; lignes[s.a].pd += s.v[1];
    lignes[s.b].pv += s.v[1]; lignes[s.b].pd += s.v[0];
  }
  const face = (x, y) => jouees.filter(s => s.gagnant === x && (s.a === y || s.b === y)).length;
  return lignes.sort((x, y) => y.v - x.v || (y.pv - y.pd) - (x.pv - x.pd) || face(y.i, x.i) - face(x.i, y.i) || x.i - y.i);
}

/*
 * LES SÉRIES (BO5), une fois la saison finie : les six premiers. Les 3e à 6e
 * ouvrent (3 contre 6, 4 contre 5), les deux premiers attendent en demie ; le
 * premier croise le moins bien classé des survivants. Une ronde se joue d'un
 * coup, et la suivante naît quand elle est décidée.
 */
const BO_SERIES = 5;
export function creerSeries(L) {
  const rang = classement(L).map(l => l.i);
  const serie = (a, b, cle) => ({ a, b, bo: BO_SERIES, cle, parties: [], v: [0, 0], gagnant: null });
  L.series = { rang, rondes: [[serie(rang[2], rang[5], 's0-0'), serie(rang[3], rang[4], 's0-1')]], champion: null };
  return L.series;
}

/**
 * Joue la ronde en cours des séries et prépare la suivante. Faux s'il n'y a
 * plus rien à jouer. `toi` : une équipe dont la série se joue partie par
 * partie — une seule de ses parties, et la ronde attend qu'elle soit décidée.
 */
export function jouerRonde(L, toi = null) {
  const S = L.series;
  if (S.champion !== null) return false;
  const ronde = S.rondes[S.rondes.length - 1];
  for (const s of ronde) if (s.gagnant === null) jouerSerie(L, s, s.a === toi || s.b === toi ? 1 : Infinity);
  if (ronde.some(s => s.gagnant === null)) return true;
  const gagnants = ronde.map(s => s.gagnant).sort((x, y) => S.rang.indexOf(x) - S.rang.indexOf(y));
  const k = S.rondes.length;
  const serie = (a, b, i) => ({ a, b, bo: BO_SERIES, cle: `s${k}-${i}`, parties: [], v: [0, 0], gagnant: null });
  if (k === 1) S.rondes.push([serie(S.rang[0], gagnants[1], 0), serie(S.rang[1], gagnants[0], 1)]);
  else if (k === 2) S.rondes.push([serie(...gagnants, 0)]);
  else S.champion = gagnants[0];
  return true;
}

/* La partie d'aujourd'hui, pour une partie hors ligue (l'exhibition, js/main.js). */
export { jouerPartie };
