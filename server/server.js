require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const axios = require('axios');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ── TikTok LIVE chat answers (bridge) ────────────────────────────────────
// ALL OFF by default — the game behaves exactly as before unless set.
const CHAT_BRIDGE_ENABLED = process.env.CHAT_BRIDGE_ENABLED === 'true';
const TIKTOK_LIVE_USERNAME = (process.env.TIKTOK_LIVE_USERNAME || '').trim();
const CHAT_FIXED_POINTS = Number(process.env.CHAT_FIXED_POINTS) || 0;        // 0 = speed-based scoring
const CHAT_ROOM_PIN = (process.env.CHAT_ROOM_PIN || '').trim().toUpperCase(); // optional: lock answers to one room code
const CHAT_TEST_KEY = (process.env.CHAT_TEST_KEY || '').trim();               // set ONLY for testing → enables /api/debug/word
const CHAT_GIFT_MIN_DIAMONDS = Number(process.env.CHAT_GIFT_MIN_DIAMONDS) || 1; // gifts below this are ignored
const CHAT_GIFT_COOLDOWN_MS = Number(process.env.CHAT_GIFT_COOLDOWN_MS) || 5000; // per-user gift reveal cooldown
const CHAT_GIFT_TIER2_DIAMONDS = Number(process.env.CHAT_GIFT_TIER2_DIAMONDS) || 30;  // ≥ this → 2 letters
const CHAT_GIFT_TIER3_DIAMONDS = Number(process.env.CHAT_GIFT_TIER3_DIAMONDS) || 100; // ≥ this → full word
const CHAT_ANSWER_COOLDOWN_MS = Number(process.env.CHAT_ANSWER_COOLDOWN_MS) || 3000;  // per-user wrong-attempt cooldown
const STREAK_BONUS = 50; // bonus points on every correct answer after a streak of 2+

// ── Per-room round settings (host picks at room creation) ────────────────
const DIFFICULTY_RANGES = { easy: [3, 5], medium: [3, 8], hard: [6, 8] }; // letters
function difficultyRange(d) { return DIFFICULTY_RANGES[d] || DIFFICULTY_RANGES.medium; }

// ── TikTok OAuth Config ──────────────────────────────────────────────────
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'YOUR_CLIENT_KEY';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/auth/tiktok/callback';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_URL = 'https://open.tiktokapis.com/v2/user/info/';

// ── Session ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.includes('tiktok')) console.log(`[VERIFY] ${req.method} ${req.path} from ${req.ip} UA: ${req.get('user-agent')?.substring(0,80) || 'none'}`);
  next();
});
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// ── PKCE Helpers ─────────────────────────────────────────────────────────
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

// ── Auth Routes ──────────────────────────────────────────────────────────
app.get('/auth/tiktok', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.oauthState = state;
  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic',
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  res.redirect(`${TIKTOK_AUTH_URL}?${params.toString()}`);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.redirect(`/tiktok?error=${encodeURIComponent(error)}`);
  if (!code) return res.redirect('/tiktok?error=no_code');

  // Validate state
  if (state !== req.session.oauthState) return res.redirect('/tiktok?error=invalid_state');
  delete req.session.oauthState;

  const codeVerifier = req.session.codeVerifier;
  delete req.session.codeVerifier;

  try {
    // Exchange code for token (with PKCE code_verifier)
    const tokenRes = await axios.post(TIKTOK_TOKEN_URL, {
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: TIKTOK_REDIRECT_URI,
      code_verifier: codeVerifier
    }, { headers: { 'Content-Type': 'application/json' } });

    const { access_token, open_id } = tokenRes.data;

    // Fetch user profile
    const userRes = await axios.get(`${TIKTOK_USER_URL}?fields=open_id,union_id,avatar_url,display_name`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data.data.user;

    // Store in session
    req.session.user = {
      id: user.open_id || open_id,
      name: user.display_name || 'TikTok User',
      avatar: user.avatar_url || '',
      accessToken: access_token
    };

    req.session.save(() => res.redirect('/tiktok'));
  } catch (err) {
    console.error('TikTok auth error:', err.response?.data || err.message);
    res.redirect(`/tiktok?error=auth_failed`);
  }
});

app.get('/auth/me', (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: { name: req.session.user.name, avatar: req.session.user.avatar } });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/tiktok'));
});

// ── TikTok LIVE chat answers ─────────────────────────────────────────────
// Players who answer from the TikTok LIVE chat instead of the game page.
// They are virtual players (no socket): auto-registered on their first
// correct answer, scored, and shown on the leaderboard under their TikTok
// username. They never affect round progression (only sockets count).
function findChatTargetRoom() {
  if (CHAT_ROOM_PIN) {
    const pinned = rooms.get(CHAT_ROOM_PIN);
    if (pinned && pinned.state === 'playing') return pinned;
  }
  let active = null;
  for (const [, r] of rooms) {
    if (r.state !== 'playing') continue;
    if (connectedPlayers(r).length === 0) continue; // nobody online — no live game
    if (!active || r.createdAt > active.createdAt) active = r;
  }
  return active;
}

// Shared handler used by both the HTTP endpoint and the live-chat bridge.
const chatAnswerCooldowns = new Map(); // user → last wrong-attempt timestamp
function handleChatAnswer({ user, text }) {
  const username = String(user || '').trim().slice(0, 30);
  const guess = String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!username || !guess) return { ok: false, error: 'missing user or text' };
  const room = findChatTargetRoom();
  if (!room) return { ok: false, error: 'no active round' };
  if (guess !== room.word.replace(/\s+/g, '')) {
    // Anti-spam: slow down wrong-guess flooding (correct answers pass freely)
    const now = Date.now();
    const last = chatAnswerCooldowns.get(username) || 0;
    if (now - last < CHAT_ANSWER_COOLDOWN_MS) return { ok: false, error: 'slow down' };
    chatAnswerCooldowns.set(username, now);
    return { ok: false, error: 'wrong word' };
  }

  let player = room.players.find(p => p.isChat && p.chatUser === username);
  if (!player) {
    player = {
      id: 'chat:' + username.toLowerCase(), playerKey: 'chat:' + username.toLowerCase(),
      name: username, avatar: '', score: 0, hintsLeft: 0, isChat: true, chatUser: username,
      foundWord: false, roundFoundAt: 0, roundScore: 0, bestTime: 0, streak: 0
    };
    room.players.push(player);
  }
  if (player.foundWord) return { ok: true, already: true, score: player.score };

  const elapsed = Math.max(1, Math.round((Date.now() - room.roundStartedAt) / 1000));
  let gained = CHAT_FIXED_POINTS > 0 ? CHAT_FIXED_POINTS : Math.max(10, 100 - elapsed);
  player.streak = (player.streak || 0) + 1;
  const streak = player.streak;
  if (streak >= 2) gained += STREAK_BONUS;
  player.score += gained;
  addAllTime(player.playerKey, player.name, player.avatar, gained);
  bumpAllTimeFound(player.playerKey, streak);
  player.hintsLeft++; // same bonus as a browser correct guess
  player.foundWord = true;
  player.roundFoundAt = elapsed;
  player.roundScore = gained;
  player.bestTime = player.bestTime === 0 ? elapsed : Math.min(player.bestTime, elapsed);
  if (!room.roundWinnerId) { room.roundWinnerId = player.id; room.roundScore = gained; room.roundElapsed = elapsed; }
  room.roundFinds.push({ id: player.id, name: player.name, score: gained, elapsed });
  io.to(room.id).emit('chat', { system: true, green: true, text: `${maskText(player.name)} guessed the word! (via TikTok chat)` });
  if (streak >= 2) io.to(room.id).emit('chat', { system: true, green: true, text: `🔥 ${maskText(player.name)} is on a ${streak}-streak!` });
  // NOTE: chat players are NOT counted in the allFound check — browser-player
  // round timing is unchanged even if chat players stay silent.
  io.to(room.id).emit('room_update', sanitizeRoom(room));
  return { ok: true, word: room.word, score: gained, elapsed, name: player.name };
}

app.post('/api/chat-answer', (req, res) => {
  res.json(handleChatAnswer(req.body || {}));
});

// Debug only: exposes the current round's word. Requires CHAT_TEST_KEY env
// (default unset → endpoint does not exist) so the simulator/test can verify
// scoring without a live TikTok stream.
if (CHAT_TEST_KEY) {
  app.get('/api/debug/word', (req, res) => {
    if (req.query.key !== CHAT_TEST_KEY) return res.status(403).json({ ok: false, error: 'bad key' });
    const room = findChatTargetRoom();
    if (!room) return res.json({ ok: false, error: 'no active round' });
    res.json({ ok: true, word: room.word, room: sanitizeRoom(room) });
  });
}

// ── TikTok LIVE chat gifts → letter reveal (tiered) ──────────────────────
// Small gift → 1 letter · mid gift → 2 letters · big gift → the whole word.
const chatGiftCooldowns = new Map(); // username → last reveal timestamp
function handleChatGift({ user, diamonds }) {
  const username = String(user || '').trim().slice(0, 30);
  const d = Number(diamonds) || 0;
  if (!username) return { ok: false, error: 'missing user' };
  if (d < CHAT_GIFT_MIN_DIAMONDS) return { ok: false, error: `need at least ${CHAT_GIFT_MIN_DIAMONDS} diamond(s)` };
  const now = Date.now();
  const last = chatGiftCooldowns.get(username) || 0;
  if (now - last < CHAT_GIFT_COOLDOWN_MS) return { ok: false, error: 'cooldown', waitMs: CHAT_GIFT_COOLDOWN_MS - (now - last) };
  const room = findChatTargetRoom();
  if (!room || room.state !== 'playing') return { ok: false, error: 'no active round' };
  let hidden = 0;
  for (let i = 0; i < room.word.length; i++) {
    if (room.word[i] !== ' ' && !room.revealedMask[i]) hidden++;
  }
  if (hidden === 0) return { ok: false, error: 'all letters revealed' };
  chatGiftCooldowns.set(username, now);
  if (d >= CHAT_GIFT_TIER3_DIAMONDS) {
    const r = revealAllLetters(room);
    if (!r) return { ok: false, error: 'all letters revealed' };
    io.to(room.id).emit('chat', { system: true, green: true, text: `🎁 ${username} sent a BIG gift and revealed the whole word!` });
    return { ok: true, full: true, name: username };
  }
  const want = d >= CHAT_GIFT_TIER2_DIAMONDS ? 2 : 1;
  const r = revealLetters(room, want);
  if (!r) return { ok: false, error: 'all letters revealed' };
  io.to(room.id).emit('chat', { system: true, green: true, text: `🎁 ${username} sent a gift and revealed ${r} letter${r > 1 ? 's' : ''}!` });
  return { ok: true, revealed: r, name: username };
}

app.post('/api/chat-gift', (req, res) => res.json(handleChatGift(req.body || {})));

// All-time leaderboard (top 20 lifetime scores)
app.get('/api/alltime', (req, res) => res.json({ ok: true, top: allTimeTop(20) }));

// Word of the Day (solo mode) — deterministic daily pick from the drawable pool
app.get('/api/wotd', (req, res) => {
  const pool = Object.keys(WORD_ART_POOL);
  if (pool.length === 0) return res.json({ ok: false, error: 'no words available' });
  const day = Math.floor(Date.now() / 86400000);
  const word = pool[day % pool.length];
  res.json({ ok: true, word, length: word.replace(/[^a-z]/g, '').length, art: getWordArt(word), date: new Date().toISOString().slice(0, 10) });
});

// Category list for the host's create-room form
app.get('/api/categories', (req, res) => res.json({ ok: true, list: CATEGORIES.list }));

// ── Policy Pages ─────────────────────────────────────────────────────────
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public-terms.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public-privacy.html')));

// TikTok site verification — catches any tiktok file automatically
app.use('/tiktok', (req, res, next) => {
  const fileName = path.basename(req.originalUrl);
  const filePath = path.join(__dirname, 'public', fileName);
  if (fs.existsSync(filePath)) {
    res.type('text/plain');
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(filePath);
  }
  next();
});

// ── Verification / public files ───────────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// ── Dictionary ───────────────────────────────────────────────────────────
const DICT = new Set();
try {
  const txt = fs.readFileSync(path.join(__dirname, 'words.txt'), 'utf-8');
  txt.split(/\r?\n/).map(w => w.trim().toLowerCase())
    .filter(w => { const l = w.replace(/[^a-z]/g, ''); return l.length >= 5 && l.length <= 8; }) // 5-8 letters, spaces allowed
    .forEach(w => DICT.add(w));
} catch (_) {}

// ── Word categories (generated by build-categories.js) ───────────────────
const CATEGORIES = require('./categories.js');
const CATEGORY_IDS = new Set(CATEGORIES.list.map(c => c.id));
// Themed 'trade' pack — curated for this game (every word is 5–8 letters,
// in the dictionary, AND has emoji art). Merged at runtime because
// build-categories.js regenerates categories.js from words.txt.


// ── 20s hint clues (curated + templates) ─────────────────────────────────
const { generateClue } = require('./clues.js');

// ── Live drawing clipart (Pictionary-style hint) ─────────────────────────
const { WORD_ART, getWordArt } = require('./wordArt.js');
const { maskText } = require('./badWords.js'); // profanity filter for chat/guesses
// Words that both exist in the dictionary AND have clipart — preferred picks
const WORD_ART_POOL = Object.fromEntries(Object.entries(WORD_ART).filter(([w]) => DICT.has(w)));

// ── Curated category packs (50+ drawable words each) ─────────────────────
// Replaces the thin auto-generated lists with curated drawable packs so every
// theme has plenty of non-repeating words. Filtered to art ∩ dictionary.
const PACKS = require('./categoryPacks.js');
const PACK_META = {
  animals: { label: 'Animals', icon: '🐾' }, food: { label: 'Food', icon: '🍎' },
  nature: { label: 'Nature', icon: '🌿' }, body: { label: 'Body', icon: '💪' },
  home: { label: 'Home', icon: '🏠' }, clothes: { label: 'Clothes', icon: '👕' },
  travel: { label: 'Travel', icon: '🚗' }, sports: { label: 'Sports', icon: '⚽' },
  arts: { label: 'Arts', icon: '🎵' }, colors: { label: 'Colors', icon: '🎨' },
  people: { label: 'People', icon: '👤' }, trade: { label: 'Trade & Export', icon: '🚢' }
};
for (const [id, words] of Object.entries(PACKS)) {
  const drawable = words.filter(w => WORD_ART[w] && DICT.has(w));
  if (drawable.length >= 6) {
    CATEGORIES.words[id] = drawable;
    const meta = PACK_META[id] || { label: id, icon: '🎲' };
    if (!CATEGORY_IDS.has(id)) { CATEGORIES.list.push({ id, label: meta.label, icon: meta.icon }); CATEGORY_IDS.add(id); }
  }
}
// Countries pack — every word is 5–8 letters, in the dictionary, with flag art.
CATEGORIES.words.countries = ['india', 'china', 'france', 'egypt', 'brazil', 'canada', 'japan', 'germany', 'italy', 'spain', 'mexico', 'turkey', 'poland', 'sweden', 'norway', 'denmark', 'portugal', 'greece', 'ireland', 'iceland', 'england', 'scotland', 'wales', 'russia', 'thailand', 'vietnam', 'malaysia', 'pakistan', 'nepal', 'bhutan', 'chile', 'nigeria', 'kenya', 'ghana', 'senegal', 'morocco', 'algeria', 'tunisia', 'sudan', 'somalia', 'ethiopia', 'tanzania', 'uganda', 'zambia', 'zimbabwe', 'angola', 'cyprus', 'jordan', 'israel', 'lebanon', 'syria', 'yemen', 'qatar', 'kuwait', 'saudi', 'bahrain', 'mongolia', 'taiwan', 'cambodia', 'myanmar', 'niger', 'congo', 'rwanda', 'malawi', 'namibia', 'botswana', 'guinea', 'liberia', 'armenia', 'georgia', 'ukraine', 'belarus', 'moldova', 'romania', 'bulgaria', 'hungary', 'austria', 'belgium', 'slovakia', 'slovenia', 'croatia', 'bosnia', 'serbia', 'albania', 'estonia', 'latvia', 'finland', 'andorra', 'malta', 'monaco', 'ecuador', 'colombia', 'bolivia', 'paraguay', 'uruguay', 'guyana', 'panama', 'honduras', 'haiti', 'jamaica', 'trinidad', 'barbados', 'bahamas', 'grenada', 'samoa', 'papua', 'solomon', 'puerto'];
if (!CATEGORY_IDS.has('countries')) { CATEGORIES.list.push({ id: 'countries', label: 'Countries', icon: '🌍' }); CATEGORY_IDS.add('countries'); }

// ── Rooms ────────────────────────────────────────────────────────────────
function makeRoomId() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
const rooms = new Map();

// ── All-time leaderboard ─────────────────────────────────────────────────
// Lifetime points per player, keyed by playerKey (browser) or chat:USERNAME
// (TikTok chat). Persisted best-effort to server/data/alltime.json — note
// Render's filesystem resets on each deploy, so this survives restarts of
// the same instance but resets when the service redeploys.
const ALLTIME_FILE = path.join(__dirname, 'data', 'alltime.json');
const allTime = new Map();
let allTimeSaveTimer = null;
try {
  if (fs.existsSync(ALLTIME_FILE)) {
    const arr = JSON.parse(fs.readFileSync(ALLTIME_FILE, 'utf-8'));
    (Array.isArray(arr) ? arr : []).forEach(e => {
      if (e && e.key) allTime.set(e.key, { name: e.name || e.key, avatar: e.avatar || '', score: Number(e.score) || 0 });
    });
  }
} catch (_) { /* fresh start if the file is corrupt */ }
function persistAllTime() {
  if (allTimeSaveTimer) return;
  allTimeSaveTimer = setTimeout(() => {
    allTimeSaveTimer = null;
    try {
      fs.mkdirSync(path.dirname(ALLTIME_FILE), { recursive: true });
      fs.writeFileSync(ALLTIME_FILE, JSON.stringify(Array.from(allTime.entries()).map(([key, v]) => ({ key, name: v.name, avatar: v.avatar, score: v.score }))));
    } catch (_) { /* best effort */ }
  }, 2000);
}
function addAllTime(key, name, avatar, gained) {
  if (!key || !gained) return;
  const cur = allTime.get(key) || { name: name || key, avatar: avatar || '', score: 0, found: 0, games: 0, bestStreak: 0 };
  cur.score += gained;
  if (name) cur.name = name;
  if (avatar) cur.avatar = avatar;
  allTime.set(key, cur);
  persistAllTime();
}
function bumpAllTimeFound(key, streak) {
  const cur = allTime.get(key);
  if (!cur) return;
  cur.found = (cur.found || 0) + 1;
  cur.bestStreak = Math.max(cur.bestStreak || 0, streak || 0);
  persistAllTime();
}
function bumpAllTimeGames(keys) {
  let changed = false;
  for (const k of keys) {
    const cur = allTime.get(k);
    if (cur) { cur.games = (cur.games || 0) + 1; changed = true; }
  }
  if (changed) persistAllTime();
}
function allTimeTop(n) {
  return Array.from(allTime.entries())
    .map(([key, v]) => ({ key, name: v.name, avatar: v.avatar, score: v.score, found: v.found || 0, games: v.games || 0, bestStreak: v.bestStreak || 0, chat: key.startsWith('chat:') }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n || 20);
}

const ROUND_TIME_MS = Number(process.env.ROUND_TIME_MS) || 60 * 1000; // 1 minute to guess each word
const WORD_FOUND_TO_ROUND_OVER_MS = Number(process.env.WORD_FOUND_TO_ROUND_OVER_MS) || 6000; // grid stays visible 6s after everyone finds the word
const ROUND_OVER_TO_NEXT_MS = Number(process.env.ROUND_OVER_TO_NEXT_MS) || 6000; // 6s scoreboard pause before the next round
const TIME_UP_TO_ROUND_OVER_MS = Number(process.env.TIME_UP_TO_ROUND_OVER_MS) || 6000; // grid stays visible 6s after time-up
const HINT1_MS = Number(process.env.HINT1_MS) || 20 * 1000; // category hint window at 40s remaining
const HINT2_MS = Number(process.env.HINT2_MS) || 40 * 1000; // word clue window at 20s remaining
const HINT_WINDOW_MS = Number(process.env.HINT_WINDOW_MS) || 5 * 1000; // champ has 5s to send each hint
const HINT_PENALTY = 20; // points deducted when the champ misses a hint window
const MAX_HINTS = 3;
const ROOM_CLEANUP_MS = Number(process.env.ROOM_CLEANUP_MS) || 120 * 1000; // drop a room ~2 min after everyone leaves (allows rejoin)

// ── Admin (host) credentials — only an admin can create a room ───────────
// Override on Render via env vars: ADMIN_ID / ADMIN_PASSWORD
const ADMIN_ID = process.env.ADMIN_ID || 'champwords';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'champwords@123';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'champ-words-admin-secret';
const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
// Stateless signed tokens — they survive server restarts (Render deploys)
function makeAdminToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ADMIN_TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function isAdmin(socket, token) {
  if (socket.adminAuthorized) return true;
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expect = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('base64url');
  if (sig !== expect) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now();
  } catch (_) { return false; }
}

function createRoom(hostId, hostName, hostAvatar, opts) {
  const id = makeRoomId();
  const opts2 = opts || {};
  const room = {
    id, host: hostId, createdAt: Date.now(),
    players: [{ id: hostId, playerKey: opts2.playerKey || `k_${hostId}`, name: hostName, avatar: hostAvatar, score: 0, hintsLeft: MAX_HINTS, bestTime: 0, streak: 0 }],
    state: 'waiting', round: 0, totalRounds: opts2.totalRounds || 5,
    roundTimeMs: opts2.roundTimeMs || 0,          // 0 = server default (60s)
    difficulty: opts2.difficulty || 'medium',     // easy | medium | hard
    wordPack: opts2.wordPack || opts2.category || 'mixed', // themed word pack id
    muted: new Map(),                             // playerId → muted-until timestamp
    champId: null,
    word: null,            // mystery word — NEVER sent to clients
    revealedMask: [],          // which letter positions are hint-revealed (booleans)
    roundStartedAt: null,
    roundWinnerId: null,
    roundScore: 0,
    roundElapsed: 0,
    endedRound: false,
    pickStartedAt: null,
    category: null,           // chosen category for this round (null = not picked yet)
    hintText: null,           // champ's manual one-line clue (optional override)
    choices: [],              // 6 word choices offered to champ (secret from guessers)
    grid: null,               // 4×4 letter grid (generated from chosen word)
    hintWindow: null,         // open hint window: 'category' | 'clue' | null
    offeredClues: [],         // 3 clue options offered to the champ at 20s
    roundFinds: [],           // ordered list of correct guessers this round: {id, name, score, elapsed}
    allFound: false,          // every guesser found the word → round ends early
    guesserId: null,          // hot-seat: the player who must find the word this round
    failStreak: 0,
    timer: null,
    hintTimer1: null,         // opens the category-hint window at 20s elapsed (40s left)
    hintTimer2: null,         // opens the word-clue window at 40s elapsed (20s left)
    hintWindowTimer: null,    // 5s timeout for the champ to send the hint
    champTimer: null,         // 15s timeout for champ to pick a word
    voiceUsers: [],           // socket ids currently in the voice chat (WebRTC mesh)
    pendingHostKey: null,     // playerKey of a dropped host — reclaimed on rejoin
    advanceScheduled: false,  // round-over → next round timer is pending
    lastRoundResult: null,    // last round-over payload (so rejoining players see it)
    lastGameResult: null,     // final scores (so rejoining players see it)
    cleanupTimer: null        // deletes the room after everyone leaves
  };
  rooms.set(id, room);
  return room;
}

function sanitizeRoom(room) {
  return {
    id: room.id, host: room.host, state: room.state,
    round: room.round, totalRounds: room.totalRounds,
    roundTimeMs: room.roundTimeMs || 0,
    difficulty: room.difficulty || 'medium',
    category: room.wordPack || 'mixed',
    guesserId: room.guesserId || null,
    champId: room.champId,
    wordLength: room.word ? room.word.length : 0,
    revealedLetters: room.word && room.revealedMask
      ? room.word.split('').map((ch, i) => ch === ' ' ? ' ' : room.revealedMask[i] ? ch : '')
      : [],
    endsAt: room.roundStartedAt ? room.roundStartedAt + (room.roundTimeMs || ROUND_TIME_MS) : null,
    pickEndsAt: room.pickStartedAt ? room.pickStartedAt + 15000 : null,
    finds: room.roundFinds || [],
    art: room.state === 'playing' ? getWordArt(room.word) : null,
    grid: room.state === 'playing' ? room.grid : null,
    players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, hintsLeft: p.hintsLeft, bestTime: p.bestTime || 0, roundScore: p.roundScore || 0, roundFoundAt: p.roundFoundAt || 0, foundWord: !!p.foundWord, isChat: !!p.isChat, streak: p.streak || 0, mutedUntil: (room.muted && room.muted.get(p.id)) || 0, connected: io.sockets.sockets.has(p.id) }))
  };
}

function playerById(room, id) { return room.players.find(p => p.id === id); }
function champOf(room) { return playerById(room, room.champId); }
function guesserOf(room) { return playerById(room, room.guesserId); }

// Players whose socket is currently online (disconnected players keep their
// record + points so they can rejoin, but are skipped by game logic)
function connectedPlayers(room) { return room.players.filter(p => io.sockets.sockets.has(p.id)); }

function cancelRoomCleanup(room) {
  if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }
}
// After everyone leaves, keep the room alive briefly so players can rejoin
function scheduleRoomCleanup(room) {
  cancelRoomCleanup(room);
  room.cleanupTimer = setTimeout(() => {
    room.cleanupTimer = null;
    if (connectedPlayers(room).length === 0) { clearTimer(room); rooms.delete(room.id); }
  }, ROOM_CLEANUP_MS);
}

// Next player in seat order, optionally skipping one id (wraps around);
// disconnected players are skipped so the turn goes to someone online.
function nextPlayerAfter(room, id, skipId) {
  const list = room.players;
  if (list.length === 0) return null;
  const idx = list.findIndex(p => p.id === id);
  for (let i = 1; i <= list.length; i++) {
    const p = list[(idx + i) % list.length];
    if (skipId && p.id === skipId) continue;
    if (!io.sockets.sockets.has(p.id)) continue;
    return p;
  }
  return null;
}

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  if (room.hintTimer1) { clearTimeout(room.hintTimer1); room.hintTimer1 = null; }
  if (room.hintTimer2) { clearTimeout(room.hintTimer2); room.hintTimer2 = null; }
  if (room.hintWindowTimer) { clearTimeout(room.hintWindowTimer); room.hintWindowTimer = null; }
  if (room.champTimer) { clearTimeout(room.champTimer); room.champTimer = null; }
}

// ── System-picked word: no champ, the game chooses randomly ──────────────
// ONLY words the artist can draw (clipart pool) — every round has a drawing.
// No repeats within a game: usedWords are excluded until the pool is
// exhausted, then a fresh cycle starts (unavoidable beyond that).
function pickRandomWord(difficulty, category, usedWords) {
  const [min, max] = difficultyRange(difficulty);
  let pool = Object.keys(WORD_ART_POOL);
  if (category && category !== 'mixed' && CATEGORIES.words[category]) {
    const catSet = new Set(CATEGORIES.words[category]);
    const catPool = pool.filter(w => catSet.has(w));
    if (catPool.length > 0) pool = catPool;
  }
  const used = new Set(usedWords || []);
  const unused = pool.filter(w => !used.has(w));
  const pickFrom = (src) => src[Math.floor(Math.random() * src.length)];

  // 1) Unused + difficulty range (strictest — honours the chosen difficulty)
  const strict = unused.filter(w => {
    const len = w.replace(/[^a-z]/g, '').length;
    return len >= min && len <= max;
  });
  if (strict.length) return pickFrom(strict);

  // 2) Unused, any length (small category pool — prefer theme over length)
  if (unused.length) return pickFrom(unused);

  // 3) Pool exhausted — restart the cycle (repeats allowed only now)
  const any = pool.filter(w => {
    const len = w.replace(/[^a-z]/g, '').length;
    return len >= min && len <= max;
  });
  return pickFrom(any.length ? any : pool);
}

function startSystemRound(room) {
  room.word = pickRandomWord(room.difficulty, room.wordPack, room.usedWords);
  room.usedWords.push(room.word);
  room.category = null;
  room.hintText = null;
  room.hintWindow = null;
  room.offeredClues = [];
  room.roundFinds = [];
  room.allFound = false;
  room.choices = [];
  room.players.forEach(p => { p.foundWord = false; p.roundFoundAt = 0; p.roundScore = 0; });
  startRound(room);
}

// ── Pick 6 words (varied lengths) for the champ ─────────────────────────
// Only words the artist can draw (has emoji art) — every choice is drawable.
// Length = LETTERS only (spaces don't count), so 8-letter words and
// two-word answers like "ice cream" (8 letters) are both eligible.
function generateChoices(difficulty, category, usedWords) {
  // Use the chosen category's words; fall back to the full mixed pool
  const wordPool = (category && category !== 'mixed' && CATEGORIES.words[category] && CATEGORIES.words[category].length >= 6)
    ? CATEGORIES.words[category]
    : CATEGORIES.words.mixed;
  const drawablePool = wordPool.filter(w => getWordArt(w));
  // No repeats this game: drop words already used (champ can't re-pick them)
  const used = new Set(usedWords || []);
  const fresh = (drawablePool.length >= 6 ? drawablePool : wordPool).filter(w => !used.has(w));
  const usable = fresh.length >= 3 ? fresh : (drawablePool.length >= 6 ? drawablePool : wordPool);
  const [min, max] = difficultyRange(difficulty);
  const byLen = {};
  for (const w of usable) {
    const letters = w.replace(/[^a-z]/g, '');
    if (letters.length < min || letters.length > max) continue;
    if (!byLen[letters.length]) byLen[letters.length] = [];
    byLen[letters.length].push(w);
  }
  const lengths = Object.keys(byLen).map(Number).sort((a, b) => a - b);
  if (lengths.length === 0) return ['cat', 'dog', 'hat', 'sun', 'egg', 'fox']; // fallback

  const choices = [];
  // Pick 6 words, trying to spread across lengths (prefer 4-8 incl. long words)
  const preferred = lengths.filter(l => l >= 4 && l <= 8);
  const pool = preferred.length >= 3 ? preferred : lengths;
  for (let i = 0; i < 6 && i < pool.length; i++) {
    const len = pool[Math.floor(Math.random() * pool.length)];
    const words = byLen[len];
    const w = words[Math.floor(Math.random() * words.length)];
    if (!choices.includes(w)) choices.push(w);
  }
  // Fill any slots if we got fewer than 6 (drawable words only)
  while (choices.length < 6) {
    const w = usable[Math.floor(Math.random() * usable.length)];
    if (getWordArt(w) && !choices.includes(w)) choices.push(w);
  }
  // shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

// ── Generate 4×4 grid with the word placed as an adjacent path ────────────
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

function generateWordGrid(word) {
  const letters = word.replace(/\s+/g, '').split(''); // spaces are not grid cells
  const GRID = 4; // 4×4 grid

  // Backtracking placement — GUARANTEES the word is embedded in the grid
  // (the old greedy random-walk could fail for 7-8 letter words and returned
  //  a random grid WITHOUT the word, making every correct answer rejected)
  const grid = Array.from({ length: GRID }, () => Array(GRID).fill(''));
  const used = new Set();

  function place(li, r, c) {
    grid[r][c] = letters[li];
    used.add(`${r},${c}`);
    if (li === letters.length - 1) return true;
    const candidates = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !used.has(`${nr},${nc}`))
          candidates.push([nr, nc]);
      }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const [nr, nc] of candidates) {
      if (place(li + 1, nr, nc)) return true;
    }
    used.delete(`${r},${c}`);
    grid[r][c] = '';
    return false;
  }

  const starts = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) starts.push([r, c]);
  for (let i = starts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [starts[i], starts[j]] = [starts[j], starts[i]];
  }
  for (const [r, c] of starts) {
    if (place(0, r, c)) break;
    used.clear();
  }

  // Fill remaining cells with random letters
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  for (let rr = 0; rr < GRID; rr++)
    for (let cc = 0; cc < GRID; cc++)
      if (!grid[rr][cc])
        grid[rr][cc] = chars[Math.floor(Math.random() * chars.length)];

  return grid;
}

function validatePath(grid, path, word) {
  if (!path || !Array.isArray(path) || path.length < 3) return false;
  const letters = word.replace(/\s+/g, ''); // spaces are not grid cells
  if (path.length !== letters.length) return false;
  const GRID = 4; // 4×4 grid
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1], [cr, cc] = path[i];
    if (!isAdjacent(pr, pc, cr, cc)) return false;
    if (cr < 0 || cr >= GRID || cc < 0 || cc >= GRID) return false;
  }
  const formed = path.map(([r, c]) => grid[r][c]).join('');
  return formed === letters;
}

// ── Round state machine ──────────────────────────────────────────────────
function beginChampTurn(room, champId) {
  room.state = 'champ_pick';
  room.champId = champId;
  room.word = null;
  room.revealedMask = [];
  room.roundStartedAt = null;
  room.roundWinnerId = null;
  room.roundScore = 0;
  room.roundElapsed = 0;
  room.endedRound = false;
  room.category = null;
  room.hintText = null;
  room.hintWindow = null;
  room.offeredClues = [];
  room.roundFinds = [];
  room.allFound = false;
  room.choices = generateChoices(room.difficulty, room.wordPack, room.usedWords); // 6 random words (no game repeats)
  room.pickStartedAt = Date.now();
  room.players.forEach(p => { p.foundWord = false; p.roundFoundAt = 0; p.roundScore = 0; });
  clearTimer(room);
  // 15s auto-pass if champ doesn't pick a category/word
  room.champTimer = setTimeout(() => {
    if (room.state !== 'champ_pick') return;
    const next = nextPlayerAfter(room, room.champId, null) || champOf(room) || room.players[0];
    beginChampTurn(room, next.id);
  }, 15000);
  const champ = champOf(room);
  // Broadcast the turn to everyone (no word info)
  io.to(room.id).emit('champ_turn', {
    room: sanitizeRoom(room),
    champ: champ ? { id: champ.id, name: champ.name } : null
  });
  io.to(room.id).emit('room_update', sanitizeRoom(room));
  // Ask the champ to pick a word directly (no category step)
  setTimeout(() => io.to(champId).emit('word_choices', { choices: room.choices }), 120);
}

// ── Moderation helpers ───────────────────────────────────────────────────
function isMuted(room, id) {
  return !!(room.muted && room.muted.get(id) > Date.now());
}

// ── Auto-reveal a hint at a random still-hidden position ──────────────────
function revealRandomHint(room) {
  if (!room.word || room.state !== 'playing') return;
  // Find all unrevealed positions (spaces are never revealed — they're gaps)
  const hidden = [];
  for (let i = 0; i < room.word.length; i++) {
    if (room.word[i] === ' ') continue;
    if (!room.revealedMask[i]) hidden.push(i);
  }
  if (hidden.length === 0) return;
  // Pick a random one and reveal it
  const pos = hidden[Math.floor(Math.random() * hidden.length)];
  room.revealedMask[pos] = true;
  io.to(room.id).emit('room_update', sanitizeRoom(room));
}

// Reveal up to n random hidden letters (returns how many were revealed)
function revealLetters(room, n) {
  if (!room.word || room.state !== 'playing') return 0;
  let revealed = 0;
  for (let i = 0; i < n; i++) {
    const hidden = room.revealedMask.reduce((acc, r, idx) => acc + (room.word[idx] !== ' ' && !r ? 1 : 0), 0);
    if (hidden === 0) break;
    revealRandomHint(room);
    revealed++;
  }
  return revealed;
}

// Reveal the entire word (big-gift tier)
function revealAllLetters(room) {
  if (!room.word || room.state !== 'playing') return 0;
  let revealed = 0;
  for (let i = 0; i < room.word.length; i++) {
    if (room.word[i] !== ' ' && !room.revealedMask[i]) { room.revealedMask[i] = true; revealed++; }
  }
  if (revealed) io.to(room.id).emit('room_update', sanitizeRoom(room));
  return revealed;
}

function startRound(room) {
  room.state = 'playing';
  room.revealedMask = Array(room.word.length).fill(false);
  room.roundWinnerId = null;
  room.roundScore = 0;
  room.roundElapsed = 0;
  room.endedRound = false;
  room.grid = generateWordGrid(room.word); // 4×4 grid with the word embedded
  room.roundStartedAt = Date.now();
  clearTimer(room);
  const roundMs = room.roundTimeMs || ROUND_TIME_MS;
  room.timer = setTimeout(() => onTimeUp(room), roundMs);
  // Auto hint: 2 letters revealed with ~40s remaining (scaled to round length;
  // short rounds get the reveal early instead of never)
  const hintAt = Math.max(8000, roundMs - 40000);
  room.hintTimer1 = setTimeout(() => {
    if (room.state !== 'playing') return;
    revealRandomHint(room);
    revealRandomHint(room);
  }, hintAt);
  io.to(room.id).emit('round_started', { room: sanitizeRoom(room) });
  io.to(room.id).emit('room_update', sanitizeRoom(room));
}

// ── Open a 5s window for the champ to send a hint; miss = −20 pts ─────────
function openHintWindow(room, type) {
  room.hintWindow = type;
  room.hintCategorySent = false;
  room.hintClueSent = false;
  if (room.hintWindowTimer) clearTimeout(room.hintWindowTimer);
  room.hintWindowTimer = setTimeout(() => {
    room.hintWindowTimer = null;
    if (room.state !== 'playing' || room.hintWindow !== type) return; // both sent or round over
    room.hintWindow = null;
    room.offeredClues = [];
    const champ = champOf(room);
    if (!champ) return;
    champ.score = Math.max(0, champ.score - HINT_PENALTY);
    io.to(room.id).emit('room_update', sanitizeRoom(room));
    io.to(champ.id).emit('points_lost', {
      amount: HINT_PENALTY,
      reason: 'Missed the hint'
    });
  }, HINT_WINDOW_MS);
}

// Close the hint window when both hints have been sent
function closeHintWindow(room) {
  if (room.hintWindowTimer) clearTimeout(room.hintWindowTimer);
  room.hintWindowTimer = null;
  room.hintWindow = null;
  room.offeredClues = [];
}

// ── Hint window (40s remaining): BOTH hints at once ──────────────────────
// The picker chooses the category hint AND one of 3 clues in a single 5s
// window; 2 letters are revealed in the answer brackets at the same moment.
function requestBothHints(room) {
  if (!room.word || room.state !== 'playing') return;
  revealRandomHint(room); // letter #1
  revealRandomHint(room); // letter #2 — both revealed at 40s remaining
  // Build 3 distinct clue options (bounded attempts; duplicates last resort)
  const clues = [];
  const add = c => { if (c && !clues.includes(c)) clues.push(c); };
  add(room.hintText);
  for (let i = 0; clues.length < 3 && i < 20; i++) add(generateClue(room.word, room.category, false));
  for (let i = 0; clues.length < 3 && i < 20; i++) add(generateClue(room.word, room.category, true));
  while (clues.length < 3) clues.push(generateClue(room.word, room.category, true));
  room.offeredClues = clues.slice(0, 3);
  openHintWindow(room, 'both');
  io.to(room.champId).emit('hint_request', { type: 'both', clues: room.offeredClues, timeLeft: HINT_WINDOW_MS / 1000 });
}

function onTimeUp(room) {
  clearTimer(room);
  room.state = 'round_over';
  io.to(room.id).emit('time_up', {
    room: sanitizeRoom(room),
    word: room.word,
    round: room.round,
    totalRounds: room.totalRounds,
    champId: room.champId
  });
  // Reveal the answer in chat (the round-over pop-out is hidden in the half layout)
  io.to(room.id).emit('chat', { system: true, text: `The word was: ${room.word.toUpperCase()}` });
  setTimeout(() => endRound(room), TIME_UP_TO_ROUND_OVER_MS);
}

// End the game with final scores (all rounds played, or too few players left)
function finishGame(room) {
  clearTimer(room);
  room.state = 'game_over';
  const finalScores = room.players
    .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
    .sort((a, b) => b.score - a.score);
  room.lastGameResult = { scores: finalScores, winner: finalScores[0] || null };
  bumpAllTimeGames(room.players.map(p => p.playerKey));
  io.to(room.id).emit('game_over', {
    room: sanitizeRoom(room),
    scores: finalScores,
    winner: finalScores[0] || null
  });
}

function endRound(room) {
  if (room.endedRound) return;
  room.endedRound = true;
  clearTimer(room);
  room.state = 'round_over';
  const winner = playerById(room, room.roundWinnerId);
  // Nobody found the word — the player who CHOSE it takes the points
  let stumpPoints = null;
  if (!winner) {
    const elapsed = Math.max(1, Math.round((Date.now() - room.roundStartedAt) / 1000));
    const gained = Math.max(10, 100 - elapsed);
    const picker = champOf(room);
    if (picker) {
      picker.score += gained;
      addAllTime(picker.playerKey, picker.name, picker.avatar, gained);
      room.roundScore = gained;
      room.roundElapsed = elapsed;
      stumpPoints = gained;
    }
  }
  const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
  scores.sort((a, b) => b.score - a.score);
  const champ = champOf(room);
  // Reveal the answer in chat (the round-over pop-out is hidden in the half layout)
  io.to(room.id).emit('chat', { system: true, text: `The word was: ${room.word.toUpperCase()}` });
  const payload = {
    room: sanitizeRoom(room),
    word: room.word,
    round: room.round,
    totalRounds: room.totalRounds,
    champName: champ ? champ.name : '',
    winner: winner ? { id: winner.id, name: winner.name, score: room.roundScore, elapsed: room.roundElapsed } : null,
    stumpPoints,
    finds: room.roundFinds,
    scores
  };
  room.lastRoundResult = payload; // keep it so players who rejoin see this round's result
  io.to(room.id).emit('round_over', payload);
  scheduleAdvance(room);
}

// Advance to the next round (or finish the game) after the round-over pause
function advanceRound(room) {
  room.round++;
  // ── Game over: all rounds played (solo games run the full set too) ──
  if (room.round > room.totalRounds || room.players.length < 1) {
    finishGame(room);
    return;
  }
  // The system picks a fresh random word for the next round
  startSystemRound(room);
}

// Wait the standard pause, then start the next round. If everyone is offline
// at that moment, hold the room in round_over until someone rejoins.
function scheduleAdvance(room) {
  if (room.advanceScheduled) return;
  room.advanceScheduled = true;
  setTimeout(() => {
    room.advanceScheduled = false;
    if (!rooms.has(room.id) || room.state !== 'round_over') return;
    if (connectedPlayers(room).length === 0) return; // nobody online — wait for a rejoin
    advanceRound(room);
  }, ROUND_OVER_TO_NEXT_MS);
}

// ── Socket.IO ────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[connect] ${socket.id}`);

  // Join (or rejoin) this socket as a player of `room`. Same browser key →
  // restore the player record with points/hints/round state.
  function joinAsPlayer(socket, room, { name, avatar, playerKey } = {}) {
    if (playerKey) {
      const existing = room.players.find(p => p.playerKey === playerKey);
      if (existing) {
        existing.id = socket.id;               // re-associate the new socket
        if (name) existing.name = name;
        if (avatar !== undefined) existing.avatar = avatar;
        socket.join(room.id);
        cancelRoomCleanup(room);
        // A dropped host reclaims host (solo/studio flow survives reloads)
        if (room.pendingHostKey === playerKey) { room.host = socket.id; room.pendingHostKey = null; }
        // A stuck round-over room (nobody was online) resumes now
        if (room.state === 'round_over') scheduleAdvance(room);
        // Re-send the pick popup if this player is the champ mid-pick
        if (room.state === 'champ_pick' && room.champId === socket.id && room.choices.length) {
          setTimeout(() => io.to(socket.id).emit('word_choices', { choices: room.choices }), 150);
        }
        io.to(room.id).emit('room_update', sanitizeRoom(room));
        io.to(room.id).emit('chat', { system: true, text: `${existing.name} rejoined` });
        return { rejoined: true, player: existing };
      }
    }
    // New player — allowed at ANY game state (mid-game join)
    const p = { id: socket.id, playerKey: playerKey || `k_${socket.id}`, name: name || 'Player', avatar: avatar || '', score: 0, hintsLeft: MAX_HINTS, foundWord: false, roundFoundAt: 0, roundScore: 0, bestTime: 0, streak: 0 };
    room.players.push(p);
    socket.join(room.id);
    cancelRoomCleanup(room);
    if (room.state === 'round_over') scheduleAdvance(room);
    io.to(room.id).emit('room_update', sanitizeRoom(room));
    io.to(room.id).emit('chat', { system: true, text: `${p.name} joined` });
    return { rejoined: false, player: p };
  }

  // Admin login — required before anyone can create a room
  socket.on('admin_login', ({ adminId, password }, cb) => {
    if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
      socket.adminAuthorized = true;
      return cb && cb({ ok: true, token: makeAdminToken() });
    }
    cb && cb({ ok: false, error: 'Invalid admin ID or password' });
  });

  socket.on('create_room', ({ name, avatar, totalRounds, roundTimeMs, difficulty, category, playerKey, adminToken }, cb) => {
    if (!isAdmin(socket, adminToken)) return cb && cb({ ok: false, error: 'Admin login required to create a room' });
    const room = createRoom(socket.id, name || 'Host', avatar || '', { totalRounds, roundTimeMs, difficulty, wordPack: category, playerKey });
    socket.join(room.id);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
  });

  socket.on('join_room', ({ roomId, name, avatar, spectator, playerKey }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.players.find(p => p.id === socket.id)) return cb && cb({ ok: false, error: 'Already joined' });
    // Spectators (e.g. a studio browser source) may watch at any time —
    // even mid-game. They join the room channel but are NOT players.
    if (spectator) {
      socket.join(roomId);
      cb && cb({ ok: true, room: sanitizeRoom(room) });
      return;
    }
    const r = joinAsPlayer(socket, room, { name, avatar, playerKey });
    cb && cb({ ok: true, rejoined: r.rejoined, room: sanitizeRoom(room), lastRound: room.lastRoundResult, lastGame: room.lastGameResult });
  });

  // Players tap "JOIN THE ROOM" — no code needed: they join the newest
  // active room (created by the host). Only works while a room is live.
  socket.on('join_active_room', ({ name, avatar, playerKey }, cb) => {
    let active = null;
    for (const [, r] of rooms) {
      if (r.state === 'game_over') continue;            // finished games are closed
      if (connectedPlayers(r).length === 0) continue;   // nobody online — not joinable
      if (!active || r.createdAt > active.createdAt) active = r;
    }
    if (!active) return cb && cb({ ok: false, error: 'No active room — the host has not started yet' });
    const r = joinAsPlayer(socket, active, { name, avatar, playerKey });
    cb && cb({ ok: true, rejoined: r.rejoined, room: sanitizeRoom(active), lastRound: active.lastRoundResult, lastGame: active.lastGameResult });
  });

  socket.on('start_game', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can start' });
    if (room.state !== 'waiting') return cb && cb({ ok: false, error: 'Game already started' });
    // Solo start is allowed (studio / practice mode) — the system picks the word
    // and the single player guesses. Friends may join before starting.
    room.round = 1;
    room.usedWords = []; // fresh word cycle per game — no repeats across rounds
    // The system picks a random word and everyone guesses together
    startSystemRound(room);
    cb && cb({ ok: true });
  });

  socket.on('choose_word', ({ roomId, word, hintText }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'champ_pick') return cb && cb({ ok: false, error: 'It is not your turn to pick' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can pick the word' });
    const w = String(word || '').toLowerCase().trim();
    if (w.length < 3 || w.length > 8) return cb && cb({ ok: false, error: 'Word must be 3-8 letters' });
    if (!room.choices.includes(w)) return cb && cb({ ok: false, error: 'Please pick one of the words shown' });
    room.usedWords.push(w); // no repeats this game
    room.word = w;
    room.hintText = typeof hintText === 'string' ? hintText.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    room.hintText = room.hintText || null;
    startRound(room);
    cb && cb({ ok: true, wordLength: w.length });
  });

  socket.on('send_word_hint', ({ roomId, text }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can send hints' });
    if (room.hintWindow !== 'both' && room.hintWindow !== 'clue') return cb && cb({ ok: false, error: 'No clue window open' });
    const t = String(text || '').trim();
    if (!room.offeredClues.includes(t)) return cb && cb({ ok: false, error: 'Pick one of the offered clues' });
    room.hintClueSent = true;
    io.to(room.id).emit('word_hint', { text: t });
    if (room.hintCategorySent) closeHintWindow(room); // both sent — done
    cb && cb({ ok: true });
  });

  socket.on('submit_word', ({ roomId, word, path }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'playing') return cb && cb({ ok: false, error: 'No round in progress' });
    if (isMuted(room, socket.id)) return cb && cb({ ok: false, error: 'You are muted' });
    if (socket.id === room.champId) return cb && cb({ ok: false, error: "You are the champ - you know the word!" });

    let guessWord = null;
    if (path && Array.isArray(path) && path.length >= 3) {
      // Drag mode — validate path against grid
      if (!validatePath(room.grid, path, room.word))
        return cb && cb({ ok: false, error: 'Not the word - try dragging again!' });
      guessWord = room.word;
    } else {
      // Text fallback (spaces optional — "hot dog" or "hotdog" both work)
      guessWord = String(word || '').toLowerCase().trim().replace(/\s+/g, '');
      if (!guessWord || guessWord !== room.word.replace(/\s+/g, '')) {
        // Skribbl-style: show the guessed word in chat — never the answer
        const p = playerById(room, socket.id);
        io.to(roomId).emit('chat', { system: true, text: `${p ? maskText(p.name) : 'Player'} guessed: ${maskText(String(word || '').trim().toUpperCase())}` });
        return cb && cb({ ok: false, error: 'Not the word - try again!' });
      }
    }

    // Correct guess! Everyone guesses the system's word — score by speed
    const player = playerById(room, socket.id);
    if (!player) return cb && cb({ ok: false, error: 'Player not found' });
    if (player.foundWord) return cb && cb({ ok: false, error: 'You already found the word!' });

    const elapsed = Math.max(1, Math.round((Date.now() - room.roundStartedAt) / 1000));
    let gained = Math.max(10, 100 - elapsed); // faster guess = more points
    player.streak = (player.streak || 0) + 1;
    const streak = player.streak;
    if (streak >= 2) gained += STREAK_BONUS;
    player.score += gained;
    addAllTime(player.playerKey, player.name, player.avatar, gained);
    bumpAllTimeFound(player.playerKey, streak);
    if (streak >= 2) io.to(roomId).emit('chat', { system: true, green: true, text: `🔥 ${maskText(player.name)} is on a ${streak}-streak!` });
    player.hintsLeft++; // bonus hint for guessing correctly
    player.foundWord = true;
    player.roundFoundAt = elapsed;
    player.roundScore = gained;
    player.bestTime = player.bestTime === 0 ? elapsed : Math.min(player.bestTime, elapsed); // fastest correct answer
    if (!room.roundWinnerId) { // the fastest finder
      room.roundWinnerId = socket.id;
      room.roundScore = gained;
      room.roundElapsed = elapsed;
    }
    // Correct guess — celebrate in chat (green) WITHOUT revealing the answer
    io.to(roomId).emit('chat', { system: true, green: true, text: `${player.name} guessed the word!` });
    room.roundFinds.push({ id: player.id, name: player.name, score: gained, elapsed });

    // Round ends early only when EVERY ONLINE player has found the word
    const active = connectedPlayers(room);
    const allFound = active.length > 0 && active.every(p => p.foundWord);
    room.allFound = allFound;

    // Only the finder gets the word revealed — others keep guessing
    const base = {
      room: sanitizeRoom(room),
      winnerId: socket.id,
      winnerName: player.name,
      score: gained,
      elapsed,
      finds: room.roundFinds,
      allFound,
      round: room.round,
      totalRounds: room.totalRounds
    };
    io.to(socket.id).emit('word_found', { ...base, self: true, word: room.word });
    socket.to(roomId).emit('word_found', { ...base, self: false, word: null });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    cb && cb({ ok: true, word: room.word, score: gained, elapsed, hintsLeft: player.hintsLeft });

    if (allFound) {
      clearTimer(room);
      setTimeout(() => endRound(room), WORD_FOUND_TO_ROUND_OVER_MS);
    }
  });

  // ── Live activity: every player's drag is broadcast to the room ─────────
  socket.on('guess_drag', ({ roomId, path }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return;
    if (isMuted(room, socket.id)) return;
    if (!Array.isArray(path) || path.length < 1 || path.length > 8) return;
    const player = playerById(room, socket.id);
    if (!player || player.foundWord) return;
    const word = path.map(([r, c]) => room.grid?.[r]?.[c] || '').join('');
    if (word === room.word.replace(/\s+/g, '')) return; // never show the correct answer mid-drag
    socket.to(roomId).emit('guess_drag', { playerId: player.id, playerName: player.name, path, word });
  });

  socket.on('guess_drag_end', ({ roomId, path }) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return;
    if (isMuted(room, socket.id)) return;
    const player = playerById(room, socket.id);
    if (!player || player.foundWord) return;
    const word = (path || []).map(([r, c]) => room.grid?.[r]?.[c] || '').join('');
    if (word === room.word.replace(/\s+/g, '')) return; // never show the correct answer on a finished drag
    socket.to(roomId).emit('guess_drag_end', { playerId: player.id, playerName: player.name, word });
    // Skribbl-style: completed drags (wrong words) appear in the chat
    io.to(roomId).emit('chat', { system: true, text: `${maskText(player.name)} dragged: ${maskText(word.toUpperCase())}` });
  });

  socket.on('use_hint', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'playing') return cb && cb({ ok: false, error: 'No round in progress' });
    if (socket.id === room.champId) return cb && cb({ ok: false, error: "You are the champ!" });
    const player = playerById(room, socket.id);
    if (!player) return cb && cb({ ok: false });
    if (player.hintsLeft <= 0) return cb && cb({ ok: false, error: 'No hints left' });
    player.hintsLeft--;
    room.wordRevealed = Math.min(room.wordRevealed + 1, room.word.length);
    cb && cb({ ok: true, revealed: room.word.slice(0, room.wordRevealed), wordLength: room.word.length, hintsLeft: player.hintsLeft });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
  });

  socket.on('play_again', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      clearTimer(room);
      room.state = 'waiting'; room.round = 0; room.champId = null;
      room.word = null; room.wordRevealed = 0; room.endedRound = false;
      room.category = null; room.choices = [];
      room.hintWindow = null; room.offeredClues = [];
      room.guesserId = null; room.failStreak = 0;
      room.muted = new Map();
      room.usedWords = []; // fresh word cycle for the new game
      room.players.forEach(p => { p.score = 0; p.hintsLeft = MAX_HINTS; p.bestTime = 0; p.streak = 0; });
      io.to(roomId).emit('room_update', sanitizeRoom(room));
    }
    cb && cb({ ok: true });
  });

  // ── Voice chat signaling (WebRTC mesh) ────────────────────────────────
  // The newcomer gets the list of existing voice members and creates offers
  // to each of them (avoids offer glare on simultaneous joins).
  socket.on('voice_join', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    const player = playerById(room, socket.id);
    if (!player) return cb && cb({ ok: false, error: 'You are not in this room' });
    if (!room.voiceUsers.includes(socket.id)) room.voiceUsers.push(socket.id);
    const members = room.voiceUsers
      .filter(id => id !== socket.id)
      .map(id => { const p = playerById(room, id); return { socketId: id, name: p ? p.name : 'Player' }; });
    cb && cb({ ok: true, members });
    socket.to(roomId).emit('voice_joined', { socketId: socket.id, name: player.name });
  });

  socket.on('voice_offer', ({ roomId, to, sdp }) => {
    const room = rooms.get(roomId);
    if (!room || !room.voiceUsers.includes(socket.id) || !room.voiceUsers.includes(to)) return;
    io.to(to).emit('voice_offer', { from: socket.id, sdp });
  });

  socket.on('voice_answer', ({ roomId, to, sdp }) => {
    const room = rooms.get(roomId);
    if (!room || !room.voiceUsers.includes(socket.id) || !room.voiceUsers.includes(to)) return;
    io.to(to).emit('voice_answer', { from: socket.id, sdp });
  });

  socket.on('voice_ice', ({ roomId, to, candidate }) => {
    const room = rooms.get(roomId);
    if (!room || !room.voiceUsers.includes(socket.id) || !room.voiceUsers.includes(to)) return;
    io.to(to).emit('voice_ice', { from: socket.id, candidate });
  });

  socket.on('voice_leave', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.voiceUsers = room.voiceUsers.filter(id => id !== socket.id);
    socket.to(roomId).emit('voice_left', { socketId: socket.id });
  });

  socket.on('leave_room', ({ roomId }, cb) => { leaveRoom(socket, roomId); cb && cb({ ok: true }); });

  // ── Host moderation ──────────────────────────────────────────────────
  socket.on('mute_player', ({ roomId, playerId, seconds }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can mute' });
    const p = room.players.find(x => x.id === playerId);
    if (!p) return cb && cb({ ok: false, error: 'Player not found' });
    const secs = Math.max(5, Number(seconds) || 30);
    room.muted.set(playerId, Date.now() + secs * 1000);
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    io.to(roomId).emit('chat', { system: true, text: `${maskText(p.name)} was muted for ${secs}s` });
    cb && cb({ ok: true });
  });
  socket.on('unmute_player', ({ roomId, playerId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can unmute' });
    room.muted.delete(playerId);
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    cb && cb({ ok: true });
  });
  socket.on('kick_player', ({ roomId, playerId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can kick' });
    if (playerId === socket.id) return cb && cb({ ok: false, error: 'You cannot kick yourself' });
    if (!room.players.some(x => x.id === playerId)) return cb && cb({ ok: false, error: 'Player not found' });
    io.to(playerId).emit('kicked');
    removePlayerById(roomId, playerId);
    cb && cb({ ok: true });
  });
  socket.on('clear_chat', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can clear chat' });
    io.to(roomId).emit('chat_cleared');
    cb && cb({ ok: true });
  });
  socket.on('chat_message', ({ roomId, text }) => { const room = rooms.get(roomId); if (!room) return; if (isMuted(room, socket.id)) return; const player = room.players.find(p => p.id === socket.id); if (player) io.to(roomId).emit('chat', { playerId: socket.id, playerName: maskText(player.name), text: maskText(String(text || '')) }); });
  socket.on('disconnect', () => {
    // Accidental leave (page close / reload): KEEP the player record + points
    // so they can rejoin. Only explicit "Leave" removes the player.
    for (const [id, room] of rooms.entries()) {
      if (room.players.find(p => p.id === socket.id)) keepPlayerOnDisconnect(socket, id);
    }
  });
});

// Host kick: remove a player (browser socket or TikTok chat player) from the room
function removePlayerById(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx === -1) return false;
  const [p] = room.players.splice(idx, 1);
  const sock = io.sockets.sockets.get(playerId);
  if (sock) sock.leave(roomId);
  if (room.muted) room.muted.delete(playerId);
  if (room.players.length === 0) { clearTimer(room); rooms.delete(roomId); return true; }
  if (room.host === playerId) { const active = connectedPlayers(room); room.host = active.length ? active[0].id : room.players[0].id; }
  if (room.guesserId === playerId) room.guesserId = room.players[0] ? room.players[0].id : null;
  if (room.champId === playerId && room.state === 'champ_pick') {
    clearTimer(room);
    const next = nextPlayerAfter(room, playerId, null) || room.players[0];
    beginChampTurn(room, next.id);
  }
  io.to(roomId).emit('room_update', sanitizeRoom(room));
  io.to(roomId).emit('chat', { system: true, text: `${maskText(p.name)} was removed` });
  return true;
}

// Explicit leave (Leave button) — removes the player from the room for good
function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const idx = room.players.findIndex(p => p.id === socket.id);
  if (idx === -1) return;
  const p = room.players[idx]; room.players.splice(idx, 1);
  socket.leave(roomId);
  // Leave voice chat too (so other players drop the WebRTC connection)
  if (room.voiceUsers.includes(socket.id)) {
    room.voiceUsers = room.voiceUsers.filter(id => id !== socket.id);
    io.to(roomId).emit('voice_left', { socketId: socket.id });
  }
  if (room.players.length === 0) { clearTimer(room); rooms.delete(roomId); return; }
  const active = connectedPlayers(room);
  if (active.length === 0) { scheduleRoomCleanup(room); return; }
  if (room.host === socket.id) room.host = active[0].id;
  // If the hot-seat guesser leaves, the next player takes their place
  if (room.guesserId === socket.id) {
    const next = nextPlayerAfter(room, socket.id, room.champId);
    room.guesserId = next ? next.id : active[0].id;
  }
  // If the champ leaves while still picking their word, hand the turn to the next player
  if (room.champId === socket.id && room.state === 'champ_pick') {
    clearTimer(room);
    beginChampTurn(room, active[0].id);
  }
  io.to(roomId).emit('room_update', sanitizeRoom(room));
  io.to(roomId).emit('chat', { system: true, text: `${p.name} left` });
}

// Accidental disconnect: keep the player (score/hints/round state) so they can
// rejoin with the same browser key. Only room/seat bookkeeping changes.
function keepPlayerOnDisconnect(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const p = playerById(room, socket.id);
  if (!p) return;
  socket.leave(roomId);
  // Leave voice chat too (so other players drop the WebRTC connection)
  if (room.voiceUsers.includes(socket.id)) {
    room.voiceUsers = room.voiceUsers.filter(id => id !== socket.id);
    io.to(roomId).emit('voice_left', { socketId: socket.id });
  }
  const active = connectedPlayers(room);
  // Host dropped → remember who they were so they can reclaim the host seat
  if (room.host === socket.id) {
    room.pendingHostKey = p.playerKey;
    if (active.length > 0) room.host = active[0].id;
  }
  // If the hot-seat guesser leaves, the next online player takes their place
  if (room.guesserId === socket.id && active.length > 0) {
    const next = nextPlayerAfter(room, socket.id, room.champId);
    room.guesserId = next ? next.id : active[0].id;
  }
  // If the champ leaves while still picking, hand the turn to the next online player
  if (room.champId === socket.id && room.state === 'champ_pick' && active.length > 0) {
    clearTimer(room);
    beginChampTurn(room, active[0].id);
  }
  // Nobody online → keep the room alive for a bit so players can rejoin
  if (active.length === 0) scheduleRoomCleanup(room);
  io.to(roomId).emit('room_update', sanitizeRoom(room));
  io.to(roomId).emit('chat', { system: true, text: `${p.name} left` });
}

// ── TikTok LIVE chat bridge (optional, read-only, OFF by default) ────────
// Reads live-chat comments and feeds them to handleChatAnswer. Safe by
// design: disabled unless CHAT_BRIDGE_ENABLED=true AND a username is set;
// never posts to TikTok; auto-reconnects; kill switch via /api/bridge/stop.
const chatBridge = require('./chatBridge').init({ onAnswer: handleChatAnswer, onGift: handleChatGift });
app.post('/api/bridge/start', (req, res) => res.json(chatBridge.start()));
app.post('/api/bridge/stop', (req, res) => res.json(chatBridge.stop()));
app.get('/api/bridge/status', (req, res) => res.json(chatBridge.status()));
if (CHAT_BRIDGE_ENABLED && TIKTOK_LIVE_USERNAME) {
  const r = chatBridge.start();
  if (!r.ok) console.warn('[chatBridge] not started:', r.error);
}

// ── Static files ─────────────────────────────────────────────────────────
// Single permanent entry point: the old root link (champ-words.onrender.com)
// forwards to /tiktok, which now serves the full app — splash/login page
// first, then the lobby and game (half-screen layout).
app.get('/', (req, res) => {
  const qs = req.url.indexOf('?') >= 0 ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect('/tiktok' + qs);
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Run: cd client && npm run build');
});

server.listen(PORT, () => {
  console.log(`Champ Words on http://localhost:${PORT}  |  ${DICT.size} words`);
  console.log(`TikTok auth: ${TIKTOK_CLIENT_KEY === 'YOUR_CLIENT_KEY' ? 'NOT CONFIGURED — set TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI env vars' : 'configured'}`);
});

// Exposed for tests
module.exports = { generateWordGrid, validatePath, pickRandomWord, generateChoices, DICT };
