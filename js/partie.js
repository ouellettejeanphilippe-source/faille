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
 * Les étapes : 'bati' (ton cinq se bâtit), 'split' (la saison, puis les
 * séries), 'gardes' (le split est fini, le mandat rempli : le bilan), 'fin'
 * (la run est gagnée, ou le mandat manqué).
 *
 * LES DEUX MODES (Cap 82-0, js/meta.js MODES). Le 18-0 : la roulette et le
 * vestiaire bâtissent ton cinq, le split se joue d'un coup, les séries partie
 * par partie ; aucune carte, aucun coach, aucune décision, aucun jeton. Le
 * Rogue PART FAIBLE : au départ d'une run, tes CASES — ton joueur de
 * concession, qui prend la case du haut du classeur, puis des lotos de trois
 * cartes de ta collection par niveau dont tu gardes une ou aucune, sous le
 * plafond — puis le PACK DE DÉPART de bouche-trous comble les rôles vides
 * (js/gestion.js) ; entre deux splits, ceux qui restent se tirent au loto par
 * niveau, jamais au choix (Cap 82-0 : *garder des joueurs de run en run
 * devrait être fait dans une loto*).
 *
 * LE PROPRIO juge le rang du split (js/gestion.js MANDATS) ; le premier split
 * de ta première run laisse bâtir (`premiere`, posé au départ). LE PLAN DE
 * MATCH change la forme d'une partie, pas sa force (js/strategie.js PLANS),
 * contre l'adversaire du soir. LA MAIN DE TON COACH (version 9, Cap 82-0
 * V22, js/adjoints.js) : des adjoints offerts un parmi trois, que tu postes
 * pour un séjour ; le staff et le plan de jeu de quinze cartes sont partis.
 *
 * LES VIEILLES PARTIES (version 9, la Q10 ; Cap 82-0 : *la saison en cours se
 * rejoue*) : une partie en cours se rejoue avec les règles d'aujourd'hui, et
 * un geste que le jeu ne connaît plus — une carte au plan, un pack de cartes,
 * un adjoint du staff, un gardé au choix — s'ignore (`P.ignores` les compte,
 * l'écran le dit une fois). Seul le moteur reste celui de sa version : une
 * partie d'avant la version 6 joue celui d'alors (js/moteur-v1.js, gelé).
 * La version d'une sauvegarde ne choisit plus que son moteur ; le méta n'est
 * jamais réécrit (js/meta.js `noter`).
 */
import { melangerTempos } from './canaux.js';
import { joueurDuMoteur, equipeReelle, creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from './sim.js';
import { repecherPartie, attendRepechage } from './repechage.js';
import { PLANS, effetDuPlan, anneeEntre } from './strategie.js';
import { PLAFOND, TARIFS, signable } from './cotes.js';
import { nouveauRogue, effetsDeToi, pouvoirsDuPersonnage, xpDe, niveauDe, liensDe, noterJoue, jetonsDe, COACHS, NIVEAU_DES_TALENTS } from './rogue.js';
import { ADJOINTS, JOURNEES_ADJOINTS, adjointsOfferts, quiPartDeLaMain, etatDe, casesLibres, casesDuNiveau, effetsDesPostes, sejoursDe } from './adjoints.js';
import { hasard, graineDe } from './hasard.js';
import { RELANCES, MARCHE, ENTRAINEMENT, PACKS_JOUEURS, NIVEAUX_BOUCHE_TROUS, libresDe, masseDe, plafondDe, signables, placements, cleDe, marcheOuvert, mandatDe, mandatRempli, MANDAT_DU_DIXHUIT, gainsDe, EVENEMENTS, evenementEnAttente, aTravailler, entraine, prixPackJoueurs } from './gestion.js';
import { effetDe, MODES } from './meta.js';
import { tropheesDuSplit, galonsDuSplit, recordsDuSplit } from './palmares.js';

export const GARDES = 2;
export const VERSION = 9;
/** Un loto : trois cartes, tu en gardes une ou aucune. */
export const LOTO = 3;
/* Les niveaux des cases de ceux qui restent, dans l'ordre où elles s'ouvrent (GARDES, plus le noyau). */
const NIVEAUX_RESTES = ['Pilier', 'Régulier', '★ Étoile', '★ Phénomène', 'Remplaçant'];
const ORDRE_NIVEAUX = TARIFS.map(([n]) => n);
const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
/* Le club d'une partie sans club (une sauvegarde d'avant le méta). */
const CLUB_DEPART = { nom: 'Ton cinq', code: 'TOI', couleur: null };

const relancesNeuves = () => Object.fromEntries(Object.keys(RELANCES).map(k => [k, 0]));

/**
 * Une partie neuve. `mode` : 'rogue' ou 'dixhuit' (js/meta.js MODES) ; au
 * 18-0, rien du méta ne se pose (ni déblocage, ni exigence, ni coach).
 * `deb` : les déblocages du méta (js/meta.js), posés au départ et gardés dans
 * la sauvegarde ; `club` : { nom, code, couleur } ; `exig` : le cran des
 * exigences (0 : aucune) ; `coach` : le coach-personnage qui fait la run (un
 * id de COACHS, js/rogue.js) ; `col` : ta collection au départ, [{ cle,
 * niveau }], d'où le classeur tire ses lotos ; `vedette` : la clé de ton
 * joueur de concession, qui ouvre la première case de la run ; `premiere` :
 * ta première run de Rogue, dont le premier split laisse bâtir.
 */
export function nouvellePartie(graine, { deb = [], club = null, exig = 0, coach = null, mode = 'rogue', col = [], vedette = null, premiere = false } = {}) {
  const rogue = mode !== 'dixhuit';
  const fx = effetDe(rogue ? deb : [], rogue ? exig : 0);
  const P = {
    v: VERSION, graine, mode: MODES[mode] ? mode : 'rogue', log: [], etape: 'bati', deb: rogue ? [...deb] : [], club: club || CLUB_DEPART, exig: rogue ? exig : 0, fx,
    coach: rogue ? coach : null, talents: [], main: [], offres: [], ignores: 0,
    col: rogue ? col.map(({ cle, niveau }) => ({ cle, niveau })) : [], vedette: rogue ? vedette : null, premiere: rogue && !!premiere, cases: [], bouches: false, restes: [],
    run: { n: 1, passes: [], fin: null, sursis: 0 },
    R: { ...nouveauRogue(graine), cherte: fx.cherte },
    eff: { cinq: {}, banc: null, plafond: PLAFOND + fx.plafond },
    tirage: null, relances: relancesNeuves(),
    L: null, dernier: null, adversaires: [], decisions: {}, bons: 0, entrainement: null, strategie: null,
    cartes: [], offrePack: null,
  };
  if (fx.jetons) P.R.primes.push({ cle: 'depart', jetons: fx.jetons });
  if (P.coach) P.R.coach = { id: P.coach, depuis: 0 };
  return P;
}

/** Le Rogue part de ses cases ; le 18-0, de la roulette. */
export const parCases = P => P.mode !== 'dixhuit';
/** La ref d'une clé de carte (js/gestion.js cleDe). */
export const refDe = cle => { const [id, e, n, r] = cle.split('|'); return { id, e, n, r }; };

/*
 * LES CASES d'un départ, dans l'ordre : au premier split de la run, ton joueur
 * de concession (s'il y en a un), puis le classeur — une case ★ Étoile et une
 * case Pilier par déblocage, une case Régulier toujours ; l'exigence « Le
 * classeur mince » retire la meilleure. Ta vedette prend la case du haut
 * (Cap 82-0, `departDuClasseur` : en plus d'elle, l'attentif gagnait son
 * premier titre dès la deuxième run). Entre deux splits, ceux qui restent :
 * GARDES cases (le noyau en ajoute une, le vestiaire mince en retire une),
 * Pilier puis Régulier puis ★ Étoile, tirées de ton effectif du split fini.
 * Chaque case : { id, niveau, source } — source : 'vedette', 'col', 'restes'.
 */
export function casesDe(P) {
  if (!parCases(P)) return [];
  if (P.run.n === 1) {
    const prend = P.vedette ? 1 : 0;
    const classeur = [...Array(Math.max(0, P.fx.etoile)).fill('★ Étoile'), ...Array(Math.max(0, P.fx.pilier)).fill('Pilier'), 'Régulier'].slice(Math.max(0, -P.fx.cases) + prend);
    return [...(P.vedette ? [{ id: 'vedette', niveau: null, source: 'vedette' }] : []), ...classeur.map((niveau, k) => ({ id: `classeur-${k}`, niveau, source: 'col' }))];
  }
  return NIVEAUX_RESTES.slice(0, Math.max(0, GARDES + P.fx.gardes)).map((niveau, k) => ({ id: `restes-${k}`, niveau, source: 'restes' }));
}

/**
 * LE LOTO d'une case (pur) : jusqu'à LOTO cartes de son niveau — sinon du
 * niveau d'en dessous, et ainsi de suite — parmi sa source, hors des rôles
 * comblés et des cartes déjà prises ou offertes dans ce départ ; tirées du
 * dé de la run et de la case : recharger redonne les mêmes. Rend [{ cle, niveau }].
 */
export function lotoDe(P, k) {
  const c = casesDe(P)[k];
  if (!c) return [];
  if (c.source === 'vedette') return [{ cle: P.vedette, niveau: null }];
  const pris = new Set([...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(x => cleDe(x.ref)).concat(P.cases.filter(Boolean)));
  const libres = libresDe(P.eff);
  const pool = (c.source === 'restes' ? P.restes : P.col).filter(x => !pris.has(x.cle) && libres.includes(x.cle.split('|')[3]));
  const de = hasard(graineDe(P.graine, `loto-${P.run.n}-${k}`));
  for (let i = ORDRE_NIVEAUX.indexOf(c.niveau); i < ORDRE_NIVEAUX.length; i++) {
    const du = pool.filter(x => x.niveau === ORDRE_NIVEAUX[i]);
    if (!du.length) continue;
    for (let j = du.length - 1; j > 0; j--) { const m = Math.floor(de() * (j + 1)); [du[j], du[m]] = [du[m], du[j]]; }
    return du.slice(0, LOTO);
  }
  return [];
}
/** La case qui attend ton geste, ou null : { k, ...case, loto } ; après la dernière, le pack de départ. */
export function caseEnCours(P) {
  const cases = casesDe(P);
  const k = P.cases.length;
  return P.etape === 'bati' && k < cases.length ? { k, ...cases[k], loto: lotoDe(P, k) } : null;
}
/** Le pack de départ attend : toutes les cases passées, des rôles encore vides, pas encore ouvert. */
export const attendPack = P => parCases(P) && P.etape === 'bati' && !caseEnCours(P) && !P.bouches && libresDe(P.eff).length > 0;

/** Les relances d'une sorte qu'un repêchage permet. */
export const relancesMax = (P, k) => RELANCES[k][1];
/** Combien de joueurs restent d'un split à l'autre : les cases de ceux qui restent. */
export const gardesDe = P => GARDES + P.fx.gardes;
/** Le mandat du split n de la run, monté par les exigences : [clé, en mots, …]. Au 18-0, le titre. */
export const mandatDuSplit = (P, n = P.run.n) => (P.mode === 'dixhuit' ? MANDAT_DU_DIXHUIT : mandatDe(n, P.fx.mandat, P.premiere));
/** Combien d'agents libres le dépisteur trouve par journée. */
export const offreDe = P => MARCHE.offre + P.fx.offre;


/** Le coach-personnage : son expérience, son niveau, ce qui manque pour le suivant. */
export function coachDeLaPartie(P) {
  const xp = xpDe(P.L, P.R, P.fx.xp);
  return { id: P.R.coach && P.R.coach.id, xp, ...niveauDe(xp) };
}

/* Les pouvoirs que ton coach joue maintenant : son niveau et ses talents. */
const pouvoirsDeLaPartie = P => (P.R.coach ? pouvoirsDuPersonnage(P.R.coach.id, coachDeLaPartie(P).n, P.talents) : []);

/* Un talent à choisir : un par niveau de NIVEAU_DES_TALENTS atteint, sur un des trois pouvoirs qui n'en a pas encore. */
function talentEnAttente(P) {
  if (!P.R.coach) return null;
  const dus = NIVEAU_DES_TALENTS.filter(n => coachDeLaPartie(P).n >= n).length;
  if (P.talents.length >= dus) return null;
  const choix = COACHS[P.R.coach.id].pouvoirs.map(x => x.id).filter(id => !P.talents.includes(id));
  return choix.length ? { cle: `talent-${P.talents.length}`, id: 'talent', choix } : null;
}

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

/*
 * LA MAIN DE TON COACH (version 9, js/adjoints.js) : aux journées
 * JOURNEES_ADJOINTS de chaque split, au cadeau du proprio et dans une
 * histoire (`P.offres`), un adjoint parmi trois, gratuit, entre dans ta main ;
 * une main pleine laisse partir la plus ancienne hors poste (`part`). Tu en
 * postes une quand une case est libre ; son séjour se compte en séries jouées.
 */
const coachId = P => (P.R.coach ? P.R.coach.id : null);
function adjointEnAttente(P) {
  if (!P.L || P.L.series) return null;
  const cle = [...JOURNEES_ADJOINTS.filter(j => P.L.jour >= j).map(j => `${P.run.n}-adjoint-${j}`), ...P.offres].find(k => !(k in P.decisions));
  if (!cle) return null;
  return { cle, id: 'adjoint', choix: [...adjointsOfferts(P.main, P.graine, cle), 'aucun'], part: quiPartDeLaMain(P.main, P.R.joue.length, coachId(P)) };
}
/** Ta main, carte par carte : { cle, etat ('poste', 'repos', 'prete'), reste (en journées), sejours } ; et tes cases en poste. */
export function mainDeLaPartie(P) {
  const g = P.R.joue.length, co = coachId(P), n = coachDeLaPartie(P).n;
  return {
    cartes: P.main.map(c => ({ cle: c.cle, ...etatDe(c, g, co), sejours: sejoursDe(c, P.R.joue, co) })),
    cases: casesDuNiveau(n), libres: casesLibres(P.main, g, co, n),
  };
}

/** L'événement que la partie attend (un événement de la gestion, un talent du coach, un adjoint offert), ou null. Rien au 18-0. */
export const enAttente = P => (P.etape === 'split' && P.mode !== 'dixhuit' ? evenementEnAttente(P.L, P.decisions, P.run.n) || talentEnAttente(P) || adjointEnAttente(P) : null);

/*
 * Joue ce qui vient avec ton plan de match et tes adjoints en poste, ta partie
 * repêchée d'abord (`rp` : tes bannissements et tes choix ; absent,
 * l'automatique). Ta série de séries se joue partie par partie, un repêchage
 * avant chacune.
 */
function jouerAvecToi(P, ctx, jouer, rp) {
  const L = P.L;
  P.offrePack = null;
  const s = taSerie(L);
  const options = rp ? { mesBans: rp.bans, mesChoix: rp.choix } : {};
  if (s && attendRepechage(s)) repecherPartie(L, s, ctx.classes, options);
  // Ton plan contre l'adversaire du soir, dans l'année de leur partie ; tes adjoints en poste, pour la série qui vient.
  const plan = s && effetDuPlan(P.strategie, anneeEntre(L.equipes[0], L.equipes[s.a === 0 ? s.b : s.a]));
  L.equipes[0].effets = effetsDeToi(liensDe(P.eff.cinq), plan, effetsDesPostes(P.main, P.R.joue.length, coachId(P)));
  L.equipes[0].pouvoirs = pouvoirsDeLaPartie(P);
  jouer(L);
  if (s && s.gagnant !== null) noterJoue(P.R, s.gagnant === 0);
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
const pasAuDixHuit = P => exiger(P.mode !== 'dixhuit', 'pas au 18-0 : aucune carte, aucune décision');

/* Un joueur entre à un rôle vide de ton cinq, s'il se paie (le reste du plafond paie encore les cases vides). */
function entrer(P, c) {
  exiger(!P.eff.cinq[c.r], `${ROLES_MOTS[c.r]} comblé`);
  exiger(![...Object.values(P.eff.cinq), P.eff.banc].some(x => x && cleDe(x.ref) === cleDe(c.ref)), 'déjà chez toi');
  exiger(signable(c.cout, plafondDe(P.eff) - masseDe(P.eff), libresDe(P.eff).length), 'trop cher : le cinq ne se compléterait pas');
  P.eff.cinq[c.r] = c;
  collectionner(P, c.ref);
}
const ROLES_MOTS = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };

/* Ce que chaque action fait. Chacune vérifie qu'elle est permise, puis joue. */
const ACTIONS = {
  tirage(P, a, ctx) {
    exiger(!parCases(P), 'le Rogue part de tes cases et de ton pack de départ');
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
    exiger(!parCases(P), 'le Rogue part de tes cases et de ton pack de départ');
    const v = exiger(P.etape === 'bati' && vestiaireDe(P, ctx), 'aucun vestiaire ouvert');
    const j = signables(P.eff, v.equipe, v.profils.joueurs).find(x => x.n === a.n && x.r === a.r);
    exiger(j, `${a.n} ne se signe pas`);
    P.eff.cinq[j.r] = contratDe(ctx, { id: v.id, e: v.equipe.nom, n: j.n, r: j.r });
    collectionner(P, P.eff.cinq[j.r].ref);
    P.tirage = null;
  },
  /*
   * UNE CASE du départ (Rogue, version 5) : `cle`, une carte de son loto, ou
   * null pour passer ; `vieux` : pour une carte de ceux qui restent, la ref de
   * sa version d'un split plus récent (le joueur qui vieillit).
   */
  case(P, a, ctx) {
    const c = exiger(caseEnCours(P), 'aucune case à ouvrir');
    if (a.cle === null) { P.cases.push(null); return; }
    exiger(c.loto.some(x => x.cle === a.cle), 'cette carte n\'est pas au loto');
    let v = contratDe(ctx, refDe(a.cle));
    if (a.vieux) {
      exiger(c.source === 'restes' && a.vieux.n === v.n && a.vieux.r === v.r && ctx.splits.get(a.vieux.id).split.annee > ctx.splits.get(v.ref.id).split.annee, `${v.n} ne vieillit pas ainsi`);
      v = contratDe(ctx, a.vieux);
    }
    entrer(P, v);
    P.cases.push(a.cle);
  },
  /* LE PACK DE DÉPART : un bouche-trou par rôle vide (js/gestion.js tirerBoucheTrous), chacun à ton effectif et à ta collection. */
  boucheTrous(P, a, ctx) {
    exiger(attendPack(P), 'le pack de départ s\'ouvre après tes cases');
    const libres = libresDe(P.eff);
    exiger(a.refs.length === libres.length && libres.every(r => a.refs.filter(x => x.r === r).length === 1), 'un bouche-trou par rôle vide');
    for (const ref of a.refs) {
      const c = contratDe(ctx, ref);
      exiger(NIVEAUX_BOUCHE_TROUS.has(c.niveau), `${c.n} n'est pas un bouche-trou`);
      entrer(P, c);
    }
    P.bouches = true;
  },
  lancer(P, a, ctx) {
    exiger(P.etape === 'bati' && !libresDe(P.eff).length, 'ton cinq n\'est pas complet');
    const adv = a.adversaires.map(({ id, e }) => {
      const { split, profils, tempo } = ctx.splits.get(id);
      return equipeReelle(split, split.equipes.find(x => x.nom === e), profils, tempo);
    });
    // Le moteur (version 6) : une partie comme une vraie ; une partie d'avant garde le moteur gelé, pour se rejouer pareil.
    P.L = creerSplit([majToi(P), ...adv], { graine: a.graine, rondes: 2, bo: 1, moteur: P.v >= 6 ? 2 : 1 });
    P.adversaires = a.adversaires;
    P.etape = 'split';
    // Le cadeau du proprio (un déblocage) : un adjoint de plus offert, au premier split de la run.
    if (P.run.n === 1 && P.fx.cadeau) P.offres.push(`${P.run.n}-cadeau`);
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
    // Ta série de séries, partie par partie.
    jouerAvecToi(P, ctx, L => jouerRonde(L, 0), a.rp);
  },
  /* POSTER UN ADJOINT : une carte prête de ta main, sur une case libre ; son séjour commence à la prochaine série. */
  poster(P, a) {
    pasAuDixHuit(P);
    exiger(P.etape === 'split', 'un adjoint se poste pendant le split');
    const c = exiger(P.main.find(x => x.cle === a.cle), 'cet adjoint n\'est pas dans ta main');
    const g = P.R.joue.length, co = coachId(P);
    exiger(etatDe(c, g, co).etat === 'prete', `${ADJOINTS[c.cle].nom} n'est pas prêt`);
    exiger(casesLibres(P.main, g, co, coachDeLaPartie(P).n) > 0, 'aucune case libre : ton coach n\'en a pas d\'autre à son niveau');
    P.main = P.main.map(x => (x === c ? { ...x, poses: [...x.poses, g] } : x));
  },
  marche(P, a, ctx) {
    pasAuDixHuit(P);
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
    pasAuDixHuit(P);
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
    pasAuDixHuit(P);
    exiger(P.etape === 'split' && P.L.jour < P.L.journees.length, 'on s\'entraîne pendant la saison');
    exiger(!P.entrainement, 'un entraînement est déjà en cours');
    const c = exiger(P.eff.cinq[a.r], 'personne à ce rôle');
    exiger(aTravailler(ctx.splits.get(c.ref.id).split, c).includes(a.champion), `${c.n} ne peut pas travailler ${a.champion}`);
    P.entrainement = { cle: cleDe(c.ref), n: c.n, champion: a.champion, debut: P.L.jour };
  },
  strategie(P, a) {
    pasAuDixHuit(P);
    exiger(a.id === null || PLANS[a.id], 'plan inconnu');
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
    // Un talent : le pouvoir choisi grandit, ouvert ou pas encore.
    if (e.id === 'talent') { P.talents.push(a.choix); return null; }
    // Un adjoint : il entre dans ta main, neuf ; une main pleine laisse partir la plus ancienne hors poste.
    if (e.id === 'adjoint') {
      if (a.choix !== 'aucun') P.main = [...P.main.filter(c => c.cle !== e.part), { cle: a.choix, poses: [] }];
      return null;
    }
    const fait = EVENEMENTS[e.id].choix[a.choix][2];
    if (fait.commanditaire) P.L.commanditaire = fait.commanditaire;
    if (fait.jetons) P.R.primes.push({ cle: e.cle, jetons: fait.jetons });
    if (fait.bon) P.bons += fait.bon;
    // Revoir le staff : un adjoint offert, la journée même.
    if (fait.adjoint) P.offres.push(`${P.run.n}-histoire-${P.L.jour}`);
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
    // Le 18-0 : un seul split, gagné par le titre ou fini.
    P.run.fin = champion ? 'gagnee' : P.mode === 'dixhuit' || !(rempli || sursis) ? 'perdue' : null;
    P.etape = P.run.fin ? 'fin' : 'gardes';
    // Ceux qui restent : ton effectif du split fini, d'où les cases du prochain départ tirent leurs lotos.
    if (parCases(P)) P.restes = [...ROLES.map(r => P.eff.cinq[r]), P.eff.banc].filter(Boolean).map(x => ({ cle: cleDe(x.ref), niveau: x.niveau }));
  },
  /* LE SPLIT SUIVANT (Rogue) : le bilan est lu ; ton effectif se vide, et le prochain départ ouvre ses cases parmi ceux qui restent. */
  suivant(P) {
    exiger(parCases(P) && P.etape === 'gardes', 'pas le moment');
    P.eff = { cinq: {}, banc: null, plafond: P.eff.plafond };
    P.cases = [];
    P.bouches = false;
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
  ...(a.refs || []).map(x => x.id), a.t === 'case' && a.cle ? a.cle.split('|')[0] : null, a.t === 'case' && a.vieux ? a.vieux.id : null]).filter(Boolean))];

/** La sauvegarde : la graine, le mode, les déblocages et le club du départ, ta collection et ta vedette d'alors, et le journal ; rien de compté. */
export const sauvegarde = P => ({ v: P.v, graine: P.graine, mode: P.mode, deb: P.deb, club: P.club, exig: P.exig, coach: P.coach, col: P.col, vedette: P.vedette, premiere: P.premiere, log: P.log });

/*
 * Un geste du journal, rejoué. Une décision des règles d'aujourd'hui que la partie d'avant n'a pas connue (un adjoint
 * offert à une autre journée, un événement qui tombe ailleurs) l'arrêterait : elle se prend d'office — personne pour
 * un adjoint, le premier choix sinon —, et le geste se rejoue. Faux si le geste ne joue plus.
 */
function rejouerUn(P, a, ctx) {
  for (let k = 0; k < 4; k++) {
    try { appliquer(P, a, ctx); return true; } catch { /* une décision d'aujourd'hui l'attend peut-être */ }
    const ev = a.t !== 'evenement' && enAttente(P);
    if (!ev) return false;
    try { appliquer(P, { t: 'evenement', choix: ev.id === 'adjoint' ? 'aucun' : ev.choix[0] }, ctx); } catch { return false; }
  }
  return false;
}

/**
 * Rejoue une sauvegarde, avec les règles d'aujourd'hui (la Q10). Une d'avant le méta (version 1) n'a ni déblocages ni
 * club. Un geste que le jeu ne connaît plus, ou qu'il refuse maintenant, s'ignore et se compte (`P.ignores`) ; une
 * partie d'aujourd'hui n'en a aucun, et se rejoue à l'identique. Seule la version de son moteur reste la sienne.
 */
export function rejouer(sv, ctx) {
  const P = nouvellePartie(sv.graine, { deb: sv.deb || [], club: sv.club || null, exig: sv.exig || 0, coach: sv.coach || null, mode: sv.mode || 'rogue', col: sv.col || [], vedette: sv.vedette || null, premiere: !!sv.premiere });
  P.v = sv.v || 1;
  for (const a of sv.log) if (!rejouerUn(P, a, ctx)) P.ignores++;
  return P;
}
