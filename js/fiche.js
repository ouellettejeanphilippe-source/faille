/*
 * LA CARTE D'UN JOUEUR. Son habillage suit l'époque de son split, inspiré de
 * ce que LoL montrait alors (le client et les sites de chaque saison) :
 *
 *   2011-2013  le client d'origine : bleu acier, cadre argenté, reflets
 *   2014-2016  le client des saisons 4 à 6 : bleu nuit, filet doré, coins taillés
 *   2017-2022  le client hextech : noir bleuté, or et cyan, losanges
 *   2023 →     les sites de l'esport : noir, blanc, gros caractères
 *
 * Inspiré, jamais copié : aucune police, aucun logo, aucun élément d'interface
 * de Riot n'est repris, seulement l'esprit de chaque époque (CLAUDE.md).
 * Aucune cote ici : le niveau, les badges, les vraies stats.
 */
import { esc, virgule } from './util.js';
import { imageLP, iconeChampion, illustration } from './images.js';

const ERES = [[2023, 'ere-esport'], [2017, 'ere-hextech'], [2014, 'ere-saison4'], [0, 'ere-origine']];
export const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };

const ere = annee => ERES.find(([a]) => annee >= a)[1];
const initiales = n => esc(String(n).replace(/\s*\(.*\)$/, '').slice(0, 2).toUpperCase());
const parMin = (t, dec = 1) => (t && t[1] ? virgule(t[0] / t[2], dec) : null);
export const badge = b => `<span class="badge pal-${b.palier.toLowerCase()}">${b.ico} ${esc(b.nom)} ${b.palier}</span>`;

/** La petite photo d'une ligne du vestiaire. */
export const vignette = j => `<span class="vignette">${initiales(j.n)}${j.photo ? `<img src="${imageLP(j.photo)}" alt="" loading="lazy">` : ''}</span>`;

/** Les icônes de champions d'une ligne (les trois plus joués). */
export const icones = (champions, j, n = 3) => j.champs.slice(0, n).map(([c]) => {
  const src = iconeChampion(champions, c);
  return src ? `<img class="ico-champ" src="${src}" alt="${esc(c)}" title="${esc(c)}" loading="lazy">` : `<span class="ico-champ">${esc(c.slice(0, 2))}</span>`;
}).join('');

/** La carte entière. `pris` : le rôle est déjà comblé dans l'alignement. */
export function carte({ split, equipe, j, profil, champions, pris }) {
  const fond = illustration(champions, j.champs[0] && j.champs[0][0]);
  const stats = [
    ['Parties', `${j.pj} (${j.v}-${j.pj - j.v})`],
    ['KDA', virgule((j.k + j.a) / Math.max(1, j.m), 1)],
    ['CS/min', parMin(j.cs)],
    ['Or/min', parMin(j.or, 0)],
    ['Dégâts/min', parMin(j.deg, 0)],
    ['Vision/min', parMin(j.vision, 2)],
  ].filter(([, v]) => v !== null);
  const bassin = j.champs.map(([c, pj, v]) => {
    const src = iconeChampion(champions, c);
    return `<li>${src ? `<img src="${src}" alt="" loading="lazy">` : '<span class="ico-vide"></span>'}<b>${esc(c)}</b><small>${pj} · ${v}-${pj - v}</small></li>`;
  }).join('');
  return `<article class="carte ${ere(split.annee)}">
    <header class="carte-tete"${fond ? ` style="--illus:url('${fond}')"` : ''}>
      ${equipe.logo ? `<img class="carte-logo" src="${imageLP(equipe.logo)}" alt="">` : ''}
      <span class="carte-split">${esc(equipe.nom)} · ${esc(split.nom)}</span>
    </header>
    <div class="carte-corps">
      <div class="carte-photo">${initiales(j.n)}${j.photo ? `<img src="${imageLP(j.photo)}" alt="">` : ''}</div>
      <div class="carte-id">
        <h3>${esc(j.n)}</h3>
        <p>${ROLES[j.r]} · <b>${profil.niveau}</b></p>
        <p>${profil.badges.map(badge).join('')}</p>
      </div>
    </div>
    <dl class="carte-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <h4>Bassin de champions</h4>
    <ul class="bassin">${bassin}</ul>
    <button class="principal signer-carte"${pris ? ' disabled' : ''}>${pris ? `${ROLES[j.r]} déjà comblé` : 'Signer'}</button>
  </article>`;
}
