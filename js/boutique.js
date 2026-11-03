/*
 * LA BOUTIQUE : tes jetons, les packs de joueurs ; la carte de ton coach. Rien
 * que du HTML tiré de l'état du rogue (js/rogue.js) et de la gestion
 * (js/gestion.js) ; ce qu'un pouvoir change se dit en vraies stats de partie
 * mesurées (js/impact.js). Le plan de jeu et ses packs de cartes sont partis à
 * la version 9 (js/adjoints.js en a repris les meilleures idées).
 */
import { esc } from './util.js';
import { JETONS, COACHS, NIVEAU_DES_POUVOIRS, jetonsDe } from './rogue.js';
import { phraseDe } from './impact.js';
import { PACKS_JOUEURS, prixPackJoueurs, chancesJoueurs, marcheOuvert, placements, cleDe } from './gestion.js';
import { ROLES, vignette, coutHtml } from './fiche.js';
import { paquetHtml } from './ouverture.js';

const GAINS = `${JETONS.victoire} par victoire, ${JETONS.defaite} par défaite, ${JETONS.ronde} par ronde de séries gagnée`;

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
    <small>Niveau ${NIVEAU_DES_POUVOIRS[k]} · ${esc(x.condition)} : ${esc(phraseDe(`pouvoir:${x.id}${talents.includes(x.id) ? ':grandi' : ''}`, { quand: true }))}</small></li>`).join('');
  return `<span class="coach-tete"><span class="jeu-ico">${co.ico}</span><b>${esc(co.nom)}</b>${niveau ? `<span class="coach-niveau">Niveau ${niveau}</span>` : ''}</span>
    ${barre}<ul class="coach-pouvoirs">${pouvoirs}</ul>`;
}

/** Le marché des joueurs en packs : tes jetons, les packs, le dernier ouvert. `joueurs` : ses contrats. */
export const vuePacksJoueurs = (P, joueurs) => `<p class="etat">🪙 ${jetonsDe(P.L, P.R)} jetons — ${GAINS}</p>${packsDeJoueurs(P, joueurs)}`;
