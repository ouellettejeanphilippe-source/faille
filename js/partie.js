/*
 * LA PARTIE : une run de plusieurs splits, tenue en JOURNAL D'ACTIONS. Chaque
 * geste du DG (un tour de roulette, une signature, une journée, un pack, une
 * signature au marché, un événement tranché, le bilan, ceux qu'on garde) est
 * une action ; appliquer() la vérifie, la joue et l'inscrit au journal.
 *
 * Rejouer le journal sous la même graine redonne la même partie, partie pour
 * partie : c'est la sauvegarde (on garde { graine, log }, rien de compté), et
 * c'est ce que check_gestion vérifie. Le hasard de la roulette et du marché
 * se tire HORS d'ici (js/gestion.js) ; le journal garde ce qui est sorti.
 *
 * `ctx` : { splits: Map(id → { split, profils, tempo }), classes } — les
 * splits que le journal nomme doivent y être chargés (refsDuJournal).
 *
 * Les étapes : 'bati' (le repêchage de ton cinq), 'split' (la saison, puis
 * les séries), 'gardes' (le split est fini, le mandat rempli : qui reste ?),
 * 'fin' (la run est gagnée, ou le mandat manqué).
 */
import { joueurDuMoteur, equipeReelle, melangerTempos, creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from './sim.js';
import { repecher, repecherPartie, attendRepechage } from './repechage.js';
import { STRATEGIES, effetDeStrategie } from './strategie.js';
import { PLAFOND, signable } from './cotes.js';
import { nouveauRogue, ouvrirPack, basculer, engager, effetsDeToi, pouvoirsDeToi, liensDe, noterJoue, jetonsDe, PRIX_COACH } from './rogue.js';
import { RELANCES, MARCHE, ENTRAINEMENT, PACKS_JOUEURS, libresDe, masseDe, plafondDe, signables, placements, cleDe, marcheOuvert, mandatDe, mandatRempli, gainsDe, EVENEMENTS, evenementEnAttente, aTravailler, entraine, prixPackJoueurs } from './gestion.js';
import { effetDe } from './meta.js';
import { tropheesDuSplit, galonsDuSplit, recordsDuSplit } from './palmares.js';

export const GARDES = 2;
export const VERSION = 3;
const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
/* Le club d'une partie sans club (une sauvegarde d'avant le méta). */
const CLUB_DEPART = { nom: 'Ton cinq', code: 'TOI', couleur: null };

const relancesNeuves = () => Object.fromEntries(Object.keys(RELANCES).map(k => [k, 0]));

/**
 * Une partie neuve. `deb` : les déblocages du méta (js/meta.js), posés au
 * départ et gardés dans la sauvegarde ; `club` : { nom, code, couleur } ;
 * `exig` : le cran des exigences (0 : aucune).
 */
export function nouvellePartie(graine, { deb = [], club = null, exig = 0 } = {}) {
  const fx = effetDe(deb, exig);
  const P = {
    v: VERSION, graine, log: [], etape: 'bati', deb: [...deb], club: club || CLUB_DEPART, exig, fx,
    run: { n: 1, passes: [], fin: null, sursis: 0 },
    R: { ...nouveauRogue(graine), cherte: fx.cherte },
    eff: { cinq: {}, banc: null, plafond: PLAFOND + fx.plafond },
    tirage: null, relances: relancesNeuves(),
    L: null, dernier: null, adversaires: [], decisions: {}, bons: 0, entrainement: null, strategie: null,
    cartes: [], cadeau: null, offrePack: null,
  };
  if (fx.jetons) P.R.primes.push({ cle: 'depart', jetons: fx.jetons });
  return P;
}

/** Les relances d'une sorte qu'un repêchage permet, déblocages compris. */
export const relancesMax = (P, k) => RELANCES[k][1] + P.fx.relances;
/** Combien de joueurs restent d'un split à l'autre. */
export const gardesDe = P => GARDES + P.fx.gardes;
/** Le mandat du split n de la run, monté par les exigences : [clé, en mots]. */
export const mandatDuSplit = (P, n = P.run.n) => mandatDe(n, P.fx.mandat);
/** Combien d'agents libres le dépisteur trouve par journée. */
export const offreDe = P => MARCHE.offre + P.fx.offre;

/** Ce que coûte le prochain coach : rien pour le premier de la run avec le coach fidèle (un déblocage). */
export const prixDuCoach = P => (P.fx.coachGratuit && !P.R.achats.some(x => x.quoi === 'coach') ? 0 : PRIX_COACH);

/* Un joueur passe chez toi : sa carte entre à ta collection (une fois par partie). */
function collectionner(P, ref) {
  const cle = cleDe(ref);
  if (!P.cartes.includes(cle)) P.cartes.push(cle);
}

/** Un contrat : le joueur d'un split, tel que l'effectif et le moteur le lisent. */
export function contratDe(ctx, ref) {
  const { split, profils, tempo } = ctx.splits.get(ref.id);
  const e = split.equipes.find(x => x.nom === ref.e);
  const j = e && e.joueurs.find(x => x.n === ref.n && x.r === ref.r);
  if (!j) throw new Error(`joueur introuvable : ${cleDe(ref)}`);
  const p = profils.joueurs.get(j);
  return { ref, n: j.n, r: j.r, photo: j.photo, equipe: e.nom, split: split.nom, niveau: p.niveau, cout: p.cout, moteur: joueurDuMoteur(j, p), tempo };
}

/** Le vestiaire du tirage en cours : { id, split, equipe, profils, tempo }. */
export function vestiaireDe(P, ctx) {
  if (!P.tirage) return null;
  const s = ctx.splits.get(P.tirage.id);
  return { id: P.tirage.id, ...s, equipe: s.split.equipes.find(e => e.nom === P.tirage.e) };
}

/* Ton cinq tel que le moteur le joue ; dans la ligue, il remplace l'ancien sans toucher aux effets. */
function majToi(P) {
  const cinq = Object.fromEntries(ROLES.map(r => [r, P.eff.cinq[r].moteur]));
  const tempo = melangerTempos(ROLES.map(r => P.eff.cinq[r].tempo));
  if (P.L) Object.assign(P.L.equipes[0], { cinq, tempo });
  return { nom: P.club.nom, split: null, cinq, tempo };
}

/** Ta série de la prochaine journée, ou de la ronde des séries en cours ; null si tu n'y joues pas. */
export function taSerie(L) {
  const S = L.series;
  const lot = L.jour < L.journees.length ? L.journees[L.jour] : S && S.champion === null ? S.rondes[S.rondes.length - 1] : [];
  return lot.find(s => (s.a === 0 || s.b === 0) && s.gagnant === null) || null;
}

/** L'événement que la partie attend, ou null. */
export const enAttente = P => (P.etape === 'split' ? evenementEnAttente(P.L, P.decisions, P.run.n) : null);

/*
 * Joue ce qui vient avec ton plan de jeu, ta partie repêchée d'abord (`rp` :
 * tes bannissements et tes choix ; absent, l'automatique). Depuis la
 * version 3, ta série de séries se joue partie par partie, un repêchage
 * avant chacune ; une sauvegarde d'avant garde l'ancienne règle (toute la
 * série d'un repêchage) pour se rejouer pareil.
 */
function jouerAvecToi(P, ctx, jouer, rp) {
  const L = P.L;
  P.offrePack = null;
  const s = taSerie(L);
  const options = rp ? { mesBans: rp.bans, mesChoix: rp.choix } : {};
  if (s && P.v < 3 && !s.repechage) repecher(L, s, ctx.classes, options);
  else if (s && P.v >= 3 && attendRepechage(s)) repecherPartie(L, s, ctx.classes, options);
  L.equipes[0].effets = effetsDeToi(P.R, liensDe(P.eff.cinq), effetDeStrategie(P.strategie, L.equipes[0].cinq));
  L.equipes[0].pouvoirs = pouvoirsDeToi(P.R);
  jouer(L);
  if (s && s.gagnant !== null) noterJoue(P.R, 1);
  finirEntrainement(P);
}

/* Un nouveau joueur entre à sa place : titulaire (l'ancien descend au banc s'il est vide, sinon il part) ou au banc. */
function placer(P, c, place) {
  exiger(![...Object.values(P.eff.cinq), P.eff.banc].some(x => x && cleDe(x.ref) === cleDe(c.ref)), 'déjà chez toi');
  const pl = exiger(placements(P.eff, c).find(x => x.place === place), 'au-dessus du plafond');
  if (pl.place === 'titulaire') {
    P.eff.cinq[c.r] = c;
    if (pl.descend) P.eff.banc = pl.descend;
  } else P.eff.banc = c;
  collectionner(P, c.ref);
  majToi(P);
}

/* L'entraînement fini entre au bassin du joueur, s'il est encore chez toi. */
function finirEntrainement(P) {
  const E = P.entrainement;
  if (!E || P.L.jour - E.debut < ENTRAINEMENT.journees) return;
  P.entrainement = null;
  const ici = [...ROLES.map(r => ['cinq', r]), ['banc']].find(([o, r]) => {
    const c = o === 'cinq' ? P.eff.cinq[r] : P.eff.banc;
    return c && cleDe(c.ref) === E.cle;
  });
  if (!ici) return;
  if (ici[0] === 'cinq') P.eff.cinq[ici[1]] = entraine(P.eff.cinq[ici[1]], E.champion);
  else P.eff.banc = entraine(P.eff.banc, E.champion);
  majToi(P);
}

const refuser = pourquoi => { throw new Error(pourquoi); };
const exiger = (ok, pourquoi) => ok || refuser(pourquoi);

/* Ce que chaque action fait. Chacune vérifie qu'elle est permise, puis joue. */
const ACTIONS = {
  tirage(P, a, ctx) {
    exiger(P.etape === 'bati' && libresDe(P.eff).length, 'aucune case à combler');
    if (a.mode === 'tour') exiger(!P.tirage, 'un vestiaire est déjà ouvert');
    else exiger(P.tirage && RELANCES[a.mode] && P.relances[a.mode] < relancesMax(P, a.mode), 'plus de relance');
    const s = ctx.splits.get(a.id);
    const e = s.split.equipes.find(x => x.nom === a.e);
    exiger(e && signables(P.eff, e, s.profils.joueurs).length, 'personne à signer dans ce vestiaire');
    if (a.mode !== 'tour') P.relances[a.mode]++;
    P.tirage = { id: a.id, e: a.e };
  },
  signer(P, a, ctx) {
    const v = exiger(P.etape === 'bati' && vestiaireDe(P, ctx), 'aucun vestiaire ouvert');
    const j = signables(P.eff, v.equipe, v.profils.joueurs).find(x => x.n === a.n && x.r === a.r);
    exiger(j, `${a.n} ne se signe pas`);
    P.eff.cinq[j.r] = contratDe(ctx, { id: v.id, e: v.equipe.nom, n: j.n, r: j.r });
    collectionner(P, P.eff.cinq[j.r].ref);
    P.tirage = null;
  },
  lancer(P, a, ctx) {
    exiger(P.etape === 'bati' && !libresDe(P.eff).length, 'ton cinq n\'est pas complet');
    const adv = a.adversaires.map(({ id, e }) => {
      const { split, profils, tempo } = ctx.splits.get(id);
      return equipeReelle(split, split.equipes.find(x => x.nom === e), profils, tempo);
    });
    P.L = creerSplit([majToi(P), ...adv], { graine: a.graine, rondes: 2, bo: 1 });
    P.adversaires = a.adversaires;
    P.etape = 'split';
    // Le cadeau du proprio (un déblocage) : un pack argent au premier split de la run.
    if (P.run.n === 1 && P.fx.cadeau) P.cadeau = ouvrirPack(P.L, P.R, 'argent', { gratuit: true });
  },
  journee(P, a, ctx) {
    exiger(P.etape === 'split' && P.L.jour < P.L.journees.length, 'la saison est jouée');
    exiger(!enAttente(P), 'une décision t\'attend');
    jouerAvecToi(P, ctx, jouerJournee, a.rp);
  },
  jusqua(P, a, ctx) {
    exiger(P.etape === 'split' && P.L.jour < P.L.journees.length, 'la saison est jouée');
    // Jusqu'aux séries, ou jusqu'à la prochaine décision.
    while (P.L.jour < P.L.journees.length && !enAttente(P)) jouerAvecToi(P, ctx, jouerJournee);
  },
  series(P) {
    exiger(P.etape === 'split' && P.L.jour >= P.L.journees.length && !P.L.series, 'pas encore les séries');
    creerSeries(P.L);
  },
  ronde(P, a, ctx) {
    exiger(P.etape === 'split' && P.L.series && P.L.series.champion === null, 'aucune ronde à jouer');
    // Ta série de séries, partie par partie (version 3) ; d'avant, la ronde entière.
    jouerAvecToi(P, ctx, L => jouerRonde(L, P.v >= 3 ? 0 : null), a.rp);
  },
  pack(P, a) {
    exiger(P.etape === 'split', 'la boutique ouvre avec le split');
    return exiger(ouvrirPack(P.L, P.R, a.id), 'pas assez de jetons');
  },
  plan(P, a) { exiger(basculer(P.R, a.carte), 'le plan est plein'); },
  coach(P, a) { exiger(P.etape === 'split' && engager(P.L, P.R, a.id, prixDuCoach(P)), 'pas assez de jetons'); },
  marche(P, a, ctx) {
    exiger(P.etape === 'split' && marcheOuvert(P.L), 'le marché est fermé');
    const c = contratDe(ctx, a.ref);
    exiger(c.cout <= MARCHE.coutMax, 'trop cher pour un agent libre');
    exiger(placements(P.eff, c).some(x => x.place === a.place), 'au-dessus du plafond');
    if (!P.bons) exiger(jetonsDe(P.L, P.R) >= MARCHE.prix, 'pas assez de jetons');
    placer(P, c, a.place);
    if (P.bons) P.bons--;
    else P.R.achats.push({ quoi: 'marche', id: cleDe(a.ref), prix: MARCHE.prix });
  },
  /* Un pack de joueurs : trois vrais joueurs (tirés par js/gestion.js tirerPackJoueurs), qui entrent tous à ta collection. */
  packJoueurs(P, a) {
    exiger(P.etape === 'split' && marcheOuvert(P.L), 'les packs de joueurs se vendent jusqu\'à la date limite');
    exiger(PACKS_JOUEURS[a.id] && a.refs.length <= PACKS_JOUEURS[a.id].n, 'pack inconnu');
    const prix = prixPackJoueurs(P.R, a.id);
    exiger(jetonsDe(P.L, P.R) >= prix, 'pas assez de jetons');
    P.R.achats.push({ quoi: 'joueurs', id: a.id, prix });
    P.offrePack = { refs: a.refs, pris: false };
    for (const ref of a.refs) collectionner(P, ref);
  },
  /* Signer un des joueurs du dernier pack, sans frais, avant la journée suivante. */
  signerPack(P, a, ctx) {
    exiger(P.etape === 'split' && P.offrePack && !P.offrePack.pris && P.offrePack.refs.some(r => cleDe(r) === cleDe(a.ref)), 'ce joueur n\'est pas dans ton pack');
    placer(P, contratDe(ctx, a.ref), a.place);
    P.offrePack.pris = true;
  },
  permuter(P) {
    exiger(P.etape === 'split' && P.eff.banc, 'personne au banc');
    const b = P.eff.banc;
    P.eff.banc = P.eff.cinq[b.r];
    P.eff.cinq[b.r] = b;
    majToi(P);
  },
  entrainer(P, a, ctx) {
    exiger(P.etape === 'split' && P.L.jour < P.L.journees.length, 'on s\'entraîne pendant la saison');
    exiger(!P.entrainement, 'un entraînement est déjà en cours');
    const c = exiger(P.eff.cinq[a.r], 'personne à ce rôle');
    exiger(aTravailler(ctx.splits.get(c.ref.id).split, c).includes(a.champion), `${c.n} ne peut pas travailler ${a.champion}`);
    P.entrainement = { cle: cleDe(c.ref), n: c.n, champion: a.champion, debut: P.L.jour };
  },
  strategie(P, a) {
    exiger(a.id === null || STRATEGIES[a.id], 'stratégie inconnue');
    P.strategie = a.id;
  },
  relacher(P) {
    exiger(P.etape === 'split' && P.eff.banc, 'personne au banc');
    P.eff.banc = null;
  },
  evenement(P, a) {
    const e = exiger(enAttente(P), 'aucun événement');
    exiger(e.choix.includes(a.choix), 'ce choix n\'est pas offert');
    P.decisions[e.cle] = a.choix;
    const fait = EVENEMENTS[e.id].choix[a.choix][2];
    if (fait.commanditaire) P.L.commanditaire = fait.commanditaire;
    if (fait.jetons) P.R.primes.push({ cle: e.cle, jetons: fait.jetons });
    if (fait.bon) P.bons += fait.bon;
    if (fait.pack) return ouvrirPack(P.L, P.R, fait.pack, { gratuit: true });
    return null;
  },
  bilan(P) {
    exiger(P.etape === 'split' && P.L.series && P.L.series.champion !== null, 'le split n\'est pas fini');
    const L = P.L;
    const [cle] = mandatDuSplit(P);
    const rempli = mandatRempli(L, cle);
    const champion = L.series.champion === 0;
    const c = classement(L);
    const k = c.findIndex(l => l.i === 0);
    // Le palmarès du split, gravé : tes trophées, les galons de tes joueurs (à leur carte), tes records.
    const cles = new Map([...ROLES.map(r => P.eff.cinq[r]), P.eff.banc].filter(Boolean).map(x => [`${x.n}|${x.r}`, cleDe(x.ref)]));
    const trophees = tropheesDuSplit(L).filter(t => t.i === 0).map(({ id, n, r }) => ({ id, n, r }));
    const galons = galonsDuSplit(L).filter(g => cles.has(`${g.n}|${g.r}`)).map(g => ({ ...g, cle: cles.get(`${g.n}|${g.r}`) }));
    const rondes = L.series.rondes.flat().filter(s => s.gagnant === 0).length;
    // Le proprio patient (un déblocage) : le premier mandat manqué ne finit pas la run.
    const sursis = !rempli && !champion && P.run.sursis < P.fx.sursis;
    if (sursis) P.run.sursis++;
    P.run.passes.push({ n: P.run.n, mandat: cle, rempli, champion, rang: k + 1, fiche: [c[k].v, c[k].d], rondes, trophees, galons, records: recordsDuSplit(L), sursis });
    P.R.reports.push(gainsDe(L));
    P.dernier = L;
    P.L = null;
    P.entrainement = null;
    P.run.fin = champion ? 'gagnee' : rempli || sursis ? null : 'perdue';
    P.etape = P.run.fin ? 'fin' : 'gardes';
  },
  garder(P, a, ctx) {
    exiger(P.etape === 'gardes', 'pas le moment');
    const tous = [...ROLES.map(r => P.eff.cinq[r]), P.eff.banc].filter(Boolean);
    const gardes = tous.filter(c => a.cles.includes(cleDe(c.ref))).map(c => {
      // Le joueur qui vieillit : il devient sa version d'un split plus récent (le plus proche, js/gestion.js prochaineVersion).
      const ref = a.vieux && a.vieux[cleDe(c.ref)];
      if (!ref) return c;
      exiger(ref.n === c.n && ref.r === c.r && ctx.splits.get(ref.id).split.annee > ctx.splits.get(c.ref.id).split.annee, `${c.n} ne vieillit pas ainsi`);
      const v = contratDe(ctx, ref);
      collectionner(P, v.ref);
      return v;
    });
    exiger(gardes.length === a.cles.length && gardes.length <= gardesDe(P), `${gardesDe(P)} joueurs au plus`);
    const eff = { cinq: {}, banc: null, plafond: P.eff.plafond };
    for (const c of gardes) {
      if (eff.cinq[c.r]) eff.banc = c;
      else eff.cinq[c.r] = c;
    }
    // Ce qui reste du plafond doit encore payer les cases vides, au moins cher.
    exiger(signable(0, plafondDe(eff) - masseDe(eff), libresDe(eff).length + 1), 'ils coûtent trop : le cinq ne se compléterait pas');
    P.eff = eff;
    P.run.n++;
    P.relances = relancesNeuves();
    P.tirage = null;
    P.adversaires = [];
    P.dernier = null;
    P.etape = 'bati';
  },
};

/** Joue une action et l'inscrit au journal. Lance une erreur (et ne change rien au journal) si elle n'est pas permise. */
export function appliquer(P, a, ctx) {
  const f = ACTIONS[a.t];
  if (!f) refuser(`action inconnue : ${a.t}`);
  const r = f(P, a, ctx);
  P.log.push(JSON.parse(JSON.stringify(a)));
  return r;
}

/** Les splits qu'un journal nomme : à charger avant de le rejouer. */
export const refsDuJournal = log => [...new Set(log.flatMap(a => [a.id && a.t === 'tirage' ? a.id : null, ...(a.adversaires || []).map(x => x.id), a.ref ? a.ref.id : null,
  ...(a.refs || []).map(x => x.id), ...Object.values(a.vieux || {}).map(x => x.id)]).filter(Boolean))];

/** La sauvegarde : la graine, les déblocages et le club du départ, et le journal ; rien de compté. */
export const sauvegarde = P => ({ v: P.v, graine: P.graine, deb: P.deb, club: P.club, exig: P.exig, log: P.log });

/** Rejoue une sauvegarde (une d'avant le méta, la version 1, n'a ni déblocages ni club ; avant la 3, une série de séries se jouait d'un bloc). */
export function rejouer(sv, ctx) {
  const P = nouvellePartie(sv.graine, { deb: sv.deb || [], club: sv.club || null, exig: sv.exig || 0 });
  P.v = sv.v || 1;
  for (const a of sv.log) appliquer(P, a, ctx);
  return P;
}
