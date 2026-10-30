/*
 * LA CARTE D'UN JOUEUR : UN CARTON 5:7, RECTO VERSO (Cap 82-0, js/cartes.js
 * `cartonHtml` ; JP : *j'aime vraiment le format carte de hockey* ; *mettre
 * les stats derrière la carte*). Le recto est la carte : la photo dans la
 * fenêtre de sa série, le rôle en haut à gauche, le ruban du niveau, l'édition
 * en haut à droite, le nom sur sa plaque, le logo de l'équipe, ses trois
 * champions, les petits caractères (le numéro de la carte, l'année, la série).
 * Le verso, sur la même coque : les vraies stats, le bassin, ses stats chez
 * toi, ses galons, le crédit de la photo. La toucher la retourne.
 *
 * UNE SÉRIE PAR ANNÉE, 2011 → 2025 (`SERIES`, style.css « LES SÉRIES » ; JP :
 * *chaque année devra être différente*) : chacune complète — le carton, la
 * fenêtre, la plaque du nom, sa police (fonts/, OFL), ses ornements —,
 * inspirée du client et des sites de l'esport de cette année-là. Inspiré,
 * jamais copié : aucune police, aucun logo, aucun élément de Riot n'est
 * repris (CLAUDE.md). Le SPLIT choisit la série, l'ÉQUIPE la palette,
 * l'ÉDITION la parallèle.
 *
 * LES ÉDITIONS (`EDITIONS`, js/meta.js) suivent les copies d'une carte à ta
 * collection et changent la carte entière : Base ; Cadre (le métal brossé
 * tout autour) ; Hors-cadre (la photo sort de sa fenêtre et prend la carte) ;
 * Or (le cadre et le nom en feuille d'or, la lumière qui suit la main) ; Holo
 * (le prisme qui tourne, l'arc-en-ciel, le tirage numéroté). Une édition ne
 * change rien au jeu : c'est la vitrine.
 *
 * Aucune cote ici : le niveau, les badges, les vraies stats.
 */
import { esc, virgule, pts, nomCourt } from './util.js';
import { imageLP, iconeChampion, illustration } from './images.js';
import { GALONS } from './palmares.js';
import { editionDe, EDITIONS } from './meta.js';
import { graineDe } from './hasard.js';

export const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };

/*
 * LES SÉRIES, une par année. Le dessin de chacune est décrit sur sa règle,
 * dans style.css « LES SÉRIES » ; une année sans série prend la dernière qui
 * en a une.
 */
export const SERIES = {
  pionnier: { nom: 'Pionnier', annee: 2011 },
  acier: { nom: 'Acier', annee: 2012 },
  fleuve: { nom: 'Fleuve', annee: 2013 },
  nuit: { nom: 'Nuit', annee: 2014 },
  filet: { nom: 'Filet d\'or', annee: 2015 },
  cristal: { nom: 'Cristal', annee: 2016 },
  losange: { nom: 'Losange', annee: 2017 },
  prisme: { nom: 'Prisme', annee: 2018 },
  neon: { nom: 'Néon', annee: 2019 },
  eclipse: { nom: 'Éclipse', annee: 2020 },
  spectre: { nom: 'Spectre', annee: 2021 },
  rupture: { nom: 'Rupture', annee: 2022 },
  mondial: { nom: 'Mondial', annee: 2023 },
  monochrome: { nom: 'Monochrome', annee: 2024 },
  aurore: { nom: 'Aurore', annee: 2025 },
};
const PAR_ANNEE = Object.entries(SERIES).map(([cle, s]) => [s.annee, cle]);
export function serieDe(annee) {
  let serie = PAR_ANNEE[0][1];
  for (const [a, cle] of PAR_ANNEE) if (annee >= a) serie = cle;
  return serie;
}

/* LE NUMÉRO DE LA CARTE ET LE TIRAGE : une vraie série numérote ses cartes ; une Holo porte son tirage limité. Les deux se déduisent de la clé. */
const TAILLE_SERIE = 300;
export const TIRAGE_HOLO = 25;
const numeroDe = cle => 1 + (graineDe(0, cle) % TAILLE_SERIE);
const tirageDe = cle => 1 + (graineDe(1, cle) % TIRAGE_HOLO);

/*
 * LA PALETTE D'UNE ÉQUIPE. Les shards n'ont pas encore les vraies couleurs des
 * équipes (LIVRAISON, jalon 1 ter) : d'ici là, une teinte déduite du nom, la
 * même partout pour la même équipe. --band la couleur, --vive sa lumière,
 * --ink l'encre dessus.
 */
function paletteDe(nom) {
  const h = graineDe(2, nom) % 360;
  return `--band:hsl(${h} 52% 36%);--vive:hsl(${h} 90% 62%);--ink:#fff;--fonce:hsl(${h} 40% 14%)`;
}

const ere = annee => `cs-${serieDe(annee)}`;
const initiales = n => esc(String(n).replace(/\s*\(.*\)$/, '').slice(0, 2).toUpperCase());
const parMin = (t, dec = 1) => (t && t[1] ? virgule(t[0] / t[2], dec) : null);
export const badge = b => `<span class="badge pal-${b.palier.toLowerCase()}">${b.ico} ${esc(b.nom)} ${b.palier}</span>`;
/* Le nom affiché : sans la parenthèse du vrai nom ; la longueur règle la taille de la plaque (style.css `--n`). */

/** La petite photo d'une ligne du vestiaire. */
export const vignette = j => `<span class="vignette">${initiales(j.n)}${j.photo ? `<img src="${imageLP(j.photo)}" alt="" loading="lazy">` : ''}</span>`;

/** L'écusson d'un club : un blason à ses couleurs et son code de trois lettres (un dessin à nous, comme les clubs inventés). */
export const ecussonHtml = club => `<svg class="ecusson" viewBox="0 0 40 44" aria-hidden="true"${club.couleur ? ` style="--club:${club.couleur}"` : ''}>
  <path class="ecusson-fond" d="M20 2 L37 8 V22 C37 32 29 38 20 42 C11 38 3 32 3 22 V8 Z"/><path class="ecusson-filet" d="M20 6 L33 11 V22 C33 30 27 35 20 38 C13 35 7 30 7 22 V11 Z"/>
  <text class="ecusson-code" x="20" y="25">${esc(club.code || '')}</text></svg>`;

/** Le coût d'un joueur sous le plafond : le chiffre, son unité dessous. */
export const coutHtml = n => `<span class="cout"><b>${n}</b><small>${pts(n).split(' ')[1]}</small></span>`;

/** Les icônes de champions d'une ligne (les trois plus joués). */
export const icones = (champions, j, n = 3) => j.champs.slice(0, n).map(([c]) => {
  const src = iconeChampion(champions, c);
  return src ? `<img class="ico-champ" src="${src}" alt="${esc(c)}" title="${esc(c)}" loading="lazy">` : `<span class="ico-champ">${esc(c.slice(0, 2))}</span>`;
}).join('');

/**
 * LA CARTE ENTIÈRE : le carton recto, le verso, la plaque sous la carte (ses
 * badges, son coût, « ↻ »), et « Signer ». `refus` : pourquoi il ne se signe
 * pas (le rôle est comblé, trop cher), ou null ; `bouton` : faux hors du
 * vestiaire (aucun « Signer ») ; `collection` : { copies, galons } quand elle
 * est à ta collection (son édition, ses galons gravés) ; `chezToi` : ses
 * stats dans ta ligue, en une ligne.
 */
export function carte({ split, equipe, j, profil, champions, refus, bouton = true, collection = null, chezToi = null }) {
  const copies = collection ? collection.copies : 0;
  const ed = editionDe(copies);
  const edId = EDITIONS.find(([, nom]) => nom === ed)[2];
  const serie = serieDe(split.annee);
  const cle = `${split.id}|${equipe.nom}|${j.n}|${j.r}`;
  const fond = illustration(champions, j.champs[0] && j.champs[0][0]);
  const nom = nomCourt(j.n);
  const stats = [
    ['Parties', `${j.pj} (${j.v}-${j.pj - j.v})`],
    ['KDA', virgule((j.k + j.a) / Math.max(1, j.m), 1)],
    ['CS/min', parMin(j.cs)],
    ['Or/min', parMin(j.or, 0)],
    ['Dégâts/min', parMin(j.deg, 0)],
    ['Vision/min', parMin(j.vision, 2)],
  ].filter(([, v]) => v !== null);
  const bassin = j.champs.map(([c, pj, v]) => {
    const src = iconeChampion(champions, c);
    return `<li>${src ? `<img src="${src}" alt="" loading="lazy">` : '<span class="ico-vide"></span>'}<b>${esc(c)}</b><small>${pj} · ${v}-${pj - v}</small></li>`;
  }).join('');
  const graves = collection && collection.galons.length
    ? `<h4>Ses galons</h4><ul class="verso-galons">${collection.galons.map(g => `<li>${GALONS[g.id][0]} <b>${esc(GALONS[g.id][1])}</b> · ${esc(g.quoi)} · run ${g.run}</li>`).join('')}</ul>` : '';
  const niveauClasse = profil.niveau.startsWith('★') ? ` etoile${profil.niveau.includes('Phénomène') ? ' phenomene' : ''}` : '';
  const brille = edId === 'or' || edId === 'holo';
  const coque = `${edId === 'cadre' ? '<span class="carton-fini" aria-hidden="true"></span>' : ''}
      ${brille ? '<span class="carton-lueur" aria-hidden="true"></span>' : ''}
      ${edId !== 'base' ? '<span class="carton-cadre" aria-hidden="true"></span>' : ''}`;
  const imprime = `<b>Nº ${numeroDe(cle)}</b><span>${split.annee} · ${esc(SERIES[serie].nom)}</span>`;
  return `<div class="fiche ${ere(split.annee)} ed-${edId}" style="${paletteDe(equipe.nom)}">
    <div class="fiche-faces">
      <div class="carton carton-recto ${ere(split.annee)} ed-${edId}" data-retourner title="Touche la carte pour la retourner">
        <span class="carton-fond" aria-hidden="true"${fond ? ` style="--illus:url('${fond}')"` : ''}></span>
        <span class="carton-orne" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="carton-photo">${j.photo ? `<img src="${imageLP(j.photo)}" alt="">` : ''}<span class="carton-initiales">${initiales(j.n)}</span></span>
        <span class="carton-deco" aria-hidden="true"></span>
        ${coque}
        <span class="carton-role">${ROLES[j.r]}</span>
        <span class="carton-niveau${niveauClasse}">${esc(profil.niveau)}</span>
        <span class="carton-edition">${esc(ed)}</span>
        <span class="carton-nom" style="--n:${Math.max(4, nom.length)}"><span class="nom">${esc(nom)}</span><span class="equipe">${esc(equipe.nom)}</span></span>
        <span class="carton-logo">${equipe.logo ? `<img src="${imageLP(equipe.logo)}" alt="">` : ''}</span>
        <span class="carton-champs">${icones(champions, j)}</span>
        <span class="carton-imprime">${imprime}</span>
        ${edId === 'holo' ? `<span class="carton-tirage">${String(tirageDe(cle)).padStart(2, '0')}/${TIRAGE_HOLO}</span>` : ''}
      </div>
      <div class="carton carton-verso ${ere(split.annee)} ed-${edId}" data-retourner aria-hidden="true">
        ${brille ? '<span class="carton-lueur" aria-hidden="true"></span>' : ''}
        ${edId !== 'base' ? '<span class="carton-cadre" aria-hidden="true"></span>' : ''}
        <div class="verso-corps">
          <header class="verso-tete"><span class="verso-no">Nº ${numeroDe(cle)}</span><b>${esc(nom)}</b><small>${ROLES[j.r]} · ${esc(profil.niveau)} · ${pts(profil.cout)}</small><small>${esc(equipe.nom)} · ${esc(split.nom)}</small></header>
          <table class="verso-stats"><tbody>${stats.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>
          ${chezToi ? `<p class="verso-chez-toi">Chez toi : ${esc(chezToi)}</p>` : ''}
          <h4>Bassin de champions</h4>
          <ul class="bassin">${bassin}</ul>
          ${graves}
          <p class="verso-edition">Édition ${esc(ed)}${copies ? ` · ${copies} copie${copies > 1 ? 's' : ''} à ta collection` : ' · pas encore à ta collection'}${edId === 'holo' ? ` · tirage ${String(tirageDe(cle)).padStart(2, '0')}/${TIRAGE_HOLO}` : ''}</p>
          <footer class="verso-pied"><span>${esc(SERIES[serie].nom)} ${split.annee}</span><span>Photo et logo : Leaguepedia, CC BY-SA 3.0</span></footer>
        </div>
      </div>
    </div>
    <div class="fiche-plaque">
      <span class="fiche-badges">${profil.badges.map(badge).join('') || '<span class="sous">Aucun badge</span>'}</span>
      ${coutHtml(profil.cout)}
      <button type="button" class="mini" data-retourner>↻ Verso</button>
    </div>
    ${bouton ? `<button class="go signer-carte"${refus ? ' disabled' : ''}>${refus || `Signer · ${pts(profil.cout)}`}</button>` : ''}
  </div>`;
}

/*
 * RETOURNER LA CARTE (Cap 82-0, js/fiche.js) : un quart de tour, la face
 * change sur la tranche, l'autre quart ; les deux durées sont connues, le tour
 * se règle à la minuterie. Sous `prefers-reduced-motion`, la face change sans
 * tourner. `fiche` : l'élément `.fiche`.
 */
const TOUR = [200, 340];
export function retournerFiche(fiche) {
  if (!fiche || fiche.dataset.tourne) return;
  const faces = fiche.querySelector('.fiche-faces');
  const changer = () => {
    const verso = !fiche.classList.contains('au-verso');
    fiche.classList.toggle('au-verso', verso);
    fiche.querySelector('.carton-recto').setAttribute('aria-hidden', String(verso));
    fiche.querySelector('.carton-verso').setAttribute('aria-hidden', String(!verso));
    const b = fiche.querySelector('.fiche-plaque [data-retourner]');
    if (b) b.textContent = verso ? '↻ Recto' : '↻ Verso';
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { changer(); return; }
  fiche.dataset.tourne = '1';
  faces.classList.add('tourne-1');
  setTimeout(() => {
    faces.classList.remove('tourne-1');
    changer();
    faces.classList.add('tourne-2');
    setTimeout(() => { faces.classList.remove('tourne-2'); delete fiche.dataset.tourne; }, TOUR[1]);
  }, TOUR[0]);
}

/*
 * L'INCLINAISON (Cap 82-0, js/cartes.js `brancherInclinaison`) : la carte
 * qu'on penche sous le doigt ou la souris se soulève, tourne un peu, et un
 * reflet suit la main ; l'Or et la Holo y prennent leur lumière. Rien sous
 * `prefers-reduced-motion`.
 */
const INCLINE_MAX = 12;
const PROPS = ['--mx', '--my', '--rx', '--ry', '--lueur'];
export function brancherInclinaison(doc = document) {
  const calme = window.matchMedia('(prefers-reduced-motion: reduce)');
  let carte = null, x = 0, y = 0, raf = 0;
  const borne = v => Math.min(1, Math.max(0, v));
  const dessiner = () => {
    raf = 0;
    if (!carte || !carte.isConnected) { carte = null; return; }
    const r = carte.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = borne((x - r.left) / r.width), py = borne((y - r.top) / r.height);
    const s = carte.style;
    s.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    s.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    s.setProperty('--rx', `${((0.5 - py) * 2 * INCLINE_MAX).toFixed(2)}deg`);
    s.setProperty('--ry', `${((px - 0.5) * 2 * INCLINE_MAX).toFixed(2)}deg`);
    s.setProperty('--lueur', '1');
  };
  const relacher = () => {
    if (!carte) return;
    const c = carte;
    carte = null;
    c.classList.remove('incline');
    c.classList.add('relache');
    for (const k of PROPS) c.style.removeProperty(k);
    setTimeout(() => c.classList.remove('relache'), 700);
  };
  const suivre = ev => {
    if (calme.matches || !ev.target.closest) return;
    const c = ev.target.closest('.carton');
    if (c !== carte) {
      relacher();
      if (!c) return;
      carte = c;
      c.classList.remove('relache');
      c.classList.add('incline');
    }
    x = ev.clientX; y = ev.clientY;
    if (!raf) raf = requestAnimationFrame(dessiner);
  };
  const opts = { passive: true };
  doc.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse' || ev.buttons) suivre(ev); }, opts);
  doc.addEventListener('pointerdown', suivre, opts);
  doc.addEventListener('pointerup', ev => { if (ev.pointerType !== 'mouse') relacher(); }, opts);
  doc.addEventListener('pointercancel', relacher, opts);
  doc.addEventListener('pointerout', ev => { if (ev.pointerType === 'mouse' && carte && !(ev.relatedTarget && carte.contains(ev.relatedTarget))) relacher(); }, opts);
}
