/*
 * LA GESTION (repris de Cap 82-0) : ce que fait le DG autour des parties.
 * Rien que des règles, sans DOM ; js/partie.js les applique, js/bureau.js
 * les montre, check_gestion les rejoue.
 *
 *   la roulette     un tour gratuit par case ; puis deux relances de chaque
 *                   sorte par repêchage — Autre split, Autre équipe, Passer ;
 *   le marché       entre deux journées, jusqu'à la date limite (la mi-split) :
 *                   trois agents libres par journée, Pilier au plus, tirés du
 *                   dé du split ; « qui sort ? » : titulaire ou banc ;
 *   le banc         un sixième joueur, n'importe quel rôle, compté sous le
 *                   plafond ; il prend la place du titulaire de son rôle ;
 *   le proprio      un mandat par split (les séries, puis la demie, la finale,
 *                   le titre) ; des objectifs de six journées, payés en jetons ;
 *   l'entraîneur    trois défaites de suite : un événement à trancher ;
 *   le commanditaire  un sur trois, choisi avant la première journée (repris
 *                   de Teamfight Manager) : il paie chaque partie qui remplit
 *                   son objectif, lu sur la vraie feuille et jugé contre le
 *                   tempo réel de tes splits ;
 *   l'entraînement  un joueur travaille un champion que les autres jouaient
 *                   à son rôle dans son split ; quatre journées plus tard, le
 *                   champion entre dans son bassin, « entraîné » ;
 *   la boîte        tout ça en messages, déduits de l'état, jamais gardés.
 *
 * Tout le hasard passe par hasard() ; aucune cote ne sort d'ici : un agent
 * libre se montre par son niveau, comme au vestiaire.
 */
import { hasard, graineDe, piger } from './hasard.js';
import { PLAFOND, TARIFS, signable } from './cotes.js';

const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];

/* ---- LA ROULETTE ---- */
export const RELANCES = { split: ['Autre split', 2], equipe: ['Autre équipe', 2], passer: ['Passer', 2] };
const ESSAIS = 20;

/** Le plafond d'un effectif : le sien (les exigences le serrent), sinon PLAFOND. */
export const plafondDe = eff => eff.plafond ?? PLAFOND;
/** Les rôles encore vides d'un effectif. */
export const libresDe = eff => ROLES.filter(r => !eff.cinq[r]);
/** Ce que coûte l'effectif : le cinq et le banc. */
export const masseDe = eff => [...Object.values(eff.cinq), eff.banc].filter(Boolean).reduce((s, c) => s + c.cout, 0);

/** Les joueurs d'un vestiaire qu'on peut signer : un rôle vide, et le reste du plafond paie les cases vides. */
export function signables(eff, equipe, profils) {
  const l = libresDe(eff);
  const reste = plafondDe(eff) - masseDe(eff);
  return equipe.joueurs.filter(j => l.includes(j.r) && signable(profils.get(j).cout, reste, l.length));
}

/**
 * UN TOUR DE ROULETTE : { id, e } d'un vestiaire où quelqu'un se signe, ou null.
 * `mode` : 'tour' (un split et une équipe neufs), 'split' (la même équipe dans un
 * autre split si elle y est, sinon une autre), 'equipe' (le même split), 'passer'.
 * `lire(id)` rend (ou promet) { split, profils }.
 */
export async function tirer(de, ids, lire, eff, mode, courant) {
  for (let essai = 0; essai < ESSAIS; essai++) {
    const id = mode === 'equipe' ? courant.id : piger(ids.filter(x => mode === 'tour' || ids.length < 2 || x !== courant.id), de);
    const { split, profils } = await lire(id);
    const meme = mode === 'split' ? split.equipes.find(e => e.nom === courant.e) : null;
    const autres = mode === 'equipe' ? split.equipes.filter(e => e.nom !== courant.e) : split.equipes;
    const e = meme || piger(autres, de);
    if (e && signables(eff, e, profils.joueurs).length) return { id, e: e.nom };
  }
  return null;
}

/** Les neuf adversaires : des vraies équipes qui ont leurs cinq rôles, chacune une fois. */
export async function tirerAdversaires(de, ids, lire, equipeReelle, n = 9) {
  const out = [];
  const vus = new Set();
  for (let essai = 0; out.length < n && essai < 200; essai++) {
    const id = piger(ids, de);
    const { split, profils, tempo } = await lire(id);
    const e = piger(split.equipes, de);
    if (vus.has(`${id}|${e.nom}`) || !equipeReelle(split, e, profils, tempo)) continue;
    vus.add(`${id}|${e.nom}`);
    out.push({ id, e: e.nom });
  }
  return out;
}

/* ---- LE MARCHÉ ET LE BANC ---- */
export const MARCHE = { offre: 3, prix: 8, coutMax: 3 };

/** La date limite des échanges : la mi-split. Le marché est ouvert avant, entre deux journées. */
export const dateLimite = L => Math.ceil(L.journees.length / 2);
export const marcheOuvert = L => !!L && !L.series && L.jour < dateLimite(L);

/**
 * Où un nouveau peut jouer, et qui sort : titulaire à son rôle (le titulaire
 * descend au banc s'il est vide, sinon il part) ou au banc (celui du banc part).
 * Rend [{ place, sort, masse }] sous le plafond seulement.
 */
export function placements(eff, c) {
  const masse = masseDe(eff);
  const t = eff.cinq[c.r];
  const out = [];
  if (t) {
    const sort = eff.banc ? t : null;
    out.push({ place: 'titulaire', sort, descend: eff.banc ? null : t, masse: masse + c.cout - (sort ? sort.cout : 0) });
  }
  out.push({ place: 'banc', sort: eff.banc, descend: null, masse: masse + c.cout - (eff.banc ? eff.banc.cout : 0) });
  return out.filter(p => p.masse <= plafondDe(eff));
}

/** La clé d'un contrat : son split, son équipe, son nom, son rôle (un joueur peut en tenir deux dans un split). */
export const cleDe = ref => `${ref.id}|${ref.e}|${ref.n}|${ref.r}`;

/**
 * LES AGENTS LIBRES de la journée : `n` joueurs (MARCHE.offre, plus le
 * dépisteur d'un déblocage) tirés du dé du split et de la journée, Pilier au
 * plus, ni à toi ni titulaires d'une équipe de la ligue, et qui ont une place
 * sous ton plafond. `lire` comme pour tirer.
 */
export async function agentsLibres(L, ids, lire, eff, adversaires, n = MARCHE.offre) {
  const de = hasard(graineDe(L.graine, `marche-${L.jour}`));
  const pris = new Set([...Object.values(eff.cinq), eff.banc].filter(Boolean).map(c => cleDe(c.ref)));
  const titulaires = new Set(adversaires.map(a => `${a.id}|${a.e}`));
  const offre = [];
  for (let essai = 0; offre.length < n && essai < 20 * n; essai++) {
    const id = piger(ids, de);
    const { split, profils } = await lire(id);
    const e = piger(split.equipes, de);
    const j = piger(e.joueurs, de);
    const ref = { id, e: e.nom, n: j.n, r: j.r };
    const p = profils.joueurs.get(j);
    // Le titulaire d'une équipe de la ligue y joue : celui qui a le plus joué à son rôle.
    const titulaire = titulaires.has(`${id}|${e.nom}`) && e.joueurs.filter(x => x.r === j.r).sort((a, b) => b.pj - a.pj)[0] === j;
    if (p.cout > MARCHE.coutMax || pris.has(cleDe(ref)) || titulaire || !placements(eff, { r: j.r, cout: p.cout }).length) continue;
    pris.add(cleDe(ref));
    offre.push(ref);
  }
  return offre;
}

/*
 * ---- LES PACKS DE JOUEURS (Cap 82-0, js/packs.js : le joueur se tire par son
 * niveau, comme dans une vraie boîte, les ordinaires souvent, les vedettes
 * rarement). Trois vrais joueurs ; tu en signes un sous ton plafond, sans
 * frais de marché, avant la journée suivante ; les trois entrent à ta
 * collection. Ils se vendent jusqu'à la date limite, comme le marché.
 * Les chances, sur 100, par niveau (du plus cher au moins cher, TARIFS).
 */
export const PACKS_JOUEURS = {
  recrues: { nom: 'Pack recrues', prix: 12, n: 3, cotes: [0.5, 3.5, 16, 35, 45] },
  pros: { nom: 'Pack pros', prix: 22, n: 3, cotes: [1.5, 7.5, 25, 36, 30] },
  legendes: { nom: 'Pack légendes', prix: 36, n: 3, cotes: [5, 15, 35, 30, 15] },
};
const HAUSSE_JOUEURS = 0.1;

/** Le prix d'un pack de joueurs, haussé de 10 % par pack de joueurs déjà acheté. */
export const prixPackJoueurs = (R, id) => Math.round(PACKS_JOUEURS[id].prix * (1 + HAUSSE_JOUEURS * R.achats.filter(a => a.quoi === 'joueurs').length) * (1 + (R.cherte || 0)));

/** « 1 pack sur N » pour chaque niveau d'un pack de joueurs : [[niveau, N]], du plus cher au moins cher. */
export const chancesJoueurs = id => TARIFS.map(([niveau], k) => [niveau, Math.max(1, Math.round(1 / (1 - (1 - PACKS_JOUEURS[id].cotes[k] / 100) ** PACKS_JOUEURS[id].n)))]);

/**
 * LE TIRAGE D'UN PACK DE JOUEURS : du dé de la partie et du numéro du pack,
 * donc une partie reprise ouvre le même pack. Pour chaque carte, un niveau
 * selon les chances, puis un split et un joueur de ce niveau dans ce split,
 * jamais un des tiens ni deux fois le même. `lire` comme pour tirer.
 */
export async function tirerPackJoueurs(R, id, ids, lire, eff) {
  const de = hasard(graineDe(R.graine, `joueurs-${R.achats.filter(a => a.quoi === 'joueurs').length}`));
  const pris = new Set([...Object.values(eff.cinq), eff.banc].filter(Boolean).map(c => cleDe(c.ref)));
  const out = [];
  for (let i = 0; i < PACKS_JOUEURS[id].n; i++) {
    let x = de() * 100;
    const k = PACKS_JOUEURS[id].cotes.findIndex(p => (x -= p) < 0);
    const niveaux = TARIFS.slice(k < 0 ? TARIFS.length - 1 : k).map(([n]) => n);
    // Le niveau tiré d'abord ; un split sans lui en donne un plus modeste.
    for (let essai = 0; essai < 20; essai++) {
      const sid = piger(ids, de);
      const { split, profils } = await lire(sid);
      const tous = split.equipes.flatMap(e => e.joueurs.map(j => ({ ref: { id: sid, e: e.nom, n: j.n, r: j.r }, niveau: profils.joueurs.get(j).niveau })))
        .filter(x2 => !pris.has(cleDe(x2.ref)));
      const niveau = niveaux.find(n => tous.some(x2 => x2.niveau === n));
      if (!niveau || (niveau !== niveaux[0] && essai < 10)) continue;
      const j = piger(tous.filter(x2 => x2.niveau === niveau), de);
      pris.add(cleDe(j.ref));
      out.push(j.ref);
      break;
    }
  }
  return out;
}

/*
 * ---- LE JOUEUR QUI VIEILLIT. Entre deux splits de ta run, un gardé devient sa
 * version du plus proche split réel plus récent où il a joué à son rôle (le
 * nom et le rôle du shard) ; sinon il reste tel quel. Sa nouvelle version a
 * son niveau, son coût, son bassin et sa carte à lui.
 * `index` : [{ id, annee }] (data/index.json) ; `lire` comme pour tirer.
 */
export async function prochaineVersion(index, lire, c) {
  const annee = (index.find(s => s.id === c.ref.id) || {}).annee;
  const plusTard = index.filter(s => s.annee > annee).sort((a, b) => a.annee - b.annee || (a.id < b.id ? -1 : 1));
  for (const s of plusTard) {
    const { split } = await lire(s.id);
    const la = split.equipes.flatMap(e => e.joueurs.filter(j => j.n === c.n && j.r === c.r).map(j => ({ e, j }))).sort((a, b) => b.j.pj - a.j.pj)[0];
    if (la) return { id: s.id, e: la.e.nom, n: la.j.n, r: la.j.r };
  }
  return null;
}

/* ---- LE PROPRIO : le mandat du split, les objectifs de six journées ---- */
export const MANDATS = [
  ['series', 'faire les séries'],
  ['demie', 'atteindre les demi-finales'],
  ['finale', 'atteindre la finale'],
  ['titre', 'gagner le split'],
];
/** Le mandat du split n de la run (1, 2…) : plus haut à chaque split, le titre dès le quatrième ; `cran` le monte d'autant (les exigences). */
export const mandatDe = (n, cran = 0) => MANDATS[Math.min(n + cran, MANDATS.length) - 1];

/** Le mandat est-il rempli ? Les deux premiers attendent en demie : ils l'atteignent d'office. */
export function mandatRempli(L, cle) {
  const S = L.series;
  if (!S) return false;
  const dans = k => (S.rondes[k] || []).some(s => s.a === 0 || s.b === 0);
  if (cle === 'series') return S.rang.slice(0, 6).includes(0);
  if (cle === 'demie') return dans(1);
  if (cle === 'finale') return dans(2);
  return S.champion === 0;
}

export const OBJECTIF = { journees: 6, jetons: 10 };
export const ELAN = { suite: 4, jetons: 5 };

/* Tes séries de la saison régulière, journée par journée : true gagnée, false perdue, null pas jouée. */
const tesResultats = L => L.journees.map(jour => {
  const s = jour.find(x => x.a === 0 || x.b === 0);
  return s && s.gagnant !== null ? s.gagnant === 0 : null;
});

/**
 * Les objectifs du proprio : une fenêtre de six journées à la fois ; la cible
 * suit ta fiche avant la fenêtre (trois victoires sur six au départ), entre 2 et 5.
 * Rend [{ debut, fin, cible, v, etat }] — etat : 'avenir', 'encours', 'atteint', 'rate'.
 */
export function objectifsDe(L) {
  const res = tesResultats(L);
  const out = [];
  for (let debut = 0; debut < res.length; debut += OBJECTIF.journees) {
    const fin = Math.min(res.length, debut + OBJECTIF.journees);
    const avant = res.slice(0, debut).filter(x => x !== null);
    const pct = avant.length ? avant.filter(Boolean).length / avant.length : 0.5;
    const cible = Math.max(2, Math.min(5, Math.round((fin - debut) * pct)));
    const fen = res.slice(debut, fin);
    const v = fen.filter(x => x === true).length;
    const reste = fen.filter(x => x === null).length;
    const etat = L.jour <= debut ? 'avenir' : v >= cible ? 'atteint' : v + reste < cible ? 'rate' : 'encours';
    out.push({ debut, fin, cible, v, etat });
  }
  return out;
}

/** Ta plus longue suite de victoires de la saison régulière : l'élan, payé une fois. */
function plusLongue(res, quoi) {
  let n = 0, max = 0;
  for (const x of res) { n = x === quoi ? n + 1 : 0; max = Math.max(max, n); }
  return max;
}

/*
 * LES COMMANDITAIRES : [icône, nom, objectif, jetons par partie réussie, juge].
 * Le juge lit la feuille d'une de tes parties (`nous` : ton côté) contre le
 * tempo de ton cinq — la moyenne des vraies parties de ses splits.
 */
export const COMMANDITAIRES = {
  prudent: ['🛡️', 'Le Prudent', 'mourir moins que la moyenne de tes splits', 2, (f, nous, t) => f.equipes[1 - nous].k <= t.k],
  eclair: ['⚡', 'L\'Éclair', 'gagner plus vite que la durée moyenne de tes splits', 3, (f, nous, t) => f.gagnant === nous && f.duree < t.duree],
  chasseur: ['🐉', 'Le Chasseur', 'prendre plus de dragons que l\'adversaire', 2, (f, nous) => f.equipes[nous].dragons > f.equipes[1 - nous].dragons],
  demolisseur: ['🏰', 'Le Démolisseur', 'faire tomber plus de tours que l\'adversaire', 2, (f, nous) => f.equipes[nous].tours > f.equipes[1 - nous].tours],
  nashor: ['🟣', 'Le Nashor', 'prendre au moins un Nashor', 3, (f, nous) => f.equipes[nous].barons > 0],
};
const OFFERTS = 3;

/** Les trois commanditaires offerts au début d'un split, tirés du dé du split. */
function commanditairesOfferts(L) {
  const de = hasard(graineDe(L.graine, 'commanditaires'));
  const ids = Object.keys(COMMANDITAIRES);
  for (let i = ids.length - 1; i > 0; i--) {
    const k = Math.floor(de() * (i + 1));
    [ids[i], ids[k]] = [ids[k], ids[i]];
  }
  return ids.slice(0, OFFERTS);
}

/** Tes parties du split et, pour chacune, si le commanditaire est content. */
export function partiesCommanditees(L) {
  const C = COMMANDITAIRES[L.commanditaire];
  if (!C) return [];
  const tes = [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].filter(s => s.a === 0 || s.b === 0);
  return tes.flatMap(s => s.parties.map(p => C[4](p.feuille, p.bleu === 0 ? 0 : 1, L.equipes[0].tempo)));
}

/**
 * CE QUE TE RAPPORTE UN SPLIT, compté de ses résultats seulement : tes séries
 * gagnées et perdues, tes rondes de séries gagnées, les objectifs atteints,
 * l'élan, et ce que paie ton commanditaire.
 */
export function gainsDe(L) {
  const tes = [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].filter(s => s.gagnant !== null && (s.a === 0 || s.b === 0));
  const v = tes.filter(s => s.gagnant === 0).length;
  return {
    v, d: tes.length - v,
    rondes: L.series ? L.series.rondes.flat().filter(s => s.gagnant === 0).length : 0,
    objectifs: objectifsDe(L).filter(o => o.etat === 'atteint').length,
    elan: plusLongue(tesResultats(L), true) >= ELAN.suite ? 1 : 0,
    commandite: L.commanditaire ? partiesCommanditees(L).filter(Boolean).length * COMMANDITAIRES[L.commanditaire][3] : 0,
  };
}

/* ---- L'ENTRAÎNEMENT DES CHAMPIONS ---- */
export const ENTRAINEMENT = { journees: 4, part: 0.25, offre: 6 };

/**
 * Ce qu'un joueur peut travailler : les champions que les AUTRES joueaient à
 * son rôle dans son split (la vraie méta de son temps), absents de son
 * bassin, du plus joué au moins joué.
 */
export function aTravailler(split, c) {
  const siens = new Set(c.moteur.bassin.map(([x]) => x));
  const n = new Map();
  for (const e of split.equipes) {
    for (const j of e.joueurs) {
      if (j.r !== c.r || j.n === c.n) continue;
      for (const [x, pj] of j.champs) if (!siens.has(x)) n.set(x, (n.get(x) || 0) + pj);
    }
  }
  return [...n].sort((a, b) => b[1] - a[1]).slice(0, ENTRAINEMENT.offre).map(([x]) => x);
}

/**
 * Le joueur qui a fini son entraînement : le champion entre au bout de son
 * bassin, compté pour une part de son plus joué (ENTRAINEMENT.part) et marqué
 * « entraîné » — l'écran ne le montre jamais comme de vraies parties.
 */
export function entraine(c, champion) {
  const top = c.moteur.bassin[0] ? c.moteur.bassin[0][1] : 1;
  return { ...c, moteur: { ...c.moteur, bassin: [...c.moteur.bassin, [champion, top * ENTRAINEMENT.part, 0, 'entraine']] } };
}

/* ---- L'ENTRAÎNEUR ET LE COMMANDITAIRE : les décisions à trancher ---- */
export const EVENEMENTS = {
  commanditaire: {
    ico: '💼', qui: 'Le DG', titre: 'Trois commanditaires',
    texte: 'Choisis celui qui paiera ce split. Il paie chaque partie qui remplit son objectif, séries comprises.',
    choix: Object.fromEntries(Object.entries(COMMANDITAIRES).map(([id, [ico, nom, objectif, jetons]]) => [id, [`${ico} ${nom}`, `Objectif : ${objectif}. +${jetons} 🪙 par partie réussie.`, { commanditaire: id }]])),
  },
  sequence: {
    ico: '🧑‍🏫', qui: 'L\'entraîneur', titre: 'Trois défaites de suite',
    texte: 'Le vestiaire doute. Qu\'est-ce qu\'on fait ?',
    choix: {
      cap: ['Garder le cap', 'Le proprio apprécie le calme : +5 🪙.', { jetons: 5 }],
      agent: ['Un agent libre aux frais du club', 'Ta prochaine signature au marché est gratuite.', { bon: 1 }],
      plan: ['Revoir le plan de jeu', 'Un pack bronze offert.', { pack: 'bronze' }],
    },
  },
};

/** L'événement en attente d'une décision, ou null. `decisions` : { cle: choix } de la partie ; `n` : le split de la run. */
export function evenementEnAttente(L, decisions, n) {
  if (!L || L.series) return null;
  if (!L.commanditaire) return { cle: `${n}-commanditaire`, id: 'commanditaire', choix: commanditairesOfferts(L) };
  const cle = `${n}-sequence`;
  if (cle in decisions) return null;
  return plusLongue(tesResultats(L), false) >= 3 ? { cle, id: 'sequence', choix: Object.keys(EVENEMENTS.sequence.choix).filter(c => c !== 'agent' || marcheOuvert(L)) } : null;
}
