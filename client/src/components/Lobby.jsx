import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import Wotd from './Wotd';
import { playSound } from '../sounds';

export default function Lobby({ onCreateRoom, onJoinActive, onAdminLogin, userName }) {
  // step: 'intro' (Get Started landing) → 'form' (create or join)
  const [step, setStep] = useState('intro');
  const [name, setName] = useState(() => localStorage.getItem('champWordsName') || userName || '');
  const [rounds, setRounds] = useState(30);
  const [roundTime, setRoundTime] = useState(60);
  const [difficulty, setDifficulty] = useState('medium');
  const [category, setCategory] = useState('mixed');
  const [categories, setCategories] = useState([]);
  const nameRef = useRef(null);
  // Host mode (?host=1): shows the CREATE ROOM form. Players (default) get
  // the one-tap "JOIN THE ROOM" page, with a clear link to become the host.
  const [isOwner, setIsOwner] = useState(() => new URLSearchParams(window.location.search).has('host'));
  // Admin login gates the create form
  const [adminStep, setAdminStep] = useState(null); // null | 'login'
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const enterHostMode = () => {
    playSound('click');
    const url = new URL(window.location.href);
    url.searchParams.set('host', '1');
    window.history.replaceState({}, '', url);
    setIsOwner(true);
  };
  const exitHostMode = () => {
    playSound('click');
    const url = new URL(window.location.href);
    url.searchParams.delete('host');
    window.history.replaceState({}, '', url);
    setIsOwner(false);
  };

  const handleHostClick = () => {
    playSound('click');
    setLoginError('');
    setAdminStep('login'); // always show the login form so login is never skipped
  };

  // Login form shows when: the user tapped "Create a Room" (no token yet) OR
  // they are in host mode but have no valid stored token
  const showAdminLogin = adminStep === 'login' || (isOwner && !localStorage.getItem('cw_admin_token'));

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminId.trim() || !adminPass.trim() || loginBusy) return;
    setLoginBusy(true); setLoginError('');
    const res = await onAdminLogin(adminId.trim(), adminPass.trim());
    setLoginBusy(false);
    if (res.ok) { setAdminStep(null); enterHostMode(); }
    else setLoginError(res.error || 'Login failed');
  };

  useEffect(() => { nameRef.current?.focus(); }, [step, adminStep]);
  useEffect(() => { localStorage.setItem('champWordsName', name); }, [name]);

  // Category list for the create form (from the server)
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (d && d.ok) setCategories(d.list || []); })
      .catch(() => {});
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    playSound('click');
    onCreateRoom(name.trim(), { totalRounds: rounds, roundTimeMs: roundTime * 1000, difficulty, category });
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
        <button className="btn btn-secondary btn-wotd"
          onClick={() => { playSound('click'); setStep('wotd'); }}>
          📅 Daily Word
        </button>
        <p className="intro-foot">Host a game or join your friends — one tap either way</p>
      </div>
    );
  }

  if (step === 'wotd') {
    return <Wotd onBack={() => { playSound('click'); setStep('intro'); }} />;
  }

  // ── Form: host creates · players join with one tap ──
  return (
    <div className="lobby-form">
      <button className="btn-back" onClick={() => { playSound('click'); setStep('intro'); }}>
        ← Back
      </button>

      {showAdminLogin ? (
        <>
          <h2 className="form-heading">Admin Login</h2>
          <p className="form-sub">Only hosts can create a room</p>
          <form className="lobby-card" onSubmit={handleAdminLogin}>
            <h2>Host Access</h2>
            <p className="subtitle">Enter your admin details to create a room</p>
            <div className="form-group">
              <label>Admin ID</label>
              <input ref={nameRef} value={adminId} onChange={e => setAdminId(e.target.value)}
                placeholder="Admin ID" autoComplete="username" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input value={adminPass} onChange={e => setAdminPass(e.target.value)}
                type="password" placeholder="Password" autoComplete="current-password" required />
            </div>
            {loginError && <p className="form-error">{loginError}</p>}
            <button type="submit" className="btn btn-primary" disabled={loginBusy}>
              {loginBusy ? 'Checking…' : 'Login & Create Room'}
            </button>
          </form>
          <button className="btn-link" onClick={() => { playSound('click'); setAdminStep(null); }}>← Back</button>
        </>
      ) : isOwner ? (
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
            <div className="form-group">
              <label>Round Time</label>
              <div className="round-selector">
                {[30, 60, 90].map(n => (
                  <button key={n} type="button"
                    className={`round-option ${roundTime === n ? 'selected' : ''}`}
                    onClick={() => setRoundTime(n)}>
                    {n}s
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <div className="round-selector">
                {[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']].map(([v, label]) => (
                  <button key={v} type="button"
                    className={`round-option ${difficulty === v ? 'selected' : ''}`}
                    onClick={() => setDifficulty(v)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="round-selector-hint">Easy 3–5 letters · Medium 3–8 · Hard 6–8</p>
            </div>
            <div className="form-group">
              <label>Theme</label>
              <div className="round-selector theme-selector">
                {[{ id: 'mixed', icon: '🎲', label: 'Surprise' }, ...(categories || [])].filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i).map(c => (
                  <button key={c.id} type="button"
                    className={`round-option ${category === c.id ? 'selected' : ''}`}
                    onClick={() => setCategory(c.id)}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create Room</button>
          </form>
          <button className="btn-link" onClick={exitHostMode}>← I'm a player, join instead</button>
        </>
      ) : (
        <>
          <h2 className="form-heading">How do you want to play?</h2>
          <p className="form-sub">Players join with one tap · Hosts log in to create</p>
          <div className="lobby-options">
            <form className="lobby-card" onSubmit={handleJoinActive}>
              <h2>Join the Room</h2>
              <p className="subtitle">One tap — no code needed</p>
              <div className="form-group">
                <label>Your Name</label>
                <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter your name" maxLength={16} required />
              </div>
              <button type="submit" className="btn btn-primary">Join the Room</button>
            </form>

            <div className="lobby-card host-card">
              <h2>Create a Room</h2>
              <p className="subtitle">Host the game — admin login required</p>
              <button className="btn btn-secondary btn-host-create" onClick={handleHostClick}>Create Room</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
