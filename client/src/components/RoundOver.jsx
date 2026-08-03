export default function RoundOver({ result, room, isHost, onNextRound }) {
  const sorted = [...result.scores].sort((a, b) => b.score - a.score);
  const rankEmoji = ['🥇', '🥈', '🥉'];

  const shareText = () => {
    let text = `🔤 Champ Words — Round ${result.round}\n\n`;
    text += `Words:\n`;
    for (const s of result.targetSlots) {
      const finder = s.foundBy ? room.players.find(p => p.id === s.foundBy) : null;
      text += `  ${s.length}L: ${s.word.toUpperCase()} ${finder ? '→ ' + finder.name : '❌'}\n`;
    }
    text += `\nScores:\n`;
    for (const p of sorted) text += `  ${rankEmoji[sorted.indexOf(p)] || ''} ${p.name}: ${p.score}pts\n`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Round {result.round} Over</h2>

        <div className="round-words-list">
          {result.targetSlots.map((s, i) => {
            const finder = s.foundBy ? room?.players?.find(p => p.id === s.foundBy) : null;
            return (
              <div key={i} className="round-word-item">
                <span className="rw-length">{s.length}L</span>
                <span className="rw-word">{s.word.toUpperCase()}</span>
                {finder ? <span className="rw-finder">{finder.name}</span> : <span className="rw-unfound">Not found</span>}
              </div>
            );
          })}
        </div>

        {result.allPossible && (
          <div className="all-possible">
            <h3>All possible words</h3>
            <div className="word-chips">
              {result.allPossible.map((w, i) => (
                <span key={i} className="word-chip">{w.toUpperCase()}</span>
              ))}
            </div>
          </div>
        )}

        <div className="score-list" style={{ marginTop: 12 }}>
          {sorted.map((p, i) => (
            <div key={p.id} className="score-item">
              <span className={`rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                {rankEmoji[i] || `#${i + 1}`}
              </span>
              <div className="player-info">
                <div className="player-name">{p.name}</div>
                <div className="player-detail">{p.wordsFound} word{p.wordsFound !== 1 ? 's' : ''} found</div>
              </div>
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="overlay-buttons">
          <button className="btn btn-share" onClick={shareText}>Copy Results</button>
          {isHost && result.round < (room?.totalRounds || 5) && (
            <button className="btn btn-primary" onClick={onNextRound}>Next Round</button>
          )}
        </div>
        {!isHost && result.round < (room?.totalRounds || 5) && (
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
            Waiting for host...
          </p>
        )}
      </div>
    </div>
  );
}
