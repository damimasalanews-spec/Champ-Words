import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';

export default function Lobby({ onCreateRoom, onJoinRoom, userName }) {
  // step: 'intro' (Get Started landing) → 'form' (how to join)
  const [step, setStep] = useState('intro');
  const [mode, setMode] = useState('create'); // create | join
  const [name, setName] = useState(() => localStorage.getItem('champWordsName') || userName || '');
  const [roomCode, setRoomCode] = useState('');
  const [rounds, setRounds] = useState(30);
  const nameRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (mode === 'create') nameRef.current?.focus();
    else codeRef.current?.focus();
  }, [mode, step]);

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

  // ── Landing: Get Started ──
  if (step === 'intro') {
    return (
      <div className="lobby-intro">
        <div className="intro-logo-wrap">
          <div className="intro-glow" aria-hidden="true" />
          <Logo size={104} />
        </div>
        <h1 className="intro-title">Champ Words</h1>
        <p className="intro-tagline">Guess the word before your friends do!</p>
        <div className="intro-features">
          <span className="intro-chip">🎯 60-second word races</span>
          <span className="intro-chip">⚡ Live drawing hints</span>
          <span className="intro-chip">🏆 Top 5 leaderboard</span>
        </div>
        <button className="btn btn-primary btn-get-started"
          onClick={() => { playSound('click'); setStep('form'); }}>
          Get Started
        </button>
        <p className="intro-foot">Create a new room or join your friends with a code</p>
      </div>
    );
  }

  // ── Form: how to join the game ──
  return (
    <div className="lobby-form">
      <button className="btn-back" onClick={() => { playSound('click'); setStep('intro'); }}>
        ← Back
      </button>
      <h2 className="form-heading">How do you want to join?</h2>
      <p className="form-sub">Pick an option and fill in your details</p>

      <div className="mode-tabs">
        <button type="button" className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
          onClick={() => { playSound('click'); setMode('create'); }}>
          Create Room
        </button>
        <button type="button" className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
          onClick={() => { playSound('click'); setMode('join'); }}>
          Join with Code
        </button>
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
            </div>
            <p className="round-selector-hint">30 = 3 sections × 10 · rounds before the winner is crowned</p>
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
    </div>
  );
}
