/*
 * LE COMMENTATEUR DU DIRECT (repris de Cap 82-0, js/commentaire.js). Il ne
 * décide rien : il lit le fil de la feuille (js/sim.js) et dit chaque
 * événement — une élimination, un objectif, une tour, le nexus.
 *
 * Une phrase se MONTE, pièce par pièce : un cri, l'action, une couleur lue
 * dans la partie (le premier sang, une série d'éliminations, le tueur qui en
 * est à sa cinquième, l'âme au quatrième dragon, le camp qui revient de loin
 * à l'or). Chaque pièce vient de sa banque, et les banques se TIRENT EN
 * PAQUET : une pièce ne revient pas avant que toute sa banque soit passée,
 * donc une partie ne radote pas. Le paquet est brassé par la graine de la
 * partie : revoir la même partie redit les mêmes phrases.
 *
 * Les gabarits : {t} le tueur, {v} la victime, {eq} l'équipe qui agit,
 * {autre} l'autre, {n} un nombre, {champ} le champion du tueur.
 * Pur : scripts/check_commentaire.mjs l'éprouve sur des milliers de parties.
 */
import { hasard, graineDe } from './hasard.js';

export const BANQUES = {
  cri: ['Oh !', 'Et voilà !', 'Regardez-moi ça !', 'Ouf !', 'Quelle lecture !', 'Bang !', 'Incroyable !', 'Pas de pitié !', 'C\'est propre !', 'Ça craque !', 'Sans hésiter !', 'Tout en finesse !'],
  elim: [
    '{t} attrape {v}.', '{t} élimine {v}.', '{t} met {v} au tapis.', '{v} tombe sous les coups de {t}.', '{t} ne rate pas {v}.',
    '{t} surprend {v} dans le brouillard.', '{v} s\'est trop avancé : {t} le punit.', '{t} achève {v} au bout de sa course.', '{t} piège {v}.',
    '{t} sort {v} du combat.', '{v} cherchait la sortie ; {t} la lui ferme.', '{t} plonge et prend {v}.', '{t} cueille {v} sans se presser.',
  ],
  champ: ['{t}, sur {champ},', '{champ} — {t} aux commandes —', 'Le {champ} de {t}'],
  champElim: ['élimine {v}.', 'attrape {v}.', 'met {v} au tapis.', 'piège {v}.', 'ne laisse aucune chance à {v}.'],
  premier: ['Premier sang pour {eq} !', 'Le premier sang tombe du côté de {eq}.', '{eq} ouvre la marque.', 'Le premier sang de la partie, pour {eq}.'],
  serie: ['{t} en est à {n} éliminations.', '{t} est déchaîné : {n} déjà.', 'Ça fait {n} pour {t}.', '{t} ne s\'arrête plus : {n}.'],
  carnage: ['{eq} enchaîne les éliminations !', 'Le combat vire au carnage pour {autre}.', '{eq} nettoie la place.', 'Tout le monde tombe chez {autre} !'],
  dragon: ['{eq} prend le dragon.', 'Le dragon tombe pour {eq}.', '{eq} sécurise le dragon.', 'Personne pour contester : dragon à {eq}.', '{eq} s\'offre le dragon.'],
  dragonN: ['C\'est le {n}e dragon de {eq}.', '{eq} en compte {n}.', '{n} dragons pour {eq} : ça commence à peser.'],
  ame: ['L\'âme du dragon pour {eq} !', '{eq} décroche l\'âme : la suite s\'annonce longue pour {autre}.', 'Quatrième dragon, l\'âme est à {eq} !'],
  heraut: ['{eq} prend le héraut.', 'Le héraut file avec {eq}.', '{eq} s\'empare du héraut.', 'Le héraut change de camp : {eq}.'],
  nashor: ['Le Nashor pour {eq} !', '{eq} s\'offre le Nashor !', 'Nashor à {eq} : la carte s\'ouvre.', '{eq} prend le Nashor, et {autre} recule.', 'Le baron tombe : {eq} en profite.'],
  tour: ['Une tour tombe pour {eq}.', '{eq} fait tomber une tour.', '{eq} rase une tour.', 'Encore une tour pour {eq}.', 'La tour cède devant {eq}.'],
  premiereTour: ['La première tour de la partie, pour {eq}.', '{eq} fait tomber la première tour.', 'Première tour à {eq}.'],
  inhib: ['L\'inhibiteur tombe : {eq} entre dans la base.', '{eq} fait sauter un inhibiteur.', 'Un inhibiteur de moins pour {autre}.'],
  nexus: ['Le nexus explose : victoire de {eq} !', '{eq} fait tomber le nexus. C\'est fini !', 'Et c\'est la fin : {eq} l\'emporte !', 'Le nexus de {autre} s\'effondre : {eq} gagne !'],
  remontee: ['{eq} revient de loin à l\'or !', 'Le vent tourne : {eq} reprend la tête à l\'or.', '{eq} efface son retard.'],
};

/* Un paquet par banque : la banque brassée, tirée sans remise, rebrassée quand elle est vide. */
function paquets(graine) {
  const restes = {};
  return nom => {
    if (!restes[nom] || !restes[nom].length) {
      const de = hasard(graineDe(graine, `${nom}-${(restes[nom] && restes[nom].tour) || 0}`));
      const tour = ((restes[nom] && restes[nom].tour) || 0) + 1;
      const p = [...BANQUES[nom]];
      for (let i = p.length - 1; i > 0; i--) { const k = Math.floor(de() * (i + 1)); [p[i], p[k]] = [p[k], p[i]]; }
      restes[nom] = Object.assign(p, { tour });
    }
    return restes[nom].pop();
  };
}

const remplir = (g, v) => g.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

/**
 * LE COMMENTAIRE D'UNE PARTIE : une ligne par événement du fil, dans l'ordre.
 * `f` : la feuille ; `noms` : les noms des deux camps [bleu, rouge] ;
 * `champs` : [bleu, rouge] → { rôle : champion } (le repêchage), ou null ;
 * `graine` : celle de la partie. Rend [{ t, quoi, camp, texte }].
 */
export function commenter(f, noms, champs, graine) {
  const tirer = paquets(graine);
  const de = hasard(graineDe(graine, 'couleur'));
  const out = [];
  const elims = [0, 0].map(() => [0, 0, 0, 0, 0]);
  const compte = { elim: [0, 0], tour: [0, 0], dragon: [0, 0] };
  let premier = true, premiereTour = true;
  let dernieres = [];   // les éliminations de la dernière minute, pour le carnage
  for (const x of f.fil) {
    const eq = noms[x.camp], autre = noms[1 - x.camp];
    let texte;
    if (x.quoi === 'elim') {
      const t = f.equipes[x.camp].joueurs[x.tueur].n;
      const v = f.equipes[1 - x.camp].joueurs[x.victime].n;
      const champ = champs && champs[x.camp] ? champs[x.camp][f.equipes[x.camp].joueurs[x.tueur].r] : null;
      elims[x.camp][x.tueur]++;
      compte.elim[x.camp]++;
      dernieres = dernieres.filter(y => x.t - y.t < 1).concat([x]);
      const vals = { t, v, eq, autre, champ, n: elims[x.camp][x.tueur] };
      const action = champ && de() < 0.35 ? `${remplir(tirer('champ'), vals)} ${remplir(tirer('champElim'), vals)}` : remplir(tirer('elim'), vals);
      const morceaux = [de() < 0.3 ? tirer('cri') : null, action];
      if (premier) morceaux.push(remplir(tirer('premier'), vals));
      else if (dernieres.filter(y => y.camp === x.camp).length >= 3) { morceaux.push(remplir(tirer('carnage'), vals)); dernieres = []; }
      else if (vals.n >= 3 && vals.n % 2 === 1) morceaux.push(remplir(tirer('serie'), vals));
      premier = false;
      texte = morceaux.filter(Boolean).join(' ');
    } else if (x.quoi === 'dragon') {
      compte.dragon[x.camp]++;
      const n = compte.dragon[x.camp];
      const vals = { eq, autre, n };
      texte = n === 4 ? remplir(tirer('ame'), vals) : `${remplir(tirer('dragon'), vals)}${n >= 2 ? ` ${remplir(tirer('dragonN'), vals)}` : ''}`;
    } else if (x.quoi === 'tour') {
      compte.tour[x.camp]++;
      texte = remplir(tirer(premiereTour ? 'premiereTour' : 'tour'), { eq, autre });
      premiereTour = false;
    } else if (BANQUES[x.quoi]) texte = remplir(tirer(x.quoi), { eq, autre });
    else continue;
    out.push({ t: x.t, quoi: x.quoi, camp: x.camp, texte });
  }
  // La remontée : le camp qui menait à l'or de 3 000 et plus, rattrapé et dépassé.
  const c = f.courbe || [];
  let pire = 0;
  for (let m = 0; m < c.length && m + 1 < f.duree; m++) {
    pire = Math.abs(c[m]) > Math.abs(pire) && Math.sign(c[m]) !== 0 ? c[m] : pire;
    if (Math.abs(pire) >= 3000 && Math.sign(c[m]) === -Math.sign(pire)) {
      const camp = pire > 0 ? 1 : 0;
      out.push({ t: m + 1, quoi: 'remontee', camp, texte: remplir(tirer('remontee'), { eq: noms[camp], autre: noms[1 - camp] }) });
      pire = 0;
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
