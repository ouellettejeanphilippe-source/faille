/*
 * L'ÉCRAN DU REPÊCHAGE, avant chacune de tes séries (js/repechage.js) :
 * ce qu'ils te bannissent, tes trois bannissements dans leurs bassins, ton
 * champion pour chacun de tes cinq, et ce que l'adversaire prendra. Ce qui
 * s'affiche : les vraies parties de chaque joueur sur chaque champion, et ce
 * que la composition fait, en mots. Aucune cote.
 */
import { esc } from './util.js';
import { iconeChampion } from './images.js';
import { ROLES } from './fiche.js';
import { BANS, HORS, permis, bansAuto, choixParDefaut, effetsDuRepechage } from './repechage.js';
import { dire } from './rogue.js';

const R5 = Object.keys(ROLES);

/** L'état d'un repêchage qui s'ouvre : les bannissements suggérés, tes plus joués. */
export function nouveauRepechage(L, s) {
  const eux = L.equipes[s.a === 0 ? s.b : s.a];
  const contreMoi = bansAuto(L.equipes[0]);
  const bans = bansAuto(eux, new Set(contreMoi));
  return ajuster(L, { cle: s.cle, eux, contreMoi, bans, choix: choixParDefaut(L.equipes[0], new Set([...contreMoi, ...bans])) });
}

/* Remet d'aplomb les choix après un changement : un champion banni ou pris deux fois cède la place au plus joué qui reste. */
function ajuster(L, d) {
  const interdits = new Set([...d.contreMoi, ...d.bans]);
  const pris = new Set();
  for (const r of R5) {
    const c = d.choix[r];
    if (c !== HORS && !interdits.has(c) && !pris.has(c) && L.equipes[0].cinq[r].bassin.some(([x]) => x === c)) { pris.add(c); continue; }
    const libre = permis(L.equipes[0].cinq[r], new Set([...interdits, ...pris]))[0];
    d.choix[r] = libre ? libre[0] : HORS;
    if (libre) pris.add(libre[0]);
  }
  return d;
}

/** Bannit ou débannit un champion de l'adversaire (trois au plus). */
export function bannir(L, d, c) {
  if (d.bans.includes(c)) d.bans = d.bans.filter(x => x !== c);
  else if (d.bans.length < BANS && !d.contreMoi.includes(c)) d.bans.push(c);
  return ajuster(L, d);
}

/** Donne un champion à un de tes joueurs ; celui qui l'avait reprend son plus joué qui reste. */
export function choisir(L, d, r, c) {
  for (const x of R5) if (x !== r && d.choix[x] === c) d.choix[x] = null;
  d.choix[r] = c;
  return ajuster(L, d);
}

const puce = (champions, c, attrs, etat, legende) => {
  const src = iconeChampion(champions, c);
  return `<button class="champ${etat ? ` ${etat}` : ''}" ${attrs}>${src ? `<img src="${src}" alt="" loading="lazy">` : '<span class="ico-vide"></span>'}<small>${esc(c)}${legende ? ` · ${legende}` : ''}</small></button>`;
};

/** L'écran entier. `champions` : data/champions.json. */
export function ecranRepechage(L, d, champions) {
  const moi = L.equipes[0];
  const interdits = new Set([...d.contreMoi, ...d.bans]);
  const leurs = choixParDefaut(d.eux, new Set([...interdits, ...Object.values(d.choix).filter(c => c !== HORS)]));
  const lignesEux = R5.map(r => {
    const j = d.eux.cinq[r];
    const puces = j.bassin.slice(0, 6).map(([c, pj]) => puce(champions, c, `data-ban="${esc(c)}"${d.contreMoi.includes(c) ? ' disabled' : ''}`,
      d.bans.includes(c) || d.contreMoi.includes(c) ? 'banni' : leurs[r] === c ? 'prevu' : '', pj)).join('');
    return `<li class="repe-joueur"><span class="repe-qui"><b>${esc(j.n)}</b><small>${ROLES[r]} · prendra ${leurs[r] === HORS ? 'hors de son bassin' : esc(leurs[r])}</small></span><span class="repe-puces">${puces}</span></li>`;
  }).join('');
  const lignesMoi = R5.map(r => {
    const j = moi.cinq[r];
    const ailleurs = new Set(R5.filter(x => x !== r).map(x => d.choix[x]));
    const puces = j.bassin.map(([c, pj, v]) => puce(champions, c, `data-role="${r}" data-champ="${esc(c)}"${interdits.has(c) ? ' disabled' : ''}`,
      interdits.has(c) ? 'banni' : d.choix[r] === c ? 'choisi' : ailleurs.has(c) ? 'ailleurs' : '', `${pj} · ${v}-${pj - v}`)).join('');
    return `<li class="repe-joueur"><span class="repe-qui"><b>${esc(j.n)}</b><small>${ROLES[r]}</small></span><span class="repe-puces">${puces || '<small>Hors de son bassin : tout est pris.</small>'}</span></li>`;
  }).join('');
  // Le confort : qui joue loin de son plus joué, en vraies parties.
  const malaises = R5.map(r => {
    const j = moi.cinq[r], c = d.choix[r], top = j.bassin[0];
    if (c === HORS) return `${esc(j.n)} joue hors de son bassin`;
    if (!top || c === top[0]) return null;
    return `${esc(j.n)} sur ${esc(c)} : ${j.bassin.find(([x]) => x === c)[1]} parties, contre ${top[1]} sur ${esc(top[0])}`;
  }).filter(Boolean);
  const forme = dire(effetsDuRepechage(moi, d.choix, champions.classes));
  return `<button class="retour" data-retour>‹ Retour</button>
    <h2>Repêchage · contre ${esc(d.eux.nom)}</h2>
    <p class="sous">Ils te bannissent : ${d.contreMoi.map(esc).join(', ') || 'rien'}.</p>
    <h3>Tes bannissements · ${d.bans.length}/${BANS}</h3>
    <ul class="repe-liste">${lignesEux}</ul>
    <h3>Tes champions</h3>
    <p class="sous">Tu choisis avant eux : prendre leur champion fétiche le leur enlève.</p>
    <ul class="repe-liste">${lignesMoi}</ul>
    <p class="etat">${forme.length ? `Ta composition : ${forme.map(esc).join(' · ')}.` : 'Une composition ordinaire.'}${malaises.length ? `<br>Moins à l'aise : ${malaises.join(' ; ')}.` : ''}</p>
    <button id="repe-jouer" class="principal">Jouer la série</button>
    <button id="repe-auto">Repêchage automatique</button>`;
}
