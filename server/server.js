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
const GRID_SIZE = 6;
const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';

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

// ── Adjacency ────────────────────────────────────────────────────────────
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

function validatePath(grid, path) {
  if (!path || !Array.isArray(path) || path.length < 3) return false;
  for (let i = 1; i < path.length; i++) {
    const [pr, pc] = path[i - 1], [cr, cc] = path[i];
    if (!isAdjacent(pr, pc, cr, cc)) return false;
    if (cr < 0 || cr >= 6 || cc < 0 || cc >= 6) return false;
  }
  return path.map(([r, c]) => grid[r][c]).join('');
}

function canFormAdjacent(grid, word) {
  const letters = word.split('');
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === letters[0]) {
        const visited = new Set([`${r},${c}`]);
        if (dfsAdj(grid, r, c, letters, 1, visited)) return true;
      }
    }
  }
  return false;
}

function dfsAdj(grid, r, c, letters, idx, visited) {
  if (idx === letters.length) return true;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      if (grid[nr][nc] === letters[idx]) {
        visited.add(key);
        if (dfsAdj(grid, nr, nc, letters, idx + 1, visited)) return true;
        visited.delete(key);
      }
    }
  }
  return false;
}

// ── Puzzle ───────────────────────────────────────────────────────────────
function generateGrid() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const vowCount = grid[r].filter(ch => VOWELS.includes(ch)).length;
      if (c >= GRID_SIZE - 2 && vowCount < 2)
        grid[r][c] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      else if (Math.random() < 0.4)
        grid[r][c] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      else
        grid[r][c] = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    }
  }
  return grid;
}

function generatePuzzle() {
  for (let i = 0; i < 120; i++) {
    const grid = generateGrid();
    const found = new Set();
    for (const word of DICT)
      if (word.length >= 3 && word.length <= 8 && canFormAdjacent(grid, word))
        found.add(word);
    const allWords = [...found];
    if (allWords.length < 10) continue;

    const byLen = {};
    for (const w of allWords) {
      if (!byLen[w.length]) byLen[w.length] = [];
      byLen[w.length].push(w);
    }
    const lengths = Object.keys(byLen).sort((a, b) => +a - +b);
    const n = Math.min(7, lengths.length);
    if (n < 4) continue;
    const picked = lengths.sort(() => Math.random() - 0.5).slice(0, n);
    const targets = picked.map(len => {
      const words = byLen[len];
      return { length: +len, word: words[Math.floor(Math.random() * words.length)], foundBy: null };
    });
    return { grid, targetSlots: targets, allPossible: allWords };
  }
  return { grid: [['c','a','t'],['d','o','g'],['r','a','t']], targetSlots: [{length:3,word:'cat',foundBy:null},{length:3,word:'dog',foundBy:null}], allPossible:['cat','dog','rat'] };
}

// ── Rooms ────────────────────────────────────────────────────────────────
function makeRoomId() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
const rooms = new Map();

function createRoom(hostId, hostName, hostAvatar, totalRounds) {
  const id = makeRoomId();
  const room = {
    id, host: hostId,
    players: [{ id: hostId, name: hostName, avatar: hostAvatar, score: 0, wordsFound: [], hintsLeft: 3 }],
    state: 'waiting', round: 0, totalRounds: totalRounds || 5, puzzle: null
  };
  rooms.set(id, room);
  return room;
}

function sanitizeRoom(room) {
  const totalTargets = room.puzzle ? room.puzzle.targetSlots.length : 0;
  const solved = room.puzzle ? room.puzzle.targetSlots.filter(s => s.foundBy !== null).length : 0;
  const pct = totalTargets > 0 ? ((solved / totalTargets) * 100).toFixed(1) : '0.0';
  return {
    id: room.id, host: room.host, state: room.state,
    round: room.round, totalRounds: room.totalRounds,
    puzzle: room.puzzle ? { grid: room.puzzle.grid, targetSlots: room.puzzle.targetSlots.map(s => ({ length: s.length, foundBy: s.foundBy })), solvedPct: pct } : null,
    players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, wordsFound: p.wordsFound.length, connected: io.sockets.sockets.has(p.id) }))
  };
}

function startRound(room) {
  if (room.round >= room.totalRounds) return false;
  room.round++;
  room.puzzle = generatePuzzle();
  room.state = 'playing';
  room.players.forEach(p => { p.wordsFound = []; p.hintsLeft = 3; });
  return true;
}

function allFound(room) { return room.puzzle.targetSlots.every(s => s.foundBy !== null); }

function endRound(room) {
  room.state = 'round_over';
  const scores = room.players.map(p => ({ id: p.id, name: p.name, score: p.score, wordsFound: p.wordsFound.length }));
  scores.sort((a, b) => b.score - a.score);
  io.to(room.id).emit('round_over', { grid: room.puzzle.grid, targetSlots: room.puzzle.targetSlots.map(s => ({ length: s.length, word: s.word, foundBy: s.foundBy })), allPossible: room.puzzle.allPossible, scores, round: room.round, totalRounds: room.totalRounds });
  if (room.round >= room.totalRounds) {
    const final = [...room.players].sort((a, b) => b.score - a.score);
    io.to(room.id).emit('game_over', { winner: { id: final[0].id, name: final[0].name }, scores: final.map(p => ({ id: p.id, name: p.name, score: p.score })) });
    room.state = 'finished';
  }
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
    room.players.push({ id: socket.id, name: name || 'Player', avatar: avatar || '', score: 0, wordsFound: [], hintsLeft: 3 });
    socket.join(roomId);
    cb && cb({ ok: true, room: sanitizeRoom(room) });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    io.to(roomId).emit('chat', { system: true, text: `${name || 'Player'} joined` });
  });

  socket.on('start_game', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return cb && cb({ ok: false });
    if (startRound(room)) { io.to(roomId).emit('game_started', sanitizeRoom(room)); io.to(roomId).emit('room_update', sanitizeRoom(room)); }
    cb && cb({ ok: true });
  });

  socket.on('submit_word', ({ roomId, word, path }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return cb && cb({ ok: false });
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ ok: false });

    if (path && Array.isArray(path) && path.length >= 3) {
      const formed = validatePath(room.puzzle.grid, path);
      if (!formed) return cb && cb({ ok: false, error: 'Cells must be adjacent' });
      word = formed;
    } else { word = String(word || '').toLowerCase().trim(); }

    if (word.length < 3 || !/^[a-z]+$/.test(word)) return cb && cb({ ok: false });
    if (player.wordsFound.includes(word)) return cb && cb({ ok: false, error: 'Already found' });
    if (!DICT.has(word)) return cb && cb({ ok: false, error: 'Not a valid word' });

    const slot = room.puzzle.targetSlots.find(s => s.word === word && s.foundBy === null);
    if (!slot) return cb && cb({ ok: false, error: 'Not a target word' });

    slot.foundBy = socket.id;
    player.wordsFound.push(word);
    const isFirst = !room.puzzle.targetSlots.some(s => s.foundBy !== null && s.foundBy !== socket.id);
    player.score += 50 + (isFirst ? 25 : 0);

    io.to(roomId).emit('word_found', { playerId: socket.id, playerName: player.name, word, length: word.length, slotIndex: room.puzzle.targetSlots.indexOf(slot), score: player.score, path: path || null });
    io.to(roomId).emit('room_update', sanitizeRoom(room));
    cb && cb({ ok: true, word, score: player.score });
    if (allFound(room)) { player.score += 100; endRound(room); }
  });

  socket.on('use_hint', ({ roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room || room.state !== 'playing') return cb && cb({ ok: false });
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return cb && cb({ ok: false });

    const isHost = room.host === socket.id;
    if (!isHost) {
      if (!player.hintsLeft) player.hintsLeft = 3;
      if (player.hintsLeft <= 0) return cb && cb({ ok: false, error: 'No hints left' });
    }
    const slot = room.puzzle.targetSlots.find(s => s.foundBy === null);
    if (!slot) return cb && cb({ ok: false, error: 'All words found' });
    if (!isHost) player.hintsLeft--;
    if (!slot.hintRevealed) slot.hintRevealed = 0;
    slot.hintRevealed = Math.min(slot.hintRevealed + 1, slot.word.length);
    const revealed = slot.word.slice(0, slot.hintRevealed);
    const firstCh = slot.word[0];
    let startCell = null;
    for (let r = 0; r < 6; r++) { for (let c = 0; c < 6; c++) { if (room.puzzle.grid[r][c] === firstCh) { startCell = [r, c]; break; } } if (startCell) break; }
    cb && cb({ ok: true, slotIndex: room.puzzle.targetSlots.indexOf(slot), revealed, wordLength: slot.word.length, startCell, hintsLeft: isHost ? '∞' : player.hintsLeft });
  });

  socket.on('next_round', ({ roomId }, cb) => { const room = rooms.get(roomId); if (room && room.host === socket.id && startRound(room)) { io.to(roomId).emit('game_started', sanitizeRoom(room)); io.to(roomId).emit('room_update', sanitizeRoom(room)); } cb && cb({ ok: true }); });
  socket.on('play_again', ({ roomId }, cb) => { const room = rooms.get(roomId); if (room && room.host === socket.id) { room.state = 'waiting'; room.round = 0; room.puzzle = null; room.players.forEach(p => { p.score = 0; p.wordsFound = []; p.hintsLeft = 3; }); io.to(roomId).emit('room_update', sanitizeRoom(room)); } cb && cb({ ok: true }); });
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
  if (room.players.length === 0) { rooms.delete(roomId); return; }
  if (room.host === socket.id) room.host = room.players[0].id;
  io.to(roomId).emit('room_update', sanitizeRoom(room));
  io.to(roomId).emit('chat', { system: true, text: `${p.name} left` });
  if (room.state === 'playing' && allFound(room)) endRound(room);
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
