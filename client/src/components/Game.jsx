import { useState, useEffect, useRef } from 'react';
import PlayerList from './PlayerList';

export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord, onGuess, onHint }) {
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state; // champ_pick | playing | round_over

  const [pick, setPick] = useState('');            // champ's word input
  const [champWord, setChampWord] = useState('');   // champ's own word (local, after submit)
  const [guess, setGuess] = useState('');           // guesser's input
  const [solvedWord, setSolvedWord] = useState(''); // word once solved (word_found / time_up)
  const [solvedBy, setSolvedBy] = useState(null);   // winner id or null (time up)
  const [falling, setFalling] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const guessRef = useRef(null);

  // Reset everything at the start of each new word round
  useEffect(() => {
    setPick(''); setGuess(''); setSolvedWord(''); setSolvedBy(null);
    setFalling(false); setSubmitting(false); setTimeLeft(60);
  }, [room.round, room.champId]);

  // Countdown while a round is live
  useEffect(() => {
    if (state !== 'playing' || !room.endsAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) clearInterval(iv);
    };
    const iv = setInterval(tick, 250);
    tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round]);

  // Watch for the word being solved (any player) / time up — drives the fall animation + answer reveal
  useEffect(() => {
    const onFound = (data) => {
      setSolvedWord(data.word);
      setSolvedBy(data.winnerId);
      setFalling(true);
      setTimeout(() => setFalling(false), 1300);
    };
    const onTimeUp = (data) => {
      setSolvedWord(data.word);
      setSolvedBy(null);
    };
    socket.on('word_found', onFound);
    socket.on('time_up', onTimeUp);
    return () => { socket.off('word_found', onFound); socket.off('time_up', onTimeUp); };
  }, [socket]);

  // Which letters appear in the top (mystery) brackets
  const topLetters = Array.from({ length: wordLen }, (_, i) => {
    if (state === 'round_over' && solvedWord) return solvedWord[i] || '';
    if (isChamp && champWord) return champWord[i] || '';
    if (i < (room.revealedPrefix || '').length) return room.revealedPrefix[i];
    return '';
  });

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const submitPick = () => {
    const w = pick.trim().toLowerCase();
    if (!/^[a-z]{3,8}$/.test(w)) { showToast('Pick a word with 3-8 letters'); return; }
    setSubmitting(true);
    onChooseWord(w);
    setChampWord(w);
    setPick('');
    setTimeout(() => setSubmitting(false), 800);
  };

  const submitGuess = () => {
    const g = guess.trim().toLowerCase();
    if (!g) return;
    if (timeLeft <= 0) { showToast('Time is up!'); return; }
    setSubmitting(true);
    onGuess(g);
    setGuess('');
    setTimeout(() => setSubmitting(false), 500);
  };

  const banner = state === 'champ_pick'
    ? (isChamp ? 'Champ turn! Pick a word' : `${champPlayer?.name || 'Champ'} is picking a word...`)
    : state === 'playing'
      ? (isChamp ? 'Your word is in play — good luck, guessers!' : `${champPlayer?.name || 'Champ'}'s word — guess it!`)
      : 'Round over';

  return (
    <div className="game-area">
      <div className="game-header">
        <span className="round-info">Round <span>{room.round}</span> / {room.totalRounds}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="chat-toggle" onClick={onChatToggle} style={{ fontSize: 10 }}>
            {chatOpen ? 'Close Chat' : 'Chat'}
          </button>
        </div>
      </div>

      <PlayerList players={room.players} host={room.host} champId={room.champId} myId={socket.id} />

      {/* Champ banner */}
      <div className={`champ-banner ${isChamp ? 'champ-banner-me' : ''}`}>
        <span className="champ-crown">👑</span> {banner}
      </div>

      {/* Timer (during play) */}
      {state === 'playing' && (
        <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>
          {timerLabel}
        </div>
      )}

      {/* ── Brackets area ─────────────────────────────────────────────── */}
      <div className="brackets-area">
        <div className="brackets-label">WORD</div>
        <div className="bracket-row">
          {topLetters.map((letter, i) => (
            <div key={i} className={`bracket-box ${letter ? 'hint-revealed' : ''}`}>
              {letter && <span className="bracket-letter">{letter.toUpperCase()}</span>}
            </div>
          ))}
        </div>

        {falling && solvedWord && (
          <div className="falling-word falling-answer">{solvedWord.toUpperCase()}</div>
        )}

        <div className="answer-brackets">
          <div className="brackets-label">ANSWER</div>
          <div className="bracket-row">
            {Array.from({ length: wordLen }, (_, i) => {
              const letter = solved ? solvedWord[i] || '' : '';
              return (
                <div key={i} className={`bracket-box ${solved ? (wonRound ? 'found-me' : solvedBy ? 'found-other' : '') : ''}`}>
                  {letter && <span className="bracket-letter">{letter.toUpperCase()}</span>}
                </div>
              );
            })}
          </div>
          {solved && (
            <div className="solved-text">
              {wonRound ? 'You got it!' : solvedBy ? `${room.players.find(p => p.id === solvedBy)?.name || 'Someone'} got it!` : 'Time is up!'}
            </div>
          )}
        </div>
      </div>

      {/* ── Champ word picker ─────────────────────────────────────────── */}
      {isChamp && state === 'champ_pick' && (
        <form className="pick-word" onSubmit={(e) => { e.preventDefault(); submitPick(); }}>
          <label className="pick-word-label">Type a word (3-8 letters) for others to guess</label>
          <div className="input-row">
            <input
              className="word-input"
              value={pick}
              onChange={e => setPick(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 8))}
              placeholder="e.g. MONKEY"
              autoFocus
            />
            <button type="submit" className="submit-btn" disabled={submitting || pick.length < 3}>Set Word</button>
          </div>
          <div className="pick-preview">
            {Array.from({ length: Math.max(0, pick.length) }, (_, i) => (
              <span key={i} className="pick-preview-box">{pick[i]?.toUpperCase() || ''}</span>
            ))}
            {pick.length === 0 && <span className="pick-preview-hint">Your brackets will appear here</span>}
          </div>
        </form>
      )}

      {/* ── Guesser input ─────────────────────────────────────────────── */}
      {!isChamp && state === 'playing' && !solved && (
        <form className="guess-form" onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
          <div className="input-row">
            <input
              ref={guessRef}
              className="word-input"
              value={guess}
              onChange={e => setGuess(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 8))}
              placeholder="Type your guess..."
              disabled={timeLeft <= 0}
              autoFocus
            />
            <button type="submit" className="submit-btn" disabled={submitting || guess.length < 3 || timeLeft <= 0}>
              Guess
            </button>
          </div>
          {timeLeft <= 0 && <p className="time-up-note">Time's up — waiting for the reveal...</p>}
        </form>
      )}

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="bottom-bar">
        {!isChamp ? (
          <button
            className="hint-btn"
            onClick={onHint}
            disabled={state !== 'playing' || (me?.hintsLeft || 0) <= 0}
          >
            <span className="hint-icon">💡</span>
            Hint
            <span className="hint-count">{me?.hintsLeft ?? 0}</span>
          </button>
        ) : (
          <div className="champ-watching">
            {state === 'playing' ? 'Waiting for a guesser to get it...' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
