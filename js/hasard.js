/*
 * TOUT LE HASARD DU JEU PASSE ICI (la règle de Cap 82-0). Une graine donne
 * toujours la même suite : la même graine rejoue la même roulette, et plus
 * tard le même split. Aucun `Math.random` ailleurs dans js/ — check_graine.
 */

/** Un générateur à graine (mulberry32) : () → un nombre de 0 à 1. */
export function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un élément d'une liste, tiré par `de`. */
export const piger = (liste, de) => liste[Math.floor(de() * liste.length)];
