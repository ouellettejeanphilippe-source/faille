/*
 * LE MOTEUR D'AVANT LA VERSION 6 DE LA SAUVEGARDE, GELÉ. Une partie de Rogue
 * est un journal d'actions rejoué sous sa graine (js/partie.js) : changer le
 * moteur changerait les parties d'une run en cours. Les sauvegardes v ≤ 5
 * jouent donc ce moteur-ci, tel qu'il était le 30 octobre 2026, au tirage
 * près ; check_gestion le prouve sur une run de la version 5 (scripts/lib/
 * partie-v5.json). Rien ne se règle ici : le moteur d'aujourd'hui est
 * js/moteur.js (MOTEUR.md).
 *
 * Il jouait par événements, un tour de 30 secondes à la fois, de 15 à 80
 * minutes : des éliminations isolées, des dragons, des hérauts, le Nashor,
 * des tours comme des événements de Poisson au débit de l'époque, puis le
 * combat final qui fait tomber le nexus (MOTEUR.md, l'annexe « Le moteur v1 »).
 */
import { hasard } from './hasard.js';
import { ROLES, LIGNES_FIN, MILIEU_FIN, PIVOT, sommerEffets, puissances, selon, sigmoide, melangerTempos } from './canaux.js';

const LIGNES = { haut: ['haut', 'jungle'], milieu: ['milieu', 'jungle'], bas: ['bas', 'soutien', 'jungle'] };
/* Les réglages tels qu'ils étaient calibrés (MOTEUR.md, l'annexe) : gelés. */
const REGLAGES = {
  force: 0.29, boule: 0.48, ferme: 0.025, tours: 0.883, siege: 0.49, cote: 0.42, fin: { base: 0.3, pente: 4.4, avance: 0.27 },
  obj: { boule: 0.52, bouleHeraut: 0.35, dragon: 0.07, ame: 0.22, nashor: 0.32, heraut: 0.31 },
};
const PAS = 0.5;               // un tour de moteur : 30 secondes de partie
const ABANDON = 15;            // le nexus ne tombe pas avant (l'abandon permis)
const DUREE_MAX = 80;          // et toujours à 80 min : le combat final est forcé
const SBIRES = 1.5, DRAGON = 5, HERAUT = [8, 20], NASHOR = 20, TOUR = 10;
const PRIME = 300, PRIME_AIDES = 150, PRIME_NASHOR = 300, PRIME_TOUR = 250;
const NASHOR_BUFF = 3, AME = 4;
const TOURS_MAX = 11, TOURS_LIGNE = 3, TOURS_NEXUS = 2;

/**
 * UNE PARTIE. `bleu` et `rouge` : des équipes du moteur ({ nom, cinq, tempo,
 * effets? }) ; `effets` : ce que chaque côté ajoute pour cette partie (son
 * repêchage), ou null.
 * Rend la feuille : { duree, gagnant (0 bleu, 1 rouge), equipes: [{ nom, k,
 * or, tours, dragons, barons, herauts, inhib, joueurs: [{ n, r, k, m, a, or }] }],
 * fil: [{ t, quoi, camp, … }], courbe: [l'avance d'or du bleu à chaque minute],
 * pouvoirs: [{ t, camp, id }] (ceux qui ont joué, à leur phase),
 * orJoueurs: [à chaque minute, [bleu, rouge] → l'or de chacun des cinq] }.
 * Une équipe peut porter `pouvoirs` : [{ id, phase, quand(etat), effet }].
 * Une élimination de la phase de lignes garde sa ligne (`ligne`, null après).
 * La ligne, la courbe et l'or de chacun ne font que regarder (le direct les montre) : ils ne tirent aucun dé.
 */
export function jouerPartieV1(bleu, rouge, graine, effets = [null, null]) {
  const de = hasard(graine);
  const R = REGLAGES;
  const eqs = [bleu, rouge];
  const T = melangerTempos([bleu.tempo, rouge.tempo]);
  const E = eqs.map((e, i) => sommerEffets([e.effets, effets[i]]));
  const P = eqs.map((e, i) => puissances(e, E[i]));
  const avecPouvoirs = eqs.some(e => e.pouvoirs && e.pouvoirs.length);
  const deux = c => Math.sqrt(E[0][c] * E[1][c]);
  const f = {
    duree: 0, gagnant: null, fil: [], courbe: [], pouvoirs: [], orJoueurs: [],
    equipes: eqs.map(e => ({ nom: e.nom, k: 0, or: 0, tours: 0, dragons: 0, barons: 0, herauts: 0, inhib: 0, joueurs: ROLES.map(r => ({ n: e.cinq[r].n, r, k: 0, m: 0, a: 0, or: 0 })) })),
  };
  const parts = (e, cle) => ROLES.map(r => e.cinq[r].part[cle]);
  const partsOr = eqs.map(e => { const p = parts(e, 'or'), s = p.reduce((a, b) => a + b, 0); return s > 0 ? p.map(x => x / s) : p.map(() => 0.2); });
  const donner = (camp, i, or) => { f.equipes[camp].joueurs[i].or += or; f.equipes[camp].or += or; };
  const partager = (camp, or) => ROLES.forEach((_, i) => donner(camp, i, or / ROLES.length));
  const avance = () => (f.equipes[0].or - f.equipes[1].or) / 1000;
  // Ce que portent les objectifs pris : les dragons (et l'âme), le Nashor tant que dure son buff.
  const nashorJusqua = [-1, -1];
  const buffs = (camp, t) => {
    const d = f.equipes[camp].dragons;
    return R.obj.dragon * Math.min(d, AME) + (d >= AME ? R.obj.ame : 0) + (t < nashorJusqua[camp] ? R.obj.nashor : 0);
  };
  // La chance du côté bleu de gagner un événement : la puissance, l'avance d'or, le côté ; `extra` : une priorité.
  const bleuGagne = (cle, t, ligne = null, boule = R.boule, extra = 0) => {
    const heure = cle === 'combat' && !ligne ? (E[0].tardif - E[1].tardif) * Math.max(-1, Math.min(1, 2 * (t / T.duree - PIVOT))) : 0;
    const ecart = (ligne ? P[0].ligne[ligne] - P[1].ligne[ligne] : P[0][cle] - P[1][cle] + buffs(0, t) - buffs(1, t)) + heure + extra;
    const cote = T.bleu > 0 && T.bleu < 1 ? R.cote * Math.log(T.bleu / (1 - T.bleu)) : 0;
    return de() < sigmoide(R.force * ecart + boule * avance() + cote) ? 0 : 1;
  };

  const elimination = t => {
    const ligne = t < LIGNES_FIN ? Object.keys(LIGNES)[Math.floor(de() * 3)] : null;
    const camp = bleuGagne('combat', t, ligne);
    const quiPeut = ligne ? LIGNES[ligne] : ROLES;
    const tueur = ROLES.indexOf(quiPeut[selon(quiPeut.map(r => eqs[camp].cinq[r].part.k), de)]);
    const victime = ROLES.indexOf(quiPeut[selon(quiPeut.map(r => eqs[1 - camp].cinq[r].part.m), de)]);
    const aides = ROLES.map((r, i) => i).filter(i => i !== tueur && de() < eqs[camp].cinq[ROLES[i]].part.a);
    const nous = f.equipes[camp], eux = f.equipes[1 - camp];
    nous.k++; nous.joueurs[tueur].k++; eux.joueurs[victime].m++;
    aides.forEach(i => { nous.joueurs[i].a++; donner(camp, i, PRIME_AIDES / aides.length); });
    donner(camp, tueur, PRIME);
    f.fil.push({ t, quoi: 'elim', camp, tueur, victime, aides, ligne });
  };
  const CANAL = { dragon: 'dragons', heraut: 'heraut', nashor: 'nashor', tour: 'split' };
  const tour = (t, camp) => {
    const eq = f.equipes[camp];
    if (eq.tours >= TOURS_MAX - TOURS_NEXUS) return;     // celles du nexus attendent le combat final
    eq.tours++; partager(camp, PRIME_TOUR);
    f.fil.push({ t, quoi: 'tour', camp });
  };
  const objectif = (t, quoi) => {
    const extra = E[0][CANAL[quoi]] - E[1][CANAL[quoi]];
    const boule = R.boule * (quoi === 'tour' ? R.siege : quoi === 'heraut' ? R.obj.bouleHeraut : R.obj.boule);
    const camp = bleuGagne(quoi === 'tour' ? 'combat' : 'objectifs', t, null, boule, extra);
    const eq = f.equipes[camp];
    if (quoi === 'tour') { tour(t, camp); return; }
    if (quoi === 'nashor') {
      eq.barons++; partager(camp, PRIME_NASHOR * ROLES.length);
      nashorJusqua[camp] = t + NASHOR_BUFF;
    } else if (quoi === 'dragon') eq.dragons++;
    else eq.herauts++;
    f.fil.push({ t, quoi, camp });
    // Le héraut lâché sur une tour : souvent, elle tombe.
    if (quoi === 'heraut' && de() < R.obj.heraut) tour(t, camp);
  };

  // Les débits, par minute, pour retomber en moyenne sur le tempo de l'époque ; un pouvoir qui joue les refait.
  const D = T.duree;
  const debits = () => ({
    elim: (deux('rythme') * 2 * T.k) / (D - SBIRES),
    dragon: T.dragons === null ? 0 : (2 * T.dragons) / (D - DRAGON),
    heraut: T.herauts === null ? 0 : (2 * T.herauts) / (HERAUT[1] - HERAUT[0]),
    nashor: T.barons === null ? 0 : (2 * T.barons) / Math.max(1, D - NASHOR),
    tour: T.tours === null ? 0 : (deux('siege') * 2 * R.tours * T.tours) / (D - TOUR),
  });
  let debit = debits();
  // LES POUVOIRS, au début de chaque phase : ce qui est déjà joué, vu d'un camp ; ceux dont la condition tient jouent la phase.
  const etat = (camp, phase) => {
    const nous = f.equipes[camp], eux = f.equipes[1 - camp];
    return { phase, bleu: camp === 0, avance: nous.or - eux.or, tours: nous.tours - eux.tours, dragons: nous.dragons - eux.dragons, k: nous.k - eux.k };
  };
  const poser = (t, phase) => {
    eqs.forEach((e, camp) => {
      const actifs = (e.pouvoirs || []).filter(x => x.phase === phase && x.quand(etat(camp, phase)));
      for (const x of actifs) f.pouvoirs.push({ t, camp, id: x.id });
      E[camp] = sommerEffets([e.effets, effets[camp], ...actifs.map(x => x.effet)]);
      P[camp] = puissances(e, E[camp]);
    });
    debit = debits();
  };
  const evenements = [['elim', SBIRES, Infinity], ['dragon', DRAGON, Infinity], ['heraut', HERAUT[0], HERAUT[1]], ['nashor', NASHOR, Infinity], ['tour', TOUR, Infinity]];
  // Le revenu de base : l'or de l'époque, moins ce que les primes en donnent déjà.
  const primes = T.k * (PRIME + PRIME_AIDES) + (T.tours || 0) * PRIME_TOUR + (T.barons || 0) * PRIME_NASHOR * ROLES.length;
  const revenu = T.or === null ? 0 : Math.max(0, T.or - primes) / D;

  for (let t = PAS; ; t += PAS) {
    if (avecPouvoirs && (t === PAS || t === LIGNES_FIN || t === MILIEU_FIN)) poser(t, t === PAS ? 'lignes' : t === LIGNES_FIN ? 'milieu' : 'tardif');
    for (const camp of [0, 1]) {
      const gain = revenu * PAS * Math.max(0, 1 + R.ferme * (P[camp].ferme - P[1 - camp].ferme));
      partsOr[camp].forEach((p, i) => donner(camp, i, gain * p));
    }
    for (const [quoi, debut, fin] of evenements) {
      if (t >= debut && t < fin && de() < debit[quoi] * PAS) (quoi === 'elim' ? elimination(t) : objectif(t, quoi));
    }
    if (t % 1 === 0) {
      f.courbe.push(Math.round(f.equipes[0].or - f.equipes[1].or));
      f.orJoueurs.push(f.equipes.map(e => e.joueurs.map(j => Math.round(j.or))));
    }
    // Le combat final : de plus en plus probable avec le temps, plus tôt quand une équipe mène.
    if (t >= ABANDON) {
      const h = (deux('fin') * R.fin.base / D) * Math.exp(R.fin.pente * (t / D - 1) + R.fin.avance * Math.abs(avance()));
      if (t >= DUREE_MAX || de() < h * PAS) {
        const camp = bleuGagne('combat', t);
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
