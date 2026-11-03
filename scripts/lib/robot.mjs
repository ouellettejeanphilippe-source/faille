/*
 * UN DG ROBOT, pour les scripts qui ont besoin de runs entières (check_meta,
 * check_profondeur, check_robot) : il joue par les mêmes actions que l'écran
 * (js/partie.js) — les cases, le pack de départ, le split, les décisions, le
 * marché, les packs, les séries, le bilan, ceux qui restent.
 *
 * LES TROIS POLITIQUES (Cap 82-0, scripts/lib/rogue_sim.mjs `POLITIQUES`). Le
 * jeu est profond si la façon de mener compte : sur les mêmes dés, un DG
 * attentif et un DG distrait ne finissent pas au même rang.
 *   - 'defaut' : le robot d'avant, qui va droit — il prend une carte au loto
 *     quatre fois sur cinq, tranche au hasard, n'achète rien et ne touche à
 *     rien en saison (check_meta) ;
 *   - 'attentif' : il lit ses joueurs. Au loto, la carte de la plus haute
 *     valeur qui se paie ; au marché et dans un pack, le joueur qui monte le
 *     plus son cinq (sa valeur contre celle du titulaire, `MARGE` au moins) ;
 *     le pack le plus cher qu'il peut payer ; le plan de match qu'il lit au
 *     moteur contre chaque adversaire (`planDeLAttentif`) ; le banc qui joue s'il vaut mieux ;
 *     un entraînement toujours en cours ; le commanditaire qui paie le plus ;
 *     l'adjoint qui rejoint son coach, et ses adjoints prêts postés dès qu'une
 *     case est libre ; un talent sur le premier pouvoir ; le repêchage automatique ;
 *   - 'distrait' : il clique sans lire — au hasard partout où l'écran offre un
 *     choix (le loto, le plan de match, le marché, les packs, le banc, sa main, les
 *     décisions, et ses champions au repêchage, parmi les trois plus joués).
 *
 * LES DÉS DU MONDE ET CEUX DES CHOIX. Les adversaires, la graine du split et
 * les bouche-trous d'un split se tirent d'un dé à eux (`monde`, la graine de
 * la run et le numéro du split) ; les choix du robot, du sien (`clic`). Trois
 * robots qui choisissent autrement jouent donc les mêmes adversaires, les
 * mêmes parties et les mêmes bouche-trous, tant que leur run dure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit } from '../../js/cotes.js';
import { ROLES } from '../../js/canaux.js';
import { tempoDuSplit, equipeReelle } from '../../js/sim.js';
import { hasard, piger, graineDe } from '../../js/hasard.js';
import { bansAuto, permis, BANS, HORS } from '../../js/repechage.js';
import { PLANS, effetDuPlan, planJoue, anneeEntre } from '../../js/strategie.js';
import { jouerPartie } from '../../js/moteur.js';
import { jetonsDe, effetsDeToi, liensDe } from '../../js/rogue.js';
import { ADJOINTS } from '../../js/adjoints.js';
import {
  tirer, tirerAdversaires, tirerBoucheTrous, tirerPackJoueurs, agentsLibres, signables, placements, cleDe, marcheOuvert, aTravailler,
  MARCHE, PACKS_JOUEURS, COMMANDITAIRES, prixPackJoueurs,
} from '../../js/gestion.js';
import { nouvellePartie, appliquer, vestiaireDe, enAttente, parCases, caseEnCours, attendPack, contratDe, refDe, taSerie, offreDe, mainDeLaPartie } from '../../js/partie.js';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export const POLITIQUES = ['defaut', 'attentif', 'distrait'];

/* L'attentif ne change un titulaire que pour mieux d'au moins ça, en écarts types de valeur (js/cotes.js). */
const MARGE = 0.1;

/** Le contexte de js/partie.js, avec tous les splits de data/splits/ : { ctx, ids, lire }. */
export function contexte() {
  const dossier = path.join(ROOT, 'data/splits');
  const splits = new Map(fs.existsSync(dossier) ? fs.readdirSync(dossier).filter(f => f.endsWith('.json')).sort().map(f => {
    const split = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
    return [split.id, { split, profils: profilsDuSplit(split), tempo: tempoDuSplit(split) }];
  }) : []);
  const ctx = { splits, classes: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/champions.json'), 'utf8')).classes };
  return { ctx, ids: [...splits.keys()], lire: id => splits.get(id) };
}

/* Le dé du monde pour une sorte de tirage et un split de la run. */
const monde = (P, cle) => hasard(graineDe(P.graine, cle));
const valeur = c => (c && c.moteur ? c.moteur.valeur : -Infinity);
const tenter = (P, a, ctx) => { try { appliquer(P, a, ctx); return true; } catch { return false; } };
const melanger = (liste, de) => {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) { const k = Math.floor(de() * (i + 1)); [l[i], l[k]] = [l[k], l[i]]; }
  return l;
};

/* Les cartes d'un loto que le robot essaie, dans l'ordre ; aucune : il passe. */
function cartesDuLoto(ok, c, clic, politique) {
  if (politique === 'attentif') return [...ok].sort((a, b) => valeur(b.v) - valeur(a.v)).map(x => x.cle);
  if (politique === 'distrait') { const x = piger([...ok, null], clic); return x ? [x.cle] : []; }
  return ok.length && (c.source === 'vedette' || clic() < 0.85) ? [piger(ok, clic).cle] : [];
}

/**
 * BÂTIR LE CINQ, comme l'écran : au Rogue (version 5), chaque case ouvre son
 * loto et le robot prend une carte qui se paie (sinon il passe), puis le pack
 * de départ ; au 18-0 et dans une vieille partie, la roulette, un tour par case.
 */
async function batir(P, { ctx, ids, lire }, clic, politique) {
  const agir = a => appliquer(P, a, ctx);
  if (parCases(P)) {
    let c;
    while ((c = caseEnCours(P))) {
      const ok = c.loto.map(x => { try { const v = contratDe(ctx, refDe(x.cle)); return P.eff.cinq[v.r] ? null : { cle: x.cle, v }; } catch { return null; } }).filter(Boolean);
      if (!cartesDuLoto(ok, c, clic, politique).some(cle => tenter(P, { t: 'case', cle }, ctx))) agir({ t: 'case', cle: null });
    }
    if (attendPack(P)) agir({ t: 'boucheTrous', refs: await tirerBoucheTrous(monde(P, `bouches-${P.run.n}`), ids, lire, P.eff, P.fx.bouchetrous) });
    return;
  }
  const de = monde(P, `roulette-${P.run.n}`);
  while (P.etape === 'bati' && Object.keys(P.eff.cinq).length < 5) {
    if (!P.tirage) agir({ t: 'tirage', mode: 'tour', ...(await tirer(de, ids, lire, P.eff, 'tour')) });
    const v = vestiaireDe(P, ctx);
    const l = signables(P.eff, v.equipe, v.profils.joueurs);
    const j = politique === 'attentif' ? [...l].sort((a, b) => v.profils.joueurs.get(b).valeur - v.profils.joueurs.get(a).valeur)[0] : piger(l, clic);
    agir({ t: 'signer', n: j.n, r: j.r });
  }
}

/** Ta collection telle que nouvellePartie la lit, depuis des clés de cartes : [{ cle, niveau }]. */
export const collectionPour = (ctx, cles) => cles.map(cle => { try { return { cle, niveau: contratDe(ctx, refDe(cle)).niveau }; } catch { return null; } }).filter(Boolean);

/* Ce que le robot tranche dans la boîte. */
function trancher(P, ev, clic, politique) {
  if (politique !== 'attentif') return piger(ev.choix, clic);
  if (ev.id === 'commanditaire') return [...ev.choix].sort((a, b) => COMMANDITAIRES[b][3] - COMMANDITAIRES[a][3])[0];
  if (ev.id === 'sequence') return ev.choix.includes('agent') && marcheOuvert(P.L) ? 'agent' : 'cap';
  // Un adjoint : celui qui rejoint son coach (son séjour dure plus), sinon le premier offert.
  if (ev.id === 'adjoint') return ev.choix.find(k => k !== 'aucun' && P.R.coach && ADJOINTS[k].voie === P.R.coach.id) || ev.choix[0];
  return ev.choix[0];
}

/* Le repêchage du distrait : trois bannissements au hasard parmi les plus joués de l'adversaire, et chacun des siens parmi ses trois plus joués. */
function repechageAuHasard(P, clic) {
  const s = taSerie(P.L);
  if (!s) return undefined;
  const moi = P.L.equipes[0], eux = P.L.equipes[s.a === 0 ? s.b : s.a];
  const contreMoi = new Set(bansAuto(moi));
  const leurs = [...new Set(ROLES.flatMap(r => eux.cinq[r].bassin.slice(0, 2).map(([c]) => c)))].filter(c => !contreMoi.has(c));
  const bans = melanger(leurs, clic).slice(0, BANS);
  const pris = new Set([...contreMoi, ...bans]);
  const choix = {};
  for (const r of ROLES) {
    const c = permis(moi.cinq[r], pris).slice(0, 3);
    choix[r] = c.length ? piger(c, clic)[0] : HORS;
    if (choix[r]) pris.add(choix[r]);
  }
  return { bans, choix };
}

/* Le meilleur gain de l'attentif parmi des joueurs offerts : le contrat, sa place de titulaire et ce qu'il monte le cinq ; null sous MARGE. */
function meilleurGain(P, contrats) {
  let best = null;
  for (const c of contrats) {
    if (!placements(P.eff, c).some(p => p.place === 'titulaire')) continue;
    const gain = valeur(c) - valeur(P.eff.cinq[c.r]);
    if (gain > MARGE && (!best || gain > best.gain)) best = { c, gain };
  }
  return best;
}

/*
 * LE PLAN DE L'ATTENTIF (Cap 82-0, scripts/lib/rogue_sim.mjs `planDuRobot`). À la première rencontre d'un adversaire
 * dans le split, il lit le moteur : chaque plan contre sa partie, LECTURE parties en paires, de chaque côté, avec son
 * cinq et ses effets d'aujourd'hui. Il garde celui qui rend le plus de victoires, sa partie si aucun ne rend.
 */
const LECTURE = 40;
const lus = new WeakMap();
function planDeLAttentif(P) {
  const L = P.L;
  const s = taSerie(L);
  if (!s) return P.strategie;
  const i = s.a === 0 ? s.b : s.a;
  if (!lus.has(L)) lus.set(L, new Map());
  const deja = lus.get(L);
  if (!deja.has(i)) {
    const toi = { ...L.equipes[0], effets: effetsDeToi(liensDe(P.eff.cinq)) }, eux = L.equipes[i];
    const annee = anneeEntre(toi, eux);
    const victoires = e => {
      let v = 0;
      for (let g = 0; g < LECTURE; g++) {
        const graine = graineDe(L.graine, `lecture-${i}-${g}`);
        const f = g % 2 ? jouerPartie(eux, toi, graine, [null, e]) : jouerPartie(toi, eux, graine, [e, null]);
        if (f.gagnant === g % 2) v++;
      }
      return v;
    };
    const sans = victoires(null);
    const [id, gain] = Object.keys(PLANS).filter(x => planJoue(x, annee)).map(x => [x, victoires(effetDuPlan(x, annee)) - sans]).sort((a, b) => b[1] - a[1])[0];
    deja.set(i, gain > 0 ? id : null);
  }
  return deja.get(i);
}

/* Poster les adjoints prêts tant qu'une case est libre (`tous`), ceux qui rejoignent le coach d'abord ; le distrait, un au hasard. */
function posterLaMain(P, ctx, tous, clic = null) {
  const { cartes, libres } = mainDeLaPartie(P);
  const pretes = cartes.filter(c => c.etat === 'prete').sort((a, b) => Number(ADJOINTS[b.cle].voie === (P.R.coach && P.R.coach.id)) - Number(ADJOINTS[a.cle].voie === (P.R.coach && P.R.coach.id)));
  for (const c of (clic ? (pretes.length ? [piger(pretes, clic)] : []) : pretes).slice(0, tous ? libres : 1)) tenter(P, { t: 'poster', cle: c.cle }, ctx);
}

/* LA JOURNÉE DE L'ATTENTIF, avant de jouer : son plan de match, le banc, le marché, un pack, l'entraînement, sa main d'adjoints. */
async function gererAttentif(P, { ctx, ids, lire }) {
  const L = P.L;
  const voulu = planDeLAttentif(P);
  if (voulu !== P.strategie) tenter(P, { t: 'strategie', id: voulu }, ctx);
  const b = P.eff.banc;
  if (b && valeur(b) > valeur(P.eff.cinq[b.r]) + MARGE) tenter(P, { t: 'permuter' }, ctx);
  if (marcheOuvert(L) && (P.bons || jetonsDe(L, P.R) >= MARCHE.prix)) {
    const offre = (await agentsLibres(L, ids, lire, P.eff, P.adversaires, offreDe(P))).map(ref => contratDe(ctx, ref));
    const g = meilleurGain(P, offre);
    if (g) tenter(P, { t: 'marche', ref: g.c.ref, place: 'titulaire' }, ctx);
  }
  if (marcheOuvert(L) && !P.offrePack) {
    const id = Object.keys(PACKS_JOUEURS).filter(k => jetonsDe(L, P.R) >= prixPackJoueurs(P.R, k)).sort((x, y) => prixPackJoueurs(P.R, y) - prixPackJoueurs(P.R, x))[0];
    if (id) {
      const refs = await tirerPackJoueurs(P.R, id, ids, lire, P.eff);
      if (tenter(P, { t: 'packJoueurs', id, refs }, ctx)) {
        const g = meilleurGain(P, refs.map(ref => contratDe(ctx, ref)));
        if (g) tenter(P, { t: 'signerPack', ref: g.c.ref, place: 'titulaire' }, ctx);
      }
    }
  }
  if (!P.entrainement) {
    for (const r of ROLES) {
      const c = P.eff.cinq[r];
      const champs = aTravailler(ctx.splits.get(c.ref.id).split, c);
      if (champs.length && tenter(P, { t: 'entrainer', r, champion: champs[0] }, ctx)) break;
    }
  }
  posterLaMain(P, ctx, true);
}

/* LA JOURNÉE DU DISTRAIT : il touche à tout, au hasard. */
async function gererDistrait(P, { ctx, ids, lire }, clic) {
  const L = P.L;
  if (clic() < 0.15) tenter(P, { t: 'strategie', id: piger([null, ...Object.keys(PLANS)], clic) }, ctx);
  if (marcheOuvert(L) && clic() < 0.35) {
    const offre = await agentsLibres(L, ids, lire, P.eff, P.adversaires, offreDe(P));
    const ref = offre.length && piger(offre, clic);
    const pl = ref && placements(P.eff, contratDe(ctx, ref));
    if (pl && pl.length) tenter(P, { t: 'marche', ref, place: piger(pl, clic).place }, ctx);
  }
  if (P.eff.banc && clic() < 0.15) tenter(P, { t: clic() < 0.7 ? 'permuter' : 'relacher' }, ctx);
  if (clic() < 0.15) posterLaMain(P, ctx, false, clic);
  const id = piger(Object.keys(PACKS_JOUEURS), clic);
  if (marcheOuvert(L) && !P.offrePack && clic() < 0.12 && jetonsDe(L, P.R) >= prixPackJoueurs(P.R, id)) {
    const refs = await tirerPackJoueurs(P.R, id, ids, lire, P.eff);
    if (tenter(P, { t: 'packJoueurs', id, refs }, ctx) && clic() < 0.7) {
      const ref = piger(refs, clic);
      const pl = placements(P.eff, contratDe(ctx, ref));
      if (pl.length) tenter(P, { t: 'signerPack', ref, place: piger(pl, clic).place }, ctx);
    }
  }
  if (!P.entrainement && clic() < 0.3) {
    const r = piger(ROLES, clic);
    const champs = aTravailler(ctx.splits.get(P.eff.cinq[r].ref.id).split, P.eff.cinq[r]);
    if (champs.length) tenter(P, { t: 'entrainer', r, champion: piger(champs, clic) }, ctx);
  }
}

/**
 * LE SPLIT, joué par une politique : la saison une journée à la fois (les
 * décisions de la boîte d'abord, puis ce que la politique fait de sa journée),
 * puis les séries et le bilan. Le cinq doit être complet.
 */
export async function jouerLeSplit(P, C, clic, politique = 'defaut') {
  const { ctx, ids, lire } = C;
  const agir = a => appliquer(P, a, ctx);
  const de = monde(P, `split-${P.run.n}`);
  agir({ t: 'lancer', adversaires: await tirerAdversaires(de, ids, lire, equipeReelle), graine: Math.floor(de() * 2 ** 32) });
  const rp = () => (politique === 'distrait' ? { rp: repechageAuHasard(P, clic) } : {});
  while (P.L.jour < P.L.journees.length) {
    const ev = enAttente(P);
    if (ev) { agir({ t: 'evenement', choix: trancher(P, ev, clic, politique) }); continue; }
    if (P.mode !== 'dixhuit' && politique === 'attentif') await gererAttentif(P, C);
    if (P.mode !== 'dixhuit' && politique === 'distrait') await gererDistrait(P, C, clic);
    agir({ t: 'journee', ...rp() });
  }
  agir({ t: 'series' });
  while (P.L.series.champion === null) {
    // Aux séries aussi, l'attentif pose son plan contre l'adversaire de la ronde.
    if (P.mode !== 'dixhuit' && politique === 'attentif' && planDeLAttentif(P) !== P.strategie) tenter(P, { t: 'strategie', id: planDeLAttentif(P) }, ctx);
    agir({ t: 'ronde', ...rp() });
  }
  agir({ t: 'bilan' });
}

/**
 * Joue une run jusqu'à sa fin (ou `splitsMax` splits) ; rend la partie.
 * `options` : ceux de nouvellePartie ; `politique` : une de POLITIQUES.
 */
export async function jouerUneRun(graine, C, options = {}, splitsMax = 5, politique = 'defaut') {
  const { ctx } = C;
  const clic = hasard(graineDe(graine, `clic-${politique}`));
  const P = nouvellePartie(graine, options);
  const agir = a => appliquer(P, a, ctx);
  while (P.etape !== 'fin' && P.run.n <= splitsMax) {
    await batir(P, C, clic, politique);
    await jouerLeSplit(P, C, clic, politique);
    if (P.etape === 'gardes') agir({ t: 'suivant' });
  }
  return P;
}
