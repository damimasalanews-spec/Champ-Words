import { useState, useEffect, useRef, useCallback } from 'react';
import PlayerList from './PlayerList';
import { playSound } from '../sounds';

// ═══ Helpers ══════════════════════════════════════════════════════════════
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

// ── Word Pick Popup (6 choices + optional champ clue) ─────────────────────
function WordPickPopup({ choices, onPick, disabled, timeLeft, guesserName }) {
  const [hint, setHint] = useState('');
  return (
    <div className="pick-popup-overlay">
      <div className="pick-popup-card">
        <h2>Choose your word</h2>
        <p className="pick-popup-sub">
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
          <p className="pick-hint-note">Your clue is offered at 40s left · 2 letters revealed at 40s too</p>
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
export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord, messages = [] }) {
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state;
  const grid = room.grid || [];
  const isGuesser = room.guesserId === socket.id;

  const [wordClue, setWordClue] = useState('');
  const [hintAction, setHintAction] = useState(null); // champ's 5s hint window: { type, clues?, timeLeft }
  const [hintActionLeft, setHintActionLeft] = useState(0);
  const [hintSending, setHintSending] = useState(false);
  const [clueSent, setClueSent] = useState(false);
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

  // word_choices listener
  useEffect(() => {
    const onWords = data => { setChoices(data.choices || []); playSound('popup'); };
    socket.on('word_choices', onWords);
    return () => { socket.off('word_choices', onWords); };
  }, [socket]);

  // Reset per round
  useEffect(() => {
    setWordClue(''); setHintAction(null); setHintActionLeft(0); setHintSending(false); setClueSent(false);
    setChoices([]); setChampWord(''); setSolvedWord(''); setSolvedBy(null); setSolvedByName('');
    setFoundList([]);
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    setDragPath([]); setIsDragging(false); setTypedWord(''); lastCellRef.current = null;
    setSpectPath([]); setSpectWord(''); setSpectName(''); setSpectDrawn(null);
  }, [room.round, room.champId]);

  // Countdown
  useEffect(() => {
    if (state !== 'playing' || !room.endsAt) return;
    const tick = () => { const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)); setTimeLeft(rem); if (rem <= 0) clearInterval(iv); };
    const iv = setInterval(tick, 250); tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round]);

  // Word found / time up — reveal the word and let the letters fall into the brackets
  useEffect(() => {
    const onFound = (data) => {
      playSound('found');
      // Everyone learns WHO solved it (green name in the TOP 5)…
      if (data.winnerId) {
        setSolvedBy(data.winnerId);
        setSolvedByName(data.winnerName || '');
      }
      // …but only the finder sees the word fall into the brackets
      if (data.word) {
        setSolvedWord(data.word);
        setFalling(true);
        setTimeout(() => setFalling(false), 1800);
        if (data.winnerId === socket.id) {
          setConfetti({ word: data.word, msg: `You found it! +${data.score} pts` });
        }
      }
      setFoundList(prev => [...prev, { name: data.winnerName || 'Someone', score: data.score, self: data.winnerId === socket.id }]);
    };
    const onTimeUp = (data) => { setSolvedWord(data.word); playSound('timeup'); };
    socket.on('word_found', onFound); socket.on('time_up', onTimeUp);
    return () => { socket.off('word_found', onFound); socket.off('time_up', onTimeUp); };
  }, [socket]);

  // Spectator view: see what the hot-seat guesser is dragging
  const [spectPath, setSpectPath] = useState([]);
  const [spectWord, setSpectWord] = useState('');
  const [spectName, setSpectName] = useState('');
  const [spectDrawn, setSpectDrawn] = useState(null); // { name, word } after a completed drag
  useEffect(() => {
    const onDrag = (d) => { setSpectPath(d.path || []); setSpectWord(d.word || ''); setSpectName(d.playerName || ''); setSpectDrawn(null); };
    const onEnd = (d) => {
      setSpectPath([]); setSpectWord('');
      setSpectDrawn({ name: d.playerName || '', word: d.word || '' });
      setTimeout(() => setSpectDrawn(null), 3000);
    };
    socket.on('guess_drag', onDrag); socket.on('guess_drag_end', onEnd);
    return () => { socket.off('guess_drag', onDrag); socket.off('guess_drag_end', onEnd); };
  }, [socket]);

  // Champ hint: the picker's one-line clue
  useEffect(() => {
    const onClue = (data) => { setWordClue(data.text || ''); playSound('hint'); };
    socket.on('word_hint', onClue);
    return () => { socket.off('word_hint', onClue); };
  }, [socket]);

  // Champ's 5s hint-action window (hint_request) + penalty notice (points_lost)
  useEffect(() => {
    const onReq = (data) => { setHintAction(data); setHintActionLeft(data.timeLeft || 5); setHintSending(false); setClueSent(false); playSound('alert'); };
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
    if (submitting) return;
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
    if (idx >= 0) { const np = dragPath.slice(0, idx + 1); setDragPath(np); socket.emit('guess_drag', { roomId: room.id, path: np }); return; }
    if (dragPath.length >= 8) return;
    const np = [...dragPath, [cell.r, cell.c]];
    setDragPath(np);
    socket.emit('guess_drag', { roomId: room.id, path: np }); // everyone sees the live drag
  }, [isDragging, dragPath, submitting, room.id, socket]);

  const endDrag = useCallback(() => {
    if (!isDragging || submitting) return;
    setIsDragging(false);
    lastCellRef.current = null;
    if (dragPath.length < 3) { setDragPath([]); return; }
    const word = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('');
    socket.emit('guess_drag_end', { roomId: room.id, path: dragPath }); // spectators see the finished draw
    setSubmitting(true);
    socket.emit('submit_word', { roomId: room.id, word, path: dragPath }, (res) => {
      setSubmitting(false);
      if (res.ok) { /* handled by word_found event */ }
      else if (res.error && !res.error.includes('Not the word')) showToast(res.error); // no wrong-guess popup
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
      else if (res.error && !res.error.includes('Not the word')) showToast(res.error); // no wrong-guess popup
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

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const dragWord = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('').toUpperCase();
  // TOP 5: players who made a correct answer THIS round, fastest solver
  // first — each shows their current round score (resets every round)
  const sortedPlayers = room.players
    .filter(p => p.foundWord && (p.roundScore || 0) > 0)
    .sort((a, b) => (a.roundFoundAt || 0) - (b.roundFoundAt || 0));

  // Top 5 OVERALL players by total score — shown as one row below the grid.
  // If the names don't fit, the row becomes a left→right scrolling timeline.
  const top5Row = room.players
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const top5Ref = useRef(null);
  const [top5Scroll, setTop5Scroll] = useState(false);
  useEffect(() => {
    const el = top5Ref.current;
    if (!el) return;
    const update = () => setTop5Scroll(el.scrollWidth > el.clientWidth + 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [top5Row]);
  const totalRounds = room.totalRounds || 5;
  const guesserPlayer = room.players.find(p => p.id === room.guesserId) || null;
  const guesserName = guesserPlayer?.name || 'the guesser';

  const banner = state === 'playing' ? 'Everyone is guessing the word!' : 'Round over';
  const champAvatar = '';
  // Live #1 player by total score — shown until someone beats them
  const topPlayer = [...room.players].sort((a, b) => b.score - a.score)[0] || null;
  const showLeader = state === 'playing' && topPlayer && topPlayer.score > 0;

  return (
    <div className="game-area">
      {/* ── Word pick popup (champ only) ── */}
      {isChamp && state === 'champ_pick' && choices.length > 0 && (
        <WordPickPopup choices={choices} onPick={submitPick} disabled={submitting}
          timeLeft={pickTimeLeft} guesserName={guesserName} />
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

      {/* ── Champ hint action popup (3 clue lines at 40s, 5s to act) ── */}
      {hintAction && (
        <div className="pick-popup-overlay">
          <div className="pick-popup-card hint-action-card">
            <h2>Send a clue to the guesser?</h2>
            <p className="pick-popup-sub">{hintActionLeft}s left — miss it and you lose 20 pts</p>
            <div className="hint-clue-options">
              {hintAction.clues.map((c, i) => (
                <button key={i} className="hint-clue-option" disabled={hintSending || clueSent} onClick={() => sendClue(c)}>
                  💡 {c}
                </button>
              ))}
            </div>
            <button className="btn btn-danger hint-skip-btn" onClick={() => setHintAction(null)}>Skip (−20 pts)</button>
          </div>
        </div>
      )}

      {confetti && <Confetti word={confetti.word} onDone={clearConfetti} msg={confetti.msg || ''} />}

      <div className="game-header">
        {/* Remaining chat info — right above the answer box (half-size layout) */}
        {messages.length > 0 && (
          <div className="inline-chat footer-chat">
            {messages.slice(-3).map((m, i) => (
              <div key={i} className={`inline-chat-msg${m.system ? ' system' : ''}${m.green ? ' success' : ''}`}>
                {m.system ? m.text : `${m.name}: ${m.text}`}
              </div>
            ))}
          </div>
        )}
        <div className="game-header-row">
          {/* Answer box in the bottom round row (half-size layout) */}
          {state === 'playing' && !solvedWord && (
            <form className="type-answer footer-answer" onSubmit={submitTyped}>
              <input value={typedWord} onChange={e => setTypedWord(e.target.value)}
                placeholder="Or type the answer…" maxLength={8} autoComplete="off" />
              <button type="submit" className="btn btn-primary btn-small" disabled={submitting}>Go</button>
            </form>
          )}
          <span className="round-info">Round <span>{room.round}</span><em> / {totalRounds}</em>
            {totalRounds >= 20 && <em className="round-section"> · Section {Math.ceil(room.round / 10)}/{Math.ceil(totalRounds / 10)}</em>}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="chat-toggle" onClick={onChatToggle} style={{ fontSize: 10 }}>
              {chatOpen ? 'Close Chat' : 'Chat'}
            </button>
          </div>
        </div>
      </div>

      <PlayerList players={room.players} host={room.host} champId={room.champId} guesserId={room.guesserId} myId={socket.id} />

      {/* ── Big jiggling banner ── */}
      {state === 'playing' && (
        <div className="spot-banner">
          {"GUESS THE WORD!".split('').map((ch, i) => (
            <span key={i} style={{ '--i': i }}>{ch === ' ' ? '\u00A0' : ch}</span>
          ))}
        </div>
      )}

      <div className="game-layout">
        {/* ── Left: play field ── */}
        <div className="game-col-left">
        <div className="game-frame">
        <div className="grid-score-row">
        {/* ── Grid + TOP 5 share ONE bordered panel (TikTok half view) ── */}
        <div className="grid-leader-panel">
        <div className="play-col">
          {isChamp && state === 'playing' && champWord && (
            <div className="champ-word-display">Your word: <b>{champWord.toUpperCase()}</b></div>
          )}

      {(state === 'playing' || state === 'round_over') && (
        <>
          <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>{timerLabel}</div>
          <div className="timer-bar">
            <div className={`timer-bar-fill ${timeLeft <= 10 ? 'timer-bar-warn' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 60) * 100))}%` }} />
          </div>
        </>
      )}

      {/* ── 4×4 Grid (play column) — stays visible the 6s after the round ends ── */}
      {(state === 'playing' || state === 'round_over') && grid.length > 0 && (
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

      {/* ── Top 5 overall players in one row (bracket-letter style; scrolls if too long) ── */}
      {(state === 'playing' || state === 'round_over') && top5Row.length > 0 && (
        <div className={`top5-row ${top5Scroll ? 'top5-scroll' : ''}`} ref={top5Ref}>
          <div className="top5-track">
            {top5Row.map((p, i) => (
              <span key={p.id} className="top5-item">
                {i > 0 && <span className="top5-sep">·</span>}
                <span className="top5-name">{p.name}</span>
              </span>
            ))}
            {top5Scroll && top5Row.map((p, i) => (
              <span key={`dup-${p.id}`} className="top5-item" aria-hidden="true">
                {i > 0 && <span className="top5-sep">·</span>}
                <span className="top5-name">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
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

      {wordClue && state === 'playing' && (
        <div className="hint-clue">💡 {wordClue}</div>
      )}

        </div>

        {/* ── TOP 5 (half-size right side) ── */}
        <div className="leader-col">
        <div className="top10-board">
          <div className="top10-title">TOP 5</div>
          {Array.from({ length: 5 }, (_, i) => {
            const p = sortedPlayers[i];
            return (
              <div key={i} className={`top10-row${p ? (p.id === socket.id ? ' top10-me' : '') : ' top10-empty'}`}>
                <span className={`top10-rank${i === 0 ? ' rank-1' : i === 1 ? ' rank-2' : i === 2 ? ' rank-3' : ''}`}>{i + 1}</span>
                {p ? (
                  <>
                    <span className={`top10-name${p.id === solvedBy ? ' solver' : ''}`}>
                      {p.id === room.champId && <span className="champ-crown">👑</span>}
                      {p.id === solvedBy ? '✓ ' : ''}{p.name.split(' ')[0]}
                    </span>
                    <span className="top10-pts">{p.roundScore}</span>
                  </>
                ) : (
                  <span className="top10-name">—</span>
                )}
              </div>
            );
          })}
        </div>
        </div>
        </div>

        {/* ── Answer brackets + artist drawing in one bordered box ── */}
        <div className="answer-art-box">
          {(state === 'playing' || state === 'round_over') && (
            <div key={`inline-${room.round}`} className="art-board art-board-inline">
              {room.art ? (
                <>
                  <div className="art-canvas">
                    <span className="art-emoji">{room.art}</span>
                  </div>
                  <div className="art-progress"><div className="art-progress-fill" /></div>
                </>
              ) : (
                <div className="art-canvas">
                  <span className="art-emoji art-emoji-fallback">🎨</span>
                </div>
              )}
            </div>
          )}

          <div className="answer-art-side">
          {wordLen > 0 && (state === 'playing' || state === 'round_over') && (
            <div className="brackets-section">
              <div className="brackets-label">ANSWER</div>
              <div className="bracket-row">
                {Array.from({ length: wordLen }, (_, i) => {
                  // Show hint-revealed letters when unsolved, full word when solved
                  const hintLetters = room.revealedLetters || [];
                  const hintChar = (hintLetters[i] !== undefined && hintLetters[i] !== '') ? hintLetters[i] : '';
                  const solvedChar = solvedWord ? solvedWord[i] || '' : '';
                  const l = solvedChar || hintChar;
                  // Spaces ("hot dog") render as a gap between words
                  if (l === ' ') return <div key={i} className="bracket-gap" />;
                  let cls = '';
                  if (solvedWord && solvedByName) cls = wonRound ? 'found-me' : 'found-other';
                  else if (l) cls = 'hint-revealed';
                  return (
                    <div key={i} className={`bracket-box ${cls}`}>
                      {l && <span className={`bracket-letter ${solvedWord ? 'falling-letter' : ''}`} style={{ '--d': `${i * 0.09}s` }}>{l.toUpperCase()}</span>}
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
        </div>
        </div>
        </div>
        </div>

        {/* ── Right: notifications ── */}
        <div className="game-col-right">
          {/* ── Live drawing of the word (Pictionary-style reveal) ── */}
          {state === 'playing' && (
            <div key={room.round} className="art-board">
              {room.art ? (
                <>
                  <div className="art-canvas">
                    <span className="art-emoji">{room.art}</span>
                  </div>
                  <div className="art-progress"><div className="art-progress-fill" /></div>
                </>
              ) : null}
            </div>
          )}

          <div className={`side-status-card ${showLeader ? 'side-status-win' : ''}`}>
            {showLeader ? (
              <>
                <div className="side-avatar">
                  {topPlayer.avatar ? <img src={topPlayer.avatar} alt="" className="side-avatar-img win-avatar" /> : <div className="side-avatar-fallback win-avatar">🏆</div>}
                  <span className="wave-hand">🎉</span>
                </div>
                <div className="side-status-text congrats">🎉 CONGRATS {topPlayer.name}! 🎉</div>
              </>
            ) : (
              <>
                <div className="side-avatar">
                  {champAvatar ? <img src={champAvatar} alt="" className="side-avatar-img" /> : <div className="side-avatar-fallback">🎯</div>}
                  <span className="wave-hand">👋</span>
                </div>
                <div className="side-status-text">{banner}</div>
              </>
            )}
          </div>

          {isChamp && state === 'playing' && (
            <div className="champ-watching">Waiting for someone to drag the right word...</div>
          )}
        </div>
      </div>

    </div>
  );
}
