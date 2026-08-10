// ── TikTok LIVE chat bridge (OPTIONAL, read-only, OFF by default) ─────────
// Reads chat comments from a TikTok live stream and forwards them to the
// game's chat-answer handler. It NEVER posts, comments, follows, or acts on
// TikTok — it only listens. The game works perfectly without it; if the
// bridge stops, chat answers simply pause and browser players are unaffected.
//
// Env vars (all optional, everything off unless set):
//   CHAT_BRIDGE_ENABLED=true   — start the bridge on boot
//   TIKTOK_LIVE_USERNAME       — the TikTok username whose live chat to read
//   TIKTOK_SESSION_ID          — optional TikTok web session cookie (some
//                                accounts/streams require it; improves reliability)
//
// Runtime controls (HTTP):
//   POST /api/bridge/start     — start reading (kill-switch friendly)
//   POST /api/bridge/stop      — stop immediately
//   GET  /api/bridge/status    — connected?, counts, last error

const state = {
  running: false,
  stopped: false,
  conn: null,
  retryTimer: null,
  username: '',
  startedAt: 0,
  lastChatAt: 0,
  chatCount: 0,
  correctCount: 0,
  giftCount: 0,
  giftReveals: 0,
  lastError: ''
};

let onAnswer = null; // set by server.js → handleChatAnswer({ user, text })
let onGift = null;   // set by server.js → handleChatGift({ user, diamonds })

function loadConnector() {
  try {
    return require('tiktok-live-connector');
  } catch (e) {
    state.lastError = 'tiktok-live-connector not installed: ' + e.message;
    return null;
  }
}

function scheduleReconnect(delayMs) {
  if (state.stopped || state.retryTimer) return;
  state.retryTimer = setTimeout(() => {
    state.retryTimer = null;
    if (!state.stopped) start();
  }, delayMs || 15000);
}

function start() {
  const username = (process.env.TIKTOK_LIVE_USERNAME || '').trim();
  if (!username) return { ok: false, error: 'TIKTOK_LIVE_USERNAME not set' };
  if (state.running) return { ok: true, already: true, username: state.username };

  const lib = loadConnector();
  if (!lib || !lib.WebcastPushConnection) return { ok: false, error: state.lastError || 'connector unavailable' };

  state.stopped = false;
  state.username = username;

  let conn;
  try {
    conn = new lib.WebcastPushConnection(username, {
      sessionId: process.env.TIKTOK_SESSION_ID || '',
      enableExtendedGiftInfo: true,
      requestOptions: { timeout: 10000 }
    });
  } catch (e) {
    state.lastError = 'failed to create connection: ' + (e && e.message ? e.message : e);
    return { ok: false, error: state.lastError };
  }
  state.conn = conn;

  conn.on('chat', (data) => {
    const user = String((data && data.uniqueId) || '').trim();
    const text = String((data && data.comment) || '').trim();
    if (!user || !text) return;
    state.chatCount++;
    state.lastChatAt = Date.now();
    if (onAnswer) {
      const res = onAnswer({ user, text });
      if (res && res.ok) state.correctCount++;
    }
  });

  conn.on('gift', (data) => {
    const user = String((data && data.uniqueId) || '').trim();
    if (!user) return;
    state.giftCount++;
    const diamonds = Number((data && (data.diamondCount !== undefined ? data.diamondCount : data.diamonds)) || 0);
    if (onGift) {
      const res = onGift({ user, diamonds });
      if (res && res.ok) state.giftReveals++;
    }
  });

  conn.on('disconnected', () => {
    if (state.stopped) return;
    state.lastError = 'disconnected';
    scheduleReconnect(15000);
  });

  conn.on('streamEnd', () => {
    if (state.stopped) return;
    state.lastError = 'stream ended — waiting for the next live';
    scheduleReconnect(30000);
  });

  conn.on('error', (err) => {
    state.lastError = String((err && err.message) || err || 'unknown error');
  });

  conn.connect()
    .then(() => {
      state.running = true;
      state.startedAt = Date.now();
      state.lastError = '';
    })
    .catch((err) => {
      state.lastError = String((err && err.message) || err || 'connect failed');
      scheduleReconnect(20000); // keep trying — stream may not be live yet
    });

  return { ok: true, username };
}

function stop() {
  state.stopped = true;
  state.running = false;
  if (state.retryTimer) { clearTimeout(state.retryTimer); state.retryTimer = null; }
  if (state.conn) {
    try { state.conn.disconnect(); } catch (_) { /* ignore */ }
    state.conn = null;
  }
  return { ok: true };
}

function status() {
  return {
    enabled: process.env.CHAT_BRIDGE_ENABLED === 'true',
    running: state.running,
    username: state.username || (process.env.TIKTOK_LIVE_USERNAME || '').trim(),
    connected: state.running && !!state.conn,
    chatCount: state.chatCount,
    correctCount: state.correctCount,
    giftCount: state.giftCount,
    giftReveals: state.giftReveals,
    lastChatAt: state.lastChatAt,
    startedAt: state.startedAt,
    lastError: state.lastError
  };
}

module.exports = {
  init({ onAnswer: cb, onGift: gb }) {
    onAnswer = cb;
    onGift = gb;
    return { start, stop, status };
  }
};
