/*
 * LES SONS — synthétisés, jamais téléchargés (repris de Cap 82-0, js/sons.js).
 * Un oscillateur, un souffle filtré, une enveloppe : zéro octet de plus dans
 * la coquille, aucune licence, et le jeu reste entier hors ligne.
 *
 *   1. Un son ne décide rien : il suit ce qui vient d'arriver (une signature,
 *      une victoire, une élimination au direct), il ne le devine pas.
 *   2. Le navigateur refuse le son avant un geste : le contexte naît au
 *      premier toucher, jamais au chargement.
 *   3. Tout est dans un try : sans Web Audio, le jeu joue en silence.
 *
 * Le souffle est tiré de hasard() (js/hasard.js), comme tout le hasard du jeu.
 * `activerSons(false)` coupe tout : l'option « Sons » du menu.
 */
import { hasard } from './hasard.js';

let actif = true;
let ctx = null;
let souffleTampon = null;

export function activerSons(oui) { actif = !!oui; }

function contexte() {
  if (!actif) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => { if (actif) contexte(); }, { passive: true });

function enveloppe(c, t, gain, att, dec) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
  g.connect(c.destination);
  return g;
}

/* Une note : une forme, une fréquence, une glissade facultative. */
function note(c, t, { forme = 'sine', freq = 440, vers = null, gain = 0.15, att = 0.005, dec = 0.2 }) {
  const o = c.createOscillator();
  o.type = forme;
  o.frequency.setValueAtTime(freq, t);
  if (vers) o.frequency.exponentialRampToValueAtTime(vers, t + att + dec);
  o.connect(enveloppe(c, t, gain, att, dec));
  o.start(t);
  o.stop(t + att + dec + 0.05);
}

/* Un souffle filtré : ce qui frotte, frappe ou glisse. */
function souffle(c, t, { gain = 0.2, att = 0.005, dec = 0.12, type = 'bandpass', freq = 1000, q = 1 }) {
  if (!souffleTampon) {
    const de = hasard(82);
    souffleTampon = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = souffleTampon.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = de() * 2 - 1;
  }
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  s.buffer = souffleTampon;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  s.connect(f);
  f.connect(enveloppe(c, t, gain, att, dec));
  s.start(t);
  s.stop(t + att + dec + 0.05);
}

const SONS = {
  /* Un bouton : un petit clic, à peine. */
  tap(c, t) { souffle(c, t, { gain: 0.06, dec: 0.03, type: 'highpass', freq: 2400 }); },
  /* Une signature : la carte qui claque sur la table, et une note claire. */
  signer(c, t) {
    souffle(c, t, { gain: 0.16, dec: 0.05, type: 'highpass', freq: 1800 });
    note(c, t + 0.04, { forme: 'triangle', freq: 660, vers: 990, gain: 0.08, dec: 0.18 });
  },
  /* Un pack qui s'ouvre : le papier qui se déchire, puis trois notes. */
  pack(c, t) {
    souffle(c, t, { gain: 0.18, att: 0.02, dec: 0.3, type: 'bandpass', freq: 2600, q: 0.6 });
    [523, 659, 784].forEach((f, i) => note(c, t + 0.25 + i * 0.09, { forme: 'triangle', freq: f, gain: 0.08, dec: 0.25 }));
  },
  /* L'ouverture d'un pack (js/ouverture.js) : le papier qui se déchire, une lumière qui monte. */
  dechire(c, t) {
    souffle(c, t, { gain: 0.22, att: 0.01, dec: 0.32, type: 'bandpass', freq: 3200, q: 0.5 });
    note(c, t + 0.12, { forme: 'sine', freq: 220, vers: 880, gain: 0.06, att: 0.05, dec: 0.3 });
  },
  /* Une carte qui se retourne : un frottement, un petit claquement. */
  retourne(c, t) {
    souffle(c, t, { gain: 0.09, att: 0.01, dec: 0.08, type: 'bandpass', freq: 4200, q: 0.8 });
    note(c, t + 0.06, { forme: 'triangle', freq: 880, gain: 0.04, dec: 0.08 });
  },
  /* Une carte rare : le retournement, et deux notes claires. */
  rare(c, t) {
    souffle(c, t, { gain: 0.09, att: 0.01, dec: 0.08, type: 'bandpass', freq: 4200, q: 0.8 });
    [784, 1175].forEach((f, i) => note(c, t + 0.07 + i * 0.07, { forme: 'triangle', freq: f, gain: 0.07, dec: 0.3 }));
  },
  /* Un temps du walkout : un coup sourd, comme un cœur. */
  battement(c, t) {
    note(c, t, { forme: 'sine', freq: 70, vers: 45, gain: 0.3, dec: 0.25 });
    souffle(c, t, { gain: 0.06, dec: 0.12, type: 'lowpass', freq: 300 });
  },
  /* La vedette du pack : un éclat, un accord qui monte et qui reste. */
  eclat(c, t) {
    note(c, t, { forme: 'sine', freq: 55, vers: 35, gain: 0.3, dec: 0.4 });
    souffle(c, t, { gain: 0.12, att: 0.01, dec: 0.5, type: 'highpass', freq: 5000 });
    [523, 784, 1046, 1568].forEach((f, i) => note(c, t + 0.05 + i * 0.06, { forme: 'triangle', freq: f, gain: 0.07, dec: 0.9 }));
  },
  /* Une élimination au direct : un coup sec. */
  elim(c, t) {
    souffle(c, t, { gain: 0.14, dec: 0.06, type: 'highpass', freq: 1500 });
    note(c, t, { forme: 'sine', freq: 220, vers: 110, gain: 0.12, dec: 0.12 });
  },
  /* Un objectif (dragon, héraut, Nashor) : un grondement qui monte. */
  objectif(c, t) {
    note(c, t, { forme: 'sawtooth', freq: 70, vers: 140, gain: 0.07, att: 0.05, dec: 0.6 });
    souffle(c, t, { gain: 0.08, att: 0.1, dec: 0.5, type: 'lowpass', freq: 400 });
  },
  /* Une tour qui tombe : un boum, des pierres. */
  tour(c, t) {
    note(c, t, { forme: 'sine', freq: 90, vers: 40, gain: 0.25, dec: 0.3 });
    souffle(c, t + 0.03, { gain: 0.1, dec: 0.25, type: 'lowpass', freq: 700 });
  },
  /* Une victoire : un arpège qui monte. */
  victoire(c, t) { [523, 659, 784, 1046].forEach((f, i) => note(c, t + i * 0.11, { forme: 'triangle', freq: f, gain: 0.1, dec: 0.4 })); },
  /* Une défaite : deux notes qui descendent. */
  defaite(c, t) { [392, 311].forEach((f, i) => note(c, t + i * 0.18, { forme: 'triangle', freq: f, gain: 0.09, dec: 0.45 })); },
  /* Une médaille : une cloche. */
  medaille(c, t) { [1318, 1760].forEach((f, i) => note(c, t + i * 0.08, { forme: 'sine', freq: f, gain: 0.08, dec: 0.7 })); },
};

/** Joue un son de SONS, s'ils sont permis ; sinon, rien. */
export function jouerSon(nom) {
  const c = contexte();
  if (!c || !SONS[nom]) return;
  try { SONS[nom](c, c.currentTime + 0.01); } catch { /* le silence */ }
}
