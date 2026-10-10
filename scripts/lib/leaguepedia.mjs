/*
 * LEAGUEPEDIA (lol.fandom.com, API Cargo, CC BY-SA 3.0). La bibliothèque de
 * scripts/build_splits.mjs et de scripts/catalogue.mjs.
 *
 * L'API limite le débit : une requête à la fois, une pause entre chacune, et
 * on attend 30 s, 60 s, 120 s… quand elle répond « ratelimited ».
 *
 * ANONYME, ON NE PASSE PAS. Mesuré le 10 octobre 2026 : depuis un conteneur
 * comme depuis les machines de GitHub, la première requête passe et la
 * suivante est refusée pendant plus d'une demi-heure. Un compte Fandom avec un
 * MOT DE PASSE DE ROBOT (Special:BotPasswords sur lol.fandom.com) a une
 * limite bien plus large. Le script se connecte quand LEAGUEPEDIA_USER
 * (« Compte@robot ») et LEAGUEPEDIA_PASS sont dans l'environnement ; dans
 * l'Action, ce sont deux secrets du dépôt du même nom.
 */

const API = 'https://lol.fandom.com/api.php';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const PAUSE = 3000;          // entre deux requêtes
const PAGE = 500;            // le maximum de Cargo

const dormir = ms => new Promise(r => setTimeout(r, ms));

/* La session : les témoins que l'API pose, rendus à chaque requête. */
const temoins = new Map();
async function requete(url, options = {}) {
  const rep = await fetch(url, { ...options, headers: { 'User-Agent': AGENT, Cookie: [...temoins].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers } });
  for (const c of rep.headers.getSetCookie()) {
    const [paire] = c.split(';');
    const i = paire.indexOf('=');
    temoins.set(paire.slice(0, i).trim(), paire.slice(i + 1).trim());
  }
  return rep.json();
}

let connexion = null;
/* Se connecte une fois avec le mot de passe de robot, s'il y en a un. */
function connecter() {
  const { LEAGUEPEDIA_USER: nom, LEAGUEPEDIA_PASS: mdp } = process.env;
  if (!nom || !mdp) {
    console.log('Leaguepedia : anonyme (LEAGUEPEDIA_USER et LEAGUEPEDIA_PASS absents) — la limite de débit risque de tout bloquer.');
    return Promise.resolve();
  }
  connexion ??= (async () => {
    const jeton = (await requete(`${API}?action=query&meta=tokens&type=login&format=json`)).query.tokens.logintoken;
    const rep = await requete(API, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'login', format: 'json', lgname: nom, lgpassword: mdp, lgtoken: jeton }) });
    if (rep.login?.result !== 'Success') throw new Error(`Leaguepedia : connexion refusée (${rep.login?.reason || rep.login?.result})`);
    console.log(`Leaguepedia : connecté comme ${rep.login.lgusername}`);
  })();
  return connexion;
}

async function api(params) {
  await connecter();
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let essai = 0; ; essai++) {
    await dormir(PAUSE);
    const rep = await requete(url);
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
