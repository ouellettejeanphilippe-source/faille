/*
 * LE CONTRÔLEUR. L'écran titre (js/menu.js), puis une run de plusieurs splits
 * (js/partie.js) tenue en journal d'actions : chaque geste passe par faire(),
 * qui l'applique, le garde dans sa sauvegarde (js/sauvegardes.js : plusieurs
 * parties, chacune sa graine et son journal), note la partie au méta
 * (js/meta.js : médailles, collection, palmarès) et redessine.
 *
 *   le titre       Continuer, Nouvelle run (ton club, tes déblocages), tes
 *                  déblocages, ta collection, le palmarès, les parties, les règles ;
 *   le repêchage   la roulette sort un split et une équipe ; tu signes un
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
import { imageLP } from './images.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit, TARIFS } from './cotes.js';
import { ROLES, badge, vignette, icones, coutHtml, carte } from './fiche.js';
import { tempoDuSplit, equipeReelle, classement } from './sim.js';
import { titreSplit, tableauClassement, calendrier, tableauSeries, tableauMeneurs, serieDe, feuilleSerie, taDerniere } from './split.js';
import { nouveauRepechage, bannir, choisir, ecranRepechage } from './tableau-repechage.js';
import { attendRepechage, repechageDe } from './repechage.js';
import { jetonsDe, liensDe, LIENS } from './rogue.js';
import { vuePacksJoueurs, vuePlanDeJeu } from './boutique.js';
import { RELANCES, tirer, tirerAdversaires, agentsLibres, libresDe, masseDe, plafondDe, signables, marcheOuvert, cleDe, tirerPackJoueurs, prochaineVersion } from './gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, taSerie, enAttente, sauvegarde, rejouer, refsDuJournal, relancesMax, offreDe, VERSION } from './partie.js';
import { phraseMandat, aTraiter, vueBureau, vueEffectif, vueAgents, ecranBilan, ecranStrategie, chezToi } from './bureau.js';
import { nouveauMeta, noter, acheter, porter, clubDe, deblocagesDe, collectionDe, exigenceDe, choisirExigence } from './meta.js';
import { lireIndex, migrer, partieActive, lirePartie, ecrirePartie, activer, supprimer, exporter, importer, lireMeta, ecrireMeta, lireOptions, ecrireOptions } from './sauvegardes.js';
import { ecranTitre, ecranMenu, ecranParties, ecranDepart } from './menu.js';
import { ecranDeblocages, ecranPalmares, ecranCollection, ecranAlbum } from './vitrine.js';
import { ecranRegles } from './regles.js';
import { ouvrirDirect, fermerDirect } from './direct.js';
import { activerSons, jouerSon } from './sons.js';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const G = {
  index: null, champions: null, splits: new Map(), P: null, pid: null, de: null, meta: null, options: null, vue: 'titre',
  section: 'bureau', sous: { marche: 'agents', ligue: 'classement' },
  carte: null, repechage: null, ouvertes: null, offre: null, gardes: new Set(), vieux: new Map(), entr: null,
};
/* Les couches, de celle du dessus à celle du dessous : le retour ferme la première ouverte. */
const COUCHES = ['#carte', '#direct', '#feuille', '#album', '#strategie', '#repechage', '#vestiaire', '#depart', '#deblocages', '#collection', '#palmares', '#regles', '#parties', '#menu'];
const ctx = () => ({ splits: G.splits, classes: G.champions.classes, champions: G.champions });
const rang = k => (k === 1 ? '1er' : `${k}e`);
const SOUS = {
  marche: [['agents', 'Agents libres'], ['joueurs', 'Packs de joueurs'], ['plan', 'Plan de jeu']],
  ligue: [['classement', 'Classement'], ['calendrier', 'Calendrier'], ['meneurs', 'Meneurs'], ['series', 'Séries']],
};

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
  if (P.etape === 'bati') return `Split ${P.run.n} · repêchage ${5 - libresDe(P.eff).length}/5`;
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
  if (a.t === 'signer' || a.t === 'marche' || a.t === 'signerPack') jouerSon('signer');
  else if (a.t === 'pack' || a.t === 'packJoueurs') jouerSon('pack');
  else if (a.t === 'bilan') jouerSon(G.P.run.fin ? 'medaille' : G.P.run.passes[G.P.run.passes.length - 1].rempli ? 'victoire' : 'defaite');
  rendre();
  return r ?? null;
}

/* ---- LE TABLEAU INDICATEUR : le retour, où en est la partie, ses chiffres, le menu ---- */
function majTete() {
  const P = G.P;
  const enJeu = G.vue === 'jeu' && P;
  $('#retourBtn').hidden = !COUCHES.some(id => !$(id).hidden);
  $('#menuBtn').hidden = !enJeu || !$('#menu').hidden;
  $('#teteNom').textContent = enJeu ? P.club.nom : 'Faille';
  $('#jauge').hidden = !enJeu || P.etape !== 'bati';
  $('#teteFiche').hidden = !enJeu || !P.L;
  $('#teteRang').hidden = !enJeu || !P.L;
  $('#teteJetons').hidden = !enJeu || P.etape === 'bati';
  $('#nav').hidden = !enJeu || P.etape !== 'split';
  if (!enJeu) { $('#teteEtat').textContent = 'Le jeu de gestion des splits'; return; }
  const L = P.L;
  const plafond = plafondDe(P.eff);
  const reste = plafond - masseDe(P.eff);
  $('#jaugeReste').textContent = `${reste} / ${plafond}`;
  $('#jaugeReste').className = `tete-ch-v${reste <= 3 ? ' serre' : ''}`;
  $('#jaugeRempli').style.width = `${(100 * reste) / plafond}%`;
  $('#teteJetons .tete-ch-v').textContent = jetonsDe(L, P.R);
  if (P.etape === 'bati') $('#teteEtat').textContent = `Split ${P.run.n} · ${5 - libresDe(P.eff).length} / 5 signés`;
  else if (!L) $('#teteEtat').textContent = `Bilan du split ${P.run.n}`;
  else {
    const c = classement(L);
    const k = c.findIndex(l => l.i === 0);
    $('#teteFiche .tete-ch-v').textContent = `${c[k].v}-${c[k].d}`;
    $('#teteRang .tete-ch-v').textContent = rang(k + 1);
    $('#teteEtat').textContent = `Split ${P.run.n} · ${titreSplit(L)}`;
  }
}

function montrer(id) {
  $(id).hidden = false;
  $(id).scrollTop = 0;
  majTete();
}

function fermer(id) {
  if ($(id).hidden) return false;
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
  $('#titre').innerHTML = ecranTitre(G.meta, partieActive(), G.options.sons);
}

/* Ce qui se redessine quand la partie ou le méta change, si c'est ouvert. */
const RENDUS = {
  '#menu': () => { $('#menu').innerHTML = ecranMenu(G.meta, G.options.sons); },
  '#parties': () => { $('#parties').innerHTML = ecranParties(lireIndex()); },
  '#regles': () => { $('#regles').innerHTML = ecranRegles(); },
  '#deblocages': () => { $('#deblocages').innerHTML = ecranDeblocages(G.meta); },
  '#palmares': () => { $('#palmares').innerHTML = ecranPalmares(G.meta); },
  '#collection': () => { $('#collection').innerHTML = ecranCollection(G.meta, G.index.splits, new Map([...G.splits].map(([id, s]) => [id, s.split.equipes.reduce((n, e) => n + e.joueurs.length, 0)]))); },
  '#depart': () => { $('#depart').innerHTML = ecranDepart(G.meta); },
  '#strategie': () => { if (G.P && G.P.L) $('#strategie').innerHTML = ecranStrategie(G.P, ctx()); },
};

function ouvrir(nom) {
  const id = `#${nom}`;
  if (!RENDUS[id]) return;
  RENDUS[id]();
  montrer(id);
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
  } else if (b.dataset.exigence !== undefined) {
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

/* LA RUN NEUVE : ton club et tes déblocages, posés au départ et gardés dans sa sauvegarde. */
function nouvelle() {
  G.pid = idNeuf();
  G.P = nouvellePartie(Math.floor(G.de() * 2 ** 32), { deb: deblocagesDe(G.meta), club: clubDe(G.meta), exig: exigenceDe(G.meta) });
  garder();
  entrer();
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
}

/* ---- LE REPÊCHAGE DE TON CINQ ---- */
function rendreBati() {
  const P = G.P;
  $('#bati-mandat').textContent = phraseMandat(P);
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = P.eff.cinq[r];
    return `<li class="case${j ? ' pleine' : ''}"><span class="case-role">${mot}</span>${j ? vignette(j) : ''}<span class="qui">${j
      ? `<b>${esc(j.n)}</b><small>${esc(j.niveau)} · ${esc(j.equipe)} · ${esc(j.split)}</small>` : '<small>À combler</small>'}</span>${j ? coutHtml(j.cout) : ''}</li>`;
  }).join('') + (P.eff.banc ? `<li class="case pleine"><span class="case-role">Banc</span>${vignette(P.eff.banc)}<span class="qui"><b>${esc(P.eff.banc.n)}</b><small>${esc(P.eff.banc.niveau)} · ${esc(P.eff.banc.split)}</small></span>${coutHtml(P.eff.banc.cout)}</li>` : '');
  const complet = !libresDe(P.eff).length;
  $('#roulette').hidden = complet;
  $('#roulette').lastChild.textContent = P.tirage ? 'Revoir le vestiaire' : 'Tourner la roulette';
  $('#jouer').hidden = !complet;
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

/* Les neuf adversaires sortent de la même roulette. */
async function lancer() {
  $('#jouer').disabled = true;
  try {
    const adversaires = await tirerAdversaires(G.de, ids(), lireSplit, equipeReelle);
    faire({ t: 'lancer', adversaires, graine: Math.floor(G.de() * 2 ** 32) });
    G.section = 'bureau';
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
  $('#split-titre').textContent = titreSplit(L);
  $('#split-mandat').textContent = phraseMandat(P);
  $('#decision').hidden = !attend || G.section === 'bureau';
  $('#journee').hidden = !saison || attend;
  $('#journee').disabled = false;
  $('#jusqua').hidden = !saison || attend;
  $('#series').hidden = saison || !!S;
  $('#ronde').hidden = !S || S.champion !== null;
  const tienne = S && taSerie(L);
  if (tienne) {
    const nous = tienne.a === 0 ? 0 : 1;
    $('#ronde').textContent = `Partie ${tienne.parties.length + 1} · ${tienne.v[nous]}-${tienne.v[1 - nous]}`;
  } else $('#ronde').textContent = 'Ronde suivante';
  $('#bilan-ouvrir').hidden = !S || S.champion === null;
  for (const b of $$('.navtab')) {
    b.classList.toggle('on', b.dataset.section === G.section);
    b.classList.toggle('a-traiter', b.dataset.section === 'bureau' && aTraiter(P) > 0);
  }
  const sous = SOUS[G.section];
  $('#sousnav').hidden = !sous;
  if (sous) $('#sousnav').innerHTML = sous.filter(([k]) => k !== 'series' || L.series).map(([k, mot]) => `<button class="soustab${G.sous[G.section] === k ? ' on' : ''}" data-sous="${k}">${mot}</button>`).join('');
  rendreVue();
}

function rendreVue() {
  const P = G.P;
  const L = P.L;
  const s = G.section;
  if (s === 'bureau') $('#vue').innerHTML = vueBureau(P, ctx());
  else if (s === 'effectif') $('#vue').innerHTML = vueEffectif(P, ctx(), G.entr);
  else if (s === 'marche') {
    const k = G.sous.marche;
    if (k === 'agents') rendreAgents();
    else if (k === 'joueurs') $('#vue').innerHTML = vuePacksJoueurs(P, P.offrePack ? P.offrePack.refs.map(ref => contratDe(ctx(), ref)) : null);
    else $('#vue').innerHTML = vuePlanDeJeu(P, G.ouvertes);
  } else {
    const k = G.sous.ligue === 'series' && !L.series ? 'classement' : G.sous.ligue;
    $('#vue').innerHTML = { classement: tableauClassement, calendrier, meneurs: tableauMeneurs, series: tableauSeries }[k](L);
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

/* Joue la journée ou la ronde ; ta série d'abord repêchée, à l'écran du repêchage. */
function avancer(t) {
  const L = G.P.L;
  const s = taSerie(L);
  if (s && (G.P.v < 3 ? !s.repechage : attendRepechage(s))) {
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
  if (s && compte(s) !== avant) jouerSon(s.parties[s.parties.length - 1].gagnant === (s.a === 0 ? 0 : 1) ? 'victoire' : 'defaite');
  allerA('bureau');
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
  else if (b.dataset.sous) { G.sous[G.section] = b.dataset.sous; rendreSplit(); }
  else if (b.dataset.direct) regarder(b.dataset.direct);
  else if (b.dataset.strategie !== undefined) {
    faire({ t: 'strategie', id: b.dataset.strategie || null });
    fermer('#strategie');
  } else if (b.dataset.choix) {
    // Un pack offert s'ouvre au plan de jeu.
    const r = faire({ t: 'evenement', choix: b.dataset.choix });
    if (r) { G.ouvertes = r; G.sous.marche = 'plan'; allerA('marche'); }
  } else if (b.dataset.geste) faire({ t: b.dataset.geste });
  else if (b.dataset.entrRole) { G.entr = G.entr === b.dataset.entrRole ? null : b.dataset.entrRole; rendreVue(); }
  else if (b.dataset.entrChamp) { faire({ t: 'entrainer', r: G.entr, champion: b.dataset.entrChamp }); G.entr = null; }
  else if (b.dataset.agent) {
    const c = G.offre.contrats.find(x => cleDe(x.ref) === b.dataset.agent);
    faire({ t: 'marche', ref: c.ref, place: b.dataset.place });
  } else if (b.dataset.packJoueurs) {
    b.disabled = true;
    const refs = await tirerPackJoueurs(P.R, b.dataset.packJoueurs, ids(), lireSplit, P.eff);
    faire({ t: 'packJoueurs', id: b.dataset.packJoueurs, refs });
  } else if (b.dataset.packSigner) {
    const ref = P.offrePack.refs.find(x => cleDe(x) === b.dataset.packSigner);
    faire({ t: 'signerPack', ref, place: b.dataset.place });
  } else if (b.dataset.pack) {
    const r = faire({ t: 'pack', id: b.dataset.pack });
    if (r) { G.ouvertes = r; rendreVue(); }
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
  const champs = rp ? [p.bleu === s.a ? rp.choix[0] : rp.choix[1], p.rouge === s.a ? rp.choix[0] : rp.choix[1]] : null;
  montrer('#direct');
  ouvrirDirect($('#direct'), {
    feuille: p.feuille, noms: [L.equipes[p.bleu].nom, L.equipes[p.rouge].nom], champs,
    graine: graineDe(L.graine, `${cle}-${k}-direct`), toi: p.bleu === 0 ? 0 : p.rouge === 0 ? 1 : null,
  });
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
    $('#titre').innerHTML = '<p class="etat">Aucun split bâti : lance scripts/build_splits.mjs.</p>';
    return;
  }
  migrer(idNeuf());
  // Le dé de la roulette reprend une graine neuve à chaque visite, tirée de l'heure.
  G.de = hasard(graineDe(Date.now(), 'visite'));

  for (const id of ['#titre', '#menu', '#parties', '#deblocages', '#palmares', '#collection', '#depart', '#album']) {
    $(id).addEventListener('click', toucherMenu);
    $(id).addEventListener('keydown', toucherMenu);
  }
  for (const id of ['#parties']) $(id).addEventListener('change', importerFichier);
  $('#menuBtn').addEventListener('click', () => ouvrir('menu'));
  $('#roulette').addEventListener('click', () => tourner('tour'));
  $('#relances').addEventListener('click', ev => { const b = ev.target.closest('[data-relance]'); if (b && !b.disabled) tourner(b.dataset.relance); });
  $('#jouer').addEventListener('click', lancer);
  $('#journee').addEventListener('click', () => { $('#journee').disabled = true; avancer('journee'); });
  $('#jusqua').addEventListener('click', () => jouer({ t: 'jusqua' }));
  $('#series').addEventListener('click', () => { faire({ t: 'series' }); G.sous.ligue = 'series'; allerA('ligue'); });
  $('#ronde').addEventListener('click', () => avancer('ronde'));
  $('#bilan-ouvrir').addEventListener('click', () => {
    if (faire({ t: 'bilan' }) === undefined) return;
    window.scrollTo(0, 0);
    if (G.P.etape === 'gardes') vieillir();
  });
  $('#decision').addEventListener('click', () => allerA('bureau'));
  $('#nav').addEventListener('click', ev => { const b = ev.target.closest('[data-section]'); if (b) allerA(b.dataset.section); });
  for (const id of ['#vue', '#sousnav', '#strategie', '#feuille']) {
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
  $('#carte').addEventListener('click', ev => { if (ev.target.closest('.signer-carte') && G.carte !== null) signer(G.carte); });
  brancherRetour(COUCHES.map(id => () => fermer(id)));
  rendre();
}

demarrer().catch(err => { $('#titre').innerHTML = `<p class="etat">Erreur : ${esc(err.message)}</p>`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
