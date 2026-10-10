/*
 * LE CONTRÔLEUR. La boucle du repêchage, sans plafond encore : la roulette
 * sort un split et une équipe, tu ouvres la carte d'un joueur de ce vestiaire
 * et tu le signes pour un rôle libre, jusqu'à cinq. Puis le split : ton cinq
 * contre neuf vrais vestiaires tirés par la même roulette, joué une journée à
 * la fois (js/sim.js), puis les séries.
 *
 * Le plafond : chaque joueur coûte selon son niveau, et le cinq tient
 * dessous (js/cotes.js). L'interface suit Cap 82-0 : le tableau indicateur
 * en haut (le retour, le plafond, puis la fiche, le rang et les jetons), une
 * action principale par écran, collée en bas.
 *
 * Le rogue (jalon 3) : avant chacune de tes séries, le repêchage des
 * champions (js/repechage.js) ; entre deux journées, la boutique — les
 * packs, le plan de jeu, le coach (js/rogue.js). Tout passe par les canaux
 * du moteur.
 * Ce qui s'affiche est le niveau, les badges ou une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit, chargerChampions } from './data.js';
import { hasard, piger } from './hasard.js';
import { esc, pts } from './util.js';
import { imageLP } from './images.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit, PLAFOND, TARIFS, signable } from './cotes.js';
import { ROLES, badge, vignette, icones, coutHtml, carte } from './fiche.js';
import { tempoDuSplit, joueurDuMoteur, equipeReelle, melangerTempos, creerSplit, jouerJournee, creerSeries, jouerRonde, classement } from './sim.js';
import { titreSplit, tableauJour, tableauClassement, serieDe, feuilleSerie } from './split.js';
import { repecher } from './repechage.js';
import { nouveauRepechage, bannir, choisir, ecranRepechage } from './tableau-repechage.js';
import { nouveauRogue, ouvrirPack, basculer, engager, effetsDeToi, noterJoue, jetonsDe } from './rogue.js';
import { boutique, resumeRogue } from './boutique.js';

const $ = s => document.querySelector(s);

const G = { index: null, champions: null, de: null, tirage: null, alignement: {}, ligue: null, rogue: null, repechage: null, apres: null, ouvertes: null, splits: new Map() };
const ADVERSAIRES = 9;
const COUCHES = ['#feuille', '#repechage', '#boutique', '#carte', '#vestiaire'];

/* Le plafond qui reste, et les rôles encore vides. */
const reste = () => PLAFOND - Object.values(G.alignement).reduce((s, j) => s + j.cout, 0);
const libres = () => Object.keys(ROLES).filter(r => !G.alignement[r]);
const rang = k => (k === 1 ? '1er' : `${k}e`);

/* LE TABLEAU INDICATEUR : le retour quand une couche est ouverte ; le plafond pendant qu'on bâtit ; la fiche, le rang et les jetons pendant le split. */
function majTete() {
  const L = G.ligue;
  $('#retourBtn').hidden = !COUCHES.some(id => !$(id).hidden);
  $('#jauge').hidden = !!L;
  const r = reste();
  $('#jaugeReste').textContent = `${r} / ${PLAFOND}`;
  $('#jaugeReste').className = `tete-ch-v${r <= 3 ? ' serre' : ''}`;
  $('#jaugeRempli').style.width = `${(100 * r) / PLAFOND}%`;
  for (const id of ['#teteFiche', '#teteRang', '#teteJetons']) $(id).hidden = !L;
  if (!L) {
    $('#teteEtat').textContent = `${Object.keys(G.alignement).length} / 5 signés`;
    return;
  }
  const c = classement(L);
  const k = c.findIndex(l => l.i === 0);
  $('#teteFiche .tete-ch-v').textContent = `${c[k].v}-${c[k].d}`;
  $('#teteRang .tete-ch-v').textContent = rang(k + 1);
  $('#teteJetons .tete-ch-v').textContent = jetonsDe(L, G.rogue);
  $('#teteEtat').textContent = titreSplit(L);
}

function montrer(id) {
  $(id).hidden = false;
  $(id).scrollTop = 0;
  majTete();
}

function rendreAlignement() {
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = G.alignement[r];
    return `<li class="case${j ? ' pleine' : ''}"><span class="case-role">${mot}</span>${j ? vignette(j) : ''}<span class="qui">${j
      ? `<b>${esc(j.n)}</b><small>${esc(j.niveau)} · ${esc(j.equipe)} · ${esc(j.split)}</small>` : '<small>À combler</small>'}</span>${j ? coutHtml(j.cout) : ''}</li>`;
  }).join('');
  const complet = !libres().length;
  $('#roulette').hidden = complet;
  $('#jouer').hidden = !complet;
  $('#recommencer').hidden = !Object.keys(G.alignement).length;
  $('#etat').textContent = complet ? `Alignement complet, ${pts(PLAFOND - reste())} sur ${PLAFOND}.` : `Le coût suit le niveau : ${TARIFS.map(([n, c]) => `${n} ${pts(c)}`).join(' · ')}.`;
  majTete();
}

/* Pourquoi un joueur ne se signe pas (null : il se signe). */
function refus(j, p) {
  if (G.alignement[j.r]) return `${ROLES[j.r]} comblé`;
  return signable(p.cout, reste(), libres().length) ? null : 'Trop cher';
}

function rendreVestiaire() {
  const { split, equipe, profils } = G.tirage;
  const l = libres();
  $('#vestiaire-bandeau').innerHTML = `${equipe.logo ? `<img src="${imageLP(equipe.logo)}" alt="">` : ''}
    <span class="bandeau-id"><small>${esc(split.nom)} · ${equipe.v}-${equipe.d} en parties</small><h2>${esc(equipe.nom)}</h2></span>`;
  $('#vestiaire-libres').textContent = l.map(r => ROLES[r]).join(', ');
  $('#vestiaire-max').textContent = `jusqu'à ${pts(reste() - (l.length - 1))}`;
  $('#vestiaire-liste').innerHTML = equipe.joueurs.map((j, i) => {
    const p = profils.joueurs.get(j);
    const non = refus(j, p);
    return `<li class="joueur${G.alignement[j.r] ? ' pris' : ''}" data-i="${i}" tabindex="0">
      ${vignette(j)}
      <span class="joueur-id"><b>${esc(j.n)}</b><small>${ROLES[j.r]} · ${p.niveau}</small><span class="joueur-champs">${icones(G.champions, j)}</span>${p.badges.length ? `<span>${p.badges.map(badge).join('')}</span>` : ''}</span>
      ${coutHtml(p.cout)}
      <button class="signer" data-signer="${i}"${non ? ' disabled' : ''}>${non || 'Signer'}</button></li>`;
  }).join('');
  montrer('#vestiaire');
}

function ouvrirCarte(i) {
  const { split, equipe, profils } = G.tirage;
  const j = equipe.joueurs[i];
  if (!j) return;
  G.carte = i;
  const p = profils.joueurs.get(j);
  $('#carte').innerHTML = carte({ split, equipe, j, profil: p, champions: G.champions, refus: refus(j, p) });
  montrer('#carte');
}

function fermer(id) {
  if ($(id).hidden) return false;
  $(id).hidden = true;
  majTete();
  return true;
}

/* Un split chargé, avec ses profils et son tempo, gardé pour la suite. */
async function lireSplit(id) {
  if (!G.splits.has(id)) {
    const split = await chargerSplit(id);
    G.splits.set(id, { split, profils: profilsDuSplit(split), tempo: tempoDuSplit(split) });
  }
  return G.splits.get(id);
}

async function tourner() {
  const l = libres();
  $('#roulette').disabled = true;
  $('#relancer').disabled = true;
  try {
    // On retire tant que le vestiaire n'a personne à signer : un rôle libre, sous le plafond.
    for (let essai = 0; essai < 20; essai++) {
      const { split, profils, tempo } = await lireSplit(piger(G.index.splits, G.de).id);
      const equipe = piger(split.equipes, G.de);
      if (equipe.joueurs.some(j => l.includes(j.r) && signable(profils.joueurs.get(j).cout, reste(), l.length))) {
        G.tirage = { split, equipe, profils, tempo };
        rendreVestiaire();
        return;
      }
    }
  } finally {
    $('#roulette').disabled = false;
    $('#relancer').disabled = false;
  }
}

function signer(i) {
  const { split, equipe, profils, tempo } = G.tirage;
  const j = equipe.joueurs[i];
  const p = j && profils.joueurs.get(j);
  if (!j || refus(j, p)) return;
  G.alignement[j.r] = { n: j.n, photo: j.photo, equipe: equipe.nom, split: split.nom, niveau: p.niveau, cout: p.cout, moteur: joueurDuMoteur(j, p), tempo };
  fermer('#carte');
  fermer('#vestiaire');
  rendreAlignement();
}

/* LE SPLIT. Les neuf adversaires sortent de la même roulette : un split, une équipe qui a ses cinq rôles. */
async function jouerLeSplit() {
  $('#jouer').disabled = true;
  try {
    const adversaires = [];
    const vus = new Set();
    for (let essai = 0; adversaires.length < ADVERSAIRES && essai < 200; essai++) {
      const { split, profils, tempo } = await lireSplit(piger(G.index.splits, G.de).id);
      const e = piger(split.equipes, G.de);
      const eq = vus.has(`${split.id}|${e.nom}`) ? null : equipeReelle(split, e, profils, tempo);
      if (!eq) continue;
      vus.add(`${split.id}|${e.nom}`);
      adversaires.push(eq);
    }
    const a = Object.keys(ROLES).map(r => G.alignement[r]);
    const toi = { nom: 'Ton cinq', split: null, cinq: Object.fromEntries(a.map(x => [x.moteur.r, x.moteur])), tempo: melangerTempos(a.map(x => x.tempo)) };
    G.ligue = creerSplit([toi, ...adversaires], { graine: Math.floor(G.de() * 2 ** 32), rondes: 2, bo: 1 });
    G.rogue = nouveauRogue(G.ligue.graine);
    $('#bati').hidden = true;
    rendreSplit();
  } finally {
    $('#jouer').disabled = false;
  }
}

function rendreSplit() {
  const L = G.ligue;
  const S = L.series;
  const saison = L.jour < L.journees.length;
  $('#split').hidden = false;
  $('#split-titre').textContent = titreSplit(L);
  $('#split-jour').innerHTML = tableauJour(L);
  $('#split-classement').innerHTML = tableauClassement(L);
  $('#jetons').textContent = resumeRogue(L, G.rogue);
  $('#journee').hidden = !saison;
  $('#jusqua').hidden = !saison;
  $('#ronde').hidden = saison || !!(S && S.champion !== null);
  $('#ronde').textContent = S ? 'Ronde suivante' : 'Lancer les séries';
  $('#nouveau').hidden = !(S && S.champion !== null);
  majTete();
}

/* Ta série de la prochaine journée, ou de la ronde des séries en cours ; null si tu n'y joues pas. */
function taSerie() {
  const L = G.ligue;
  const S = L.series;
  const lot = L.jour < L.journees.length ? L.journees[L.jour] : S && S.champion === null ? S.rondes[S.rondes.length - 1] : [];
  return lot.find(s => (s.a === 0 || s.b === 0) && s.gagnant === null) || null;
}

/* Joue ce qui vient avec ton plan de jeu ; ta série d'abord repêchée (automatiquement si `auto`). Faux si le repêchage s'ouvre. */
function jouerAvecToi(jouer, auto) {
  const L = G.ligue;
  const s = taSerie();
  if (s && !s.repechage) {
    if (auto) repecher(L, s, G.champions.classes);
    else { ouvrirRepechage(s); return false; }
  }
  L.equipes[0].effets = effetsDeToi(G.rogue);
  const r = jouer(L);
  if (s) noterJoue(G.rogue, 1);
  return r;
}

function avancer(jusquaFin) {
  const L = G.ligue;
  if (!L) return;
  G.apres = () => avancer(jusquaFin);
  if (jusquaFin) { while (L.jour < L.journees.length) jouerAvecToi(jouerJournee, true); }
  else if (!jouerAvecToi(jouerJournee, false)) return;
  rendreSplit();
}

function ronde() {
  const L = G.ligue;
  if (!L || L.jour < L.journees.length) return;
  G.apres = ronde;
  if (!L.series) creerSeries(L);
  else if (!jouerAvecToi(jouerRonde, false)) return;
  rendreSplit();
}

/* LE REPÊCHAGE de ta série : il s'ouvre, puis la série se joue avec lui. */
function ouvrirRepechage(s) {
  G.repechage = { s, d: nouveauRepechage(G.ligue, s) };
  rendreRepechage();
  montrer('#repechage');
}

function rendreRepechage() {
  $('#repechage').innerHTML = ecranRepechage(G.ligue, G.repechage.d, G.champions);
}

function toucherRepechage(ev) {
  const { s, d } = G.repechage || {};
  if (!d) return;
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.ban) { bannir(G.ligue, d, b.dataset.ban); rendreRepechage(); return; }
  if (b.dataset.role) { choisir(G.ligue, d, b.dataset.role, b.dataset.champ); rendreRepechage(); return; }
  if (b.id === 'repe-jouer') repecher(G.ligue, s, G.champions.classes, { mesBans: d.bans, mesChoix: d.choix });
  else if (b.id === 'repe-auto') repecher(G.ligue, s, G.champions.classes);
  else return;
  G.repechage = null;
  fermer('#repechage');
  G.apres();
}

/* LA BOUTIQUE : les packs, le plan de jeu, le coach. */
function ouvrirBoutique() {
  G.ouvertes = null;
  rendreBoutique();
  montrer('#boutique');
}

function rendreBoutique() {
  $('#boutique').innerHTML = boutique(G.ligue, G.rogue, G.ouvertes);
  $('#jetons').textContent = resumeRogue(G.ligue, G.rogue);
  majTete();
}

function toucherBoutique(ev) {
  const b = ev.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.pack) G.ouvertes = ouvrirPack(G.ligue, G.rogue, b.dataset.pack);
  else if (b.dataset.carte) basculer(G.rogue, b.dataset.carte);
  else if (b.dataset.coach) engager(G.ligue, G.rogue, b.dataset.coach);
  else return;
  rendreBoutique();
}

function ouvrirFeuille(cle) {
  const s = serieDe(G.ligue, cle);
  if (!s || s.gagnant === null) return;
  $('#feuille').innerHTML = feuilleSerie(G.ligue, s);
  montrer('#feuille');
}

function recommencer() {
  G.alignement = {};
  G.ligue = null;
  G.rogue = null;
  $('#split').hidden = true;
  $('#bati').hidden = false;
  rendreAlignement();
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
  $('#roulette').addEventListener('click', tourner);
  $('#relancer').addEventListener('click', tourner);
  $('#recommencer').addEventListener('click', recommencer);
  $('#nouveau').addEventListener('click', recommencer);
  $('#jouer').addEventListener('click', jouerLeSplit);
  $('#journee').addEventListener('click', () => avancer(false));
  $('#jusqua').addEventListener('click', () => avancer(true));
  $('#ronde').addEventListener('click', ronde);
  $('#ouvrir-boutique').addEventListener('click', ouvrirBoutique);
  $('#boutique').addEventListener('click', toucherBoutique);
  $('#repechage').addEventListener('click', toucherRepechage);
  const voirSerie = ev => {
    const li = ev.target.closest('[data-serie]');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirFeuille(li.dataset.serie);
  };
  $('#split-jour').addEventListener('click', voirSerie);
  $('#split-jour').addEventListener('keydown', voirSerie);
  const choisir = ev => {
    const b = ev.target.closest('[data-signer]');
    if (b) { if (ev.type === 'click') signer(Number(b.dataset.signer)); return; }
    const li = ev.target.closest('.joueur');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirCarte(Number(li.dataset.i));
  };
  $('#vestiaire-liste').addEventListener('click', choisir);
  $('#vestiaire-liste').addEventListener('keydown', choisir);
  $('#carte').addEventListener('click', ev => { if (ev.target.closest('.signer-carte')) signer(G.carte); });
  brancherRetour([() => fermer('#feuille'), () => fermer('#repechage'), () => fermer('#boutique'), () => fermer('#carte'), () => fermer('#vestiaire')]);
  rendreAlignement();
}

demarrer().catch(err => { $('#etat').textContent = `Erreur : ${err.message}`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
