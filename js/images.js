/*
 * LES IMAGES.
 *
 *   photos et logos   copiés une fois depuis Leaguepedia dans img/lp/
 *                     (scripts/images.mjs : leur serveur refuse les autres
 *                     sites) ; le chemin (« e/e6/Fichier.png ») vient du shard
 *   champions         Data Dragon (Riot), l'icône et l'illustration, demandées
 *                     à leur source ; le travailleur de service les garde
 */
const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';

/** Une photo ou un logo de Leaguepedia, copié dans le dépôt. */
export const imageLP = chemin => (chemin ? `img/lp/${chemin}.webp` : null);

/** L'icône carrée d'un champion, et son illustration (pour le fond d'une carte). `champions` : data/champions.json. */
export const iconeChampion = (champions, nom) => (champions.ids[nom] ? `${DDRAGON}/${champions.version}/img/champion/${champions.ids[nom]}.png` : null);
export const illustration = (champions, nom) => (champions.ids[nom] ? `${DDRAGON}/img/champion/splash/${champions.ids[nom]}_0.jpg` : null);

/* Une image qui ne vient pas se retire ; ce qui l'entoure garde sa place (les initiales sous une photo). */
document.addEventListener('error', ev => {
  if (ev.target instanceof HTMLImageElement) ev.target.classList.add('absente');
}, true);

/** L'icône d'un sort d'invocateur (`sort` : [nom, icône, recharge, version où le lire ?] de js/moteur.js SORTS). */
export const iconeSort = (champions, sort) => `${DDRAGON}/${sort[3] || champions.version}/img/spell/${sort[1]}.png`;
/** L'icône d'un objet complété (`o` : champions.objets[nom], [id, nom français, prix, version]). */
export const iconeObjet = (champions, o) => `${DDRAGON}/${champions.versionsObjets[o[3]]}/img/item/${o[0]}.png`;
