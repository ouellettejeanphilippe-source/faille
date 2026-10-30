/* LES PETITS OUTILS PARTAGÉS. Aucune dépendance, aucun DOM : Node et le navigateur les lisent pareil. */

/** Le texte d'une valeur, sûr à poser dans du HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** La virgule décimale, à la québécoise. */
export const virgule = (x, dec = 1) => x.toFixed(dec).replace('.', ',');

/** Le nom d'un joueur à l'écran : sans ce que Leaguepedia ajoute pour le distinguer (« Amazing (Maurice Stückenschneider) » → « Amazing »). */
export const nomCourt = n => String(n).replace(/\s*\(.*\)$/, '');

/** Des points de plafond, au singulier comme au pluriel. */
export const pts = n => `${n} pt${Math.abs(n) > 1 ? 's' : ''}`;
