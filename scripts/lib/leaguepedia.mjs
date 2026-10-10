/*
 * LEAGUEPEDIA (lol.fandom.com, API Cargo, CC BY-SA 3.0). La bibliothèque de
 * scripts/build_splits.mjs et de scripts/catalogue.mjs.
 *
 * L'API limite le débit : une requête à la fois, une pause entre chacune, et
 * on attend 30 s, 60 s, 120 s… quand elle répond « ratelimited ». Depuis une
 * adresse partagée (un conteneur), la limite peut durer des heures : l'Action
 * « Bâtir les splits » passe par les machines de GitHub.
 */

const API = 'https://lol.fandom.com/api.php';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const PAUSE = 3000;          // entre deux requêtes
const PAGE = 500;            // le maximum de Cargo

const dormir = ms => new Promise(r => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let essai = 0; ; essai++) {
    await dormir(PAUSE);
    const rep = await (await fetch(url, { headers: { 'User-Agent': AGENT } })).json();
    if (!rep.error) return rep;
    if (rep.error.code !== 'ratelimited' || essai >= 6) throw new Error(`${params.tables || params.table} : ${rep.error.info}`);
    const attente = 30000 * 2 ** essai;
    console.log(`  limite de débit, on attend ${attente / 1000} s`);
    await dormir(attente);
  }
}

/** Les champs qu'une table a vraiment : on ne demande que ceux-là (une colonne inconnue fait échouer toute la requête). */
export const champsDe = async table => new Set(Object.keys((await api({ action: 'cargofields', table })).cargofields));

/**
 * `voulus` : { alias: 'Champ' }. Rend des lignes { alias: valeur }, une valeur
 * vide devenant null ; un champ que la table n'a pas est simplement absent.
 */
export async function cargo(table, existants, voulus, where) {
  const champs = Object.entries(voulus).filter(([, c]) => existants.has(c)).map(([alias, c]) => `${c}=${alias}`);
  const lignes = [];
  for (let offset = 0; ; offset += PAGE) {
    const rep = await api({ action: 'cargoquery', tables: table, fields: champs.join(','), where, order_by: `${table}._ID`, limit: PAGE, offset });
    const page = rep.cargoquery.map(x => Object.fromEntries(Object.entries(x.title).map(([k, v]) => [k, v === '' ? null : v])));
    lignes.push(...page);
    if (page.length < PAGE) return lignes;
  }
}
