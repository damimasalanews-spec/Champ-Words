// ── Profanity filter ─────────────────────────────────────────────────────
// Masks common profanity in player-visible chat text so the stream stays
// clean. Case-insensitive, word-boundary aware. Add more words via the
// BAD_WORDS_EXTRA env var (comma-separated) — never ship a config to do it.

const BASE = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
  'shit', 'shitting', 'shits', 'shitty', 'bullshit',
  'bitch', 'bitches', 'bitching', 'sonofabitch',
  'asshole', 'assholes', 'ass', 'asses', 'dumbass', 'jackass', 'badass',
  'bastard', 'bastards', 'dick', 'dicks', 'dickhead', 'cock', 'cocks',
  'cunt', 'pussy', 'twat', 'whore', 'whores', 'slut', 'sluts',
  'nigger', 'nigga', 'fag', 'faggot', 'faggots', 'retard', 'retarded',
  'wanker', 'wankers', 'bollocks', 'bollock', 'piss', 'pissing', 'pissed',
  'dildo', 'dildos', 'rape', 'raped', 'rapist', 'kill yourself', 'kys',
  'nazi', 'pedo', 'pedophile', 'paedophile'
];

const extra = (process.env.BAD_WORDS_EXTRA || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const WORDS = [...new Set([...BASE, ...extra])].sort((a, b) => b.length - a.length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_RE = new RegExp(`\\b(${WORDS.map(escapeRegExp).join('|')})\\b`, 'gi');

// "fuck" → "f***", "FUCKING" → "F******"; non-strings pass through untouched.
function maskText(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return text.replace(WORD_RE, m => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
  } catch (_) {
    return text; // never crash the game over a filter bug
  }
}

module.exports = { maskText, WORDS };
