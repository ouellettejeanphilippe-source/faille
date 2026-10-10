/*
 * L'ÉCRAN DU SPLIT : la journée, le classement, les séries, la feuille d'une
 * partie. Rien que du HTML tiré de la ligue (js/sim.js) ; aucune cote ici,
 * seulement ce qui s'est joué.
 */
import { esc, virgule } from './util.js';
import { classement } from './sim.js';

const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };
const RONDES = ['Quarts de finale', 'Demi-finales', 'Finale'];

/** Le temps d'une partie, « 32:30 ». */
const horloge = min => `${Math.floor(min)}:${String(Math.round((min % 1) * 60)).padStart(2, '0')}`;
const nomDe = (L, i) => `<b>${esc(L.equipes[i].nom)}</b>${L.equipes[i].split ? ` <small>${esc(L.equipes[i].split)}</small>` : ''}`;

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

/** Ce qui vient de se jouer (la dernière journée, ou la ronde des séries) et ce qui vient. */
export function tableauJour(L) {
  const S = L.series;
  const blocs = [];
  if (S) {
    S.rondes.forEach((r, k) => blocs.push([RONDES[k], r]));
  } else {
    if (L.jour > 0) blocs.push([`Journée ${L.jour}`, L.journees[L.jour - 1]]);
    if (L.jour < L.journees.length) blocs.push([`Journée ${L.jour + 1}, à venir`, L.journees[L.jour]]);
  }
  return blocs.map(([titre, series]) => `<h3>${titre}</h3><ul class="series">${series.map(s => ligneSerie(L, s)).join('')}</ul>`).join('');
}

/** Le classement de la saison. */
export function tableauClassement(L) {
  const qualifies = 6;
  return `<h3>Classement</h3><ol class="classement">${classement(L).map((l, k) => `<li class="${l.i === 0 ? 'toi' : ''}${k === qualifies - 1 ? ' coupe' : ''}">
    <span class="rang">${k + 1}</span><span class="equipe">${nomDe(L, l.i)}</span><span class="fiche">${l.v}-${l.d}</span></li>`).join('')}</ol>`;
}

/** Toutes les séries de la ligue, par leur clé. */
export const serieDe = (L, cle) => [...L.journees.flat(), ...(L.series ? L.series.rondes.flat() : [])].find(s => s.cle === cle);

/* Les moments d'une partie : la première élimination, les objectifs, le nexus. */
function moments(L, p) {
  const f = p.feuille;
  const camps = [p.bleu, p.rouge];
  const qui = x => esc(L.equipes[camps[x.camp]].nom);
  const MOTS = { dragon: 'prend un dragon', heraut: 'prend le héraut', nashor: 'prend le Nashor', inhib: 'fait tomber un inhibiteur', nexus: 'fait tomber le nexus' };
  const premier = f.fil.find(x => x.quoi === 'elim');
  const liste = f.fil.filter(x => MOTS[x.quoi] || x === premier);
  return liste.map(x => `<li><span class="temps">${horloge(x.t)}</span> ${qui(x)} ${x === premier
    ? `: premier sang, ${esc(f.equipes[x.camp].joueurs[x.tueur].n)} sur ${esc(f.equipes[1 - x.camp].joueurs[x.victime].n)}` : MOTS[x.quoi]}</li>`).join('');
}

/** La feuille d'une série : son repêchage, chaque partie, ses deux équipes, leurs joueurs, ses moments. */
export function feuilleSerie(L, s) {
  const rp = s.repechage;
  // Le champion d'un joueur, quand la série a eu son repêchage (js/repechage.js).
  const champ = (i, r) => (rp && rp.choix[i === s.a ? 0 : 1][r] ? ` · ${esc(rp.choix[i === s.a ? 0 : 1][r])}` : '');
  const bans = rp ? `<p class="sous">Bannis : ${[...rp.contreMoi, ...rp.bans].map(esc).join(', ')}.</p>` : '';
  return `<h2>${esc(L.equipes[s.a].nom)} ${s.v[0]}-${s.v[1]} ${esc(L.equipes[s.b].nom)}</h2>${bans}${s.parties.map((p, k) => {
    const f = p.feuille;
    const camps = [p.bleu, p.rouge];
    const equipe = (e, x) => `<div class="feuille-equipe${f.gagnant === x ? ' gagne' : ''}">
      <h4>${x ? 'Rouge' : 'Bleu'} · ${esc(L.equipes[camps[x]].nom)}${f.gagnant === x ? ' · victoire' : ''}</h4>
      <p class="sous">${e.k} élim. · ${virgule(e.or / 1000)} k d'or · ${e.tours} tours · ${e.dragons} dragons · ${e.barons} Nashor</p>
      <table><tbody>${e.joueurs.map(j => `<tr><td>${ROLES[j.r]}</td><td>${esc(j.n)}${champ(camps[x], j.r)}</td><td>${j.k}/${j.m}/${j.a}</td><td>${virgule(j.or / 1000)} k</td></tr>`).join('')}</tbody></table></div>`;
    return `<section class="partie"><h3>Partie ${k + 1} · ${horloge(f.duree)}</h3>${f.equipes.map(equipe).join('')}<ul class="moments">${moments(L, p)}</ul></section>`;
  }).join('')}`;
}
