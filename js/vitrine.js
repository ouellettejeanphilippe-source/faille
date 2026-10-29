/*
 * LA VITRINE : ce qui reste d'une run à l'autre (js/meta.js), à l'écran.
 *
 *   les déblocages  ce que tes médailles achètent, ton club et ses couleurs ;
 *   le palmarès     le panthéon (tes records), les trophées de tes joueurs, tes runs ;
 *   la collection   chaque joueur passé chez toi, split par split, avec sa
 *                   finition (ses copies) et ses galons ; un split s'ouvre en
 *                   album, équipe par équipe.
 *
 * Rien que du HTML ; aucune cote : le niveau, les vraies stats, les galons.
 */
import { esc } from './util.js';
import { medailles, rangDe, DEBLOCAGES, CLUBS, COULEURS, MEDAILLES, RANGS, refusAchat, possede, collectionDe, finitionDe, runsDe, pantheonDe } from './meta.js';
import { RECORDS, TROPHEES, GALONS } from './palmares.js';
import { ROLES, vignette } from './fiche.js';
import { imageLP } from './images.js';

const FINS = { gagnee: 'Gagnée', perdue: 'Perdue' };
const date = ms => new Date(ms).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });

/* Un article à acheter : un déblocage, un club, une couleur. */
function article(m, genre, id, a, extra = '') {
  const cle = `${genre}:${id}`;
  const a_toi = possede(m, genre, id);
  const refus = a_toi ? null : refusAchat(m, cle);
  const porte = genre !== 'deb' && m[genre] === id;
  const bouton = a_toi
    ? genre === 'deb' ? '<span class="prix acquis">Débloqué</span>' : `<button class="mini${porte ? ' on' : ''}" data-porter="${cle}"${porte ? ' disabled' : ''}>${porte ? 'Porté' : 'Porter'}</button>`
    : `<button class="mini" data-acheter="${cle}"${refus ? ' disabled' : ''}>${refus || `${a.prix} 🏅`}</button>`;
  return `<li class="article${a_toi ? ' acquis' : ''}">${extra}<span class="jeu-id"><b>${a.ico ? `${a.ico} ` : ''}${esc(a.nom)}</b>${a.mot ? `<small>${esc(a.mot)}</small>` : ''}${a.code ? `<small>${a.code} · rang ${esc(RANGS[a.rang][1])}</small>` : ''}</span>${bouton}</li>`;
}

/** LES DÉBLOCAGES ET TON CLUB : ce que tes médailles achètent pour tes prochaines runs. */
export function ecranDeblocages(m) {
  const md = medailles(m);
  const r = rangDe(m);
  const deb = Object.entries(DEBLOCAGES).map(([id, a]) => article(m, 'deb', id, a)).join('');
  const clubs = Object.entries(CLUBS).map(([id, a]) => article(m, 'club', id, a)).join('');
  const couleurs = Object.entries(COULEURS).map(([id, a]) => article(m, 'couleur', id, a, `<span class="pastille" style="--pastille:${a.hex}"></span>`)).join('');
  return `<h2>Déblocages</h2>
    <p class="etat">🏅 <b>${md.reste}</b> à dépenser · ${md.gagnees} gagnées à vie · rang <b>${esc(r.nom)}</b>${r.suivant ? `, ${esc(r.suivant.nom)} dans ${r.suivant.manque} 🏅` : ''}</p>
    <p class="sous">Une run rapporte ${MEDAILLES.split} 🏅 par split joué, ${MEDAILLES.mandat} par mandat rempli, ${MEDAILLES.ronde} par ronde de séries gagnée, ${MEDAILLES.titre} par titre, et ${MEDAILLES.run} de plus quand elle est gagnée. Le rang suit tout ce que tu as gagné, dépensé ou non.</p>
    <h3>Pour tes prochaines runs</h3><ul class="articles">${deb}</ul>
    <h3>Le nom de ton club</h3><ul class="articles">${clubs}</ul>
    <h3>Ses couleurs</h3><ul class="articles">${couleurs}</ul>
    <p class="sous">Ce que tu portes vaut à la prochaine run : une run garde le club de son départ.</p>`;
}

/** LE PALMARÈS : le panthéon, les trophées de tes joueurs, tes runs. */
export function ecranPalmares(m) {
  const { records, trophees } = pantheonDe(m);
  const runs = runsDe(m);
  const recs = Object.entries(RECORDS).filter(([id]) => records[id]).map(([id, [ico, nom, unite]]) => {
    const x = records[id];
    return `<li class="trophee"><span class="jeu-ico">${ico}</span><span class="jeu-id"><b>${esc(nom)}</b><small>${String(x.val).replace('.', ',')} ${unite} · ${esc(x.quoi)} · run ${x.run}, split ${x.split}${x.club ? `, ${esc(x.club)}` : ''}</small></span></li>`;
  }).join('');
  const parTrophee = Object.entries(TROPHEES).map(([id, [ico, nom]]) => {
    const qui = trophees.filter(t => t.id === id);
    return qui.length ? `<li class="trophee"><span class="jeu-ico">${ico}</span><span class="jeu-id"><b>${esc(nom)} · ${qui.length}</b><small>${qui.map(t => `${esc(t.n)} (run ${t.run})`).join(', ')}</small></span></li>` : '';
  }).join('');
  const lignes = runs.map(r => {
    const titres = r.passes.filter(p => p.champion).length;
    return `<li class="run-ligne"><span class="jeu-id"><b>${esc(r.club ? r.club.nom : 'Ton cinq')}${r.exig ? ` · 🔺 ${r.exig}` : ''} · ${r.passes.length} split${r.passes.length > 1 ? 's' : ''}</b>
      <small>${date(r.debut)} · ${FINS[r.fin] || 'En cours'}${titres ? ` · ${titres} titre${titres > 1 ? 's' : ''}` : ''} · ${r.passes.map(p => `${p.fiche[0]}-${p.fiche[1]}`).join(', ')}</small></span><span class="prix">${r.medailles} 🏅</span></li>`;
  }).join('');
  return `<h2>Le palmarès</h2>
    <h3>Le panthéon</h3>${recs ? `<ul class="trophees">${recs}</ul>` : '<p class="sous">Tes records viendront avec ton premier split joué.</p>'}
    <h3>Les trophées de tes joueurs</h3>${parTrophee ? `<ul class="trophees">${parTrophee}</ul>` : '<p class="sous">Aucun encore : le joueur du split, le bourreau, l\'intouchable, le roi de l\'or, le joueur de la finale.</p>'}
    <h3>Tes runs · ${runs.length}</h3>${lignes ? `<ul class="runs">${lignes}</ul>` : '<p class="sous">Aucune run jouée.</p>'}`;
}

/* Les cartes d'un split à la collection. */
const duSplit = (col, id) => [...col].filter(([cle]) => cle.startsWith(`${id}|`));

/**
 * LA COLLECTION, split par split. `index` : les splits bâtis ; `totaux` :
 * id → nombre de joueurs du split, pour ceux déjà chargés.
 */
export function ecranCollection(m, index, totaux) {
  const col = collectionDe(m);
  const galons = [...col.values()].reduce((s, x) => s + x.galons.length, 0);
  const lignes = index.map(s => {
    const n = duSplit(col, s.id).length;
    const tot = totaux.get(s.id);
    return `<li><button class="album-ligne" data-album="${esc(s.id)}"><span class="jeu-id"><b>${esc(s.nom)}</b><small>${n ? `${n} carte${n > 1 ? 's' : ''}` : 'Aucune carte'}${tot ? ` sur ${tot}` : ''}</small></span>
      ${tot ? `<span class="piste album-piste"><span class="rempli" style="width:${Math.round((100 * n) / tot)}%"></span></span>` : ''}<span class="prix">›</span></button></li>`;
  }).join('');
  return `<h2>Ta collection</h2>
    <p class="etat">${col.size} carte${col.size > 1 ? 's' : ''} · ${galons} galon${galons > 1 ? 's' : ''}</p>
    <p class="sous">Chaque joueur passé chez toi — signé, pigé, sorti d'un pack — y entre, une copie par run : deux font une Argent, trois une Or, cinq une Holo. Ses galons s'y gravent.</p>
    <ul class="albums">${lignes}</ul>`;
}

/** L'ALBUM D'UN SPLIT : ses équipes, leurs joueurs ; les tiens en couleur, les autres en attente. `profils` : js/cotes.js. */
export function ecranAlbum(m, split, profils) {
  const col = collectionDe(m);
  const eqs = split.equipes.map(e => {
    const cartes = e.joueurs.map(j => {
      const cle = `${split.id}|${e.nom}|${j.n}|${j.r}`;
      const x = col.get(cle);
      if (!x || !x.copies) return `<li class="album-carte vide"><span class="vignette">?</span><span class="qui"><b>${esc(j.n)}</b><small>${ROLES[j.r]}</small></span></li>`;
      const fin = finitionDe(x.copies);
      return `<li class="album-carte fin-${fin.toLowerCase()}" data-carte-col="${esc(cle)}" tabindex="0">${vignette(j)}<span class="qui"><b>${esc(j.n)}</b><small>${ROLES[j.r]} · ${esc(profils.joueurs.get(j).niveau)} · ${fin}</small>
        ${x.galons.length ? `<small class="galons">${x.galons.map(g => GALONS[g.id][0]).join(' ')}</small>` : ''}</span></li>`;
    }).join('');
    return `<section class="album-equipe"><h3>${e.logo ? `<img src="${imageLP(e.logo)}" alt="">` : ''}${esc(e.nom)}</h3><ul class="album-cartes">${cartes}</ul></section>`;
  }).join('');
  const n = duSplit(col, split.id).length;
  const tot = split.equipes.reduce((s, e) => s + e.joueurs.length, 0);
  return `<h2>${esc(split.nom)}</h2><p class="etat">${n} carte${n > 1 ? 's' : ''} sur ${tot}</p>${eqs}`;
}
