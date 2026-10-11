/*
 * LE CONTRÔLEUR. Une run de plusieurs splits (js/partie.js), tenue en journal
 * d'actions : chaque geste passe par faire(), qui l'applique, le garde dans
 * la sauvegarde (localStorage : la graine et le journal) et redessine.
 *
 *   le repêchage   la roulette sort un split et une équipe ; tu signes un
 *                  joueur pour un rôle libre sous le plafond ; deux relances
 *                  de chaque sorte (js/gestion.js) ;
 *   le split       ton cinq contre neuf vrais vestiaires, une journée à la
 *                  fois, puis les séries ; le repêchage des champions avant
 *                  chacune de tes séries ; la boîte, le marché, la boutique
 *                  entre deux journées ;
 *   le bilan       le mandat du proprio ; rempli, tu gardes jusqu'à deux
 *                  joueurs et le split suivant commence.
 *
 * Le hasard de la roulette et du marché se tire ici (le dé de la partie, le
 * dé du split) et le journal garde ce qui est sorti. L'interface suit Cap
 * 82-0 : le tableau indicateur en haut, une action principale par écran.
 * Ce qui s'affiche est le niveau, les badges ou une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit, chargerChampions } from './data.js';
import { hasard, graineDe } from './hasard.js';
import { esc, pts } from './util.js';
import { imageLP } from './images.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit, PLAFOND, TARIFS } from './cotes.js';
import { ROLES, badge, vignette, icones, coutHtml, carte } from './fiche.js';
import { tempoDuSplit, equipeReelle, classement } from './sim.js';
import { titreSplit, tableauJour, tableauClassement, serieDe, feuilleSerie } from './split.js';
import { nouveauRepechage, bannir, choisir, ecranRepechage } from './tableau-repechage.js';
import { jetonsDe, liensDe, LIENS } from './rogue.js';
import { boutique, resumeRogue } from './boutique.js';
import { RELANCES, tirer, tirerAdversaires, agentsLibres, libresDe, masseDe, signables, marcheOuvert, cleDe } from './gestion.js';
import { nouvellePartie, appliquer, contratDe, vestiaireDe, taSerie, enAttente, sauvegarde, rejouer, refsDuJournal, VERSION } from './partie.js';
import { phraseMandat, aTraiter, ecranBoite, ecranMarche, ecranBilan } from './bureau.js';

const $ = s => document.querySelector(s);
const CLE = 'faille-partie';

const G = { index: null, champions: null, splits: new Map(), P: null, de: null, carte: null, repechage: null, ouvertes: null, offre: null, gardes: new Set(), entr: null };
const COUCHES = ['#feuille', '#repechage', '#boutique', '#boite', '#marche', '#carte', '#vestiaire'];
const ctx = () => ({ splits: G.splits, classes: G.champions.classes, champions: G.champions });
const rang = k => (k === 1 ? '1er' : `${k}e`);

/* Un split chargé, avec ses profils et son tempo, gardé pour la suite. */
async function lireSplit(id) {
  if (!G.splits.has(id)) {
    const split = await chargerSplit(id);
    G.splits.set(id, { split, profils: profilsDuSplit(split), tempo: tempoDuSplit(split) });
  }
  return G.splits.get(id);
}
const ids = () => G.index.splits.map(s => s.id);

/* LA SAUVEGARDE : la graine et le journal. Le navigateur peut la refuser (navigation privée) : le jeu continue sans. */
function garder() {
  try { localStorage.setItem(CLE, JSON.stringify(sauvegarde(G.P))); } catch { /* pas de sauvegarde ici */ }
}
async function reprendre() {
  let sv = null;
  try { sv = JSON.parse(localStorage.getItem(CLE)); } catch { sv = null; }
  if (!sv || sv.v !== VERSION) return null;
  try {
    await Promise.all(refsDuJournal(sv.log).map(lireSplit));
    return rejouer(sv, ctx());
  } catch {
    return null;   // les splits ont changé depuis : la sauvegarde ne rejoue plus
  }
}

/* Un mot qui passe, en bas de l'écran : ce qui a été refusé, et pourquoi. */
let minuterie = null;
function avis(texte) {
  $('#avis').textContent = texte;
  $('#avis').hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { $('#avis').hidden = true; }, 3000);
}

/* LE GESTE : une action appliquée, gardée, redessinée. Rend son résultat, ou undefined si elle est refusée. */
function faire(a) {
  let r;
  try { r = appliquer(G.P, a, ctx()); } catch (err) { avis(err.message); return undefined; }
  garder();
  rendre();
  return r ?? null;
}

/* LE TABLEAU INDICATEUR : le retour quand une couche est ouverte ; le plafond pendant le repêchage ; la fiche, le rang et les jetons ensuite. */
function majTete() {
  const P = G.P;
  const L = P.L;
  $('#retourBtn').hidden = !COUCHES.some(id => !$(id).hidden);
  $('#jauge').hidden = P.etape !== 'bati';
  const reste = PLAFOND - masseDe(P.eff);
  $('#jaugeReste').textContent = `${reste} / ${PLAFOND}`;
  $('#jaugeReste').className = `tete-ch-v${reste <= 3 ? ' serre' : ''}`;
  $('#jaugeRempli').style.width = `${(100 * reste) / PLAFOND}%`;
  $('#teteFiche').hidden = !L;
  $('#teteRang').hidden = !L;
  $('#teteJetons').hidden = P.etape === 'bati';
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
  majTete();
  return true;
}

function rendre() {
  const e = G.P.etape;
  $('#bati').hidden = e !== 'bati';
  $('#split').hidden = e !== 'split';
  $('#bilan').hidden = e !== 'gardes' && e !== 'fin';
  if (e === 'bati') rendreBati();
  else if (e === 'split') rendreSplit();
  else rendreBilan();
  for (const id of ['#boite', '#marche', '#boutique']) if (!$(id).hidden) RENDUS[id]();
  majTete();
}

/* ---- LE REPÊCHAGE DE TON CINQ ---- */
function rendreBati() {
  const P = G.P;
  $('#bati-mandat').textContent = phraseMandat(P.run.n);
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = P.eff.cinq[r];
    return `<li class="case${j ? ' pleine' : ''}"><span class="case-role">${mot}</span>${j ? vignette(j) : ''}<span class="qui">${j
      ? `<b>${esc(j.n)}</b><small>${esc(j.niveau)} · ${esc(j.equipe)} · ${esc(j.split)}</small>` : '<small>À combler</small>'}</span>${j ? coutHtml(j.cout) : ''}</li>`;
  }).join('') + (P.eff.banc ? `<li class="case pleine"><span class="case-role">Banc</span>${vignette(P.eff.banc)}<span class="qui"><b>${esc(P.eff.banc.n)}</b><small>${esc(P.eff.banc.niveau)} · ${esc(P.eff.banc.split)}</small></span>${coutHtml(P.eff.banc.cout)}</li>` : '');
  const complet = !libresDe(P.eff).length;
  $('#roulette').hidden = complet;
  $('#roulette').lastChild.textContent = P.tirage ? 'Revoir le vestiaire' : 'Tourner la roulette';
  $('#jouer').hidden = !complet;
  $('#recommencer').hidden = P.run.n === 1 && !P.log.length;
  $('#recommencer').textContent = P.run.n > 1 ? 'Abandonner la run' : 'Recommencer';
  const liens = liensDe(P.eff.cinq).map(id => `${LIENS[id][0]} ${LIENS[id][1]}`);
  $('#etat').textContent = complet ? `Alignement complet, ${pts(masseDe(P.eff))} sur ${PLAFOND}.${liens.length ? ` Liens d'origine : ${liens.join(', ')}.` : ''}` : `Le coût suit le niveau : ${TARIFS.map(([n, c]) => `${n} ${pts(c)}`).join(' · ')}.`;
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
  $('#vestiaire-bandeau').innerHTML = `${v.equipe.logo ? `<img src="${imageLP(v.equipe.logo)}" alt="">` : ''}
    <span class="bandeau-id"><small>${esc(v.split.nom)} · ${v.equipe.v}-${v.equipe.d} en parties</small><h2>${esc(v.equipe.nom)}</h2></span>`;
  $('#vestiaire-libres').textContent = l.map(r => ROLES[r]).join(', ');
  $('#vestiaire-max').textContent = `jusqu'à ${pts(PLAFOND - masseDe(P.eff) - (l.length - 1))}`;
  $('#vestiaire-liste').innerHTML = v.equipe.joueurs.map((j, i) => {
    const p = v.profils.joueurs.get(j);
    const non = refus(v, j);
    return `<li class="joueur${P.eff.cinq[j.r] ? ' pris' : ''}" data-i="${i}" tabindex="0">
      ${vignette(j)}
      <span class="joueur-id"><b>${esc(j.n)}</b><small>${ROLES[j.r]} · ${p.niveau}</small><span class="joueur-champs">${icones(G.champions, j)}</span>${p.badges.length ? `<span>${p.badges.map(badge).join('')}</span>` : ''}</span>
      ${coutHtml(p.cout)}
      <button class="signer" data-signer="${i}"${non ? ' disabled' : ''}>${non || 'Signer'}</button></li>`;
  }).join('');
  $('#relances').innerHTML = Object.entries(RELANCES).map(([k, [mot, max]]) =>
    `<button data-relance="${k}"${P.relances[k] >= max ? ' disabled' : ''}>${mot} <span class="compte">${max - P.relances[k]}</span></button>`).join('');
}

function ouvrirCarte(i) {
  const v = vestiaireDe(G.P, ctx());
  const j = v && v.equipe.joueurs[i];
  if (!j) return;
  G.carte = i;
  $('#carte').innerHTML = carte({ split: v.split, equipe: v.equipe, j, profil: v.profils.joueurs.get(j), champions: G.champions, refus: refus(v, j) });
  montrer('#carte');
}

/* Un tour de roulette (`tour`) ou une relance : le vestiaire s'ouvre. */
async function tourner(mode) {
  const P = G.P;
  if (mode === 'tour' && P.tirage) { rendreVestiaire(); montrer('#vestiaire'); return; }
  for (const b of document.querySelectorAll('#roulette, #relances button')) b.disabled = true;
  try {
    const t = await tirer(G.de, ids(), lireSplit, P.eff, mode, P.tirage);
    if (t && faire({ t: 'tirage', mode, ...t }) !== undefined) { rendreVestiaire(); montrer('#vestiaire'); }
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
  } finally {
    $('#jouer').disabled = false;
  }
}

/* ---- LE SPLIT ---- */
function rendreSplit() {
  const P = G.P;
  const L = P.L;
  const S = L.series;
  const saison = L.jour < L.journees.length;
  const attend = !!enAttente(P);
  $('#split-titre').textContent = titreSplit(L);
  $('#split-mandat').textContent = phraseMandat(P.run.n);
  $('#split-jour').innerHTML = tableauJour(L);
  $('#split-classement').innerHTML = tableauClassement(L);
  $('#jetons').textContent = resumeRogue(L, P.R);
  $('#decision').hidden = !attend;
  $('#journee').hidden = !saison || attend;
  $('#jusqua').hidden = !saison;
  $('#series').hidden = saison || !!S;
  $('#ronde').hidden = !S || S.champion !== null;
  $('#bilan-ouvrir').hidden = !S || S.champion === null;
  $('#ouvrir-boite').lastChild.innerHTML = aTraiter(P) ? `Boîte <span class="compte">${aTraiter(P)}</span>` : 'Boîte';
  $('#ouvrir-marche').lastChild.textContent = marcheOuvert(L) ? 'Marché' : 'Effectif';
}

/* Joue la journée ou la ronde ; ta série d'abord repêchée, à l'écran du repêchage. */
function avancer(t) {
  const L = G.P.L;
  const s = taSerie(L);
  if (s && !s.repechage) {
    G.repechage = { t, d: nouveauRepechage(L, s) };
    rendreRepechage();
    montrer('#repechage');
    return;
  }
  faire({ t });
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
  faire(b.id === 'repe-jouer' ? { t, rp: { bans: d.bans, choix: d.choix } } : { t });
}

/* ---- LA BOÎTE, LE MARCHÉ, LA BOUTIQUE : des couches sur le split ---- */
const RENDUS = {
  '#boite': () => { $('#boite').innerHTML = ecranBoite(G.P); },
  '#marche': () => rendreMarche(),
  '#boutique': () => { $('#boutique').innerHTML = boutique(G.P.L, G.P.R, G.ouvertes); },
};

/* Les agents libres de la journée, tirés du dé du split : la même journée offre toujours les mêmes. */
async function rendreMarche() {
  const P = G.P;
  const L = P.L;
  const cle = `${P.run.n}-${L.jour}-${P.log.length}`;
  if (marcheOuvert(L) && (!G.offre || G.offre.cle !== cle)) {
    G.offre = { cle, contrats: null };
    $('#marche').innerHTML = ecranMarche(P, null, ctx(), G.entr);
    const refs = await agentsLibres(L, ids(), lireSplit, P.eff, P.adversaires);
    if (G.offre.cle !== cle) return;
    G.offre.contrats = refs.map(ref => contratDe(ctx(), ref));
  }
  $('#marche').innerHTML = ecranMarche(P, G.offre && G.offre.cle === cle ? G.offre.contrats : null, ctx(), G.entr);
}

function ouvrir(id) {
  G.ouvertes = null;
  RENDUS[id]();
  montrer(id);
}

function toucherCouches(ev) {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.choix) {
    // Un pack offert s'ouvre à la boutique.
    const r = faire({ t: 'evenement', choix: b.dataset.choix });
    if (r) { fermer('#boite'); ouvrir('#boutique'); G.ouvertes = r; RENDUS['#boutique'](); }
  } else if (b.dataset.geste) faire({ t: b.dataset.geste });
  else if (b.dataset.entrRole) { G.entr = G.entr === b.dataset.entrRole ? null : b.dataset.entrRole; rendreMarche(); }
  else if (b.dataset.entrChamp) { faire({ t: 'entrainer', r: G.entr, champion: b.dataset.entrChamp }); G.entr = null; }
  else if (b.dataset.agent) {
    const c = G.offre.contrats.find(x => cleDe(x.ref) === b.dataset.agent);
    faire({ t: 'marche', ref: c.ref, place: b.dataset.place });
  } else if (b.dataset.pack) {
    const r = faire({ t: 'pack', id: b.dataset.pack });
    if (r) { G.ouvertes = r; RENDUS['#boutique'](); }
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

/* ---- LE BILAN ---- */
function rendreBilan() {
  $('#bilan').innerHTML = ecranBilan(G.P, G.gardes);
}

function toucherBilan(ev) {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.garder) {
    const k = b.dataset.garder;
    if (G.gardes.has(k)) G.gardes.delete(k); else G.gardes.add(k);
    rendreBilan();
  } else if (b.id === 'bilan-suivant') {
    try {
      appliquer(G.P, { t: 'garder', cles: [...G.gardes] }, ctx());
    } catch (err) { avis(err.message); return; }
    G.gardes = new Set();
    garder();
    rendre();
  } else if (b.id === 'bilan-nouvelle') nouvelle();
}

/* ---- LA RUN ---- */
function nouvelle() {
  G.P = nouvellePartie(Math.floor(G.de() * 2 ** 32));
  G.gardes = new Set();
  G.offre = null;
  for (const id of COUCHES) $(id).hidden = true;
  garder();
  rendre();
}

async function demarrer() {
  G.de = hasard(Date.now());
  [G.index, G.champions] = await Promise.all([chargerIndex(), chargerChampions()]);
  $('#source').textContent = `Données : ${G.index.source}. Photos et logos : Leaguepedia.`;
  if (!G.index.splits.length) {
    $('#etat').textContent = 'Aucun split bâti : lance scripts/build_splits.mjs.';
    $('#roulette').hidden = true;
    return;
  }
  // Le dé de la roulette reprend après la sauvegarde : une graine neuve à chaque visite, tirée de l'heure.
  G.P = await reprendre() || nouvellePartie(Math.floor(G.de() * 2 ** 32));
  G.de = hasard(graineDe(G.P.graine, `visite-${Date.now()}`));

  $('#roulette').addEventListener('click', () => tourner('tour'));
  $('#relances').addEventListener('click', ev => { const b = ev.target.closest('[data-relance]'); if (b && !b.disabled) tourner(b.dataset.relance); });
  $('#recommencer').addEventListener('click', () => {
    if (G.P.run.n === 1 || window.confirm('Abandonner la run ? Tes cartes, ton coach et tes jetons repartent de zéro.')) nouvelle();
  });
  $('#jouer').addEventListener('click', lancer);
  $('#journee').addEventListener('click', () => avancer('journee'));
  $('#jusqua').addEventListener('click', () => faire({ t: 'jusqua' }));
  $('#series').addEventListener('click', () => faire({ t: 'series' }));
  $('#ronde').addEventListener('click', () => avancer('ronde'));
  $('#bilan-ouvrir').addEventListener('click', () => faire({ t: 'bilan' }));
  $('#decision').addEventListener('click', () => ouvrir('#boite'));
  $('#ouvrir-boite').addEventListener('click', () => ouvrir('#boite'));
  $('#ouvrir-marche').addEventListener('click', () => ouvrir('#marche'));
  $('#ouvrir-boutique').addEventListener('click', () => ouvrir('#boutique'));
  for (const id of ['#boite', '#marche', '#boutique']) $(id).addEventListener('click', toucherCouches);
  $('#repechage').addEventListener('click', toucherRepechage);
  $('#bilan').addEventListener('click', toucherBilan);
  const voirSerie = ev => {
    const li = ev.target.closest('[data-serie]');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirFeuille(li.dataset.serie);
  };
  $('#split-jour').addEventListener('click', voirSerie);
  $('#split-jour').addEventListener('keydown', voirSerie);
  const toucherVestiaire = ev => {
    const b = ev.target.closest('[data-signer]');
    if (b) { if (ev.type === 'click') signer(Number(b.dataset.signer)); return; }
    const li = ev.target.closest('.joueur');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirCarte(Number(li.dataset.i));
  };
  $('#vestiaire-liste').addEventListener('click', toucherVestiaire);
  $('#vestiaire-liste').addEventListener('keydown', toucherVestiaire);
  $('#carte').addEventListener('click', ev => { if (ev.target.closest('.signer-carte')) signer(G.carte); });
  brancherRetour(COUCHES.map(id => () => fermer(id)));
  rendre();
}

demarrer().catch(err => { $('#etat').textContent = `Erreur : ${err.message}`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
