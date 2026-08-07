export default function GameOver({ result, room, isHost, onPlayAgain, onLeave }) {
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
                <div className="player-name">{p.name}</div>
              </div>
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>

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
