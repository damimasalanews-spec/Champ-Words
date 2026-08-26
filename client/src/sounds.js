// ── Sound effects (WebAudio-synthesized — no audio files needed) ──────────
// Usage: import { playSound, toggleMute, isMuted } from './sounds';

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('cwMuted') === '1'; } catch (_) {}

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
  return ctx;
}

// Play a single tone with optional glide
function tone(freq, startDelay, dur, type = 'sine', vol = 0.16, glideTo = null) {
  const c = ctx;
  if (!c) return;
  const t0 = c.currentTime + startDelay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  click: () => { tone(520, 0, 0.07, 'sine', 0.14); tone(760, 0.03, 0.06, 'sine', 0.09); },
  popup: () => { tone(440, 0, 0.09, 'sine', 0.14); tone(660, 0.05, 0.1, 'sine', 0.12); },
  hint: () => { tone(660, 0, 0.12, 'sine', 0.17); tone(880, 0.1, 0.15, 'sine', 0.15); },
  alert: () => { tone(740, 0, 0.1, 'triangle', 0.2); tone(740, 0.14, 0.1, 'triangle', 0.18); },
  penalty: () => { tone(220, 0, 0.18, 'sawtooth', 0.13); tone(140, 0.16, 0.28, 'sawtooth', 0.11); },
  wrong: () => { tone(190, 0, 0.14, 'sawtooth', 0.12); tone(130, 0.12, 0.2, 'sawtooth', 0.1); },
  tick: () => { tone(1150, 0, 0.045, 'square', 0.07); },
  found: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.13, 'sine', 0.17)); },
  timeup: () => { tone(330, 0, 0.14, 'sine', 0.14); tone(262, 0.12, 0.26, 'sine', 0.14); },
  roundover: () => { [440, 554, 659].forEach((f, i) => tone(f, i * 0.1, 0.16, 'triangle', 0.15)); },
  gameover: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.17)); },
  chat: () => { tone(880, 0, 0.06, 'sine', 0.11); tone(1175, 0.05, 0.06, 'sine', 0.08); },
  toast: () => { tone(600, 0, 0.08, 'sine', 0.12); },
  join: () => { tone(392, 0, 0.1, 'sine', 0.13); tone(523, 0.08, 0.12, 'sine', 0.13); },
  // Cartoon "ta-da!" fanfare — bright, playful, anime-style greeting
  celebrate: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.15, 'triangle', 0.17));
    [523, 659, 784].forEach(f => tone(f, 0.45, 0.5, 'triangle', 0.15));
    tone(1568, 0.48, 0.55, 'sine', 0.09);
  },
  // Full winner fanfare (~2.6s) — bass + arpeggio + shimmer, for the 6s reveal
  fanfare: () => {
    [262, 330, 392].forEach((f, i) => tone(f, i * 0.0, 1.4, 'triangle', 0.13));          // chord bed
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.15 + i * 0.09, 0.16, 'sine', 0.17)); // rising arpeggio
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.95 + i * 0.11, 0.2, 'triangle', 0.15));           // echo arpeggio
    [1047, 1319, 1568].forEach((f, i) => tone(f, 1.55 + i * 0.12, 0.3, 'sine', 0.13));                  // final sparkle
    tone(2093, 2.0, 0.55, 'sine', 0.08);                                                               // high shimmer
  }
};

// ── Continuous siren (speed-round alert) ─────────────────────────────────
// Smooth two-tone "hi-lo" siren (triangle wave — no harsh sawtooth). Runs
// until stopSiren() is called, so it spans the whole speed-intro popup.
let sirenTimer = null;
let sirenUp = true;

export function startSiren() {
  if (muted || sirenTimer) return;
  const c = ensureCtx();
  if (!c) return;
  const HI = 880, LO = 660, HALF = 0.4; // A5 ↔ E5, classic siren interval
  const step = () => {
    if (!sirenTimer || muted) return;
    tone(sirenUp ? HI : LO, 0, HALF, 'triangle', 0.14);
    sirenUp = !sirenUp;
  };
  step();
  sirenTimer = setInterval(step, HALF * 1000);
}

export function stopSiren() {
  if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
}

export function playSound(name) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const fn = SOUNDS[name];
  if (fn) fn();
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('cwMuted', muted ? '1' : '0'); } catch (_) {}
  return muted;
}

export function isMuted() {
  return muted;
}
