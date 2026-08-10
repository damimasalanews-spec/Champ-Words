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
// JSON entries also work:  {"user":"fanso_fan","text":"apple"}

const url = (() => {
  const i = process.argv.indexOf('--url');
  return i >= 0 ? process.argv[i + 1] : 'http://localhost:3000';
})();
const endpoint = url.replace(/\/$/, '') + '/api/chat-answer';

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
    console.log('No comments given. Example:');
    console.log('  node server/chatSimulator.js --url http://localhost:3000 "fanso_fan|apple"');
    process.exit(1);
  }
  console.log(`Simulating ${list.length} chat comment(s) → ${endpoint}\n`);
  for (const entry of list) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      const data = await res.json();
      console.log(`@${entry.user}  "${entry.text}"  →  ${JSON.stringify(data)}`);
    } catch (e) {
      console.log(`@${entry.user}  "${entry.text}"  →  ERROR: ${e.message}`);
    }
  }
})();
