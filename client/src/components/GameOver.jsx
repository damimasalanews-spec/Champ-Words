import { useEffect, useState } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';

const AUTO_RESTART_SECONDS = 20;

export default function GameOver({ result, room, isHost, onPlayAgain, onLeave }) {
  useEffect(() => { playSound('gameover'); }, []);
  const [allTime, setAllTime] = useState([]);
  const [countdown, setCountdown] = useState(isHost ? AUTO_RESTART_SECONDS : null);

  // All-time leaderboard (lifetime scores across games)
  useEffect(() => {
    fetch('/api/alltime')
      .then(r => r.json())
      .then(d => { if (d && d.ok) setAllTime(d.top.slice(0, 10)); })
      .catch(() => {});
  }, []);

  // No dead air: the host's next game auto-starts after a short countdown.
  // Clicking Play Again / Leave cancels it (component unmounts → timer cleared).
  useEffect(() => {
    if (!isHost || countdown === null) return;
    if (countdown <= 0) { onPlayAgain(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isHost, countdown, onPlayAgain]);

  const sorted = [...result.scores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const rankEmoji = ['🥇', '🥈', '🥉'];

  const shareText = () => {
    const lines = sorted.map((p, i) => `${rankEmoji[i] || ''} ${p.name}: ${p.score}pts`);
    let text = `🏆 Champ Words — Final Results\n\n`;
    text += `👑 ${winner.name} wins!\n\n`;
    text += lines.join('\n');
    text += `\n\nPlay at: ${window.location.origin}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="overlay gameover-overlay">
      {/* Confetti celebration */}
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} className="gameover-confetti"
          style={{
            '--x': Math.random() * 100,
            '--delay': (Math.random() * 0.9) + 's',
            '--color': ['#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#a78bfa', '#fb923c'][i % 6],
            '--size': (6 + Math.random() * 7) + 'px',
            left: Math.random() * 100 + '%'
          }} />
      ))}
      <div className="overlay-card">
        <div className="winner-banner">
          <Logo size={64} />
          <div className="trophy">👑</div>
          <div className="winner-name">{winner?.name || 'Nobody'} Wins!</div>
        </div>

        <p className="gameover-final-title">Final Scores</p>
        <div className="score-list">
          {sorted.map((p, i) => (
            <div key={p.id} className="score-item">
              <span className={`rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                {rankEmoji[i] || `#${i + 1}`}
              </span>
              <div className="player-info">
                <div className="player-name">{p.name}{p.isChat && <span className="chat-badge">CHAT</span>}</div>
              </div>
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>

        {allTime.length > 0 && (
          <div className="alltime-panel">
            <div className="alltime-title">ALL-TIME TOP 10</div>
            {allTime.map((p, i) => (
              <div key={p.key || p.name} className="alltime-row">
                <span className={`alltime-rank${i === 0 ? ' rank-1' : ''}`}>{i + 1}</span>
                <span className="alltime-name">{p.name}{p.chat && <span className="chat-badge">CHAT</span>}</span>
                <span className="alltime-pts">{p.score}</span>
              </div>
            ))}
          </div>
        )}

        {isHost && countdown !== null && countdown > 0 && (
          <p className="gameover-countdown">
            Next game starts in <b>{countdown}s</b> — room <b>{room?.id}</b> · friends can still join
          </p>
        )}

        <div className="overlay-buttons">
          <button className="btn btn-share" onClick={shareText}>Copy Results</button>
          {isHost && (
            <button className="btn btn-primary" onClick={onPlayAgain}>Play Again</button>
          )}
        </div>
        <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={onLeave}>
          Leave Room
        </button>
        {!isHost && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
            Waiting for host to start a new game...
          </p>
        )}
      </div>
    </div>
  );
}
