import { useState, useEffect, useCallback } from 'react';
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

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // { name, avatar }
  const [screen, setScreen] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
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

  // Check auth on mount (or auto-guest via /tiktok path, ?auto=1 / ?guest=Name —
  // used by studio browser sources that cannot be clicked, e.g. TikTok Live Studio)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isTiktokPath = window.location.pathname.startsWith('/tiktok');
    const autoGuest = params.get('guest') || (params.has('auto') || isTiktokPath ? 'Guest' : null);
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
    socket.on('chat', (msg) => { setMessages(prev => [...prev, msg]); playSound('chat'); });
    socket.on('connect_error', () => showToast('Cannot connect to server', 'error'));

    return () => {
      socket.off('room_update'); socket.off('champ_turn'); socket.off('round_started');
      socket.off('word_found'); socket.off('time_up'); socket.off('round_over');
      socket.off('game_over'); socket.off('chat'); socket.off('connect_error');
    };
  }, [user, showToast]);

  const handleCreateRoom = (name, totalRounds) => {
    socket.emit('create_room', { name: name || user?.name, avatar: user?.avatar, totalRounds }, (res) => {
      if (res.ok) { setRoom(res.room); setScreen('waiting'); setGameResult(null); setMessages([{ system: true, text: `Room created! Code: ${res.room.id}` }]); }
      else showToast(res.error);
    });
  };

  const handleJoinRoom = (roomId, name) => {
    socket.emit('join_room', { roomId, name: name || user?.name, avatar: user?.avatar }, (res) => {
      if (res.ok) { setRoom(res.room); setScreen('waiting'); setGameResult(null); setMessages([]); }
      else showToast(res.error);
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
    if (room) socket.emit('leave_room', { roomId: room.id });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="sound-toggle" title={muted ? 'Unmute sounds' : 'Mute sounds'}
            onClick={() => setMuted(toggleMute())}>
            {muted ? '🔇' : '🔊'}
          </button>
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
          {autoStatus && <div className="auto-status">{autoStatus}</div>}
          <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} userName={user.name} />
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

      {room && ['waiting', 'playing', 'round_over', 'game_over'].includes(screen) && (
        <VoiceChat
          key={room.id}
          roomId={room.id}
          socket={socket}
          meName={room.players.find(p => p.id === socket.id)?.name}
        />
      )}

      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
