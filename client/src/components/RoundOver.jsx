import { useEffect } from 'react';
import { playSound } from '../sounds';

export default function RoundOver({ result, room }) {
  useEffect(() => { playSound('roundover'); }, []);
  const { word, winner, round, champName, scores, finds } = result;
  const sorted = [...(scores || [])].sort((a, b) => b.score - a.score);
  const rankEmoji = ['🥇', '🥈', '🥉'];
  const pickerName = champName || 'the picker';
  const nextNote = winner
    ? `Next up: ${winner.name} is on the spot again — the others pick the next word!`
    : `The hot seat passes to ${pickerName}! The next word comes from the player in the queue.`;

  const shareText = () => {
    let text = `🔤 Champ Words — Round ${round}\n\n`;
    text += `The word was: ${(word || '').toUpperCase()}\n`;
    text += winner ? `Guessed by ${winner.name} in ${winner.elapsed}s (+${winner.score} pts)\n` : `No one guessed it (champ: ${champName || '?'})\n`;
    text += `\nScores:\n`;
    for (const p of sorted) text += `  ${rankEmoji[sorted.indexOf(p)] || ''} ${p.name}: ${p.score}pts\n`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Round {round} Over</h2>

        <div className="round-word">
          The word was <b>{word ? word.toUpperCase() : '—'}</b>
        </div>

        {winner ? (
          <p className="round-winner-msg">
            {winner.name} found it in {winner.elapsed}s for <b>+{winner.score} pts</b>!
          </p>
        ) : (
          <p className="round-winner-msg">
            No one guessed it{champName ? ` (${champName}'s word was too hard!)` : ''} — the seat moves on!
          </p>
        )}

        {finds && finds.length > 0 && (
          <>
            <p className="gameover-final-title" style={{ marginTop: 14 }}>Who found the word</p>
            <div className="score-list" style={{ marginTop: 4 }}>
              {finds.map((f, i) => (
                <div key={i} className="score-item" style={{ padding: '7px 12px' }}>
                  <span className="rank">✅</span>
                  <div className="player-info">
                    <div className="player-name">{f.name}</div>
                  </div>
                  <span className="player-score">+{f.score}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="score-list" style={{ marginTop: 14 }}>
          {sorted.map((p, i) => (
            <div key={p.id} className="score-item">
              <span className={`rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                {rankEmoji[i] || `#${i + 1}`}
              </span>
              <div className="player-info">
                <div className="player-name">
                  {p.id === room?.champId && <span className="champ-crown">👑</span>} {p.name}
                </div>
              </div>
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>

        <p className="next-champ-note">
          {nextNote}
        </p>

        <div className="overlay-buttons">
          <button className="btn btn-share" onClick={shareText}>Copy Results</button>
        </div>
      </div>
    </div>
  );
}
