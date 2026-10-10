/*
 * LA BOUTIQUE : tes jetons, ton plan de jeu, ton coach, les packs. Rien que
 * du HTML tiré de l'état du rogue (js/rogue.js) ; ce qu'une carte fait se dit
 * en mots (dire), et les chances d'un pack en « 1 pack sur N ».
 */
import { esc } from './util.js';
import { JETONS, CARTES, PACKS, COACHS, RARETES, PLAN, PRIX_COACH, couleurDe, chances, prixDuPack, confiance, jetonsDe, dire } from './rogue.js';

const PALIERS = ['', 'I', 'II', 'III'];
const GAINS = `${JETONS.victoire} par victoire, ${JETONS.defaite} par défaite, ${JETONS.ronde} par ronde de séries gagnée`;

/** Une carte de plan de jeu. */
function carteJeu(id, { active = false, bouton = true } = {}) {
  const [ico, nom, rarete, eff] = CARTES[id];
  const co = couleurDe(id);
  const corps = `<span class="jeu-ico">${ico}</span><span class="jeu-id"><b>${esc(nom)}</b>
    <small>${RARETES[rarete]}${co ? ` · ${COACHS[co].ico} ${esc(COACHS[co].nom)}` : ''}</small>
    <small>${dire(eff).map(esc).join(' · ')}</small></span>`;
  return bouton
    ? `<li><button class="carte-jeu rarete-${rarete}${active ? ' active' : ''}" data-carte="${id}">${corps}</button></li>`
    : `<li class="carte-jeu rarete-${rarete}">${corps}</li>`;
}

/** La ligne d'état du split : les jetons, le plan, le coach. */
export function resumeRogue(L, R) {
  const { palier } = confiance(R);
  const coach = R.coach ? ` · ${COACHS[R.coach.id].ico} ${PALIERS[palier] || 'en rodage'}` : '';
  return `🪙 ${jetonsDe(L, R)} jetons · plan : ${R.plan.length}/${PLAN}${coach}`;
}

/** La boutique entière. `ouvertes` : les cartes du dernier pack ouvert. */
export function boutique(L, R, ouvertes) {
  const jetons = jetonsDe(L, R);
  const conf = confiance(R);
  const plan = R.cartes.length
    ? `<ul class="cartes-jeu">${R.cartes.map(id => carteJeu(id, { active: R.plan.includes(id) })).join('')}</ul>`
    : '<p class="sous">Aucune carte encore : ouvre un pack.</p>';
  const coachs = Object.entries(COACHS).map(([id, co]) => {
    const enPoste = R.coach && R.coach.id === id;
    const etat = enPoste
      ? `En poste · confiance ${PALIERS[conf.palier] || 'en rodage'} · ${conf.series} série${conf.series > 1 ? 's' : ''} à sa couleur${conf.prochain ? `, prochain palier à ${conf.prochain}` : ''}`
      : `Au palier III : ${dire(co.paliers[2]).map(esc).join(' · ')}`;
    return `<li><button class="coach${enPoste ? ' active' : ''}" data-coach="${id}"${enPoste || jetons < PRIX_COACH ? ' disabled' : ''}>
      <span class="jeu-ico">${co.ico}</span><span class="jeu-id"><b>${esc(co.nom)}</b><small>${etat}</small></span>
      <span class="prix">${enPoste ? '' : `${PRIX_COACH} 🪙`}</span></button></li>`;
  }).join('');
  const packs = Object.entries(PACKS).map(([id, p]) => {
    const prix = prixDuPack(R, id);
    const ch = chances(id).filter(([r]) => r !== 'commune').map(([r, n]) => `${RARETES[r]} : 1 pack sur ${n}`).join(' · ');
    return `<li><button class="pack" data-pack="${id}"${jetons < prix ? ' disabled' : ''}>
      <span class="jeu-id"><b>${esc(p.nom)} · ${p.n} cartes</b><small>${ch}</small></span><span class="prix">${prix} 🪙</span></button></li>`;
  }).join('');
  return `<button class="retour" data-retour>‹ Retour</button>
    <h2>La boutique</h2>
    <p class="etat">🪙 ${jetons} jetons — ${GAINS}</p>
    ${ouvertes ? `<h3>Dans le pack</h3>${ouvertes.length ? `<ul class="cartes-jeu">${ouvertes.map(id => carteJeu(id, { bouton: false })).join('')}</ul>` : '<p class="sous">Tu as déjà toutes les cartes.</p>'}` : ''}
    <h3>Ton plan de jeu · ${R.plan.length}/${PLAN}</h3>
    <p class="sous">Touche une carte pour la mettre au plan ou l'en retirer ; il joue toutes tes séries.</p>
    ${plan}
    <h3>Le coach</h3>
    <p class="sous">Un seul en poste. Sa confiance monte à chaque série jouée avec une carte de sa couleur au plan : palier I à 3, II à 6, III à 9.</p>
    <ul class="cartes-jeu">${coachs}</ul>
    <h3>Les packs</h3>
    <p class="sous">Chaque pack hausse le prix du suivant ; une carte ne sort qu'une fois.</p>
    <ul class="cartes-jeu">${packs}</ul>`;
}
