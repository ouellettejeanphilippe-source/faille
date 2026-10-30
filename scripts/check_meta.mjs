/*
 * LE MÉTA (js/meta.js) ET LE PALMARÈS (js/palmares.js). Des runs entières
 * jouées par un robot (scripts/lib/robot.mjs), notées au méta ; puis :
 *
 *   rien de compté      noter une partie deux fois la note pareil ; les
 *                       médailles se recomptent des splits joués, à la main ;
 *   les achats          un déblocage se refuse sans médailles, sous son rang,
 *                       avant celui qui le précède ; acheté, il ne se rachète
 *                       pas, et les médailles ne passent jamais sous zéro ;
 *   la collection       chaque joueur passé chez toi y est, une copie par
 *                       partie ; la finition suit les copies ;
 *   le palmarès         les trophées se recomptent dans les feuilles ; chaque
 *                       galon nomme une carte de la partie ; les galons sortent
 *                       dans une part des splits, pas à chaque fois (mesuré
 *                       sur de vraies équipes) ; le panthéon garde le meilleur.
 *
 *   node scripts/check_meta.mjs
 */
import { creerSplit, jouerJournee, creerSeries, jouerRonde } from '../js/sim.js';
import { nouveauMeta, noter, medailles, medaillesDeLaPartie, MEDAILLES, acheter, refusAchat, rangDe, DEBLOCAGES, RANGS, collectionDe, editionDe, pantheonDe, porter, clubDe, deblocagesDe, effetDe, EXIGENCES, PRIME_EXIGENCE, exigenceMax, exigenceDe, choisirExigence, choisirVedette, vedetteDe, MODES, modeDe } from '../js/meta.js';
import { tirerEtoiles, cleDe } from '../js/gestion.js';
import { hasard } from '../js/hasard.js';
import { statsDuSplit, tropheesDuSplit, galonsDuSplit, recordsDuSplit, meneurs, MENEURS, GALONS } from '../js/palmares.js';
import { lireSplits, ligueDEssai } from './lib/vestiaires.mjs';
import { contexte, jouerUneRun, collectionPour } from './lib/robot.mjs';
import { exiger, informer, verdict } from './verdict.mjs';

const C = contexte();
exiger('des splits à lire', C.ids.length > 0, `${C.ids.length} splits`);

/* LE MÉTA SUR DES RUNS JOUÉES */
const m = nouveauMeta();
exiger('le méta part au Rogue, sans vedette', modeDe(m) === 'rogue' && vedetteDe(m) === null && Object.keys(MODES).length === 2);
// Ton joueur de concession : choisi une fois, à la première run.
const etoile = cleDe((await tirerEtoiles(hasard(7), C.ids, C.lire, 1))[0]);
exiger('la vedette se choisit une fois', !choisirVedette(m, 'pas une clé') && choisirVedette(m, etoile) && !choisirVedette(m, etoile) && vedetteDe(m) === etoile);
const parties = [];
for (let g = 1; g <= 6; g++) {
  // Le classeur de chaque run tire de la collection d'alors ; la vedette revient à chaque départ.
  const P = await jouerUneRun(100 + g, C, { deb: g > 3 ? deblocagesDe(m) : [], club: clubDe(m), coach: 'stratege', col: collectionPour(C.ctx, [...collectionDe(m).keys()]), vedette: vedetteDe(m) });
  parties.push(P);
  noter(m, `p${g}`, P, g);
  if (g === 3) for (const id of Object.keys(DEBLOCAGES)) acheter(m, `deb:${id}`);
}
exiger('la vedette ouvre chaque run', parties.every(P => P.cartes[0] === etoile), etoile);
// Le 18-0 compte à la collection, pas aux médailles.
const D = await jouerUneRun(150, C, { mode: 'dixhuit', club: clubDe(m) });
noter(m, 'd1', D, 7);
exiger('le 18-0 ne paie aucune médaille et compte à la collection', medaillesDeLaPartie(m.parties.d1) === 0 && m.parties.d1.mode === 'dixhuit' && D.cartes.length >= 5 && D.cartes.every(c => collectionDe(m).has(c)), `${D.cartes.length} cartes`);
delete m.parties.d1;
const avant = JSON.stringify(m);
const rechange = parties.map((P, k) => noter(m, `p${k + 1}`, P, 999));
exiger('noter deux fois ne change rien', !rechange.some(Boolean) && JSON.stringify(m) === avant, 'les résumés, les dates et les médailles');

const aLaMain = P => P.run.passes.reduce((s, p) => s + 1 + (p.rempli ? 2 : 0) + p.rondes + (p.champion ? 3 : 0), 0) + (P.run.fin === 'gagnee' ? 5 : 0);
exiger('les médailles se recomptent des splits', parties.every(P => medaillesDeLaPartie(m.parties[`p${parties.indexOf(P) + 1}`]) === aLaMain(P)) && MEDAILLES.split === 1,
  `${medailles(m).gagnees} 🏅 gagnées sur ${parties.reduce((s, P) => s + P.run.passes.length, 0)} splits`);
exiger('les médailles ne passent jamais sous zéro', medailles(m).reste >= 0, `${medailles(m).reste} 🏅 qui restent`);
exiger('les déblocages des runs 4 à 6 étaient posés', parties.slice(3).every(P => JSON.stringify(P.deb) === JSON.stringify(deblocagesDe(m))), deblocagesDe(m).join(', ') || 'aucun acheté');

/* LES ACHATS : sur un méta neuf, puis riche. */
const pauvre = nouveauMeta();
exiger('sans médailles, rien ne s\'achète', Object.keys(DEBLOCAGES).every(id => refusAchat(pauvre, `deb:${id}`) !== null) && !acheter(pauvre, 'deb:bourse'));
const riche = nouveauMeta();
riche.parties.x = { debut: 0, fin: 'gagnee', passes: Array.from({ length: 40 }, (_, n) => ({ n, rempli: true, champion: true, rondes: 3 })), cartes: [] };
exiger('le mécène attend la bourse', refusAchat(riche, 'deb:mecene') !== null && acheter(riche, 'deb:bourse') && acheter(riche, 'deb:mecene'));
exiger('un déblocage ne se rachète pas', !acheter(riche, 'deb:bourse'));
exiger('le rang suit les médailles gagnées à vie', rangDe(riche).k === RANGS.length - 1 && rangDe(pauvre).k === 0, `${rangDe(riche).nom} · ${rangDe(pauvre).nom}`);
const moyen = nouveauMeta();
moyen.parties.x = { debut: 0, fin: 'perdue', passes: [{ n: 1, rempli: true, champion: false, rondes: 1 }, { n: 2, rempli: true, champion: false, rondes: 1 }], cartes: [] };
exiger('un rang trop bas refuse', refusAchat(moyen, 'deb:sursis') !== null && medailles(moyen).reste >= DEBLOCAGES.bourse.prix, `${medailles(moyen).gagnees} 🏅, ${rangDe(moyen).nom}`);
exiger('un club se porte une fois acheté', !porter(pauvre, 'club', 'lynx') && acheter(riche, 'club:lynx') && porter(riche, 'club', 'lynx') && clubDe(riche).nom === 'Les Lynx');
exiger('les effets des déblocages se somment', effetDe(['bourse', 'mecene']).jetons === 25 && effetDe([]).gardes === 0);

/* LES EXIGENCES : fermées avant un titre, puis un cran à la fois ; chacune s'ajoute aux autres ; la prime en médailles. */
const ex = nouveauMeta();
exiger('aucune exigence avant un premier titre', exigenceMax(ex) === 0 && !choisirExigence(ex, 1));
ex.parties.a = { debut: 0, fin: 'gagnee', exig: 0, passes: [{ n: 1, rempli: true, champion: true, rondes: 3 }], cartes: [] };
exiger('un titre ouvre le premier cran, pas le deuxième', exigenceMax(ex) === 1 && choisirExigence(ex, 1) && !choisirExigence(ex, 2) && exigenceDe(ex) === 1);
ex.parties.b = { debut: 1, fin: 'gagnee', exig: 1, passes: [{ n: 1, rempli: true, champion: true, rondes: 3 }], cartes: [] };
exiger('gagner au plus haut ouvre le suivant', exigenceMax(ex) === 2);
const tout = effetDe([], EXIGENCES.length);
exiger('les crans s\'additionnent', tout.mandat === 1 && tout.plafond === -1 && tout.cases === -1 && tout.gardes === -1 && tout.jetons === -10 && tout.cherte > 0 && effetDe([], 1).plafond === 0);
exiger('le classeur des déblocages', effetDe(['classeur', 'etoile']).pilier === 1 && effetDe(['classeur', 'etoile']).etoile === 1 && effetDe(['bouchetrous']).bouchetrous === 1 && refusAchat(riche, 'deb:etoile') !== null);
exiger('un cran paie sa prime en médailles', medaillesDeLaPartie(ex.parties.b) === Math.round(medaillesDeLaPartie(ex.parties.a) * (1 + PRIME_EXIGENCE)),
  `${medaillesDeLaPartie(ex.parties.a)} → ${medaillesDeLaPartie(ex.parties.b)} 🏅`);

/* LA COLLECTION */
const col = collectionDe(m);
const attendues = new Map();
for (const P of parties) for (const c of P.cartes) attendues.set(c, (attendues.get(c) || 0) + 1);
const fautesCol = [...attendues].filter(([c, n]) => !col.has(c) || col.get(c).copies !== n);
exiger('chaque carte passée chez toi est à la collection, une copie par partie', !fautesCol.length, fautesCol.slice(0, 3).map(([c]) => c).join(' · ') || `${col.size} cartes`);
const signees = parties.every(P => [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean).every(c => P.cartes.includes(`${c.ref.id}|${c.ref.e}|${c.ref.n}|${c.ref.r}`)));
exiger('ton cinq de fin de run est à la collection', signees);
exiger('l\'édition suit les copies', editionDe(1) === 'Base' && editionDe(2) === 'Cadre' && editionDe(4) === 'Hors-cadre' && editionDe(5) === 'Or' && editionDe(9) === 'Holo');
const galonsSansCarte = parties.flatMap(P => P.run.passes.flatMap(p => p.galons)).filter(g => !col.has(g.cle));
exiger('chaque galon nomme une carte de la collection', !galonsSansCarte.length, `${parties.flatMap(P => P.run.passes.flatMap(p => p.galons)).length} galons`);

/* LE PALMARÈS, SUR DE VRAIES ÉQUIPES : ce qui sort, et à quelle fréquence. */
const splits = lireSplits();
const N = 60;
const vus = {};
let fautesTrophees = 0, fautesRecords = 0;
const pantheon = nouveauMeta();
for (let g = 1; g <= N; g++) {
  const L = creerSplit(ligueDEssai(splits, 10, g), { graine: g * 13, rondes: 2, bo: 1 });
  while (jouerJournee(L));
  creerSeries(L);
  while (jouerRonde(L));
  const st = statsDuSplit(L);
  const t = tropheesDuSplit(L);
  const bourreau = t.find(x => x.id === 'bourreau');
  if (t.length !== 5 || st.find(l => l.i === bourreau.i && l.n === bourreau.n && l.r === bourreau.r).k !== Math.max(...st.map(l => l.k))) fautesTrophees++;
  for (const id of new Set(galonsDuSplit(L).map(x => x.id))) vus[id] = (vus[id] || 0) + 1;
  const r = recordsDuSplit(L);
  const maxK = Math.max(...st.filter(l => l.i === 0).flatMap(() => [0]), ...L.journees.flat().concat(L.series.rondes.flat()).filter(s => s.a === 0 || s.b === 0)
    .flatMap(s => s.parties.flatMap(p => p.feuille.equipes[p.bleu === 0 ? 0 : 1].joueurs.map(j => j.k))));
  if (r.elims.val !== maxK) fautesRecords++;
  pantheon.parties[`s${g}`] = { debut: g, fin: null, passes: [{ n: 1, records: r, trophees: [] }], cartes: [] };
  if (g === 1) for (const c of Object.keys(MENEURS)) if (meneurs(L, c).length !== 5) fautesTrophees++;
}
exiger('cinq trophées par split, le bourreau a le plus d\'éliminations', !fautesTrophees, `${N} splits`);
exiger('le record d\'éliminations se recompte dans tes feuilles', !fautesRecords);
const hors = Object.keys(GALONS).filter(id => !['titre', 'finale'].includes(id)).filter(id => !((vus[id] || 0) / N >= 0.05 && (vus[id] || 0) / N <= 0.8));
exiger('chaque galon sort dans 5 à 80 % des splits', !hors.length, Object.entries(vus).map(([id, n]) => `${id} ${Math.round((100 * n) / N)} %`).join(' · '));
const P2 = pantheonDe(pantheon);
const meilleur = Math.max(...Object.values(pantheon.parties).map(x => x.passes[0].records.elims.val));
const eclair = Math.min(...Object.values(pantheon.parties).map(x => x.passes[0].records.eclair ? x.passes[0].records.eclair.val : Infinity));
exiger('le panthéon garde le meilleur de chaque record', P2.records.elims.val === meilleur && P2.records.eclair.val === eclair, `${meilleur} éliminations, ${String(eclair).replace('.', ',')} min`);
informer('les runs du robot', parties.map(P => `${P.run.passes.length} split(s), ${P.run.fin || 'en cours'}`).join(' · '));

verdict('Le méta');
