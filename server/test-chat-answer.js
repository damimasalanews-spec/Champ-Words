// ── Integration test: TikTok chat answers (no live needed) ───────────────
// Spawns the game server with CHAT_TEST_KEY, creates + starts a room via a
// fake host socket, then verifies the whole chat-answer pipeline:
//   wrong word rejected · correct word scores · duplicates blocked ·
//   leaderboard shows chat players · bridge is OFF by default.
// Run:  node server/test-chat-answer.js   (from repo root)
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const path = require('path');
const { maskText } = require('./badWords');
const CATS = require('./categories');
const { WORD_ART } = require('./wordArt');
const PACKS = require('./categoryPacks');
const fs = require('fs');
// Mirror the server's dictionary filter
const TEST_DICT = new Set(
  fs.readFileSync(path.join(__dirname, 'words.txt'), 'utf-8').split(/\r?\n/)
    .map(w => w.trim().toLowerCase())
    .filter(w => { const l = w.replace(/[^a-z]/g, ''); return l.length >= 5 && l.length <= 8; })
);
// Mirror the server's pack merge
for (const [id, ws] of Object.entries(PACKS)) {
  CATS.words[id] = [...new Set(ws.filter(w => WORD_ART[w] && TEST_DICT.has(w)))];
}
CATS.words.countries = ['india', 'china', 'france', 'egypt', 'brazil', 'canada', 'japan', 'germany', 'italy', 'spain', 'mexico', 'turkey', 'poland', 'sweden', 'norway', 'denmark', 'portugal', 'greece', 'ireland', 'iceland', 'england', 'scotland', 'wales', 'russia', 'thailand', 'vietnam', 'malaysia', 'pakistan', 'nepal', 'bhutan', 'chile', 'nigeria', 'kenya', 'ghana', 'senegal', 'morocco', 'algeria', 'tunisia', 'sudan', 'somalia', 'ethiopia', 'tanzania', 'uganda', 'zambia', 'zimbabwe', 'angola', 'cyprus', 'jordan', 'israel', 'lebanon', 'syria', 'yemen', 'qatar', 'kuwait', 'saudi', 'bahrain', 'mongolia', 'taiwan', 'cambodia', 'myanmar', 'niger', 'congo', 'rwanda', 'malawi', 'namibia', 'botswana', 'guinea', 'liberia', 'armenia', 'georgia', 'ukraine', 'belarus', 'moldova', 'romania', 'bulgaria', 'hungary', 'austria', 'belgium', 'slovakia', 'slovenia', 'croatia', 'bosnia', 'serbia', 'albania', 'estonia', 'latvia', 'finland', 'andorra', 'malta', 'monaco', 'ecuador', 'colombia', 'bolivia', 'paraguay', 'uruguay', 'guyana', 'panama', 'honduras', 'haiti', 'jamaica', 'trinidad', 'barbados', 'bahamas', 'grenada', 'samoa', 'papua', 'solomon', 'puerto'];
// Require server.js for its exported pickers. Bind to an ephemeral port so
// the parent require's idle listener never conflicts (the spawned child
// overrides PORT with its own test port).
process.env.PORT = '0';
const { pickRandomWord, generateChoices } = require('./server.js');

const PORT = 3998;
const TEST_KEY = 'testkey123';
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
let failed = 0;

function check(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  if (!cond) failed++;
}

async function post(p, body) {
  const res = await fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function get(p) {
  const res = await fetch(BASE + p);
  return res.json();
}
function emitAck(socket, ev, payload) {
  return new Promise(resolve => socket.emit(ev, payload, resolve));
}

(async () => {
  const child = spawn(process.execPath, ['server/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, PORT: String(PORT), CHAT_TEST_KEY: TEST_KEY, CHAT_BRIDGE_ENABLED: 'false',
      CHAT_GIFT_COOLDOWN_MS: '100', CHAT_ANSWER_COOLDOWN_MS: '200',
      CHAT_GIFT_TIER2_DIAMONDS: '10', CHAT_GIFT_TIER3_DIAMONDS: '50'
    },
    stdio: 'ignore'
  });
  await new Promise(r => setTimeout(r, 4000));

  try {
    // 1. No active room yet → chat answers rejected safely
    let r = await post('/api/chat-answer', { user: 'fanso_fan', text: 'apple' });
    check('chat answer before any room → rejected', !r.ok && /no active round/.test(r.error), JSON.stringify(r));

    // 2. Fake host: admin login → create room → start game
    const socket = io(BASE, { transports: ['websocket'] });
    await new Promise((res, rej) => { socket.on('connect', res); socket.on('connect_error', rej); setTimeout(() => rej(new Error('socket timeout')), 5000); });
    const login = await emitAck(socket, 'admin_login', { adminId: 'champwords', password: 'champwords@123' });
    check('admin login ok', login && login.ok);
    const created = await emitAck(socket, 'create_room', { name: 'Host', totalRounds: 5, adminToken: login.token, playerKey: 'host-key' });
    check('room created', created && created.ok);
    const roomId = created.room.id;
    const started = await emitAck(socket, 'start_game', { roomId });
    check('game started', started && started.ok);
    await new Promise(r => setTimeout(r, 800));

    // 3. Read the secret word via the test-only debug endpoint
    const dbg = await get(`/api/debug/word?key=${TEST_KEY}`);
    check('debug word available', dbg.ok && typeof dbg.word === 'string', dbg.ok ? dbg.word : JSON.stringify(dbg));
    const word = dbg.word;

    // 4. Wrong word → rejected, no player created
    r = await post('/api/chat-answer', { user: 'fanso_fan', text: 'not-the-word' });
    check('wrong word rejected', !r.ok && /wrong word/.test(r.error), JSON.stringify(r));

    // 5. Correct word → user A scored
    r = await post('/api/chat-answer', { user: 'fanso_fan', text: word });
    check('correct word scored', r.ok && r.score >= 10 && r.score <= 100, JSON.stringify(r));

    // 6. Duplicate → blocked (anti-spam)
    r = await post('/api/chat-answer', { user: 'fanso_fan', text: word });
    check('duplicate blocked', r.ok && r.already === true, JSON.stringify(r));

    // 7. Second user scores too
    r = await post('/api/chat-answer', { user: 'viewer2', text: word });
    check('second user scored', r.ok && r.score >= 10, JSON.stringify(r));

    // 8. Leaderboard now shows both chat players with scores
    const dbg2 = await get(`/api/debug/word?key=${TEST_KEY}`);
    const players = dbg2.room.players || [];
    const chatA = players.find(p => p.isChat && p.name === 'fanso_fan');
    const chatB = players.find(p => p.isChat && p.name === 'viewer2');
    check('leaderboard has chat player A', !!chatA && chatA.score >= 10 && chatA.isChat === true);
    check('leaderboard has chat player B', !!chatB && chatB.score >= 10);
    check('host still present', players.some(p => p.name === 'Host'));

    // 9. Bridge status: OFF by default (safe)
    const status = await get('/api/bridge/status');
    check('bridge disabled by default', status.enabled === false && status.running === false, JSON.stringify(status));

    // 10. Bridge start without username → refuses safely
    const startRes = await post('/api/bridge/start', {});
    check('bridge start refuses without username', !startRes.ok, JSON.stringify(startRes));

    // 11. Gift below minimum diamonds → rejected
    r = await post('/api/chat-gift', { user: 'big_fan', diamonds: 0 });
    check('gift below min rejected', !r.ok, JSON.stringify(r));

    // 12. Gift reveals a letter (revealedLetters count increases)
    const countHidden = roomState => (roomState.revealedLetters || []).filter(l => l !== '' && l !== ' ').length;
    const before = countHidden((await get(`/api/debug/word?key=${TEST_KEY}`)).room);
    r = await post('/api/chat-gift', { user: 'big_fan', diamonds: 5 });
    const after = countHidden((await get(`/api/debug/word?key=${TEST_KEY}`)).room);
    check('gift reveals a letter', r.ok && after === before + 1, `before=${before} after=${after} ${JSON.stringify(r)}`);

    // 13. Immediate second gift from same user → cooldown
    r = await post('/api/chat-gift', { user: 'big_fan', diamonds: 5 });
    check('gift cooldown respected', !r.ok && /cooldown/.test(r.error), JSON.stringify(r));

    // 14. All-time leaderboard includes the chat players
    const alltime = await get('/api/alltime');
    const at = (alltime.top || []);
    const aA = at.find(p => p.name === 'fanso_fan');
    const aB = at.find(p => p.name === 'viewer2');
    check('all-time has fanso_fan', !!aA && aA.score >= 10, JSON.stringify(aA || null));
    check('all-time has viewer2', !!aB && aB.score >= 10, JSON.stringify(aB || null));
    check('all-time sorted desc', at.every((p, i) => i === 0 || at[i - 1].score >= p.score));

    // 15. Round settings: create a room with custom time + difficulty
    const r2 = await emitAck(socket, 'create_room', { name: 'Host2', totalRounds: 8, roundTimeMs: 30000, difficulty: 'easy', adminToken: login.token, playerKey: 'host2-key' });
    check('custom room settings stored', r2 && r2.ok && r2.room.totalRounds === 8 && r2.room.roundTimeMs === 30000 && r2.room.difficulty === 'easy', JSON.stringify(r2 && r2.room));
    const started2 = await emitAck(socket, 'start_game', { roomId: r2.room.id });
    check('custom room started', started2 && started2.ok);
    await new Promise(r => setTimeout(r, 800));
    const dbg3 = await get(`/api/debug/word?key=${TEST_KEY}`);
    const wlen = (dbg3.word || '').replace(/[^a-z]/g, '').length;
    check('easy difficulty word is 3-5 letters', dbg3.ok && wlen >= 3 && wlen <= 5, `${dbg3.word} (${wlen} letters)`);

    // 16. Profanity filter unit checks
    const pm = maskText('fuck you');
    check('maskText masks profanity', pm.includes('*') && !pm.includes('fuck'), pm);
    check('maskText leaves clean text', maskText('hello world') === 'hello world');
    check('maskText handles uppercase', maskText('FUCKING') !== 'FUCKING');
    check('maskText respects word boundaries', maskText('assemble') === 'assemble');

    // 17. Categories + Word of the Day endpoints
    const cats = await get('/api/categories');
    check('categories include trade pack', cats.ok && cats.list.some(c => c.id === 'trade'), JSON.stringify((cats.list || []).map(c => c.id).join(',')));
    const wotd = await get('/api/wotd');
    check('wotd returns a drawable daily word', wotd.ok && !!wotd.art && wotd.word.replace(/[^a-z]/g, '').length === wotd.length, JSON.stringify(wotd));

    // 17b. Every selectable category must have enough drawable words (≥6) so
    // system rounds and champ choices respect the chosen theme.
    const thin = Object.entries(CATS.words)
      .filter(([id]) => id !== 'mixed')
      .filter(([, ws]) => ws.filter(w => WORD_ART[w]).length < 6)
      .map(([id, ws]) => `${id}:${ws.filter(w => WORD_ART[w]).length}`);
    check('all categories have ≥6 drawable words', thin.length === 0, thin.join(', ') || 'ok');

    // 17c. No-repeat word selection across rounds
    const used = [];
    const picks = [];
    for (let i = 0; i < 30; i++) {
      const w = pickRandomWord('medium', 'trade', used);
      picks.push(w);
      used.push(w);
    }
    check('trade pool: no repeats for first 21 picks', new Set(picks.slice(0, 21)).size === 21, picks.slice(0, 21).join(','));
    const c1 = generateChoices('medium', 'trade', ['truck', 'money', 'clock']);
    check('champ choices exclude used words', c1.length >= 6 && !c1.includes('truck') && !c1.includes('money') && !c1.includes('clock'), c1.join(','));
    const used2 = [];
    const picks2 = [];
    for (let i = 0; i < 30; i++) { const w = pickRandomWord('medium', 'mixed', used2); picks2.push(w); used2.push(w); }
    check('mixed pool: 30 rounds with zero repeats', new Set(picks2).size === 30);
    // Countries pack: big pool, no repeats for 30 rounds
    const used3 = [];
    const picks3 = [];
    for (let i = 0; i < 30; i++) { const w = pickRandomWord('medium', 'countries', used3); picks3.push(w); used3.push(w); }
    check('countries pool: 30 rounds with zero repeats', new Set(picks3).size === 30, picks3.slice(0, 10).join(','));
    // Every category needs a 50+ drawable pool so long games don't repeat early
    const thin2 = Object.entries(CATS.words)
      .filter(([id]) => id !== 'mixed')
      .filter(([, ws]) => ws.filter(w => WORD_ART[w]).length < 50)
      .map(([id, ws]) => `${id}:${ws.filter(w => WORD_ART[w]).length}`);
    check('all categories have ≥50 drawable words', thin2.length === 0, thin2.join(', ') || 'ok');

    // 18. Rate limit on wrong chat answers (CHAT_ANSWER_COOLDOWN_MS=200)
    await new Promise(r => setTimeout(r, 300));
    r = await post('/api/chat-answer', { user: 'spammer', text: 'not-the-word' });
    const rRate = await post('/api/chat-answer', { user: 'spammer', text: 'still-wrong' });
    check('wrong-answer rate limited', !r.ok && !rRate.ok && /slow down/.test(rRate.error), JSON.stringify(rRate));
    await new Promise(r => setTimeout(r, 300));
    r = await post('/api/chat-answer', { user: 'spammer', text: 'not-the-word-2' });
    check('rate limit releases', !r.ok && /wrong word/.test(r.error), JSON.stringify(r));

    // 19. Gift tiers (cooldown 100ms; room2 is the newest active playing room)
    const hiddenCount = async () => {
      const d = await get(`/api/debug/word?key=${TEST_KEY}`);
      return (d.room.revealedLetters || []).filter(l => l !== '' && l !== ' ').length;
    };
    const h0 = await hiddenCount();
    r = await post('/api/chat-gift', { user: 'tier1_fan', diamonds: 5 });
    const h1 = await hiddenCount();
    check('tier1 gift reveals 1 letter', r.ok && h1 === h0 + 1, `h0=${h0} h1=${h1} ${JSON.stringify(r)}`);
    await new Promise(r => setTimeout(r, 150));
    r = await post('/api/chat-gift', { user: 'tier2_fan', diamonds: 10 });
    const h2 = await hiddenCount();
    check('tier2 gift reveals 2 letters', r.ok && h2 === h1 + 2, `h1=${h1} h2=${h2} ${JSON.stringify(r)}`);
    await new Promise(r => setTimeout(r, 150));
    r = await post('/api/chat-gift', { user: 'tier3_fan', diamonds: 50 });
    const h3 = await hiddenCount();
    check('tier3 gift reveals full word', r.ok && r.full === true && h3 >= h2 + 1, JSON.stringify(r));

    // 20. Room with trade category + short rounds (8s) for streaks & moderation
    const r3 = await emitAck(socket, 'create_room', { name: 'Host3', totalRounds: 5, roundTimeMs: 8000, difficulty: 'medium', category: 'trade', adminToken: login.token, playerKey: 'host3-key' });
    check('trade room created', r3 && r3.ok && r3.room.category === 'trade');
    const started3 = await emitAck(socket, 'start_game', { roomId: r3.room.id });
    check('trade room started', started3 && started3.ok);
    const dbgT = await get(`/api/debug/word?key=${TEST_KEY}`);
    const TRADE = CATS.words.trade;
    check('trade word comes from the trade pack', TRADE.includes(dbgT.word), dbgT.word);

    // 21. Moderation: join a player, mute → blocked, unmute → allowed, kick → removed
    const joined = io(BASE, { transports: ['websocket'] });
    await new Promise((res, rej) => { joined.on('connect', res); joined.on('connect_error', rej); setTimeout(() => rej(new Error('join timeout')), 5000); });
    const jr = await emitAck(joined, 'join_room', { roomId: r3.room.id, name: 'Troll', playerKey: 'troll-key' });
    check('player joined for moderation', jr && jr.ok);
    const trollId = jr.room.players.find(p => p.name === 'Troll').id;
    const kickedP = new Promise(res => joined.on('kicked', () => res(true)));
    // non-host cannot mute
    let mr = await emitAck(joined, 'mute_player', { roomId: r3.room.id, playerId: socket.id, seconds: 30 });
    check('non-host cannot mute', !mr.ok && /host/.test(mr.error), JSON.stringify(mr));
    // host mutes the troll
    mr = await emitAck(socket, 'mute_player', { roomId: r3.room.id, playerId: trollId, seconds: 30 });
    check('host mutes player', mr && mr.ok);
    // muted player's submit is blocked (round must still be playing — 8s window)
    const sr = await emitAck(joined, 'submit_word', { roomId: r3.room.id, word: 'whatever', path: [] });
    check('muted player blocked', sr && !sr.ok && /muted/.test(sr.error), JSON.stringify(sr));
    // unmute
    mr = await emitAck(socket, 'unmute_player', { roomId: r3.room.id, playerId: trollId });
    check('host unmutes player', mr && mr.ok);
    // unmuted player can submit again (wrong word → not the word)
    const sr2 = await emitAck(joined, 'submit_word', { roomId: r3.room.id, word: 'whatever', path: [] });
    check('unmuted player can submit', sr2 && !sr2.ok && /Not the word/i.test(sr2.error), JSON.stringify(sr2));
    // host kicks the troll
    const kr = await emitAck(socket, 'kick_player', { roomId: r3.room.id, playerId: trollId });
    check('host kicks player', kr && kr.ok);
    const kickedOk = await Promise.race([kickedP, new Promise(res => setTimeout(() => res(false), 3000))]);
    check('kicked player receives kicked event', kickedOk === true);
    const dbgK = await get(`/api/debug/word?key=${TEST_KEY}`);
    check('kicked player removed from room', !(dbgK.room.players || []).some(p => p.id === trollId));
    joined.close();

    // 22. Streak bonus: fanso_fan answers in round 1 (streak 1), then round 2 (streak 2 → +50)
    r = await post('/api/chat-answer', { user: 'fanso_fan', text: dbgT.word });
    check('chat answer in trade round', r.ok && r.score >= 10, JSON.stringify(r));
    await new Promise(r => setTimeout(r, 22000)); // round 1 (8s) + 6s time-up + 6s advance + margin → round 2 playing
    const dbgT2 = await get(`/api/debug/word?key=${TEST_KEY}`);
    check('round 2 active for streak test', dbgT2.ok && !!dbgT2.word && TRADE.includes(dbgT2.word), JSON.stringify(dbgT2));
    const rStreak = await post('/api/chat-answer', { user: 'fanso_fan', text: dbgT2.word });
    check('second correct answer earns streak bonus (>=60)', rStreak.ok && rStreak.score >= 60, JSON.stringify(rStreak));

    // 23. All-time stats: found + best streak recorded
    const alltime2 = await get('/api/alltime');
    const aF = (alltime2.top || []).find(p => p.name === 'fanso_fan');
    check('all-time tracks found count', aF && aF.found >= 2, JSON.stringify(aF || null));
    check('all-time tracks best streak', aF && aF.bestStreak >= 2, JSON.stringify(aF || null));

    socket.close();
  } catch (e) {
    failed++;
    results.push('FAIL  test crashed: ' + e.message);
  } finally {
    child.kill();
  }

  console.log('\n── Chat-answer integration test ──');
  results.forEach(line => console.log(line));
  console.log(`\n${failed === 0 ? 'ALL PASS ✅' : failed + ' FAILURE(S) ❌'}`);
  process.exit(failed === 0 ? 0 : 1);
})();
