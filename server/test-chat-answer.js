// ── Integration test: TikTok chat answers (no live needed) ───────────────
// Spawns the game server with CHAT_TEST_KEY, creates + starts a room via a
// fake host socket, then verifies the whole chat-answer pipeline:
//   wrong word rejected · correct word scores · duplicates blocked ·
//   leaderboard shows chat players · bridge is OFF by default.
// Run:  node server/test-chat-answer.js   (from repo root)
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const path = require('path');

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
    env: { ...process.env, PORT: String(PORT), CHAT_TEST_KEY: TEST_KEY, CHAT_BRIDGE_ENABLED: 'false' },
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
