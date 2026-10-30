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
 * Rogue (version 5) PART FAIBLE : au départ d'une run, tes CASES — ton joueur
 * de concession, puis le classeur, des lotos de trois cartes de ta collection
 * par niveau dont tu gardes une ou aucune, sous le plafond — puis le PACK DE
 * DÉPART de bouche-trous comble les rôles vides (js/gestion.js) ; entre deux
 * splits, ceux qui restent se tirent au loto par niveau, jamais au choix
 * (Cap 82-0 : *garder des joueurs de run en run devrait être fait dans une
 * loto*). Une partie d'avant la version 5 garde sa roulette et ses gardés.
 */
import { joueurDuMoteur, equipeReelle, melangerTempos, creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from './sim.js';
import { repecher, repecherPartie, attendRepechage } from './repechage.js';
import { STRATEGIES, effetDeStrategie } from './strategie.js';
import { PLAFOND, TARIFS, signable } from './cotes.js';
import { nouveauRogue, ouvrirPack, basculer, engager, effetsDeToi, pouvoirsDeToi, pouvoirsDuPersonnage, xpDe, niveauDe, liensDe, noterJoue, jetonsDe, PRIX_COACH, COACHS, NIVEAU_DES_TALENTS, ADJOINTS, ADJOINTS_MAX } from './rogue.js';
import { hasard, graineDe } from './hasard.js';
import { RELANCES, MARCHE, ENTRAINEMENT, PACKS_JOUEURS, NIVEAUX_BOUCHE_TROUS, libresDe, masseDe, plafondDe, signables, placements, cleDe, marcheOuvert, mandatDe, mandatRempli, gainsDe, EVENEMENTS, evenementEnAttente, aTravailler, entraine, prixPackJoueurs } from './gestion.js';
import { effetDe, MODES } from './meta.js';
import { tropheesDuSplit, galonsDuSplit, recordsDuSplit } from './palmares.js';

export const GARDES = 2;
export const VERSION = 5;
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
 * joueur de concession, qui ouvre la première case de la run.
 */
export function nouvellePartie(graine, { deb = [], club = null, exig = 0, coach = null, mode = 'rogue', col = [], vedette = null } = {}) {
  const rogue = mode !== 'dixhuit';
  const fx = effetDe(rogue ? deb : [], rogue ? exig : 0);
  const P = {
    v: VERSION, graine, mode: MODES[mode] ? mode : 'rogue', log: [], etape: 'bati', deb: rogue ? [...deb] : [], club: club || CLUB_DEPART, exig: rogue ? exig : 0, fx,
    coach: rogue ? coach : null, talents: [], staff: [], enTrop: null,
    col: rogue ? col.map(({ cle, niveau }) => ({ cle, niveau })) : [], vedette: rogue ? vedette : null, cases: [], bouches: false, restes: [],
    run: { n: 1, passes: [], fin: null, sursis: 0 },
    R: { ...nouveauRogue(graine), cherte: fx.cherte },
    eff: { cinq: {}, banc: null, plafond: PLAFOND + fx.plafond },
    tirage: null, relances: relancesNeuves(),
    L: null, dernier: null, adversaires: [], decisions: {}, bons: 0, entrainement: null, strategie: null,
    cartes: [], cadeau: null, offrePack: null,
  };
  if (fx.jetons) P.R.primes.push({ cle: 'depart', jetons: fx.jetons });
  if (P.coach) P.R.coach = { id: P.coach, depuis: 0 };
  return P;
}

/** Le Rogue qui part de ses cases (version 5) ; faux au 18-0 et dans une partie d'avant, qui garde sa roulette. */
export const parCases = P => P.mode !== 'dixhuit' && P.v >= 5;
/** La ref d'une clé de carte (js/gestion.js cleDe). */
export const refDe = cle => { const [id, e, n, r] = cle.split('|'); return { id, e, n, r }; };

/*
 * LES CASES d'un départ, dans l'ordre : au premier split de la run, ton joueur
 * de concession (s'il y en a un), puis le classeur — une case ★ Étoile et une
 * case Pilier par déblocage, une case Régulier toujours ; l'exigence « Le
 * classeur mince » retire la meilleure. Entre deux splits, ceux qui restent :
 * GARDES cases (le noyau en ajoute une, le vestiaire mince en retire une),
 * Pilier puis Régulier puis ★ Étoile, tirées de ton effectif du split fini.
 * Chaque case : { id, niveau, source } — source : 'vedette', 'col', 'restes'.
 */
export function casesDe(P) {
  if (!parCases(P)) return [];
  if (P.run.n === 1) {
    const classeur = [...Array(Math.max(0, P.fx.etoile)).fill('★ Étoile'), ...Array(Math.max(0, P.fx.pilier)).fill('Pilier'), 'Régulier'].slice(Math.max(0, -P.fx.cases));
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
/** Combien de joueurs restent d'un split à l'autre (avant la version 5 : les gardés ; depuis : les cases de ceux qui restent). */
export const gardesDe = P => GARDES + P.fx.gardes;
/** Le mandat du split n de la run, monté par les exigences : [clé, en mots]. Au 18-0, le titre. */
export const mandatDuSplit = (P, n = P.run.n) => (P.mode === 'dixhuit' ? mandatDe(4) : mandatDe(n, P.fx.mandat));
/** Combien d'agents libres le dépisteur trouve par journée. */
export const offreDe = P => MARCHE.offre + P.fx.offre;

/** (Avant la version 4) ce que coûte le prochain coach : rien pour le premier de la run avec le déblocage du coach. */
export const prixDuCoach = P => (P.fx.coachGratuit && !P.R.achats.some(x => x.quoi === 'coach') ? 0 : PRIX_COACH);

/** Le coach-personnage (version 4) : son expérience, son niveau, ce qui manque pour le suivant. */
export function coachDeLaPartie(P) {
  const xp = xpDe(P.L, P.R, P.fx.xp);
  return { id: P.R.coach && P.R.coach.id, xp, ...niveauDe(xp) };
}

/* Les pouvoirs que ton coach joue maintenant : son niveau et ses talents ; avant la version 4, ses paliers de confiance. */
const pouvoirsDeLaPartie = P => (P.v >= 4 ? (P.R.coach ? pouvoirsDuPersonnage(P.R.coach.id, coachDeLaPartie(P).n, P.talents) : []) : pouvoirsDeToi(P.R));

/* Un talent à choisir : un par niveau de NIVEAU_DES_TALENTS atteint, sur un des trois pouvoirs qui n'en a pas encore. */
function talentEnAttente(P) {
  if (P.v < 4 || !P.R.coach) return null;
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
 * LE STAFF (version 4) : aux journées JOURNEES_ADJOINTS de chaque split, ton
 * coach se voit offrir un adjoint parmi trois (pas déjà au staff), tirés de la
 * graine de la run ; tu en prends un, ou personne. Le staff tient
 * ADJOINTS_MAX ; un de plus, et « qui part ? » attend.
 */
export const JOURNEES_ADJOINTS = [6, 12];
export function adjointsOfferts(P, cle) {
  const de = hasard(graineDe(P.graine, `adjoints-${cle}`));
  const libres = Object.keys(ADJOINTS).filter(id => !P.staff.includes(id));
  for (let i = libres.length - 1; i > 0; i--) { const k = Math.floor(de() * (i + 1)); [libres[i], libres[k]] = [libres[k], libres[i]]; }
  return libres.slice(0, 3);
}
function adjointEnAttente(P) {
  if (P.v < 4 || !P.L || P.L.series) return null;
  if (P.enTrop) return { cle: `${P.run.n}-quiPart-${P.staff.length}`, id: 'quiPart', choix: [...P.staff, P.enTrop] };
  const j = JOURNEES_ADJOINTS.find(x => P.L.jour >= x && !(`${P.run.n}-adjoint-${x}` in P.decisions));
  if (j === undefined) return null;
  const cle = `${P.run.n}-adjoint-${j}`;
  return { cle, id: 'adjoint', choix: [...adjointsOfferts(P, cle), 'aucun'] };
}

/** L'événement que la partie attend (un événement de la gestion, un talent du coach, un adjoint pour le staff), ou null. Rien au 18-0. */
export const enAttente = P => (P.etape === 'split' && P.mode !== 'dixhuit' ? evenementEnAttente(P.L, P.decisions, P.run.n) || talentEnAttente(P) || adjointEnAttente(P) : null);

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
  L.equipes[0].effets = effetsDeToi(P.R, liensDe(P.eff.cinq), effetDeStrategie(P.strategie, L.equipes[0].cinq), P.staff);
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
    pasAuDixHuit(P);
    exiger(P.etape === 'split', 'la boutique ouvre avec le split');
    return exiger(ouvrirPack(P.L, P.R, a.id), 'pas assez de jetons');
  },
  plan(P, a) { pasAuDixHuit(P); exiger(basculer(P.R, a.carte), 'le plan est plein'); },
  // Avant la version 4, un coach s'achetait ; depuis, ton coach fait la run.
  coach(P, a) {
    exiger(P.v < 4, 'ton coach fait la run');
    exiger(P.etape === 'split' && engager(P.L, P.R, a.id, prixDuCoach(P)), 'pas assez de jetons');
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
    // Un talent : le pouvoir choisi grandit, ouvert ou pas encore.
    if (e.id === 'talent') { P.talents.push(a.choix); return null; }
    // Un adjoint : il entre au staff ; un de trop, et « qui part ? » attend. Qui part : le choisi quitte le staff.
    if (e.id === 'adjoint') {
      if (a.choix !== 'aucun') { if (P.staff.length < ADJOINTS_MAX) P.staff.push(a.choix); else P.enTrop = a.choix; }
      return null;
    }
    if (e.id === 'quiPart') {
      P.staff = [...P.staff, P.enTrop].filter(id => id !== a.choix);
      P.enTrop = null;
      return null;
    }
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
    // Le 18-0 : un seul split, gagné par le titre ou fini.
    P.run.fin = champion ? 'gagnee' : P.mode === 'dixhuit' || !(rempli || sursis) ? 'perdue' : null;
    P.etape = P.run.fin ? 'fin' : 'gardes';
    // Ceux qui restent (version 5) : ton effectif du split fini, d'où les cases du prochain départ tirent leurs lotos.
    if (parCases(P)) P.restes = [...ROLES.map(r => P.eff.cinq[r]), P.eff.banc].filter(Boolean).map(x => ({ cle: cleDe(x.ref), niveau: x.niveau }));
  },
  /* LE SPLIT SUIVANT (Rogue, version 5) : le bilan est lu ; ton effectif se vide, et le prochain départ ouvre ses cases parmi ceux qui restent. */
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
  garder(P, a, ctx) {
    exiger(!parCases(P), 'ceux qui restent se tirent au loto');
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
  ...(a.refs || []).map(x => x.id), a.t === 'case' && a.cle ? a.cle.split('|')[0] : null, a.t === 'case' && a.vieux ? a.vieux.id : null,
  ...(a.t === 'garder' ? Object.values(a.vieux || {}).map(x => x.id) : [])]).filter(Boolean))];

/** La sauvegarde : la graine, le mode, les déblocages et le club du départ, ta collection et ta vedette d'alors, et le journal ; rien de compté. */
export const sauvegarde = P => ({ v: P.v, graine: P.graine, mode: P.mode, deb: P.deb, club: P.club, exig: P.exig, coach: P.coach, col: P.col, vedette: P.vedette, log: P.log });

/**
 * Rejoue une sauvegarde. Une d'avant le méta (version 1) n'a ni déblocages ni club ; avant la 3, une série de
 * séries se jouait d'un bloc ; avant la 4, le coach s'achetait et montait par sa confiance ; avant la 5, la
 * roulette bâtissait le cinq du Rogue et les gardés se choisissaient.
 */
export function rejouer(sv, ctx) {
  const P = nouvellePartie(sv.graine, { deb: sv.deb || [], club: sv.club || null, exig: sv.exig || 0, coach: sv.coach || null, mode: sv.mode || 'rogue', col: sv.col || [], vedette: sv.vedette || null });
  P.v = sv.v || 1;
  for (const a of sv.log) appliquer(P, a, ctx);
  return P;
}
