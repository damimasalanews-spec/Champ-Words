import { useState, useEffect, useRef, useCallback } from 'react';
import PlayerList from './PlayerList';

// ═══ Helpers ══════════════════════════════════════════════════════════════
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

// ── Word Pick Popup (6 choices) ───────────────────────────────────────────
function WordPickPopup({ choices, onPick, disabled, timeLeft }) {
  return (
    <div className="pick-popup-overlay">
      <div className="pick-popup-card">
        <h2>Choose your word</h2>
        <p className="pick-popup-sub">Others must guess it from the grid below — {timeLeft}s left</p>
        <div className="pick-popup-choices">
          {choices.map((w, i) => (
            <button key={i} className="pick-popup-word" disabled={disabled}
              onClick={() => onPick(w)}>
              <span className="pick-popup-text">{w.toUpperCase()}</span>
              <span className="pick-popup-len">{w.length} letters</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Confetti + sound ─────────────────────────────────────────────────────
function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
    setTimeout(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.9);
      });
    }, 450);
  } catch (_) {}
}

function Confetti({ word, onDone }) {
  useEffect(() => { playCelebrationSound(); const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="confetti-overlay">
      {Array.from({ length: 36 }, (_, i) => {
        const c = ['#fe2c55','#00e676','#ffab00','#25f4ee','#7a74b8','#ff6d00'][i % 6];
        return <div key={i} className="confetti-piece" style={{'--x':Math.random()*100,'--delay':(Math.random()*0.6)+'s','--color':c,'--size':(6+Math.random()*6)+'px',left:Math.random()*100+'%'}}/>;
      })}
      <div className="confetti-center">
        <div className="confetti-star">✨</div>
        <div className="confetti-word">{word.toUpperCase()}</div>
        <div className="confetti-msg">Correct!</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
const CELL_SZ = 58, GAP = 8, SPACING = CELL_SZ + GAP;

export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord }) {
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state;
  const grid = room.grid || [];

  const [choices, setChoices] = useState([]);
  const [champWord, setChampWord] = useState('');
  const [solvedWord, setSolvedWord] = useState('');
  const [solvedBy, setSolvedBy] = useState(null);
  const [solvedByName, setSolvedByName] = useState('');
  const [falling, setFalling] = useState(false);
  const [confetti, setConfetti] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  // Drag state
  const [dragPath, setDragPath] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef(null);
  const lastCellRef = useRef(null);

  const clearConfetti = useCallback(() => setConfetti(null), []);
  const [pickTimeLeft, setPickTimeLeft] = useState(15);

  // Champ pick countdown (15s)
  useEffect(() => {
    if (state !== 'champ_pick' || !room.pickEndsAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((room.pickEndsAt - Date.now()) / 1000));
      setPickTimeLeft(rem);
      if (rem <= 0) clearInterval(iv);
    };
    const iv = setInterval(tick, 250);
    tick();
    return () => clearInterval(iv);
  }, [state, room.pickEndsAt]);

  // word_choices listener
  useEffect(() => { const h = data => setChoices(data.choices || []); socket.on('word_choices', h); return () => socket.off('word_choices', h); }, [socket]);

  // Reset per round
  useEffect(() => {
    setChoices([]); setChampWord(''); setSolvedWord(''); setSolvedBy(null); setSolvedByName('');
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    setDragPath([]); setIsDragging(false); lastCellRef.current = null;
  }, [room.round, room.champId]);

  // Countdown
  useEffect(() => {
    if (state !== 'playing' || !room.endsAt) return;
    const tick = () => { const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)); setTimeLeft(rem); if (rem <= 0) clearInterval(iv); };
    const iv = setInterval(tick, 250); tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round]);

  // Word found / time up
  useEffect(() => {
    const onFound = (data) => {
      setSolvedWord(data.word); setSolvedBy(data.winnerId); setSolvedByName(data.winnerName);
      setFalling(true); setTimeout(() => setFalling(false), 1300);
      if (data.winnerId === socket.id) setConfetti({ word: data.word });
    };
    const onTimeUp = (data) => { setSolvedWord(data.word); };
    socket.on('word_found', onFound); socket.on('time_up', onTimeUp);
    return () => { socket.off('word_found', onFound); socket.off('time_up', onTimeUp); };
  }, [socket]);

  // ── Drag: cell under a pointer ───────────────────────────────────
  const cellUnderPoint = (clientX, clientY) => {
    if (!gridRef.current) return null;
    const cells = gridRef.current.querySelectorAll('.grid-cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (clientX >= rect.left + 2 && clientX <= rect.right - 2 && clientY >= rect.top + 2 && clientY <= rect.bottom - 2) {
        return { r: parseInt(cell.dataset.row), c: parseInt(cell.dataset.col) };
      }
    }
    return null;
  };

  const startDrag = (r, c, e) => {
    if (submitting || isChamp) return;
    e.preventDefault();
    setIsDragging(true);
    setDragPath([[r, c]]);
    lastCellRef.current = `${r},${c}`;
  };

  const continueDrag = useCallback((e) => {
    if (!isDragging || submitting) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const cell = cellUnderPoint(cx, cy);
    if (!cell) return;
    const ck = `${cell.r},${cell.c}`;
    if (ck === lastCellRef.current) return;
    lastCellRef.current = ck;
    const last = dragPath[dragPath.length - 1];
    if (cell.r === last[0] && cell.c === last[1]) return;
    if (!isAdjacent(last[0], last[1], cell.r, cell.c)) return;
    const idx = dragPath.findIndex(([pr, pc]) => pr === cell.r && pc === cell.c);
    if (idx >= 0) { setDragPath(prev => prev.slice(0, idx + 1)); return; }
    if (dragPath.length >= 8) return;
    setDragPath(prev => [...prev, [cell.r, cell.c]]);
  }, [isDragging, dragPath, submitting]);

  const endDrag = useCallback(() => {
    if (!isDragging || submitting) return;
    setIsDragging(false);
    lastCellRef.current = null;
    if (dragPath.length < 3) { setDragPath([]); return; }
    const word = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('');
    setSubmitting(true);
    socket.emit('submit_word', { roomId: room.id, word, path: dragPath }, (res) => {
      setSubmitting(false);
      if (res.ok) { /* handled by word_found event */ }
      else if (res.error) showToast(res.error);
      setDragPath([]);
    });
  }, [isDragging, dragPath, submitting, grid, room.id, socket, showToast]);

  // Drag global listeners
  useEffect(() => {
    const move = (e) => continueDrag(e);
    const up = () => endDrag();
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [continueDrag, endDrag]);

  // ── Champ pick ────────────────────────────────────────────────────
  const submitPick = (w) => {
    setSubmitting(true);
    onChooseWord(w);
    setChampWord(w);
    setTimeout(() => setSubmitting(false), 500);
  };

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const dragWord = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('').toUpperCase();
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  const banner = state === 'champ_pick'
    ? (isChamp ? `Pick a word (${pickTimeLeft}s left)` : `${champPlayer?.name || 'Champ'} is choosing... (${pickTimeLeft}s)`)
    : state === 'playing'
      ? (isChamp ? 'Your word is on the grid — watch them guess!' : `Find ${champPlayer?.name || 'Champ'}'s word — drag on the grid!`)
      : 'Round over';

  return (
    <div className="game-area">
      {/* ── Word pick popup (champ only) ── */}
      {isChamp && state === 'champ_pick' && choices.length > 0 && (
        <WordPickPopup choices={choices} onPick={submitPick} disabled={submitting} timeLeft={pickTimeLeft} />
      )}

      {confetti && <Confetti word={confetti.word} onDone={clearConfetti} />}

      <div className="game-header">
        <span className="round-info">Round <span>{room.round}</span></span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="chat-toggle" onClick={onChatToggle} style={{ fontSize: 10 }}>
            {chatOpen ? 'Close Chat' : 'Chat'}
          </button>
        </div>
      </div>

      <PlayerList players={room.players} host={room.host} champId={room.champId} myId={socket.id} />

      <div className={`champ-banner ${isChamp ? 'champ-banner-me' : ''}`}>
        <span className="champ-crown">👑</span> {banner}
      </div>

      {state === 'playing' && (
        <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>{timerLabel}</div>
      )}

      {/* ── 4×4 Grid ── */}
      {state === 'playing' && grid.length > 0 && (
        <div className="grid-drag-wrapper" ref={gridRef}>
          <div className="grid-4x4">
            <svg className="drag-path-svg">
              {dragPath.length > 1 && dragPath.map(([r, c], i) => {
                if (i === 0) return null;
                const [pr, pc] = dragPath[i - 1];
                return <line key={`l${i}`} x1={pc * SPACING + CELL_SZ / 2} y1={pr * SPACING + CELL_SZ / 2}
                  x2={c * SPACING + CELL_SZ / 2} y2={r * SPACING + CELL_SZ / 2}
                  stroke="var(--green)" strokeWidth="5" strokeLinecap="round" opacity="0.85" />;
              })}
            </svg>
            {grid.map((row, r) => (
              <div key={r} className="grid-row">
                {row.map((ch, c) => {
                  const sel = dragPath.some(([pr, pc]) => pr === r && pc === c);
                  const isLast = dragPath.length > 0 && dragPath[dragPath.length - 1][0] === r && dragPath[dragPath.length - 1][1] === c;
                  return (
                    <div key={c} className={`grid-cell ${sel ? 'selected' : ''} ${isLast ? 'last' : ''}`}
                      data-row={r} data-col={c}
                      onMouseDown={(e) => startDrag(r, c, e)}
                      onTouchStart={(e) => startDrag(r, c, e)}>
                      {ch.toUpperCase()}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {dragPath.length > 0 && !submitting && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span className="drag-word-display">{dragWord}</span>
              <button className="btn btn-small btn-danger" style={{ marginLeft: 10 }} onClick={() => { setDragPath([]); setIsDragging(false); lastCellRef.current = null; }}>Clear</button>
            </div>
          )}
          {falling && solvedWord && (
            <div className="falling-word falling-answer">{solvedWord.toUpperCase()}</div>
          )}
        </div>
      )}

      {/* ── ANSWER brackets (single row, shows hint letters + solved word) ── */}
      {wordLen > 0 && state === 'playing' && (
        <div className="brackets-section">
          <div className="brackets-label">ANSWER</div>
          <div className="bracket-row">
            {Array.from({ length: wordLen }, (_, i) => {
              // Show hint-revealed letters when unsolved, full word when solved
              const hintLetters = room.revealedLetters || [];
              const hintChar = (hintLetters[i] !== undefined && hintLetters[i] !== '') ? hintLetters[i] : '';
              const solvedChar = solvedWord ? solvedWord[i] || '' : '';
              const l = solvedChar || hintChar;
              let cls = '';
              if (solvedWord && solvedByName) cls = wonRound ? 'found-me' : 'found-other';
              else if (l) cls = 'hint-revealed';
              return (
                <div key={i} className={`bracket-box ${cls}`}>
                  {l && <span className="bracket-letter">{l.toUpperCase()}</span>}
                </div>
              );
            })}
          </div>
          {solvedWord && (
            <div className="solved-text">
              {wonRound ? 'You got it!' : solvedByName ? `${solvedByName} got it!` : 'Time is up!'}
            </div>
          )}
        </div>
      )}

      {/* ── Score board ── */}
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

      {isChamp && state === 'playing' && (
        <div className="champ-watching">Waiting for someone to drag the right word...</div>
      )}
    </div>
  );
}
