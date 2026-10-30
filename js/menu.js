/*
 * L'ÉCRAN TITRE, LE MENU, LES PARTIES, LE DÉPART D'UNE RUN (repris de Cap
 * 82-0, js/menu.js). Rien que du HTML tiré du méta (js/meta.js) et de
 * l'index des parties (js/sauvegardes.js) ; le contrôleur branche les gestes.
 *
 *   le titre    Continuer (s'il y a une partie), Nouvelle run, puis tes
 *               médailles, ta collection, le palmarès, les parties, les règles ;
 *   le menu     la même chose en pleine partie, avec « Quitter vers le titre » ;
 *   les parties chacune se reprend, s'exporte en fichier, s'efface ; un fichier
 *               s'importe ;
 *   le départ   le mode (le Rogue, le 18-0), ton coach et ton joueur de
 *               concession au Rogue, ton club, ta couleur, tes déblocages,
 *               puis « Commencer ».
 */
import { esc } from './util.js';
import { medailles, rangDe, DEBLOCAGES, CLUBS, COULEURS, EXIGENCES, PRIME_EXIGENCE, MODES, deblocagesDe, possede, exigenceMax, exigenceDe, coachDe, modeDe, vedetteDe } from './meta.js';
import { COACHS } from './rogue.js';
import { carteDuCoach } from './boutique.js';
import { choixDeVedette, rangee } from './depart.js';

const date = ms => new Date(ms).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/* Les liens communs au titre et au menu. */
const liens = sons => `<ul class="menu-liens">
  <li><button data-ouvrir="deblocages">🏅 Déblocages et ton club</button></li>
  <li><button data-ouvrir="collection">🃏 Ta collection</button></li>
  <li><button data-ouvrir="palmares">🏆 Le palmarès</button></li>
  <li><button data-ouvrir="parties">💾 Les parties</button></li>
  <li><button data-ouvrir="regles">📖 Les règles</button></li>
  <li><button data-sons>${sons ? '🔊 Sons : oui' : '🔇 Sons : non'}</button></li>
</ul>`;

/* Tes médailles et ton rang, en une ligne. */
function ligneRang(m) {
  const md = medailles(m);
  const r = rangDe(m);
  return `<p class="titre-rang">🏅 <b>${md.reste}</b> à dépenser · ${esc(r.nom)}${r.suivant ? ` · ${esc(r.suivant.nom)} dans ${r.suivant.manque}` : ''}</p>`;
}

/** L'écran titre. `active` : l'entrée de la partie active (js/sauvegardes.js), ou null. */
export function ecranTitre(m, active, sons) {
  return `<div class="titre">
    <p class="titre-sur">Le jeu de gestion des splits</p>
    <h1 class="titre-nom">Faille</h1>
    ${ligneRang(m)}
    <div class="titre-actions">
      ${active ? `<button id="t-continuer" class="go titre-continuer"><span>Continuer</span><small>${esc(active.titre)}${active.resume ? ` · ${esc(active.resume)}` : ''}</small></button>` : ''}
      <button id="t-nouvelle"${active ? '' : ' class="go"'}>Nouvelle partie</button>
      <button id="t-exhibition">Exhibition</button>
    </div>
    ${liens(sons)}
  </div>`;
}

/** Le menu, en pleine partie. */
export function ecranMenu(m, sons) {
  return `<h2>Menu</h2>${ligneRang(m)}
    <ul class="menu-liens"><li><button class="go" data-retour>Reprendre la partie</button></li></ul>
    ${liens(sons)}
    <ul class="menu-liens"><li><button id="m-titre">Quitter vers le titre</button></li></ul>
    <p class="sous">Ta partie se garde à chaque geste : tu la retrouves au titre, sous « Continuer ».</p>`;
}

/** Les parties sauvegardées. `ix` : l'index (js/sauvegardes.js). */
export function ecranParties(ix) {
  const lignes = [...ix.parties].sort((a, b) => b.maj - a.maj).map(p => `<li class="partie-ligne${p.id === ix.actif ? ' actif' : ''}">
    <span class="jeu-id"><b>${esc(p.titre)}</b><small>${p.resume ? `${esc(p.resume)} · ` : ''}${date(p.maj)}</small></span>
    <span class="partie-gestes"><button data-reprendre="${esc(p.id)}">Reprendre</button><button data-exporter="${esc(p.id)}">Exporter</button><button data-supprimer="${esc(p.id)}">Effacer</button></span></li>`).join('');
  return `<h2>Les parties</h2>
    ${lignes ? `<ul class="parties">${lignes}</ul>` : '<p class="sous">Aucune partie : commence une run au titre.</p>'}
    <h3>D'un autre appareil</h3>
    <p class="sous">Une partie exportée est un petit fichier : elle se rejoue de sa graine, geste par geste.</p>
    <label class="bouton-fichier">Importer un fichier<input type="file" id="importer" accept=".json,application/json"></label>`;
}

/**
 * Le départ d'une partie : le mode ; au Rogue, ton coach, ton joueur de
 * concession (`etoiles` : les trois offertes à la première run, ou sa carte
 * déjà choisie, `vedette` : son contrat), tes déblocages, tes exigences ; dans
 * les deux, ton club et ta couleur.
 */
export function ecranDepart(m, { etoiles = null, vedette = null } = {}) {
  const mode = modeDe(m);
  const modes = Object.entries(MODES).map(([id, x]) => `<button class="puce${mode === id ? ' on' : ''}" data-mode="${id}">${esc(x.nom)}</button>`).join('');
  const coachs = Object.keys(COACHS).map(id => `<li><button class="coach-choix${coachDe(m) === id ? ' on' : ''}" data-coach-choisi="${id}">${carteDuCoach(id)}</button></li>`).join('');
  const club = Object.entries(CLUBS).filter(([id]) => possede(m, 'club', id)).map(([id, c]) => `<button class="puce${m.club === id ? ' on' : ''}" data-porter="club:${id}">${esc(c.nom)}</button>`).join('');
  const couleur = Object.entries(COULEURS).filter(([id]) => possede(m, 'couleur', id)).map(([id, c]) => `<button class="puce${m.couleur === id ? ' on' : ''}" data-porter="couleur:${id}"><span class="pastille" style="--pastille:${c.hex}"></span>${esc(c.nom)}</button>`).join('');
  const deb = deblocagesDe(m).map(id => `<li class="trophee"><span class="jeu-ico">${DEBLOCAGES[id].ico}</span><span class="jeu-id"><b>${esc(DEBLOCAGES[id].nom)}</b><small>${esc(DEBLOCAGES[id].mot)}</small></span></li>`).join('');
  const max = exigenceMax(m);
  const cran = exigenceDe(m);
  const exig = max ? `<h3>Les exigences 🔺</h3>
    <div class="puces">${Array.from({ length: max + 1 }, (_, n) => `<button class="puce${cran === n ? ' on' : ''}" data-exigence="${n}">${n ? `🔺 ${n}` : 'Aucune'}</button>`).join('')}</div>
    <p class="sous">${cran ? `${EXIGENCES.slice(0, cran).map(x => `${esc(x.nom)} : ${esc(x.mot)}`).join(' · ')}. Tes médailles valent ${Math.round(100 * PRIME_EXIGENCE * cran)} % de plus.` : 'Gagne une run à un cran pour ouvrir le suivant.'}</p>` : '';
  const concession = vedetteDe(m)
    ? `<p class="sous">Il revient au départ de chaque run.</p>${vedette ? `<ul class="liste-joueurs">${rangee(vedette)}</ul>` : ''}`
    : `<p class="sous">Trois ★ Étoiles de splits tirés au hasard : prends-en une. Elle ouvre chaque run, à sa place sous le plafond, et ne se change plus.</p>${choixDeVedette(etoiles)}`;
  const rogue = `<h3>Ton coach</h3>
    <p class="sous">Il fait la run au complet. Il gagne de l'expérience avec tes victoires — plus encore à sa couleur — et ouvre ses pouvoirs aux niveaux 1, 3 et 5 ; aux niveaux 2 et 4, un talent fait grandir celui que tu choisis.</p>
    <ul class="coachs bande-cartes">${coachs}</ul>
    <h3>★ Ton joueur de concession</h3>${concession}
    <h3>Tes déblocages</h3>${deb ? `<ul class="trophees">${deb}</ul>` : '<p class="sous">Aucun encore : tes médailles en achètent, au menu.</p>'}
    ${exig}`;
  return `<h2>Une nouvelle partie</h2>
    <div class="puces">${modes}</div>
    <p class="sous">${esc(MODES[mode].mot)}${mode === 'rogue' ? ' Ton cinq part de tes cases — ta vedette, ton classeur — et d\'un pack de bouche-trous ; un titre gagne la run.' : ' Il compte à ta collection, pas à tes médailles.'}</p>
    ${mode === 'rogue' ? rogue : ''}
    <h3>Ton club</h3><div class="puces">${club}</div>
    <h3>Ta couleur</h3><div class="puces">${couleur}</div>
    <div class="actionbar"><button id="d-commencer" class="go"${mode === 'rogue' && !vedetteDe(m) ? ' disabled' : ''}>${mode === 'rogue' ? 'Commencer la run' : 'Jouer le 18-0'}</button></div>`;
}
