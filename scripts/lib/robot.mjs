/*
 * UN DG ROBOT, pour les scripts qui ont besoin de runs entières (check_meta) :
 * il joue par les mêmes actions que l'écran (js/partie.js) — la roulette, la
 * signature, le split, les décisions au hasard, les séries, le bilan, ceux
 * qu'on garde. check_gestion a le sien, plus curieux : celui-ci va droit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit } from '../../js/cotes.js';
import { tempoDuSplit, equipeReelle } from '../../js/sim.js';
import { hasard, piger } from '../../js/hasard.js';
import { tirer, tirerAdversaires, tirerBoucheTrous, signables, cleDe } from '../../js/gestion.js';
import { nouvellePartie, appliquer, vestiaireDe, enAttente, gardesDe, parCases, caseEnCours, attendPack, contratDe, refDe } from '../../js/partie.js';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

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

/**
 * BÂTIR LE CINQ, comme l'écran : au Rogue (version 5), chaque case ouvre son
 * loto et le robot prend une carte qui se paie (sinon il passe), puis le pack
 * de départ ; au 18-0 et dans une vieille partie, la roulette, un tour par case.
 */
export async function batir(P, { ctx, ids, lire }, de, prendre = 0.85) {
  const agir = a => appliquer(P, a, ctx);
  if (parCases(P)) {
    let c;
    while ((c = caseEnCours(P))) {
      const ok = c.loto.filter(x => { try { return !P.eff.cinq[contratDe(ctx, refDe(x.cle)).r]; } catch { return false; } });
      const cle = ok.length && (c.source === 'vedette' || de() < prendre) ? piger(ok, de).cle : null;
      try { agir({ t: 'case', cle }); } catch { agir({ t: 'case', cle: null }); }
    }
    if (attendPack(P)) agir({ t: 'boucheTrous', refs: await tirerBoucheTrous(de, ids, lire, P.eff, P.fx.bouchetrous) });
    return;
  }
  while (P.etape === 'bati' && Object.keys(P.eff.cinq).length < 5) {
    if (!P.tirage) agir({ t: 'tirage', mode: 'tour', ...(await tirer(de, ids, lire, P.eff, 'tour')) });
    const v = vestiaireDe(P, ctx);
    const j = piger(signables(P.eff, v.equipe, v.profils.joueurs), de);
    agir({ t: 'signer', n: j.n, r: j.r });
  }
}

/** Ta collection telle que nouvellePartie la lit, depuis des clés de cartes : [{ cle, niveau }]. */
export const collectionPour = (ctx, cles) => cles.map(cle => { try { return { cle, niveau: contratDe(ctx, refDe(cle)).niveau }; } catch { return null; } }).filter(Boolean);

/** Joue une run jusqu'à sa fin (ou `splitsMax` splits) ; rend la partie. `options` : ceux de nouvellePartie. */
export async function jouerUneRun(graine, C, options = {}, splitsMax = 5) {
  const { ctx, ids, lire } = C;
  const de = hasard(graine);
  const P = nouvellePartie(graine, options);
  const agir = a => appliquer(P, a, ctx);
  while (P.etape !== 'fin' && P.run.n <= splitsMax) {
    await batir(P, C, de);
    agir({ t: 'lancer', adversaires: await tirerAdversaires(de, ids, lire, equipeReelle), graine: Math.floor(de() * 2 ** 32) });
    while (P.L.jour < P.L.journees.length) {
      const ev = enAttente(P);
      agir(ev ? { t: 'evenement', choix: piger(ev.choix, de) } : { t: 'journee' });
    }
    agir({ t: 'series' });
    while (P.L.series.champion === null) agir({ t: 'ronde' });
    agir({ t: 'bilan' });
    if (P.etape === 'gardes' && parCases(P)) agir({ t: 'suivant' });
    else if (P.etape === 'gardes') {
      const tous = [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).map(c => cleDe(c.ref));
      try { agir({ t: 'garder', cles: tous.filter(() => de() < 0.4).slice(0, gardesDe(P)) }); } catch { agir({ t: 'garder', cles: [] }); }
    }
  }
  return P;
}
