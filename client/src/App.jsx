import { useState, useEffect, useRef, useCallback } from 'react';
import socket from './socket';
import Logo from './components/Logo';
import { playSound, toggleMute, isMuted } from './sounds';

// Category → ambient background tint
const CAT_TINTS = {
  animals: '#34d399', food: '#fbbf24', nature: '#4ade80', body: '#f87171',
  home: '#a78bfa', clothes: '#f472b6', travel: '#38bdf8', sports: '#2dd4bf',
  arts: '#e879f9', colors: '#facc15', people: '#fde047', trade: '#fbbf24',
  mixed: '#7c5cf0'
};
import LoginPage from './components/LoginPage';
import Lobby from './components/Lobby';
import Game from './components/Game';
import RoundOver from './components/RoundOver';
import GameOver from './components/GameOver';
import Chat from './components/Chat';
import VoiceChat from './components/VoiceChat';
import Toast from './components/Toast';
import './App.css';

// Persistent identity for this browser — lets a player rejoin their room
// after a reload/accidental leave and keep their points and progress.
function getPlayerKey() {
  try {
    let k = localStorage.getItem('cw_player_key');
    if (!k) {
      k = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'k' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('cw_player_key', k);
    }
    return k;
  } catch (_) {
    return 'k' + Math.random().toString(36).slice(2);
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // { name, avatar }
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState(null);
  // Studio links (?auto=1 / ?host=1 / ?play=1) ask for a name first —
  // players never auto-join silently with a default name.
  const [studioNamePending, setStudioNamePending] = useState(false);
  const studioNameSecondsRef = useRef(20); // 20s on studio links, 10s on Play as guest
  const [rivalryPulse, setRivalryPulse] = useState(false);
  const [studioName, setStudioName] = useState(() => {
    try { return localStorage.getItem('champWordsName') || ''; } catch (_) { return ''; }
  });

  // Render mode (tiktok-half studio canvas vs cw-web responsive app) is
  // decided once in main.jsx — do NOT toggle tiktok-half here based on the
  // room, or web sessions would snap back to the fixed 540×960 canvas.
  const [chatOpen, setChatOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [muted, setMuted] = useState(() => isMuted());
  const [autoStatus, setAutoStatus] = useState('');
  const [duelMsg, setDuelMsg] = useState(''); // speed-duel result banner
  const [duelWord, setDuelWord] = useState(''); // defender's duel answer input
  const duelMsgTimer = useRef(null);
  const [notifications, setNotifications] = useState([]); // live ticker messages
  const [watching, setWatching] = useState(0); // live viewer count
  const [achPopup, setAchPopup] = useState(null); // achievement unlock toast
  const [achOpen, setAchOpen] = useState(false); // achievements cabinet
  const [achList, setAchList] = useState(null);
  const [blacklistWord, setBlacklistWord] = useState(''); // host blacklist input

  const showToast = useCallback((text, type = 'error') => {
    setToast({ text, type });
    playSound('toast');
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 30s grace period on the join page: the player gets time to write their
  // name before being auto-returned to their last room.
  const REJOIN_DELAY_MS = 30000;
  const [rejoinIn, setRejoinIn] = useState(null);     // countdown seconds
  const [pendingRoom, setPendingRoom] = useState(''); // room we're waiting to return to
  const rejoinTimerRef = useRef(null);

  const cancelAutoRejoin = useCallback(() => {
    if (rejoinTimerRef.current) { clearInterval(rejoinTimerRef.current); rejoinTimerRef.current = null; }
    setRejoinIn(null); setPendingRoom('');
  }, []);

  // Shared handling of a join/create response: store the room for rejoin and
  // pick the right screen (works for waiting rooms AND mid-game joins).
  const applyJoinedRoom = useCallback((res) => {
    if (!res || !res.ok) return false;
    setRoom(res.room);
    localStorage.setItem('cw_last_room', res.room.id);
    const st = res.room.state;
    if (st === 'round_over' && res.lastRound) { setRoundResult(res.lastRound); setGameResult(null); setScreen('round_over'); }
    else if (st === 'game_over' && res.lastGame) { setGameResult(res.lastGame); setRoundResult(null); setScreen('game_over'); }
    else if (st === 'playing' || st === 'champ_pick' || st === 'round_over') { setRoundResult(null); setGameResult(null); setScreen('playing'); }
    else { setRoundResult(null); setGameResult(null); setScreen('waiting'); }
    return true;
  }, []);

  // Check auth on mount (or auto-guest via ?auto=1 / ?guest=Name —
  // used by studio browser sources that cannot be clicked, e.g. TikTok Live Studio)
  // Render mode for web sessions: home/lobby/waiting are responsive (cw-web)
  // on both mobile and desktop; only the actual game screens (playing, round
  // over, game over) switch to the original fixed canvas (tiktok-half) on a
  // DESKTOP viewport, exactly as they always were. Studio sources (?half /
  // ?auto) are locked to the canvas by main.jsx and are never touched here.
  const isStudio = new URLSearchParams(window.location.search).has('half') || new URLSearchParams(window.location.search).has('auto');
  useEffect(() => {
    if (isStudio) return;
    const applyMode = () => {
      const inGame = screen === 'playing' || screen === 'round_over' || screen === 'game_over';
      // Game screens use the studio canvas (540×960) on DESKTOP viewports and
      // studio sources — exactly as they always were. On small/mobile viewports
      // they stay in the responsive cw-web layout so phones get a full-size,
      // thumb-friendly game instead of a shrunken stream canvas.
      const canvas = inGame && window.innerWidth >= 768;
      document.documentElement.classList.toggle('tiktok-half', canvas);
      document.documentElement.classList.toggle('cw-web', !canvas);
    };
    applyMode();
    window.addEventListener('resize', applyMode);
    return () => window.removeEventListener('resize', applyMode);
  }, [screen, isStudio]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // /tiktok is now the single permanent link — it shows the login/splash
    // page first (same design as the old root link), then flows into the
    // lobby and game. Only explicit studio params (?guest= / ?auto=1) skip
    // the login page (used by browser sources that cannot be clicked).
    // Only an explicit ?guest=Name still auto-joins silently (no-click
    // browser sources). Studio links (?auto / ?host / ?half / ?play) now
    // ask the player for their name first — never auto-join with a default.
    const autoGuest = params.get('guest');
    const studioLink = params.has('auto') || params.has('host') || params.has('half') || params.has('play');
    if (autoGuest) {
      setUser({ name: String(autoGuest).trim() || 'Guest', avatar: '', isGuest: true });
      setLoading(false);
      socket.connect();
      return;
    }
    if (studioLink) {
      studioNameSecondsRef.current = 20;
      setStudioNamePending(true);
      setLoading(false);
      return;
    }
    fetch('/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.user);
          setLoading(false);
          socket.connect();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // ── No auto-join: players join the active room themselves from the lobby
  // (details shown — room code + host — no code typing needed). Removed the
  // old auto-follow / auto-rejoin system that silently re-joined rooms.

  // Skip the remaining wait and return to the pending room right now
  const handleRejoinNow = useCallback(() => {
    const code = pendingRoom;
    if (!code) return;
    cancelAutoRejoin();
    socket.emit('join_room', { roomId: code, playerKey: getPlayerKey() }, (res) => {
      if (res && res.ok) applyJoinedRoom(res);
      else { localStorage.removeItem('cw_last_room'); showToast('Room no longer available'); }
    });
  }, [pendingRoom, cancelAutoRejoin, applyJoinedRoom, showToast]);

  // Instant re-join on reconnect — fixes "Player not found" after a network
  // blip (socket.io gets a NEW id; the server re-associates it via join_room)
  useEffect(() => {
    if (!room) return;
    const onConnect = () => {
      socket.emit('join_room', { roomId: room.id, playerKey: getPlayerKey() }, () => {});
    };
    socket.on('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [socket, room]);

  // Socket events (only after auth/guest)
  useEffect(() => {
    if (!user) return;

    socket.on('room_update', (data) => {
      setRoom(data);
      // Host restarted the game → everyone returns to the waiting room
      if (data.state === 'waiting') { setScreen('waiting'); setGameResult(null); setRoundResult(null); }
    });
    socket.on('champ_turn', (data) => { if (data && data.room) setRoom(data.room); setScreen('playing'); setRoundResult(null); });
    socket.on('round_started', (data) => { if (data && data.room) setRoom(data.room); setScreen('playing'); });
    socket.on('word_found', (data) => { if (data && data.room) setRoom(data.room); });
    socket.on('time_up', (data) => { if (data && data.room) setRoom(data.room); });
    socket.on('round_over', (data) => { if (data && data.room) setRoom(data.room); setRoundResult(data); setScreen('round_over'); playSound('roundover'); });
    socket.on('duel_end', (data) => {
      setDuelWord('');
      if (duelMsgTimer.current) clearTimeout(duelMsgTimer.current);
      if (data && data.winner) {
        setDuelMsg(data.winner);
        duelMsgTimer.current = setTimeout(() => setDuelMsg(''), 3500);
      } else {
        setDuelMsg('');
      }
    });
    socket.on('notify', (n) => {
      if (n && n.text) setNotifications(prev => [...prev.slice(-7), n]);
    });
    socket.on('game_over', (data) => { if (data && data.room) setRoom(data.room); setRoundResult(null); setGameResult(data); setScreen('game_over'); playSound('gameover'); });
    socket.on('chat', (msg) => { setMessages(prev => [...prev, msg]); playSound(msg && msg.sound ? msg.sound : 'chat'); });
    socket.on('chat_cleared', () => setMessages([]));
    socket.on('kicked', () => {
      showToast('You were removed by the host', 'error');
      cancelAutoRejoin();
      localStorage.removeItem('cw_last_room');
      setRoom(null); setScreen('lobby'); setRoundResult(null); setGameResult(null); setMessages([]); setChatOpen(false); setModOpen(false);
    });
    socket.on('connect_error', () => showToast('Cannot connect to server', 'error'));
    socket.on('viewers', (d) => setWatching(d && d.count ? d.count : 0));
    socket.on('achieve', (d) => {
      if (!d) return;
      setAchPopup(d);
      playSound('popup');
      setTimeout(() => setAchPopup(p => (p && p.id === d.id ? null : p)), 4200);
    });

    return () => {
      socket.off('room_update'); socket.off('champ_turn'); socket.off('round_started');
      socket.off('word_found'); socket.off('time_up'); socket.off('round_over');
      socket.off('game_over'); socket.off('chat'); socket.off('chat_cleared'); socket.off('kicked'); socket.off('connect_error');
      socket.off('viewers'); socket.off('achieve');
    };
  }, [user, showToast]);

  const openAchievements = async () => {
    try {
      const key = localStorage.getItem('cw_player_key') || '';
      const res = await fetch(`/api/achievements?key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data && data.ok) setAchList(data.achievements);
      setAchOpen(true);
    } catch (_) {
      setAchOpen(true);
    }
  };

  const handleCreateRoom = (name, opts = {}) => {
    cancelAutoRejoin();
    const adminToken = localStorage.getItem('cw_admin_token') || '';
    socket.emit('create_room', { name: name || user?.name, avatar: user?.avatar, totalRounds: opts.totalRounds, roundTimeMs: opts.roundTimeMs, difficulty: opts.difficulty, category: opts.category, playerKey: getPlayerKey(), adminToken }, (res) => {
      if (res.ok) { localStorage.setItem('cw_last_room', res.room.id); setRoom(res.room); setScreen('waiting'); setGameResult(null); setMessages([{ system: true, text: `Room created! Code: ${res.room.id}` }]); }
      else {
        // Stale/expired admin token → drop it so the login form shows again
        if (res.error && /admin/i.test(res.error)) localStorage.removeItem('cw_admin_token');
        showToast(res.error);
      }
    });
  };

  // Admin login — returns { ok } / { ok:false, error }; stores the session token
  const handleAdminLogin = useCallback((adminId, password) => {
    return new Promise(resolve => {
      socket.emit('admin_login', { adminId, password }, (res) => {
        if (res && res.ok) {
          localStorage.setItem('cw_admin_token', res.token);
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: (res && res.error) ? res.error : 'Login failed' });
        }
      });
    });
  }, [socket]);

  const handleJoinRoom = (roomId, name) => {
    cancelAutoRejoin();
    socket.emit('join_room', { roomId, name: name || user?.name, avatar: user?.avatar, playerKey: getPlayerKey() }, (res) => {
      if (res.ok) { applyJoinedRoom(res); setMessages([]); }
      else showToast(res.error);
    });
  };

  // Players tap "JOIN THE ROOM" — auto-join the host's active room, no code
  const handleJoinActiveRoom = (name) => {
    cancelAutoRejoin();
    socket.emit('join_active_room', { name: name || user?.name, avatar: user?.avatar, playerKey: getPlayerKey() }, (res) => {
      if (res && res.ok) { applyJoinedRoom(res); setMessages([]); }
      else showToast(res && res.error ? res.error : 'No active room');
    });
  };

  const handleStartGame = () => {
    if (!room) return;
    playSound('click');
    socket.emit('start_game', { roomId: room.id }, (res) => {
      if (!res.ok) showToast(res.error || 'Cannot start game');
    });
  };
  const handleChooseWord = (word, hintText) => {
    if (!room) return;
    socket.emit('choose_word', { roomId: room.id, word, hintText }, (res) => {
      if (res.ok) showToast(`Word set! ${res.wordLength} letters`, 'success');
      else showToast(res.error);
    });
  };
  const handleGuess = (word) => {
    if (!room) return;
    socket.emit('submit_word', { roomId: room.id, word }, (res) => {
      if (res.ok) showToast(`Correct! +${res.score} pts (+1 hint!)`, 'success');
      else if (res.error) showToast(res.error);
    });
  };
  const handleHint = () => {
    if (!room) return;
    socket.emit('use_hint', { roomId: room.id }, (res) => {
      if (!res.ok) { showToast(res.error); return; }
      showToast(`Hint: ${res.revealed.toUpperCase()}${'_'.repeat(res.wordLength - res.revealed.length)} (${res.hintsLeft} left)`, 'success');
    });
  };
  const handleLeave = () => {
    cancelAutoRejoin();
    if (room) socket.emit('leave_room', { roomId: room.id });
    localStorage.removeItem('cw_last_room'); // intentional leave — no auto-rejoin
    setRoom(null); setScreen('lobby'); setRoundResult(null); setGameResult(null); setMessages([]); setChatOpen(false);
  };
  const handlePlayAgain = () => {
    if (!room) return;
    socket.emit('play_again', { roomId: room.id }, (res) => {
      if (res && res.ok) { setGameResult(null); setScreen('waiting'); }
      else if (res && res.error) showToast(res.error);
    });
  };
  const handleSendMessage = (text) => { if (room && text.trim()) socket.emit('chat_message', { roomId: room.id, text: text.trim() }); };

  const handleLogout = () => { window.location.href = '/auth/logout'; };

  const handlePlayAsGuest = () => {
    // Ask for the name first (10s countdown) — then join as guest, which
    // auto-follows the host's room (waiting lobby).
    studioNameSecondsRef.current = 10;
    setStudioNamePending(true);
  };

  // Name prompt for studio links — the player types their name, then the
  // existing auto-join effect connects them (as a player for ?host=1/?play=1,
  // as a spectator for plain ?auto=1). Auto-joins after the countdown
  // (20s studio links, 10s Play as guest) with whatever name was typed
  // (falls back to "Player").
  const studioNameRef = useRef(studioName);
  studioNameRef.current = studioName;
  const [nameCountdown, setNameCountdown] = useState(20);
  const joinStudioGame = () => {
    const trimmed = (studioNameRef.current || '').trim() || 'Player';
    try { localStorage.setItem('champWordsName', trimmed); } catch (_) {}
    setUser({ name: trimmed, avatar: '', isGuest: true });
    setStudioNamePending(false);
    socket.connect();
  };
  useEffect(() => {
    if (!studioNamePending) return;
    setNameCountdown(studioNameSecondsRef.current);
    const iv = setInterval(() => {
      setNameCountdown(c => {
        if (c <= 1) { clearInterval(iv); joinStudioGame(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioNamePending]);
  const handleStudioNameSubmit = (e) => {
    e.preventDefault();
    joinStudioGame();
  };

  // Category-tinted ambient background
  const catKey = room && room.category;
  useEffect(() => {
    const tint = CAT_TINTS[catKey] || '#7c5cf0';
    document.documentElement.style.setProperty('--cat-tint', tint);
  }, [catKey]);

  // Rivalry bar pulses whenever either side scores
  const rivalryChat = room && room.chatTotal;
  const rivalryHost = room && room.hostTotal;
  useEffect(() => {
    if (room && (typeof room.chatTotal === 'number' || typeof room.hostTotal === 'number')) {
      setRivalryPulse(true);
      const t = setTimeout(() => setRivalryPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [rivalryChat, rivalryHost]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="app">
        <div className="brand-loader">
          <Logo size={84} className="loader-logo" />
          <span className="loader-brand">CHAMP WORDS</span>
          <span className="loader-sub">connecting to the arena…</span>
        </div>
      </div>
    );
  }

  // ── Not logged in ──
  // Studio links: ask the player for their name before auto-joining
  if (studioNamePending) {
    return (
      <div className="studio-name-screen">
        <div className="lobby-card">
          <h2>Enter your name</h2>
          <p className="subtitle">What should players call you?</p>
          <form onSubmit={handleStudioNameSubmit}>
            <div className="form-group">
              <input autoFocus value={studioName} onChange={e => setStudioName(e.target.value)}
                placeholder="Your name" maxLength={20} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 6 }}>
              Join now
            </button>
            <p className="studio-countdown">Opening the join screen in {nameCountdown}s…</p>
          </form>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onPlayAsGuest={handlePlayAsGuest} />;

  // ── Logged in / guest ──
  return (
    <div className="app">
      <div className="app-header">
        <div className="brand">
          <Logo size={34} />
          <span className="brand-name">Champ Words</span>
          {room && <span className="room-badge">{room.id}</span>}
        </div>
        <div className="header-right">
          {watching > 0 && <span className="viewers-badge"><span className="live-dot" />{watching} watching</span>}
          <button className="ach-btn" title="Achievements" onClick={openAchievements}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/></svg>
          </button>
          <div className="header-controls">
            {room && socket.id === room.host && (
              <button className="mod-toggle" title="Moderation"
                onClick={() => setModOpen(o => !o)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </button>
            )}
            <button className="sound-toggle" title={muted ? 'Unmute sounds' : 'Mute sounds'}
              onClick={() => setMuted(toggleMute())}>
              {muted
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
            </button>
            {room && ['waiting', 'playing', 'round_over', 'game_over'].includes(screen) && (
              <VoiceChat
                key={room.id}
                roomId={room.id}
                socket={socket}
                meName={room.players.find(p => p.id === socket.id)?.name}
                isPlayer={!!room.players.find(p => p.id === socket.id)}
              />
            )}
          </div>
          <div className="user-info">
            {user.avatar && <img src={user.avatar} alt="" className="user-avatar" />}
            <span className="user-name">{user.name}</span>
          </div>
          <span className="host-badge" title="Stream host">🎙️ @champbj</span>
          {user.isGuest ? (
            <a className="logout-btn" href="/auth/tiktok" title="Log in with TikTok" style={{ textDecoration: 'none' }}>Log in</a>
          ) : (
            <button className="logout-btn" onClick={handleLogout} title="Logout">↪</button>
          )}
        </div>
      </div>

      <div key={screen} className="screen-anim">
      {screen === 'lobby' && (
        <>
          {rejoinIn !== null && (
            <div className="auto-status">
              ⏳ Returning to room {pendingRoom} in {rejoinIn}s — write your name below or{' '}
              <button className="btn btn-small btn-primary" style={{ marginLeft: 4 }} onClick={handleRejoinNow}>Join now</button>
            </div>
          )}
          {autoStatus && <div className="auto-status">{autoStatus}</div>}
          <Lobby onCreateRoom={handleCreateRoom} onJoinActive={handleJoinActiveRoom} onAdminLogin={handleAdminLogin} userName={user.name} />
        </>
      )}

      {screen === 'waiting' && room && (
        <div className="waiting-host">
          <div className="room-code">{room.id}</div>
          <p className="players-count"><span>{room.players.length}</span> player{room.players.length !== 1 ? 's' : ''}</p>
          <div style={{ marginTop: 16 }}>
            {room.players.map(p => (
              <div key={p.id} className="player-badge waiting-player">
                {p.avatar && <img src={p.avatar} alt="" className="player-avatar" />}
                {p.id === room.host && <span className="host-star">&#9733;</span>}
                {p.name}
              </div>
            ))}
          </div>
          {socket.id === room.host ? (
            <>
              <button className="btn btn-primary" style={{ maxWidth: 280, marginTop: 24 }} onClick={handleStartGame}>
                Start Game
              </button>
              {room.players.length < 2 && (
                <p style={{ color: 'var(--text-dim)', marginTop: 8, fontSize: 11 }}>Solo mode — friends can join before you start</p>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-dim)', marginTop: 20 }}>Waiting for host to start...</p>
          )}
          <button className="btn btn-danger" style={{ maxWidth: 280, marginTop: 12 }} onClick={handleLeave}>Leave</button>
        </div>
      )}

      {screen === 'playing' && room && (
        <Game
          room={room}
          socket={socket}
          me={room.players.find(p => p.id === socket.id)}
          showToast={showToast}
          onChatToggle={() => setChatOpen(o => !o)}
          chatOpen={chatOpen}
          onChooseWord={handleChooseWord}
          messages={messages}
          notifications={notifications}
          onLeave={handleLeave}
        />
      )}

      {screen === 'round_over' && roundResult && (
        <RoundOver result={roundResult} room={room} />
      )}
      </div>

      {/* Achievement unlock toast */}
      {achPopup && (
        <div className="ach-toast" key={achPopup.id}>
          <span className="ach-toast-icon">{achPopup.icon}</span>
          <div className="ach-toast-body">
            <div className="ach-toast-title">Achievement Unlocked</div>
            <div className="ach-toast-name">{achPopup.playerName ? `${achPopup.playerName} · ` : ''}{achPopup.name}</div>
          </div>
        </div>
      )}

      {/* Achievements cabinet */}
      {achOpen && (
        <div className="ach-overlay" onClick={() => setAchOpen(false)}>
          <div className="ach-modal" onClick={e => e.stopPropagation()}>
            <div className="ach-modal-head">🏆 Achievements</div>
            <div className="ach-list">
              {(achList || []).map(a => (
                <div key={a.id} className={`ach-item${a.unlocked ? ' unlocked' : ''}`}>
                  <span className="ach-icon">{a.icon}</span>
                  <div className="ach-info">
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc">{a.desc}</div>
                    <div className="ach-bar"><div className="ach-fill" style={{ width: `${Math.min(100, Math.round((a.progress / a.max) * 100))}%` }} /></div>
                  </div>
                  {a.unlocked && <span className="ach-check">✓</span>}
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 14, width: '100%' }} onClick={() => setAchOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ⏸️ Paused overlay — Resume button lives INSIDE so it can't be blocked */}
      {room && room.paused && (
        <div className="paused-overlay">
          <div className="paused-card">
            <div className="paused-title">⏸️ PAUSED</div>
            {socket.id === room.host && (
              <button className="paused-resume" onClick={() => socket.emit('resume_game', { roomId: room.id })}>▶️ Resume</button>
            )}
          </div>
        </div>
      )}

      {/* 🔥 Host vs Chat rivalry */}
      {room && (typeof room.chatTotal === 'number' || typeof room.hostTotal === 'number') && (
        <div className={`rivalry-bar${rivalryPulse ? ' rivalry-pulse' : ''}`}>
          <span className="rivalry-chat">CHAT {room.chatTotal || 0}</span>
          <span className="rivalry-vs">vs</span>
          <span className="rivalry-host">HOST {room.hostTotal || 0}</span>
          {(room.chatTotal || 0) > (room.hostTotal || 0) && <span className="rivalry-fire">🔥 CHAT IS WINNING</span>}
        </div>
      )}

      {/* 🎲 Theme vote — visible on stream while the champ picks */}
      {room && room.state === 'champ_pick' && room.voteOptions && (
        <div className="vote-bar">
          <span className="vote-bar-title">🎲 VOTE NEXT THEME in TikTok chat</span>
          {room.voteOptions.map((o, i) => (
            <span key={o.id} className="vote-option">
              {i + 1}={o.label}
              {o.votes > 0 && <span className="vote-count">{o.votes}</span>}
            </span>
          ))}
        </div>
      )}

      {/* ⚔️ Speed duel — runs between rounds (round_over) */}
      {(room && room.duel) ? (
        <div className="duel-banner">
          <div className="duel-card">
            <div className="duel-title">⚔️ SPEED DUEL</div>
            <div className="duel-art">
              {String(room.duel.art || '').startsWith('http')
                ? <img className="duel-art-img" src={room.duel.art} alt="" />
                : <span className="duel-art-emoji">{room.duel.art}</span>}
            </div>
            <div className="duel-vs">{room.duel.challenger} <span className="duel-vs-x">vs</span> {room.duel.defender}</div>
            <div className="duel-sub">First to find the word wins +100!</div>
            {socket.id === room.duel.defenderId && (
              <div className="duel-answer-row">
                <input className="duel-answer-input" value={duelWord} maxLength={12}
                  onChange={e => setDuelWord(e.target.value.replace(/[^a-zA-Z ]/g, '').toLowerCase())}
                  placeholder="type the word…" />
                <button className="duel-answer-go" disabled={duelWord.length < 3}
                  onClick={() => { if (duelWord.length >= 3) { socket.emit('duel_answer', { roomId: room.id, word: duelWord }); setDuelWord(''); } }}>
                  Guess
                </button>
              </div>
            )}
          </div>
        </div>
      ) : duelMsg ? (
        <div className="duel-banner">
          <div className="duel-card duel-win">
            <div className="duel-title">🏆 {duelMsg} wins the duel +100!</div>
          </div>
        </div>
      ) : null}

      {screen === 'game_over' && gameResult && (
        <GameOver
          result={gameResult}
          room={room}
          isHost={room?.host === socket.id}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
        />
      )}
      {chatOpen && <Chat messages={messages} onSend={handleSendMessage} onClose={() => setChatOpen(false)} />}

      {modOpen && room && (
        <div className="mod-panel">
          <div className="mod-panel-title">Moderation</div>
          <button className="mod-close" onClick={() => setModOpen(false)}>✕</button>
          <div className="mod-list">
            {room.players.filter(p => p.id !== socket.id).map(p => (
              <div key={p.id} className="mod-row">
                <span className="mod-name">{p.name}{p.isChat && <span className="chat-badge">CHAT</span>}{p.id === room.champId && ' 👑'}</span>
                <div className="mod-actions">
                  {p.mutedUntil > Date.now() ? (
                    <button className="btn btn-small" onClick={() => socket.emit('unmute_player', { roomId: room.id, playerId: p.id })}>Unmute</button>
                  ) : (
                    <button className="btn btn-small" onClick={() => socket.emit('mute_player', { roomId: room.id, playerId: p.id, seconds: 30 })}>Mute 30s</button>
                  )}
                  <button className="btn btn-small btn-danger" onClick={() => socket.emit('kick_player', { roomId: room.id, playerId: p.id })}>Kick</button>
                </div>
              </div>
            ))}
            {room.players.length <= 1 && <p className="mod-empty">No other players yet</p>}
          </div>
          <button className="btn btn-small mod-clear" onClick={() => socket.emit('clear_chat', { roomId: room.id })}>Clear Chat</button>

          <div className="mod-controls">
            <div className="mod-panel-title">Game Controls</div>
            {room.paused ? (
              <button className="btn btn-small mod-clear" onClick={() => socket.emit('resume_game', { roomId: room.id })}>▶️ Resume</button>
            ) : (
              <button className="btn btn-small mod-clear" onClick={() => socket.emit('pause_game', { roomId: room.id })}>⏸️ Pause</button>
            )}
            <button className="btn btn-small mod-clear" onClick={() => socket.emit('skip_word', { roomId: room.id })}>⏭️ Skip Word</button>
            <div className="mod-blacklist-row">
              <input className="mod-blacklist-input" value={blacklistWord} placeholder="block word…"
                onChange={e => setBlacklistWord(e.target.value.replace(/[^a-zA-Z ]/g, '').toLowerCase().slice(0, 10))} />
              <button className="btn btn-small" disabled={blacklistWord.trim().length < 3}
                onClick={() => { socket.emit('blacklist_word', { roomId: room.id, word: blacklistWord }); setBlacklistWord(''); }}>🚫 Block</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
