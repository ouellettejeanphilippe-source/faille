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
 *     le pack le plus cher qu'il peut payer ; la stratégie du meilleur fit
 *     (« Bon fit » ou mieux, sinon aucune) ; le banc qui joue s'il vaut mieux ;
 *     un entraînement toujours en cours ; le commanditaire qui paie le plus ;
 *     un talent sur le premier pouvoir ; le repêchage automatique ;
 *   - 'distrait' : il clique sans lire — au hasard partout où l'écran offre un
 *     choix (le loto, la stratégie, le marché, les packs, le banc, les
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
import { STRATEGIES, fitDe } from '../../js/strategie.js';
import { CARTES, RARETES, PLAN, jetonsDe } from '../../js/rogue.js';
import {
  tirer, tirerAdversaires, tirerBoucheTrous, tirerPackJoueurs, agentsLibres, signables, placements, cleDe, marcheOuvert, aTravailler,
  MARCHE, PACKS_JOUEURS, COMMANDITAIRES, prixPackJoueurs,
} from '../../js/gestion.js';
import { nouvellePartie, appliquer, vestiaireDe, enAttente, gardesDe, parCases, caseEnCours, attendPack, contratDe, refDe, taSerie, offreDe } from '../../js/partie.js';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

export const POLITIQUES = ['defaut', 'attentif', 'distrait'];

/* L'attentif ne change un titulaire que pour mieux d'au moins ça, en écarts types de valeur (js/cotes.js). */
const MARGE = 0.1;
/* La stratégie que l'attentif joue : son fit au moins à « Bon fit » (js/strategie.js FITS). */
const FIT_MIN = 0.15;

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

/* LA JOURNÉE DE L'ATTENTIF, avant de jouer : la stratégie, le banc, le marché, un pack, l'entraînement, le plan de jeu. */
async function gererAttentif(P, { ctx, ids, lire }) {
  const L = P.L;
  const cinq = L.equipes[0].cinq;
  const fits = Object.keys(STRATEGIES).map(id => [id, fitDe(id, cinq)]).sort((a, b) => b[1] - a[1]);
  const voulue = fits[0][1] >= FIT_MIN ? fits[0][0] : null;
  if (voulue !== P.strategie) tenter(P, { t: 'strategie', id: voulue }, ctx);
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
  const ordre = Object.keys(RARETES).reverse();
  const voulues = [...P.R.cartes].sort((x, y) => ordre.indexOf(CARTES[x][2]) - ordre.indexOf(CARTES[y][2])).slice(0, PLAN);
  for (const c of P.R.plan.filter(x => !voulues.includes(x))) tenter(P, { t: 'plan', carte: c }, ctx);
  for (const c of voulues.filter(x => !P.R.plan.includes(x))) tenter(P, { t: 'plan', carte: c }, ctx);
}

/* LA JOURNÉE DU DISTRAIT : il touche à tout, au hasard. */
async function gererDistrait(P, { ctx, ids, lire }, clic) {
  const L = P.L;
  if (clic() < 0.15) tenter(P, { t: 'strategie', id: piger([null, ...Object.keys(STRATEGIES)], clic) }, ctx);
  if (marcheOuvert(L) && clic() < 0.35) {
    const offre = await agentsLibres(L, ids, lire, P.eff, P.adversaires, offreDe(P));
    const ref = offre.length && piger(offre, clic);
    const pl = ref && placements(P.eff, contratDe(ctx, ref));
    if (pl && pl.length) tenter(P, { t: 'marche', ref, place: piger(pl, clic).place }, ctx);
  }
  if (P.eff.banc && clic() < 0.15) tenter(P, { t: clic() < 0.7 ? 'permuter' : 'relacher' }, ctx);
  if (clic() < 0.1) tenter(P, { t: 'pack', id: 'bronze' }, ctx);
  if (P.R.cartes.length && clic() < 0.1) tenter(P, { t: 'plan', carte: piger(P.R.cartes, clic) }, ctx);
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
  while (P.L.series.champion === null) agir({ t: 'ronde', ...rp() });
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
    if (P.etape === 'gardes' && parCases(P)) agir({ t: 'suivant' });
    else if (P.etape === 'gardes') {
      const tous = [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref));
      try { agir({ t: 'garder', cles: tous.filter(() => clic() < 0.4).slice(0, gardesDe(P)) }); } catch { agir({ t: 'garder', cles: [] }); }
    }
  }
  return P;
}
