import { useState, useEffect } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';

export default function LoginPage({ onPlayAsGuest }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hall, setHall] = useState([]);
  const [today, setToday] = useState([]);
  const [gifters, setGifters] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    // Check if already logged in
    fetch('/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          window.location.reload();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    // Hall of Fame — top 10 lifetime scores
    fetch('/api/alltime')
      .then(r => r.json())
      .then(d => { if (d && d.ok) setHall((d.top || []).slice(0, 10)); })
      .catch(() => {});
    // Today's Top 10 — daily reset race
    fetch('/api/today')
      .then(r => r.json())
      .then(d => { if (d && d.ok) setToday((d.top || []).slice(0, 10)); })
      .catch(() => {});
    // Top gifters — biggest supporters of the stream
    fetch('/api/topgifters')
      .then(r => r.json())
      .then(d => { if (d && d.ok) setGifters((d.top || []).slice(0, 10)); })
      .catch(() => {});

    // Check for error in URL
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(err === 'auth_failed' ? 'Login failed. Please try again.' : 'Login was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Decorative floating letter tiles (CSS animation only) — tinted to match the maroon card */}
      <div className="login-bg-tiles" aria-hidden="true">
        <span style={{ left: '5%', fontSize: 26, animationDuration: '11s', animationDelay: '0s', color: 'rgba(255,255,255,0.07)' }}>C</span>
        <span style={{ left: '16%', fontSize: 16, animationDuration: '14s', animationDelay: '2s', color: 'rgba(255,255,255,0.06)' }}>W</span>
        <span style={{ left: '28%', fontSize: 32, animationDuration: '10s', animationDelay: '4s', color: 'rgba(53,212,149,0.08)' }}>★</span>
        <span style={{ left: '42%', fontSize: 18, animationDuration: '15s', animationDelay: '1s', color: 'rgba(255,255,255,0.06)' }}>W</span>
        <span style={{ left: '56%', fontSize: 24, animationDuration: '12s', animationDelay: '3s', color: 'rgba(53,212,149,0.07)' }}>C</span>
        <span style={{ left: '70%', fontSize: 14, animationDuration: '16s', animationDelay: '5s', color: 'rgba(255,255,255,0.06)' }}>✦</span>
        <span style={{ left: '82%', fontSize: 28, animationDuration: '11.5s', animationDelay: '0.5s', color: 'rgba(255,255,255,0.07)' }}>A</span>
        <span style={{ left: '93%', fontSize: 18, animationDuration: '13s', animationDelay: '2.5s', color: 'rgba(53,212,149,0.07)' }}>✦</span>
      </div>

      <div className="login-card">
        {/* Top — brand block */}
        <div className="login-top">
          <div className="login-live-badge"><span className="live-dot" /> Now Live · Play With Friends</div>
          <div className="login-logo">
            <div className="login-brand-row">
              <img src="/champ-avatar.png" alt="Champ" className="login-avatar" />
              <Logo size={104} />
            </div>
            <h1>Champ Words</h1>
            <p>Multiplayer Word Puzzle Game</p>
          </div>
        </div>

        {/* Middle — actions */}
        <div className="login-mid">
          <div className="login-divider">
            <span>Sign in to play</span>
          </div>
          {error && <div className="login-error">{error}</div>}
          <a href="/auth/tiktok" className="tiktok-login-btn">
            <svg viewBox="0 0 24 24" className="tiktok-icon" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
            Continue with TikTok
          </a>
          <div className="login-divider">
            <span>or</span>
          </div>
          <button className="guest-login-btn" onClick={() => { playSound('click'); onPlayAsGuest(); }}>
            Play as Guest
          </button>
        </div>

        {/* Bottom — footer */}
        <div className="login-bottom">
          <div className="hall-of-fame">
            <div className="hall-tabs">
              <button className={`hall-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>🏆 All-time</button>
              <button className={`hall-tab${tab === 'today' ? ' active' : ''}`} onClick={() => setTab('today')}>🔥 Today</button>
              <button className={`hall-tab${tab === 'gifters' ? ' active' : ''}`} onClick={() => setTab('gifters')}>🎁 Gifters</button>
            </div>
            {tab === 'all' && hall.length > 0 && (
              <div className="hall-list">
                {hall.map((p, i) => (
                  <div key={p.key || i} className="hall-row">
                    <span className="hall-rank">{i + 1}</span>
                    <span className="hall-name">{p.name}</span>
                    {p.chat && <span className="hall-chat">LIVE</span>}
                    <span className="hall-score">{p.score}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'today' && today.length > 0 && (
              <div className="hall-list">
                {today.map((p, i) => (
                  <div key={p.key || i} className="hall-row">
                    <span className="hall-rank">{i + 1}</span>
                    <span className="hall-name">{p.name}</span>
                    {p.chat && <span className="hall-chat">LIVE</span>}
                    <span className="hall-score">{p.score}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'gifters' && gifters.length > 0 && (
              <div className="hall-list">
                {gifters.map((p, i) => (
                  <div key={p.key || i} className="hall-row">
                    <span className="hall-rank">{i + 1}</span>
                    <span className="hall-name">{p.name}</span>
                    <span className="hall-score">💎 {p.diamonds}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'all' && hall.length === 0 && <p className="hall-empty">Play a game to make the leaderboard!</p>}
            {tab === 'today' && today.length === 0 && <p className="hall-empty">No scores yet today — be the first!</p>}
            {tab === 'gifters' && gifters.length === 0 && <p className="hall-empty">Send a gift during a live to appear here!</p>}
          </div>
          <p className="login-note">
            No account needed to play. We only access your public profile name and avatar when you sign in with TikTok.
          </p>
          <p className="login-legal">
            <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
