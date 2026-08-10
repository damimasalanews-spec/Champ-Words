// ── TikTok live-chat SIMULATOR (test without going live) ─────────────────
// Feeds fake chat comments to the game's chat-answer endpoint, exactly as
// the real bridge would — so you can verify scoring/leaderboard logic from
// your desk. Sends NOTHING to TikTok.
//
// Usage:
//   node server/chatSimulator.js --url http://localhost:3000 "fanso_fan|apple" "viewer2|apple"
//   echo "fanso_fan|apple" | node server/chatSimulator.js --url http://localhost:3000
//
// Each entry is  "tiktokUsername|word"   (spaces in the word are fine).
// Gifts:  "tiktokUsername|gift:5"   → posts to /api/chat-gift (5 diamonds).
// JSON entries also work:  {"user":"fanso_fan","text":"apple"} / {"user":"x","diamonds":5}

const url = (() => {
  const i = process.argv.indexOf('--url');
  return i >= 0 ? process.argv[i + 1] : 'http://localhost:3000';
})();
const base = url.replace(/\/$/, '');
const chatEndpoint = base + '/api/chat-answer';
const giftEndpoint = base + '/api/chat-gift';

const entries = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--url') { i++; continue; }
  if (a.startsWith('{')) { try { entries.push(JSON.parse(a)); } catch (_) {} continue; }
  const bar = a.indexOf('|');
  if (bar > 0) entries.push({ user: a.slice(0, bar).trim(), text: a.slice(bar + 1).trim() });
}

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

function classify(entry) {
  // {"user","diamonds"} or "user|gift:N" → gift; otherwise chat answer
  if (entry.diamonds !== undefined) return { kind: 'gift', payload: { user: entry.user, diamonds: entry.diamonds } };
  const t = String(entry.text || '');
  const m = t.match(/^gift:(\d+)$/i);
  if (m) return { kind: 'gift', payload: { user: entry.user, diamonds: Number(m[1]) } };
  return { kind: 'chat', payload: { user: entry.user, text: t } };
}

(async () => {
  let list = entries;
  if (list.length === 0 && !process.stdin.isTTY) {
    const raw = await readStdin();
    list = raw.split(/\r?\n/).filter(Boolean).map(line => {
      const bar = line.indexOf('|');
      return bar > 0 ? { user: line.slice(0, bar).trim(), text: line.slice(bar + 1).trim() } : null;
    }).filter(Boolean);
  }
  if (list.length === 0) {
    console.log('No entries given. Examples:');
    console.log('  node server/chatSimulator.js --url http://localhost:3000 "fanso_fan|apple" "viewer2|gift:5"');
    process.exit(1);
  }
  console.log(`Simulating ${list.length} TikTok event(s) → ${base}\n`);
  for (const entry of list) {
    const { kind, payload } = classify(entry);
    try {
      const res = await fetch(kind === 'gift' ? giftEndpoint : chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`[${kind}] @${payload.user}  ${JSON.stringify(payload)}  →  ${JSON.stringify(data)}`);
    } catch (e) {
      console.log(`[${kind}] @${payload.user}  ${JSON.stringify(payload)}  →  ERROR: ${e.message}`);
    }
  }
})();
