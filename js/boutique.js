/*
 * LA BOUTIQUE : tes jetons, les packs de joueurs, ton plan de jeu, ton coach,
 * les packs de cartes. Rien que du HTML tiré de l'état du rogue (js/rogue.js)
 * et de la gestion (js/gestion.js) ; ce qu'une carte fait se dit en mots
 * (dire), et les chances d'un pack en « 1 pack sur N ».
 */
import { esc } from './util.js';
import { JETONS, CARTES, PACKS, COACHS, RARETES, PLAN, NIVEAU_DES_POUVOIRS, couleurDe, chances, prixDuPack, confiance, jetonsDe, dire } from './rogue.js';
import { prixDuCoach } from './partie.js';
import { PACKS_JOUEURS, prixPackJoueurs, chancesJoueurs, marcheOuvert, placements, cleDe } from './gestion.js';
import { ROLES, vignette, coutHtml } from './fiche.js';
import { paquetHtml } from './ouverture.js';

const PALIERS = ['', 'I', 'II', 'III'];
const GAINS = `${JETONS.victoire} par victoire, ${JETONS.defaite} par défaite, ${JETONS.ronde} par ronde de séries gagnée`;

/**
 * UNE CARTE DE PLAN DE JEU, au format d'une carte (Cap 82-0 : *une carte de jeu a le format d'une carte de
 * hockey*) : un carton 5:7 aux couleurs de sa rareté, son icône en grand, son nom, la couleur de son coach, ce
 * qu'elle fait en mots (`dire`), jamais en cote.
 */
export function carteDeJeu(id) {
  const [ico, nom, rarete, eff] = CARTES[id];
  const co = couleurDe(id);
  return `<span class="cj cj-${rarete}"><span class="cj-rarete">${RARETES[rarete]}</span>${co ? `<span class="cj-coach" title="${esc(COACHS[co].nom)}">${COACHS[co].ico}</span>` : ''}
    <span class="cj-ico">${ico}</span><span class="cj-nom">${esc(nom)}</span><span class="cj-texte">${dire(eff).map(esc).join(' · ')}</span><span class="cj-pied">Faille · plan de jeu</span></span>`;
}


/*
 * LES PACKS DE JOUEURS : leurs chances par niveau ; ouvert, ses trois joueurs
 * et où chacun peut jouer sous ton plafond. `joueurs` : les contrats du pack
 * ouvert (null : aucun, ou on les cherche).
 */
function packsDeJoueurs(P, joueurs) {
  const L = P.L;
  const jetons = jetonsDe(L, P.R);
  const ouvert = marcheOuvert(L);
  const o = P.offrePack;
  let tire = '';
  if (o && joueurs) {
    tire = `<h3>Ton dernier pack${o.pris ? ' · signé' : ' · signe-en un'}</h3><ul class="liste-joueurs">${joueurs.map(c => {
      const places = o.pris ? '' : placements(P.eff, c).map(pl => {
        const qui = pl.place === 'titulaire' ? `${ROLES[c.r]}${pl.descend ? ` · ${esc(pl.descend.n)} au banc` : pl.sort ? ` · ${esc(pl.sort.n)} part` : ''}` : `Banc${pl.sort ? ` · ${esc(pl.sort.n)} part` : ''}`;
        return `<button data-pack-signer="${esc(cleDe(c.ref))}" data-place="${pl.place}">${qui}</button>`;
      }).join('') || '<small>Trop cher pour ton plafond : il va à ta collection.</small>';
      return `<li class="joueur agent">${vignette(c)}<span class="joueur-id"><b>${esc(c.n)}</b><small>${ROLES[c.r]} · ${esc(c.niveau)}</small><small>${esc(c.equipe)} · ${esc(c.split)}</small></span>${coutHtml(c.cout)}<span class="places">${places}</span></li>`;
    }).join('')}</ul><p class="sous">Les trois entrent à ta collection ; un se signe sans frais, avant la journée suivante.</p>`;
  }
  const packs = Object.entries(PACKS_JOUEURS).map(([id, p]) => {
    const prix = prixPackJoueurs(P.R, id);
    const [n, k] = chancesJoueurs(id)[0];
    return `<li><button class="tuile-pack" data-pack-joueurs="${id}"${!ouvert || jetons < prix ? ' disabled' : ''}>
      <span class="tuile-paquet">${paquetHtml(id, id === 'legendes' ? 'Légendes' : id, `${p.n} joueurs`)}</span><span class="prix">${prix} 🪙</span><small>${esc(n)} : 1 sur ${k}</small></button></li>`;
  }).join('');
  return `${tire}<h3>Les packs de joueurs</h3>
    <ul class="paquets">${packs}</ul>
    <p class="sous">${ouvert ? 'Trois vrais joueurs de tous les splits, tirés par leur niveau : les vedettes sont rares. Jusqu\'à la date limite.' : 'La date limite est passée : les packs de joueurs reviennent au prochain split.'}</p>`;
}

/**
 * LA CARTE DU COACH-PERSONNAGE : ses trois pouvoirs, le niveau qui ouvre
 * chacun, sa condition et ce qu'il fait ; son niveau et son expérience quand
 * il fait la run ; ⭐ sur un pouvoir grandi d'un talent.
 */
export function carteDuCoach(id, { niveau = 0, talents = [], xp = null, prochain = null } = {}) {
  const co = COACHS[id];
  const barre = xp === null ? '' : `<span class="piste coach-piste"><span class="rempli" style="width:${prochain ? Math.round((100 * xp) / prochain) : 100}%"></span></span>
    <small>${xp} point${xp > 1 ? 's' : ''} d'expérience${prochain ? ` · niveau ${niveau + 1} à ${prochain}` : ' · au sommet'}</small>`;
  const pouvoirs = co.pouvoirs.map((x, k) => `<li class="${niveau >= NIVEAU_DES_POUVOIRS[k] ? 'ouvert' : ''}"><b>${esc(x.nom)}${talents.includes(x.id) ? ' ⭐' : ''}</b>
    <small>Niveau ${NIVEAU_DES_POUVOIRS[k]} · ${esc(x.condition)} : ${dire(x.effet, 0.1).map(esc).join(', ')}</small></li>`).join('');
  return `<span class="coach-tete"><span class="jeu-ico">${co.ico}</span><b>${esc(co.nom)}</b>${niveau ? `<span class="coach-niveau">Niveau ${niveau}</span>` : ''}</span>
    ${barre}<ul class="coach-pouvoirs">${pouvoirs}</ul>`;
}

/** Le marché des joueurs en packs : tes jetons, les packs, le dernier ouvert. `joueurs` : ses contrats. */
export const vuePacksJoueurs = (P, joueurs) => `<p class="etat">🪙 ${jetonsDe(P.L, P.R)} jetons — ${GAINS}</p>${packsDeJoueurs(P, joueurs)}`;

/** LE PLAN DE JEU : tes cartes, les packs de cartes (et le coach à acheter, avant la version 4). `ouvertes` : les cartes du dernier pack ouvert. */
export function vuePlanDeJeu(P, ouvertes) {
  const L = P.L, R = P.R;
  const jetons = jetonsDe(L, R);
  const prixCoach = prixDuCoach(P);
  const conf = confiance(R);
  // Avant la version 4, le coach s'achète ici ; depuis, il fait la run (sa carte est à l'Effectif).
  const ancienne = P.v < 4;
  const plan = R.cartes.length
    ? `<ul class="main-cartes">${R.cartes.map(id => `<li><button class="cj-bouton${R.plan.includes(id) ? ' au-plan' : ''}" data-carte="${id}">${carteDeJeu(id)}</button></li>`).join('')}</ul>`
    : '<p class="sous">Aucune carte encore : ouvre un pack.</p>';
  const coachs = Object.entries(COACHS).map(([id, co]) => {
    const enPoste = R.coach && R.coach.id === id;
    const etat = enPoste
      ? `En poste · confiance ${PALIERS[conf.palier] || 'en rodage'} · ${conf.series} série${conf.series > 1 ? 's' : ''} à sa couleur${conf.prochain ? `, prochain palier à ${conf.prochain}` : ''}`
      : 'Ses pouvoirs s\'ouvrent un par palier de confiance.';
    // Ses trois pouvoirs : le palier qui l'ouvre, sa phase et sa condition, ce qu'il fait.
    const pouvoirs = co.pouvoirs.map((x, k) => `<small class="pouvoir${enPoste && conf.palier > k ? ' ouvert' : ''}">${PALIERS[k + 1]} · <b>${esc(x.nom)}</b> — ${esc(x.condition)} : ${dire(x.effet, 0.1).map(esc).join(', ')}</small>`).join('');
    return `<li><button class="coach${enPoste ? ' active' : ''}" data-coach="${id}"${enPoste || jetons < prixCoach ? ' disabled' : ''}>
      <span class="jeu-ico">${co.ico}</span><span class="jeu-id"><b>${esc(co.nom)}</b><small>${etat}</small>${pouvoirs}</span>
      <span class="prix">${enPoste ? '' : prixCoach ? `${prixCoach} 🪙` : 'Gratuit'}</span></button></li>`;
  }).join('');
  const packs = Object.entries(PACKS).map(([id, p]) => {
    const prix = prixDuPack(R, id);
    const [r, n] = chances(id).filter(([x]) => x !== 'commune').pop();
    return `<li><button class="tuile-pack" data-pack="${id}"${jetons < prix ? ' disabled' : ''}>
      <span class="tuile-paquet">${paquetHtml(id, id, `${p.n} cartes`)}</span><span class="prix">${prix} 🪙</span><small>${RARETES[r]} : 1 sur ${n}</small></button></li>`;
  }).join('');
  return `<p class="etat">🪙 ${jetons} jetons — ${GAINS}</p>
    ${ouvertes && !ouvertes.length ? '<p class="sous">Tu as déjà toutes les cartes.</p>' : ''}
    <h3>Ton plan de jeu · ${R.plan.length}/${PLAN}</h3>
    ${plan}
    ${R.cartes.length ? '<p class="sous">Touche une carte : elle entre au plan, ou en sort ; il joue toutes tes séries.</p>' : ''}
    ${ancienne ? `<h3>Le coach</h3>
    <p class="sous">Un seul en poste. Sa confiance monte à chaque série jouée avec une carte de sa couleur au plan : palier I à 3, II à 6, III à 9 ; chaque palier ouvre un pouvoir, qui lit la partie au début de sa phase et la frappe quand sa condition tient.</p>
    <ul class="cartes-jeu">${coachs}</ul>` : ''}
    <h3>Les packs de cartes</h3>
    <ul class="paquets">${packs}</ul>
    <p class="sous">Chaque pack hausse le prix du suivant ; une carte ne sort qu'une fois.</p>`;
}
