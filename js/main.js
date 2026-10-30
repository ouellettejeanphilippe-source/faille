/*
 * LE CONTRÔLEUR. L'écran titre (js/menu.js), puis une run de plusieurs splits
 * (js/partie.js) tenue en journal d'actions : chaque geste passe par faire(),
 * qui l'applique, le garde dans sa sauvegarde (js/sauvegardes.js : plusieurs
 * parties, chacune sa graine et son journal), note la partie au méta
 * (js/meta.js : médailles, collection, palmarès) et redessine.
 *
 *   le titre       Continuer, Nouvelle partie (le mode, ton club, tes
 *                  déblocages), l'exhibition, ta collection, le palmarès, les
 *                  parties, les règles ;
 *   le départ      au Rogue, tes cases (ta vedette, ton classeur, ceux qui
 *                  restent) puis le pack de départ (js/depart.js) ; au 18-0,
 *                  la roulette sort un split et une équipe, tu signes un
 *                  joueur pour un rôle libre sous le plafond ;
 *   le split       en quatre sections, comme Cap 82-0 : le Bureau (la boîte,
 *                  hier soir), l'Effectif, le Marché (agents libres, packs de
 *                  joueurs, plan de jeu), la Ligue (classement, calendrier,
 *                  meneurs, séries) ; une partie se regarde en direct ;
 *   le bilan       tes trophées et tes galons, le mandat ; rempli, tu gardes
 *                  des joueurs (ils vieillissent) et le split suivant commence.
 *
 * Le hasard de la roulette, du marché et des packs se tire ici (le dé de la
 * partie, le dé du split) et le journal garde ce qui est sorti. Ce qui
 * s'affiche est le niveau, les badges ou une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit, chargerChampions } from './data.js';
import { hasard, graineDe } from './hasard.js';
import { esc, pts } from './util.js';
import { imageLP, iconeChampion } from './images.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit, TARIFS } from './cotes.js';
import { ROLES, badge, vignette, icones, coutHtml, carte, retournerFiche, brancherInclinaison } from './fiche.js';
import { tempoDuSplit, equipeReelle, classement, jouerPartie } from './sim.js';
import { titreSplit, tableauClassement, calendrier, tableauSeries, tableauMeneurs, serieDe, feuilleSerie, taDerniere } from './split.js';
import { nouveauRepechage, bannir, choisir, ecranRepechage } from './tableau-repechage.js';
import { attendRepechage, repechageDe } from './repechage.js';
import { liensDe, LIENS, COACHS, PACKS, CARTES } from './rogue.js';
import { vuePacksJoueurs, vuePlanDeJeu, carteDeJeu } from './boutique.js';
import { RELANCES, tirer, tirerAdversaires, tirerBoucheTrous, tirerEtoiles, agentsLibres, libresDe, masseDe, plafondDe, signables, marcheOuvert, cleDe, tirerPackJoueurs, prochaineVersion, PACKS_JOUEURS } from './gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, taSerie, enAttente, sauvegarde, rejouer, refsDuJournal, relancesMax, offreDe, VERSION, parCases, caseEnCours, attendPack, refDe, mandatDuSplit } from './partie.js';
import { aTraiter, feuilleDuChoix, vueBoite, vueProprio, vueCoach, vueVestiaire, vueCinq, vueJoueurs, bandeChiffres, planAdverse, vueAgents, ecranBilan, ecranStrategie, chezToi } from './bureau.js';
import { ecranCeSoir, ecranSommaire, autourDeLaLigue } from './soir.js';
import { terrainDe } from './terrain.js';
import { ecussonHtml } from './fiche.js';
import { nouveauMeta, noter, acheter, porter, clubDe, deblocagesDe, collectionDe, exigenceDe, choisirExigence, coachDe, MODES, modeDe, vedetteDe, choisirVedette } from './meta.js';
import { lireIndex, migrer, partieActive, lirePartie, ecrirePartie, activer, supprimer, exporter, importer, lireMeta, ecrireMeta, lireOptions, ecrireOptions } from './sauvegardes.js';
import { ecranTitre, ecranMenu, ecranParties, ecranDepart } from './menu.js';
import { ecranCase, avantLePack, ecranExhibition } from './depart.js';
import { ecranDeblocages, ecranPalmares, ecranCollection, ecranAlbum } from './vitrine.js';
import { ecranRegles } from './regles.js';
import { ouvrirDirect, fermerDirect, faillePlate } from './direct.js';
import { ouvrirPaquet, fermerPaquet } from './ouverture.js';
import { activerSons, jouerSon } from './sons.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const G = {
  index: null, champions: null, splits: new Map(), P: null, pid: null, de: null, meta: null, options: null, vue: 'titre',
  section: 'bureau', sous: { bureau: 'boite', marche: 'agents', ligue: 'classement' }, joueurs: { vue: 'saison', tri: 'kda' }, regarderApres: false,
  carte: null, repechage: null, ouvertes: null, offre: null, gardes: new Set(), vieux: new Map(), entr: null,
  contrats: new Map(), etoiles: null, vedette: null, exhib: null,
};
/* Les couches, de celle du dessus à celle du dessous : le retour ferme la première ouverte. */
const COUCHES = ['#ouverture', '#choix', '#carte', '#direct', '#feuille', '#sommaire', '#soir', '#album', '#strategie', '#repechage', '#vestiaire', '#depart', '#exhibition', '#deblocages', '#collection', '#palmares', '#regles', '#parties', '#menu'];
const ctx = () => ({ splits: G.splits, classes: G.champions.classes, champions: G.champions });
/*
 * LES SECTIONS, les mêmes que Cap 82-0 (JP : *même séparation des pages*) :
 * au Rogue, cinq portes — le Bureau (Boîte, Proprio, Coach, Vestiaire), les
 * Joueurs, le Cinq (les Lignes de Cap 82-0), le Marché (Boutique : agents,
 * packs, plan de jeu ; Album), la Ligue (Classement, Calendrier, Meneurs,
 * Séries, Palmarès) ; au 18-0, quatre, sans le Marché, et le Bureau sans
 * proprio ni coach.
 */
const SOUS = {
  bureau: [['boite', 'Boîte'], ['proprio', 'Proprio'], ['coach', 'Coach'], ['vestiaire', 'Vestiaire']],
  joueurs: null,
  cinq: null,
  marche: [['agents', 'Agents libres'], ['joueurs', 'Packs de joueurs'], ['plan', 'Plan de jeu'], ['album', 'Album']],
  ligue: [['classement', 'Classement'], ['calendrier', 'Calendrier'], ['meneurs', 'Meneurs'], ['series', 'Séries'], ['palmares', 'Palmarès']],
};
const SOUS_DIXHUIT = { bureau: [['boite', 'Boîte'], ['vestiaire', 'Vestiaire']], joueurs: null, cinq: null, ligue: SOUS.ligue };
const sousDe = P => (P.mode === 'dixhuit' ? SOUS_DIXHUIT : SOUS);

/* Un split chargé, avec ses profils et son tempo, gardé pour la suite. */
async function lireSplit(id) {
  if (!G.splits.has(id)) {
    const split = await chargerSplit(id);
    G.splits.set(id, { split, profils: profilsDuSplit(split), tempo: tempoDuSplit(split) });
  }
  return G.splits.get(id);
}
const ids = () => G.index.splits.map(s => s.id);
const idNeuf = () => `${Date.now().toString(36)}${Math.floor(G.de() * 1296).toString(36).padStart(2, '0')}`;

/* ---- LA SAUVEGARDE ET LE MÉTA ---- */

/* Où en est la partie, en une ligne : pour l'index des parties et « Continuer ». */
function resumeDe(P) {
  if (P.etape === 'fin') return `Run ${P.run.fin === 'gagnee' ? 'gagnée' : 'finie'} · ${P.run.passes.length} split${P.run.passes.length > 1 ? 's' : ''}`;
  if (P.etape === 'bati') return `${P.mode === 'dixhuit' ? 'Le 18-0' : `Split ${P.run.n}`} · ${parCases(P) ? 'le départ' : 'repêchage'} ${5 - libresDe(P.eff).length}/5`;
  if (P.etape === 'gardes') return `Split ${P.run.n} · bilan`;
  const c = classement(P.L);
  const k = c.findIndex(l => l.i === 0);
  return `Split ${P.run.n} · ${P.L.series ? 'séries' : `journée ${P.L.jour + 1}`} · ${c[k].v}-${c[k].d}`;
}

function garder() {
  ecrirePartie(G.pid, sauvegarde(G.P), G.P.club.nom, resumeDe(G.P));
  if (noter(G.meta, G.pid, G.P)) ecrireMeta(G.meta);
}

/* Une partie sauvegardée, rejouée : ses splits d'abord chargés. null si elle ne rejoue plus (les splits ont changé). */
async function charger(id) {
  const sv = lirePartie(id);
  if (!sv || !(sv.v <= VERSION)) return null;
  try {
    await Promise.all(refsDuJournal(sv.log).map(lireSplit));
    return rejouer(sv, ctx());
  } catch {
    return null;
  }
}

/* La couleur de ton club teint la Faille de l'interface : celle de la partie en jeu, sinon celle que tu portes. */
function teindre() {
  const c = G.vue === 'jeu' && G.P && G.P.club.couleur ? G.P.club.couleur : clubDe(G.meta).couleur;
  document.documentElement.style.setProperty('--club-vif', c);
}

/* Un mot qui passe, en bas de l'écran : ce qui a été refusé, et pourquoi. */
let minuterie = null;
function avis(texte) {
  $('#avis').textContent = texte;
  $('#avis').hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { $('#avis').hidden = true; }, 3000);
}

/* LE GESTE : une action appliquée, gardée, notée, redessinée. Rend son résultat, ou undefined si elle est refusée. */
function faire(a) {
  let r;
  try { r = appliquer(G.P, a, ctx()); } catch (err) { avis(err.message); return undefined; }
  garder();
  if (a.t === 'signer' || a.t === 'marche' || a.t === 'signerPack' || (a.t === 'case' && a.cle)) jouerSon('signer');
  else if (a.t === 'pack' || a.t === 'packJoueurs' || a.t === 'boucheTrous') jouerSon('pack');
  else if (a.t === 'bilan') jouerSon(G.P.run.fin ? 'medaille' : G.P.run.passes[G.P.run.passes.length - 1].rempli ? 'victoire' : 'defaite');
  rendre();
  // Une case ouverte ou un split qui commence : les cartes du prochain loto se chargent, et qui vieillit.
  if (a.t === 'case' || a.t === 'suivant') preparerCases();
  return r ?? null;
}

/*
 * LES CASES DU DÉPART (Rogue, version 5) : les contrats du loto en cours (leurs
 * splits chargés) et, pour ceux qui restent, la version qui vieillit.
 */
async function preparerCases() {
  const P = G.P;
  if (!P || !parCases(P)) return;
  const c = caseEnCours(P);
  if (!c) return;
  const cle = `${G.pid}-${P.run.n}-${c.k}`;
  G.contrats = new Map();
  G.vieux = new Map();
  for (const { cle: k } of c.loto) {
    try {
      await lireSplit(k.split('|')[0]);
      const x = contratDe(ctx(), refDe(k));
      G.contrats.set(k, x);
      if (c.source === 'restes') {
        const ref = await prochaineVersion(G.index.splits, lireSplit, x);
        if (ref) G.vieux.set(k, contratDe(ctx(), ref));
      }
    } catch { G.contrats.set(k, null); }
  }
  const encore = G.P === P && caseEnCours(P);
  if (encore && `${G.pid}-${P.run.n}-${encore.k}` === cle) rendre();
}

/* ---- LE TABLEAU INDICATEUR : le retour, où en est la partie, ses chiffres, le menu ---- */
function majTete() {
  const P = G.P;
  const enJeu = G.vue === 'jeu' && P;
  $('#retourBtn').hidden = !COUCHES.some(id => !$(id).hidden);
  $('#menuBtn').hidden = !enJeu || !$('#menu').hidden;
  $('#teteNom').textContent = enJeu ? P.club.nom : 'Faille';
  $('#teteEcusson').innerHTML = ecussonHtml(enJeu ? P.club : { ...clubDe(G.meta), code: 'FAI' });
  $('#jauge').hidden = !enJeu || P.etape !== 'bati';
  $('#nav').hidden = !enJeu || P.etape !== 'split';
  if (!enJeu) { $('#teteEtat').textContent = 'Le jeu de gestion des splits'; return; }
  const L = P.L;
  const plafond = plafondDe(P.eff);
  const reste = plafond - masseDe(P.eff);
  $('#jaugeReste').textContent = `${reste} / ${plafond}`;
  $('#jaugeReste').className = `tete-ch-v${reste <= 3 ? ' serre' : ''}`;
  $('#jaugeRempli').style.width = `${(100 * reste) / plafond}%`;
  if (P.etape === 'bati') $('#teteEtat').textContent = `${P.mode === 'dixhuit' ? 'Le 18-0' : `Split ${P.run.n}`} · ${5 - libresDe(P.eff).length} / 5 signés`;
  else if (!L) $('#teteEtat').textContent = `Bilan du split ${P.run.n}`;
  else $('#teteEtat').textContent = `${P.mode === 'dixhuit' ? 'Le 18-0' : `Split ${P.run.n}`} · ${titreSplit(L)}`;
}

function montrer(id) {
  $(id).hidden = false;
  $(id).scrollTop = 0;
  majTete();
}

function fermer(id) {
  if ($(id).hidden) return false;
  if (id === '#ouverture') { fermerPaquet(); majTete(); return true; }
  $(id).hidden = true;
  if (id === '#direct') fermerDirect();
  majTete();
  return true;
}

function rendre() {
  teindre();
  const titre = G.vue === 'titre' || !G.P;
  const e = G.P && G.P.etape;
  $('#titre').hidden = !titre;
  $('#bati').hidden = titre || e !== 'bati';
  $('#split').hidden = titre || e !== 'split';
  $('#bilan').hidden = titre || (e !== 'gardes' && e !== 'fin');
  if (titre) rendreTitre();
  else if (e === 'bati') rendreBati();
  else if (e === 'split') rendreSplit();
  else rendreBilan();
  for (const [id, f] of Object.entries(RENDUS)) if (!$(id).hidden) f();
  majTete();
}

/* ---- L'ÉCRAN TITRE ET LES COUCHES DU MENU ---- */
function rendreTitre() {
  $('#titre-corps').innerHTML = ecranTitre(G.meta, partieActive(), G.options.sons);
}

/* Ce qui se redessine quand la partie ou le méta change, si c'est ouvert. */
const RENDUS = {
  '#menu': () => { $('#menu').innerHTML = ecranMenu(G.meta, G.options.sons); },
  '#parties': () => { $('#parties').innerHTML = ecranParties(lireIndex()); },
  '#regles': () => { $('#regles').innerHTML = ecranRegles(); },
  '#deblocages': () => { $('#deblocages').innerHTML = ecranDeblocages(G.meta); },
  '#palmares': () => { $('#palmares').innerHTML = ecranPalmares(G.meta); },
  '#collection': () => { $('#collection').innerHTML = vueCollection(); },
  '#depart': () => { $('#depart').innerHTML = ecranDepart(G.meta, { etoiles: G.etoiles, vedette: G.vedette }); },
  '#exhibition': () => { $('#exhibition').innerHTML = ecranExhibition(G.exhib); },
  '#strategie': () => { if (G.P && G.P.L) $('#strategie').innerHTML = ecranStrategie(G.P, ctx()); },
  // Le choix en plein écran : réglé, il se ferme ; le suivant, s'il y en a un, attend sa ligne dans la Boîte.
  '#choix': () => { const h = G.P && G.P.etape === 'split' ? feuilleDuChoix(G.P) : ''; if (h) $('#choix').innerHTML = h; else fermer('#choix'); },
};

/* Ta collection, split par split : au menu, et à l'Album du Marché. */
const vueCollection = () => ecranCollection(G.meta, G.index.splits, new Map([...G.splits].map(([id, s]) => [id, s.split.equipes.reduce((n, e) => n + e.joueurs.length, 0)])));

function ouvrir(nom) {
  const id = `#${nom}`;
  if (!RENDUS[id]) return;
  RENDUS[id]();
  montrer(id);
  if (nom === 'depart') preparerDepart();
}

/* LE DÉPART : au Rogue, ton joueur de concession — trois étoiles à la première run (tirées du dé de la visite), sinon sa carte. */
async function preparerDepart() {
  const m = G.meta;
  if (modeDe(m) !== 'rogue') return;
  const cle = vedetteDe(m);
  if (cle && !(G.vedette && cleDe(G.vedette.ref) === cle)) {
    try { await lireSplit(cle.split('|')[0]); G.vedette = contratDe(ctx(), refDe(cle)); } catch { G.vedette = null; }
  } else if (!cle && !G.etoiles) {
    const refs = await tirerEtoiles(G.de, ids(), lireSplit);
    G.etoiles = refs.map(ref => ({ cle: cleDe(ref), c: contratDe(ctx(), ref) }));
  }
  if (!$('#depart').hidden) RENDUS['#depart']();
}

/* L'EXHIBITION : deux vrais vestiaires sortis de la roulette, une partie en direct, rien de compté. */
async function ouvrirExhibition(neuf = true) {
  if (neuf) G.exhib = null;
  RENDUS['#exhibition']();
  montrer('#exhibition');
  if (!neuf && G.exhib) return;
  const adv = await tirerAdversaires(G.de, ids(), lireSplit, equipeReelle, 2);
  G.exhib = adv.map(a => {
    const { split, profils, tempo } = G.splits.get(a.id);
    const e = split.equipes.find(x => x.nom === a.e);
    return { nom: e.nom, split: split.nom, moteur: equipeReelle(split, e, profils, tempo) };
  });
  if (!$('#exhibition').hidden) RENDUS['#exhibition']();
}
function jouerExhibition() {
  const [A, B] = G.exhib || [];
  if (!A || !B) return;
  const graine = Math.floor(G.de() * 2 ** 32);
  const f = jouerPartie(A.moteur, B.moteur, graine);
  const joueurs = [A, B].map((x, k) => f.equipes[k].joueurs.map(j => {
    const b = x.moteur.cinq[j.r] && x.moteur.cinq[j.r].bassin;
    const champion = b && b[0] ? b[0][0] : null;
    return { n: j.n, r: j.r, champion, icone: champion ? iconeChampion(G.champions, champion) : null };
  }));
  montrer('#direct');
  ouvrirDirect($('#direct'), { feuille: f, noms: [A.nom, B.nom], joueurs, graine: graineDe(graine, 'direct'), toi: null });
}

async function ouvrirAlbum(id) {
  const { split, profils } = await lireSplit(id);
  $('#album').innerHTML = ecranAlbum(G.meta, split, profils);
  montrer('#album');
}

/* Les gestes des écrans du menu : ouvrir, acheter, porter, les parties, les sons. */
async function toucherMenu(ev) {
  const b = ev.target.closest('button');
  if (!b || b.disabled) {
    const c = ev.target.closest('[data-carte-col]');
    if (c && (ev.type === 'click' || ev.key === 'Enter')) carteDeCollection(c.dataset.carteCol);
    return;
  }
  if (b.dataset.ouvrir) ouvrir(b.dataset.ouvrir);
  else if (b.dataset.sons !== undefined) {
    G.options.sons = !G.options.sons;
    ecrireOptions(G.options);
    activerSons(G.options.sons);
    rendre();
  } else if (b.dataset.acheter) {
    if (acheter(G.meta, b.dataset.acheter)) { ecrireMeta(G.meta); jouerSon('medaille'); }
    rendre();
  } else if (b.dataset.porter) {
    const [genre, id] = b.dataset.porter.split(':');
    if (porter(G.meta, genre, id)) ecrireMeta(G.meta);
    rendre();
  } else if (b.dataset.coachChoisi) {
    if (COACHS[b.dataset.coachChoisi]) { G.meta.coach = b.dataset.coachChoisi; ecrireMeta(G.meta); }
    rendre();
  } else if (b.dataset.mode) {
    if (MODES[b.dataset.mode]) { G.meta.mode = b.dataset.mode; ecrireMeta(G.meta); }
    rendre();
    preparerDepart();
  } else if (b.dataset.vedette) {
    if (choisirVedette(G.meta, b.dataset.vedette)) { ecrireMeta(G.meta); jouerSon('signer'); }
    rendre();
    preparerDepart();
  } else if (b.id === 't-exhibition') ouvrirExhibition();
  else if (b.id === 'exhib-autres') ouvrirExhibition();
  else if (b.id === 'exhib-jouer') jouerExhibition(); else if (b.dataset.exigence !== undefined) {
    if (choisirExigence(G.meta, Number(b.dataset.exigence))) ecrireMeta(G.meta);
    rendre();
  } else if (b.dataset.album) ouvrirAlbum(b.dataset.album);
  else if (b.dataset.reprendre) reprendre(b.dataset.reprendre);
  else if (b.dataset.exporter) telecharger(b.dataset.exporter);
  else if (b.dataset.supprimer) {
    if (!window.confirm('Effacer cette partie ? Ses médailles et sa collection te restent.')) return;
    supprimer(b.dataset.supprimer);
    if (b.dataset.supprimer === G.pid) { G.P = null; G.pid = null; G.vue = 'titre'; }
    rendre();
  } else if (b.id === 't-continuer') reprendre(partieActive().id);
  else if (b.id === 't-nouvelle') ouvrir('depart');
  else if (b.id === 'm-titre') {
    for (const id of COUCHES) fermer(id);
    G.vue = 'titre';
    rendre();
  } else if (b.id === 'd-commencer') nouvelle();
}

/* Le fichier d'une partie, téléchargé. */
function telecharger(id) {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([exporter(id)], { type: 'application/json' }));
  lien.download = `faille-${id}.json`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

async function importerFichier(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  try {
    const id = importer(await f.text());
    await reprendre(id);
  } catch (err) { avis(err.message); }
}

/* Reprend une partie sauvegardée. */
async function reprendre(id) {
  const P = await charger(id);
  if (!P) { avis('Cette partie ne se rejoue plus : les splits ont changé depuis.'); return; }
  G.pid = id;
  G.P = P;
  activer(id);
  if (noter(G.meta, G.pid, G.P)) ecrireMeta(G.meta);
  entrer();
}

/*
 * LA PARTIE NEUVE : le mode ; au Rogue, ton club, tes déblocages, ta
 * collection (d'où le classeur tire) et ta vedette, posés au départ et gardés
 * dans sa sauvegarde.
 */
async function nouvelle() {
  $('#d-commencer').disabled = true;
  try {
    const m = G.meta;
    const mode = modeDe(m);
    const col = [];
    if (mode === 'rogue') {
      for (const cle of collectionDe(m).keys()) {
        try { await lireSplit(cle.split('|')[0]); col.push({ cle, niveau: contratDe(ctx(), refDe(cle)).niveau }); } catch { /* un split qui a changé : la carte n'entre pas au classeur */ }
      }
    }
    G.pid = idNeuf();
    G.P = nouvellePartie(Math.floor(G.de() * 2 ** 32), { mode, deb: deblocagesDe(m), club: clubDe(m), exig: exigenceDe(m), coach: coachDe(m), col, vedette: G.vedette && vedetteDe(m) === cleDe(G.vedette.ref) ? vedetteDe(m) : null });
    garder();
    entrer();
  } finally {
    if ($('#d-commencer')) $('#d-commencer').disabled = false;
  }
}

/* Entre en partie : les couches se ferment, l'écran de l'étape s'ouvre. */
function entrer() {
  for (const id of COUCHES) fermer(id);
  G.vue = 'jeu';
  G.section = 'bureau';
  G.gardes = new Set();
  G.vieux = new Map();
  G.offre = null;
  G.ouvertes = null;
  rendre();
  window.scrollTo(0, 0);
  if (G.P.etape === 'gardes') vieillir();
  preparerCases();
}

/* ---- TON CINQ SE BÂTIT : les cases et le pack de départ (le Rogue), la roulette (le 18-0) ---- */
function rendreBati() {
  const P = G.P;
  const cases = parCases(P);
  // Le mandat en une ligne ; le détail est au Proprio, et à la page des règles.
  $('#bati-mandat').textContent = P.mode === 'dixhuit' ? 'Le 18-0 : un split, ses séries, le titre ou rien.' : `Split ${P.run.n} : le proprio veut ${mandatDuSplit(P)[1]}.`;
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = P.eff.cinq[r];
    return `<li class="case${j ? ' pleine' : ''}"><span class="case-role">${mot}</span>${j ? vignette(j) : ''}<span class="qui">${j
      ? `<b>${esc(j.n)}</b><small>${esc(j.niveau)} · ${esc(j.equipe)} · ${esc(j.split)}</small>` : '<small>À combler</small>'}</span>${j ? coutHtml(j.cout) : ''}</li>`;
  }).join('') + (P.eff.banc ? `<li class="case pleine"><span class="case-role">Banc</span>${vignette(P.eff.banc)}<span class="qui"><b>${esc(P.eff.banc.n)}</b><small>${esc(P.eff.banc.niveau)} · ${esc(P.eff.banc.split)}</small></span>${coutHtml(P.eff.banc.cout)}</li>` : '');
  const complet = !libresDe(P.eff).length;
  $('#roulette').hidden = complet || cases;
  $('#roulette').lastChild.textContent = P.tirage ? 'Revoir le vestiaire' : 'Tourner la roulette';
  $('#pack').hidden = !cases || !attendPack(P);
  $('#jouer').hidden = !complet;
  $('#jouer').textContent = P.mode === 'dixhuit' ? 'Jouer le 18-0' : 'Jouer le split';
  if (cases) {
    const c = caseEnCours(P);
    $('#depart-cases').innerHTML = c ? (c.loto.every(x => G.contrats.has(x.cle)) ? ecranCase(P, c, G.contrats, G.vieux) : '<p class="sous">Le classeur s\'ouvre…</p>')
      : attendPack(P) ? avantLePack(P) : '';
  } else $('#depart-cases').innerHTML = '';
  const liens = liensDe(P.eff.cinq).map(id => `${LIENS[id][0]} ${LIENS[id][1]}`);
  $('#etat').textContent = complet ? `Alignement complet, ${pts(masseDe(P.eff))} sur ${plafondDe(P.eff)}.${liens.length ? ` Liens d'origine : ${liens.join(', ')}.` : ''}` : `Le coût suit le niveau : ${TARIFS.map(([n, c]) => `${n} ${pts(c)}`).join(' · ')}.`;
  if (!$('#vestiaire').hidden) rendreVestiaire();
}

/* Pourquoi un joueur du vestiaire ne se signe pas (null : il se signe). */
function refus(v, j) {
  if (G.P.eff.cinq[j.r]) return `${ROLES[j.r]} comblé`;
  return signables(G.P.eff, v.equipe, v.profils.joueurs).includes(j) ? null : 'Trop cher';
}

function rendreVestiaire() {
  const P = G.P;
  const v = vestiaireDe(P, ctx());
  if (!v) { fermer('#vestiaire'); return; }
  const l = libresDe(P.eff);
  const col = collectionDe(G.meta);
  $('#vestiaire-bandeau').innerHTML = `${v.equipe.logo ? `<img src="${imageLP(v.equipe.logo)}" alt="">` : ''}
    <span class="bandeau-id"><small>${esc(v.split.nom)} · ${v.equipe.v}-${v.equipe.d} en parties</small><h2>${esc(v.equipe.nom)}</h2></span>`;
  $('#vestiaire-libres').textContent = l.map(r => ROLES[r]).join(', ');
  $('#vestiaire-max').textContent = `jusqu'à ${pts(plafondDe(P.eff) - masseDe(P.eff) - (l.length - 1))}`;
  $('#vestiaire-liste').innerHTML = v.equipe.joueurs.map((j, i) => {
    const p = v.profils.joueurs.get(j);
    const non = refus(v, j);
    const deja = col.get(`${v.id}|${v.equipe.nom}|${j.n}|${j.r}`);
    return `<li class="joueur${P.eff.cinq[j.r] ? ' pris' : ''}" data-i="${i}" tabindex="0">
      ${vignette(j)}
      <span class="joueur-id"><b>${esc(j.n)}</b><small>${ROLES[j.r]} · ${p.niveau}${deja && deja.copies ? ' · 🃏 à ta collection' : ''}</small><span class="joueur-champs">${icones(G.champions, j)}</span>${p.badges.length ? `<span>${p.badges.map(badge).join('')}</span>` : ''}</span>
      ${coutHtml(p.cout)}
      <button class="signer" data-signer="${i}"${non ? ' disabled' : ''}>${non || 'Signer'}</button></li>`;
  }).join('');
  $('#relances').innerHTML = Object.entries(RELANCES).map(([k, [mot]]) =>
    `<button data-relance="${k}"${P.relances[k] >= relancesMax(P, k) ? ' disabled' : ''}>${mot} <span class="compte">${relancesMax(P, k) - P.relances[k]}</span></button>`).join('');
}

function ouvrirCarte(i) {
  const v = vestiaireDe(G.P, ctx());
  const j = v && v.equipe.joueurs[i];
  if (!j) return;
  G.carte = i;
  const col = collectionDe(G.meta).get(`${v.id}|${v.equipe.nom}|${j.n}|${j.r}`);
  $('#carte').innerHTML = carte({ split: v.split, equipe: v.equipe, j, profil: v.profils.joueurs.get(j), champions: G.champions, refus: refus(v, j), collection: col && col.copies ? col : null });
  montrer('#carte');
}

/* La carte d'un joueur de ton effectif : son split, ses stats chez toi. */
function carteDuContrat(cle) {
  const P = G.P;
  const c = [...Object.values(P.eff.cinq), P.eff.banc].find(x => x && cleDe(x.ref) === cle);
  if (!c) return;
  const { split, profils } = G.splits.get(c.ref.id);
  const equipe = split.equipes.find(e => e.nom === c.ref.e);
  const j = equipe.joueurs.find(x => x.n === c.n && x.r === c.r);
  const col = collectionDe(G.meta).get(cle);
  G.carte = null;
  $('#carte').innerHTML = carte({ split, equipe, j, profil: profils.joueurs.get(j), champions: G.champions, bouton: false, collection: col && col.copies ? col : null, chezToi: P.L ? chezToi(P.L, c) : null });
  montrer('#carte');
}

/* La carte d'un joueur de ta collection. */
async function carteDeCollection(cle) {
  const [id, e, n, r] = cle.split('|');
  const { split, profils } = await lireSplit(id);
  const equipe = split.equipes.find(x => x.nom === e);
  const j = equipe && equipe.joueurs.find(x => x.n === n && x.r === r);
  if (!j) return;
  G.carte = null;
  $('#carte').innerHTML = carte({ split, equipe, j, profil: profils.joueurs.get(j), champions: G.champions, bouton: false, collection: collectionDe(G.meta).get(cle) });
  montrer('#carte');
}

/* Un tour de roulette (`tour`) ou une relance : le vestiaire s'ouvre. */
async function tourner(mode) {
  const P = G.P;
  if (mode === 'tour' && P.tirage) { rendreVestiaire(); montrer('#vestiaire'); return; }
  for (const b of $$('#roulette, #relances button')) b.disabled = true;
  try {
    const t = await tirer(G.de, ids(), lireSplit, P.eff, mode, P.tirage);
    if (t && faire({ t: 'tirage', mode, ...t }) !== undefined) { jouerSon('tap'); rendreVestiaire(); montrer('#vestiaire'); }
  } finally {
    $('#roulette').disabled = false;
    if (!$('#vestiaire').hidden) rendreVestiaire();
  }
}

function signer(i) {
  const v = vestiaireDe(G.P, ctx());
  const j = v && v.equipe.joueurs[i];
  if (!j || faire({ t: 'signer', n: j.n, r: j.r }) === undefined) return;
  fermer('#carte');
  fermer('#vestiaire');
}

/* Le pack de départ : un bouche-trou par rôle vide, tiré du dé de la visite ; le journal garde qui est sorti. */
async function ouvrirPackDepart() {
  $('#pack').disabled = true;
  try {
    const refs = await tirerBoucheTrous(G.de, ids(), lireSplit, G.P.eff, G.P.fx.bouchetrous);
    if (faire({ t: 'boucheTrous', refs }) !== undefined) ouvrirPackDeJoueurs({ titre: 'Le pack de départ', metal: 'depart', marque: 'Départ' }, refs);
  } finally {
    $('#pack').disabled = false;
  }
}

/* Les neuf adversaires sortent de la même roulette. Au 18-0, le split se joue d'un coup, droit au classement. */
async function lancer() {
  $('#jouer').disabled = true;
  try {
    const adversaires = await tirerAdversaires(G.de, ids(), lireSplit, equipeReelle);
    if (faire({ t: 'lancer', adversaires, graine: Math.floor(G.de() * 2 ** 32) }) === undefined) return;
    G.section = 'bureau';
    if (G.P.mode === 'dixhuit') {
      faire({ t: 'jusqua' });
      G.sous.ligue = 'classement';
      allerA('ligue');
    }
  } finally {
    $('#jouer').disabled = false;
  }
}

/* ---- LE SPLIT, EN SECTIONS ---- */
function rendreSplit() {
  const P = G.P;
  const L = P.L;
  const S = L.series;
  const saison = L.jour < L.journees.length;
  const attend = !!enAttente(P);
  const dix = P.mode === 'dixhuit';
  if (dix && G.section === 'marche') G.section = 'ligue';
  $('#bande').innerHTML = G.section === 'bureau' ? bandeChiffres(P) : '';
  $('#decision').hidden = !attend;
  $('#decision').textContent = '1 choix à trancher ›';
  const ta = taSerie(L);
  const adv = ta && L.equipes[ta.a === 0 ? ta.b : ta.a];
  $('#journee').hidden = !saison || attend || dix;
  $('#journee').disabled = false;
  $('#journee').textContent = adv ? `Jouer ce soir · ${adv.nom}` : 'Journée suivante';
  $('#regarder').hidden = attend || !ta || (!saison && !(S && S.champion === null));
  $('#jusqua').hidden = !saison || attend || dix;
  $('#series').hidden = saison || !!S;
  $('#ronde').hidden = !S || S.champion !== null;
  const tienne = S && taSerie(L);
  if (tienne) {
    const nous = tienne.a === 0 ? 0 : 1;
    $('#ronde').textContent = `Partie ${tienne.parties.length + 1} · ${tienne.v[nous]}-${tienne.v[1 - nous]}`;
  } else $('#ronde').textContent = 'Ronde suivante';
  $('#bilan-ouvrir').hidden = !S || S.champion === null;
  for (const b of $$('.navtab')) {
    b.hidden = !(b.dataset.section in sousDe(P));
    b.classList.toggle('on', b.dataset.section === G.section);
    b.classList.toggle('a-traiter', b.dataset.section === 'bureau' && aTraiter(P) > 0);
  }
  const sous = sousDe(P)[G.section];
  $('#sousnav').hidden = !sous;
  if (sous) $('#sousnav').innerHTML = sous.filter(([k]) => k !== 'series' || L.series).map(([k, mot]) => `<button class="soustab${G.sous[G.section] === k ? ' on' : ''}" data-sous="${k}">${mot}</button>`).join('');
  rendreVue();
}

function rendreVue() {
  const P = G.P;
  const L = P.L;
  const s = G.section;
  if (s === 'bureau') {
    const k = G.sous.bureau;
    $('#vue').innerHTML = k === 'proprio' ? vueProprio(P) : k === 'coach' ? vueCoach(P) : k === 'vestiaire' ? vueVestiaire(P, ctx(), G.entr) : vueBoite(P);
  } else if (s === 'joueurs') $('#vue').innerHTML = vueJoueurs(P, ctx(), G.joueurs.vue, G.joueurs.tri);
  else if (s === 'cinq') $('#vue').innerHTML = vueCinq(P, c => carteDuRef(c.ref).html);
  else if (s === 'marche') {
    const k = G.sous.marche;
    if (k === 'agents') rendreAgents();
    else if (k === 'joueurs') $('#vue').innerHTML = vuePacksJoueurs(P, P.offrePack ? P.offrePack.refs.map(ref => contratDe(ctx(), ref)) : null);
    else if (k === 'album') $('#vue').innerHTML = vueCollection();
    else $('#vue').innerHTML = vuePlanDeJeu(P, G.ouvertes);
  } else {
    const k = G.sous.ligue === 'series' && !L.series ? 'classement' : G.sous.ligue;
    const autour = k === 'classement' ? autourDeLaLigue(L) : [];
    $('#vue').innerHTML = (k === 'palmares' ? ecranPalmares(G.meta) : { classement: tableauClassement, calendrier, meneurs: tableauMeneurs, series: tableauSeries }[k](L))
      + (autour.length ? `<h3>Autour de la ligue</h3><ul class="autour">${autour.map(x => `<li>${x}</li>`).join('')}</ul>` : '');
  }
}

/* Les agents libres de la journée, tirés du dé du split : la même journée offre toujours les mêmes. */
async function rendreAgents() {
  const P = G.P;
  const L = P.L;
  const cle = `${G.pid}-${P.run.n}-${L.jour}-${P.log.length}`;
  if (marcheOuvert(L) && (!G.offre || G.offre.cle !== cle)) {
    G.offre = { cle, contrats: null };
    $('#vue').innerHTML = vueAgents(P, null);
    const refs = await agentsLibres(L, ids(), lireSplit, P.eff, P.adversaires, offreDe(P));
    if (G.offre.cle !== cle) return;
    G.offre.contrats = refs.map(ref => contratDe(ctx(), ref));
  }
  if (G.section === 'marche' && G.sous.marche === 'agents') $('#vue').innerHTML = vueAgents(P, G.offre && G.offre.cle === cle ? G.offre.contrats : null);
}

function allerA(section) {
  G.section = section;
  rendreSplit();
  window.scrollTo(0, 0);
}

/* Joue la journée ou la ronde ; ta série d'abord repêchée, à l'écran du repêchage (au 18-0, le jeu repêche). */
function avancer(t) {
  const L = G.P.L;
  const s = taSerie(L);
  if (s && G.P.mode !== 'dixhuit' && (G.P.v < 3 ? !s.repechage : attendRepechage(s))) {
    G.repechage = { t, d: nouveauRepechage(L, s) };
    rendreRepechage();
    montrer('#repechage');
    return;
  }
  jouer({ t });
}

/* Une journée, une partie de séries : jouée, on revient au Bureau, où hier soir la dit. */
function jouer(a) {
  const compte = s => (s ? `${s.cle}-${s.parties.length}` : '');
  const avant = compte(taDerniere(G.P.L));
  if (faire(a) === undefined) return;
  const s = G.P.L && taDerniere(G.P.L);
  const neuve = s && compte(s) !== avant;
  if (neuve && !G.regarderApres) jouerSon(s.parties[s.parties.length - 1].gagnant === (s.a === 0 ? 0 : 1) ? 'victoire' : 'defaite');
  G.section = 'bureau';
  G.sous.bureau = 'boite';
  allerA('bureau');
  // « Regarder » : la partie qui vient de se jouer, en direct ; sinon, rien ne s'ouvre (hier soir la dit).
  if (G.regarderApres && neuve) regarder(`${s.cle}|${s.parties.length - 1}`);
  G.regarderApres = false;
}

/* « CE SOIR » : l'avant-match de ta prochaine partie. */
function ouvrirCeSoir() {
  const L = G.P.L;
  const s = taSerie(L);
  if (!s) return;
  $('#soir').innerHTML = ecranCeSoir(G.P, ctx(), s, planAdverse(G.P, ctx(), s.a === 0 ? s.b : s.a));
  montrer('#soir');
}

/* LE SOMMAIRE d'une partie jouée : « clé de la série|numéro de la partie ». */
function ouvrirSommaire(quoi) {
  const L = G.P.L || G.P.dernier;
  const [cle, k] = quoi.split('|');
  const s = L && serieDe(L, cle);
  const p = s && s.parties[Number(k)];
  if (!p) return;
  const T = terrainDe(p.feuille, [L.equipes[p.bleu].nom, L.equipes[p.rouge].nom], graineDe(L.graine, `${cle}-${k}-direct`));
  $('#sommaire').innerHTML = ecranSommaire(L, s, Number(k), G.champions, faillePlate(T));
  montrer('#sommaire');
}

function rendreRepechage() {
  $('#repechage').innerHTML = ecranRepechage(G.P.L, G.repechage.d, G.champions);
}

function toucherRepechage(ev) {
  const { t, d } = G.repechage || {};
  if (!d) return;
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.ban) { bannir(G.P.L, d, b.dataset.ban); rendreRepechage(); return; }
  if (b.dataset.role) { choisir(G.P.L, d, b.dataset.role, b.dataset.champ); rendreRepechage(); return; }
  if (b.id !== 'repe-jouer' && b.id !== 'repe-auto') return;
  G.repechage = null;
  fermer('#repechage');
  jouer(b.id === 'repe-jouer' ? { t, rp: { bans: d.bans, choix: d.choix } } : { t });
}

/* Les gestes des sections et de la stratégie. */
async function toucherVue(ev) {
  const P = G.P;
  const li = ev.target.closest('[data-contrat]');
  const b = ev.target.closest('button');
  if (li && !b && (ev.type === 'click' || ev.key === 'Enter')) { carteDuContrat(li.dataset.contrat); return; }
  const serie = ev.target.closest('[data-serie]');
  if (serie && (!b || b === serie) && (ev.type === 'click' || ev.key === 'Enter')) { ouvrirFeuille(serie.dataset.serie); return; }
  if (!b || b.disabled || ev.type !== 'click') return;
  if (b.id === 'ouvrir-strategie') ouvrir('strategie');
  else if (b.dataset.album) ouvrirAlbum(b.dataset.album);
  else if (b.dataset.sous) { G.sous[G.section] = b.dataset.sous; rendreSplit(); }
  else if (b.dataset.soir !== undefined) ouvrirCeSoir();
  else if (b.dataset.afaire !== undefined) ouvrirChoix();
  else if (b.dataset.sommaire) ouvrirSommaire(b.dataset.sommaire);
  else if (b.dataset.tri) { G.joueurs.tri = b.dataset.tri; rendreVue(); }
  else if (b.dataset.vueJoueurs) { G.joueurs.vue = b.dataset.vueJoueurs; rendreVue(); }
  else if (b.id === 'soir-jouer' || b.id === 'soir-regarder') {
    fermer('#soir');
    G.regarderApres = b.id === 'soir-regarder';
    avancer(G.P.L.series ? 'ronde' : 'journee');
  }
  else if (b.dataset.direct) regarder(b.dataset.direct);
  else if (b.dataset.strategie !== undefined) {
    faire({ t: 'strategie', id: b.dataset.strategie || null });
    fermer('#strategie');
  } else if (b.dataset.choix) {
    // Réglé, le choix se ferme ; un pack offert s'ouvre, puis attend au plan de jeu.
    const r = faire({ t: 'evenement', choix: b.dataset.choix });
    fermer('#choix');
    if (r) { G.ouvertes = r; G.sous.marche = 'plan'; allerA('marche'); ouvrirPackDeCartes('Un pack offert', 'argent', r); }
  } else if (b.dataset.geste) faire({ t: b.dataset.geste });
  else if (b.dataset.entrRole) { G.entr = G.entr === b.dataset.entrRole ? null : b.dataset.entrRole; rendreVue(); }
  else if (b.dataset.entrChamp) { faire({ t: 'entrainer', r: G.entr, champion: b.dataset.entrChamp }); G.entr = null; }
  else if (b.dataset.agent) {
    const c = G.offre.contrats.find(x => cleDe(x.ref) === b.dataset.agent);
    faire({ t: 'marche', ref: c.ref, place: b.dataset.place });
  } else if (b.dataset.packJoueurs) {
    b.disabled = true;
    const id = b.dataset.packJoueurs;
    const refs = await tirerPackJoueurs(P.R, id, ids(), lireSplit, P.eff);
    if (faire({ t: 'packJoueurs', id, refs }) !== undefined) ouvrirPackDeJoueurs({ titre: PACKS_JOUEURS[id].nom, metal: id, marque: id === 'legendes' ? 'Légendes' : id }, refs);
  } else if (b.dataset.packSigner) {
    const ref = P.offrePack.refs.find(x => cleDe(x) === b.dataset.packSigner);
    faire({ t: 'signerPack', ref, place: b.dataset.place });
  } else if (b.dataset.pack) {
    const r = faire({ t: 'pack', id: b.dataset.pack });
    if (r) { G.ouvertes = r; rendreVue(); ouvrirPackDeCartes(PACKS[b.dataset.pack].nom, b.dataset.pack, r); }
  } else if (b.dataset.carte) faire({ t: 'plan', carte: b.dataset.carte });
  else if (b.dataset.coach) faire({ t: 'coach', id: b.dataset.coach });
}

function ouvrirFeuille(cle) {
  const L = G.P.L || G.P.dernier;
  const s = L && serieDe(L, cle);
  if (!s || s.gagnant === null) return;
  $('#feuille').innerHTML = feuilleSerie(L, s);
  montrer('#feuille');
}

/* Regarder une partie en direct : « clé de la série|numéro de la partie ». */
function regarder(quoi) {
  const L = G.P.L || G.P.dernier;
  const [cle, k] = quoi.split('|');
  const s = L && serieDe(L, cle);
  const p = s && s.parties[Number(k)];
  if (!p) return;
  const rp = repechageDe(s, Number(k));
  // Les dix joueurs de la feuille, et leur champion : celui du repêchage, sinon leur plus joué.
  const joueurs = [p.bleu, p.rouge].map((i, x) => p.feuille.equipes[x].joueurs.map(j => {
    const choix = rp && rp.choix[i === s.a ? 0 : 1][j.r];
    const bassin = L.equipes[i].cinq[j.r] && L.equipes[i].cinq[j.r].n === j.n ? L.equipes[i].cinq[j.r].bassin : [];
    const champion = choix || (bassin[0] && bassin[0][0]) || null;
    return { n: j.n, r: j.r, champion, icone: champion ? iconeChampion(G.champions, champion) : null };
  }));
  montrer('#direct');
  ouvrirDirect($('#direct'), {
    feuille: p.feuille, noms: [L.equipes[p.bleu].nom, L.equipes[p.rouge].nom], joueurs,
    graine: graineDe(L.graine, `${cle}-${k}-direct`), toi: p.bleu === 0 ? 0 : p.rouge === 0 ? 1 : null,
  });
}

/* LE CHOIX EN PLEIN ÉCRAN : la ligne d'À faire (ou « 1 choix à trancher ») l'ouvre ; « Plus tard » le laisse dans la boîte. */
function ouvrirChoix() {
  const h = feuilleDuChoix(G.P);
  if (!h) return;
  $('#choix').innerHTML = h;
  montrer('#choix');
  jouerSon('tap');
}

/*
 * L'OUVERTURE D'UN PACK (js/ouverture.js) : le pack est déjà tiré et gardé au journal ; on le dévoile, la
 * meilleure carte en dernier. Une ★ Étoile ou un ★ Phénomène s'annonce d'abord (le walkout) : l'année, le rôle,
 * le logo de son équipe.
 */
const NIVEAU_ECLAT = c => (c.cout >= 5 ? 2 : c.cout >= 3 ? 1 : 0);
function carteDuRef(ref) {
  const { split, profils } = G.splits.get(ref.id);
  const equipe = split.equipes.find(e => e.nom === ref.e);
  const j = equipe.joueurs.find(x => x.n === ref.n && x.r === ref.r);
  const col = collectionDe(G.meta).get(cleDe(ref));
  return { split, equipe, html: carte({ split, equipe, j, profil: profils.joueurs.get(j), champions: G.champions, bouton: false, collection: col && col.copies ? col : null }) };
}
function ouvrirPackDeJoueurs({ titre, metal, marque }, refs) {
  const contrats = refs.map(ref => contratDe(ctx(), ref)).sort((a, b) => a.cout - b.cout);
  const cartes = contrats.map(c => ({ ...carteDuRef(c.ref), eclat: NIVEAU_ECLAT(c), c }));
  const v = cartes[cartes.length - 1];
  const walkout = v && v.eclat === 2 ? [String(v.split.annee), ROLES[v.c.r], v.equipe.logo ? `<img src="${imageLP(v.equipe.logo)}" alt="">` : esc(v.equipe.nom)] : null;
  ouvrirPaquet($('#ouverture'), { pack: { titre, metal, marque, n: `${refs.length} joueur${refs.length > 1 ? 's' : ''}`, sous: 'Pack de joueurs' }, cartes, walkout, fin: () => majTete() });
  majTete();
}
function ouvrirPackDeCartes(titre, metal, ids) {
  const RANG = { commune: 0, peu: 0, rare: 1, legendaire: 2 };
  const cartes = [...ids].sort((a, b) => RANG[CARTES[a][2]] - RANG[CARTES[b][2]]).map(id => ({ html: carteDeJeu(id), eclat: RANG[CARTES[id][2]] }));
  const v = ids.length && cartes[cartes.length - 1].eclat === 2 ? ids.find(id => CARTES[id][2] === 'legendaire') : null;
  ouvrirPaquet($('#ouverture'), { pack: { titre, metal, marque: metal, n: `${ids.length} carte${ids.length > 1 ? 's' : ''}`, sous: 'Pack de cartes' }, cartes, walkout: v ? ['Légendaire', CARTES[v][0], esc(CARTES[v][1])] : null, fin: () => majTete() });
  majTete();
}

/* ---- LE BILAN ---- */
function rendreBilan() {
  $('#bilan').innerHTML = ecranBilan(G.P, G.gardes, G.vieux);
}

/* Qui vieillit : pour chacun, sa version du plus proche split plus récent, si elle existe. */
async function vieillir() {
  const P = G.P;
  const run = P.run.n;
  const vieux = new Map();
  for (const c of [...Object.values(P.eff.cinq), P.eff.banc].filter(Boolean)) {
    const ref = await prochaineVersion(G.index.splits, lireSplit, c);
    if (ref) vieux.set(cleDe(c.ref), contratDe(ctx(), ref));
  }
  if (G.P !== P || P.run.n !== run || P.etape !== 'gardes') return;
  G.vieux = vieux;
  rendre();
}

function toucherBilan(ev) {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.garder) {
    const k = b.dataset.garder;
    if (G.gardes.has(k)) G.gardes.delete(k); else G.gardes.add(k);
    rendreBilan();
  } else if (b.id === 'bilan-suivant') {
    if (parCases(G.P)) { if (faire({ t: 'suivant' }) !== undefined) window.scrollTo(0, 0); return; }
    const vieux = Object.fromEntries([...G.gardes].filter(k => G.vieux.has(k)).map(k => [k, G.vieux.get(k).ref]));
    if (faire({ t: 'garder', cles: [...G.gardes], vieux }) === undefined) return;
    G.gardes = new Set();
    G.vieux = new Map();
    window.scrollTo(0, 0);
  } else if (b.id === 'bilan-nouvelle') ouvrir('depart');
  else if (b.id === 'bilan-titre') { G.vue = 'titre'; rendre(); }
}

/* ---- LE DÉMARRAGE ---- */
async function demarrer() {
  G.de = hasard(Date.now());
  G.options = lireOptions();
  activerSons(G.options.sons);
  G.meta = lireMeta() || nouveauMeta();
  [G.index, G.champions] = await Promise.all([chargerIndex(), chargerChampions()]);
  $('#source').textContent = `Données : ${G.index.source}. Photos et logos : Leaguepedia.`;
  if (!G.index.splits.length) {
    $('#titre-corps').innerHTML = '<p class="etat">Aucun split bâti : lance scripts/build_splits.mjs.</p>';
    return;
  }
  migrer(idNeuf());
  // Le dé de la roulette reprend une graine neuve à chaque visite, tirée de l'heure.
  G.de = hasard(graineDe(Date.now(), 'visite'));

  for (const id of ['#titre', '#menu', '#parties', '#deblocages', '#palmares', '#collection', '#depart', '#album', '#exhibition']) {
    $(id).addEventListener('click', toucherMenu);
    $(id).addEventListener('keydown', toucherMenu);
  }
  for (const id of ['#parties']) $(id).addEventListener('change', importerFichier);
  $('#menuBtn').addEventListener('click', () => ouvrir('menu'));
  $('#roulette').addEventListener('click', () => tourner('tour'));
  $('#relances').addEventListener('click', ev => { const b = ev.target.closest('[data-relance]'); if (b && !b.disabled) tourner(b.dataset.relance); });
  $('#jouer').addEventListener('click', lancer);
  $('#pack').addEventListener('click', ouvrirPackDepart);
  $('#depart-cases').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.casePrendre) { const v = G.vieux.get(b.dataset.casePrendre); faire({ t: 'case', cle: b.dataset.casePrendre, ...(v ? { vieux: v.ref } : {}) }); }
    else if (b.dataset.casePasser !== undefined) faire({ t: 'case', cle: null });
  });
  $('#journee').addEventListener('click', () => { $('#journee').disabled = true; avancer('journee'); });
  $('#jusqua').addEventListener('click', () => jouer({ t: 'jusqua' }));
  $('#regarder').addEventListener('click', () => { G.regarderApres = true; avancer(G.P.L.series ? 'ronde' : 'journee'); });
  $('#series').addEventListener('click', () => { faire({ t: 'series' }); G.sous.ligue = 'series'; allerA('ligue'); });
  $('#ronde').addEventListener('click', () => avancer('ronde'));
  $('#bilan-ouvrir').addEventListener('click', () => {
    if (faire({ t: 'bilan' }) === undefined) return;
    window.scrollTo(0, 0);
    if (G.P.etape === 'gardes') vieillir();
  });
  $('#decision').addEventListener('click', ouvrirChoix);
  $('#nav').addEventListener('click', ev => { const b = ev.target.closest('[data-section]'); if (b) allerA(b.dataset.section); });
  for (const id of ['#vue', '#sousnav', '#strategie', '#feuille', '#soir', '#sommaire', '#choix']) {
    $(id).addEventListener('click', toucherVue);
    $(id).addEventListener('keydown', toucherVue);
  }
  $('#repechage').addEventListener('click', toucherRepechage);
  $('#bilan').addEventListener('click', toucherBilan);
  $('#bilan').addEventListener('click', ev => { const b = ev.target.closest('[data-serie]'); if (b) ouvrirFeuille(b.dataset.serie); });
  const toucherVestiaire = ev => {
    const b = ev.target.closest('[data-signer]');
    if (b) { if (ev.type === 'click') signer(Number(b.dataset.signer)); return; }
    const li = ev.target.closest('.joueur');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirCarte(Number(li.dataset.i));
  };
  $('#vestiaire-liste').addEventListener('click', toucherVestiaire);
  $('#vestiaire-liste').addEventListener('keydown', toucherVestiaire);
  // La carte : « Signer » signe ; la toucher, ou « ↻ », la retourne.
  $('#carte').addEventListener('click', ev => {
    if (ev.target.closest('.signer-carte')) { if (G.carte !== null) signer(G.carte); return; }
    if (ev.target.closest('[data-retourner]')) retournerFiche(ev.target.closest('.fiche'));
  });
  brancherInclinaison(document);
  brancherRetour(COUCHES.map(id => () => fermer(id)));
  rendre();
}

demarrer().catch(err => { $('#titre-corps').innerHTML = `<p class="etat">Erreur : ${esc(err.message)}</p>`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
