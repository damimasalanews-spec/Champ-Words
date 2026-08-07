import { useState, useEffect, useRef, useCallback } from 'react';
import PlayerList from './PlayerList';
import { playSound } from '../sounds';

// ═══ Helpers ══════════════════════════════════════════════════════════════
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

// ── Category Pick Popup ───────────────────────────────────────────────────
function CategoryPickPopup({ categories, onPick, disabled, timeLeft, guesserName }) {
  return (
    <div className="pick-popup-overlay">
      <div className="pick-popup-card">
        <h2>Pick a category</h2>
        <p className="pick-popup-sub">Choose a theme for {guesserName || 'the guesser'}'s word — {timeLeft}s left</p>
        <div className="category-choices">
          {categories.map(c => (
            <button key={c.id} className="category-choice" disabled={disabled}
              onClick={() => onPick(c.id)}>
              <span className="category-icon">{c.icon}</span>
              <span className="category-label">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Word Pick Popup (6 choices + optional champ clue) ─────────────────────
function WordPickPopup({ choices, onPick, disabled, timeLeft, categoryLabel, guesserName }) {
  const [hint, setHint] = useState('');
  return (
    <div className="pick-popup-overlay">
      <div className="pick-popup-card">
        <h2>Choose your word</h2>
        <p className="pick-popup-sub">
          {categoryLabel ? <span className="pick-category-tag">{categoryLabel}</span> : null}
          {guesserName || 'The guesser'} must find it on the grid — {timeLeft}s left
        </p>
        <div className="pick-popup-choices">
          {choices.map((w, i) => (
            <button key={i} className="pick-popup-word" disabled={disabled}
              onClick={() => onPick(w, hint)}>
              <span className="pick-popup-text">{w.toUpperCase()}</span>
              <span className="pick-popup-len">{w.length} letters</span>
            </button>
          ))}
        </div>
        <div className="pick-hint-box">
          <label className="pick-hint-label">20s clue (optional)</label>
          <input className="pick-hint-input" value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="leave empty for an automatic hint"
            maxLength={60} />
          <p className="pick-hint-note">Auto-clue shown at 20s left · category at 40s left · one letter revealed at each</p>
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

function Confetti({ word, onDone, msg }) {
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
        <div className="confetti-msg">{msg}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord }) {
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state;
  const grid = room.grid || [];

  const [catChoices, setCatChoices] = useState([]);
  const [pickedCat, setPickedCat] = useState(null);
  const [categoryHint, setCategoryHint] = useState('');
  const [wordClue, setWordClue] = useState('');
  const [hintAction, setHintAction] = useState(null); // champ's 5s hint window: { type, label?, clues?, timeLeft }
  const [hintActionLeft, setHintActionLeft] = useState(0);
  const [hintSending, setHintSending] = useState(false);
  const [choices, setChoices] = useState([]);
  const [champWord, setChampWord] = useState('');
  const [solvedWord, setSolvedWord] = useState('');
  const [solvedBy, setSolvedBy] = useState(null);
  const [solvedByName, setSolvedByName] = useState('');
  const [foundList, setFoundList] = useState([]); // [{ name, score, self }] — correct guessers this round
  const [falling, setFalling] = useState(false);
  const [confetti, setConfetti] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  // Drag state
  const [dragPath, setDragPath] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [typedWord, setTypedWord] = useState('');
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

  // category_choices + word_choices listeners
  useEffect(() => {
    const onCat = data => { setCatChoices(data.categories || []); playSound('popup'); };
    const onWords = data => { setChoices(data.choices || []); playSound('popup'); };
    socket.on('category_choices', onCat); socket.on('word_choices', onWords);
    return () => { socket.off('category_choices', onCat); socket.off('word_choices', onWords); };
  }, [socket]);

  // Reset per round
  useEffect(() => {
    setCatChoices([]); setPickedCat(null); setCategoryHint(''); setWordClue('');
    setHintAction(null); setHintActionLeft(0); setHintSending(false);
    setChoices([]); setChampWord(''); setSolvedWord(''); setSolvedBy(null); setSolvedByName('');
    setFoundList([]);
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    setDragPath([]); setIsDragging(false); setTypedWord(''); lastCellRef.current = null;
  }, [room.round, room.champId]);

  // Countdown
  useEffect(() => {
    if (state !== 'playing' || !room.endsAt) return;
    const tick = () => { const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)); setTimeLeft(rem); if (rem <= 0) clearInterval(iv); };
    const iv = setInterval(tick, 250); tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round]);

  // Word found / time up — the round continues until everyone finds it
  useEffect(() => {
    const onFound = (data) => {
      playSound('found');
      const cName = data.champName || 'Champ';
      if (data.self && data.word) {
        // the finder gets the word revealed + confetti
        setSolvedWord(data.word);
        setSolvedBy(data.winnerId);
        setSolvedByName(data.winnerName);
        setFalling(true);
        setTimeout(() => setFalling(false), 1300);
        setConfetti({ word: data.word, msg: `You found it! +${data.score} pts` });
      }
      // everyone sees who got it right
      setFoundList(prev => [...prev, { name: data.winnerName || 'Someone', score: data.score, self: data.self }]);
    };
    const onTimeUp = (data) => { setSolvedWord(data.word); playSound('timeup'); };
    socket.on('word_found', onFound); socket.on('time_up', onTimeUp);
    return () => { socket.off('word_found', onFound); socket.off('time_up', onTimeUp); };
  }, [socket]);

  // Champ hints: category at 40s remaining, one-line clue at 20s remaining
  useEffect(() => {
    const onCatHint = (data) => { setCategoryHint(data.label || ''); playSound('hint'); };
    const onClue = (data) => { setWordClue(data.text || ''); playSound('hint'); };
    socket.on('category_hint', onCatHint); socket.on('word_hint', onClue);
    return () => { socket.off('category_hint', onCatHint); socket.off('word_hint', onClue); };
  }, [socket]);

  // Champ's 5s hint-action window (hint_request) + penalty notice (points_lost)
  useEffect(() => {
    const onReq = (data) => { setHintAction(data); setHintActionLeft(data.timeLeft || 5); setHintSending(false); playSound('alert'); };
    const onLost = (data) => { showToast(`−${data.amount} pts — ${data.reason}`, 'error'); playSound('penalty'); };
    socket.on('hint_request', onReq); socket.on('points_lost', onLost);
    return () => { socket.off('hint_request', onReq); socket.off('points_lost', onLost); };
  }, [socket, showToast]);

  // "Champ is choosing" popup sound for other players
  useEffect(() => {
    if (state === 'champ_pick' && !isChamp) playSound('popup');
  }, [state, isChamp]);

  // 5s countdown for the hint window
  useEffect(() => {
    if (!hintAction) return;
    const iv = setInterval(() => {
      setHintActionLeft(prev => {
        if (prev <= 1) { clearInterval(iv); setHintAction(null); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [hintAction]);

  const sendCategoryHint = () => {
    setHintSending(true);
    playSound('click');
    socket.emit('send_category_hint', { roomId: room.id }, (res) => {
      setHintSending(false);
      if (res && res.ok) setHintAction(null);
      else if (res && res.error) showToast(res.error);
    });
  };
  const sendClue = (text) => {
    setHintSending(true);
    playSound('click');
    socket.emit('send_word_hint', { roomId: room.id, text }, (res) => {
      setHintSending(false);
      if (res && res.ok) setHintAction(null);
      else if (res && res.error) showToast(res.error);
    });
  };

  // ── Drag: cell under a pointer ───────────────────────────────────
  const cellUnderPoint = (clientX, clientY) => {
    if (!gridRef.current) return null;
    const cells = gridRef.current.querySelectorAll('.grid-cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (clientX >= rect.left + 4 && clientX <= rect.right - 4 && clientY >= rect.top + 4 && clientY <= rect.bottom - 4) {
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

  // ── Type the answer (text fallback, same validation as drag) ────────────
  const submitTyped = (e) => {
    e.preventDefault();
    const w = typedWord.trim().toLowerCase();
    if (w.length < 3 || submitting) return;
    setSubmitting(true);
    socket.emit('submit_word', { roomId: room.id, word: w, path: [] }, (res) => {
      setSubmitting(false);
      if (res.ok) { setTypedWord(''); }
      else if (res.error) showToast(res.error);
    });
  };

  // Drag global listeners
  useEffect(() => {
    const move = (e) => continueDrag(e);
    const up = () => endDrag();
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [continueDrag, endDrag]);

  // ── Champ pick ────────────────────────────────────────────────────
  const submitPick = (w, hint) => {
    setSubmitting(true);
    onChooseWord(w, hint);
    setChampWord(w);
    setTimeout(() => setSubmitting(false), 500);
  };

  const pickCategory = (cat) => {
    setSubmitting(true);
    socket.emit('choose_category', { roomId: room.id, category: cat }, (res) => {
      setSubmitting(false);
      if (res && res.ok) { setPickedCat(cat); }
      else if (res && res.error) showToast(res.error);
    });
  };

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const dragWord = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('').toUpperCase();
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const totalRounds = room.totalRounds || 5;
  const pickedCatObj = catChoices.find(c => c.id === pickedCat) || null;
  const guesserPlayer = room.players.find(p => p.id === room.guesserId) || null;
  const isGuesser = room.guesserId === socket.id;
  const guesserName = guesserPlayer?.name || 'the guesser';

  const banner = state === 'champ_pick'
    ? (isChamp ? (pickedCat ? `Pick a word for ${guesserName} (${pickTimeLeft}s left)` : `Pick a category for ${guesserName} (${pickTimeLeft}s left)`) : `${champPlayer?.name || 'The picker'} is choosing... (${pickTimeLeft}s)`)
    : state === 'playing'
      ? (isGuesser ? `You're on the spot! Find ${champPlayer?.name || 'the picker'}'s word!`
        : isChamp ? `You picked the word — watch ${guesserName} guess!`
        : `${guesserName} is on the spot! Find ${champPlayer?.name || 'the picker'}'s word!`)
      : 'Round over';
  const champAvatar = (isGuesser ? guesserPlayer : champPlayer)?.avatar || '';

  return (
    <div className="game-area">
      {/* ── Category pick popup (champ only) ── */}
      {isChamp && state === 'champ_pick' && !pickedCat && catChoices.length > 0 && (
        <CategoryPickPopup categories={catChoices} onPick={pickCategory} disabled={submitting}
          timeLeft={pickTimeLeft} guesserName={guesserName} />
      )}

      {/* ── Word pick popup (champ only, after category) ── */}
      {isChamp && state === 'champ_pick' && pickedCat && choices.length > 0 && (
        <WordPickPopup choices={choices} onPick={submitPick} disabled={submitting}
          timeLeft={pickTimeLeft} categoryLabel={pickedCatObj?.label} guesserName={guesserName} />
      )}

      {/* ── "Champ is choosing" popup (shown to other players) ── */}
      {!isChamp && state === 'champ_pick' && (
        <div className="pick-popup-overlay">
          <div className="pick-popup-card champ-choosing-card">
            <div className="choosing-avatar">
              {champAvatar ? <img src={champAvatar} alt="" className="choosing-avatar-img" /> : <div className="choosing-avatar-fallback">👑</div>}
            </div>
            <h2>{champPlayer?.name || 'The picker'} is choosing a word for {guesserName}…</h2>
            <p className="pick-popup-sub">Get ready to guess on the grid!</p>
            <div className="choosing-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      )}

      {/* ── Champ hint action popup (40s category / 20s clue, 5s to act) ── */}
      {hintAction && (
        <div className="pick-popup-overlay">
          <div className="pick-popup-card hint-action-card">
            <h2>{hintAction.type === 'category' ? 'Send the category hint?' : 'Send a clue to players?'}</h2>
            <p className="pick-popup-sub">{hintActionLeft}s left — miss it and you lose 20 pts</p>
            {hintAction.type === 'category' ? (
              <button className="btn btn-primary hint-send-btn" disabled={hintSending} onClick={sendCategoryHint}>
                🏷️ Send "It's a {hintAction.label} word!"
              </button>
            ) : (
              <div className="hint-clue-options">
                {hintAction.clues.map((c, i) => (
                  <button key={i} className="hint-clue-option" disabled={hintSending} onClick={() => sendClue(c)}>
                    💡 {c}
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-danger hint-skip-btn" onClick={() => setHintAction(null)}>Skip (−20 pts)</button>
          </div>
        </div>
      )}

      {confetti && <Confetti word={confetti.word} onDone={clearConfetti} msg={confetti.msg || ''} />}

      <div className="game-header">
        <span className="round-info">Round <span>{room.round}</span><em> / {totalRounds}</em></span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="chat-toggle" onClick={onChatToggle} style={{ fontSize: 10 }}>
            {chatOpen ? 'Close Chat' : 'Chat'}
          </button>
        </div>
      </div>

      <PlayerList players={room.players} host={room.host} champId={room.champId} guesserId={room.guesserId} myId={socket.id} />

      <div className="game-layout">
        {/* ── Left: play field ── */}
        <div className="game-col-left">
          {isChamp && state === 'playing' && champWord && (
            <div className="champ-word-display">Your word: <b>{champWord.toUpperCase()}</b></div>
          )}

      {state === 'playing' && (
        <>
          <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>{timerLabel}</div>
          <div className="timer-bar">
            <div className={`timer-bar-fill ${timeLeft <= 10 ? 'timer-bar-warn' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 60) * 100))}%` }} />
          </div>
        </>
      )}

      {/* ── 4×4 Grid ── */}
      {state === 'playing' && grid.length > 0 && (
        <div className="grid-drag-wrapper" ref={gridRef}>
          <div className="grid-4x4">
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

      {/* ── Type the answer (hot-seat guesser) ── */}
      {isGuesser && state === 'playing' && !solvedWord && (
        <form className="type-answer" onSubmit={submitTyped}>
          <input value={typedWord} onChange={e => setTypedWord(e.target.value)}
            placeholder="Or type the answer…" maxLength={8} autoComplete="off" />
          <button type="submit" className="btn btn-primary btn-small" disabled={submitting}>Go</button>
        </form>
      )}

      {/* ── Who found the word (round keeps going until everyone gets it) ── */}
      {foundList.length > 0 && state === 'playing' && (
        <div className="found-now">
          {foundList.map((f, i) => (
            <span key={i} className={`found-chip ${f.self ? 'found-self' : ''}`}>
              ✅ {f.name} +{f.score}
            </span>
          ))}
        </div>
      )}

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
              {wonRound ? `You cracked ${champPlayer?.name || 'Champ'}'s word!` : solvedByName || 'Time is up!'}
            </div>
          )}
        </div>
      )}

        </div>

        {/* ── Right: notifications ── */}
        <div className="game-col-right">
          <div className={`side-status-card ${isChamp ? 'side-status-me' : ''}`}>
            <div className="side-avatar">
              {champAvatar ? <img src={champAvatar} alt="" className="side-avatar-img" /> : <div className="side-avatar-fallback">👑</div>}
              <span className="wave-hand">👋</span>
            </div>
            <div className="side-status-text">{banner}</div>
          </div>

          {/* ── Score board (tiles, like the grid) ── */}
          <div className="score-board score-board-grid">
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

          {categoryHint && state === 'playing' && (
            <div className="hint-category">🏷️ It's a {categoryHint} category!</div>
          )}
          {wordClue && state === 'playing' && (
            <div className="hint-clue">💡 {wordClue}</div>
          )}

          {isChamp && state === 'playing' && (
            <div className="champ-watching">Waiting for someone to drag the right word...</div>
          )}
        </div>
      </div>

    </div>
  );
}
