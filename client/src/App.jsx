import { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import LoginPage from './components/LoginPage';
import Lobby from './components/Lobby';
import Game from './components/Game';
import RoundOver from './components/RoundOver';
import GameOver from './components/GameOver';
import Chat from './components/Chat';
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

  const showToast = useCallback((text, type = 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Check auth on mount
  useEffect(() => {
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

  // Socket events (only after auth)
  useEffect(() => {
    if (!user) return;

    socket.on('room_update', (data) => {
      setRoom(data);
      if (data.state === 'playing' && data.puzzle && room?.state === 'waiting') setScreen('playing');
    });
    socket.on('game_started', (data) => { setRoom(data); setScreen('playing'); setRoundResult(null); setGameResult(null); });
    socket.on('word_found', (data) => {
      if (room) {
        const newRoom = { ...room };
        if (newRoom.puzzle) {
          const slots = [...newRoom.puzzle.targetSlots];
          slots[data.slotIndex] = { ...slots[data.slotIndex], foundBy: data.playerId };
          newRoom.puzzle = { ...newRoom.puzzle, targetSlots: slots };
          setRoom(newRoom);
        }
      }
    });
    socket.on('round_over', (data) => { setRoundResult(data); setScreen('round_over'); });
    socket.on('game_over', (data) => { setGameResult(data); setScreen('finished'); });
    socket.on('chat', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('connect_error', () => showToast('Cannot connect to server', 'error'));

    return () => {
      socket.off('room_update'); socket.off('game_started'); socket.off('word_found');
      socket.off('round_over'); socket.off('game_over'); socket.off('chat'); socket.off('connect_error');
    };
  }, [user, showToast]);

  const handleCreateRoom = (name, totalRounds) => {
    socket.emit('create_room', { name: name || user?.name, avatar: user?.avatar, totalRounds }, (res) => {
      if (res.ok) { setRoom(res.room); setScreen('waiting'); setMessages([{ system: true, text: `Room created! Code: ${res.room.id}` }]); }
      else showToast(res.error);
    });
  };

  const handleJoinRoom = (roomId, name) => {
    socket.emit('join_room', { roomId, name: name || user?.name, avatar: user?.avatar }, (res) => {
      if (res.ok) { setRoom(res.room); setScreen('waiting'); setMessages([]); }
      else showToast(res.error);
    });
  };

  const handleStartGame = () => { if (room) socket.emit('start_game', { roomId: room.id }, (res) => { if (!res.ok) showToast(res.error); }); };
  const handleNextRound = () => { if (room) socket.emit('next_round', { roomId: room.id }, (res) => { if (!res.ok) showToast(res.error); }); };
  const handlePlayAgain = () => {
    if (!room) return;
    socket.emit('play_again', { roomId: room.id }, (res) => {
      if (res.ok) { setScreen('waiting'); setRoundResult(null); setGameResult(null); setMessages([]); }
    });
  };
  const handleLeave = () => {
    if (room) socket.emit('leave_room', { roomId: room.id });
    setRoom(null); setScreen('lobby'); setRoundResult(null); setGameResult(null); setMessages([]); setChatOpen(false);
  };
  const handleSendMessage = (text) => { if (room && text.trim()) socket.emit('chat_message', { roomId: room.id, text: text.trim() }); };

  const handleLogout = () => { window.location.href = '/auth/logout'; };

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
  if (!user) return <LoginPage />;

  // ── Logged in ──
  return (
    <div className="app">
      <div className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Champ Words</h1>
          {room && <span className="room-badge">{room.id}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="user-info">
            {user.avatar && <img src={user.avatar} alt="" className="user-avatar" />}
            <span className="user-name">{user.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">↪</button>
        </div>
      </div>

      {screen === 'lobby' && <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} userName={user.name} />}

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
            <button className="btn btn-primary" style={{ maxWidth: 280, marginTop: 24 }} onClick={handleStartGame} disabled={room.players.length < 1}>
              Start Game
            </button>
          ) : (
            <p style={{ color: 'var(--text-dim)', marginTop: 20 }}>Waiting for host to start...</p>
          )}
          <button className="btn btn-danger" style={{ maxWidth: 280, marginTop: 12 }} onClick={handleLeave}>Leave</button>
        </div>
      )}

      {(screen === 'playing' || screen === 'round_over' || screen === 'finished') && room && room.puzzle && (
        <Game room={room} socket={socket} showToast={showToast} onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />
      )}

      {screen === 'round_over' && roundResult && (
        <RoundOver result={roundResult} room={room} isHost={socket.id === room?.host} onNextRound={handleNextRound} />
      )}
      {screen === 'finished' && gameResult && (
        <GameOver result={gameResult} room={room} isHost={socket.id === room?.host} onPlayAgain={handlePlayAgain} onLeave={handleLeave} />
      )}
      {chatOpen && <Chat messages={messages} onSend={handleSendMessage} onClose={() => setChatOpen(false)} />}
      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
