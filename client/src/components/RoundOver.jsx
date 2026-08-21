import { useEffect, useMemo, useState } from 'react';
import { playSound } from '../sounds';
import useCountUp from '../useCountUp';

// Score that counts up from 0 to the final value
function CountUpScore({ value }) {
  const v = useCountUp(value);
  return <>{v}</>;
}

export default function RoundOver({ result, room }) {
  useEffect(() => { playSound('roundover'); }, []);
  const { word, winner, round, champName, scores, stumpPoints } = result;
  const sorted = [...(scores || [])].sort((a, b) => b.score - a.score);
  const rankEmoji = ['🥇', '🥈', '🥉'];
  const nextNote = winner
    ? `${winner.name} was the fastest! A new word comes in a moment…`
    : `No one found it — a new word comes in a moment…`;

  // ── Top 10 board, revealed with a typewriter animation ──
  // Studio streams (?auto=1) join as SPECTATORS, so room scores can be
  // empty — in that case show the all-time leaderboard so the board is
  // never missing after a round.
  const [allTimeTop, setAllTimeTop] = useState([]);
  useEffect(() => {
    fetch('/api/alltime')
      .then(r => r.json())
      .then(d => { if (d && d.ok && Array.isArray(d.top)) setAllTimeTop(d.top.slice(0, 10)); })
      // All-time can be empty (fresh deploy) — fall back to this game's scores
      .then(() => { if (allTimeTop.length === 0 && sorted.length > 0) setAllTimeTop(sorted.map(p => ({ name: p.name, score: p.score }))); })
      .catch(() => {});
  }, []);
  // Enrich each board row with the player's live stats (streak / level / XP /
  // avatar come from the room payload; all-time rows carry bestStreak + found).
  const playersById = useMemo(() => new Map((room?.players || []).map(p => [p.id, p])), [room]);
  const topRows = useMemo(() => {
    const cur = sorted.slice(0, 10).map(p => {
      const full = playersById.get(p.id) || {};
      return {
        id: p.id,
        name: p.name,
        score: p.score,
        nameLen: p.name.length,
        avatar: full.avatar || '',
        streak: full.streak || 0,
        level: full.level || 0,
        xp: full.xp || 0,
        isAllTime: false
      };
    });
    if (cur.length) return cur;
    return allTimeTop.map(p => ({
      id: 'all-' + (p.name || p.username || '?'),
      name: p.name || p.username || '?',
      score: p.score || 0,
      nameLen: String(p.name || p.username || '?').length,
      avatar: p.avatar || '',
      streak: p.bestStreak || 0,
      level: 0,
      xp: p.found || 0,
      isAllTime: true
    }));
  }, [result, allTimeTop, sorted, playersById]);
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
    // Safety net: reveal the whole list no matter what after ~4s
    const revealAll = setTimeout(() => {
      setTyped({ row: topRows.length - 1, chars: topRows[topRows.length - 1] ? topRows[topRows.length - 1].nameLen : 0 });
    }, 4000);
    return () => { clearInterval(iv); clearTimeout(revealAll); };
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

        {topRows.length > 0 && (
          <div className="roundover-top5 lb10">
            <p className="gameover-final-title">{sorted.length ? 'Top 10 — total points' : 'Top 10 — all time'}</p>
            <div className="lb10-list">
              {topRows.map((r, i) => {
                const typedLen = i < typed.row ? r.nameLen : i === typed.row ? typed.chars : 0;
                const typing = i === typed.row && typedLen < r.nameLen;
                const maxScore = topRows[0]?.score || 0;
                const rankCls = i === 0 ? ' r1' : i === 1 ? ' r2' : i === 2 ? ' r3' : '';
                return (
                  <div
                    key={r.id || i}
                    className={`lb10-row${i === 0 ? ' leader' : ''}`}
                    style={{ '--idx': i, '--bar': `${maxScore > 0 ? Math.max(6, Math.round((r.score / maxScore) * 100)) : 0}%` }}
                  >
                    <span className={`lb10-rank${rankCls}`}>{i + 1}</span>
                    <div className="lb10-player">
                      {r.avatar ? (
                        <img className="lb10-avatar" src={r.avatar} alt="" />
                      ) : (
                        <span className="lb10-avatar initials">{r.name.slice(0, 1).toUpperCase()}</span>
                      )}
                      <div className="lb10-meta">
                        <div className="lb10-name">
                          {r.name.slice(0, typedLen)}
                          {typing && <span className="typewriter-caret" />}
                        </div>
                        <div className="lb10-chips" style={{ opacity: typedLen >= r.nameLen ? 1 : 0, transition: 'opacity 0.25s' }}>
                          {r.streak >= 2 && <span className="lb10-chip streak">🔥 ×{r.streak}</span>}
                          {!r.isAllTime && r.level > 1 && <span className="lb10-chip lvl">LV {r.level}</span>}
                          {!r.isAllTime && r.xp > 0 && <span className="lb10-chip xp">{r.xp} XP</span>}
                          {r.isAllTime && r.xp > 0 && <span className="lb10-chip words">{r.xp} words</span>}
                        </div>
                      </div>
                    </div>
                    <span className="lb10-score" style={{ opacity: typedLen >= r.nameLen ? 1 : 0, transition: 'opacity 0.25s' }}>
                      <CountUpScore value={r.score} />
                      <span className="lb10-pts"> pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {winner ? (
          <p className="round-winner-msg">
            <span className="fastest-badge">⚡ FASTEST</span> {winner.name} found it in {winner.elapsed}s for <b>+{winner.score} pts</b>!
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
