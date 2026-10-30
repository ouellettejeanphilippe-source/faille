/*
 * LA GESTION (js/gestion.js, js/partie.js) — un DG robot joue des runs
 * entières sur les vrais splits, par les mêmes actions que l'écran : la
 * roulette et ses relances, le marché et le banc, les événements, la
 * boutique, le bilan, ceux qu'on garde. Puis on vérifie :
 *
 *   les invariants   le plafond tient après chaque action ; les jetons ne
 *                    tombent jamais sous zéro ; les relances restent dans
 *                    leur nombre ; les agents libres sont Pilier au plus, ni
 *                    à toi ni titulaires ailleurs, et ils rejouent ;
 *   les refus        une relance de trop, le marché après la date limite,
 *                    une journée quand un événement attend, trois gardés ;
 *   le proprio       chaque objectif vise 2 à 5 victoires sur six, et il est
 *                    atteint si et seulement si la fiche y est ; le mandat
 *                    suit les séries ;
 *   les packs        un pack de joueurs se tire pareil deux fois, jamais un des
 *                    tiens ; on en signe un seul, sous le plafond, avant la
 *                    journée suivante ; les niveaux sortent selon leurs chances ;
 *   le coach         choisi au départ, il fait la run (on n'en achète pas) ;
 *                    son expérience se recompte à la main des résultats ; son
 *                    niveau ne descend jamais ; un talent attend à son niveau, et
 *                    la journée attend le talent ;
 *   le staff         un adjoint parmi trois aux journées 6 et 12, jamais un
 *                    déjà là, les mêmes deux fois ; trois au plus, et « qui
 *                    part ? » quand il en vient un de trop ;
 *   le vieillissement un gardé devient sa version du plus proche split plus
 *                    récent, et le plafond tient avec elle ;
 *   la collection    chaque joueur passé chez toi y entre ;
 *   la sauvegarde    le journal, passé par JSON et rejoué, redonne la même
 *                    partie, à la fin comme au milieu ; une sauvegarde de
 *                    la version 5 joue le moteur d'alors (js/moteur-v1.js),
 *                    qui redonne au tirage près les parties gelées par le
 *                    code d'avant (scripts/lib/moteur-v1.json) ; une run de
 *                    la version 5 gelée sur ces shards-ci (scripts/lib/
 *                    partie-v5.json) se rejoue identique ; une partie neuve
 *                    joue le moteur d'aujourd'hui (js/moteur.js) ;
 *   le départ        (version 5) le Rogue part de ses cases — la vedette, le
 *                    classeur tiré de la collection, ceux qui restent au loto —
 *                    puis du pack de départ : chaque loto rejoue, reste à son
 *                    niveau ou en dessous, hors des rôles comblés ; un
 *                    bouche-trou par rôle vide, Régulier au plus ; la roulette
 *                    et les gardés sont refusés ; la première run reste dure ;
 *   le 18-0          la roulette, le split d'un coup (rien n'attend), les
 *                    séries partie par partie, aucune carte ni décision ni
 *                    jeton dépensé ; un seul split, puis la fin.
 *
 *   node scripts/check_gestion.mjs
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit, PLAFOND, TARIFS } from '../js/cotes.js';
import { tempoDuSplit, equipeReelle, classement } from '../js/sim.js';
import { jouerPartieV1 } from '../js/moteur-v1.js';
import { hasard, piger } from '../js/hasard.js';
import { jetonsDe } from '../js/rogue.js';
import { RELANCES, MARCHE, ENTRAINEMENT, PACKS_JOUEURS, NIVEAUX_BOUCHE_TROUS, aTravailler, tirer, tirerAdversaires, tirerBoucheTrous, tirerEtoiles, agentsLibres, placements, masseDe, plafondDe, cleDe, marcheOuvert, signables, objectifsDe, mandatRempli, tirerPackJoueurs, prixPackJoueurs, prochaineVersion, libresDe } from '../js/gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, enAttente, sauvegarde, rejouer, gardesDe, relancesMax, offreDe, mandatDuSplit, coachDeLaPartie, adjointsOfferts, JOURNEES_ADJOINTS, parCases, casesDe, caseEnCours, lotoDe, attendPack, refDe, LOTO } from '../js/partie.js';
import { DEBLOCAGES, EXIGENCES } from '../js/meta.js';
import { COACHS, XP, SEUILS_NIVEAU, ADJOINTS_MAX, couleurDe } from '../js/rogue.js';
import { confort } from '../js/repechage.js';
import { STRATEGIES } from '../js/strategie.js';
import { collectionPour } from './lib/robot.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOSSIER = path.join(ROOT, 'data/splits');
const RUNS = 8;
const SPLITS_MAX = 5;

const splits = new Map(fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort().map(f => {
  const split = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), 'utf8'));
  return [split.id, { split, profils: profilsDuSplit(split), tempo: tempoDuSplit(split) }];
}) : []);
const ctx = { splits, classes: JSON.parse(fs.readFileSync(path.join(ROOT, 'data/champions.json'), 'utf8')).classes };
const ids = [...splits.keys()];
const lire = id => splits.get(id);
const index = ids.map(id => ({ id, annee: splits.get(id).split.annee }));
exiger('des splits à lire', ids.length > 0, `${ids.length} splits`);

/* L'empreinte d'une partie : ce qu'un joueur verrait. */
const empreinte = P => JSON.stringify({
  etape: P.etape, mode: P.mode, cases: P.cases, strategie: P.strategie, run: P.run, jetons: jetonsDe(P.L, P.R), cartes: P.R.cartes, plan: P.R.plan, coach: P.R.coach,
  eff: [...Object.values(P.eff.cinq), P.eff.banc].map(c => c && cleDe(c.ref)), relances: P.relances, bons: P.bons,
  ligue: P.L && [P.L.jour, classement(P.L).map(l => [l.i, l.v, l.d]), P.L.series && P.L.series.champion],
});

const bilan = { cases: 0, prises: 0, lotosPleins: 0, bouches: 0, vedettes: 0, premiersTitres: 0, runsRogue: 0, dixhuit: 0, adjoints: 0, quiPart: 0, offres: 0, niveauMax: 0, talents: 0, coachsAchetes: 0, partiesDeSeries: 0, exigences: 0, packs: 0, signesPack: 0, vieillis: 0, entraines: 0, commandite: 0, actions: 0, refusAttendus: 0, splits: 0, gagnees: 0, perdues: 0, marche: 0, banc: 0, evenements: 0, objectifs: 0 };
const fautes = new Set();
const faute = msg => fautes.add(msg);
const refuse = (P, a) => {
  const avant = P.log.length;
  try { appliquer(P, a, ctx); } catch { bilan.refusAttendus++; return P.log.length === avant; }
  return false;
};
const tenter = (P, a) => { try { appliquer(P, a, ctx); return true; } catch { return false; } };
const surveiller = P => {
  bilan.actions++;
  if (P.staff && (P.staff.length > ADJOINTS_MAX || new Set(P.staff).size !== P.staff.length)) faute(`le staff : ${P.staff.join(', ')}`);
  if (masseDe(P.eff) > plafondDe(P.eff)) faute(`plafond dépassé : ${masseDe(P.eff)} après ${JSON.stringify(P.log[P.log.length - 1]).slice(0, 80)} (${P.etape})`);
  if (plafondDe(P.eff) !== PLAFOND + P.fx.plafond) faute(`le plafond de la run s'est perdu : ${plafondDe(P.eff)}`);
  if (jetonsDe(P.L, P.R) < 0) faute('jetons sous zéro');
  for (const k of Object.keys(RELANCES)) if (P.relances[k] > relancesMax(P, k)) faute(`relances ${k} : ${P.relances[k]}`);
};
/* Un refus attendu se juge une fois : faux une seule fois, et c'est une faute. */
const refusVus = new Map();
const exigerRefus = (nom, ok) => refusVus.set(nom, (refusVus.get(nom) ?? true) && ok);
/* L'expérience du coach, recomptée à la main : les séries gagnées, les rondes, le titre, les séries gagnées à sa couleur. */
const xpALaMain = P => {
  const gains = [...P.R.reports, ...(P.L ? [{ ...P.L, _vivant: true }] : [])];
  let xp = P.fx.xp;
  for (const g of gains) {
    const L = g._vivant ? g : null;
    const tes = L ? [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].filter(s => s.gagnant !== null && (s.a === 0 || s.b === 0)) : null;
    const v = L ? tes.filter(s => s.gagnant === 0).length : g.v;
    const rondes = L ? (L.series ? L.series.rondes.flat().filter(s => s.gagnant === 0).length : 0) : g.rondes;
    const titre = L ? (L.series && L.series.champion === 0 ? 1 : 0) : g.titre;
    xp += v * XP.serie + rondes * XP.ronde + titre * XP.titre;
  }
  return xp + P.R.joue.filter(x => x.gagne && x.plan.some(c => couleurDe(c) === P.R.coach.id)).length * XP.couleur;
};
const niveaux = new Map();
const agir = (P, a) => {
  const r = appliquer(P, a, ctx);
  surveiller(P);
  if (P.v >= 4 && P.R.coach) {
    const c = coachDeLaPartie(P);
    if (c.xp !== xpALaMain(P)) faute(`l'expérience du coach : ${c.xp} contre ${xpALaMain(P)} à la main`);
    if (c.n < (niveaux.get(P) || 1)) faute('le niveau du coach a descendu');
    if (c.n !== SEUILS_NIVEAU.filter(x => c.xp >= x).length) faute('le niveau ne suit pas l\'expérience');
    niveaux.set(P, c.n);
    bilan.niveauMax = Math.max(bilan.niveauMax, c.n);
  }
  return r;
};

/*
 * LE DÉPART PAR CASES (Rogue, version 5) : chaque case ouvre son loto — il
 * rejoue, tient LOTO cartes au plus, de son niveau ou d'en dessous, hors des
 * rôles comblés — et le robot prend ce qui se paie, ou passe ; puis le pack de
 * départ, un bouche-trou par rôle vide, et la roulette est refusée.
 */
async function departParCases(P, de, graine) {
  const attendues = casesDe(P).length;
  let c;
  while ((c = caseEnCours(P))) {
    bilan.cases++;
    if (JSON.stringify(c.loto) !== JSON.stringify(lotoDe(P, c.k))) faute('un loto ne rejoue pas');
    if (c.loto.length > LOTO) faute(`un loto de ${c.loto.length}`);
    if (c.loto.some(x => P.eff.cinq[x.cle.split('|')[3]])) faute('un loto offre un rôle comblé');
    if (c.source !== 'vedette' && c.loto.some(x => ORDRE.indexOf(x.niveau) < ORDRE.indexOf(c.niveau))) faute(`un loto ${c.niveau} offre ${c.loto.map(x => x.niveau)}`);
    if (c.loto.length === LOTO) bilan.lotosPleins++;
    if (c.source === 'vedette') bilan.vedettes++;
    const ok = c.loto.filter(x => { try { return !P.eff.cinq[contratDe(ctx, refDe(x.cle)).r]; } catch { return false; } });
    const cle = ok.length && (c.source === 'vedette' || de() < 0.85) ? piger(ok, de).cle : null;
    if (cle && graine === 2 && c.k === 0) exigerRefus('une carte hors du loto est refusée', refuse(P, { t: 'case', cle: 'x|y|z|haut' }));
    if (tenter(P, { t: 'case', cle })) { surveiller(P); if (cle) bilan.prises++; } else agir(P, { t: 'case', cle: null });
  }
  if (P.cases.length !== attendues) faute(`${P.cases.length} cases ouvertes pour ${attendues}`);
  if (graine === 2 && P.run.n === 1) exigerRefus('la roulette est refusée au Rogue', refuse(P, { t: 'tirage', mode: 'tour', ...(await tirer(hasard(2), ids, lire, P.eff, 'tour')) }));
  if (!attendPack(P) && libresDe(P.eff).length) faute('le pack de départ n\'attend pas');
  if (attendPack(P)) {
    const refs = await tirerBoucheTrous(de, ids, lire, P.eff, P.fx.bouchetrous);
    const libres = libresDe(P.eff);
    if (refs.length !== libres.length || libres.some(r => !refs.some(x => x.r === r))) faute(`un pack de départ de ${refs.length} pour ${libres.length} rôles`);
    for (const ref of refs) if (!NIVEAUX_BOUCHE_TROUS.has(contratDe(ctx, ref).niveau)) faute(`un bouche-trou ${contratDe(ctx, ref).niveau}`);
    if (graine === 2 && P.run.n === 1 && refs.length > 1) exigerRefus('un pack de départ incomplet est refusé', refuse(P, { t: 'boucheTrous', refs: refs.slice(1) }));
    agir(P, { t: 'boucheTrous', refs });
    bilan.bouches += refs.length;
    if (refs.some(r => !P.cartes.includes(cleDe(r)))) faute('un bouche-trou hors de la collection');
    exigerRefus('le pack de départ ne s\'ouvre qu\'une fois', refuse(P, { t: 'boucheTrous', refs: [] }));
  }
}
const ORDRE = TARIFS.map(([n]) => n);

/* LE 18-0 : la roulette, le split d'un coup, les séries partie par partie ; rien d'autre. */
async function unDixHuit(graine) {
  const de = hasard(graine);
  const P = nouvellePartie(graine, { mode: 'dixhuit', deb: Object.keys(DEBLOCAGES), exig: 2, coach: 'stratege', club: { nom: 'Les Lynx', code: 'LYX', couleur: '#3fb6c9' } });
  if (P.deb.length || P.exig || P.coach || P.R.coach || plafondDe(P.eff) !== PLAFOND) faute('le 18-0 pose des déblocages, des exigences ou un coach');
  if (casesDe(P).length || parCases(P)) faute('le 18-0 a des cases');
  while (Object.keys(P.eff.cinq).length < 5) {
    if (!P.tirage) agir(P, { t: 'tirage', mode: 'tour', ...(await tirer(de, ids, lire, P.eff, 'tour')) });
    const v = vestiaireDe(P, ctx);
    const j = piger(signables(P.eff, v.equipe, v.profils.joueurs), de);
    agir(P, { t: 'signer', n: j.n, r: j.r });
  }
  agir(P, { t: 'lancer', adversaires: await tirerAdversaires(de, ids, lire, equipeReelle), graine: Math.floor(de() * 2 ** 32) });
  exigerRefus('au 18-0, ni carte ni stratégie', refuse(P, { t: 'strategie', id: 'dragons' }) && refuse(P, { t: 'pack', id: 'bronze' }) && refuse(P, { t: 'packJoueurs', id: 'recrues', refs: [] }));
  agir(P, { t: 'jusqua' });
  if (P.L.jour !== P.L.journees.length || enAttente(P)) faute('le 18-0 s\'arrête en chemin');
  if (P.L.commanditaire) faute('un commanditaire au 18-0');
  agir(P, { t: 'series' });
  let parties = 0;
  while (P.L.series.champion === null) {
    const s = P.L.series.rondes[P.L.series.rondes.length - 1].find(x => (x.a === 0 || x.b === 0) && x.gagnant === null);
    const avant = s ? s.parties.length : 0;
    agir(P, { t: 'ronde' });
    if (s && s.parties.length !== avant + 1) faute('au 18-0, une série ne se joue pas partie par partie');
    parties += s ? 1 : 0;
  }
  if (P.R.achats.length || P.R.cartes.length || P.staff.length || P.talents.length) faute('le 18-0 a dépensé ou gagné des cartes');
  agir(P, { t: 'bilan' });
  if (P.etape !== 'fin' || !P.run.fin || P.run.passes[0].mandat !== 'titre') faute(`le 18-0 ne finit pas en un split : ${P.etape}, ${P.run.fin}`);
  bilan.dixhuit++;
  return { P, parties };
}

async function unRun(graine, version = null, col = [], vedette = null) {
  const de = hasard(graine);
  // Une run sur deux avec tous les déblocages du méta, une sur trois au plus haut des exigences : les règles tiennent avec eux.
  const exig = graine % 3 === 0 ? EXIGENCES.length : 0;
  const coach = Object.keys(COACHS)[graine % 4];
  const deb = graine % 2 ? [] : Object.keys(DEBLOCAGES);
  const P = nouvellePartie(graine, { deb, club: { nom: 'Les Lynx', code: 'LYX', couleur: '#3fb6c9' }, exig, coach: version && version < 4 ? null : coach, col, vedette });
  if (exig && (plafondDe(P.eff) !== PLAFOND - 1 || mandatDuSplit(P)[0] !== 'demie' || jetonsDe(null, P.R) !== (graine % 2 ? 10 : 35))) {
    faute(`les exigences ne se posent pas : plafond ${plafondDe(P.eff)}, mandat ${mandatDuSplit(P)[0]}, jetons ${jetonsDe(null, P.R)}`);
  }
  if (exig) bilan.exigences++;
  // Une partie d'avant la version 3 garde sa règle : une série de séries se joue d'un bloc, d'un seul repêchage.
  if (version) P.v = version;
  // Les cases du premier départ : la vedette, puis le classeur (une case Régulier, celles des déblocages, moins l'exigence).
  const classeur = Math.max(0, 1 + P.fx.pilier + P.fx.etoile + P.fx.cases);
  if (parCases(P) && casesDe(P).length !== (vedette ? 1 : 0) + classeur) faute(`${casesDe(P).length} cases au classeur pour ${classeur}${vedette ? ' et une vedette' : ''}`);
  if (parCases(P)) bilan.runsRogue++;
  let milieu = null;
  while (P.etape !== 'fin' && P.run.n <= SPLITS_MAX) {
    if (parCases(P)) await departParCases(P, de, graine);
    // LE REPÊCHAGE (le 18-0, une vieille partie) : un tour par case, parfois une relance.
    while (P.etape === 'bati' && Object.keys(P.eff.cinq).length < 5) {
      if (!P.tirage) {
        const t = await tirer(de, ids, lire, P.eff, 'tour');
        if (!t) { faute('la roulette ne trouve rien'); return P; }
        agir(P, { t: 'tirage', mode: 'tour', ...t });
      }
      const dispo = Object.keys(RELANCES).filter(k => P.relances[k] < relancesMax(P, k));
      if (de() < 0.25 && dispo.length) {
        const mode = piger(dispo, de);
        const t = await tirer(de, ids, lire, P.eff, mode, P.tirage);
        if (t) agir(P, { t: 'tirage', mode, ...t });
      }
      const v = vestiaireDe(P, ctx);
      const j = piger(signables(P.eff, v.equipe, v.profils.joueurs), de);
      agir(P, { t: 'signer', n: j.n, r: j.r });
    }
    // Une relance de trop est refusée.
    if (P.run.n === 1 && graine === 1) {
      const Q = nouvellePartie(9, { mode: 'dixhuit' });
      const t = await tirer(hasard(9), ids, lire, Q.eff, 'tour');
      appliquer(Q, { t: 'tirage', mode: 'tour', ...t }, ctx);
      for (let k = 0; k < RELANCES.equipe[1]; k++) appliquer(Q, { t: 'tirage', mode: 'equipe', ...(await tirer(hasard(k), ids, lire, Q.eff, 'equipe', Q.tirage)) }, ctx);
      exigerRefus('une relance de trop est refusée', refuse(Q, { t: 'tirage', mode: 'equipe', ...Q.tirage }));
    }
    agir(P, { t: 'lancer', adversaires: await tirerAdversaires(de, ids, lire, equipeReelle), graine: Math.floor(de() * 2 ** 32) });
    bilan.splits++;

    // LA SAISON : le marché, le banc, les événements, la boutique, une journée à la fois.
    while (P.L.jour < P.L.journees.length) {
      const ev = enAttente(P);
      if (ev) {
        exigerRefus('une journée attend la décision', refuse(P, { t: 'journee' }));
        if (ev.id === 'adjoint') {
          bilan.offres++;
          if (!JOURNEES_ADJOINTS.some(j => ev.cle.endsWith(`-${j}`)) || ev.choix.length !== 4 || ev.choix.some(id => P.staff.includes(id))) faute(`une offre d'adjoints : ${ev.cle} ${ev.choix}`);
          if (JSON.stringify(adjointsOfferts(P, ev.cle)) !== JSON.stringify(ev.choix.slice(0, 3))) faute('une offre d\'adjoints ne rejoue pas');
        }
        // Le robot prend un adjoint quatre fois sur cinq : le staff se remplit, puis déborde.
        const choix = ev.id === 'adjoint' && de() < 0.8 ? ev.choix[0] : piger(ev.choix, de);
        agir(P, { t: 'evenement', choix });
        if (ev.id === 'talent') bilan.talents++;
        else if (ev.id === 'adjoint') bilan.adjoints += choix !== 'aucun' ? 1 : 0;
        else if (ev.id === 'quiPart') bilan.quiPart++;
        else bilan.evenements++;
        continue;
      }
      // Avant la version 4, un coach s'achète ; depuis, il fait la run.
      if (P.v < 4 && !P.R.coach && jetonsDe(P.L, P.R) >= 12 && de() < 0.3 && tenter(P, { t: 'coach', id: piger(Object.keys(COACHS), de) })) bilan.coachsAchetes++;
      if (P.v >= 4 && P.run.n === 1 && P.L.jour === 1) exigerRefus('un coach ne s\'achète plus', refuse(P, { t: 'coach', id: Object.keys(COACHS).find(k => k !== P.R.coach.id) }));
      if (marcheOuvert(P.L) && de() < 0.35) {
        const offre = await agentsLibres(P.L, ids, lire, P.eff, P.adversaires, offreDe(P));
        const encore = await agentsLibres(P.L, ids, lire, P.eff, P.adversaires, offreDe(P));
        if (JSON.stringify(offre) !== JSON.stringify(encore)) faute('le marché ne rejoue pas');
        if (offre.length > offreDe(P)) faute(`${offre.length} agents libres pour ${offreDe(P)}`);
        const mes = new Set([...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref)));
        for (const ref of offre) {
          const c = contratDe(ctx, ref);
          if (c.cout > MARCHE.coutMax) faute(`agent libre trop cher : ${c.niveau}`);
          if (mes.has(cleDe(ref))) faute('agent libre déjà chez toi');
        }
        const ref = offre.length && piger(offre, de);
        const pl = ref && placements(P.eff, contratDe(ctx, ref));
        if (pl && pl.length && (P.bons || jetonsDe(P.L, P.R) >= MARCHE.prix)) { agir(P, { t: 'marche', ref, place: piger(pl, de).place }); bilan.marche++; }
      }
      if (de() < 0.15) agir(P, { t: 'strategie', id: piger([null, ...Object.keys(STRATEGIES)], de) });
      if (!P.entrainement && de() < 0.3) {
        const r = piger(Object.keys(P.eff.cinq), de);
        const c = P.eff.cinq[r];
        const champs = aTravailler(splits.get(c.ref.id).split, c);
        if (champs.length) {
          agir(P, { t: 'entrainer', r, champion: piger(champs, de) });
          exigerRefus('un seul entraînement à la fois', refuse(P, { t: 'entrainer', r, champion: champs[0] }));
        }
      }
      if (P.eff.banc && de() < 0.15) { agir(P, { t: de() < 0.7 ? 'permuter' : 'relacher' }); bilan.banc++; }
      if (de() < 0.1 && tenter(P, { t: 'pack', id: 'bronze' })) surveiller(P);
      // UN PACK DE JOUEURS : le même tirage deux fois, aucun des tiens, un seul signé, sous le plafond.
      const idPack = piger(Object.keys(PACKS_JOUEURS), de);
      if (marcheOuvert(P.L) && de() < 0.12 && jetonsDe(P.L, P.R) >= prixPackJoueurs(P.R, idPack)) {
        const refs = await tirerPackJoueurs(P.R, idPack, ids, lire, P.eff);
        if (JSON.stringify(refs) !== JSON.stringify(await tirerPackJoueurs(P.R, idPack, ids, lire, P.eff))) faute('un pack de joueurs ne rejoue pas');
        const mes = new Set([...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref)));
        if (refs.length !== PACKS_JOUEURS[idPack].n || refs.some(r => mes.has(cleDe(r)))) faute('un pack de joueurs mal tiré');
        agir(P, { t: 'packJoueurs', id: idPack, refs });
        bilan.packs++;
        if (refs.some(r => !P.cartes.includes(cleDe(r)))) faute('un joueur de pack hors de la collection');
        const signable = refs.map(ref => ({ ref, pl: placements(P.eff, contratDe(ctx, ref)) })).filter(x => x.pl.length);
        if (signable.length && de() < 0.7) {
          const x = piger(signable, de);
          agir(P, { t: 'signerPack', ref: x.ref, place: piger(x.pl, de).place });
          bilan.signesPack++;
          const autre = refs.find(r => cleDe(r) !== cleDe(x.ref));
          exigerRefus('un seul joueur se signe d\'un pack', refuse(P, { t: 'signerPack', ref: autre, place: 'banc' }));
        } else if (signable.length) {
          const x = signable[0];
          agir(P, { t: 'journee' });
          exigerRefus('un pack ne se signe plus après la journée', refuse(P, { t: 'signerPack', ref: x.ref, place: x.pl[0].place }));
          continue;
        }
      }
      if (P.R.cartes.length && de() < 0.2) tenter(P, { t: 'plan', carte: piger(P.R.cartes, de) });
      const E = P.entrainement;
      agir(P, { t: de() < 0.1 ? 'jusqua' : 'journee' });
      // L'entraînement fini : le champion est au bassin, marqué, et coûte moins de confort qu'hors du bassin.
      if (E && !P.entrainement) {
        const c = [...Object.values(P.eff.cinq), P.eff.banc].find(x => x && cleDe(x.ref) === E.cle);
        if (c) {
          bilan.entraines++;
          const b = c.moteur.bassin.find(([x]) => x === E.champion);
          if (!b || !b[3]) faute(`${E.champion} n'est pas entré au bassin de ${c.n}`);
          else if (!(confort(c.moteur, E.champion) > confort(c.moteur, null) && confort(c.moteur, E.champion) < 0)) faute('le confort d\'un champion entraîné');
          if (P.L.jour - E.debut < ENTRAINEMENT.journees) faute('entraînement fini trop tôt');
        }
      }
      if (!milieu && P.L.jour > P.L.journees.length / 2) milieu = { sv: JSON.parse(JSON.stringify(sauvegarde(P))), e: empreinte(P) };
    }
    if (marcheOuvert(P.L)) faute('le marché ouvert après la saison');
    if (graine === 1 && P.run.n === 1) exigerRefus('après la date limite, le marché refuse', refuse(P, { t: 'marche', ref: { ...P.adversaires[0], n: '?' }, place: 'banc' }));
    if (graine === 1 && P.run.n === 1) exigerRefus('après la date limite, les packs de joueurs aussi', refuse(P, { t: 'packJoueurs', id: 'recrues', refs: [] }));
    for (const o of objectifsDe(P.L)) {
      bilan.objectifs++;
      if (o.cible < 2 || o.cible > 5) faute(`objectif à ${o.cible}`);
      if ((o.etat === 'atteint') !== (o.v >= o.cible)) faute(`objectif ${o.debut} : ${o.v}/${o.cible} ${o.etat}`);
    }
    agir(P, { t: 'series' });
    while (P.L.series.champion === null) {
      const s = P.L.series.rondes[P.L.series.rondes.length - 1].find(x => (x.a === 0 || x.b === 0) && x.gagnant === null);
      const avant = s ? s.parties.length : 0;
      agir(P, { t: 'ronde' });
      if (!s) continue;
      bilan.partiesDeSeries += s.parties.length - avant;
      // Version 3 : une partie à la fois, chacune avec son repêchage ; d'avant : la série entière, un repêchage.
      if (P.v >= 3 && (s.parties.length !== avant + 1 || !s.repechages || s.repechages.length !== s.parties.length)) faute('une partie de séries sans son repêchage');
      if (P.v < 3 && (s.gagnant === null || !s.repechage || s.repechages)) faute('une vieille partie ne joue plus sa série d\'un bloc');
    }
    const L = P.L;
    agir(P, { t: 'bilan' });
    if (parCases(P) && P.run.n === 1 && P.run.passes[0].champion) bilan.premiersTitres++;
    // Le commanditaire a été choisi avant la première journée, et il a payé ses parties réussies.
    if (!L.commanditaire) faute('un split sans commanditaire');
    bilan.commandite += P.R.reports[P.R.reports.length - 1].commandite;
    const pass = P.run.passes[P.run.passes.length - 1];
    if (pass.rempli !== mandatRempli(L, pass.mandat)) faute('le bilan ne suit pas le mandat');
    if (P.etape === 'gardes' && parCases(P)) {
      // Ceux qui restent (version 5) : les gardés sont refusés, le prochain départ les tire au loto, et un gardé peut y vieillir.
      const tous = [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean);
      if (P.run.n === 1) exigerRefus('les gardés sont refusés au Rogue', refuse(P, { t: 'garder', cles: [cleDe(tous[0].ref)] }));
      agir(P, { t: 'suivant' });
      if (P.restes.length !== tous.length || casesDe(P).length !== gardesDe(P) || casesDe(P).some(c => c.source !== 'restes')) faute('ceux qui restent ne font pas les cases du prochain départ');
      const c = caseEnCours(P);
      if (c && c.loto.length) {
        const x = contratDe(ctx, refDe(c.loto[0].cle));
        const v = await prochaineVersion(index, lire, x);
        if (v) {
          exigerRefus('on ne vieillit pas en quelqu\'un d\'autre', refuse(P, { t: 'case', cle: c.loto[0].cle, vieux: { ...v, n: 'personne' } }));
          agir(P, { t: 'case', cle: c.loto[0].cle, vieux: v });
          bilan.vieillis++;
          if (!Object.values(P.eff.cinq).some(y => cleDe(y.ref) === cleDe(v))) faute('un gardé du loto n\'a pas vieilli');
        }
      }
    } else if (P.etape === 'gardes') {
      const tous = [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref));
      if (P.run.n === 1 && tous.length > gardesDe(P)) exigerRefus('un gardé de trop est refusé', refuse(P, { t: 'garder', cles: tous.slice(0, gardesDe(P) + 1) }));
      const choix = tous.filter(() => de() < 0.4).slice(0, gardesDe(P));
      // Le joueur qui vieillit : sa version du plus proche split plus récent, s'il en a une.
      const vieux = {};
      for (const c of [...Object.values(P.eff.cinq), P.eff.banc].filter(x => x && choix.includes(cleDe(x.ref)))) {
        const v = await prochaineVersion(index, lire, c);
        if (!v) continue;
        vieux[cleDe(c.ref)] = v;
        const an = id => splits.get(id).split.annee;
        const sautes = index.filter(x => an(x.id) > an(c.ref.id) && an(x.id) < an(v.id)).some(x => splits.get(x.id).split.equipes.some(e => e.joueurs.some(j => j.n === c.n && j.r === c.r)));
        if (sautes) faute(`${c.n} vieillit trop loin`);
      }
      if (P.run.n === 1 && Object.keys(vieux).length) {
        const [k, v] = Object.entries(vieux)[0];
        exigerRefus('on ne vieillit pas en quelqu\'un d\'autre', refuse(P, { t: 'garder', cles: [k], vieux: { [k]: { ...v, n: 'personne' } } }));
      }
      if (!tenter(P, { t: 'garder', cles: choix, vieux })) agir(P, { t: 'garder', cles: [] });
      else {
        surveiller(P);
        bilan.vieillis += Object.keys(vieux).length;
        for (const v of Object.values(vieux)) if (![...Object.values(P.eff.cinq), P.eff.banc].some(c => c && cleDe(c.ref) === cleDe(v))) faute('un gardé n\'a pas vieilli');
      }
    }
  }
  if (P.run.fin === 'gagnee') bilan.gagnees++;
  if (P.run.fin === 'perdue') bilan.perdues++;
  return { P, milieu };
}

const pasRejouees = [];
let col = [];
for (let g = 1; g <= RUNS + 3; g++) {
  // Les trois dernières runs se jouent sous les versions 2, 3 et 4 : une vieille sauvegarde se rejoue pareil (la roulette, les gardés).
  const version = g > RUNS ? g - RUNS + 1 : null;
  // Une run sur deux avec une vedette ; la collection de la run d'avant nourrit le classeur de la suivante.
  const vedette = g % 2 === 0 ? cleDe((await tirerEtoiles(hasard(g), ids, lire, 1))[0]) : null;
  const { P, milieu } = await unRun(g, version, col, vedette);
  col = collectionPour(ctx, [...new Set([...col.map(x => x.cle), ...P.cartes])]);
  if (version && (P.v !== version || sauvegarde(P).v !== version)) pasRejouees.push(`la version ${version} ne se garde pas`);
  const fin = empreinte(P);
  const relu = rejouer(JSON.parse(JSON.stringify(sauvegarde(P))), ctx);
  if (empreinte(relu) !== fin) pasRejouees.push(`${g} au bout`);
  if (milieu && empreinte(rejouer(milieu.sv, ctx)) !== milieu.e) pasRejouees.push(`${g} à mi-split`);
}

const dixhuits = [];
for (let g = 31; g <= 32; g++) dixhuits.push(await unDixHuit(g));
for (const { P } of dixhuits) if (empreinte(rejouer(JSON.parse(JSON.stringify(sauvegarde(P))), ctx)) !== empreinte(P)) pasRejouees.push(`18-0 ${P.graine}`);

for (const [nom, ok] of refusVus) exiger(nom, ok);
exiger('le Rogue part de ses cases et de son pack de départ', bilan.runsRogue > 0 && bilan.cases > 0 && bilan.prises > 0 && bilan.lotosPleins > 0 && bilan.vedettes > 0 && bilan.bouches > 0,
  `${bilan.runsRogue} runs, ${bilan.cases} cases (${bilan.prises} prises, ${bilan.lotosPleins} lotos pleins, ${bilan.vedettes} vedettes), ${bilan.bouches} bouche-trous`);
exiger('la première run reste dure : le titre au premier split est rare', bilan.premiersTitres <= bilan.runsRogue / 3, `${bilan.premiersTitres} titres au premier split sur ${bilan.runsRogue} runs`);
exiger('le 18-0 : la roulette, le split d\'un coup, les séries partie par partie, rien d\'autre', bilan.dixhuit === 2 && dixhuits.some(x => x.parties > 0), dixhuits.map(x => `${x.parties} parties de séries, ${x.P.run.fin}`).join(' · '));
exiger('aucune faute au fil des runs', !fautes.size, [...fautes].slice(0, 4).join(' · ') || `${RUNS} runs, ${bilan.splits} splits, ${bilan.actions} actions`);
exiger('le marché et le banc ont servi', bilan.marche > 0 && bilan.banc > 0, `${bilan.marche} signatures, ${bilan.banc} gestes au banc`);
exiger('les événements ont servi', bilan.evenements > 0, `${bilan.evenements} décisions`);
exiger('les commanditaires ont payé', bilan.commandite > 0, `${bilan.commandite} 🪙 sur ${bilan.splits} splits`);
exiger('des entraînements sont entrés au bassin', bilan.entraines > 0, `${bilan.entraines} champions entraînés`);
exiger('des packs de joueurs ouverts et signés', bilan.packs > 0 && bilan.signesPack > 0, `${bilan.packs} packs, ${bilan.signesPack} signatures`);
exiger('des adjoints offerts, pris, et un staff qui déborde', bilan.offres > 0 && bilan.adjoints > 0 && bilan.quiPart > 0, `${bilan.offres} offres, ${bilan.adjoints} pris, ${bilan.quiPart} « qui part ? »`);
exiger('le coach monte de niveau et prend ses talents', bilan.niveauMax >= 3 && bilan.talents > 0, `niveau ${bilan.niveauMax} au plus, ${bilan.talents} talents`);
exiger('une vieille partie achète encore son coach', bilan.coachsAchetes > 0, `${bilan.coachsAchetes} coachs achetés sous la version 3`);
exiger('tes séries de séries se jouent partie par partie, chacune repêchée', bilan.partiesDeSeries > 0, `${bilan.partiesDeSeries} parties de séries`);
exiger('des gardés ont vieilli', bilan.vieillis > 0, `${bilan.vieillis} joueurs`);
exiger('des runs au plus haut des exigences', bilan.exigences > 0, `${bilan.exigences} runs à 🔺 ${EXIGENCES.length}`);

/* LES CHANCES D'UN PACK : 300 cartes de chaque pack, leurs niveaux contre leurs chances. */
for (const [id, pk] of Object.entries(PACKS_JOUEURS)) {
  const n = new Map();
  let tot = 0;
  const R = { graine: 5, achats: [] };
  for (let k = 0; k < 100; k++) {
    for (const ref of await tirerPackJoueurs(R, id, ids, lire, { cinq: {}, banc: null })) {
      const niv = contratDe(ctx, ref).niveau;
      n.set(niv, (n.get(niv) || 0) + 1);
      tot++;
    }
    R.achats.push({ quoi: 'joueurs', id, prix: 0 });
  }
  const ecarts = TARIFS.map(([niv], k) => [niv, (100 * (n.get(niv) || 0)) / tot, pk.cotes[k]]);
  exiger(`le ${pk.nom.toLowerCase()} sort ses niveaux selon ses chances`, ecarts.every(([, mesure, cible]) => Math.abs(mesure - cible) <= Math.max(4, cible / 3)),
    ecarts.map(([niv, m]) => `${niv} ${Math.round(m)} %`).join(' · '));
}
exiger('chaque run rejoue depuis sa sauvegarde', !pasRejouees.length, pasRejouees.join(', ') || 'au bout et à mi-split, passée par JSON');

/*
 * LE MOTEUR D'AVANT LA VERSION 6, GELÉ : 75 parties jouées le 30 octobre 2026
 * par le code d'avant (scripts/lib/moteur-v1.json : six vraies équipes telles
 * que le moteur les recevait, leurs cartes, leurs stratégies, leurs coachs, et
 * l'empreinte de chaque partie). js/moteur-v1.js doit les redonner au tirage
 * près. Les équipes sont dans le fichier : une donnée corrigée à Leaguepedia
 * n'y change rien.
 */
const hacher = x => createHash('sha1').update(x).digest('hex').slice(0, 16);
const empreinteV1 = f => hacher(JSON.stringify([f.duree, f.gagnant, f.equipes.map(e => [e.k, e.or, e.tours, e.dragons, e.barons, e.herauts, e.inhib, e.joueurs.map(j => [j.k, j.m, j.a, j.or])]), f.fil.length, f.pouvoirs.map(p => [p.t, p.camp, p.id])]));
const gelees = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lib/moteur-v1.json'), 'utf8'));
const autrement = gelees.parties.filter(p => {
  const eq = [p.a, p.b].map((x, k) => ({ ...gelees.equipes[x], ...(p.equipeEffets[k] ? { effets: p.equipeEffets[k] } : {}), ...(p.coachs[k] ? { pouvoirs: COACHS[p.coachs[k]].pouvoirs } : {}) }));
  return empreinteV1(jouerPartieV1(eq[0], eq[1], p.graine, p.effets)) !== p.empreinte;
});
exiger('le moteur d\'avant la version 6 redonne ses parties gelées', !autrement.length, `${gelees.parties.length - autrement.length} sur ${gelees.parties.length}`);

/* Une sauvegarde de la version 5 (un 18-0 de ce script, relu comme tel) joue le moteur d'alors. */
const sv5 = JSON.parse(JSON.stringify(sauvegarde(dixhuits[0].P)));
sv5.v = 5;
sv5.log = sv5.log.slice(0, sv5.log.findIndex(a => a.t === 'jusqua') + 1);
// Une run qui ne se rejoue plus refuse une action en chemin : c'est une faute, pas un plantage.
const relire = sv => { try { return rejouer(sv, ctx); } catch (err) { return { refus: err.message }; } };
const relue5 = relire(sv5);
exiger('une sauvegarde de la version 5 joue le moteur d\'alors', !relue5.refus && relue5.L.moteur === 1 && relue5.L.journees.flat().every(s => s.parties.every(p => p.feuille.moteur === undefined)),
  relue5.refus || `${relue5.L.journees.flat().length} séries`);

/*
 * UNE RUN DE LA VERSION 5, gelée le 30 octobre 2026 avec l'empreinte de ses
 * parties (le robot de scripts/lib/robot.mjs, deux splits, tous les
 * déblocages, l'agresseur) : rejouée aujourd'hui, elle redonne chaque partie
 * au tirage près. Elle tire ses joueurs des shards : rebâtis (une donnée
 * corrigée à Leaguepedia), la run part ailleurs. Elle ne se juge donc que sur
 * les shards où elle a été gelée (leur empreinte, `shards`) ; ailleurs, les
 * parties gelées du moteur d'avant, plus haut, en répondent.
 */
const empreinteDesParties = P => {
  const L = P.L || P.dernier;
  const parties = [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].flatMap(s => s.parties.map(p => [p.feuille.duree, p.feuille.gagnant, p.feuille.equipes.map(e => [e.k, Math.round(e.or), e.tours, e.dragons])]));
  return JSON.stringify({ etape: P.etape, run: P.run, jetons: jetonsDe(P.L, P.R), parties });
};
const gelee = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lib/partie-v5.json'), 'utf8'));
const shards = hacher(Buffer.concat(fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort().map(f => fs.readFileSync(path.join(DOSSIER, f)))));
if (shards === gelee.shards) {
  const relue = relire(JSON.parse(JSON.stringify(gelee.sauvegarde)));
  exiger('une run de la version 5 se rejoue identique, partie pour partie', !relue.refus && relue.v === 5 && (relue.L || relue.dernier).moteur === 1 && empreinteDesParties(relue) === gelee.empreinte,
    relue.refus ? `refusée en chemin : ${relue.refus}` : `${relue.run.passes.length} splits, ${JSON.parse(gelee.empreinte).parties.length} parties du dernier`);
} else informer('une run de la version 5 : gelée sur d\'autres shards', `les leurs ${gelee.shards}, ceux-ci ${shards} ; le moteur d'avant répond par ses parties gelées`);
const neuve = nouvellePartie(1, {});
exiger('une partie neuve joue le moteur d\'aujourd\'hui', neuve.v >= 6 && dixhuits.every(({ P }) => P.dernier && P.dernier.moteur === 2 && P.dernier.journees[0][0].parties[0].feuille.moteur === 2),
  `version ${neuve.v}`);
informer('les runs', `${bilan.gagnees} gagnées, ${bilan.perdues} perdues, ${bilan.objectifs} objectifs jugés, ${bilan.refusAttendus} refus attendus`);

verdict('La gestion');
