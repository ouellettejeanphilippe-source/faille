/*
 * LES ADJOINTS : UNE MAIN, DES SÉJOURS, UN STYLE (Cap 82-0, la V22, js/adjoints.js ; docs/parite-cap82.md D7, D8,
 * D11 ; la Q7 : un split vaut une saison). Le staff de la V21 est parti, et le plan de jeu de quinze cartes avec lui
 * (la Q1) : ses meilleures idées sont ici, des styles.
 *
 * SIMPLE. Un adjoint est une carte : un style de jeu, ce qu'il donne et ce qu'il coûte, en vraies stats de partie
 * (js/impact.js), et un séjour, en journées. Ta MAIN tient `MAIN_MAX` cartes, en poste comprises. Tu en POSTES une quand
 * tu veux (Bureau › Coach) : elle joue `SEJOUR` journées, puis revient dans ta main et se repose `REPOS` journées avant
 * de se rejouer. Une ronde de séries compte pour une journée : le séjour se compte en séries jouées. Les cases en poste
 * suivent le niveau du coach (`CASES_PAR_NIVEAU`) : une au niveau 1, deux au 3, trois au 5.
 *
 * IMPACTANT, SANS ÊTRE UNE FORCE. Posté à chaque partie, un style vaudrait de +0,07 à +0,22 victoire par split
 * (mesuré en paires sur 32 ligues) ; une carte ne joue jamais plus de la moitié des parties (`SEJOUR_SYNERGIE / (SEJOUR_SYNERGIE + REPOS)`),
 * et reste ainsi sous la borne d'une peu commune de Cap 82-0 ramenée à un split (±0,33 V) — `check_rogue`. Ce qu'il
 * change, c'est la feuille : la durée, les éliminations, les dragons, les tours.
 *
 * LE FUN. Poster une carte est un choix de moment : la plongée contre un cinq qui lane mal, le gardien du tardif contre
 * celui qui ferme vite. Un style qui rejoint ton coach (`voie`) dure `SEJOUR_SYNERGIE` journées au lieu de `SEJOUR` : la
 * synergie, pas un chiffre plus gros. Deux styles par coach : Cap 82-0 en a un par philosophie et huit coachs ; Faille
 * en a quatre (la D5 viendra). Les cartes arrivent un parmi trois, gratuites, aux journées `JOURNEES_ADJOINTS`, au cadeau
 * du proprio et dans une histoire ; une main pleine laisse partir la plus ancienne hors poste, et l'offre le dit.
 *
 * MARQUANT. La carte se souvient : ses séjours, avec ce que ton cinq y a fait (`sejoursDe`). Chacune a une réplique
 * (`dit`), sans chiffre.
 *
 * Pur : la main est l'état d'une partie (js/partie.js), `[{ cle, poses: [g…] }]` — chaque pose, le compte de tes séries
 * jouées dans la run (`R.joue.length`) au moment de poster. Le reste se déduit : en poste tant que `g − pose < séjour`,
 * au repos tant que `g − pose < séjour + REPOS`, prête après.
 */
import { hasard, graineDe } from './hasard.js';

export const SEJOUR = 3;
export const SEJOUR_SYNERGIE = 4;
export const REPOS = 4;
export const MAIN_MAX = 4;
/* Les cases en poste, par niveau du coach (1 à 5). */
export const CASES_PAR_NIVEAU = [1, 1, 2, 2, 3];
/* Les journées d'une offre (Cap 82-0 : ses paliers de pack, au prorata d'un split de dix-huit). */
export const JOURNEES_ADJOINTS = [2, 7, 11, 15];
export const casesDuNiveau = n => CASES_PAR_NIVEAU[Math.min(CASES_PAR_NIVEAU.length, Math.max(1, n || 1)) - 1];

/*
 * Les huit styles, deux par coach (`voie` : la clé de son coach, js/rogue.js COACHS). `effet` : les canaux du moteur,
 * sur ton cinq, le temps de son séjour ; chacun donne quelque chose et en paie le prix, sans jamais payer en héraut
 * (une époque ne le connaît pas, MOTEUR.md § 10).
 */
export const ADJOINTS = {
  plongee: { ico: '🗡️', nom: 'Le spécialiste de la plongée', style: 'Plonger sous la tour', voie: 'agresseur',
    dit: 'Une tour, ça se traverse. On y va à trois et on ressort à trois.',
    effet: { ligne: 0.12, rythme: 1.15, objectifs: -0.15 } },
  escarmouches: { ico: '⚡', nom: 'L\'entraîneur des escarmouches', style: 'Les escarmouches', voie: 'agresseur',
    dit: 'Dans la jungle, chaque buisson est une occasion. On ne la laisse pas passer.',
    effet: { combat: 0.1, rythme: 1.1, ligne: -0.04 } },
  dragons: { ico: '🐉', nom: 'Le maître des dragons', style: 'Le fleuve d\'abord', voie: 'stratege',
    dit: 'Chaque dragon compte. L\'âme, c\'est la partie.',
    effet: { dragons: 1.2, nashor: -0.3 } },
  vision: { ico: '👁️', nom: 'Le coach de vision', style: 'Voir avant d\'y aller', voie: 'stratege',
    dit: 'Une balise au bon buisson vaut un combat gagné.',
    effet: { objectifs: 0.2, rythme: 0.92, ligne: -0.04 } },
  tardif: { ico: '⏳', nom: 'Le gardien du tardif', style: 'Attendre le Nashor', voie: 'patient',
    dit: 'Pas de panique au début. Notre heure vient avec le Nashor.',
    effet: { nashor: 1.2, fin: 0.9, ligne: -0.05 } },
  ferme: { ico: '🌾', nom: 'Le maître de la ferme', style: 'Les sbires d\'abord', voie: 'patient',
    dit: 'Chaque sbire, c\'est de l\'or. On grossit, et on frappe plus tard.',
    effet: { ligne: 0.1, rythme: 0.9, combat: -0.12 } },
  ingenieur: { ico: '🏰', nom: 'L\'ingénieur de siège', style: 'La pression de côté', voie: 'assiegeant',
    dit: 'Une ligne poussée, c\'est deux joueurs d\'en face qui doivent y répondre.',
    effet: { split: 1, siege: 1.15, combat: -0.24 } },
  finisseur: { ico: '🔨', nom: 'Le finisseur', style: 'Fermer la partie', voie: 'assiegeant',
    dit: 'En avance, on ne joue pas avec sa nourriture : on finit.',
    effet: { combat: 0.08, fin: 1.1, objectifs: -0.1 } },
};

/** Le séjour d'un adjoint chez un coach : plus long s'il le rejoint. */
const sejourDe = (cle, coach) => (ADJOINTS[cle].voie === coach ? SEJOUR_SYNERGIE : SEJOUR);

/** Où en est une carte de la main, au compte `g` de tes séries jouées : { etat ('poste', 'repos', 'prete'), reste (en journées) }. */
export function etatDe(c, g, coach) {
  const p = c.poses[c.poses.length - 1];
  if (p === undefined) return { etat: 'prete', reste: 0 };
  const s = sejourDe(c.cle, coach);
  if (g - p < s) return { etat: 'poste', reste: s - (g - p) };
  if (g - p < s + REPOS) return { etat: 'repos', reste: s + REPOS - (g - p) };
  return { etat: 'prete', reste: 0 };
}
/** Les cartes en poste. */
const postesDe = (main, g, coach) => main.filter(c => etatDe(c, g, coach).etat === 'poste');
/** Les cases libres, au niveau du coach. */
export const casesLibres = (main, g, coach, niveau) => Math.max(0, casesDuNiveau(niveau) - postesDe(main, g, coach).length);
/** Les canaux des cartes en poste, pour la partie qui vient. */
export const effetsDesPostes = (main, g, coach) => postesDe(main, g, coach).map(c => ADJOINTS[c.cle].effet);

/** Trois adjoints offerts (un moment `cle` de la run), tirés de la graine parmi ceux qui ne sont pas dans la main. */
export function adjointsOfferts(main, graine, cle, n = 3) {
  const de = hasard(graineDe(graine, `adjoints-${cle}`));
  const libres = Object.keys(ADJOINTS).filter(k => !main.some(c => c.cle === k));
  for (let i = libres.length - 1; i > 0; i--) { const k = Math.floor(de() * (i + 1)); [libres[i], libres[k]] = [libres[k], libres[i]]; }
  return libres.slice(0, n);
}
/** Celle qu'une main pleine laisse partir à la prochaine arrivée : la plus ancienne hors poste ; personne si elle a de la place. */
export const quiPartDeLaMain = (main, g, coach) => (main.length >= MAIN_MAX ? (main.find(c => etatDe(c, g, coach).etat !== 'poste') || {}).cle || null : null);

/** Les séjours d'une carte, et ce que ton cinq y a fait : [{ debut, fin, v, d }] ; `joue` : tes séries jouées (R.joue). */
export const sejoursDe = (c, joue, coach) => c.poses.map(p => {
  const s = joue.slice(p, p + sejourDe(c.cle, coach));
  return { debut: p, fin: p + s.length, v: s.filter(x => x.gagne).length, d: s.filter(x => !x.gagne).length };
});
