/*
 * LE MOTEUR : UNE PARTIE COMME UNE VRAIE (MOTEUR.md). Une partie se joue
 * par tours de 30 secondes, et chaque tour fait vivre la Faille de son
 * époque : les sbires et la ferme de chacun, l'expérience et les niveaux
 * (l'ultime au 6), les sorts d'invocateur et leurs recharges, les jeux de la
 * phase de lignes (un duel, un gank, une plongée sous la tour), les
 * escarmouches et les combats d'équipe, les monstres à leurs horaires (le
 * dragon et son type, l'âme, l'ancestral, le héraut, les larves, le Nashor,
 * Atakhan), les plaques, les tours palier par palier, les inhibiteurs qui
 * repoussent, et l'assaut qui fait tomber le nexus. Rien n'est tiré d'avance :
 * la durée, le pointage et l'or ÉMERGENT, et la feuille se ferme par
 * construction — check_feuilles le mesure.
 *
 * UN COMBAT EST UN COMBAT. Ses participants (ceux qui sont en vie et là) se
 * rendent les coups un échange à la fois : à chaque échange, un camp prend
 * une élimination selon sa puissance, son or, son nombre (un mort ne revient
 * pas avant sa réapparition), ses sorts prêts, ses buffs ; la victime peut
 * s'en tirer au Flash, aux Soins, à la Barrière ; le combat continue ou se
 * défait. Il en sort des échanges, des 3 pour 1, des as, des doublés et des
 * pentas, et son vainqueur pousse vers les tours tant que les autres
 * attendent à leur fontaine.
 *
 * D'où vient chaque chiffre :
 *
 *   le tempo        les repères du split de chaque équipe (js/sim.js
 *                   tempoDuSplit) : durée, éliminations, or, dragons,
 *                   Nashor, hérauts, côté bleu — mesurés sur ses vraies parties ;
 *   les règles      celles du jeu À SON ÉPOQUE (regles(), l'année du split) :
 *                   les horaires des monstres, les plaques, les primes, les
 *                   recharges — chacune avec sa source dans son commentaire ;
 *   les joueurs     leurs vraies parts dans leur split (qui tue, qui aide, qui
 *                   meurt, qui prend l'or), leurs sbires par minute, leurs sorts
 *                   d'invocateur et leurs objets (les shards) ; à défaut de sorts,
 *                   ceux de leur rôle à leur époque (REPLI, mesuré) ;
 *   qui gagne       les sous-cotes (js/cotes.js), à travers REGLAGES, ajustés pour
 *                   retomber sur les vraies parties (scripts/lib/reperes.mjs).
 *
 * Tout le hasard d'une partie vient de son dé : hasard(graine). Ce qui change
 * une partie (le repêchage, les cartes, le coach) passe par les CANAUX
 * (js/canaux.js) et par rien d'autre ; neutres, ils rejouent la partie
 * calibrée. Les pouvoirs du coach jouent phase par phase, comme avant.
 */
import { hasard, graineDe } from './hasard.js';
import { ROLES, LIGNES_FIN, MILIEU_FIN, sommerEffets, puissances, selon, sigmoide, melangerTempos } from './canaux.js';

/*
 * LES RÉGLAGES, et rien d'autre ne se règle (MOTEUR.md § 4). Chacun a été
 * cherché par scripts/calibrer.mjs pour que les vraies parties, rejouées,
 * retombent sur ce qui s'est passé ; check_feuilles juge.
 *
 *   force    le poids d'un écart de puissance (en écarts types) dans un échange
 *   boule    le poids de 1 000 pièces d'or d'avance (les objets, la boule de neige)
 *   nombre   le poids d'un joueur de plus dans un combat
 *   cote     la part de l'avantage mesuré du côté bleu que porte chaque échange
 *   ferme    l'or de plus par minute que vaut un écart de ligne
 *   emprise  la ferme de plus du camp qui mène à l'or (la carte à lui : la jungle adverse, les vagues), par 1 000 d'avance
 *   rythme   le débit des jeux (duels, ganks, escarmouches, combats) sur celui des éliminations de l'époque
 *   aide     la chance d'aider d'un coéquipier dans le coup, en plus de sa vraie part
 *   tours    la pression d'une ligne sur sa tour (les plaques, la poussée de côté)
 *   pousse   ce que vaut un mort adverse en tours, quand le vainqueur d'un combat pousse
 *   fin      la poussée qui grandit avec l'heure (sa pente, sur la durée de l'époque) et avec l'avance d'or du vainqueur ;
 *            la base qui se défend mieux contre un camp qui ne mène pas de loin
 *   obj      les objectifs : la part de la boule de neige ; la chance de les disputer ;
 *            le buff d'un dragon, de l'âme, de l'ancestral, du Nashor ; la tour que le
 *            héraut fait tomber ; la chance d'un vol au Châtiment ; le rythme des prises (des dragons, du Nashor)
 */
const REGLAGES = {
  force: 0.3743, boule: 0.1109, nombre: 0.3264, cote: 0.3039, ferme: 0.0101, emprise: 0.0113, rythme: 1.8019, aide: 0.785, tours: 3.5843, pousse: 0.785,
  fin: { pente: 1.53, avance: 0.045, base: 0.3856 },
  obj: { boule: 1.5449, dispute: 0.2318, dragon: 0.0564, ame: 0.4963, ancestral: 0.6, nashor: 0.2446, heraut: 0.7893, vol: 0.06, rythme: 1.23, rythmeNashor: 1.4205 },
};

/** Pour scripts/calibrer.mjs seulement : remplace des réglages (un objet de la même forme), le temps d'une recherche. */
export function regler(r) {
  for (const [k, v] of Object.entries(r)) REGLAGES[k] = typeof v === 'object' ? { ...REGLAGES[k], ...v } : v;
}

const PAS = 0.5;          // un tour de moteur : 30 secondes de partie
const ABANDON = 15;       // le nexus ne tombe pas avant (l'abandon permis)
const DUREE_MAX = 80;     // à 80 min, chaque tour finit sur un combat qui force le nexus
const SBIRES = 1.5;       // les sbires se croisent dans les lignes (ils sortent à 1:05)
const HAUT = 0, JUNGLE = 1, MILIEU = 2, BAS = 3, SOUTIEN = 4;
const LIGNES = ['haut', 'milieu', 'bas'];
const DE_LA_LIGNE = { haut: [HAUT], milieu: [MILIEU], bas: [BAS, SOUTIEN] };

/*
 * LES PRIMES. Une élimination : 300 d'or, la moitié de plus partagée entre
 * les aides (au plus 150) ; une série d'éliminations monte la prime de 100 par
 * élimination dès la deuxième, jusqu'à 1 000 ; une série de morts la baisse
 * (267, puis × 0,75, au moins 100) — wiki LoL, « Champion gold bounties »
 * (V8.23, V14.10). Le Nashor : 300 à chacun. Le premier sang : regles().
 */
const PRIME = 300, PRIME_MAX = 1000, PRIME_MIN = 100, AIDES_MAX = 150, PRIME_NASHOR = 300;
const prime = j => (j.serie >= 2 ? Math.min(PRIME_MAX, PRIME + 100 * (j.serie - 1)) : j.disette >= 1 ? Math.max(PRIME_MIN, 267 * 0.75 ** (j.disette - 1)) : PRIME);

/*
 * L'EXPÉRIENCE ET LES NIVEAUX. Ce qu'il faut pour chaque niveau, de 2 à 18
 * (280, puis 100 de plus chaque niveau — wiki LoL, « Experience ») ; ce qu'un
 * joueur en vie prend par minute selon son rôle (les sbires d'une ligne seul,
 * partagés au bas, les camps du jungler), réglé pour retomber sur les niveaux
 * d'une partie pro (un milieu au 11 à 15 min, au 17 vers 32 ; un soutien deux
 * niveaux plus bas) ; ce que vaut une élimination.
 */
const XP_NIVEAU = [0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440, 13020, 14700, 16480, 18360];
const XP_MINUTE = [520, 450, 540, 440, 370];
const xpElim = niv => 60 + 22 * niv;

/*
 * LA RÉAPPARITION (wiki LoL, « Death ») : l'attente de base selon le niveau,
 * en secondes, puis le facteur du temps passé 15 min (0,425 % par demi-minute
 * jusqu'à 30, 0,3 % jusqu'à 45, 1,45 % jusqu'à 55, au plus 50 %).
 */
const ATTENTE = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5];
function reapparition(niv, t) {
  const d = n => Math.ceil(2 * n);
  const tif = t < 15 ? 0 : t < 30 ? d(t - 15) * 0.00425 : t < 45 ? 0.1275 + d(t - 30) * 0.003 : Math.min(0.5, 0.2175 + d(t - 45) * 0.0145);
  return (ATTENTE[niv - 1] * (1 + tif)) / 60;
}
const INHIB_RETOUR = 5;   // un inhibiteur repousse 5 min après sa chute (wiki LoL, « Inhibitor »)

/*
 * LES SORTS D'INVOCATEUR : [nom, icône de Data Dragon, recharge en secondes selon
 * l'année, la version de Data Dragon de l'icône quand le sort a quitté la Faille].
 * Les recharges : Data Dragon, summoner.json des versions 3.15.5 (2013), 4.20.1
 * (2014), 6.24.1 (2016) et 16.20.1 ; le Châtiment a deux charges depuis 2015 (on
 * le tient toujours prêt pour un objectif). Les noms : ceux du client français,
 * sauf « Flash », le mot de tout le monde.
 */
export const SORTS = {
  F: ['Flash', 'SummonerFlash', () => 300],
  T: ['Téléportation', 'SummonerTeleport', a => (a >= 2020 ? 360 : 300)],
  I: ['Embrasement', 'SummonerDot', a => (a === 2016 || a === 2017 ? 210 : 180)],
  S: ['Châtiment', 'SummonerSmite', a => (a <= 2014 ? 75 : 15)],
  H: ['Soins', 'SummonerHeal', a => (a <= 2015 ? 300 : 240)],
  E: ['Fatigue', 'SummonerExhaust', a => (a <= 2018 ? 210 : 240)],
  B: ['Barrière', 'SummonerBarrier', a => (a <= 2015 ? 210 : 180)],
  C: ['Purge', 'SummonerBoost', a => (a <= 2018 ? 210 : 240)],
  G: ['Fantôme', 'SummonerHaste', a => (a <= 2015 ? 210 : a <= 2018 ? 180 : 240)],
  L: ['Clarté', 'SummonerMana', () => 180],
  V: ['Clairvoyance', 'SummonerClairvoyance', () => 55, '4.20.1'],
  P: ['Promotion', 'SummonerPromoteSR', () => 180, '3.15.5'],
  R: ['Réanimation', 'SummonerRevive', () => 510, '4.20.1'],
};
/*
 * LES SORTS D'UN RÔLE À SON ÉPOQUE, quand le shard n'a pas ceux du joueur : la
 * paire la plus jouée à chaque rôle, Mondial par Mondial (Leaguepedia,
 * ScoreboardPlayers, mesuré le 30 octobre 2026), [année de début, sorts].
 */
const REPLI = {
  haut: [[2011, 'FI'], [2014, 'FT']],
  jungle: [[2011, 'FS']],
  milieu: [[2011, 'FI'], [2015, 'FT'], [2016, 'FG'], [2017, 'FT']],
  bas: [[2011, 'FE'], [2012, 'FI'], [2013, 'FB'], [2014, 'FH'], [2017, 'FB'], [2018, 'FH'], [2019, 'FT'], [2020, 'FH'], [2021, 'FC'], [2025, 'FB']],
  soutien: [[2011, 'FV'], [2012, 'FE'], [2013, 'FI'], [2015, 'FE'], [2017, 'FH'], [2018, 'FI'], [2025, 'FH']],
};
/** Les deux sorts d'un joueur : les siens (le shard, sur son plus joué), sinon ceux de son rôle à l'époque de la partie. */
function sortsDe(j, annee) {
  if (j.sorts && /^[A-Z]{2}$/.test(j.sorts)) return j.sorts.split('');
  return REPLI[j.r].filter(([a]) => a <= annee).pop()[1].split('');
}

/*
 * LES RÈGLES D'UNE ÉPOQUE, au patch du Mondial de son année (une partie entre
 * deux époques prend la moyenne des années). Les sources : le wiki LoL
 * (« Dragon pit », « Dragon/Removed », « Baron Nashor », « Rift Herald »,
 * « Voidgrub », « Atakhan », « Turret »), les notes de la V8.23.
 */
const QUATRE = ['infernal', 'montagne', 'ocean', 'nuage'];
export function regles(annee) {
  const a = Math.round(annee ?? 2020);
  return {
    annee: a,
    // Le dragon : 2:30 puis 6 min après sa mort jusqu'à la V8.22 ; 5:00 puis 5 min depuis la V8.23 (le Mondial 2019).
    dragon: a <= 2018 ? { premier: 2.5, retour: 6 } : { premier: 5, retour: 5 },
    // Les dragons élémentaires (V6.9, 2016) ; Hextech (V11.23, le Mondial 2022) ; Chimtech, retiré en V12.2, revenu en V12.22.
    types: a < 2016 ? null : a < 2022 ? QUATRE : a < 2023 ? [...QUATRE, 'hextech'] : [...QUATRE, 'hextech', 'chimtech'],
    // L'âme au quatrième dragon d'un camp, le terrain au troisième de la partie (V9.23, 2020 →).
    ame: a >= 2020,
    // L'ancestral : après 35:00 (V6.9), de retour 10 min après (8 en V8.4, 6 en V8.23) ; depuis la V9.23, 6 min après l'âme.
    ancestral: a < 2016 ? null : a < 2020 ? { apres: 35, retour: a <= 2017 ? 10 : a === 2018 ? 8 : 6 } : { apres: null, retour: 6 },
    // Le Nashor : 15:00 jusqu'à la V4.20 (2015 → 20:00), 25:00 en 2025 (V25.S1.1) ; de retour 7 min après, 6 depuis la V8.23 ;
    // son buff : 4 min, 3 min (la Main du Baron, V4.20), 3 min 30 (V6.9), 3 min (V9.23).
    nashor: { premier: a <= 2014 ? 15 : a === 2025 ? 25 : 20, retour: a <= 2018 ? 7 : 6, buff: a <= 2014 ? 4 : a === 2015 ? 3 : a <= 2019 ? 3.5 : 3 },
    // Le héraut (V5.22, 2016 →) : 6:00 (V6.9), 10:00 (V6.22), 9:50 (V7.22), 8:00 et un second 6 min après (V9.23), 14:00 et
    // un seul (V14.1), 15:00 (V25.09) ; il part à 19:45, et à 24:45 en 2025, avec le Nashor à 25:00.
    heraut: a < 2016 ? null : { premier: a === 2016 ? 6 : a === 2017 ? 10 : a <= 2019 ? 9.83 : a <= 2023 ? 8 : a === 2024 ? 14 : 15, fin: a === 2025 ? 24.75 : 19.75, n: a >= 2020 && a <= 2023 ? 2 : 1, retour: 6 },
    // Les larves du Néant (V14.1) : deux vagues de trois dès 6:00 (V14.8), la seconde 4 min après ; une vague à 8:00 (V25.09) ;
    // elles partent à 13:45 (14:45 en 2025).
    larves: a === 2024 ? { premier: 6, fin: 13.75, vagues: 2, retour: 4 } : a >= 2025 ? { premier: 8, fin: 14.75, vagues: 1, retour: 0 } : null,
    // Atakhan (V25.S1.1 → V26.01) : à 20:00, une fois.
    atakhan: a === 2025 ? 20 : null,
    // Les plaques (V8.23) : cinq par tour extérieure jusqu'à 14:00, 160 d'or chacune ; 125 en 2024 et 2025.
    plaque: a >= 2019 ? (a >= 2024 ? 125 : 160) : 0,
    // Le premier sang : 100 d'or de plus, sauf en 2025 (retiré en V25.S1.1).
    premierSang: a === 2025 ? 0 : 100,
    // Une tour, ce que l'équipe touche en tout (la prime globale de chacun et la locale), par palier — extérieure, intérieure,
    // inhibiteur, nexus : les grosses primes globales d'avant la V8.23, puis les plaques, puis les tours intérieures de la V13.23.
    tours: a <= 2018 ? [750, 800, 800, 250] : a <= 2023 ? [500, 675, 300, 250] : [500, 800, 500, 250],
    // La Téléportation sur un combat de la phase de lignes : courante de 2014 à 2019, rare depuis qu'elle attend 14 min (2020 →).
    tpLignes: a < 2014 ? 0 : a < 2020 ? 0.14 : 0.03,
  };
}

/* Les tours d'une ligne, de l'extérieure à celle de l'inhibiteur, et ce qu'il en coûte de les faire tomber (en « tours ») ; puis la base. */
const COUT_TOUR = [1, 1.35, 1.6], COUT_INHIB = 0.7, COUT_NEXUS_TOUR = 1, COUT_NEXUS = 0.8;
/*
 * LES JEUX, par tour, en part du débit des éliminations de l'époque (×
 * REGLAGES.rythme) : en phase de lignes et par ligne, un duel, un gank (dès
 * 2:30), une plongée sous la tour (dès 6:00) ; une invasion dans la jungle ;
 * ensuite, un pick, une escarmouche, un combat d'équipe. Ceux des objectifs
 * viennent en plus, à leurs horaires. LA PRESSION sur les tours : par ligne en
 * phase de lignes (une plaque), sur les deux lignes de côté ensuite (× REGLAGES.tours).
 */
const JEUX = { duel: 0.035, gank: 0.055, plongee: 0.018, invasion: 0.03, pick: 0.11, escarmouche: 0.1, combat: 0.1 };
const PRESSION = { lignes: 0.09, cote: 0.11 };
const SUPER_SBIRES = 0.25;   // un inhibiteur à terre : les super-sbires pressent sa ligne, jusqu'au nexus
const NASHOR_POUSSE = 2.5;   // le buff du Nashor : les sbires renforcés, le rappel éclair, une poussée qui va plus loin
/*
 * LE CANAL `ligne` DANS CE MOTEUR : ce qu'il ajoute à la puissance des lignes
 * (les duels, les ganks, les plongées), à la pression d'une ligne sur sa tour
 * (les plaques), et aux autres combats de la phase de lignes. Une ligne qui
 * gagne compte ici plus qu'au moteur d'avant (elle fait les niveaux, l'or, les
 * plaques, la première tour) : le canal y est dosé pour qu'une carte reste dans
 * la borne de sa rareté (check_rogue).
 */
const LIGNE_CANAL = { lignes: 0.7, pression: 3, combats: 0.5 };
/*
 * LA DOSE DES CANAUX ADDITIFS dans ce moteur : un écart type d'un canal y vaut
 * DOSE écart type de puissance. Ici, une puissance se compose (le nombre, les
 * niveaux, l'or font boule de neige dans un combat) : la dose garde une carte
 * dans la borne de sa rareté. Le confort (un joueur sur son champion) reste entier.
 */
const DOSE = 0.85;
const ADDITIFS = ['ligne', 'combat', 'objectifs', 'dragons', 'heraut', 'nashor', 'split', 'tardif'];
function doser(E) {
  const out = { ...E };
  for (const c of ADDITIFS) out[c] = E[c] * DOSE;
  return out;
}
const PIVOT_V2 = 0.65;   // l'heure où le tardif ne compte ni pour ni contre, en part de la durée de l'époque
function puissancesV2(e, E) {
  const P = puissances(e, E);
  for (const l of LIGNES) P.ligne[l] -= (1 - LIGNE_CANAL.lignes) * E.ligne;
  return P;
}
/* Combien de temps un combat se poursuit, selon son genre ; la chance d'y fuir au Flash. */
const SUITE = { duel: 0.3, gank: 0.45, plongee: 0.55, escarmouche: 0.65, pick: 0.4, bataille: 0.82, combat: 0.86, assaut: 0.86 };
const FUITE = { duel: 0.35, gank: 0.33, plongee: 0.3, escarmouche: 0.24, pick: 0.33, bataille: 0.15, combat: 0.14, assaut: 0.1 };
const EN_LIGNE = new Set(['duel', 'gank', 'plongee']);

/**
 * UNE PARTIE. `bleu` et `rouge` : des équipes du moteur ({ nom, cinq, tempo,
 * effets?, pouvoirs? }) ; `effets` : ce que chaque côté ajoute pour cette
 * partie (son repêchage), ou null.
 *
 * Rend la feuille : { moteur: 2, annee, duree, gagnant (0 bleu, 1 rouge),
 * equipes: [{ nom, k, or, tours, dragons, barons, herauts, inhib, plaques,
 * larves, atakhan, ancestraux, ame, joueurs: [{ n, r, k, m, a, or, cs, niv,
 * vision, sorts, objets }] }], fil, courbe (l'avance d'or du bleu à chaque minute),
 * orJoueurs, niveaux, sbires (à chaque minute, [bleu, rouge] → les cinq),
 * pouvoirs: [{ t, camp, id }] }.
 *
 * Le fil, dans l'ordre de l'horloge :
 *   elim     { camp, tueur, victime, aides, ligne (phase de lignes), lieu, genre, combat, sorts: [[camp, i, sort]],
 *              ult, multi (2 à 5), serie, prime (la fin d'une série), premier, retour (minutes à attendre) }
 *   fuite    { camp, i, sort, combat } : la victime s'en tire (Flash, Fantôme, Soins, Barrière)
 *   tp       { camp, i, lieu, combat } : la Téléportation sur un combat
 *   plaque   { camp, ligne }                  tour { camp, ligne (null : le nexus), palier, heraut? }
 *   inhib    { camp, ligne }                  repousse { camp (à qui il est), ligne }
 *   dragon   { camp, type, ancestral?, ame?, terrain? (la Faille se transforme), vol? }
 *   heraut, nashor { camp, vol? }   larves { camp, n }   atakhan { camp }
 *   nexus    { camp }
 */
export function jouerPartie(bleu, rouge, graine, effets = [null, null]) {
  // UN DÉ PAR TOUR (des nombres aléatoires communs) : chaque tour tire son propre dé de la graine de la partie et de son
  // numéro. Un effet qui change un combat ne décale donc pas les dés des tours suivants : deux parties qui ne diffèrent
  // que par un canal restent la même partie ailleurs, et la mesure en paires (check_rogue) mesure l'effet, pas le hasard.
  let de = hasard(graine);
  const R = REGLAGES;
  const eqs = [bleu, rouge];
  const T = melangerTempos([bleu.tempo, rouge.tempo]);
  const X = regles(T.annee);
  const D = T.duree;
  const E = eqs.map((e, i) => doser(sommerEffets([e.effets, effets[i]])));
  const P = eqs.map((e, i) => puissancesV2(e, E[i]));
  const avecPouvoirs = eqs.some(e => e.pouvoirs && e.pouvoirs.length);
  const deux = c => Math.sqrt(E[0][c] * E[1][c]);
  const cote = T.bleu > 0 && T.bleu < 1 ? R.cote * Math.log(T.bleu / (1 - T.bleu)) : 0;

  const f = {
    moteur: 2, annee: X.annee, duree: 0, gagnant: null, fil: [], courbe: [], pouvoirs: [], orJoueurs: [], niveaux: [], sbires: [],
    equipes: eqs.map(e => ({
      nom: e.nom, k: 0, or: 0, tours: 0, dragons: 0, barons: 0, herauts: 0, inhib: 0, plaques: 0, larves: 0, atakhan: 0, ancestraux: 0, ame: null,
      joueurs: ROLES.map(r => ({ n: e.cinq[r].n, r, k: 0, m: 0, a: 0, or: 0, cs: 0, niv: 1, vision: 0, sorts: sortsDe(e.cinq[r], X.annee), objets: e.cinq[r].objets || [] })),
    })),
  };
  // L'état de chacun : quand il revient (mort), son expérience, sa série, sa recharge de chaque sort et de son ultime, son dernier coup (les multiples).
  const J = eqs.map((e, c) => ROLES.map((r, i) => {
    const p = e.cinq[r];
    const cs = p.csMin ?? [8, 5.4, 8.6, 9.2, 1.3][i];
    // Son score de vision par minute : le sien (le shard), sinon celui de son rôle (les balises du soutien et du jungler d'abord).
    const vision = p.visionMin ?? [0.7, 1.3, 0.8, 0.7, 2.5][i];
    return { c, i, p, fj: f.equipes[c].joueurs[i], mort: 0, xp: 0, niv: 1, serie: 0, disette: 0, pret: [0, 0], ult: 0, dernier: -9, multi: 0, cs, vision };
  }));
  // En vie, à l'heure du fil (`tic`) : un jeu se forme et se joue à son heure, pas à celle du tour.
  const vivant = (c, i) => J[c][i].mort <= tic;
  const vivants = c => J[c].filter(j => j.mort <= tic);
  const donner = (c, i, or) => { f.equipes[c].joueurs[i].or += or; f.equipes[c].or += or; };
  const partager = (c, or) => { for (let i = 0; i < 5; i++) donner(c, i, or / 5); };
  const avance = () => (f.equipes[0].or - f.equipes[1].or) / 1000;
  const niv = j => j.niv;
  const gagnerXp = (j, x) => { j.xp += x; while (j.niv < 18 && j.xp >= XP_NIVEAU[j.niv]) j.niv++; };

  // L'horloge du fil : chaque événement un peu après le précédent, dans le tour.
  let tic = 0;
  const plusTard = (a, b) => (tic = Math.max(tic, tic + a + de() * (b - a)));
  const dire = ev => { f.fil.push(ev); return ev; };

  /* ---- LES BUFFS : les dragons (et l'âme), l'ancestral, le Nashor, Atakhan ---- */
  const dragonsDe = [0, 0], ancestralJusqua = [-1, -1], nashorJusqua = [-1, -1];
  const buffs = (c, t) => R.obj.dragon * Math.min(dragonsDe[c], 4) + (f.equipes[c].ame ? R.obj.ame : 0)
    + (t < ancestralJusqua[c] ? R.obj.ancestral : 0) + (t < nashorJusqua[c] ? R.obj.nashor : 0) + (f.equipes[c].atakhan ? R.obj.dragon : 0);
  // Le tardif : moins tôt, plus tard. Ici, la partie se joue plus tôt qu'au moteur d'avant (les lignes font l'or et les niveaux) :
  // son pivot vient plus tôt (PIVOT_V2), pour que « jouer pour le tardif » reste un échange.
  const heure = t => (E[0].tardif - E[1].tardif) * Math.max(-1, Math.min(1, 2 * (t / D - PIVOT_V2)));

  /* ---- LES STRUCTURES de chaque camp : par ligne, les tours tombées (0 à 3), le dégât de la suivante, l'inhibiteur ; les tours du nexus ---- */
  const S = [0, 1].map(() => ({ tombees: { haut: 0, milieu: 0, bas: 0 }, degat: { haut: 0, milieu: 0, bas: 0 }, inhib: { haut: -1, milieu: -1, bas: -1 }, nexus: 0, plaques: { haut: 5, milieu: 5, bas: 5 } }));
  const inhibAbattu = (c, l, t) => S[c].inhib[l] > t;
  const repousses = [];   // [quand, camp, ligne] : les inhibiteurs à terre, dans l'ordre où ils repoussent
  let fini = false;
  // Une tour tombe : l'or de son palier à toute l'équipe, au fil.
  const tourTombe = (camp, l, palier, extra) => {
    const eux = 1 - camp;
    if (l) S[eux].tombees[l]++; else S[eux].nexus++;
    f.equipes[camp].tours++;
    partager(camp, X.tours[palier]);
    dire({ t: tic, quoi: 'tour', camp, ligne: l, palier, ...extra });
  };
  /*
   * POUSSER : `unites` de pression (une tour extérieure en vaut une) sur la
   * ligne `l` de l'autre camp, structure après structure, dans l'ordre : la
   * tour suivante, l'inhibiteur, les deux tours du nexus (attaquables tant
   * qu'un inhibiteur est à terre), le nexus. `jusqua` : 'ligne' (les tours de
   * la ligne et l'inhibiteur, une poussée de côté), 'base' (et la base). Le
   * nexus ne tombe pas avant ABANDON. Rend vrai si le nexus est tombé.
   */
  const pousser = (camp, unites, l, t, jusqua = 'base', extra = {}) => {
    const eux = 1 - camp, s = S[eux];
    // La base se défend : contre un camp qui ne mène pas de loin, ses tours et son nexus tiennent plus (la défense de base).
    const mene = Math.max(0, (camp ? -1 : 1) * avance());
    const fin = (1 + R.fin.base * Math.exp(-mene / 4)) / deux('fin');
    let aLaBase = false;
    while (unites > 1e-9 && !fini) {
      if (s.tombees[l] < 3) {
        const palier = s.tombees[l];
        // En phase de lignes, la tour extérieure perd ses plaques une à une.
        const cout = COUT_TOUR[palier];
        const reste = (1 - s.degat[l]) * cout;
        if (unites < reste) {
          const avant = s.degat[l];
          s.degat[l] += unites / cout;
          unites = 0;
          if (palier === 0) plaques(camp, l, avant, s.degat[l], t, extra);
          break;
        }
        unites -= reste;
        if (palier === 0) plaques(camp, l, s.degat[l], 1, t, extra);
        s.degat[l] = 0;
        plusTard(0.05, 0.25);
        tourTombe(camp, l, palier, extra);
        continue;
      }
      if (!inhibAbattu(eux, l, t)) {
        const cout = COUT_INHIB * (jusqua === 'base' ? fin : 1);
        if (unites < cout) break;
        unites -= cout;
        plusTard(0.05, 0.2);
        s.inhib[l] = tic + INHIB_RETOUR;
        repousses.push([s.inhib[l], eux, l]);
        f.equipes[camp].inhib++;
        dire({ t: tic, quoi: 'inhib', camp, ligne: l });
        continue;
      }
      if (jusqua !== 'base') break;
      if (s.nexus < 2) {
        const cout = COUT_NEXUS_TOUR * fin;
        if (unites < cout) { aLaBase = true; break; }
        unites -= cout;
        plusTard(0.05, 0.2);
        tourTombe(camp, null, 3, extra);
        continue;
      }
      if (unites < COUT_NEXUS * fin || tic < ABANDON) { aLaBase = true; break; }
      plusTard(0.05, 0.2);
      dire({ t: tic, quoi: 'nexus', camp });
      f.duree = tic;
      f.gagnant = camp;
      fini = true;
    }
    // Arrivés à la base sans pouvoir finir : ce qui reste de la poussée va à un autre inhibiteur, dont la ligne est ouverte.
    const autre = aLaBase && LIGNES.find(x => x !== l && s.tombees[x] === 3 && !inhibAbattu(eux, x, t));
    if (autre && unites >= COUT_INHIB * fin) {
      plusTard(0.1, 0.3);
      s.inhib[autre] = tic + INHIB_RETOUR;
      repousses.push([s.inhib[autre], eux, autre]);
      f.equipes[camp].inhib++;
      dire({ t: tic, quoi: 'inhib', camp, ligne: autre });
    }
    return fini;
  };
  /* Les plaques qui tombent d'une tour extérieure, avant 14:00 (le dégât passe de `a` à `b`) : l'or aux joueurs de la ligne. */
  function plaques(camp, l, a, b, t, extra) {
    if (!X.plaque) return;
    const s = S[1 - camp];
    const n = Math.min(s.plaques[l], Math.floor(b * 5 + 1e-9) - Math.floor(a * 5 + 1e-9));
    const ici = DE_LA_LIGNE[l].filter(i => vivant(camp, i));
    for (let k = 0; k < n; k++) {
      plusTard(0.02, 0.1);
      if (tic >= LIGNES_FIN) return;
      s.plaques[l]--;
      f.equipes[camp].plaques++;
      (ici.length ? ici : [JUNGLE]).forEach(i => donner(camp, i, X.plaque / Math.max(1, ici.length)));
      dire({ t: tic, quoi: 'plaque', camp, ligne: l, ...extra });
    }
  }
  /* La ligne de l'autre camp où le moins de tours sont tombées ; à égalité, au hasard. */
  const ligneFermee = camp => {
    const s = S[1 - camp];
    const m = Math.min(...LIGNES.map(l => s.tombees[l]));
    const ls = LIGNES.filter(l => s.tombees[l] === m);
    return ls[Math.floor(de() * ls.length)];
  };
  /* La ligne la plus ouverte de l'autre camp (le plus de structures à terre), pour finir ; à égalité, au hasard. */
  const ligneOuverte = camp => {
    const s = S[1 - camp];
    const score = l => s.tombees[l] + (inhibAbattu(1 - camp, l, tic) ? 1 : 0) + s.degat[l] * 0.5;
    const m = Math.max(...LIGNES.map(score));
    const ls = LIGNES.filter(l => score(l) === m);
    return ls[Math.floor(de() * ls.length)];
  };

  /* ---- LES COMBATS ---- */
  let combats = 0, premierSang = true;
  // Un sort prêt, et le brûler : à l'heure du fil, comme la vie.
  const aSort = (j, s) => { const k = j.fj.sorts.indexOf(s); return k >= 0 && j.pret[k] <= tic ? k : -1; };
  const bruler = (j, k) => { j.pret[k] = tic + SORTS[j.fj.sorts[k]][2](X.annee) / 60; };
  /*
   * UN COMBAT. `genre` (SUITE), `lieu` (une ligne, 'dragon', 'nashor',
   * 'jungle', 'base'), `ici` : [bleu, rouge] → les indices des joueurs dans
   * le coup, en vie ; `ligne` : celle de la phase de lignes, ou null ;
   * `extra` : un avantage du côté bleu (une tour qui défend, un objectif).
   * Rend { k: [éliminations de chaque camp], vainqueur (0, 1 ou null), morts: [camp → nombre] }.
   */
  const combat = (genre, lieu, ici, t, ligne = null, extra = 0) => {
    const id = ++combats;
    const k = [0, 0];
    const dans = [ici[0].slice(), ici[1].slice()];
    // La Téléportation : qui ne s'y trouve pas, en vie et sa Téléportation prête, arrive (le haut, surtout).
    const tpChance = EN_LIGNE.has(genre) ? X.tpLignes : genre === 'pick' || genre === 'duel' ? 0 : 0.5;
    if (tpChance) {
      for (const c of [0, 1]) {
        for (const j of J[c]) {
          if (dans[c].includes(j.i) || !vivant(c, j.i)) continue;
          const s = aSort(j, 'T');
          if (s >= 0 && de() < tpChance) { plusTard(0.02, 0.08); bruler(j, s); dans[c].push(j.i); dire({ t: tic, quoi: 'tp', camp: c, i: j.i, lieu, combat: id }); }
        }
      }
    }
    // La puissance du camp bleu dans un échange : sa ligne ou son combat, ses buffs, l'heure, son or, son côté, ses niveaux.
    const nivMoyen = c => dans[c].reduce((s, i) => s + niv(J[c][i]), 0) / Math.max(1, dans[c].length);
    const ultime = c => dans[c].some(i => niv(J[c][i]) >= 6);
    // Avant 14:00, tout combat se joue aussi à la ligne : le canal `ligne` y pèse, comme dans les duels et les ganks.
    let base = (ligne ? P[0].ligne[ligne] - P[1].ligne[ligne] : P[0].combat - P[1].combat + buffs(0, t) - buffs(1, t) + heure(t) + (t < LIGNES_FIN ? LIGNE_CANAL.combats * (E[0].ligne - E[1].ligne) : 0)) * R.force
      + R.boule * avance() + cote + extra + 0.08 * (nivMoyen(0) - nivMoyen(1));
    if (ligne && t < 9) base += 0.35 * ((ultime(0) ? 1 : 0) - (ultime(1) ? 1 : 0));
    // Les sorts qui pèsent : l'Embrasement prêt dans un combat de ligne ou un pick, la Fatigue prête dans un combat.
    const offensif = c => dans[c].some(i => aSort(J[c][i], EN_LIGNE.has(genre) || genre === 'pick' ? 'I' : 'E') >= 0);
    base += 0.2 * ((offensif(0) ? 1 : 0) - (offensif(1) ? 1 : 0));
    const ancestral = [t < ancestralJusqua[0], t < ancestralJusqua[1]];
    let suite = true;
    for (let n = 0; suite && dans[0].length && dans[1].length; n++) {
      const p0 = sigmoide(base + R.nombre * (dans[0].length - dans[1].length));
      const camp = de() < p0 ? 0 : 1, eux = 1 - camp;
      // La victime : selon ses vraies morts ; un Flash brûlé la rend plus facile à prendre.
      const v = dans[eux][selon(dans[eux].map(i => Math.max(0.05, J[eux][i].p.part.m) * (aSort(J[eux][i], 'F') >= 0 ? 1 : 1.5)), de)];
      const jv = J[eux][v];
      plusTard(0.04, 0.2);
      // S'en tirer : au Flash (ou au Fantôme), puis aux Soins ou à la Barrière ; jamais contre l'exécution de l'ancestral.
      const flash = aSort(jv, 'F'), fantome = aSort(jv, 'G'), sauve = Math.max(aSort(jv, 'H'), aSort(jv, 'B'));
      const fuir = ancestral[camp] ? 0 : FUITE[genre] + (aSort(jv, 'C') >= 0 ? 0.05 : 0);
      if (flash >= 0 && de() < fuir) {
        bruler(jv, flash);
        dire({ t: tic, quoi: 'fuite', camp: eux, i: v, sort: 'F', combat: id });
        dans[eux] = dans[eux].filter(i => i !== v);
      } else if (fantome >= 0 && de() < 0.6 * fuir) {
        bruler(jv, fantome);
        dire({ t: tic, quoi: 'fuite', camp: eux, i: v, sort: 'G', combat: id });
        dans[eux] = dans[eux].filter(i => i !== v);
      } else if (sauve >= 0 && !ancestral[camp] && de() < 0.3) {
        bruler(jv, sauve);
        dire({ t: tic, quoi: 'fuite', camp: eux, i: v, sort: jv.fj.sorts[sauve], combat: id });
      } else {
        // L'élimination : le tueur selon sa vraie part, les aides parmi ceux du coup, les sorts qui y passent.
        const tueur = dans[camp][selon(dans[camp].map(i => Math.max(0.02, J[camp][i].p.part.k)), de)];
        const jt = J[camp][tueur];
        const aides = dans[camp].filter(i => i !== tueur && de() < Math.min(0.95, J[camp][i].p.part.a + R.aide));
        const sorts = [];
        if (flash >= 0 && de() < 0.4) { bruler(jv, flash); sorts.push([eux, v, 'F']); }
        const ign = aSort(jt, 'I');
        if (ign >= 0 && (EN_LIGNE.has(genre) || genre === 'pick' || genre === 'escarmouche') && de() < 0.6) { bruler(jt, ign); sorts.push([camp, tueur, 'I']); }
        const fl = aSort(jt, 'F');
        if (fl >= 0 && de() < 0.18) { bruler(jt, fl); sorts.push([camp, tueur, 'F']); }
        for (const i of aides) {
          const ex = aSort(J[camp][i], 'E');
          if (ex >= 0 && de() < 0.5) { bruler(J[camp][i], ex); sorts.push([camp, i, 'E']); }
        }
        const ult = niv(jt) >= 6 && jt.ult <= t && de() < 0.5;
        if (ult) jt.ult = t + (130 - 4 * niv(jt)) / 60;
        // Les primes : la série de la victime finit (sa prime), le tueur allonge la sienne ; le premier sang.
        const or = prime(jv) + (premierSang ? X.premierSang : 0);
        const pourAides = aides.length ? Math.min(AIDES_MAX, or / 2) : 0;
        donner(camp, tueur, or);
        aides.forEach(i => { donner(camp, i, pourAides / aides.length); J[camp][i].fj.a++; gagnerXp(J[camp][i], (0.6 * xpElim(niv(jv))) / aides.length); });
        gagnerXp(jt, xpElim(niv(jv)));
        const finDeSerie = jv.serie >= 3 ? or : 0;
        jt.serie++; jt.disette = 0;
        jv.serie = 0; jv.disette++;
        const multi = tic - jt.dernier <= (jt.multi >= 4 ? 0.5 : 1 / 6) ? Math.min(5, jt.multi + 1) : 1;
        jt.multi = multi; jt.dernier = tic;
        const attente = reapparition(niv(jv), tic);
        jv.mort = tic + attente;
        k[camp]++;
        f.equipes[camp].k++;
        jt.fj.k++;
        jv.fj.m++;
        dire({
          t: tic, quoi: 'elim', camp, tueur, victime: v, aides, ligne: tic < LIGNES_FIN ? ligne : null, lieu, genre, combat: id,
          sorts, ult, multi: multi >= 2 ? multi : 0, serie: jt.serie, prime: finDeSerie, premier: premierSang, retour: attente,
        });
        premierSang = false;
        dans[eux] = dans[eux].filter(i => i !== v);
      }
      // Le combat continue, ou se défait ; le camp en infériorité de deux s'en va plus souvent.
      const ecart = Math.abs(dans[0].length - dans[1].length);
      suite = de() < SUITE[genre] * (ecart >= 2 ? 0.7 : 1) * (ancestral[0] || ancestral[1] ? 1.1 : 1) * deux('rythme');
    }
    const vainqueur = k[0] > k[1] ? 0 : k[1] > k[0] ? 1 : dans[0].length > dans[1].length ? 0 : dans[1].length > dans[0].length ? 1 : null;
    return { k, vainqueur, survivants: [dans[0].length, dans[1].length] };
  };
  /* Après un combat gagné : le vainqueur pousse, d'autant plus loin que les autres attendent à leur fontaine et que l'heure avance. */
  const apresCombat = (r, l, t) => {
    if (r.vainqueur === null || fini) return;
    const w = r.vainqueur;
    const morts = J[1 - w].filter(j => j.mort > tic + 0.25).length;
    if (!morts) return;
    // La poussée grandit avec l'heure (sur la durée de l'époque) ; la hâte de la fin (`fin`) avance cette heure-là.
    const grandit = Math.min(8, Math.exp(R.fin.pente * ((t * Math.sqrt(deux('fin'))) / D - 1) + R.fin.avance * Math.max(0, (w ? -1 : 1) * avance())));
    // Les canaux : le siège pousse plus loin, la hâte de la fin aussi ; la pression de côté (`split`) du vainqueur ; un rythme vif
    // fait plus de combats, chacun pousse un peu moins (la partie garde ses tours).
    const canaux = (deux('siege') * Math.sqrt(deux('fin')) * Math.max(0.2, 1 + 0.12 * E[w].split)) / deux('rythme');
    const unites = R.pousse * canaux * morts * grandit * (t < nashorJusqua[w] ? NASHOR_POUSSE : 1) * (0.6 + 0.8 * de());
    plusTard(0.2, 0.5);
    // Où pousser : la ligne du combat ; sinon, tant que la partie n'est pas mûre, la tour la plus avancée qui tient encore
    // (les tours extérieures d'abord), et pour finir, la ligne la plus ouverte.
    const mure = unites >= 2 || t >= 0.85 * D || t < nashorJusqua[w];
    pousser(w, unites, l || (mure ? ligneOuverte(w) : ligneFermee(w)), t, t < LIGNES_FIN ? 'ligne' : 'base');
  };

  /* ---- LES MONSTRES ---- */
  // Les débits d'objectif : de quoi retomber, sur une partie de la durée de l'époque, sur le nombre mesuré (par minute où il est là).
  const debit = (n, premier, retour, repli, rythme) => {
    if (n === null || n === undefined) return repli;
    const attente = (D - premier + retour) / Math.max(0.3, n) - retour;
    return rythme / Math.max(0.35, attente);
  };
  const M = {
    dragon: { prochain: X.dragon.premier, debit: debit(T.dragons === null ? null : 2 * T.dragons, X.dragon.premier, X.dragon.retour, 0.45, R.obj.rythme) },
    nashor: { prochain: X.nashor.premier, debit: debit(T.barons === null ? null : 2 * T.barons, X.nashor.premier, X.nashor.retour, 0.2, R.obj.rythmeNashor) },
    heraut: X.heraut && { prochain: X.heraut.premier, restants: X.heraut.n, debit: 0 },
    larves: X.larves && { prochain: X.larves.premier, restants: X.larves.vagues },
    atakhan: X.atakhan && { prochain: X.atakhan },
    ancestral: null,
  };
  if (M.heraut) {
    // Chaque héraut est pris avec la chance mesurée (les hérauts par partie sur ceux qui apparaissent) avant de partir.
    const q = T.herauts === null ? 0.7 : Math.min(0.97, (2 * T.herauts) / X.heraut.n);
    M.heraut.debit = -Math.log(1 - q) / Math.min(6, X.heraut.fin - X.heraut.premier);
  }
  const larvesParVague = T.larves === null ? 0.9 : Math.min(0.97, (2 * T.larves) / (3 * X.larves?.vagues || 1));
  let dragonsPris = 0, typeDuTerrain = null, dernierType = null, chargeHeraut = null;
  const tirerType = () => {
    if (!X.types) return null;
    // Avant la V9.23, au hasard ; depuis, le deuxième autre que le premier, puis celui du terrain (le troisième) jusqu'à l'âme.
    if (typeDuTerrain) return typeDuTerrain;
    const libres = X.ame ? X.types.filter(x => x !== dernierType) : X.types;
    return libres[Math.floor(de() * libres.length)];
  };
  M.dragon.type = tirerType();
  /*
   * UN OBJECTIF SE JOUE : le camp qui a la priorité (ses objectifs, sa
   * priorité de stratégie, son or, son nombre) y va ; l'autre le dispute ou
   * le cède. Disputé, c'est une bataille ; son vainqueur le prend, à moins
   * que le jungler de l'autre le vole au Châtiment. Rend le camp qui l'a pris.
   */
  // La priorité sur un objectif : tôt, celle des lignes qui l'entourent (le bas pour le dragon, le haut et le milieu pour le héraut et les larves) ; ensuite, les objectifs.
  const priorite = (c, quoi, t) => (t >= LIGNES_FIN || quoi === 'nashor' || quoi === 'atakhan' || quoi === 'ancestral' ? P[c].objectifs
    : quoi === 'dragon' ? (P[c].objectifs + P[c].ligne.bas) / 2 : (P[c].ligne.haut + P[c].ligne.milieu) / 2 + P[c].objectifs - P[c].combat);
  const jouerObjectif = (quoi, canal, qui, importance, t) => {
    const vv = [vivants(0).length, vivants(1).length];
    // Le héraut et les larves, tôt, se jouent plus à la ligne qu'à la force : la moitié du poids.
    const poids = quoi === 'heraut' || quoi === 'larves' ? 0.5 : 1;
    const prio = de() < sigmoide(poids * R.force * (priorite(0, quoi, t) - priorite(1, quoi, t)) + R.force * (E[0][canal] - E[1][canal] + buffs(0, t) - buffs(1, t))
      + R.boule * R.obj.boule * avance() + 0.5 * R.nombre * (vv[0] - vv[1]) + cote) ? 0 : 1;
    const autre = 1 - prio;
    // Le disputer, ou le céder : plus souvent dans une partie au rythme vif (le canal `rythme`).
    const dispute = sigmoide(R.obj.dispute + importance - 0.7 * Math.max(0, vv[prio] - vv[autre]) - 0.15 * Math.abs(avance()) + 2 * Math.log(deux('rythme')));
    if (!vv[autre] || de() >= dispute) return { camp: prio, r: null };
    const ici = [0, 1].map(c => J[c].filter(j => j.mort <= tic && (qui === null || qui.includes(j.i))).map(j => j.i));
    // La bataille : le camp qui a priorisé cet objectif (son canal, ses objectifs) l'a préparée — la vision, la place.
    const prepare = (R.force * (E[0][canal] - E[1][canal] + E[0].objectifs - E[1].objectifs)) / 2;
    const r = combat('bataille', quoi === 'dragon' || quoi === 'ancestral' ? 'dragon' : 'nashor', ici, t, null, prepare);
    const gagne = r.vainqueur === null ? prio : r.vainqueur;
    // Le vol : le jungler de l'autre, encore en vie, son Châtiment sur le monstre.
    const vol = vivant(1 - gagne, JUNGLE) && de() < R.obj.vol;
    return { camp: vol ? 1 - gagne : gagne, r, vol };
  };
  const QUI = { dragon: [JUNGLE, MILIEU, BAS, SOUTIEN], heraut: [HAUT, JUNGLE, MILIEU, SOUTIEN], larves: [HAUT, JUNGLE, MILIEU] };
  const monstres = t => {
    // Avant la V9.23, passé 35:00, seul l'ancestral vient à la fosse.
    if (X.ancestral && X.ancestral.apres !== null && M.dragon && t >= X.ancestral.apres) {
      M.ancestral = { prochain: Math.max(X.ancestral.apres, M.dragon.prochain) };
      M.dragon = null;
    }
    // Le dragon, ou l'ancestral.
    const anc = M.ancestral;
    if (anc && t >= anc.prochain && de() < 1.4 * PAS) {
      const o = jouerObjectif('ancestral', 'dragons', null, 1.2, t);
      if (!fini) {
        plusTard(0.05, 0.2);
        f.equipes[o.camp].dragons++; f.equipes[o.camp].ancestraux++;
        ancestralJusqua[o.camp] = tic + 2.5;
        anc.prochain = tic + X.ancestral.retour;
        dire({ t: tic, quoi: 'dragon', camp: o.camp, type: 'ancestral', ancestral: true, vol: !!o.vol });
        if (o.r) apresCombat(o.r, 'milieu', t);
      }
    } else if (M.dragon && t >= M.dragon.prochain && de() < M.dragon.debit * PAS * (Math.max(...dragonsDe) === 3 && X.ame ? 1.5 : 1)) {
      const importance = X.ame && Math.max(...dragonsDe) === 3 ? 1 : t < 10 ? -0.5 : 0;
      const o = jouerObjectif('dragon', 'dragons', t < 14 ? QUI.dragon : null, importance, t);
      if (!fini) {
        plusTard(0.05, 0.2);
        const c = o.camp;
        f.equipes[c].dragons++; dragonsDe[c]++; dragonsPris++;
        const type = M.dragon.type;
        const ev = dire({ t: tic, quoi: 'dragon', camp: c, type, vol: !!o.vol });
        if (X.ame) {
          if (dragonsDe[c] === 4) {
            f.equipes[c].ame = type || 'dragon';
            ev.ame = type;
            M.dragon = null;           // l'âme prise, l'ancestral vient
            M.ancestral = { prochain: tic + X.ancestral.retour };
          }
        }
        if (M.dragon) {
          dernierType = type;
          M.dragon.type = tirerType();
          M.dragon.prochain = tic + X.dragon.retour;
          // Le deuxième dragon pris, la Faille se transforme : le troisième dit le terrain, et les suivants le gardent jusqu'à l'âme.
          if (X.ame && dragonsPris === 2) { typeDuTerrain = M.dragon.type; ev.terrain = typeDuTerrain; }
        }
        if (o.r) apresCombat(o.r, 'bas', t);
      }
    }
    if (fini) return;
    // Le Nashor : plus pressant à mesure que la partie avance.
    if (t >= M.nashor.prochain && de() < M.nashor.debit * PAS) {
      const o = jouerObjectif('nashor', 'nashor', null, 0.6, t);
      if (!fini) {
        plusTard(0.05, 0.2);
        f.equipes[o.camp].barons++;
        partager(o.camp, PRIME_NASHOR * 5);
        nashorJusqua[o.camp] = tic + X.nashor.buff;
        M.nashor.prochain = tic + X.nashor.retour;
        dire({ t: tic, quoi: 'nashor', camp: o.camp, vol: !!o.vol });
        // Le buff du Nashor : on pousse, avec ou sans combat.
        const vainqueur = o.r ? o.r : { vainqueur: o.camp, k: [0, 0] };
        if (o.r) apresCombat(vainqueur, 'haut', t);
        else pousser(o.camp, R.pousse * deux('siege') * 1.2, ligneOuverte(o.camp), t);
      }
    }
    if (fini) return;
    // Le héraut : pris, il charge une tour une ou deux minutes plus tard.
    const h = M.heraut;
    if (h && h.restants && t >= h.prochain && t < X.heraut.fin && de() < h.debit * PAS) {
      const o = jouerObjectif('heraut', 'heraut', QUI.heraut, -0.9, t);
      if (!fini) {
        plusTard(0.05, 0.2);
        f.equipes[o.camp].herauts++;
        h.restants--;
        h.prochain = tic + X.heraut.retour;
        dire({ t: tic, quoi: 'heraut', camp: o.camp, vol: !!o.vol });
        chargeHeraut = { camp: o.camp, t: tic + 0.5 + 2 * de(), ligne: de() < 0.6 ? 'milieu' : 'haut' };
        if (o.r) apresCombat(o.r, 'haut', t);
      }
    }
    if (fini) return;
    // Les larves du Néant : une vague de trois, prise d'un coup.
    const lv = M.larves;
    if (lv && lv.restants && t >= lv.prochain && t < X.larves.fin && de() < 1.2 * PAS) {
      lv.restants--;
      lv.prochain = t + X.larves.retour;
      if (de() < larvesParVague) {
        const o = jouerObjectif('larves', 'heraut', QUI.larves, -0.6, t);
        if (!fini) {
          plusTard(0.05, 0.2);
          f.equipes[o.camp].larves += 3;
          dire({ t: tic, quoi: 'larves', camp: o.camp, n: 3 });
        }
      }
    }
    if (fini) return;
    // Atakhan (2025) : une fois, de son apparition à sa prise.
    const at = M.atakhan;
    if (at && t >= at.prochain && de() < 0.5 * PAS) {
      M.atakhan = null;
      const o = jouerObjectif('atakhan', 'objectifs', null, 0.2, t);
      if (!fini) {
        plusTard(0.05, 0.2);
        f.equipes[o.camp].atakhan++;
        dire({ t: tic, quoi: 'atakhan', camp: o.camp });
        if (o.r) apresCombat(o.r, 'milieu', t);
      }
    }
  };

  /* ---- LES POUVOIRS DU COACH, au début de chaque phase (js/rogue.js) ---- */
  const etat = (camp, phase) => {
    const nous = f.equipes[camp], eux = f.equipes[1 - camp];
    return { phase, bleu: camp === 0, avance: nous.or - eux.or, tours: nous.tours - eux.tours, dragons: nous.dragons - eux.dragons, k: nous.k - eux.k };
  };
  const poser = (t, phase) => {
    eqs.forEach((e, camp) => {
      const actifs = (e.pouvoirs || []).filter(x => x.phase === phase && x.quand(etat(camp, phase)));
      for (const x of actifs) f.pouvoirs.push({ t, camp, id: x.id });
      E[camp] = doser(sommerEffets([e.effets, effets[camp], ...actifs.map(x => x.effet)]));
      P[camp] = puissancesV2(e, E[camp]);
    });
  };

  /* ---- LE REVENU : la ferme de chacun (s'il est en vie), l'or passif de tous ; l'or de l'époque moins ce que les primes en donnent ---- */
  const primesAttendues = T.k * (PRIME + AIDES_MAX) * 1.08 + (T.tours || 4) * 600 + (T.barons || 0) * PRIME_NASHOR * 5 + (X.plaque ? 4 * X.plaque : 0);
  const revenu = T.or === null ? 0 : Math.max(0, T.or - primesAttendues) / D;     // par équipe et par minute
  const partsOr = eqs.map(e => { const p = ROLES.map(r => e.cinq[r].part.or), s = p.reduce((a, b) => a + b, 0); return s > 0 ? p.map(x => x / s) : p.map(() => 0.2); });
  const PASSIF = 0.3, MORTS = 1.06;   // la part passive du revenu (l'or qui tombe toutes les 10 s), et la ferme qu'un mort ne fait pas, rendue aux vivants en moyenne

  let K = 0, pousse = 0;   // les débits du tour, refaits quand un pouvoir change les canaux
  for (let t = PAS; ; t += PAS) {
    tic = Math.max(tic, t - PAS);
    de = hasard(graineDe(graine, t / PAS));
    if (avecPouvoirs && (t === PAS || t === LIGNES_FIN || t === MILIEU_FIN)) poser(t, t === PAS ? 'lignes' : t === LIGNES_FIN ? 'milieu' : 'tardif');
    // Les inhibiteurs qui repoussent (celui qu'on a refait tomber entre-temps attend sa nouvelle heure).
    while (repousses.length && repousses[0][0] <= t) {
      const [quand, c, l] = repousses.shift();
      if (S[c].inhib[l] !== quand) continue;
      tic = Math.max(tic, quand);
      dire({ t: tic, quoi: 'repousse', camp: c, ligne: l });
    }
    // Le revenu, l'expérience et les sbires de chacun.
    const mene = Math.tanh(avance() / 5);
    for (let c = 0; c < 2; c++) {
      // La ferme : l'écart de ligne de chacun, et la carte au camp qui mène.
      const gain = revenu * PAS * Math.max(0, 1 + R.ferme * (P[c].ferme - P[1 - c].ferme) + R.emprise * 5 * (c ? -mene : mene));
      const eq = f.equipes[c];
      for (let i = 0; i < 5; i++) {
        const j = J[c][i];
        const enVie = j.mort <= t;
        const or = gain * (PASSIF / 5 + (enVie ? (1 - PASSIF) * MORTS * partsOr[c][i] : 0));
        j.fj.or += or;
        eq.or += or;
        if (enVie && t > 1) {
          gagnerXp(j, XP_MINUTE[i] * PAS);
          j.fj.cs += j.cs * PAS;
          j.fj.vision += j.vision * PAS;
        }
      }
    }
    // Les jeux du tour : la phase de lignes, puis les escarmouches et les combats ; le débit suit les éliminations de l'époque.
    if (t === PAS || (avecPouvoirs && (t === LIGNES_FIN || t === MILIEU_FIN))) { K = deux('rythme') * R.rythme * (2 * T.k) / D * PAS; pousse = R.tours * deux('siege') * PAS; }
    if (t >= SBIRES && t < LIGNES_FIN) {
      // Les duels viennent avec les niveaux : rares avant 3:00, pleins au niveau 6.
      const mur = Math.min(1, Math.max(0, (t - 2) / 4));
      for (const l of LIGNES) {
        if (de() < JEUX.duel * mur * K) jeuDeLigne('duel', l, t);
        else if (t >= 2.5 && de() < JEUX.gank * K) jeuDeLigne('gank', l, t);
        else if (t >= 6 && de() < JEUX.plongee * K) jeuDeLigne('plongee', l, t);
        if (fini) break;
        // La pression d'une ligne sur la tour d'en face : les plaques, une à une.
        if (de() < PRESSION.lignes * pousse) pression(l, t, 0.2);
      }
      if (!fini && t >= 3 && de() < JEUX.invasion * K) escarmouche(t, [JUNGLE, MILIEU, SOUTIEN], 'jungle');
    } else if (t >= LIGNES_FIN) {
      if (de() < JEUX.pick * K) pick(t);
      else if (de() < JEUX.escarmouche * K) escarmouche(t, null, null);
      else if (de() < JEUX.combat * K) combatDEquipe(t);
      // La poussée de côté : le haut (ou le bas) sur sa ligne ; les super-sbires d'un inhibiteur à terre.
      if (!fini && de() < PRESSION.cote * pousse) pression('haut', t, 0.35, true);
      if (!fini && de() < PRESSION.cote * pousse) pression('bas', t, 0.35, true);
      if (repousses.length) for (const [, c, l] of repousses) if (!fini && inhibAbattu(c, l, t) && de() < SUPER_SBIRES * PAS) pousser(1 - c, 0.25, l, t, 'base', { sbires: true });
      if (t >= DUREE_MAX && !fini) {
        const r = combat('assaut', 'base', [vivants(0).map(j => j.i), vivants(1).map(j => j.i)], t);
        const w = r.vainqueur ?? (de() < 0.5 ? 0 : 1);
        pousser(w, Infinity, ligneOuverte(w), t);
      }
    }
    if (!fini && chargeHeraut && t >= chargeHeraut.t) {
      const { camp, ligne } = chargeHeraut;
      chargeHeraut = null;
      tic = Math.max(tic, t - PAS / 2);
      pousser(camp, R.obj.heraut, ligne, t, 'ligne', { heraut: true });
    }
    if (!fini) monstres(t);
    // Les plaques tombent à 14:00 : ce qui reste d'une tour extérieure reste.
    if (t % 1 === 0) {
      f.courbe.push(Math.round(f.equipes[0].or - f.equipes[1].or));
      f.orJoueurs.push(f.equipes.map(e => e.joueurs.map(j => Math.round(j.or))));
      f.niveaux.push(J.map(eq => eq.map(niv)));
      f.sbires.push(f.equipes.map(e => e.joueurs.map(j => Math.floor(j.cs))));
    }
    if (fini) break;
  }
  for (const eq of J) for (const j of eq) { j.fj.niv = niv(j); j.fj.cs = Math.floor(j.fj.cs); j.fj.vision = Math.round(j.fj.vision); }
  return f;

  /* ---- LES JEUX : chacun forme son combat, ou sa pression, et le joue ---- */
  // La ligne d'un camp : ceux de la ligne, en vie.
  function laners(c, l) { return DE_LA_LIGNE[l].filter(i => vivant(c, i)); }
  function jeuDeLigne(genre, l, t) {
    const ici = [laners(0, l), laners(1, l)];
    let extra = 0;
    if (genre === 'gank' || genre === 'plongee') {
      // Le jungler qui vient : celui dont la ligne a la priorité, souvent ; l'autre jungler répond parfois.
      const c = de() < sigmoide(2 * R.force * (P[0].ligne[l] - P[1].ligne[l]) + cote) ? 0 : 1;
      if (!vivant(c, JUNGLE)) return;
      ici[c].push(JUNGLE);
      if (genre === 'plongee') {
        if (vivant(c, MILIEU) && l !== 'milieu' && de() < 0.5) ici[c].push(MILIEU);
        extra = c === 0 ? -0.6 : 0.6;   // la tour défend
      }
      if (vivant(1 - c, JUNGLE) && de() < 0.25) ici[1 - c].push(JUNGLE);
    }
    if (!ici[0].length || !ici[1].length) return;
    const r = combat(genre, l, ici, t, l, extra);
    // Une élimination en ligne : le camp qui l'a eue prend une plaque, souvent.
    if (r.vainqueur !== null && r.k[r.vainqueur] && de() < 0.55) { plusTard(0.1, 0.4); pousser(r.vainqueur, 0.2 * (1 + r.k[r.vainqueur]), l, t, 'ligne'); }
    else apresCombat(r, l, t);
  }
  function pression(l, t, unites, cote_ = false) {
    // Qui pousse : la ligne la plus forte (en phase de lignes), sinon le haut et la pression de côté (`split`), et l'or.
    const r = cote_ ? (l === 'haut' ? HAUT : BAS) : null;
    // Le canal `split` pèse aussi sur la pression des lignes : une équipe qui pousse ses vagues prend les plaques.
    const ecart = cote_ ? ((J[0][r].p.sous.pression || 0) - (J[1][r].p.sous.pression || 0)) / 2 + (P[0].ligne[l] - P[1].ligne[l]) / 2 + E[0].split - E[1].split
      : P[0].ligne[l] - P[1].ligne[l] + LIGNE_CANAL.pression * (E[0].ligne - E[1].ligne) + (E[0].split - E[1].split) / 2;
    // En phase de lignes, la ligne la plus forte ; ensuite, le camp qui mène tient les lignes de côté (la carte à lui).
    const c = de() < sigmoide(R.force * ecart + R.boule * (cote_ ? R.obj.boule : 0.5) * avance() + cote) ? 0 : 1;
    if (cote_ && !vivant(c, r)) return;
    plusTard(0.05, 0.3);
    pousser(c, unites, l, t, 'ligne', cote_ ? { cote: true } : {});
  }
  function escarmouche(t, qui, lieu) {
    const ici = [0, 1].map(c => J[c].filter(j => j.mort <= tic && (qui ? qui.includes(j.i) : de() < 0.75)).map(j => j.i));
    if (!ici[0].length || !ici[1].length) return;
    const r = combat('escarmouche', lieu || 'jungle', ici, t);
    apresCombat(r, null, t);
  }
  function pick(t) {
    // Quelqu'un se fait prendre seul : deux ou trois de l'autre camp sur lui.
    const c = de() < 0.5 ? 0 : 1;
    const proies = vivants(c);
    const chasseurs = vivants(1 - c);
    if (!proies.length || chasseurs.length < 2) return;
    const proie = proies[selon(proies.map(j => j.p.part.m * (aSort(j, 'F') >= 0 ? 1 : 1.6)), de)].i;
    const n = 2 + Math.floor(de() * 3);
    const ici = [];
    ici[c] = [proie];
    ici[1 - c] = chasseurs.sort((a, b) => b.p.part.k - a.p.part.k).slice(0, n).map(j => j.i);
    const r = combat('pick', 'jungle', ici, t);
    apresCombat(r, null, t);
  }
  function combatDEquipe(t) {
    const ici = [vivants(0).map(j => j.i), vivants(1).map(j => j.i)];
    if (ici[0].length < 3 || ici[1].length < 3) return;
    const r = combat('combat', 'milieu', ici, t);
    apresCombat(r, 'milieu', t);
  }
}
