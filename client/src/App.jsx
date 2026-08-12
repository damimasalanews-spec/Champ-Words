import { useState, useEffect, useRef, useCallback } from 'react';
import socket from './socket';
import Logo from './components/Logo';
import { playSound, toggleMute, isMuted } from './sounds';
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

  // Half-screen canvas applies ONLY while a game/room is active — the login
  // and lobby fill the browser viewport edge-to-edge (mobile responsive),
  // while the game keeps the fixed 540×960 canvas exactly as-is.
  // Studio mode (?auto) and explicit ?half=1 stay locked to the canvas.
  const forcedCanvas = new URLSearchParams(window.location.search).has('half') || new URLSearchParams(window.location.search).has('auto');
  useEffect(() => {
    if (!forcedCanvas) document.documentElement.classList.toggle('tiktok-half', !!room);
  }, [room, forcedCanvas]);
  const [chatOpen, setChatOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [muted, setMuted] = useState(() => isMuted());
  const [autoStatus, setAutoStatus] = useState('');

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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // /tiktok is now the single permanent link — it shows the login/splash
    // page first (same design as the old root link), then flows into the
    // lobby and game. Only explicit studio params (?guest= / ?auto=1) skip
    // the login page (used by browser sources that cannot be clicked).
    const autoGuest = params.get('guest') || (params.has('auto') ? 'Guest' : null);
    if (autoGuest) {
      setUser({ name: String(autoGuest).trim() || 'Guest', avatar: '', isGuest: true });
      setLoading(false);
      socket.connect();
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

  // Auto-join a room as spectator (?room=CODE) — no clicks needed, works even
  // when the game is already in progress.
  useEffect(() => {
    if (!user || !user.isGuest) return;
    const params = new URLSearchParams(window.location.search);
    const roomCode = String(params.get('room') || '').toUpperCase().trim();
    if (!roomCode) {
      setAutoStatus('Studio mode: add &room=CODE to auto-watch a room');
      return;
    }
    let stopped = false;
    let retryTimer = null;
    const tryJoin = () => {
      socket.emit('join_room', { roomId: roomCode, name: user.name, avatar: '', spectator: true }, (res) => {
        if (stopped) return;
        if (res && res.ok) {
          setAutoStatus('');
          setRoom(res.room);
          setScreen(res.room.state === 'playing' || res.room.state === 'champ_pick' ? 'playing' : 'waiting');
          setGameResult(null);
          setMessages([]);
        } else {
          const err = (res && res.error) || 'Cannot join room';
          setAutoStatus(err === 'Room not found'
            ? `Room ${roomCode} not found — create it on your phone, connecting automatically…`
            : err);
          retryTimer = setTimeout(tryJoin, 4000); // keep retrying until the room exists
        }
      });
    };
    const start = () => { if (!stopped) tryJoin(); };
    if (socket.connected) start();
    else socket.on('connect', start);
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket.off('connect', start);
    };
  }, [user, socket]);

  // Auto-rejoin the last room — but only after a 30s grace period on the
  // join page, so the player has time to write their name first. Manual
  // join/create cancels it. (Studio ?room= spectator join stays instant.)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) return; // explicit studio ?room= takes priority
    const lastRoom = localStorage.getItem('cw_last_room');
    if (!lastRoom) return;
    let stopped = false;
    const doJoin = () => {
      if (stopped) return;
      cancelAutoRejoin();
      // No name sent — the server keeps the player's existing name/points
      socket.emit('join_room', { roomId: lastRoom, playerKey: getPlayerKey() }, (res) => {
        if (stopped) return;
        if (res && res.ok) applyJoinedRoom(res);
        else localStorage.removeItem('cw_last_room'); // room is gone — forget it
      });
    };
    const start = () => {
      setPendingRoom(lastRoom);
      setRejoinIn(Math.round(REJOIN_DELAY_MS / 1000));
      rejoinTimerRef.current = setInterval(() => {
        setRejoinIn(prev => {
          if (prev <= 1) {
            clearInterval(rejoinTimerRef.current); rejoinTimerRef.current = null;
            doJoin();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };
    if (socket.connected) start();
    else socket.on('connect', start);
    return () => { stopped = true; cancelAutoRejoin(); socket.off('connect', start); };
  }, [user, socket, applyJoinedRoom, cancelAutoRejoin]);

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

  // Socket events (only after auth/guest)
  useEffect(() => {
    if (!user) return;

    socket.on('room_update', (data) => {
      setRoom(data);
      // Host restarted the game → everyone returns to the waiting room
      if (data.state === 'waiting') { setScreen('waiting'); setGameResult(null); setRoundResult(null); }
    });
    socket.on('champ_turn', (data) => { setRoom(data.room); setScreen('playing'); setRoundResult(null); });
    socket.on('round_started', (data) => { setRoom(data.room); setScreen('playing'); });
    socket.on('word_found', (data) => { setRoom(data.room); });
    socket.on('time_up', (data) => { setRoom(data.room); });
    socket.on('round_over', (data) => { setRoom(data.room); setRoundResult(data); setScreen('round_over'); playSound('roundover'); });
    socket.on('game_over', (data) => { setRoom(data.room); setRoundResult(null); setGameResult(data); setScreen('game_over'); playSound('gameover'); });
    socket.on('chat', (msg) => { setMessages(prev => [...prev, msg]); playSound(msg && msg.sound ? msg.sound : 'chat'); });
    socket.on('chat_cleared', () => setMessages([]));
    socket.on('kicked', () => {
      showToast('You were removed by the host', 'error');
      cancelAutoRejoin();
      localStorage.removeItem('cw_last_room');
      setRoom(null); setScreen('lobby'); setRoundResult(null); setGameResult(null); setMessages([]); setChatOpen(false); setModOpen(false);
    });
    socket.on('connect_error', () => showToast('Cannot connect to server', 'error'));

    return () => {
      socket.off('room_update'); socket.off('champ_turn'); socket.off('round_started');
      socket.off('word_found'); socket.off('time_up'); socket.off('round_over');
      socket.off('game_over'); socket.off('chat'); socket.off('chat_cleared'); socket.off('kicked'); socket.off('connect_error');
    };
  }, [user, showToast]);

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
    setUser({ name: 'Guest', avatar: '', isGuest: true });
    socket.connect();
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="app">
        <div className="login-page">
          <div className="login-card">
            <div className="loading-spinner" />
            <p style={{ marginTop: 16, color: 'var(--text-dim)', fontSize: 14 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Not logged in ──
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
          <div className="header-controls">
            {room && socket.id === room.host && (
              <button className="mod-toggle" title="Moderation"
                onClick={() => setModOpen(o => !o)}>
                🛡️
              </button>
            )}
            <button className="sound-toggle" title={muted ? 'Unmute sounds' : 'Mute sounds'}
              onClick={() => setMuted(toggleMute())}>
              {muted ? '🔇' : '🔊'}
            </button>
            {room && ['waiting', 'playing', 'round_over', 'game_over'].includes(screen) && (
              <VoiceChat
                key={room.id}
                roomId={room.id}
                socket={socket}
                meName={room.players.find(p => p.id === socket.id)?.name}
              />
            )}
          </div>
          <div className="user-info">
            {user.avatar && <img src={user.avatar} alt="" className="user-avatar" />}
            <span className="user-name">{user.name}</span>
          </div>
          {user.isGuest ? (
            <a className="logout-btn" href="/auth/tiktok" title="Log in with TikTok" style={{ textDecoration: 'none' }}>Log in</a>
          ) : (
            <button className="logout-btn" onClick={handleLogout} title="Logout">↪</button>
          )}
        </div>
      </div>

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
        />
      )}

      {screen === 'round_over' && roundResult && (
        <RoundOver result={roundResult} room={room} />
      )}

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
        </div>
      )}

      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
