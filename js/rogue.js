/*
 * LE ROGUE (repris de Cap 82-0) : les jetons, la boutique, les packs, les
 * cartes de plan de jeu, le coach. Tout passe par les canaux du moteur
 * (js/sim.js) et chaque carte, chaque coach, est mesuré EN PAIRES
 * (check_rogue) : la même ligue jouée deux fois sous la même graine, la carte
 * donnée à la moitié des équipes puis à l'autre.
 *
 *   les jetons   jamais gardés : recomptés des résultats et des achats (jetonsDe) ;
 *   les packs    tirés du dé de la ligue et du numéro de l'achat : une même
 *                partie ouvre les mêmes packs ; une carte ne se tire qu'une fois ;
 *   le plan      trois cartes actives au plus, changées entre deux journées ;
 *   le coach     un seul en poste ; sa confiance monte à chaque série jouée avec
 *                une carte de sa couleur au plan, et la couleur d'une carte se
 *                lit sur ses canaux (couleurDe), jamais à la main.
 *
 * Une carte change la FORME de la partie (la durée, les éliminations, les
 * tours) plus que sa force : check_rogue borne ce qu'elle rapporte en
 * victoires selon sa rareté, et une rare doit se voir sur la feuille.
 */
import { hasard, graineDe } from './hasard.js';
import { sommerEffets } from './sim.js';

export const JETONS = { depart: 20, victoire: 4, defaite: 1, ronde: 20 };
export const PLAN = 3;
const HAUSSE = 0.1;            // chaque pack acheté hausse le suivant de 10 %
export const PRIX_COACH = 12;
const SEUILS = [3, 6, 9];      // les séries jouées avec sa couleur : confiance I, II, III
export const RARETES = { commune: 'Commune', peu: 'Peu commune', rare: 'Rare', legendaire: 'Légendaire' };

/* LES CARTES : [icône, nom, rareté, effets sur les canaux]. */
export const CARTES = {
  invasion: ['🐺', 'Invasion au niveau 1', 'commune', { rythme: 1.1, ligne: 0.04 }],
  pousser: ['🌊', 'Pousser les lignes', 'commune', { siege: 1.12 }],
  vision: ['👁️', 'Contrôle de la vision', 'commune', { objectifs: 0.1, rythme: 0.95 }],
  patience: ['⏳', 'Jouer pour le tardif', 'commune', { tardif: 0.2, fin: 0.92 }],
  echange: ['🔁', 'Échange de lignes', 'commune', { siege: 1.1, ligne: -0.03, fin: 1.04 }],
  ame: ['🐉', 'Âme de dragon', 'peu', { objectifs: 0.16, rythme: 0.93 }],
  plongee: ['🗡️', 'Plongée sous la tour', 'peu', { rythme: 1.18, ligne: 0.06, combat: -0.04 }],
  cotes: ['⚔️', 'Le 1-3-1', 'peu', { siege: 1.22, fin: 1.08, combat: -0.04 }],
  cinq: ['💥', 'Combats à cinq', 'peu', { rythme: 1.15, combat: 0.04, ligne: -0.06 }],
  protege: ['💎', 'Protéger le tireur', 'peu', { tardif: 0.32, fin: 0.88, ligne: -0.05 }],
  heraut: ['🦀', 'Le héraut au milieu', 'rare', { objectifs: 0.15, siege: 1.35, fin: 1.12 }],
  nashor: ['🟣', 'Le coup de Nashor', 'rare', { objectifs: 0.3, rythme: 0.78, fin: 1.2 }],
  escarmouche: ['⚡', 'Escarmouches au niveau 3', 'rare', { rythme: 1.3, ligne: 0.1, fin: 1.08 }],
  meta: ['🏆', 'La méta du tournoi', 'legendaire', { ligne: 0.15, combat: 0.1, objectifs: 0.15, rythme: 1.2 }],
  quatreun: ['🌀', 'Le 4-1', 'legendaire', { siege: 1.32, fin: 1.2, combat: 0.05 }],
};

/* LES PACKS : prix, cartes, chances de chaque rareté (sur 100). */
export const PACKS = {
  bronze: { nom: 'Pack bronze', prix: 10, n: 2, cotes: { commune: 80, peu: 18, rare: 2, legendaire: 0 } },
  argent: { nom: 'Pack argent', prix: 18, n: 3, cotes: { commune: 60, peu: 30, rare: 9, legendaire: 1 } },
  or: { nom: 'Pack or', prix: 30, n: 3, cotes: { commune: 35, peu: 40, rare: 20, legendaire: 5 } },
};

/*
 * LES COACHS : leur signature sur les canaux (d'où la couleur des cartes) et
 * leurs trois paliers de confiance, des effets comme les autres.
 */
export const COACHS = {
  agresseur: { ico: '🐺', nom: 'L\'agresseur', signe: { rythme: 1, ligne: 0.5 },
    paliers: [{ rythme: 1.08, ligne: 0.03 }, { rythme: 1.16, ligne: 0.06 }, { rythme: 1.25, ligne: 0.1, fin: 1.05 }] },
  stratege: { ico: '🐉', nom: 'Le stratège', signe: { objectifs: 1 },
    paliers: [{ objectifs: 0.1, rythme: 0.93 }, { objectifs: 0.2, rythme: 0.86 }, { objectifs: 0.3, rythme: 0.8 }] },
  patient: { ico: '⏳', nom: 'Le patient', signe: { tardif: 1, fin: -0.5 },
    paliers: [{ tardif: 0.12, fin: 0.9, rythme: 0.94 }, { tardif: 0.24, fin: 0.8, rythme: 0.88 }, { tardif: 0.35, fin: 0.7, rythme: 0.82 }] },
  assiegeant: { ico: '🏰', nom: 'L\'assiégeant', signe: { siege: 1, fin: 0.5 },
    paliers: [{ siege: 1.12 }, { siege: 1.23, fin: 1.04 }, { siege: 1.35, fin: 1.08 }] },
};

/* L'ampleur d'un canal : ce qui compte pour « un » dans la couleur d'une carte. Les multiplicatifs se lisent en logarithme. */
const AMPLEUR = { ligne: 0.1, combat: 0.06, objectifs: 0.1, tardif: 0.2, rythme: 0.1, siege: 0.1, fin: 0.1 };
const MULTIPLIE = new Set(['rythme', 'siege', 'fin']);
const lu = (c, v) => (MULTIPLIE.has(c) ? Math.log(v) : v) / AMPLEUR[c];

/** Le coach d'une carte, lu sur ses canaux ; null si elle est neutre (rien ne domine assez). */
export function couleurDe(id) {
  const eff = CARTES[id][3];
  const scores = Object.entries(COACHS).map(([k, co]) => {
    const n = Math.sqrt(Object.values(co.signe).reduce((s, p) => s + p * p, 0));
    return [k, Object.entries(co.signe).reduce((s, [c, p]) => s + p * (c in eff ? lu(c, eff[c]) : 0), 0) / n];
  }).sort((a, b) => b[1] - a[1]);
  return scores[0][1] >= 0.7 && scores[1][1] < 0.8 * scores[0][1] ? scores[0][0] : null;
}

/*
 * L'ÉTAT D'UNE PARTIE DE ROGUE : des décisions, rien de compté. `joue` garde,
 * pour chacune de tes séries, le plan et le coach qui l'ont jouée.
 */
export const nouveauRogue = graine => ({ graine, achats: [], cartes: [], plan: [], coach: null, joue: [] });

/** Tes séries (équipe 0) jouées dans la ligue : saison et séries. */
const tesSeries = L => [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].filter(s => s.gagnant !== null && (s.a === 0 || s.b === 0));

/** Les jetons : le départ, tes séries gagnées et perdues, tes rondes de séries gagnées, moins tes achats. */
export function jetonsDe(L, R) {
  const tes = L ? tesSeries(L) : [];
  const v = tes.filter(s => s.gagnant === 0).length;
  const rondes = L && L.series ? L.series.rondes.flat().filter(s => s.gagnant === 0).length : 0;
  return JETONS.depart + v * JETONS.victoire + (tes.length - v) * JETONS.defaite + rondes * JETONS.ronde - R.achats.reduce((s, a) => s + a.prix, 0);
}

const packsAchetes = R => R.achats.filter(a => a.quoi === 'pack').length;
/** Le prix d'un pack, haussé par ceux déjà achetés. */
export const prixDuPack = (R, id) => Math.round(PACKS[id].prix * (1 + HAUSSE * packsAchetes(R)));

/** « 1 pack sur N » pour chaque rareté qu'un pack peut donner, au moins une fois. */
export function chances(id) {
  const P = PACKS[id];
  return Object.entries(P.cotes).filter(([, p]) => p > 0).map(([r, p]) => [r, Math.max(1, Math.round(1 / (1 - (1 - p / 100) ** P.n)))]);
}

/** Achète et ouvre un pack : les cartes tirées (jamais une carte déjà à toi), ou null s'il manque des jetons. */
export function ouvrirPack(L, R, id) {
  const prix = prixDuPack(R, id);
  if (jetonsDe(L, R) < prix) return null;
  const de = hasard(graineDe(R.graine, `pack-${packsAchetes(R)}`));
  R.achats.push({ quoi: 'pack', id, prix });
  const ordre = Object.keys(RARETES);
  const tirees = [];
  for (let i = 0; i < PACKS[id].n; i++) {
    let x = de() * 100;
    let r = ordre.find(k => (x -= PACKS[id].cotes[k]) < 0) || 'commune';
    // Une rareté épuisée descend d'un cran, puis remonte s'il le faut.
    const libres = k => Object.keys(CARTES).filter(c => CARTES[c][2] === k && !R.cartes.includes(c) && !tirees.includes(c));
    const essais = [...ordre.slice(0, ordre.indexOf(r) + 1).reverse(), ...ordre.slice(ordre.indexOf(r) + 1)];
    r = essais.find(k => libres(k).length);
    if (!r) break;
    const l = libres(r);
    tirees.push(l[Math.floor(de() * l.length)]);
  }
  R.cartes.push(...tirees);
  return tirees;
}

/** Met une carte au plan ou l'en retire ; faux si le plan est plein. */
export function basculer(R, id) {
  if (R.plan.includes(id)) { R.plan = R.plan.filter(c => c !== id); return true; }
  if (R.plan.length >= PLAN || !R.cartes.includes(id)) return false;
  R.plan.push(id);
  return true;
}

/** Engage un coach (un seul en poste : le nouveau repart de zéro). Faux s'il manque des jetons. */
export function engager(L, R, id) {
  if ((R.coach && R.coach.id === id) || jetonsDe(L, R) < PRIX_COACH) return false;
  R.achats.push({ quoi: 'coach', id, prix: PRIX_COACH });
  R.coach = { id, depuis: R.joue.length };
  return true;
}

/** La confiance du coach : les séries jouées depuis son arrivée avec une carte de sa couleur au plan. Et son palier (0 à 3). */
export function confiance(R) {
  if (!R.coach) return { series: 0, palier: 0 };
  const series = R.joue.slice(R.coach.depuis).filter(x => x.plan.some(c => couleurDe(c) === R.coach.id)).length;
  return { series, palier: SEUILS.filter(s => series >= s).length, prochain: SEUILS.find(s => series < s) || null };
}

/** Les effets de ton cinq : les cartes du plan et le palier du coach, sommés par le moteur. */
export function effetsDeToi(R) {
  const { palier } = confiance(R);
  return sommerEffets([...R.plan.map(c => CARTES[c][3]), palier ? COACHS[R.coach.id].paliers[palier - 1] : null]);
}

/** Note les séries que ton cinq vient de jouer, avec le plan qui les a jouées. */
export function noterJoue(R, n) {
  for (let i = 0; i < n; i++) R.joue.push({ plan: [...R.plan] });
}

/*
 * CE QU'UN EFFET FAIT, en mots : la direction de chaque canal, jamais un
 * chiffre caché. Les mêmes mots pour une carte, un palier de coach, un repêchage.
 */
const MOTS = {
  ligne: ['la phase de lignes'], combat: ['les combats'], objectifs: ['les objectifs neutres'],
  tardif: ['plus fort tard, plus faible tôt', 'plus fort tôt, plus faible tard'],
  rythme: ['plus d\'éliminations', 'moins d\'éliminations'], siege: ['les tours tombent plus vite', 'les tours tiennent plus longtemps'],
  fin: ['on ferme plus tôt', 'des parties plus longues'],
};
export function dire(eff, seuil = 0.15) {
  return Object.entries(MOTS).filter(([c]) => c in eff && Math.abs(lu(c, eff[c])) >= seuil).map(([c, [plus, moins]]) => {
    const haut = lu(c, eff[c]) > 0;
    return moins ? (haut ? plus : moins) : `${haut ? '▲' : '▼'} ${plus}`;
  });
}
