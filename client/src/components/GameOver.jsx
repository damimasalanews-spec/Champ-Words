import { useEffect, useState } from 'react';
import Logo from './Logo';
import { playSound } from '../sounds';
import useCountUp from '../useCountUp';

const AUTO_RESTART_SECONDS = 20;

// Score that counts up from 0 to the final value
function CountUpScore({ value }) {
  const v = useCountUp(value, 1200);
  return <>{v}</>;
}

// Confetti rain pieces
function ConfettiRain() {
  const pieces = Array.from({ length: 26 }, (_, i) => (
    <span key={i} className="confetti-piece" style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--delay': `${(i % 8) * 0.22}s`, '--hue': i % 4 }} />
  ));
  return <div className="confetti-rain" aria-hidden="true">{pieces}</div>;
}

export default function GameOver({ result, room, isHost, me, onPlayAgain, onLeave, duelResult }) {
  useEffect(() => { playSound('gameover'); }, []);
  const [allTime, setAllTime] = useState([]);
  const [countdown, setCountdown] = useState(isHost ? AUTO_RESTART_SECONDS : null);

  // All-time leaderboard (lifetime scores across games)
  useEffect(() => {
    fetch('/api/alltime')
      .then(r => r.json())
      .then(d => { if (d && d.ok && Array.isArray(d.top)) setAllTime(d.top.slice(0, 10)); })
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
  // After the Top-4 Wall Push duel the headline celebrates the WALL DUEL
  // champion — the main game's top scorer still has their place in the
  // scoreboard below. (The server marks the post-duel game_over with
  // wallDuelEnded so we don't hijack a normal game-over screen.)
  const duelWinner = result && result.wallDuelEnded && duelResult
    ? { name: duelResult, score: sorted[0] ? sorted[0].score : 0 }
    : null;
  const winner = duelWinner || sorted[0];
  const rankEmoji = ['🥇', '🥈', '🥉'];
  // Champion-board rows: all-time legends when available, else this game's scores
  const boardRows = allTime.length ? allTime : (result.scores || []).slice(0, 10);
  const boardMax = boardRows[0]?.score || 0;

  const shareText = () => {
    const lines = sorted.map((p, i) => `${rankEmoji[i] || ''} ${p.name}: ${p.score}pts`);
    let text = `🏆 Champ Words — Final Results\n\n`;
    text += `👑 ${winner.name} wins!\n\n`;
    text += lines.join('\n');
    text += `\n\nPlay at: ${window.location.origin}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // Render the final scores onto a PNG card and download it
  const shareCard = () => {
    try {
      const c = document.createElement('canvas');
      c.width = 800; c.height = 1000;
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 1000);
      grad.addColorStop(0, '#0d1526'); grad.addColorStop(1, '#111a30');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 1000);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd25e';
      ctx.font = '900 64px sans-serif';
      ctx.fillText('🏆 CHAMP WORDS', 400, 120);
      ctx.fillStyle = '#f4f7ff';
      ctx.font = '600 30px sans-serif';
      ctx.fillText('Final Results', 400, 180);
      sorted.slice(0, 5).forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#ffd25e' : i === 1 ? '#cdd6f4' : i === 2 ? '#f0b27a' : '#d9e2f5';
        ctx.font = '700 42px sans-serif';
        ctx.fillText(`${['🥇', '🥈', '🥉'][i] || `#${i + 1}`}  ${p.name}  —  ${p.score} pts`, 400, 280 + i * 95);
      });
      ctx.fillStyle = '#8fa0c0';
      ctx.font = '400 26px sans-serif';
      ctx.fillText('Play at champ-words.onrender.com/tiktok', 400, 930);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'champ-words-results.png';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (_) { /* canvas unsupported — fall back silently */ }
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
          <ConfettiRain />
          <Logo size={64} />
          <div className="trophy">👑</div>
          <div className="winner-name">{winner?.name || 'Nobody'} Wins!</div>
        </div>

        {/* Wall Duel champion banner (the duel auto-starts after the game) */}
        {duelResult && (
          <div className="duel-launch">
            <div className="duel-result-banner">🏆 Wall Duel Champion: <b>{duelResult}</b></div>
          </div>
        )}

        {sorted.length >= 1 && (
          <div className="podium">
            {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((p, i) => (
              <div key={(p.id || 'x') + i} className={`podium-col ${i === 1 ? 'first' : i === 0 ? 'second' : 'third'}`}>
                <span className="podium-avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="podium-name">{p.name}</span>
                <span className="podium-pts">{p.score} pts</span>
                <div className="podium-block">{i === 1 ? '👑' : ''}</div>
              </div>
            ))}
          </div>
        )}

        <p className="gameover-final-title">Final Scores</p>
        <div className="score-list">
          {sorted.map((p, i) => (
            <div key={p.id} className="score-item">
              <span className={`rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                {rankEmoji[i] || `#${i + 1}`}
              </span>
              <div className="player-info">
                <span className="mini-avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                <div className="player-name">{p.name}{p.isChat && <span className="chat-badge">CHAT</span>}</div>
              </div>
              <span className="player-score"><CountUpScore value={p.score} /></span>
            </div>
          ))}
        </div>

        {boardRows.length > 0 && (
          <div className="alltime-panel lb10">
            <div className="lb10-head">
              <span className="lb10-head-trophy">🏆</span>
              <div className="lb10-head-text">
                <div className="lb10-head-title">{allTime.length ? 'All-Time Legends' : 'This Game — Top 10'}</div>
                <div className="lb10-head-sub">{allTime.length ? 'Lifetime scores · hall of fame' : 'Final scores · all players'}</div>
              </div>
              <span className="lb10-head-live"><span className="lb10-live-dot" />{allTime.length ? 'ALL-TIME' : 'TOP 10'}</span>
            </div>
            <div className="lb10-list">
              {boardRows.map((p, i) => {
                const name = p.name || p.key || 'Player';
                const isLeader = i === 0;
                const isMe = me && (allTime.length
                  ? !!(me.playerKey && p.key && me.playerKey === p.key)
                  : me.id === p.id);
                return (
                  <div
                    key={p.key || p.id || name}
                    className={`lb10-row${isMe ? ' me' : ''}`}
                    style={{ '--idx': i, '--bar': `${boardMax > 0 ? Math.max(6, Math.round(((p.score || 0) / boardMax) * 100)) : 0}%` }}
                  >
                    <span className={`lb10-rank${i === 0 ? ' r1' : i === 1 ? ' r2' : i === 2 ? ' r3' : ''}`}>{i + 1}</span>
                    <div className="lb10-player">
                      {p.avatar ? (
                        <img className="lb10-avatar" src={p.avatar} alt="" />
                      ) : (
                        <span className="lb10-avatar initials">{name.slice(0, 1).toUpperCase()}</span>
                      )}
                      <div className="lb10-meta">
                        <div className="lb10-name">
                          <span className="lb10-name-text">{name}</span>
                        </div>
                        <div className="lb10-chips">
                          {isMe && !isLeader && <span className="lb10-chip you">YOU</span>}
                          {(allTime.length ? p.chat : p.isChat) && <span className="lb10-chip chat">CHAT</span>}
                          {p.found > 0 && <span className="lb10-chip words">{p.found} words</span>}
                          {p.bestStreak >= 2 && <span className="lb10-chip streak">🔥 ×{p.bestStreak}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="lb10-score">
                      <CountUpScore value={p.score || 0} />
                      <span className="lb10-pts"> pts</span>
                    </span>
                    <span className="lb10-bar" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isHost && countdown !== null && countdown > 0 && (
          <p className="gameover-countdown">
            Next game starts in <b>{countdown}s</b> — room <b>{room?.id}</b> · friends can still join
          </p>
        )}

        <div className="overlay-buttons">
          <button className="btn btn-share" onClick={shareText}>Copy Results</button>
          <button className="btn btn-secondary" onClick={shareCard}>Share Card</button>
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
