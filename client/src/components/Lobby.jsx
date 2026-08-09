import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';

export default function Lobby({ onCreateRoom, onJoinRoom, userName }) {
  const [mode, setMode] = useState('create'); // create | join
  const [name, setName] = useState(() => localStorage.getItem('champWordsName') || userName || '');
  const [roomCode, setRoomCode] = useState('');
  const [rounds, setRounds] = useState(30);
  const nameRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (mode === 'create') nameRef.current?.focus();
    else codeRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('champWordsName', name);
  }, [name]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('click');
    onCreateRoom(name.trim(), rounds);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    playSound('click');
    onJoinRoom(roomCode.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="lobby">
      <div className="lobby-title">
        <Logo size={84} />
        <h1>Champ Words</h1>
        <p>Guess the word before your friends do!</p>
      </div>

      {mode === 'create' ? (
        <form className="lobby-card" onSubmit={handleCreate}>
          <h2>Create Game</h2>
          <p className="subtitle">Start a new room and invite friends</p>
          <div className="form-group">
            <label>Your Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter your name" maxLength={16} required />
          </div>
          <div className="form-group">
            <label>Rounds</label>
            <div className="round-selector">
              {[5, 10, 15, 20, 30].map(n => (
                <button key={n} type="button"
                  className={`round-option ${rounds === n ? 'selected' : ''}`}
                  onClick={() => setRounds(n)}>
                  {n}
                </button>
              ))}
              <span className="round-selector-hint-inline">30 = 3 sections × 10</span>
            </div>
            <p className="round-selector-hint">Number of rounds before the winner is crowned</p>
          </div>
          <button type="submit" className="btn btn-primary">Create Room</button>
        </form>
      ) : (
        <form className="lobby-card" onSubmit={handleJoin}>
          <h2>Join Game</h2>
          <p className="subtitle">Enter a room code to join friends</p>
          <div className="form-group">
            <label>Room Code</label>
            <input ref={codeRef} value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3F2" maxLength={6} required />
          </div>
          <div className="form-group">
            <label>Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter your name" maxLength={16} required />
          </div>
          <button type="submit" className="btn btn-primary">Join Room</button>
        </form>
      )}

      <div className="lobby-divider">
        <span>or</span>
      </div>

      <button className="btn btn-secondary" style={{ maxWidth: 400 }}
        onClick={() => { playSound('click'); setMode(mode === 'create' ? 'join' : 'create'); }}>
        {mode === 'create' ? 'Join Existing Room' : 'Create New Room'}
      </button>
    </div>
  );
}
