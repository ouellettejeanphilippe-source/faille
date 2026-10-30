/*
 * LE COMMENTATEUR DU DIRECT (repris de Cap 82-0, js/commentaire.js). Il ne
 * décide rien : il lit le fil de la feuille (js/moteur.js) et dit chaque
 * événement — une élimination, un objectif, une tour, un inhibiteur qui tombe
 * ou qui repousse, le nexus.
 *
 * Une phrase se MONTE, pièce par pièce : un cri, l'action (l'ultime de son
 * champion, quand il y passe), une couleur lue dans la partie (le premier
 * sang, une double élimination, un pentakill, la fin d'une série et sa prime,
 * l'Embrasement qui achève, le Flash brûlé pour rien, l'âme et son type, le
 * vol au Châtiment, le camp qui revient de loin à l'or). Chaque pièce vient de
 * sa banque, et les banques se TIRENT EN PAQUET : une pièce ne revient pas
 * avant que toute sa banque soit passée, donc une partie ne radote pas. Le
 * paquet est brassé par la graine de la partie : revoir la même partie redit
 * les mêmes phrases.
 *
 * Il ne dit pas tout : chaque sbire et chaque plaque, non ; la première
 * plaque, le premier niveau 6, le premier objet complété, une fuite au Flash
 * sur deux, oui. Les moments qui comptent, pas le bruit.
 *
 * Les gabarits : {t} le tueur, {v} la victime, {eq} l'équipe qui agit,
 * {autre} l'autre, {n} un nombre, {champ} le champion du tueur, {ult} son
 * ultime, {x} ce dont on parle (un sort, un dragon, une tour, un objet).
 * Pur : scripts/check_commentaire.mjs l'éprouve sur des milliers de parties.
 */
import { hasard, graineDe } from './hasard.js';
import { nomCourt } from './util.js';

export const BANQUES = {
  cri: ['Oh !', 'Et voilà !', 'Regardez-moi ça !', 'Ouf !', 'Quelle lecture !', 'Bang !', 'Incroyable !', 'Pas de pitié !', 'C\'est propre !', 'Ça craque !', 'Sans hésiter !', 'Tout en finesse !'],
  elim: [
    '{t} attrape {v}.', '{t} élimine {v}.', '{t} met {v} au tapis.', '{v} tombe sous les coups de {t}.', '{t} ne rate pas {v}.',
    '{t} surprend {v} dans le brouillard.', '{v} s\'est trop avancé : {t} le punit.', '{t} achève {v} au bout de sa course.', '{t} piège {v}.',
    '{t} sort {v} du combat.', '{v} cherchait la sortie ; {t} la lui ferme.', '{t} plonge et prend {v}.', '{t} cueille {v} sans se presser.',
  ],
  champ: ['{t}, sur {champ},', '{champ} — {t} aux commandes —', 'Le {champ} de {t}'],
  champElim: ['élimine {v}.', 'attrape {v}.', 'met {v} au tapis.', 'piège {v}.', 'ne laisse aucune chance à {v}.'],
  ultime: ['{t} lance {ult} : {v} n\'y survit pas.', '{ult} ! {t} efface {v}.', '{t}, {ult}, et {v} tombe.', 'L\'ultime de {t}, {ult}, tombe pile sur {v}.'],
  premier: ['Premier sang pour {eq} !', 'Le premier sang tombe du côté de {eq}.', '{eq} ouvre la marque.', 'Le premier sang de la partie, pour {eq}.'],
  serie: ['{t} en est à {n} éliminations.', '{t} est déchaîné : {n} déjà.', 'Ça fait {n} pour {t}.', '{t} ne s\'arrête plus : {n}.'],
  carnage: ['{eq} enchaîne les éliminations !', 'Le combat vire au carnage pour {autre}.', '{eq} nettoie la place.', 'Tout le monde tombe chez {autre} !'],
  double: ['Double élimination pour {t} !', 'Et de deux pour {t} !', '{t} en prend deux d\'un coup !'],
  triple: ['Triple élimination ! {t} est intouchable.', 'Trois d\'un coup pour {t} !', 'TRIPLE ! {t} fait le ménage.'],
  quadra: ['QUADRUPLE élimination pour {t} !', 'Quatre ! {t} cherche le cinquième !', '{t}, quatre d\'affilée !'],
  penta: ['PENTAKILL ! {t} les a tous eus !', 'PENTAKILL POUR {t} ! Du jamais vu cette saison !', 'Cinq sur cinq : PENTAKILL de {t} !'],
  prime: ['Fin de série pour {v} : {n} pièces d\'or pour {eq}.', 'La prime sur {v} tombe : {n} d\'or.', '{t} encaisse la prime de {v}, {n} d\'or.'],
  allume: ['L\'Embrasement de {t} finit le travail.', 'Embrasement, et c\'est terminé.', '{t} avait gardé son Embrasement pour ça.'],
  flashVain: ['Le Flash de {v} n\'y change rien.', '{v} brûle son Flash pour rien.', 'Même le Flash ne sauve pas {v}.'],
  fuite: ['{v} s\'en tire {x} !', '{v} s\'échappe de justesse, {x}.', 'Ouf : {v} survit {x}.', '{v} s\'en sort {x}, au bon moment.'],
  tp: ['Téléportation de {t} : il arrive dans le combat !', '{t} se téléporte sur le combat !', '{eq} fait venir {t} par Téléportation.'],
  dragon: ['{eq} prend {x}.', '{x} tombe pour {eq}.', '{eq} sécurise {x}.', 'Personne pour contester : {x} pour {eq}.', '{eq} s\'offre {x}.'],
  dragonN: ['C\'est le {n}e dragon de {eq}.', '{eq} en compte {n}.', '{n} dragons pour {eq} : ça commence à peser.'],
  ame: ['L\'âme {x} pour {eq} !', '{eq} décroche l\'âme {x} : la suite s\'annonce longue pour {autre}.', 'Quatrième dragon, l\'âme {x} est à {eq} !'],
  terrain: ['La Faille se transforme : le terrain {x} s\'installe.', 'Deux dragons de pris : la Faille prend le terrain {x}.', 'Le terrain {x} : la Faille change de visage.'],
  ancestral: ['Le dragon ancestral pour {eq} : gare à l\'exécution !', '{eq} prend l\'ancestral ; {autre} n\'a plus le droit à l\'erreur.', 'L\'ancestral tombe pour {eq} !'],
  vol: ['VOLÉ ! Le Châtiment de {t} arrache {x} à {autre} !', 'Quel vol ! {t} chipe {x} au Châtiment !', '{t} vole {x} sous le nez de {autre} !'],
  heraut: ['{eq} prend le héraut.', 'Le héraut file avec {eq}.', '{eq} s\'empare du héraut.', 'Le héraut change de camp : {eq}.'],
  larves: ['{eq} prend {n} larves du Néant.', 'Les larves pour {eq} : {n} de plus.', '{eq} nettoie le nid : {n} larves.'],
  atakhan: ['{eq} terrasse Atakhan !', 'Atakhan tombe devant {eq}.', '{eq} vient à bout d\'Atakhan.'],
  nashor: ['Le Nashor pour {eq} !', '{eq} s\'offre le Nashor !', 'Nashor à {eq} : la carte s\'ouvre.', '{eq} prend le Nashor, et {autre} recule.', 'Le baron tombe : {eq} en profite.'],
  tour: ['Une tour tombe pour {eq}.', '{eq} fait tomber une tour.', '{eq} rase une tour.', 'Encore une tour pour {eq}.', 'La tour cède devant {eq}.'],
  premiereTour: ['La première tour de la partie, pour {eq}.', '{eq} fait tomber la première tour.', 'Première tour à {eq}.'],
  tourLigne: ['{x} tombe pour {eq}.', '{eq} fait tomber {x}.', '{eq} rase {x}.', 'Encore une tour pour {eq} : {x}.', '{x} cède devant {eq}.'],
  premiereTourLigne: ['La première tour de la partie, pour {eq} : {x}.', '{eq} fait tomber la première tour, {x}.', 'Première tour à {eq} : {x}.'],
  charge: ['Le héraut charge : {x} tombe pour {eq}.', 'La charge du héraut fait tomber {x}.'],
  plaque: ['Première plaque de la partie pour {eq}.', '{eq} arrache la première plaque.'],
  inhib: ['L\'inhibiteur tombe : {eq} entre dans la base.', '{eq} fait sauter un inhibiteur.', 'Un inhibiteur de moins pour {autre}.'],
  inhibLigne: ['L\'inhibiteur {x} tombe : les super-sbires de {eq} arrivent.', '{eq} fait sauter l\'inhibiteur {x}.', 'Plus d\'inhibiteur {x} pour {autre}.'],
  repousse: ['L\'inhibiteur {x} de {eq} repousse.', '{eq} retrouve son inhibiteur {x}.', 'L\'inhibiteur {x} est de retour pour {eq}.'],
  nexus: ['Le nexus explose : victoire de {eq} !', '{eq} fait tomber le nexus. C\'est fini !', 'Et c\'est la fin : {eq} l\'emporte !', 'Le nexus de {autre} s\'effondre : {eq} gagne !'],
  remontee: ['{eq} revient de loin à l\'or !', 'Le vent tourne : {eq} reprend la tête à l\'or.', '{eq} efface son retard.'],
  niveau6: ['{t} atteint le niveau 6 le premier : son ultime est là.', 'Premier niveau 6 de la partie : {t}.'],
  objet: ['Premier objet complété de la partie : {t}, {x}.', '{t} complète {x}, le premier de la partie.'],
};

/* Les mots du moteur d'aujourd'hui : le type d'un dragon, une ligne, le palier d'une tour. */
const DRAGON = { infernal: 'le dragon infernal', montagne: 'le dragon de la montagne', ocean: 'le dragon de l\'océan', nuage: 'le dragon des nuages', hextech: 'le dragon hextech', chimtech: 'le dragon chimtech' };
const AME = { infernal: 'infernale', montagne: 'de la montagne', ocean: 'de l\'océan', nuage: 'des nuages', hextech: 'hextech', chimtech: 'chimtech' };
export const TERRAIN = { infernal: 'infernal', montagne: 'de la montagne', ocean: 'de l\'océan', nuage: 'des nuages', hextech: 'hextech', chimtech: 'chimtech' };
const LIGNE = { haut: 'du haut', milieu: 'du milieu', bas: 'du bas' };
const PALIER = ['la tour extérieure', 'la tour intérieure', 'la tour de l\'inhibiteur'];
const tourDe = x => (x.ligne === null ? 'une tour du nexus' : `${PALIER[x.palier]} ${LIGNE[x.ligne]}`);
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
/* Comment on s'en tire, sort par sort. */
const FUITE = { F: 'au Flash', G: 'au Fantôme', H: 'grâce à ses Soins', B: 'grâce à sa Barrière' };

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
 * LES OBJETS COMPLÉTÉS d'une partie (le moteur d'aujourd'hui), lus dans la
 * feuille : les objets les plus achetés de chaque joueur dans son split (ceux
 * que data/champions.json dit complétés), dans leur ordre, chacun à la minute
 * où son or gagné en paie le prix — après le départ, les potions et les
 * balises (OBJETS_AVANT). `ch` : data/champions.json. Rend [camp][joueur] → [{ nom, o, t }].
 */
const OBJETS_AVANT = 850, OBJETS_MAX = 6;
export function objetsCompletes(f, ch) {
  return f.equipes.map((e, x) => e.joueurs.map((j, i) => {
    const out = [];
    let du = OBJETS_AVANT;
    for (const nom of j.objets || []) {
      const o = ch && ch.objets && ch.objets[nom];
      if (!o || out.length >= OBJETS_MAX) continue;
      du += o[2];
      const m = (f.orJoueurs || []).findIndex(or => or[x][i] >= du);
      if (m < 0) break;
      out.push({ nom, o, t: m + 1 });
    }
    return out;
  }));
}

/**
 * LE COMMENTAIRE D'UNE PARTIE : une ligne par événement du fil qui compte, dans l'ordre.
 * `f` : la feuille ; `noms` : les noms des deux camps [bleu, rouge] ;
 * `champs` : [bleu, rouge] → { rôle : champion } (le repêchage), ou null ;
 * `graine` : celle de la partie ; `ch` : data/champions.json (les ultimes, les
 * objets), ou null. Rend [{ t, quoi, camp, texte }].
 */
export function commenter(f, noms, champs, graine, ch = null) {
  const tirer = paquets(graine);
  const de = hasard(graineDe(graine, 'couleur'));
  const out = [];
  const elims = [0, 0].map(() => [0, 0, 0, 0, 0]);
  const compte = { elim: [0, 0], tour: [0, 0], dragon: [0, 0] };
  let premier = true, premiereTour = true, premierePlaque = true;
  let dernieres = [];   // les éliminations de la dernière minute, pour le carnage
  const nomDe = (camp, i) => nomCourt(f.equipes[camp].joueurs[i].n);
  for (const x of f.fil) {
    const eq = noms[x.camp], autre = noms[1 - x.camp];
    let texte;
    if (x.quoi === 'elim') {
      const t = nomDe(x.camp, x.tueur);
      const v = nomDe(1 - x.camp, x.victime);
      const champ = champs && champs[x.camp] ? champs[x.camp][f.equipes[x.camp].joueurs[x.tueur].r] : null;
      const ult = x.ult && champ && ch && ch.ultimes && de() < 0.6 ? ch.ultimes[champ] : null;
      elims[x.camp][x.tueur]++;
      compte.elim[x.camp]++;
      dernieres = dernieres.filter(y => x.t - y.t < 1).concat([x]);
      const vals = { t, v, eq, autre, champ, ult, n: elims[x.camp][x.tueur] };
      const action = ult ? remplir(tirer('ultime'), vals)
        : champ && de() < 0.35 ? `${remplir(tirer('champ'), vals)} ${remplir(tirer('champElim'), vals)}` : remplir(tirer('elim'), vals);
      const morceaux = [de() < 0.3 ? tirer('cri') : null, action];
      // Ce qui colore l'élimination, du plus rare au plus courant : une seule couleur, et parfois les sorts qui y passent.
      const multi = { 2: 'double', 3: 'triple', 4: 'quadra', 5: 'penta' }[x.multi];
      if (premier) morceaux.push(remplir(tirer('premier'), vals));
      else if (multi) morceaux.push(remplir(tirer(multi), vals));
      else if (x.prime) morceaux.push(remplir(tirer('prime'), { ...vals, n: Math.round(x.prime) }));
      else if (dernieres.filter(y => y.camp === x.camp).length >= 3) { morceaux.push(remplir(tirer('carnage'), vals)); dernieres = []; }
      else if (vals.n >= 3 && vals.n % 2 === 1) morceaux.push(remplir(tirer('serie'), vals));
      else if ((x.sorts || []).some(([c, i, s]) => c === x.camp && i === x.tueur && s === 'I') && de() < 0.6) morceaux.push(remplir(tirer('allume'), vals));
      else if ((x.sorts || []).some(([c, , s]) => c !== x.camp && s === 'F') && de() < 0.5) morceaux.push(remplir(tirer('flashVain'), vals));
      premier = false;
      texte = morceaux.filter(Boolean).join(' ');
    } else if (x.quoi === 'dragon') {
      const vals = { eq, autre };
      if (x.vol) {
        vals.t = nomDe(x.camp, 1);
        vals.x = x.ancestral ? 'l\'ancestral' : DRAGON[x.type] || 'le dragon';
        texte = remplir(tirer('vol'), vals);
      } else if (x.ancestral) texte = remplir(tirer('ancestral'), vals);
      else {
        compte.dragon[x.camp]++;
        const n = compte.dragon[x.camp];
        Object.assign(vals, { n, x: DRAGON[x.type] || 'le dragon' });
        if (x.ame) texte = remplir(tirer('ame'), { ...vals, x: AME[x.ame] || '' }).replace(/\s+/g, ' ');
        else if (f.moteur !== 2 && n === 4) texte = remplir(tirer('ame'), { ...vals, x: '' }).replace(/\s+/g, ' ');
        else texte = `${majuscule(remplir(tirer('dragon'), vals))}${n >= 2 ? ` ${remplir(tirer('dragonN'), vals)}` : ''}`;
        if (x.terrain) texte = `${texte} ${remplir(tirer('terrain'), { x: TERRAIN[x.terrain] || '' })}`;
      }
    } else if (x.quoi === 'nashor' || x.quoi === 'heraut') {
      texte = x.vol ? remplir(tirer('vol'), { eq, autre, t: nomDe(x.camp, 1), x: x.quoi === 'nashor' ? 'le Nashor' : 'le héraut' }) : remplir(tirer(x.quoi), { eq, autre });
    } else if (x.quoi === 'tour') {
      compte.tour[x.camp]++;
      // Le moteur d'aujourd'hui dit la ligne et le palier de la tour ; celui d'avant, non.
      const ligne = x.ligne !== undefined;
      const vals = { eq, autre, x: ligne ? tourDe(x) : '' };
      texte = majuscule(remplir(tirer(x.heraut && ligne ? 'charge' : premiereTour ? (ligne ? 'premiereTourLigne' : 'premiereTour') : ligne ? 'tourLigne' : 'tour'), vals));
      premiereTour = false;
    } else if (x.quoi === 'inhib') texte = x.ligne ? remplir(tirer('inhibLigne'), { eq, autre, x: LIGNE[x.ligne] }) : remplir(tirer('inhib'), { eq, autre });
    else if (x.quoi === 'repousse') texte = remplir(tirer('repousse'), { eq, x: LIGNE[x.ligne] });
    else if (x.quoi === 'larves') texte = remplir(tirer('larves'), { eq, n: x.n });
    else if (x.quoi === 'plaque') {
      if (!premierePlaque) continue;
      premierePlaque = false;
      texte = remplir(tirer('plaque'), { eq });
    } else if (x.quoi === 'fuite') {
      if (de() >= 0.5) continue;
      texte = remplir(tirer('fuite'), { v: nomDe(x.camp, x.i), x: FUITE[x.sort] || 'de justesse' });
    } else if (x.quoi === 'tp') {
      if (de() >= 0.7) continue;
      texte = remplir(tirer('tp'), { t: nomDe(x.camp, x.i), eq });
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
  // Le premier niveau 6 de la partie, et le premier objet complété : lus à la minute.
  const n6 = (f.niveaux || []).findIndex(m => m.some(eq => eq.some(n => n >= 6)));
  if (n6 >= 0 && n6 + 1 < f.duree) {
    const camp = f.niveaux[n6][0].some(n => n >= 6) ? 0 : 1;
    out.push({ t: n6 + 1, quoi: 'niveau', camp, texte: remplir(tirer('niveau6'), { t: nomDe(camp, f.niveaux[n6][camp].findIndex(n => n >= 6)) }) });
  }
  if (f.moteur === 2 && ch) {
    const premiers = objetsCompletes(f, ch).flatMap((eq, camp) => eq.flatMap((os, i) => (os[0] ? [{ ...os[0], camp, i }] : [])));
    const p = premiers.sort((a, b) => a.t - b.t)[0];
    if (p && p.t < f.duree) out.push({ t: p.t, quoi: 'objet', camp: p.camp, texte: remplir(tirer('objet'), { t: nomDe(p.camp, p.i), x: p.o[1] }) });
  }
  return out.sort((a, b) => a.t - b.t);
}
