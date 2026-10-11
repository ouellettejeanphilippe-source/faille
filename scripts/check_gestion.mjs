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
 *   la sauvegarde    le journal, passé par JSON et rejoué, redonne la même
 *                    partie, à la fin comme au milieu.
 *
 *   node scripts/check_gestion.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit, PLAFOND } from '../js/cotes.js';
import { tempoDuSplit, equipeReelle, classement } from '../js/sim.js';
import { hasard, piger } from '../js/hasard.js';
import { jetonsDe } from '../js/rogue.js';
import { RELANCES, MARCHE, ENTRAINEMENT, aTravailler, tirer, tirerAdversaires, agentsLibres, placements, masseDe, cleDe, marcheOuvert, signables, objectifsDe, mandatRempli } from '../js/gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, enAttente, sauvegarde, rejouer, GARDES } from '../js/partie.js';
import { confort } from '../js/repechage.js';
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
exiger('des splits à lire', ids.length > 0, `${ids.length} splits`);

/* L'empreinte d'une partie : ce qu'un joueur verrait. */
const empreinte = P => JSON.stringify({
  etape: P.etape, run: P.run, jetons: jetonsDe(P.L, P.R), cartes: P.R.cartes, plan: P.R.plan, coach: P.R.coach,
  eff: [...Object.values(P.eff.cinq), P.eff.banc].map(c => c && cleDe(c.ref)), relances: P.relances, bons: P.bons,
  ligue: P.L && [P.L.jour, classement(P.L).map(l => [l.i, l.v, l.d]), P.L.series && P.L.series.champion],
});

const bilan = { entraines: 0, commandite: 0, actions: 0, refusAttendus: 0, splits: 0, gagnees: 0, perdues: 0, marche: 0, banc: 0, evenements: 0, objectifs: 0 };
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
  if (masseDe(P.eff) > PLAFOND) faute(`plafond dépassé : ${masseDe(P.eff)} après ${JSON.stringify(P.log[P.log.length - 1]).slice(0, 80)} (${P.etape})`);
  if (jetonsDe(P.L, P.R) < 0) faute('jetons sous zéro');
  for (const [k, [, max]] of Object.entries(RELANCES)) if (P.relances[k] > max) faute(`relances ${k} : ${P.relances[k]}`);
};
/* Un refus attendu se juge une fois : faux une seule fois, et c'est une faute. */
const refusVus = new Map();
const exigerRefus = (nom, ok) => refusVus.set(nom, (refusVus.get(nom) ?? true) && ok);
const agir = (P, a) => { const r = appliquer(P, a, ctx); surveiller(P); return r; };

async function unRun(graine) {
  const de = hasard(graine);
  const P = nouvellePartie(graine);
  let milieu = null;
  while (P.etape !== 'fin' && P.run.n <= SPLITS_MAX) {
    // LE REPÊCHAGE : un tour par case, parfois une relance.
    while (P.etape === 'bati' && Object.keys(P.eff.cinq).length < 5) {
      if (!P.tirage) {
        const t = await tirer(de, ids, lire, P.eff, 'tour');
        if (!t) { faute('la roulette ne trouve rien'); return P; }
        agir(P, { t: 'tirage', mode: 'tour', ...t });
      }
      const dispo = Object.keys(RELANCES).filter(k => P.relances[k] < RELANCES[k][1]);
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
      const Q = nouvellePartie(9);
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
        agir(P, { t: 'evenement', choix: piger(ev.choix, de) });
        bilan.evenements++;
        continue;
      }
      if (marcheOuvert(P.L) && de() < 0.35) {
        const offre = await agentsLibres(P.L, ids, lire, P.eff, P.adversaires);
        const encore = await agentsLibres(P.L, ids, lire, P.eff, P.adversaires);
        if (JSON.stringify(offre) !== JSON.stringify(encore)) faute('le marché ne rejoue pas');
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
    for (const o of objectifsDe(P.L)) {
      bilan.objectifs++;
      if (o.cible < 2 || o.cible > 5) faute(`objectif à ${o.cible}`);
      if ((o.etat === 'atteint') !== (o.v >= o.cible)) faute(`objectif ${o.debut} : ${o.v}/${o.cible} ${o.etat}`);
    }
    agir(P, { t: 'series' });
    while (P.L.series.champion === null) agir(P, { t: 'ronde' });
    const L = P.L;
    agir(P, { t: 'bilan' });
    // Le commanditaire a été choisi avant la première journée, et il a payé ses parties réussies.
    if (!L.commanditaire) faute('un split sans commanditaire');
    bilan.commandite += P.R.reports[P.R.reports.length - 1].commandite;
    const pass = P.run.passes[P.run.passes.length - 1];
    if (pass.rempli !== mandatRempli(L, pass.mandat)) faute('le bilan ne suit pas le mandat');
    if (P.etape === 'gardes') {
      const tous = [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref));
      if (P.run.n === 1) exigerRefus(`${GARDES + 1} gardés sont refusés`, refuse(P, { t: 'garder', cles: tous.slice(0, GARDES + 1) }));
      const choix = tous.filter(() => de() < 0.4).slice(0, GARDES);
      if (!tenter(P, { t: 'garder', cles: choix })) agir(P, { t: 'garder', cles: [] });
      else surveiller(P);
    }
  }
  if (P.run.fin === 'gagnee') bilan.gagnees++;
  if (P.run.fin === 'perdue') bilan.perdues++;
  return { P, milieu };
}

const pasRejouees = [];
for (let g = 1; g <= RUNS; g++) {
  const { P, milieu } = await unRun(g);
  const fin = empreinte(P);
  const relu = rejouer(JSON.parse(JSON.stringify(sauvegarde(P))), ctx);
  if (empreinte(relu) !== fin) pasRejouees.push(`${g} au bout`);
  if (milieu && empreinte(rejouer(milieu.sv, ctx)) !== milieu.e) pasRejouees.push(`${g} à mi-split`);
}

for (const [nom, ok] of refusVus) exiger(nom, ok);
exiger('aucune faute au fil des runs', !fautes.size, [...fautes].slice(0, 4).join(' · ') || `${RUNS} runs, ${bilan.splits} splits, ${bilan.actions} actions`);
exiger('le marché et le banc ont servi', bilan.marche > 0 && bilan.banc > 0, `${bilan.marche} signatures, ${bilan.banc} gestes au banc`);
exiger('les événements ont servi', bilan.evenements > 0, `${bilan.evenements} décisions`);
exiger('les commanditaires ont payé', bilan.commandite > 0, `${bilan.commandite} 🪙 sur ${bilan.splits} splits`);
exiger('des entraînements sont entrés au bassin', bilan.entraines > 0, `${bilan.entraines} champions entraînés`);
exiger('chaque run rejoue depuis sa sauvegarde', !pasRejouees.length, pasRejouees.join(', ') || 'au bout et à mi-split, passée par JSON');
informer('les runs', `${bilan.gagnees} gagnées, ${bilan.perdues} perdues, ${bilan.objectifs} objectifs jugés, ${bilan.refusAttendus} refus attendus`);

verdict('La gestion');
