/*
 * LE DÉPART D'UNE RUN DE ROGUE, À L'ÉCRAN (repris de Cap 82-0, js/depart.js).
 * Une case à la fois : ton joueur de concession, les cases du classeur (un
 * loto de trois cartes de ta collection, par niveau), ceux qui restent entre
 * deux splits ; tu prends une carte, ou aucune. Puis le pack de départ, qui
 * comble les rôles vides de bouche-trous (js/gestion.js). La même rangée que
 * le vestiaire du 18-0, partout où l'on prend un joueur.
 *
 * Rien que du HTML tiré de la partie (js/partie.js) ; le contrôleur tire et
 * applique. Aucune cote : le niveau, le coût, le split.
 */
import { esc, pts } from './util.js';
import { ROLES, vignette, coutHtml } from './fiche.js';
import { masseDe, plafondDe, libresDe } from './gestion.js';
import { signable } from './cotes.js';
import { casesDe, LOTO } from './partie.js';

/* Ce que chaque sorte de case dit : son icône, son titre, sa phrase. */
const CASES = {
  vedette: ['★', 'Ton joueur de concession', 'Il revient au départ de chaque run, à sa place sous le plafond.'],
  col: ['📒', 'Le classeur', `Un loto de ${LOTO} cartes de ta collection, à ce niveau ou en dessous : tu en gardes une, ou aucune.`],
  restes: ['🤝', 'Ceux qui restent', `Un loto parmi ton effectif du split fini, à ce niveau ou en dessous : tu en gardes un, ou personne. Un joueur qui a joué un split réel plus récent y vieillit.`],
};

/* Pourquoi une carte du loto ne se prend pas (null : elle se prend). */
function refus(P, c) {
  if (!c) return 'Introuvable';
  if (P.eff.cinq[c.r]) return `${ROLES[c.r]} comblé`;
  return signable(c.cout, plafondDe(P.eff) - masseDe(P.eff), libresDe(P.eff).length) ? null : 'Trop cher';
}

/* Une rangée de joueur, la même qu'au vestiaire : la photo, le nom, son rôle et son niveau, son split, son coût, et le geste. */
export const rangee = (c, bouton = '', extra = '') => `<li class="joueur agent">${vignette(c)}<span class="joueur-id"><b>${esc(c.n)}</b><small>${ROLES[c.r]} · ${esc(c.niveau)}</small><small>${esc(c.equipe)} · ${esc(c.split)}</small>${extra}</span>${coutHtml(c.cout)}${bouton}</li>`;

/**
 * LA CASE EN COURS : son loto en rangées, « Prendre » sur chacune (ou pourquoi
 * pas), et « Personne ». `c` : caseEnCours(P) ; `contrats` : Map(clé → contrat,
 * ou null) ; `vieux` : Map(clé → la version qui vieillit).
 */
export function ecranCase(P, c, contrats, vieux = new Map()) {
  const [ico, titre, phrase] = CASES[c.source];
  const n = casesDe(P).length;
  const lignes = c.loto.map(({ cle }) => {
    const x = contrats.get(cle) || null;
    if (!x) return `<li class="joueur agent"><span class="joueur-id"><b>${esc(cle.split('|')[2])}</b><small>Introuvable : ses splits ont changé</small></span></li>`;
    const v = vieux.get(cle);
    const non = refus(P, v || x);
    const age = v ? `<small class="vieillit">Vieillit : ${esc(v.split)} · ${esc(v.niveau)} · ${pts(v.cout)}</small>` : '';
    return rangee(x, `<button class="signer" data-case-prendre="${esc(cle)}"${non ? ' disabled' : ''}>${non || 'Prendre'}</button>`, age);
  }).join('');
  return `<h3>${ico} ${esc(titre)} · case ${c.k + 1} sur ${n}${c.niveau ? ` · ${esc(c.niveau)}` : ''}</h3>
    <p class="sous">${esc(phrase)}</p>
    ${lignes ? `<ul class="liste-joueurs">${lignes}</ul>` : '<p class="sous">Rien à ce niveau ni en dessous : la case passe.</p>'}
    <div class="puces"><button class="puce" data-case-passer>${c.source === 'vedette' ? 'Sans lui' : 'Personne'}</button></div>`;
}

/** Entre les cases et le pack : ce que le pack de départ va combler. */
export function avantLePack(P) {
  const l = libresDe(P.eff);
  return `<h3>🧰 Le pack de départ</h3>
    <p class="sous">Tes cases sont faites. Le pack comble ${l.map(r => ROLES[r]).join(', ')} de bouche-trous : des Remplaçants et de bas Réguliers de splits tirés au hasard. Chaque carte va à ton effectif et à ta collection.${P.fx.bouchetrous ? ' Des bouche-trous moins pires : ils sortent un cran plus haut.' : ''}</p>`;
}

/** LE PACK OUVERT : les bouche-trous qui viennent d'entrer. `contrats` : leurs contrats. */
export function ecranPack(contrats) {
  return `<h3>🧰 Le pack de départ · ${contrats.length} bouche-trou${contrats.length > 1 ? 's' : ''}</h3>
    <p class="sous">Ils font le cinq avec tes cartes. Le marché, les packs de joueurs et les lotos d'un split à l'autre feront le reste.</p>
    <ul class="liste-joueurs">${contrats.map(c => rangee(c)).join('')}</ul>`;
}

/** TON JOUEUR DE CONCESSION, au départ de la première run : trois étoiles, tu en prends une. `etoiles` : [{ cle, c }] (null : on cherche). */
export function choixDeVedette(etoiles) {
  if (!etoiles) return '<p class="sous">Le dépisteur cherche trois étoiles…</p>';
  return `<ul class="liste-joueurs">${etoiles.map(({ cle, c }) => rangee(c, `<button class="signer" data-vedette="${esc(cle)}">Prendre</button>`)).join('')}</ul>`;
}

/**
 * L'EXHIBITION : deux vrais vestiaires, une partie en direct, rien de compté.
 * `equipes` : [{ nom, split, logo }] × 2 (null : on cherche).
 */
export function ecranExhibition(equipes) {
  const cote = (e, k) => `<li class="case pleine"><span class="case-role">${k ? 'Rouge' : 'Bleu'}</span><span class="qui"><b>${esc(e.nom)}</b><small>${esc(e.split)}</small></span></li>`;
  return `<h2>L'exhibition</h2>
    <p class="sous">Deux vrais vestiaires, de n'importe quelle époque, une partie en direct. Rien n'est compté.</p>
    ${equipes ? `<ol class="alignement">${equipes.map(cote).join('')}</ol>` : '<p class="sous">La roulette tourne…</p>'}
    <div class="actionbar"><button id="exhib-jouer" class="go"${equipes ? '' : ' disabled'}>▶ Jouer en direct</button><button id="exhib-autres"${equipes ? '' : ' disabled'}>Autres équipes</button></div>`;
}
