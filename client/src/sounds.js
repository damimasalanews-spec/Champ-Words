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
  found: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.13, 'sine', 0.17)); },
  timeup: () => { tone(330, 0, 0.14, 'sine', 0.14); tone(262, 0.12, 0.26, 'sine', 0.14); },
  roundover: () => { [440, 554, 659].forEach((f, i) => tone(f, i * 0.1, 0.16, 'triangle', 0.15)); },
  gameover: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.17)); },
  chat: () => { tone(880, 0, 0.06, 'sine', 0.11); tone(1175, 0.05, 0.06, 'sine', 0.08); },
  toast: () => { tone(600, 0, 0.08, 'sine', 0.12); },
  join: () => { tone(392, 0, 0.1, 'sine', 0.13); tone(523, 0.08, 0.12, 'sine', 0.13); }
};

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
