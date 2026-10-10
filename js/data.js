/*
 * LE CHARGEUR. Un shard par split (data/splits/<id>.json, bâti par
 * scripts/build_splits.mjs) et l'index qui les liste. Le travailleur de
 * service garde ce qui a déjà été vu ; un cache IndexedDB viendra avec les
 * cotes (LIVRAISON.md, jalon 1).
 */

async function lire(url) {
  const rep = await fetch(url);
  if (!rep.ok) throw new Error(`${url} : ${rep.status}`);
  return rep.json();
}

export const chargerIndex = () => lire('data/index.json');
export const chargerSplit = id => lire(`data/splits/${id}.json`);
/* Les champions joués : nom → id de Data Dragon, et la version (leurs images). */
export const chargerChampions = () => lire('data/champions.json');
