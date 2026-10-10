/*
 * LE CONTRÔLEUR. La boucle du repêchage, sans plafond encore : la roulette
 * sort un split et une équipe, tu ouvres la carte d'un joueur de ce vestiaire
 * et tu le signes pour un rôle libre, jusqu'à cinq. Puis le split : ton cinq
 * contre neuf vrais vestiaires tirés par la même roulette, joué une journée à
 * la fois (js/sim.js), puis les séries.
 * Ce qui s'affiche est le niveau, les badges ou une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit, chargerChampions } from './data.js';
import { hasard, piger } from './hasard.js';
import { esc } from './util.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit } from './cotes.js';
import { ROLES, badge, vignette, icones, carte } from './fiche.js';
import { tempoDuSplit, joueurDuMoteur, equipeReelle, melangerTempos, creerSplit, jouerJournee, creerSeries, jouerRonde } from './sim.js';
import { titreSplit, tableauJour, tableauClassement, serieDe, feuilleSerie } from './split.js';

const $ = s => document.querySelector(s);

const G = { index: null, champions: null, de: null, tirage: null, alignement: {}, ligue: null, splits: new Map() };
const ADVERSAIRES = 9;

function rendreAlignement() {
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = G.alignement[r];
    return `<li class="case${j ? ' pleine' : ''}">${j ? vignette(j) : ''}<span class="role">${mot}</span><span class="qui">${j ? `${esc(j.n)} <small>${esc(j.equipe)} · ${esc(j.split)}</small>` : '—'}</span></li>`;
  }).join('');
  const complet = Object.keys(ROLES).every(r => G.alignement[r]);
  $('#roulette').hidden = complet;
  $('#jouer').hidden = !complet;
  $('#recommencer').hidden = !Object.keys(G.alignement).length;
  $('#etat').textContent = complet ? 'Alignement complet.' : '';
}

function rendreVestiaire() {
  const { split, equipe, profils } = G.tirage;
  $('#vestiaire-titre').textContent = `${equipe.nom} · ${split.nom}`;
  $('#vestiaire-fiche').textContent = `${equipe.v}-${equipe.d} en parties · touche un joueur pour sa carte`;
  $('#vestiaire-liste').innerHTML = equipe.joueurs.map((j, i) => {
    const p = profils.joueurs.get(j);
    return `<li class="joueur${G.alignement[j.r] ? ' pris' : ''}" data-i="${i}" tabindex="0">
      ${vignette(j)}
      <span class="joueur-id"><b>${esc(j.n)}</b><small>${ROLES[j.r]} · ${p.niveau}</small><span>${p.badges.map(badge).join('')}</span></span>
      <span class="joueur-champs">${icones(G.champions, j)}</span></li>`;
  }).join('');
  $('#vestiaire').hidden = false;
}

function ouvrirCarte(i) {
  const { split, equipe, profils } = G.tirage;
  const j = equipe.joueurs[i];
  if (!j) return;
  G.carte = i;
  $('#carte').innerHTML = `<button class="retour" data-retour>‹ Retour</button>${carte({ split, equipe, j, profil: profils.joueurs.get(j), champions: G.champions, pris: !!G.alignement[j.r] })}`;
  $('#carte').hidden = false;
}

function fermer(id) {
  if ($(id).hidden) return false;
  $(id).hidden = true;
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
  const libres = Object.keys(ROLES).filter(r => !G.alignement[r]);
  $('#roulette').disabled = true;
  try {
    // On retire tant que le vestiaire n'a personne pour un rôle libre.
    for (let essai = 0; essai < 20; essai++) {
      const { split, profils, tempo } = await lireSplit(piger(G.index.splits, G.de).id);
      const equipe = piger(split.equipes, G.de);
      if (equipe.joueurs.some(j => libres.includes(j.r))) {
        G.tirage = { split, equipe, profils, tempo };
        rendreVestiaire();
        return;
      }
    }
  } finally {
    $('#roulette').disabled = false;
  }
}

function signer() {
  const { split, equipe, profils, tempo } = G.tirage;
  const j = equipe.joueurs[G.carte];
  if (!j || G.alignement[j.r]) return;
  G.alignement[j.r] = { n: j.n, photo: j.photo, equipe: equipe.nom, split: split.nom, moteur: joueurDuMoteur(j, profils.joueurs.get(j)), tempo };
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
  $('#journee').hidden = !saison;
  $('#jusqua').hidden = !saison;
  $('#ronde').hidden = saison || !!(S && S.champion !== null);
  $('#ronde').textContent = S ? 'Ronde suivante' : 'Lancer les séries';
  $('#nouveau').hidden = !(S && S.champion !== null);
}

function avancer(jusquaFin) {
  const L = G.ligue;
  if (!L) return;
  if (jusquaFin) while (jouerJournee(L));
  else jouerJournee(L);
  rendreSplit();
}

function ronde() {
  const L = G.ligue;
  if (!L || L.jour < L.journees.length) return;
  if (!L.series) creerSeries(L);
  else jouerRonde(L);
  rendreSplit();
}

function ouvrirFeuille(cle) {
  const s = serieDe(G.ligue, cle);
  if (!s || s.gagnant === null) return;
  $('#feuille').innerHTML = `<button class="retour" data-retour>‹ Retour</button>${feuilleSerie(G.ligue, s)}`;
  $('#feuille').hidden = false;
}

function recommencer() {
  G.alignement = {};
  G.ligue = null;
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
  $('#recommencer').addEventListener('click', recommencer);
  $('#nouveau').addEventListener('click', recommencer);
  $('#jouer').addEventListener('click', jouerLeSplit);
  $('#journee').addEventListener('click', () => avancer(false));
  $('#jusqua').addEventListener('click', () => avancer(true));
  $('#ronde').addEventListener('click', ronde);
  const voirSerie = ev => {
    const li = ev.target.closest('[data-serie]');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirFeuille(li.dataset.serie);
  };
  $('#split-jour').addEventListener('click', voirSerie);
  $('#split-jour').addEventListener('keydown', voirSerie);
  const choisir = ev => {
    const li = ev.target.closest('.joueur');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirCarte(Number(li.dataset.i));
  };
  $('#vestiaire-liste').addEventListener('click', choisir);
  $('#vestiaire-liste').addEventListener('keydown', choisir);
  $('#carte').addEventListener('click', ev => { if (ev.target.closest('.signer-carte')) signer(); });
  brancherRetour([() => fermer('#feuille'), () => fermer('#carte'), () => fermer('#vestiaire')]);
  rendreAlignement();
}

demarrer().catch(err => { $('#etat').textContent = `Erreur : ${err.message}`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
