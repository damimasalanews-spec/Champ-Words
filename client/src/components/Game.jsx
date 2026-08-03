import { useState, useEffect, useRef, useCallback } from 'react';
import PlayerList from './PlayerList';

// ── Bracket grid helper: 2 columns, up to 4 rows ──────────────────────────
function BracketGrid({ count, letters, showLabel, solved, wonRound }) {
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const l = (letters && letters[i]) || '';
    let cls = '';
    if (l) cls = wonRound ? 'found-me' : (solved ? 'found-other' : 'hint-revealed');
    boxes.push(
      <div key={i} className={`bracket-box ${cls}`}>
        {l && <span className="bracket-letter">{l.toUpperCase()}</span>}
      </div>
    );
  }
  const rows = [];
  for (let i = 0; i < boxes.length; i += 2) {
    const row = boxes.slice(i, i + 2);
    if (row.length < 2) row.push(<div key={`empty-${i}`} className="bracket-box bracket-empty" />);
    rows.push(row);
  }
  return (
    <div className="bracket-grid">
      {showLabel && <div className="brackets-grid-label">WORD</div>}
      {rows.map((row, ri) => (
        <div key={ri} className="bracket-row bracket-row-2">{row}</div>
      ))}
    </div>
  );
}

// ── Answer grid (2-col, letters filled when solved) ───────────────────────
function AnswerGrid({ count, solvedWord, wonRound, solvedByName }) {
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const l = solvedWord ? solvedWord[i] || '' : '';
    let cls = '';
    if (solvedWord && !solvedByName) cls = ''; // time-up: neutral
    else if (l) cls = wonRound ? 'found-me' : 'found-other';
    boxes.push(
      <div key={i} className={`bracket-box ${cls}`}>
        {l && <span className="bracket-letter">{l.toUpperCase()}</span>}
      </div>
    );
  }
  const rows = [];
  for (let i = 0; i < boxes.length; i += 2) {
    const row = boxes.slice(i, i + 2);
    if (row.length < 2) row.push(<div key={`empty-${i}`} className="bracket-box bracket-empty" />);
    rows.push(row);
  }
  return (
    <div className="bracket-grid answer-brackets">
      <div className="brackets-grid-label">ANSWER</div>
      {rows.map((row, ri) => (
        <div key={ri} className="bracket-row bracket-row-2">{row}</div>
      ))}
      {solvedWord && (
        <div className="solved-text">
          {wonRound ? 'You got it!' : solvedByName ? `${solvedByName} got it!` : 'Time is up!'}
        </div>
      )}
    </div>
  );
}

// ── Confetti overlay (CSS animation) ──────────────────────────────────────
function Confetti({ word, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    playCelebrationSound();
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = Array.from({ length: 36 }, (_, i) => {
    const color = ['#fe2c55', '#00e676', '#ffab00', '#25f4ee', '#7a74b8', '#ff6d00'][i % 6];
    const xStart = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const size = 6 + Math.random() * 6;
    return (
      <div key={i} className="confetti-piece" style={{
        '--x': xStart, '--delay': delay + 's',
        '--color': color, '--size': size + 'px',
        left: xStart + '%'
      }} />
    );
  });

  return (
    <div className="confetti-overlay">
      {pieces}
      <div className="confetti-center">
        <div className="confetti-star">✨</div>
        <div className="confetti-word">{word.toUpperCase()}</div>
        <div className="confetti-msg">Correct!</div>
      </div>
    </div>
  );
}

// ── Simple Web Audio celebration sound ────────────────────────────────────
function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
    // final chord
    setTimeout(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.9);
      });
    }, 450);
  } catch (_) { /* audio not available — silent is fine */ }
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord, onGuess, onHint }) {
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state;

  const [choices, setChoices] = useState([]);     // 3 word choices (champ only)
  const [champWord, setChampWord] = useState('');  // champ's own word (local)
  const [guess, setGuess] = useState('');
  const [solvedWord, setSolvedWord] = useState('');
  const [solvedBy, setSolvedBy] = useState(null);
  const [solvedByName, setSolvedByName] = useState('');
  const [falling, setFalling] = useState(false);
  const [confetti, setConfetti] = useState(null);  // { word } or null
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const guessRef = useRef(null);

  // ── Listen for word_choices (champ only) ─────────────────────────────────
  useEffect(() => {
    const handler = (data) => setChoices(data.choices || []);
    socket.on('word_choices', handler);
    return () => socket.off('word_choices', handler);
  }, [socket]);

  // Reset per round
  useEffect(() => {
    setGuess(''); setSolvedWord(''); setSolvedBy(null); setSolvedByName('');
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    setChoices([]); setChampWord('');
  }, [room.round, room.champId]);

  // Countdown
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

  // Word found / time up → fall animation + congrats
  useEffect(() => {
    const onFound = (data) => {
      setSolvedWord(data.word);
      setSolvedBy(data.winnerId);
      setSolvedByName(data.winnerName);
      setFalling(true);
      if (data.winnerId === socket.id) setConfetti({ word: data.word });
      setTimeout(() => setFalling(false), 1300);
    };
    const onTimeUp = (data) => {
      setSolvedWord(data.word);
    };
    socket.on('word_found', onFound);
    socket.on('time_up', onTimeUp);
    return () => { socket.off('word_found', onFound); socket.off('time_up', onTimeUp); };
  }, [socket]);

  // Top bracket letters
  const topLetters = Array.from({ length: wordLen }, (_, i) => {
    if (state === 'round_over' && solvedWord) return solvedWord[i] || '';
    if (isChamp && champWord) return champWord[i] || '';
    if (i < (room.revealedPrefix || '').length) return room.revealedPrefix[i];
    return '';
  });

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const clearConfetti = useCallback(() => setConfetti(null), []);
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const submitPick = (w) => {
    setSubmitting(true);
    onChooseWord(w);
    setChampWord(w);
    setTimeout(() => setSubmitting(false), 500);
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
    ? (isChamp ? 'Champ turn! Pick one word' : `${champPlayer?.name || 'Champ'} is picking a word...`)
    : state === 'playing'
      ? (isChamp ? 'Your word is in play — good luck, guessers!' : `${champPlayer?.name || 'Champ'}'s word — guess it!`)
      : 'Round over';

  // ── Score board players (sorted) ────────────────────────────────────────
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="game-area">
      {confetti && <Confetti word={confetti.word} onDone={clearConfetti} />}

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

      {/* Timer */}
      {state === 'playing' && (
        <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>
          {timerLabel}
        </div>
      )}

      {/* ── WORD grid (2 columns) ──────────────────────────────────────── */}
      <div className="brackets-area">
        {wordLen > 0 && (
          <BracketGrid
            count={wordLen}
            letters={topLetters}
            solved={solved}
            wonRound={wonRound}
            showLabel={true}
          />
        )}

        {falling && solvedWord && (
          <div className="falling-word falling-answer">{solvedWord.toUpperCase()}</div>
        )}

        {/* ── ANSWER grid ──────────────────────────────────────────────── */}
        {wordLen > 0 && (
          <AnswerGrid
            count={wordLen}
            solvedWord={solvedWord}
            wonRound={wonRound}
            solvedByName={solvedByName}
          />
        )}
      </div>

      {/* ── Champ word picker (3 choices) ──────────────────────────────── */}
      {isChamp && state === 'champ_pick' && choices.length > 0 && (
        <div className="pick-word">
          <label className="pick-word-label">Pick your word — others must guess it</label>
          <div className="word-choices">
            {choices.map((w, i) => (
              <button key={i} className="word-choice-btn" disabled={submitting}
                onClick={() => submitPick(w)}>
                {w.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Guesser input ──────────────────────────────────────────────── */}
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

      {/* ── Score board ────────────────────────────────────────────────── */}
      <div className="score-board">
        <div className="score-board-title">SCORES</div>
        {sortedPlayers.map((p, i) => (
          <div key={p.id} className={`score-board-row ${p.id === socket.id ? 'score-board-me' : ''}`}>
            <span className="score-board-rank">{i + 1}</span>
            <span className="score-board-name">
              {p.id === room.champId && <span className="champ-crown">👑</span>} {p.name}
            </span>
            <span className="score-board-pts">{p.score}</span>
          </div>
        ))}
      </div>

      {/* ── Hint button ────────────────────────────────────────────────── */}
      {!isChamp && state === 'playing' && !solved && (
        <button
          className="hint-btn"
          onClick={onHint}
          disabled={(me?.hintsLeft || 0) <= 0}
          style={{ marginTop: 10 }}
        >
          <span className="hint-icon">💡</span>
          Hint
          <span className="hint-count">{me?.hintsLeft ?? 0}</span>
        </button>
      )}

      {/* Champ watching status */}
      {isChamp && state === 'playing' && (
        <div className="champ-watching">Waiting for a guesser to get it...</div>
      )}
    </div>
  );
}
