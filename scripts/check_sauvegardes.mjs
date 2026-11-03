/*
 * LES VIEILLES PARTIES (la Q10, docs/parite-cap82.md B7 et J4 ; Cap 82-0, scripts/check_sauvegardes.mjs). Une partie
 * en cours se rejoue avec les règles d'aujourd'hui : un geste que le jeu ne connaît plus — une carte au plan, un pack
 * de cartes, un adjoint du staff, un coach acheté, un gardé au choix — s'ignore, et l'écran le dit une fois. Ce juge
 * recharge des parties gelées par le code d'avant (scripts/lib/sauvegardes-v8.json : des runs du robot sous les
 * versions 5 à 8, finies et coupées en cours de split, avec leur staff, leurs cartes, leurs packs, leurs stratégies),
 * et exige :
 *
 *   1. chacune se recharge sans planter, et ses gestes d'avant s'ignorent, comptés ;
 *   2. son moteur reste celui de sa version (une partie d'avant la version 6 joue js/moteur-v1.js) ;
 *   3. elle se rejoue pareil deux fois, et regardée, elle ne garde que ses gestes qui jouent : rechargée encore, rien
 *      ne s'ignore plus (« l'écran le dit une fois ») ;
 *   4. elle se joue encore : la décision qui attend, la journée, la ronde, le bilan ;
 *   5. le méta n'est jamais réécrit : un split noté reste tel qu'il a été joué, une fin notée reste notée, une carte
 *      entrée à la collection y reste.
 *
 * Les parties tirent leurs joueurs des shards : rebâtis, elles partent ailleurs. Elles ne se jugent donc que sur les
 * shards où elles ont été gelées (`shards`) ; ailleurs, le juge le dit.
 *
 *   node scripts/check_sauvegardes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { contexte } from './lib/robot.mjs';
import { rejouer, sauvegarde, appliquer, enAttente, nouvellePartie } from '../js/partie.js';
import { nouveauMeta, noter } from '../js/meta.js';
import { classement } from '../js/sim.js';
import { exiger, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOSSIER = path.join(ROOT, 'data/splits');
const { ctx } = contexte();
const hacher = x => createHash('sha1').update(x).digest('hex').slice(0, 16);
const shards = fs.existsSync(DOSSIER) ? hacher(Buffer.concat(fs.readdirSync(DOSSIER).filter(f => f.endsWith('.json')).sort().map(f => fs.readFileSync(path.join(DOSSIER, f))))) : null;
const empreinte = P => JSON.stringify({ etape: P.etape, run: P.run, main: P.main, strategie: P.strategie, ligue: P.L && [P.L.jour, classement(P.L).map(l => [l.i, l.v, l.d])] });
const relire = sv => { try { return rejouer(JSON.parse(JSON.stringify(sv)), ctx); } catch (err) { return { plante: err.message }; } };

/* Ce que la partie fait ensuite : la décision qui attend, puis la journée, la ronde, les séries, le bilan, le split suivant. */
function jouerEncore(P) {
  for (let k = 0; k < 6; k++) {
    const ev = enAttente(P);
    const a = ev ? { t: 'evenement', choix: ev.choix[0] }
      : P.etape === 'split' && P.L.jour < P.L.journees.length ? { t: 'journee' }
        : P.etape === 'split' && !P.L.series ? { t: 'series' }
          : P.etape === 'split' && P.L.series.champion === null ? { t: 'ronde' }
            : P.etape === 'split' ? { t: 'bilan' } : P.etape === 'gardes' ? { t: 'suivant' } : null;
    if (!a) return;
    appliquer(P, a, ctx);
  }
}

const gelees = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lib/sauvegardes-v8.json'), 'utf8'));
if (shards !== gelees.shards) {
  informer('les parties gelées le sont sur d\'autres shards', `les leurs ${gelees.shards}, ceux-ci ${shards} : rebâtis, ils changent les joueurs`);
} else {
  const plantees = [], moteurs = [], pasPareil = [], encore = [], restes = [];
  let ignores = 0, versions = new Set();
  for (const g of gelees.saves) {
    const P = relire(g.sv);
    if (P.plante) { plantees.push(`${g.nom} : ${P.plante}`); continue; }
    versions.add(g.sv.v);
    ignores += P.ignores;
    const L = P.L || P.dernier;
    if (L && L.moteur !== (g.sv.v >= 6 ? 2 : 1)) moteurs.push(`${g.nom} : moteur ${L.moteur}`);
    const Q = relire(g.sv);
    if (empreinte(Q) !== empreinte(P) || Q.ignores !== P.ignores) pasPareil.push(g.nom);
    const R = relire(sauvegarde(P));
    if (R.plante || R.ignores || empreinte(R) !== empreinte(P)) restes.push(`${g.nom} : ${R.plante || `${R.ignores} encore ignorés`}`);
    try { jouerEncore(P); } catch (err) { encore.push(`${g.nom} : ${err.message}`); }
  }
  exiger('chaque partie gelée se recharge, avec les règles d\'aujourd\'hui', !plantees.length, plantees.slice(0, 3).join(' · ') || `${gelees.saves.length} parties, versions ${[...versions].sort().join(', ')}`);
  exiger('ses gestes d\'avant s\'ignorent, comptés', ignores > 0, `${ignores} gestes ignorés en tout`);
  exiger('son moteur reste celui de sa version', !moteurs.length, moteurs.join(' · ') || 'v5 : le moteur gelé ; v6 et après : celui d\'aujourd\'hui');
  exiger('elle se rejoue pareil deux fois', !pasPareil.length, pasPareil.join(', ') || 'au caractère près');
  exiger('regardée, elle ne garde que ses gestes qui jouent : rechargée, rien ne s\'ignore plus', !restes.length, restes.slice(0, 3).join(' · ') || 'l\'écran le dit une fois');
  exiger('elle se joue encore', !encore.length, encore.slice(0, 3).join(' · ') || 'la décision, la journée, la ronde, le bilan');
}

/* La run de la version 5 gelée le 30 octobre 2026 (scripts/lib/partie-v5.json) : sur ses shards, elle se recharge au moteur gelé. */
const v5 = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lib/partie-v5.json'), 'utf8'));
if (shards === v5.shards) {
  const P = relire(v5.sauvegarde);
  exiger('la run de la version 5 du 30 octobre se recharge, au moteur gelé', !P.plante && (P.L || P.dernier).moteur === 1, P.plante || `${P.run.passes.length} splits, ${P.ignores} gestes ignorés`);
} else informer('la run de la version 5 du 30 octobre : gelée sur d\'autres shards', `les leurs ${v5.shards}, ceux-ci ${shards}`);

/* 5. Le méta n'est jamais réécrit : une partie notée, puis rejouée autrement, garde ce qui a été noté. */
{
  const m = nouveauMeta();
  const faux = nouvellePartie(3, { coach: 'stratege' });
  faux.cartes = ['a|b|c|haut', 'a|b|d|jungle'];
  faux.run.passes = [{ n: 1, mandat: 'series', rempli: true, champion: false, rang: 4, fiche: [11, 7], rondes: 1, trophees: [], galons: [], records: {}, sursis: false }];
  faux.run.fin = null;
  noter(m, 'p', faux, 1);
  const avant = JSON.stringify(m.parties.p.passes);
  // La même partie, rejouée avec les règles d'aujourd'hui : son split est sorti autrement, une carte n'y est plus, la run finit.
  faux.run.passes = [{ ...faux.run.passes[0], rempli: false, rang: 9, fiche: [5, 13], rondes: 0 }, { n: 2, mandat: 'trois', rempli: true, champion: true, rang: 1, fiche: [15, 3], rondes: 3, trophees: [], galons: [], records: {}, sursis: false }];
  faux.cartes = ['a|b|c|haut'];
  faux.run.fin = 'gagnee';
  noter(m, 'p', faux, 2);
  const r = m.parties.p;
  exiger('le méta n\'est jamais réécrit : un split noté reste tel quel, le suivant s\'y ajoute, une carte reste à la collection',
    JSON.stringify(r.passes.slice(0, 1)) === avant && r.passes.length === 2 && r.passes[1].champion && r.cartes.includes('a|b|d|jungle') && r.fin === 'gagnee' && r.debut === 1,
    `${r.passes.length} splits notés, ${r.cartes.length} cartes`);
  faux.run.fin = 'perdue';
  noter(m, 'p', faux, 3);
  exiger('une fin notée reste notée', m.parties.p.fin === 'gagnee');
}

verdict('Les vieilles parties');
