/*
 * LE CONTRÔLEUR (jalon 0). La boucle du repêchage, sans cotes ni plafond
 * encore : la roulette sort un split et une équipe, tu piges un joueur dans
 * ce vestiaire pour un rôle libre, et tu recommences jusqu'à cinq.
 * Ce qui s'affiche est une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit } from './data.js';
import { hasard, piger } from './hasard.js';
import { esc, virgule } from './util.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit } from './cotes.js';

const ROLES = [['haut', 'Haut'], ['jungle', 'Jungle'], ['milieu', 'Milieu'], ['bas', 'Bas'], ['soutien', 'Soutien']];
const $ = s => document.querySelector(s);

const G = { index: null, de: null, tirage: null, alignement: {} };

const kda = j => virgule((j.k + j.a) / Math.max(1, j.m));
/* Une stat par minute, ou un tiret quand l'époque ne la mesurait pas. */
const parMin = (t, dec) => (t && t[1] ? virgule(t[0] / t[2], dec) : '—');
const badge = b => `<span class="badge pal-${b.palier.toLowerCase()}">${b.ico} ${esc(b.nom)} ${b.palier}</span>`;
const fiche = (v, d) => `${v}-${d}`;

function rendreAlignement() {
  $('#alignement').innerHTML = ROLES.map(([r, mot]) => {
    const j = G.alignement[r];
    return `<li class="case${j ? ' pleine' : ''}"><span class="role">${mot}</span><span class="qui">${j ? `${esc(j.n)} <small>${esc(j.equipe)} · ${esc(j.split)}</small>` : '—'}</span></li>`;
  }).join('');
  const complet = ROLES.every(([r]) => G.alignement[r]);
  $('#roulette').hidden = complet;
  $('#recommencer').hidden = !complet;
  $('#etat').textContent = complet ? 'Alignement complet. La simulation du split arrive au jalon 2.' : '';
}

function rendreVestiaire() {
  const { split, equipe, profils } = G.tirage;
  $('#vestiaire-titre').textContent = `${equipe.nom} · ${split.nom}`;
  $('#vestiaire-fiche').textContent = `${fiche(equipe.v, equipe.d)} en parties`;
  $('#vestiaire-liste').innerHTML = equipe.joueurs.map((j, i) => {
    const pris = !!G.alignement[j.r];
    const p = profils.joueurs.get(j);
    return `<tr class="${pris ? 'pris' : ''}" data-i="${i}">
      <td>${ROLES.find(([r]) => r === j.r)[1]}</td><td class="nom">${esc(j.n)}</td><td>${p.niveau}</td>
      <td>${p.badges.map(badge).join('')}</td>
      <td>${j.pj}</td><td>${kda(j)}</td><td>${parMin(j.cs, 1)}</td><td>${parMin(j.deg, 0)}</td>
      <td class="champs">${j.champs.slice(0, 3).map(c => esc(c[0])).join(', ')}</td>
      <td><button class="signer" data-i="${i}"${pris ? ' disabled' : ''}>Signer</button></td></tr>`;
  }).join('');
  $('#vestiaire').hidden = false;
}

function fermerVestiaire() {
  if ($('#vestiaire').hidden) return false;
  $('#vestiaire').hidden = true;
  return true;
}

async function tourner() {
  const libres = ROLES.map(([r]) => r).filter(r => !G.alignement[r]);
  $('#roulette').disabled = true;
  try {
    // On retire tant que le vestiaire n'a personne pour un rôle libre.
    for (let essai = 0; essai < 20; essai++) {
      const split = await chargerSplit(piger(G.index.splits, G.de).id);
      const equipe = piger(split.equipes, G.de);
      if (equipe.joueurs.some(j => libres.includes(j.r))) {
        G.tirage = { split, equipe, profils: profilsDuSplit(split) };
        rendreVestiaire();
        return;
      }
    }
  } finally {
    $('#roulette').disabled = false;
  }
}

function signer(i) {
  const { split, equipe } = G.tirage;
  const j = equipe.joueurs[i];
  if (!j || G.alignement[j.r]) return;
  G.alignement[j.r] = { n: j.n, equipe: equipe.nom, split: split.nom };
  fermerVestiaire();
  rendreAlignement();
}

async function demarrer() {
  G.de = hasard(Date.now());
  G.index = await chargerIndex();
  $('#source').textContent = `Données : ${G.index.source}.`;
  if (!G.index.splits.length) {
    $('#etat').textContent = 'Aucun split bâti : lance scripts/build_splits.mjs.';
    $('#roulette').hidden = true;
    return;
  }
  $('#roulette').addEventListener('click', tourner);
  $('#recommencer').addEventListener('click', () => { G.alignement = {}; rendreAlignement(); });
  $('#vestiaire-liste').addEventListener('click', ev => {
    const b = ev.target.closest('.signer');
    if (b) signer(Number(b.dataset.i));
  });
  brancherRetour([fermerVestiaire]);
  rendreAlignement();
}

demarrer().catch(err => { $('#etat').textContent = `Erreur : ${err.message}`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
