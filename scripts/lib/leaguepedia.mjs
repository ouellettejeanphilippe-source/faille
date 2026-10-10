/*
 * LEAGUEPEDIA (lol.fandom.com, Cargo, CC BY-SA 3.0). La bibliothèque de
 * scripts/build_splits.mjs et de scripts/catalogue.mjs.
 *
 * PAR LA PAGE D'EXPORT, PAS PAR L'API. Mesuré le 10 octobre 2026 : l'API
 * (`api.php?action=cargoquery`) refuse l'anonyme après la première requête,
 * depuis un conteneur comme depuis les machines de GitHub, pendant plus d'une
 * demi-heure. `Special:CargoExport` rend les mêmes tables, sans compte, sans
 * cette limite, et en JSON typé : les nombres en nombres, une valeur absente
 * en null, un champ en liste (les objets) en tableau.
 *
 * On reste poli quand même : une requête à la fois, une pause entre chacune,
 * et on attend quand le serveur répond mal.
 */

const EXPORT = 'https://lol.fandom.com/wiki/Special:CargoExport';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const PAUSE = 1500;          // entre deux requêtes
const PAGE = 500;

const dormir = ms => new Promise(r => setTimeout(r, ms));

/* L'export rend le texte échappé pour le HTML (« Nunu &amp; Willump ») : on le rend tel quel. */
const ENTITES = { '&amp;': '&', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const texte = v => (typeof v === 'string' ? v.replace(/&(amp|quot|#0?39|lt|gt);/g, e => ENTITES[e]) : Array.isArray(v) ? v.map(texte) : v);

/* Une requête d'export ; un champ inconnu rend une ligne d'erreur en texte, qu'on renvoie telle quelle. */
async function exporter(params) {
  const url = `${EXPORT}?${new URLSearchParams({ ...params, format: 'json' })}`;
  for (let essai = 0; ; essai++) {
    await dormir(PAUSE);
    const rep = await fetch(url, { headers: { 'User-Agent': AGENT } });
    const corps = await rep.text();
    if (rep.ok && corps.trim().startsWith('[')) return JSON.parse(corps).map(l => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, texte(v)])));
    if (corps.startsWith('Error:')) return corps.trim();
    if (essai >= 5) throw new Error(`${params.tables} : ${rep.status} ${corps.slice(0, 200)}`);
    console.log(`  ${rep.status}, on attend ${15 * 2 ** essai} s`);
    await dormir(15000 * 2 ** essai);
  }
}

/**
 * `voulus` : { alias: 'Champ' }. Rend des lignes { alias: valeur }. Un champ
 * que la table n'a pas est retiré de la demande (et dit), plutôt que de faire
 * échouer toute la requête.
 */
export async function cargo(table, voulus, where) {
  const champs = { ...voulus };
  const lignes = [];
  for (let offset = 0; ; ) {
    const rep = await exporter({ tables: table, fields: Object.entries(champs).map(([a, c]) => `${c}=${a}`).join(','), where, limit: PAGE, offset, 'order by': `${table}._ID` });
    if (typeof rep === 'string') {
      const inconnu = (rep.match(/No field named "([^"]+)"/) || [])[1];
      const alias = Object.keys(champs).find(a => champs[a] === inconnu);
      if (!alias) throw new Error(`${table} : ${rep}`);
      console.log(`  ${table} n'a pas de champ ${inconnu} : on s'en passe`);
      delete champs[alias];
      continue;
    }
    lignes.push(...rep);
    if (rep.length < PAGE) return lignes;
    offset += PAGE;
  }
}
