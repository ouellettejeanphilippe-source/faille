/* LES PETITS OUTILS PARTAGÉS. Aucune dépendance, aucun DOM : Node et le navigateur les lisent pareil. */

/** Le texte d'une valeur, sûr à poser dans du HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** La virgule décimale, à la québécoise. */
export const virgule = (x, dec = 1) => x.toFixed(dec).replace('.', ',');
