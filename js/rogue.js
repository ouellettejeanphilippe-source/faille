/*
 * LE ROGUE (repris de Cap 82-0) : les jetons, la boutique, les packs, les
 * cartes de plan de jeu, le coach. Tout passe par les canaux du moteur
 * (js/sim.js) et chaque carte, chaque coach, est mesuré EN PAIRES
 * (check_rogue) : la même ligue jouée deux fois sous la même graine, la carte
 * donnée à la moitié des équipes puis à l'autre.
 *
 *   les jetons   jamais gardés : recomptés des résultats, des primes et des
 *                achats (jetonsDe), sur toute la run (les splits finis dans
 *                `reports`, comptés de leurs résultats par gainsDe) ;
 *   les packs    tirés du dé de la ligue et du numéro de l'achat : une même
 *                partie ouvre les mêmes packs ; une carte ne se tire qu'une fois ;
 *   le plan      trois cartes actives au plus, changées entre deux journées ;
 *   le coach     un seul en poste, un personnage (Cap 82-0, V21) ; sa confiance
 *                monte à chaque série jouée avec une carte de sa couleur au plan
 *                (la couleur d'une carte se lit sur ses canaux, couleurDe), et
 *                chaque palier ouvre un de ses trois POUVOIRS : chacun lit la
 *                partie au début d'une phase (lignes, milieu, fin) et la frappe
 *                le temps de la phase, quand sa condition tient (js/sim.js).
 *
 * Une carte change la FORME de la partie (la durée, les éliminations, les
 * tours) plus que sa force : check_rogue borne ce qu'elle rapporte en
 * victoires selon sa rareté, et une rare doit se voir sur la feuille.
 */
import { hasard, graineDe } from './hasard.js';
import { sommerEffets } from './sim.js';
import { gainsDe, OBJECTIF, ELAN } from './gestion.js';

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
 * leurs trois pouvoirs, un par palier de confiance (I, II, III). Un pouvoir :
 * [id, nom, phase ('lignes', 'milieu', 'tardif'), sa condition en mots,
 * quand(etat), effet]. `etat` : ce qui est déjà joué, vu de ton camp — bleu,
 * avance (l'or), tours, dragons, k (les éliminations). Chacun joue à peu près
 * une partie sur deux, et fort quand il joue : check_rogue le borne et le voit.
 */
const pouvoir = (id, nom, phase, condition, quand, effet) => ({ id, nom, phase, condition, quand, effet });
export const COACHS = {
  agresseur: { ico: '🐺', nom: 'L\'agresseur', signe: { rythme: 1, ligne: 0.5 }, pouvoirs: [
    pouvoir('traque', 'La traque', 'lignes', 'en phase de lignes, du côté rouge', e => !e.bleu, { ligne: 0.18, rythme: 1.25 }),
    pouvoir('curee', 'La curée', 'milieu', 'au milieu de partie, en avance à l\'or', e => e.avance > 0, { combat: 0.15, rythme: 1.3, fin: 1.4 }),
    pouvoir('carnage', 'Le carnage', 'tardif', 'en fin de partie, en retard à l\'or', e => e.avance < 0, { combat: 0.22, rythme: 1.4 }),
  ] },
  stratege: { ico: '🐉', nom: 'Le stratège', signe: { objectifs: 1 }, pouvoirs: [
    pouvoir('controle', 'Le contrôle du fleuve', 'milieu', 'au milieu de partie, pas en avance aux dragons', e => e.dragons <= 0, { dragons: 2.2, objectifs: 0.12 }),
    pouvoir('vision', 'La vision du héraut', 'lignes', 'en phase de lignes, du côté bleu', e => e.bleu, { heraut: 2.5, objectifs: 0.3 }),
    pouvoir('baron', 'L\'appel du Nashor', 'tardif', 'en fin de partie, à 4 000 d\'or ou moins d\'écart', e => Math.abs(e.avance) <= 4000, { nashor: 2.2, objectifs: 0.25 }),
  ] },
  patient: { ico: '⏳', nom: 'Le patient', signe: { tardif: 1, fin: -0.5 }, pouvoirs: [
    pouvoir('ferme', 'La ferme', 'lignes', 'en phase de lignes, du côté rouge', e => !e.bleu, { ligne: 0.14, rythme: 0.8 }),
    pouvoir('endurance', 'L\'endurance', 'tardif', 'en fin de partie, en retard à l\'or', e => e.avance < 0, { fin: 0.7, tardif: 0.3 }),
    pouvoir('dernierMot', 'Le dernier mot', 'tardif', 'en fin de partie, à 4 000 d\'or ou moins d\'écart', e => Math.abs(e.avance) <= 4000, { combat: 0.2, tardif: 0.3, rythme: 1.3 }),
  ] },
  assiegeant: { ico: '🏰', nom: 'L\'assiégeant', signe: { siege: 1, fin: 0.5 }, pouvoirs: [
    pouvoir('siege', 'Le siège', 'milieu', 'au milieu de partie, autant de tours ou plus', e => e.tours >= 0, { siege: 1.35, split: 1.6 }),
    pouvoir('beton', 'Le héraut au front', 'lignes', 'en phase de lignes, du côté bleu', e => e.bleu, { heraut: 2.2, siege: 1.2 }),
    pouvoir('percee', 'La percée', 'tardif', 'en fin de partie, en avance à l\'or', e => e.avance > 0, { fin: 1.4, siege: 1.3, combat: 0.1 }),
  ] },
};
/** Un pouvoir par son id : [coach, pouvoir]. */
export const pouvoirDe = id => Object.entries(COACHS).map(([c, co]) => [c, co.pouvoirs.find(x => x.id === id)]).find(([, x]) => x) || [null, null];

/* L'ampleur d'un canal : ce qui compte pour « un » dans la couleur d'une carte. Les multiplicatifs se lisent en logarithme. */
const AMPLEUR = { ligne: 0.1, combat: 0.06, objectifs: 0.1, dragons: 0.2, heraut: 0.2, nashor: 0.2, split: 0.2, tardif: 0.2, rythme: 0.1, siege: 0.1, fin: 0.1 };
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
export const nouveauRogue = graine => ({ graine, achats: [], cartes: [], plan: [], coach: null, joue: [], reports: [], primes: [] });

/** Ce que valent en jetons les gains d'un split (gainsDe). */
export const valeurDesGains = g => g.v * JETONS.victoire + g.d * JETONS.defaite + g.rondes * JETONS.ronde + g.objectifs * OBJECTIF.jetons + g.elan * ELAN.jetons + g.commandite;

/** Les jetons : le départ, les splits finis de la run, le split en cours, les primes, moins tes achats. */
export function jetonsDe(L, R) {
  const gagnes = [...R.reports, ...(L ? [gainsDe(L)] : [])].reduce((s, g) => s + valeurDesGains(g), 0);
  return JETONS.depart + gagnes + R.primes.reduce((s, p) => s + p.jetons, 0) - R.achats.reduce((s, a) => s + a.prix, 0);
}

const packsOuverts = R => R.achats.filter(a => a.quoi === 'pack').length;
/** Le prix d'un pack, haussé par ceux déjà achetés (un pack offert ne hausse rien) et par la cherté des exigences (`R.cherte`). */
export const prixDuPack = (R, id) => Math.round(PACKS[id].prix * (1 + HAUSSE * R.achats.filter(a => a.quoi === 'pack' && a.prix).length) * (1 + (R.cherte || 0)));

/** « 1 pack sur N » pour chaque rareté qu'un pack peut donner, au moins une fois. */
export function chances(id) {
  const P = PACKS[id];
  return Object.entries(P.cotes).filter(([, p]) => p > 0).map(([r, p]) => [r, Math.max(1, Math.round(1 / (1 - (1 - p / 100) ** P.n)))]);
}

/** Achète (ou reçoit, `gratuit`) et ouvre un pack : les cartes tirées (jamais une carte déjà à toi), ou null s'il manque des jetons. */
export function ouvrirPack(L, R, id, { gratuit = false } = {}) {
  const prix = gratuit ? 0 : prixDuPack(R, id);
  if (jetonsDe(L, R) < prix) return null;
  const de = hasard(graineDe(R.graine, `pack-${packsOuverts(R)}`));
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

/** Engage un coach (un seul en poste : le nouveau repart de zéro), à `prix` jetons. Faux s'il manque des jetons. */
export function engager(L, R, id, prix = PRIX_COACH) {
  if ((R.coach && R.coach.id === id) || jetonsDe(L, R) < prix) return false;
  R.achats.push({ quoi: 'coach', id, prix });
  R.coach = { id, depuis: R.joue.length };
  return true;
}

/** La confiance du coach : les séries jouées depuis son arrivée avec une carte de sa couleur au plan. Et son palier (0 à 3). */
export function confiance(R) {
  if (!R.coach) return { series: 0, palier: 0 };
  const series = R.joue.slice(R.coach.depuis).filter(x => x.plan.some(c => couleurDe(c) === R.coach.id)).length;
  return { series, palier: SEUILS.filter(s => series >= s).length, prochain: SEUILS.find(s => series < s) || null };
}

/*
 * LES LIENS D'ORIGINE (repris des « liens » de LoL Esports Manager) : des
 * joueurs de ton cinq qui ont joué ensemble pour vrai. Une vraie équipe a
 * déjà les siens dans la partie calibrée ; un lien rend à ton cinq, fait de
 * plusieurs vestiaires, une part de ce qu'elle a. Chacun passe par les
 * canaux et se mesure en paires comme une carte, à sa rareté (check_rogue).
 *   [icône, nom, rareté, effets, condition sur les contrats du cinq]
 */
const memeVestiaire = (a, b) => a && b && a.ref.id === b.ref.id && a.ref.e === b.ref.e;
const plusGrand = (cinq, cle) => Math.max(0, ...Object.values([...cinq].reduce((n, c) => ({ ...n, [cle(c)]: (n[cle(c)] || 0) + 1 }), {})));
export const LIENS = {
  duoBas: ['🤝', 'Duo d\'origine au bas', 'peu', { ligne: 0.05 }, c => memeVestiaire(c.bas, c.soutien)],
  duoCentre: ['🧭', 'Duo d\'origine milieu-jungle', 'peu', { ligne: 0.03, rythme: 1.06 }, c => memeVestiaire(c.milieu, c.jungle)],
  vestiaire: ['🏠', 'Vestiaire d\'origine', 'peu', { combat: 0.04 }, c => plusGrand(Object.values(c), x => `${x.ref.id}|${x.ref.e}`) >= 3],
  couleurs: ['🎽', 'Les couleurs du club', 'commune', { objectifs: 0.06 }, c => plusGrand(Object.values(c), x => x.ref.e) >= 3],
};

/** Les liens actifs d'un cinq ({ rôle : contrat }). */
export const liensDe = cinq => Object.keys(LIENS).filter(id => LIENS[id][4](cinq));

/** Les effets de ton cinq : ta stratégie (js/strategie.js), les cartes du plan et les liens d'origine, sommés par le moteur. */
export function effetsDeToi(R, liens = [], strategie = null) {
  return sommerEffets([strategie, ...R.plan.map(c => CARTES[c][3]), ...liens.map(id => LIENS[id][3])]);
}

/** Les pouvoirs de ton coach que sa confiance a ouverts : un par palier. */
export const pouvoirsDeToi = R => (R.coach ? COACHS[R.coach.id].pouvoirs.slice(0, confiance(R).palier) : []);

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
  dragons: ['les dragons'], heraut: ['le héraut'], nashor: ['le Nashor'], split: ['la pression de côté'],
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
