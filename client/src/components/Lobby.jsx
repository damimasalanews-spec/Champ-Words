import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';

export default function Lobby({ onCreateRoom, onJoinActive, userName }) {
  // The host opens the game with ?host=1 on the URL — only the host can
  // create a room. Everyone else gets the one-tap "JOIN THE ROOM" page.
  const isOwner = new URLSearchParams(window.location.search).has('host');
  // step: 'intro' (Get Started landing) → 'form' (create or join)
  const [step, setStep] = useState('intro');
  const [name, setName] = useState(() => localStorage.getItem('champWordsName') || userName || '');
  const [rounds, setRounds] = useState(30);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, [step]);
  useEffect(() => { localStorage.setItem('champWordsName', name); }, [name]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('click');
    onCreateRoom(name.trim(), rounds);
  };

  const handleJoinActive = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('click');
    onJoinActive(name.trim());
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

  // ── Form: host creates · players join with one tap ──
  return (
    <div className="lobby-form">
      <button className="btn-back" onClick={() => { playSound('click'); setStep('intro'); }}>
        ← Back
      </button>

      {isOwner ? (
        <>
          <h2 className="form-heading">Host a Game</h2>
          <p className="form-sub">Only you create the room — players join from your link</p>
          <form className="lobby-card" onSubmit={handleCreate}>
            <h2>Create Game</h2>
            <p className="subtitle">Start the room — players will join without a code</p>
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
        </>
      ) : (
        <>
          <h2 className="form-heading">Join the Game</h2>
          <p className="form-sub">One tap and you're in — no code needed</p>
          <form className="lobby-card" onSubmit={handleJoinActive}>
            <h2>Join Room</h2>
            <p className="subtitle">You will automatically join the host's room</p>
            <div className="form-group">
              <label>Your Name</label>
              <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
                placeholder="Enter your name" maxLength={16} required />
            </div>
            <button type="submit" className="btn btn-primary">Join the Room</button>
          </form>
        </>
      )}
    </div>
  );
}
