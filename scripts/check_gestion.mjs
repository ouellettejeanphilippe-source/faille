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
 *   le vieillissement un gardé devient sa version du plus proche split plus
 *                    récent, et le plafond tient avec elle ;
 *   la collection    chaque joueur passé chez toi y entre ;
 *   la sauvegarde    le journal, passé par JSON et rejoué, redonne la même
 *                    partie, à la fin comme au milieu.
 *
 *   node scripts/check_gestion.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit, PLAFOND, TARIFS } from '../js/cotes.js';
import { tempoDuSplit, equipeReelle, classement } from '../js/sim.js';
import { hasard, piger } from '../js/hasard.js';
import { jetonsDe } from '../js/rogue.js';
import { RELANCES, MARCHE, ENTRAINEMENT, PACKS_JOUEURS, aTravailler, tirer, tirerAdversaires, agentsLibres, placements, masseDe, plafondDe, cleDe, marcheOuvert, signables, objectifsDe, mandatRempli, tirerPackJoueurs, prixPackJoueurs, prochaineVersion } from '../js/gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, enAttente, sauvegarde, rejouer, gardesDe, relancesMax, offreDe, mandatDuSplit } from '../js/partie.js';
import { DEBLOCAGES, EXIGENCES } from '../js/meta.js';
import { confort } from '../js/repechage.js';
import { STRATEGIES } from '../js/strategie.js';
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
  etape: P.etape, strategie: P.strategie, run: P.run, jetons: jetonsDe(P.L, P.R), cartes: P.R.cartes, plan: P.R.plan, coach: P.R.coach,
  eff: [...Object.values(P.eff.cinq), P.eff.banc].map(c => c && cleDe(c.ref)), relances: P.relances, bons: P.bons,
  ligue: P.L && [P.L.jour, classement(P.L).map(l => [l.i, l.v, l.d]), P.L.series && P.L.series.champion],
});

const bilan = { partiesDeSeries: 0, exigences: 0, packs: 0, signesPack: 0, vieillis: 0, entraines: 0, commandite: 0, actions: 0, refusAttendus: 0, splits: 0, gagnees: 0, perdues: 0, marche: 0, banc: 0, evenements: 0, objectifs: 0 };
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
  if (masseDe(P.eff) > plafondDe(P.eff)) faute(`plafond dépassé : ${masseDe(P.eff)} après ${JSON.stringify(P.log[P.log.length - 1]).slice(0, 80)} (${P.etape})`);
  if (plafondDe(P.eff) !== PLAFOND + P.fx.plafond) faute(`le plafond de la run s'est perdu : ${plafondDe(P.eff)}`);
  if (jetonsDe(P.L, P.R) < 0) faute('jetons sous zéro');
  for (const k of Object.keys(RELANCES)) if (P.relances[k] > relancesMax(P, k)) faute(`relances ${k} : ${P.relances[k]}`);
};
/* Un refus attendu se juge une fois : faux une seule fois, et c'est une faute. */
const refusVus = new Map();
const exigerRefus = (nom, ok) => refusVus.set(nom, (refusVus.get(nom) ?? true) && ok);
const agir = (P, a) => { const r = appliquer(P, a, ctx); surveiller(P); return r; };

async function unRun(graine, version = null) {
  const de = hasard(graine);
  // Une run sur deux avec tous les déblocages du méta, une sur trois au plus haut des exigences : les règles tiennent avec eux.
  const exig = graine % 3 === 0 ? EXIGENCES.length : 0;
  const P = nouvellePartie(graine, { deb: graine % 2 ? [] : Object.keys(DEBLOCAGES), club: { nom: 'Les Lynx', code: 'LYX', couleur: '#3fb6c9' }, exig });
  if (exig && (plafondDe(P.eff) !== PLAFOND - 1 || mandatDuSplit(P)[0] !== 'demie' || Object.keys(RELANCES).some(k => relancesMax(P, k) !== RELANCES[k][1] - (graine % 2 ? 1 : 0)) || jetonsDe(null, P.R) !== (graine % 2 ? 10 : 35))) {
    faute(`les exigences ne se posent pas : plafond ${plafondDe(P.eff)}, mandat ${mandatDuSplit(P)[0]}, jetons ${jetonsDe(null, P.R)}`);
  }
  if (exig) bilan.exigences++;
  // Une partie d'avant la version 3 garde sa règle : une série de séries se joue d'un bloc, d'un seul repêchage.
  if (version) P.v = version;
  let milieu = null;
  while (P.etape !== 'fin' && P.run.n <= SPLITS_MAX) {
    // LE REPÊCHAGE : un tour par case, parfois une relance.
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
    // Le commanditaire a été choisi avant la première journée, et il a payé ses parties réussies.
    if (!L.commanditaire) faute('un split sans commanditaire');
    bilan.commandite += P.R.reports[P.R.reports.length - 1].commandite;
    const pass = P.run.passes[P.run.passes.length - 1];
    if (pass.rempli !== mandatRempli(L, pass.mandat)) faute('le bilan ne suit pas le mandat');
    if (P.etape === 'gardes') {
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
for (let g = 1; g <= RUNS + 1; g++) {
  // La dernière run se joue sous la version 2 : une vieille sauvegarde se rejoue pareil.
  const { P, milieu } = await unRun(g, g > RUNS ? 2 : null);
  if (g > RUNS && (P.v !== 2 || sauvegarde(P).v !== 2)) pasRejouees.push('la version 2 ne se garde pas');
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
exiger('des packs de joueurs ouverts et signés', bilan.packs > 0 && bilan.signesPack > 0, `${bilan.packs} packs, ${bilan.signesPack} signatures`);
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
informer('les runs', `${bilan.gagnees} gagnées, ${bilan.perdues} perdues, ${bilan.objectifs} objectifs jugés, ${bilan.refusAttendus} refus attendus`);

verdict('La gestion');
