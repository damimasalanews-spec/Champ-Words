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

  if (error) return res.redirect(`/?error=${encodeURIComponent(error)}`);
  if (!code) return res.redirect('/?error=no_code');

  // Validate state
  if (state !== req.session.oauthState) return res.redirect('/?error=invalid_state');
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

    req.session.save(() => res.redirect('/'));
  } catch (err) {
    console.error('TikTok auth error:', err.response?.data || err.message);
    res.redirect(`/?error=auth_failed`);
  }
});

app.get('/auth/me', (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: { name: req.session.user.name, avatar: req.session.user.avatar } });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

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
    .filter(w => w.length >= 3 && w.length <= 8)
    .forEach(w => DICT.add(w));
} catch (_) {}

// ── Word categories (generated by build-categories.js) ───────────────────
const CATEGORIES = require('./categories.js');
const CATEGORY_IDS = new Set(CATEGORIES.list.map(c => c.id));

// ── 20s hint clues (curated + templates) ─────────────────────────────────
const { generateClue } = require('./clues.js');

// ── Rooms ────────────────────────────────────────────────────────────────
function makeRoomId() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
const rooms = new Map();

const ROUND_TIME_MS = Number(process.env.ROUND_TIME_MS) || 60 * 1000; // 1 minute to guess each word
const WORD_FOUND_TO_ROUND_OVER_MS = Number(process.env.WORD_FOUND_TO_ROUND_OVER_MS) || 2200; // falling-word reveal window
const ROUND_OVER_TO_NEXT_MS = Number(process.env.ROUND_OVER_TO_NEXT_MS) || 3500; // pause before next champ / game over
const TIME_UP_TO_ROUND_OVER_MS = Number(process.env.TIME_UP_TO_ROUND_OVER_MS) || 1200; // reveal pause on time-up
const HINT1_MS = Number(process.env.HINT1_MS) || 20 * 1000; // category hint window at 40s remaining
const HINT2_MS = Number(process.env.HINT2_MS) || 40 * 1000; // word clue window at 20s remaining
const HINT_WINDOW_MS = Number(process.env.HINT_WINDOW_MS) || 5 * 1000; // champ has 5s to send each hint
const HINT_PENALTY = 20; // points deducted when the champ misses a hint window
const MAX_HINTS = 3;

function createRoom(hostId, hostName, hostAvatar, totalRounds) {
  const id = makeRoomId();
  const room = {
    id, host: hostId,
    players: [{ id: hostId, name: hostName, avatar: hostAvatar, score: 0, hintsLeft: MAX_HINTS }],
    state: 'waiting', round: 0, totalRounds: totalRounds || 5,
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
    timer: null,
    hintTimer1: null,         // opens the category-hint window at 20s elapsed (40s left)
    hintTimer2: null,         // opens the word-clue window at 40s elapsed (20s left)
    hintWindowTimer: null,    // 5s timeout for the champ to send the hint
    champTimer: null          // 15s timeout for champ to pick a word
  };
  rooms.set(id, room);
  return room;
}

function sanitizeRoom(room) {
  return {
    id: room.id, host: room.host, state: room.state,
    round: room.round, totalRounds: room.totalRounds,
    champId: room.champId,
    wordLength: room.word ? room.word.length : 0,
    revealedLetters: room.word && room.revealedMask
      ? room.word.split('').map((ch, i) => room.revealedMask[i] ? ch : '')
      : [],
    endsAt: room.roundStartedAt ? room.roundStartedAt + ROUND_TIME_MS : null,
    pickEndsAt: room.pickStartedAt ? room.pickStartedAt + 15000 : null,
    finds: room.roundFinds || [],
    grid: room.state === 'playing' ? room.grid : null,
    players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, hintsLeft: p.hintsLeft, connected: io.sockets.sockets.has(p.id) }))
  };
}

function playerById(room, id) { return room.players.find(p => p.id === id); }
function champOf(room) { return playerById(room, room.champId); }

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  if (room.hintTimer1) { clearTimeout(room.hintTimer1); room.hintTimer1 = null; }
  if (room.hintTimer2) { clearTimeout(room.hintTimer2); room.hintTimer2 = null; }
  if (room.hintWindowTimer) { clearTimeout(room.hintWindowTimer); room.hintWindowTimer = null; }
  if (room.champTimer) { clearTimeout(room.champTimer); room.champTimer = null; }
}

// ── Pick 6 words (varied lengths) for the champ ─────────────────────────
function generateChoices(category) {
  // Use the chosen category's words; fall back to the full mixed pool
  const wordPool = (category && CATEGORIES.words[category] && CATEGORIES.words[category].length >= 6)
    ? CATEGORIES.words[category]
    : CATEGORIES.words.mixed;
  const byLen = {};
  for (const w of wordPool) {
    if (!byLen[w.length]) byLen[w.length] = [];
    byLen[w.length].push(w);
  }
  const lengths = Object.keys(byLen).map(Number).filter(l => l >= 3 && l <= 8);
  if (lengths.length === 0) return ['cat', 'dog', 'hat', 'sun', 'egg', 'fox']; // fallback

  const choices = [];
  // Pick 6 words, trying to spread across lengths (prefer 4-7)
  const preferred = lengths.filter(l => l >= 4 && l <= 7);
  const pool = preferred.length >= 3 ? preferred : lengths;
  for (let i = 0; i < 6 && i < pool.length; i++) {
    const len = pool[Math.floor(Math.random() * pool.length)];
    const words = byLen[len];
    const w = words[Math.floor(Math.random() * words.length)];
    if (!choices.includes(w)) choices.push(w);
  }
  // Fill any slots if we got fewer than 6 (stay inside the category pool)
  while (choices.length < 6) {
    const w = wordPool[Math.floor(Math.random() * wordPool.length)];
    if (!choices.includes(w)) choices.push(w);
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
  const letters = word.split('');
  const GRID = 4;

  for (let attempt = 0; attempt < 60; attempt++) {
    const grid = Array.from({ length: GRID }, () => Array(GRID).fill(''));
    const used = new Set();
    const startR = Math.floor(Math.random() * GRID);
    const startC = Math.floor(Math.random() * GRID);
    grid[startR][startC] = letters[0];
    used.add(`${startR},${startC}`);

    let r = startR, c = startC;
    let placed = 1;
    for (let li = 1; li < letters.length; li++) {
      const adj = [];
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !used.has(`${nr},${nc}`))
            adj.push([nr, nc]);
        }
      if (adj.length === 0) break;
      const [nr, nc] = adj[Math.floor(Math.random() * adj.length)];
      grid[nr][nc] = letters[li];
      used.add(`${nr},${nc}`);
      r = nr; c = nc;
      placed++;
    }
    if (placed < letters.length) continue;

    // Fill remaining cells with random letters
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    for (let rr = 0; rr < GRID; rr++)
      for (let cc = 0; cc < GRID; cc++)
        if (!grid[rr][cc])
          grid[rr][cc] = chars[Math.floor(Math.random() * chars.length)];

    return grid;
  }
  // Fallback: just fill the grid
  const g = Array.from({ length: GRID }, () => Array(GRID).fill(''));
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      g[r][c] = chars[Math.floor(Math.random() * chars.length)];
  return g;
}

function validatePath(grid, path, word) {
  if (!path || !Array.isArray(path) || path.length < 3) return false;
  if (path.length !== word.length) return false;
  const GRID = 4;
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1], [cr, cc] = path[i];
    if (!isAdjacent(pr, pc, cr, cc)) return false;
    if (cr < 0 || cr >= GRID || cc < 0 || cc >= GRID) return false;
  }
  const formed = path.map(([r, c]) => grid[r][c]).join('');
  return formed === word;
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
  room.choices = [];
  room.pickStartedAt = Date.now();
  room.players.forEach(p => { p.foundWord = false; p.roundFoundAt = 0; p.roundScore = 0; });
  clearTimer(room);
  // 15s auto-pass if champ doesn't pick a category/word
  room.champTimer = setTimeout(() => {
    if (room.state !== 'champ_pick') return;
    const idx = room.players.findIndex(p => p.id === room.champId);
    const nextId = room.players[(idx + 1) % room.players.length].id;
    beginChampTurn(room, nextId);
  }, 15000);
  const champ = champOf(room);
  // Broadcast the turn to everyone (no word info)
  io.to(room.id).emit('champ_turn', {
    room: sanitizeRoom(room),
    champ: champ ? { id: champ.id, name: champ.name } : null
  });
  io.to(room.id).emit('room_update', sanitizeRoom(room));
  // Ask the champ to pick a category first; word choices come after
  setTimeout(() => io.to(champId).emit('category_choices', { categories: CATEGORIES.list }), 120);
}

// ── Auto-reveal a hint at a random still-hidden position ──────────────────
function revealRandomHint(room) {
  if (!room.word || room.state !== 'playing') return;
  // Find all unrevealed positions
  const hidden = [];
  for (let i = 0; i < room.word.length; i++) {
    if (!room.revealedMask[i]) hidden.push(i);
  }
  if (hidden.length === 0) return;
  // Pick a random one and reveal it
  const pos = hidden[Math.floor(Math.random() * hidden.length)];
  room.revealedMask[pos] = true;
  io.to(room.id).emit('room_update', sanitizeRoom(room));
}

function startRound(room) { // champ has picked their word
  room.state = 'playing';
  room.revealedMask = Array(room.word.length).fill(false);
  room.roundWinnerId = null;
  room.roundScore = 0;
  room.roundElapsed = 0;
  room.endedRound = false;
  room.grid = generateWordGrid(room.word); // 4×4 grid with the word embedded
  room.roundStartedAt = Date.now();
  clearTimer(room);
  room.timer = setTimeout(() => onTimeUp(room), ROUND_TIME_MS);
  // Champ hint windows: category at 40s remaining (20s elapsed), clue at 20s remaining (40s elapsed)
  room.hintTimer1 = setTimeout(() => requestCategoryHint(room), HINT1_MS);
  room.hintTimer2 = setTimeout(() => requestWordHint(room), HINT2_MS);
  io.to(room.id).emit('round_started', { room: sanitizeRoom(room) });
  io.to(room.id).emit('room_update', sanitizeRoom(room));
}

// ── Open a 5s window for the champ to send a hint; miss = −20 pts ─────────
function openHintWindow(room, type) {
  room.hintWindow = type;
  if (room.hintWindowTimer) clearTimeout(room.hintWindowTimer);
  room.hintWindowTimer = setTimeout(() => {
    room.hintWindowTimer = null;
    if (room.state !== 'playing' || room.hintWindow !== type) return; // already sent or round over
    room.hintWindow = null;
    room.offeredClues = [];
    const champ = champOf(room);
    if (!champ) return;
    champ.score = Math.max(0, champ.score - HINT_PENALTY);
    io.to(room.id).emit('room_update', sanitizeRoom(room));
    io.to(champ.id).emit('points_lost', {
      amount: HINT_PENALTY,
      reason: type === 'category' ? 'Missed the category hint' : 'Missed the word clue'
    });
  }, HINT_WINDOW_MS);
}

// ── Hint window #1 (40s remaining): champ may send the category name ──────
function requestCategoryHint(room) {
  if (!room.word || room.state !== 'playing') return;
  revealRandomHint(room); // one letter revealed at 40s remaining
  // 'Surprise me' has no useful category — nothing to send
  const cat = CATEGORIES.list.find(c => c.id === room.category);
  if (!cat || cat.id === 'mixed') return;
  openHintWindow(room, 'category');
  io.to(room.champId).emit('hint_request', { type: 'category', label: cat.label, timeLeft: HINT_WINDOW_MS / 1000 });
}

// ── Hint window #2 (20s remaining): champ picks 1 of 3 clue lines ─────────
function requestWordHint(room) {
  if (!room.word || room.state !== 'playing') return;
  revealRandomHint(room); // one more letter revealed at 20s remaining
  // Build 3 distinct clue options (never infinite-loop: bounded attempts,
  // template fallback for uniqueness, duplicates only as a last resort)
  const clues = [];
  const add = c => { if (c && !clues.includes(c)) clues.push(c); };
  add(room.hintText); // champ's manual clue first
  for (let i = 0; clues.length < 3 && i < 20; i++) add(generateClue(room.word, room.category, false));
  for (let i = 0; clues.length < 3 && i < 20; i++) add(generateClue(room.word, room.category, true));
  while (clues.length < 3) clues.push(generateClue(room.word, room.category, true));
  room.offeredClues = clues.slice(0, 3);
  openHintWindow(room, 'clue');
  io.to(room.champId).emit('hint_request', { type: 'clue', clues: room.offeredClues, timeLeft: HINT_WINDOW_MS / 1000 });
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
  setTimeout(() => endRound(room), TIME_UP_TO_ROUND_OVER_MS);
}

function endRound(room) {
  if (room.endedRound) return;
  room.endedRound = true;
  clearTimer(room);
  room.state = 'round_over';
  const winner = playerById(room, room.roundWinnerId);
  const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
  scores.sort((a, b) => b.score - a.score);
  const champ = champOf(room);
  io.to(room.id).emit('round_over', {
    room: sanitizeRoom(room),
    word: room.word,
    round: room.round,
    totalRounds: room.totalRounds,
    champName: champ ? champ.name : '',
    winner: winner ? { id: winner.id, name: winner.name, score: room.roundScore, elapsed: room.roundElapsed } : null,
    finds: room.roundFinds,
    scores
  });
  setTimeout(() => {
    if (room.players.length === 0) return;
    room.round++;
    // ── Game over: all rounds played ──
    if (room.round > room.totalRounds) {
      clearTimer(room);
      room.state = 'game_over';
      const finalScores = room.players
        .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }))
        .sort((a, b) => b.score - a.score);
      io.to(room.id).emit('game_over', {
        room: sanitizeRoom(room),
        scores: finalScores,
        winner: finalScores[0] || null
      });
      return;
    }
    let nextId = null;
    if (room.roundWinnerId && playerById(room, room.roundWinnerId)) {
      nextId = room.roundWinnerId; // winner picks the next word
    } else {
      const idx = room.players.findIndex(p => p.id === room.champId);
      nextId = room.players[(idx + 1) % room.players.length].id; // nobody guessed — pass the turn
    }
    beginChampTurn(room, nextId);
  }, ROUND_OVER_TO_NEXT_MS);
}

// ── Socket.IO ────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[connect] ${socket.id}`);

  socket.on('create_room', ({ name, avatar, totalRounds }, cb) => {
    const room = createRoom(socket.id, name || 'Host', avatar || '', totalRounds);
    socket.join(room.id);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
  });

  socket.on('join_room', ({ roomId, name, avatar }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'waiting') return cb && cb({ ok: false, error: 'Game in progress' });
    if (room.players.find(p => p.id === socket.id)) return cb && cb({ ok: false, error: 'Already joined' });
    room.players.push({ id: socket.id, name: name || 'Player', avatar: avatar || '', score: 0, hintsLeft: MAX_HINTS, foundWord: false, roundFoundAt: 0, roundScore: 0 });
    socket.join(roomId);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    io.to(roomId).emit('chat', { system: true, text: `${name || 'Player'} joined` });
  });

  socket.on('start_game', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false, error: 'Only the host can start' });
    if (room.state !== 'waiting') return cb && cb({ ok: false, error: 'Game already started' });
    if (room.players.length < 2) return cb && cb({ ok: false, error: 'Need at least 2 players to start' });
    room.round = 1;
    beginChampTurn(room, room.host);
    cb && cb({ ok: true });
  });

  socket.on('choose_category', ({ roomId, category }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'champ_pick') return cb && cb({ ok: false, error: 'It is not your turn to pick' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can pick the category' });
    const cat = String(category || '').trim();
    if (!CATEGORY_IDS.has(cat)) return cb && cb({ ok: false, error: 'Unknown category' });
    room.category = cat;
    room.choices = generateChoices(cat); // 6 word choices from this category
    // Fresh 15s window for the word pick
    room.pickStartedAt = Date.now();
    if (room.champTimer) clearTimeout(room.champTimer);
    room.champTimer = setTimeout(() => {
      if (room.state !== 'champ_pick') return;
      const idx = room.players.findIndex(p => p.id === room.champId);
      const nextId = room.players[(idx + 1) % room.players.length].id;
      beginChampTurn(room, nextId);
    }, 15000);
    io.to(socket.id).emit('word_choices', { choices: room.choices });
    io.to(room.id).emit('room_update', sanitizeRoom(room));
    cb && cb({ ok: true, category: cat });
  });

  socket.on('choose_word', ({ roomId, word, hintText }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'champ_pick') return cb && cb({ ok: false, error: 'It is not your turn to pick' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can pick the word' });
    const w = String(word || '').toLowerCase().trim();
    if (w.length < 3 || w.length > 8) return cb && cb({ ok: false, error: 'Word must be 3-8 letters' });
    if (!room.category) return cb && cb({ ok: false, error: 'Pick a category first' });
    if (!room.choices.includes(w)) return cb && cb({ ok: false, error: 'Please pick one of the words shown' });
    room.word = w;
    room.hintText = typeof hintText === 'string' ? hintText.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
    room.hintText = room.hintText || null;
    startRound(room);
    cb && cb({ ok: true, wordLength: w.length });
  });

  socket.on('send_category_hint', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can send hints' });
    if (room.hintWindow !== 'category') return cb && cb({ ok: false, error: 'No category hint window open' });
    const cat = CATEGORIES.list.find(c => c.id === room.category);
    if (!cat || cat.id === 'mixed') return cb && cb({ ok: false, error: 'Nothing to reveal' });
    clearTimeout(room.hintWindowTimer); room.hintWindowTimer = null;
    room.hintWindow = null;
    io.to(room.id).emit('category_hint', { label: cat.label });
    cb && cb({ ok: true });
  });

  socket.on('send_word_hint', ({ roomId, text }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.champId !== socket.id) return cb && cb({ ok: false, error: 'Only the champ can send hints' });
    if (room.hintWindow !== 'clue') return cb && cb({ ok: false, error: 'No clue window open' });
    const t = String(text || '').trim();
    if (!room.offeredClues.includes(t)) return cb && cb({ ok: false, error: 'Pick one of the offered clues' });
    clearTimeout(room.hintWindowTimer); room.hintWindowTimer = null;
    room.hintWindow = null;
    room.offeredClues = [];
    io.to(room.id).emit('word_hint', { text: t });
    cb && cb({ ok: true });
  });

  socket.on('submit_word', ({ roomId, word, path }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb && cb({ ok: false, error: 'Room not found' });
    if (room.state !== 'playing') return cb && cb({ ok: false, error: 'No round in progress' });
    if (socket.id === room.champId) return cb && cb({ ok: false, error: "You are the champ - you know the word!" });

    let guessWord = null;
    if (path && Array.isArray(path) && path.length >= 3) {
      // Drag mode — validate path against grid
      if (!validatePath(room.grid, path, room.word))
        return cb && cb({ ok: false, error: 'Not the word - try dragging again!' });
      guessWord = room.word;
    } else {
      // Text fallback
      guessWord = String(word || '').toLowerCase().trim();
      if (!guessWord || guessWord !== room.word)
        return cb && cb({ ok: false, error: 'Not the word - try again!' });
    }

    // Correct guess!
    const player = playerById(room, socket.id);
    if (!player) return cb && cb({ ok: false, error: 'Player not found' });
    if (player.foundWord) return cb && cb({ ok: false, error: 'You already found the word!' });

    const elapsed = Math.max(1, Math.round((Date.now() - room.roundStartedAt) / 1000));
    const gained = Math.max(10, 100 - elapsed); // faster guess = more points
    player.score += gained;
    player.hintsLeft++; // bonus hint for guessing correctly
    player.foundWord = true;
    player.roundFoundAt = elapsed;
    player.roundScore = gained;
    if (!room.roundWinnerId) { // the fastest finder becomes the next champ
      room.roundWinnerId = socket.id;
      room.roundScore = gained;
      room.roundElapsed = elapsed;
    }
    room.roundFinds.push({ id: player.id, name: player.name, score: gained, elapsed });

    // Round ends early only when EVERY guesser has found the word
    const guessers = room.players.filter(p => p.id !== room.champId);
    const allFound = guessers.length > 0 && guessers.every(p => p.foundWord);
    room.allFound = allFound;

    // Only the finder gets the word revealed — others keep guessing
    const base = {
      room: sanitizeRoom(room),
      winnerId: socket.id,
      winnerName: player.name,
      champName: champOf(room)?.name || '',
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
      // everyone got it — celebrate briefly, then move on
      clearTimer(room);
      setTimeout(() => endRound(room), 1800);
    }
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
      room.players.forEach(p => { p.score = 0; p.hintsLeft = MAX_HINTS; });
      io.to(roomId).emit('room_update', sanitizeRoom(room));
    }
    cb && cb({ ok: true });
  });

  socket.on('leave_room', ({ roomId }, cb) => { leaveRoom(socket, roomId); cb && cb({ ok: true }); });
  socket.on('chat_message', ({ roomId, text }) => { const room = rooms.get(roomId); if (!room) return; const player = room.players.find(p => p.id === socket.id); if (player) io.to(roomId).emit('chat', { playerId: socket.id, playerName: player.name, text }); });
  socket.on('disconnect', () => { for (const [id, room] of rooms.entries()) { if (room.players.find(p => p.id === socket.id)) leaveRoom(socket, id); } });
});

function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const idx = room.players.findIndex(p => p.id === socket.id);
  if (idx === -1) return;
  const p = room.players[idx]; room.players.splice(idx, 1);
  socket.leave(roomId);
  if (room.players.length === 0) { clearTimer(room); rooms.delete(roomId); return; }
  if (room.host === socket.id) room.host = room.players[0].id;
  // If the champ leaves while still picking their word, hand the turn to the next player
  if (room.champId === socket.id && room.state === 'champ_pick') {
    clearTimer(room);
    beginChampTurn(room, room.players[0].id);
  }
  io.to(roomId).emit('room_update', sanitizeRoom(room));
  io.to(roomId).emit('chat', { system: true, text: `${p.name} left` });
}

// ── Static files ─────────────────────────────────────────────────────────
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
