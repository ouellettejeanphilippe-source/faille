/*
 * LE CONTRÔLEUR. La boucle du repêchage, sans plafond encore : la roulette
 * sort un split et une équipe, tu ouvres la carte d'un joueur de ce vestiaire
 * et tu le signes pour un rôle libre, jusqu'à cinq.
 * Ce qui s'affiche est le niveau, les badges ou une vraie stat, jamais une cote.
 */
import { chargerIndex, chargerSplit, chargerChampions } from './data.js';
import { hasard, piger } from './hasard.js';
import { esc } from './util.js';
import { brancherRetour } from './pile.js';
import { profilsDuSplit } from './cotes.js';
import { ROLES, badge, vignette, icones, carte } from './fiche.js';

const $ = s => document.querySelector(s);

const G = { index: null, champions: null, de: null, tirage: null, alignement: {} };

function rendreAlignement() {
  $('#alignement').innerHTML = Object.entries(ROLES).map(([r, mot]) => {
    const j = G.alignement[r];
    return `<li class="case${j ? ' pleine' : ''}">${j ? vignette(j) : ''}<span class="role">${mot}</span><span class="qui">${j ? `${esc(j.n)} <small>${esc(j.equipe)} · ${esc(j.split)}</small>` : '—'}</span></li>`;
  }).join('');
  const complet = Object.keys(ROLES).every(r => G.alignement[r]);
  $('#roulette').hidden = complet;
  $('#recommencer').hidden = !complet;
  $('#etat').textContent = complet ? 'Alignement complet. La simulation du split arrive au jalon 2.' : '';
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

async function tourner() {
  const libres = Object.keys(ROLES).filter(r => !G.alignement[r]);
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

function signer() {
  const { split, equipe } = G.tirage;
  const j = equipe.joueurs[G.carte];
  if (!j || G.alignement[j.r]) return;
  G.alignement[j.r] = { n: j.n, photo: j.photo, equipe: equipe.nom, split: split.nom };
  fermer('#carte');
  fermer('#vestiaire');
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
  $('#recommencer').addEventListener('click', () => { G.alignement = {}; rendreAlignement(); });
  const choisir = ev => {
    const li = ev.target.closest('.joueur');
    if (li && (ev.type === 'click' || ev.key === 'Enter')) ouvrirCarte(Number(li.dataset.i));
  };
  $('#vestiaire-liste').addEventListener('click', choisir);
  $('#vestiaire-liste').addEventListener('keydown', choisir);
  $('#carte').addEventListener('click', ev => { if (ev.target.closest('.signer-carte')) signer(); });
  brancherRetour([() => fermer('#carte'), () => fermer('#vestiaire')]);
  rendreAlignement();
}

demarrer().catch(err => { $('#etat').textContent = `Erreur : ${err.message}`; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
