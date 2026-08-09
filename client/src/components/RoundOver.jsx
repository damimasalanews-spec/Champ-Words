import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../sounds';

export default function RoundOver({ result, room }) {
  useEffect(() => { playSound('roundover'); }, []);
  const { word, winner, round, champName, scores, stumpPoints } = result;
  const sorted = [...(scores || [])].sort((a, b) => b.score - a.score);
  const rankEmoji = ['🥇', '🥈', '🥉'];
  const pickerName = champName || 'the picker';
  const nextNote = winner
    ? `${winner.name} was the fastest! A new word comes in a moment…`
    : `No one found it — a new word comes in a moment…`;

  // ── Top 5 by TOTAL points, revealed with a typewriter animation ──
  const topRows = useMemo(
    () => sorted.slice(0, 5).map(p => ({ id: p.id, name: p.name, score: p.score, nameLen: p.name.length })),
    [result]
  );
  const [typed, setTyped] = useState({ row: 0, chars: 0 });
  useEffect(() => {
    if (!topRows.length) return;
    const iv = setInterval(() => {
      setTyped(prev => {
        const t = topRows[prev.row];
        if (!t) return prev;
        if (prev.chars < t.nameLen) return { ...prev, chars: prev.chars + 1 };
        if (prev.row < topRows.length - 1) return { row: prev.row + 1, chars: 0 };
        return prev;
      });
    }, 55);
    return () => clearInterval(iv);
  }, [topRows]);

  const shareText = () => {
    let text = `🔤 Champ Words — Round ${round}\n\n`;
    text += `The word was: ${(word || '').toUpperCase()}\n`;
    text += winner ? `Guessed by ${winner.name} in ${winner.elapsed}s (+${winner.score} pts)\n` : `No one guessed it (champ: ${champName || '?'})\n`;
    text += `\nScores:\n`;
    for (const p of sorted) text += `  ${rankEmoji[sorted.indexOf(p)] || ''} ${p.name}: ${p.score}pts\n`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="overlay roundover-overlay">
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
          <>
            <p className="round-winner-msg">
              No one guessed it{champName ? ` (${champName}'s word was too hard!)` : ''} — the seat moves on!
            </p>
            {stumpPoints ? (
              <p className="round-winner-msg">
                💪 {champName} takes <b>+{stumpPoints} pts</b> for stumping the guesser!
              </p>
            ) : null}
          </>
        )}

        {topRows.length > 0 && (
          <>
            <p className="gameover-final-title" style={{ marginTop: 14 }}>Top 5 — total points</p>
            <div className="score-list" style={{ marginTop: 4 }}>
              {topRows.map((r, i) => {
                const typedLen = i < typed.row ? r.nameLen : i === typed.row ? typed.chars : 0;
                const typing = i === typed.row && typedLen < r.nameLen;
                return (
                  <div key={r.id || i} className="score-item" style={{ padding: '7px 12px' }}>
                    <span className={`rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                      {rankEmoji[i] || `#${i + 1}`}
                    </span>
                    <div className="player-info">
                      <div className="player-name">
                        {r.name.slice(0, typedLen)}
                        {typing && <span className="typewriter-caret" />}
                      </div>
                    </div>
                    <span className="player-score" style={{ opacity: typedLen >= r.nameLen ? 1 : 0, transition: 'opacity 0.25s' }}>
                      {r.score} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

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
