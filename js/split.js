/*
 * L'ÉCRAN DU SPLIT : la ligue (le classement, le calendrier, les meneurs, les
 * séries), hier soir, la feuille d'une série. Rien que du HTML tiré de la
 * ligue (js/sim.js) et de ses feuilles (js/palmares.js) ; aucune cote ici,
 * seulement ce qui s'est joué.
 */
import { esc, virgule, nomCourt } from './util.js';
import { classement } from './sim.js';
import { statsDuSplit, meneurs, MENEURS } from './palmares.js';
import { repechageDe } from './repechage.js';

const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };
const RONDES = ['Quarts de finale', 'Demi-finales', 'Finale'];
const QUALIFIES = 6;

/** Le temps d'une partie, « 32:30 ». */
export const horloge = min => `${Math.floor(min)}:${String(Math.floor((min % 1) * 60)).padStart(2, '0')}`;
const nomDe = (L, i) => `<b>${esc(L.equipes[i].nom)}</b>${L.equipes[i].split ? ` <small>${esc(L.equipes[i].split)}</small>` : ''}`;
const rang = k => (k === 1 ? '1er' : `${k}e`);

/* Une série en une ligne ; jouée, elle s'ouvre sur sa feuille. */
function ligneSerie(L, s) {
  const toi = s.a === 0 || s.b === 0;
  const joue = s.gagnant !== null;
  const cote = i => `<span class="equipe${joue && s.gagnant === i ? ' gagne' : ''}">${nomDe(L, i)}</span>`;
  return `<li class="serie${toi ? ' toi' : ''}"${joue ? ` data-serie="${s.cle}" tabindex="0"` : ''}>
    ${cote(s.a)}<span class="pointage">${joue ? `${s.v[0]}-${s.v[1]}` : 'contre'}</span>${cote(s.b)}</li>`;
}

/** Le titre de l'écran, selon où en est le split. */
export function titreSplit(L) {
  const S = L.series;
  if (!S) return L.jour < L.journees.length ? `Journée ${L.jour + 1} sur ${L.journees.length}` : 'La saison est jouée';
  if (S.champion !== null) return S.champion === 0 ? 'Champion du split !' : `${L.equipes[S.champion].nom} est champion`;
  return `Les séries · ${RONDES[S.rondes.length - 1]}`;
}

/** Toutes les séries de la ligue, par leur clé. */
export const serieDe = (L, cle) => [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].find(s => s.cle === cle);

/** Ta dernière série jouée, ou en cours (une série de séries se joue partie par partie), ou null. */
export function taDerniere(L) {
  const tes = [...L.journees.slice(0, L.jour).flat(), ...(L.series ? L.series.rondes.flat() : [])].filter(s => (s.a === 0 || s.b === 0) && s.parties.length);
  return tes[tes.length - 1] || null;
}

/* La vedette d'une partie : le plus d'éliminations et d'aides chez le gagnant, puis le moins de morts. */
export function vedetteDe(f) {
  return [...f.equipes[f.gagnant].joueurs].sort((a, b) => (b.k + b.a) - (a.k + a.a) || a.m - b.m)[0];
}

/** HIER SOIR : ta dernière série, partie par partie, avec sa vedette ; on la regarde ou on lit sa feuille. */
export function hierSoir(L) {
  const s = taDerniere(L);
  if (!s) return '<p class="sous">Rien de joué encore : ta première série est à la journée 1.</p>';
  const nous = s.a === 0 ? 0 : 1;
  const eux = L.equipes[nous ? s.a : s.b];
  const enCours = s.gagnant === null;
  const gagne = enCours ? s.v[nous] > s.v[1 - nous] : s.gagnant === 0;
  const parties = s.parties.map((p, k) => {
    const f = p.feuille;
    const x = p.bleu === 0 ? 0 : 1;
    const v = vedetteDe(f);
    const rp = repechageDe(s, k);
    const champ = rp ? rp.choix[f.gagnant === x ? nous : 1 - nous][v.r] : null;
    return `<li class="hier-partie"><span class="hier-res ${f.gagnant === x ? 'bon' : 'mauvais'}">${f.gagnant === x ? 'V' : 'D'}</span>
      <span class="hier-id"><b>${horloge(f.duree)} · ${f.equipes[x].k}-${f.equipes[1 - x].k}</b><small>⭐ ${esc(nomCourt(v.n))} ${v.k}/${v.m}/${v.a}${champ ? ` · ${esc(champ)}` : ''}</small></span>
      <button class="mini" data-sommaire="${s.cle}|${k}">Sommaire</button><button class="mini" data-direct="${s.cle}|${k}">▶</button></li>`;
  }).join('');
  const mot = enCours ? (s.v[nous] === s.v[1 - nous] ? 'Égalité' : gagne ? 'Tu mènes' : 'Tu tires de l\'arrière') : gagne ? 'Victoire' : 'Défaite';
  return `<div class="hier${gagne ? ' gagne' : ''}"><p class="hier-tete"><b>${mot} ${s.v[nous]}-${s.v[1 - nous]}</b> contre ${esc(eux.nom)}${eux.split ? ` <small>${esc(eux.split)}</small>` : ''}${enCours ? ` · en ${s.bo} parties` : ''}</p>
    <ul class="hier-parties">${parties}</ul>${enCours ? '' : `<button class="mini lien" data-serie="${s.cle}">La feuille de la série ›</button>`}</div>`;
}

/** Le classement de la saison. */
export function tableauClassement(L) {
  return `<ol class="classement">${classement(L).map((l, k) => `<li class="${l.i === 0 ? 'toi' : ''}${k === QUALIFIES - 1 ? ' coupe' : ''}">
    <span class="rang">${k + 1}</span><span class="equipe">${nomDe(L, l.i)}</span><span class="fiche">${l.v}-${l.d}</span></li>`).join('')}</ol>
    <p class="sous">Les ${QUALIFIES} premiers vont en séries ; les deux premiers attendent en demi-finale.</p>`;
}

/** LE CALENDRIER : tes séries, jouées puis à venir ; et la journée en cours au complet. */
export function calendrier(L) {
  const fiche = new Map(classement(L).map((l, k) => [l.i, `${rang(k + 1)} · ${l.v}-${l.d}`]));
  const tes = L.journees.map((jour, j) => {
    const s = jour.find(x => x.a === 0 || x.b === 0);
    if (!s) return '';
    const adv = s.a === 0 ? s.b : s.a;
    const joue = s.gagnant !== null;
    const res = joue ? `<span class="cal-res ${s.gagnant === 0 ? 'bon' : 'mauvais'}">${s.gagnant === 0 ? 'V' : 'D'}</span>` : `<span class="cal-res">${j + 1}</span>`;
    return `<li class="cal${j === L.jour && !L.series ? ' cal-prochaine' : ''}"${joue ? ` data-serie="${s.cle}" tabindex="0"` : ''}>${res}
      <span class="equipe"><b>${s.a === 0 ? '' : '@ '}${esc(L.equipes[adv].nom)}</b><small>${esc(L.equipes[adv].split || '')} · ${fiche.get(adv)}</small></span></li>`;
  }).join('');
  const jour = L.jour < L.journees.length && !L.series ? `<h3>Journée ${L.jour + 1}, à venir</h3><ul class="series">${L.journees[L.jour].map(s => ligneSerie(L, s)).join('')}</ul>` : '';
  const hier = L.jour > 0 && !L.series ? `<h3>Journée ${L.jour}</h3><ul class="series">${L.journees[L.jour - 1].map(s => ligneSerie(L, s)).join('')}</ul>` : '';
  return `<h3>Tes séries · ${L.journees.length} journées</h3><ol class="calendrier">${tes}</ol>${jour}${hier}`;
}

/** LES SÉRIES : le tableau, ronde par ronde. */
export function tableauSeries(L) {
  const S = L.series;
  if (!S) return `<p class="sous">Les séries suivent la saison : les ${QUALIFIES} premiers, en cinq parties.</p>`;
  return S.rondes.map((r, k) => `<h3>${RONDES[k]}</h3><ul class="series">${r.map(s => ligneSerie(L, s)).join('')}</ul>`).join('');
}

/** LES MENEURS de la ligue, colonne par colonne ; tes joueurs en bleu-vert. */
export function tableauMeneurs(L) {
  const st = statsDuSplit(L);
  if (!st.length) return '<p class="sous">Les meneurs viennent avec la première journée.</p>';
  return Object.entries(MENEURS).map(([cle, [ico, nom, , moyenne]]) => {
    const lignes = meneurs(L, cle, 5, st).map(({ ligne: l, val }, k) => `<li class="${l.i === 0 ? 'toi' : ''}"><span class="rang">${k + 1}</span>
      <span class="equipe"><b>${esc(nomCourt(l.n))}</b><small>${ROLES[l.r]} · ${esc(L.equipes[l.i].nom)}</small></span><span class="fiche">${moyenne ? virgule(val, cle === 'or' ? 0 : 1) : val}</span></li>`).join('');
    return `<h3>${ico} ${nom}${moyenne ? ' · deux tiers des parties' : ''}</h3><ol class="classement">${lignes}</ol>`;
  }).join('');
}

/* Les moments d'une partie : la première élimination, les objectifs, le nexus. */
function moments(L, p) {
  const f = p.feuille;
  const camps = [p.bleu, p.rouge];
  const qui = x => esc(L.equipes[camps[x.camp]].nom);
  const MOTS = { dragon: 'prend un dragon', heraut: 'prend le héraut', nashor: 'prend le Nashor', inhib: 'fait tomber un inhibiteur', nexus: 'fait tomber le nexus' };
  const premier = f.fil.find(x => x.quoi === 'elim');
  const liste = f.fil.filter(x => MOTS[x.quoi] || x === premier);
  return liste.map(x => `<li><span class="temps">${horloge(x.t)}</span> ${qui(x)} ${x === premier
    ? `: premier sang, ${esc(nomCourt(f.equipes[x.camp].joueurs[x.tueur].n))} sur ${esc(nomCourt(f.equipes[1 - x.camp].joueurs[x.victime].n))}` : MOTS[x.quoi]}</li>`).join('');
}

/** La feuille d'une série : chaque partie, son repêchage, ses deux équipes, leurs joueurs, ses moments. */
export function feuilleSerie(L, s) {
  return `<h2>${esc(L.equipes[s.a].nom)} ${s.v[0]}-${s.v[1]} ${esc(L.equipes[s.b].nom)}</h2>${s.parties.map((p, k) => {
    const f = p.feuille;
    const camps = [p.bleu, p.rouge];
    const rp = repechageDe(s, k);
    // Le champion d'un joueur, quand la partie a eu son repêchage (js/repechage.js).
    const champ = (i, r) => (rp && rp.choix[i === s.a ? 0 : 1][r] ? ` · ${esc(rp.choix[i === s.a ? 0 : 1][r])}` : '');
    const bans = rp ? `<p class="sous">Bannis : ${[...rp.contreMoi, ...rp.bans].map(esc).join(', ')}.</p>` : '';
    const equipe = (e, x) => `<div class="feuille-equipe${f.gagnant === x ? ' gagne' : ''}">
      <h4>${x ? 'Rouge' : 'Bleu'} · ${esc(L.equipes[camps[x]].nom)}${f.gagnant === x ? ' · victoire' : ''}</h4>
      <p class="sous">${e.k} élim. · ${virgule(e.or / 1000)} k d'or · ${e.tours} tours · ${e.dragons} dragons · ${e.barons} Nashor</p>
      <table><tbody>${e.joueurs.map(j => `<tr><td>${ROLES[j.r]}</td><td>${esc(nomCourt(j.n))}${champ(camps[x], j.r)}</td><td>${j.k}/${j.m}/${j.a}</td><td>${virgule(j.or / 1000)} k</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="partie"><h3>Partie ${k + 1} · ${horloge(f.duree)} <button class="mini" data-direct="${s.cle}|${k}">▶ Regarder</button></h3>${bans}${f.equipes.map(equipe).join('')}<ul class="moments">${moments(L, p)}</ul></section>`;
  }).join('')}`;
}
