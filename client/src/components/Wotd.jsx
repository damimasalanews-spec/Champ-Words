import { useEffect, useState } from 'react';
import { playSound } from '../sounds';

// Word of the Day — solo practice, no room or socket needed.
// One daily word; find it to keep your streak alive.
export default function Wotd({ onBack }) {
  const [data, setData] = useState(null);   // { word, length, art, date }
  const [guess, setGuess] = useState('');
  const [done, setDone] = useState(false);
  const [wrongPulse, setWrongPulse] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetch('/api/wotd')
      .then(r => r.json())
      .then(d => {
        if (d && d.ok) {
          setData(d);
          // Was today already found? Show the solved state.
          try {
            const ls = JSON.parse(localStorage.getItem('cw_wotd') || 'null');
            const today = new Date().toISOString().slice(0, 10);
            if (ls && ls.date === today) { setDone(true); setStreak(ls.streak); }
            else {
              const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
              setStreak(ls && ls.date === yest ? ls.streak : 0);
            }
          } catch (_) { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!data || !guess.trim()) return;
    const g = guess.trim().toLowerCase().replace(/\s+/g, '');
    if (g === data.word.replace(/\s+/g, '')) {
      playSound('found');
      setDone(true);
      try {
        const ls = JSON.parse(localStorage.getItem('cw_wotd') || 'null');
        const today = new Date().toISOString().slice(0, 10);
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        let s = 1;
        if (ls) s = ls.date === today ? ls.streak : (ls.date === yest ? ls.streak + 1 : 1);
        localStorage.setItem('cw_wotd', JSON.stringify({ date: today, streak: s }));
        setStreak(s);
      } catch (_) { /* ignore */ }
    } else {
      playSound('toast');
      setWrongPulse(x => x + 1);
      setGuess('');
    }
  };

  return (
    <div className="wotd-wrap">
      <button className="btn-back" onClick={() => { playSound('click'); onBack(); }}>← Back</button>

      {!data ? (
        <div className="lobby-card"><div className="loading-spinner" /><p style={{ color: 'var(--text-dim)', marginTop: 12, fontSize: 13 }}>Loading today's word…</p></div>
      ) : (
        <div className={`lobby-card wotd-card${wrongPulse > 0 ? ' wotd-wrong' : ''}`} key={wrongPulse}>
          <div className="wotd-title">WORD OF THE DAY</div>
          <div className="wotd-date">{data.date}</div>

          <div className="wotd-art">{data.art}</div>

          <div className="wotd-brackets">
            {Array.from({ length: data.length }, (_, i) => (
              <div key={i} className={`bracket-box${done ? ' found-me' : ''}`}>
                {done && <span className="bracket-letter">{data.word.replace(/\s+/g, '')[i]?.toUpperCase()}</span>}
              </div>
            ))}
          </div>

          {done ? (
            <>
              <p className="wotd-done">🎉 You found today's word!</p>
              {streak > 0 && <p className="wotd-streak">🔥 {streak}-day streak</p>}
              <p className="wotd-sub">Come back tomorrow for a new word.</p>
            </>
          ) : (
            <>
              <form className="wotd-form" onSubmit={submit}>
                <input value={guess} onChange={e => setGuess(e.target.value)}
                  placeholder="Type the word…" maxLength={10} autoComplete="off" autoFocus />
                <button type="submit" className="btn btn-primary btn-small">Guess</button>
              </form>
              <p className="wotd-sub">{data.length} letters · the emoji above is your only hint</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
