/*
 * LE MOTEUR (MOTEUR.md). Une partie se joue par événements, un tour de 30
 * secondes à la fois, de 15 à 80 minutes : des éliminations, des dragons, des hérauts, le Nashor,
 * des tours, puis le combat final qui fait tomber le nexus. Rien n'est tiré
 * d'avance : la durée, le pointage et l'or ÉMERGENT des événements, et la
 * feuille se ferme par construction — check_feuilles le mesure.
 *
 * D'où vient chaque chiffre :
 *
 *   le tempo        les repères du split de chaque équipe (tempoDuSplit) :
 *                   durée, éliminations, or, tours, dragons, Nashor,
 *                   hérauts, côté bleu — mesurés sur ses vraies parties ;
 *   qui tue, qui aide, qui meurt, qui prend l'or
 *                   les vraies parts de chaque joueur dans son split ;
 *   qui gagne un événement
 *                   les sous-cotes (js/cotes.js), à travers REGLAGES, ajustés
 *                   pour retomber sur les vraies parties (MOTEUR.md) ;
 *   les primes et les horaires
 *                   ceux du jeu : 300 d'or l'élimination, la moitié aux
 *                   aides, 300 par joueur au Nashor ; les sbires qui se
 *                   croisent à 1 min 30, le premier dragon à 5 min, le héraut de 8 à 20, le Nashor à 20, l'abandon
 *                   permis à 15, la phase de lignes jusqu'à 14 (les plaques).
 *
 * Tout le hasard d'une partie vient de son dé : hasard(graineDe(…)).
 */
import { hasard, graineDe } from './hasard.js';

const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
const LIGNES = { haut: ['haut', 'jungle'], milieu: ['milieu', 'jungle'], bas: ['bas', 'soutien', 'jungle'] };

/*
 * LES RÉGLAGES, et rien d'autre ne se règle. Chacun a été ajusté pour que le
 * moteur retombe sur une mesure des vraies parties (MOTEUR.md, « La
 * calibration ») ; check_feuilles juge le résultat.
 *
 *   force    le poids d'un écart de puissance (en écarts types) dans un événement
 *   boule    le poids de 1 000 pièces d'or d'avance (la boule de neige)
 *   ferme    l'or de plus par minute que vaut un écart de ligne (la ferme)
 *   tours    la part des tours qui tombent en cours de partie (le reste, au combat final)
 *   siege    la part de la boule de neige qui joue sur une tour (on en échange d'un bout à l'autre de la carte)
 *   cote     la part de l'avantage mesuré du côté bleu que porte chaque événement
 *   fin      le rythme du combat final : sa base, sa pente avec le temps, l'avance qui le hâte
 */
const REGLAGES = { force: 0.27, boule: 0.48, ferme: 0.024, tours: 0.91, siege: 0.49, cote: 0.42, fin: { base: 0.27, pente: 4.1, avance: 0.27 } };

const PAS = 0.5;               // un tour de moteur : 30 secondes de partie
const LIGNES_FIN = 14;         // les plaques tombent : fin de la phase de lignes
const ABANDON = 15;            // le nexus ne tombe pas avant (l'abandon permis)
const DUREE_MAX = 80;          // et toujours à 80 min : le combat final est forcé
const SBIRES = 1.5, DRAGON = 5, HERAUT = [8, 20], NASHOR = 20, TOUR = 10;   // TOUR : la première tour, rarement avant
const PRIME = 300, PRIME_AIDES = 150, PRIME_NASHOR = 300, PRIME_TOUR = 250;
const TOURS_MAX = 11, TOURS_LIGNE = 3, TOURS_NEXUS = 2;   // trois par ligne, deux devant le nexus

const moyenne = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const somme = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const sigmoide = x => 1 / (1 + Math.exp(-x));

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
  };
}

/* Le tempo d'une équipe faite de plusieurs splits, ou d'une partie entre deux équipes : la moyenne de ce qui est mesuré. */
export function melangerTempos(tempos) {
  const t = {};
  for (const cle of Object.keys(tempos[0])) {
    const xs = tempos.map(x => x[cle]).filter(x => x !== null);
    t[cle] = xs.length ? moyenne(xs) : null;
  }
  return t;
}

/** Un joueur tel que le moteur le lit : ses sous-cotes et ses vraies parts dans son split. */
export function joueurDuMoteur(j, profil) {
  return {
    n: j.n, r: j.r, valeur: profil.valeur, sous: profil.sous,
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

/* Ce que pèse une équipe à chaque phase, sur l'échelle des sous-cotes. */
function puissances(eq) {
  const c = eq.cinq;
  const s = (r, axe) => c[r].sous[axe] || 0;
  const combat = moyenne(ROLES.map(r => c[r].valeur));
  const ligne = {
    haut: moyenne([s('haut', 'ligne'), s('haut', 'pression'), s('jungle', 'implication')]),
    milieu: moyenne([s('milieu', 'ligne'), s('milieu', 'pression'), s('jungle', 'implication')]),
    bas: moyenne([s('bas', 'ligne'), s('soutien', 'implication'), s('soutien', 'vision'), s('jungle', 'implication')]),
  };
  return {
    combat, ligne,
    ferme: moyenne(ROLES.map(r => s(r, 'ligne'))),
    objectifs: moyenne([combat, s('jungle', 'objectifs'), s('soutien', 'vision')]),
  };
}

/* Un indice tiré selon des poids ; des poids tous nuls tirent au hasard égal. */
function selon(poids, de) {
  const tot = poids.reduce((s, p) => s + p, 0);
  if (!(tot > 0)) return Math.floor(de() * poids.length);
  let x = de() * tot;
  for (let i = 0; i < poids.length; i++) { x -= poids[i]; if (x < 0) return i; }
  return poids.length - 1;
}

/**
 * UNE PARTIE. `bleu` et `rouge` : des équipes du moteur ({ nom, cinq, tempo }).
 * Rend la feuille : { duree, gagnant (0 bleu, 1 rouge), equipes: [{ nom, k,
 * or, tours, dragons, barons, herauts, inhib, joueurs: [{ n, r, k, m, a, or }] }],
 * fil: [{ t, quoi, camp, … }] }.
 */
export function jouerPartie(bleu, rouge, graine) {
  const de = hasard(graine);
  const R = REGLAGES;
  const eqs = [bleu, rouge];
  const T = melangerTempos([bleu.tempo, rouge.tempo]);
  const P = eqs.map(puissances);
  const f = {
    duree: 0, gagnant: null, fil: [],
    equipes: eqs.map(e => ({ nom: e.nom, k: 0, or: 0, tours: 0, dragons: 0, barons: 0, herauts: 0, inhib: 0, joueurs: ROLES.map(r => ({ n: e.cinq[r].n, r, k: 0, m: 0, a: 0, or: 0 })) })),
  };
  const parts = (e, cle) => ROLES.map(r => e.cinq[r].part[cle]);
  const partsOr = eqs.map(e => { const p = parts(e, 'or'), s = p.reduce((a, b) => a + b, 0); return s > 0 ? p.map(x => x / s) : p.map(() => 0.2); });
  const donner = (camp, i, or) => { f.equipes[camp].joueurs[i].or += or; f.equipes[camp].or += or; };
  const partager = (camp, or) => ROLES.forEach((_, i) => donner(camp, i, or / ROLES.length));
  const avance = () => (f.equipes[0].or - f.equipes[1].or) / 1000;
  // La chance du côté bleu de gagner un événement : la puissance, l'avance d'or, le côté.
  const bleuGagne = (cle, ligne = null, boule = R.boule) => {
    const ecart = ligne ? P[0].ligne[ligne] - P[1].ligne[ligne] : P[0][cle] - P[1][cle];
    const cote = T.bleu > 0 && T.bleu < 1 ? R.cote * Math.log(T.bleu / (1 - T.bleu)) : 0;
    return de() < sigmoide(R.force * ecart + boule * avance() + cote) ? 0 : 1;
  };

  const elimination = t => {
    const ligne = t < LIGNES_FIN ? Object.keys(LIGNES)[Math.floor(de() * 3)] : null;
    const camp = bleuGagne('combat', ligne);
    const quiPeut = ligne ? LIGNES[ligne] : ROLES;
    const tueur = ROLES.indexOf(quiPeut[selon(quiPeut.map(r => eqs[camp].cinq[r].part.k), de)]);
    const victime = ROLES.indexOf(quiPeut[selon(quiPeut.map(r => eqs[1 - camp].cinq[r].part.m), de)]);
    const aides = ROLES.map((r, i) => i).filter(i => i !== tueur && de() < eqs[camp].cinq[ROLES[i]].part.a);
    const nous = f.equipes[camp], eux = f.equipes[1 - camp];
    nous.k++; nous.joueurs[tueur].k++; eux.joueurs[victime].m++;
    aides.forEach(i => { nous.joueurs[i].a++; donner(camp, i, PRIME_AIDES / aides.length); });
    donner(camp, tueur, PRIME);
    f.fil.push({ t, quoi: 'elim', camp, tueur, victime, aides });
  };
  const objectif = (t, quoi) => {
    const camp = quoi === 'tour' ? bleuGagne('combat', null, R.boule * R.siege) : bleuGagne('objectifs');
    const eq = f.equipes[camp];
    if (quoi === 'tour') {
      if (eq.tours >= TOURS_MAX - TOURS_NEXUS) return;     // celles du nexus attendent le combat final
      eq.tours++; partager(camp, PRIME_TOUR);
    } else if (quoi === 'nashor') {
      eq.barons++; partager(camp, PRIME_NASHOR * ROLES.length);
    } else if (quoi === 'dragon') eq.dragons++;
    else eq.herauts++;
    f.fil.push({ t, quoi, camp });
  };

  // Les débits, par minute, pour retomber en moyenne sur le tempo de l'époque.
  const D = T.duree;
  const debit = {
    elim: (2 * T.k) / (D - SBIRES),
    dragon: T.dragons === null ? 0 : (2 * T.dragons) / (D - DRAGON),
    heraut: T.herauts === null ? 0 : (2 * T.herauts) / (HERAUT[1] - HERAUT[0]),
    nashor: T.barons === null ? 0 : (2 * T.barons) / Math.max(1, D - NASHOR),
    tour: T.tours === null ? 0 : (2 * R.tours * T.tours) / (D - TOUR),
  };
  const evenements = [['elim', SBIRES, Infinity], ['dragon', DRAGON, Infinity], ['heraut', HERAUT[0], HERAUT[1]], ['nashor', NASHOR, Infinity], ['tour', TOUR, Infinity]];
  // Le revenu de base : l'or de l'époque, moins ce que les primes en donnent déjà.
  const primes = T.k * (PRIME + PRIME_AIDES) + (T.tours || 0) * PRIME_TOUR + (T.barons || 0) * PRIME_NASHOR * ROLES.length;
  const revenu = T.or === null ? 0 : Math.max(0, T.or - primes) / D;

  for (let t = PAS; ; t += PAS) {
    for (const camp of [0, 1]) {
      const gain = revenu * PAS * Math.max(0, 1 + R.ferme * (P[camp].ferme - P[1 - camp].ferme));
      partsOr[camp].forEach((p, i) => donner(camp, i, gain * p));
    }
    for (const [quoi, debut, fin] of evenements) {
      if (t >= debut && t < fin && de() < debit[quoi] * PAS) (quoi === 'elim' ? elimination(t) : objectif(t, quoi));
    }
    // Le combat final : de plus en plus probable avec le temps, plus tôt quand une équipe mène.
    if (t >= ABANDON) {
      const h = (R.fin.base / D) * Math.exp(R.fin.pente * (t / D - 1) + R.fin.avance * Math.abs(avance()));
      if (t >= DUREE_MAX || de() < h * PAS) {
        const camp = bleuGagne('combat');
        const eq = f.equipes[camp];
        // Le chemin du nexus : trois tours d'une ligne (prises avant, ou là), puis les deux du nexus, toujours là.
        for (let n = Math.max(0, TOURS_LIGNE - eq.tours) + TOURS_NEXUS; n > 0; n--) { eq.tours++; partager(camp, PRIME_TOUR); f.fil.push({ t, quoi: 'tour', camp }); }
        if (!eq.inhib) { eq.inhib++; f.fil.push({ t, quoi: 'inhib', camp }); }
        f.fil.push({ t, quoi: 'nexus', camp });
        f.duree = t;
        f.gagnant = camp;
        return f;
      }
    }
  }
}

/*
 * LE SPLIT AU JOUR LE JOUR (la règle de Cap 82-0 : rien ne se joue d'avance).
 * creerSplit pose le calendrier — une ronde où chacun croise chacun, deux
 * fois, côtés inversés au retour ; chaque rencontre est une série (BO1 ou
 * BO3). jouerJournee joue UNE journée. Chaque partie a son propre dé, tiré
 * de la graine du split et de sa place au calendrier : jouées une à une ou
 * d'un bloc, avec ou sans hasard tiré ailleurs entre deux, elles donnent la
 * même chose (check_graine).
 */
export function creerSplit(equipes, { graine, rondes = 2, bo = 1 }) {
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
    equipes, graine, jour: 0, series: null,
    journees: journees.map((jour, j) => jour.map(([a, b], i) => ({ a, b, bo, cle: `j${j}-${i}`, parties: [], v: [0, 0], gagnant: null }))),
  };
}

/* Une série jusqu'à sa dernière partie. Le perdant de la partie d'avant prend le côté bleu (la règle des ligues). */
function jouerSerie(L, s) {
  const besoin = Math.ceil(s.bo / 2);
  let bleu = 0;
  while (s.v[0] < besoin && s.v[1] < besoin) {
    const camps = bleu ? [s.b, s.a] : [s.a, s.b];
    const f = jouerPartie(L.equipes[camps[0]], L.equipes[camps[1]], graineDe(L.graine, `${s.cle}-${s.parties.length}`));
    const gagnant = camps[f.gagnant] === s.a ? 0 : 1;
    s.parties.push({ bleu: camps[0], rouge: camps[1], feuille: f });
    s.v[gagnant]++;
    bleu = gagnant === 0 ? 1 : 0;
  }
  s.gagnant = s.v[0] > s.v[1] ? s.a : s.b;
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

/** Joue la ronde en cours des séries et prépare la suivante. Faux s'il n'y a plus rien à jouer. */
export function jouerRonde(L) {
  const S = L.series;
  if (S.champion !== null) return false;
  const ronde = S.rondes[S.rondes.length - 1];
  for (const s of ronde) jouerSerie(L, s);
  const gagnants = ronde.map(s => s.gagnant).sort((x, y) => S.rang.indexOf(x) - S.rang.indexOf(y));
  const k = S.rondes.length;
  const serie = (a, b, i) => ({ a, b, bo: BO_SERIES, cle: `s${k}-${i}`, parties: [], v: [0, 0], gagnant: null });
  if (k === 1) S.rondes.push([serie(S.rang[0], gagnants[1], 0), serie(S.rang[1], gagnants[0], 1)]);
  else if (k === 2) S.rondes.push([serie(...gagnants, 0)]);
  else S.champion = gagnants[0];
  return true;
}
