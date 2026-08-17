import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PlayerList from './PlayerList';
import { playSound } from '../sounds';
import useCountUp from '../useCountUp';

// ═══ Helpers ══════════════════════════════════════════════════════════════
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

// Light haptic feedback (Android vibrate API; iOS Safari has no vibrate —
// the existing sound cues cover it there). No-op when unsupported.
function buzz(pattern) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

// Mobile 3-2-1 GO countdown — the grid stays visible beneath it so players
// can pre-scan while the countdown runs. Purely visual; never blocks input.
function GoCountdown() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const iv = setInterval(() => setN(p => (p > 0 ? p - 1 : 0)), 700);
    return () => clearInterval(iv);
  }, []);
  return <div className="cw-go-chip" aria-hidden="true">{n > 0 ? n : 'GO!'}</div>;
}

// ── Word Pick Popup (6 choices + optional champ clue + custom word) ─────
function WordPickPopup({ choices, onPick, disabled, timeLeft, guesserName }) {
  const [hint, setHint] = useState('');
  const [custom, setCustom] = useState('');
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
        <div className="pick-custom-box">
          <label className="pick-hint-label">Or type your own word (3–8 letters)</label>
          <div className="pick-custom-row">
            <input className="pick-custom-input" value={custom}
              onChange={e => setCustom(e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 8))}
              placeholder="e.g. champ" maxLength={8} />
            <button className="pick-custom-go" disabled={disabled || custom.length < 3}
              onClick={() => { if (custom.length >= 3) onPick(custom, hint); }}>
              Go
            </button>
          </div>
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

function Confetti({ word, onDone, msg, silent, variant }) {
  useEffect(() => {
    if (!silent) playCelebrationSound();
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone, silent]);
  const palette = variant === 'milestone'
    ? ['#ffd76a', '#ff9d3c', '#f5b544', '#ffcc33', '#fff3c4', '#ffa94d']
    : variant === 'chat'
    ? ['#35e6a0', '#22c9e0', '#f5b544', '#5ec8ff', '#ffffff', '#1fc98a']
    : ['#35e6a0', '#22c9e0', '#f5b544', '#5ec8ff', '#ffffff', '#1fc98a'];
  const pieces = variant === 'chat' ? 16 : (variant === 'milestone' ? 26 : 36);
  return (
    <div className={`confetti-overlay${variant ? ' confetti-' + variant : ''}`}>
      {Array.from({ length: pieces }, (_, i) => {
        const c = palette[i % 6];
        const size = variant === 'chat' ? (3 + Math.random() * 3) : (6 + Math.random() * 6);
        return <div key={i} className="confetti-piece" style={{'--x':Math.random()*100,'--delay':(Math.random()*0.6)+'s','--color':c,'--size':size+'px',left:Math.random()*100+'%'}}/>;
      })}
      <div className="confetti-center">
        <div className="confetti-star">{variant === 'milestone' ? '🏆' : variant === 'chat' ? '✦' : '✨'}</div>
        {variant === 'chat' && <div className="confetti-avatar">{(word || '?').charAt(0).toUpperCase()}</div>}
        <div className="confetti-word">{word.toUpperCase()}</div>
        {variant === 'chat' && <div className="confetti-divider" />}
        <div className="confetti-msg">{msg}</div>
      </div>
    </div>
  );
}

// ── Top 5 celebration (6s pause — covers the grid with a cartoon fanfare) ──
function CountPts({ value }) { const d = useCountUp(value); return <span className="celeb-pts">{d}</span>; }
function Top5Celebration({ players }) {
  useEffect(() => { playSound('celebrate'); }, []);
  const rankEmoji = ['🥇', '🥈', '🥉'];
  return (
    <div className="top5-celebration">
      <div className="celeb-title">🎉 TOP 5 🎉</div>
      <div className="celeb-list">
        {players.map((p, i) => (
          <div key={p.id} className={`celeb-row celeb-${i + 1}`} style={{ '--d': `${0.15 + i * 0.18}s` }}>
            <span className="celeb-rank">{rankEmoji[i] || `#${i + 1}`}</span>
            <span className="celeb-name">{p.name.split(' ')[0]}</span>
            <CountPts value={p.score} />
          </div>
        ))}
      </div>
      <div className="celeb-confetti">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="celeb-dot" style={{ left: `${(i * 4.2 + 2) % 100}%`, '--cd': `${(i % 8) * 0.12}s`, background: `hsl(${(i * 15) % 360}, 90%, 62%)` }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord, messages = [], notifications = [] }) {
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
  const [allFound, setAllFound] = useState(false); // every online player found the word → round pause
  const [falling, setFalling] = useState(false);
  const [confetti, setConfetti] = useState(null);
  const [scorePop, setScorePop] = useState(null); // flying "+N" on correct guess
  const [foundPopup, setFoundPopup] = useState(null); // TikTok chat solver celebration popup
  const [toasts, setToasts] = useState([]); // achievement toasts (first blood, lightning, streak)
  const toastId = useRef(1);
  const [ticker, setTicker] = useState([]); // winner ticker (recent finds)
  const tickerId = useRef(1);
  const popupQueue = useRef([]); // popups show ONE BY ONE (each ~2s)
  const [floats, setFloats] = useState([]); // floating chat emojis
  const [milestone, setMilestone] = useState(null); // every-10-chat-solves banner
  const chatSolves = useRef(0);
  const lastMsgKey = useRef(null);
  const popupBusy = useRef(false); // true while a popup is on screen
  const popupId = useRef(1); // unique id per popup → forces a fresh mount each time
  useEffect(() => { popupBusy.current = !!foundPopup; }, [foundPopup]);
  const showNextPopup = useCallback(() => {
    const next = popupQueue.current.shift();
    setFoundPopup(next || null);
  }, []);
  const pushFoundPopup = useCallback((p) => {
    popupQueue.current.push({ ...p, id: popupId.current++ });
    if (!popupBusy.current) {
      const next = popupQueue.current.shift();
      if (next) setFoundPopup(next);
    }
  }, []);
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
    setFoundList([]); setAllFound(false);
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    popupQueue.current = [];
    setFoundPopup(null);
    setToasts([]);
    setDragPath([]); setIsDragging(false); setTypedWord(''); lastCellRef.current = null;
  }, [room.round, room.champId]);

  // Countdown (freezes while the host pauses the game)
  useEffect(() => {
    if (state !== 'playing' || !room.endsAt || room.paused) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000));
      setTimeLeft(prev => {
        if (rem !== prev && rem > 0 && rem <= 5) playSound('tick'); // last-5s urgency tick
        return rem;
      });
      if (rem <= 0) clearInterval(iv);
    };
    const iv = setInterval(tick, 250); tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round, room.paused]);

  // Word found / time up — reveal the word and let the letters fall into the brackets
  useEffect(() => {
    const onFound = (data) => {
      // TikTok chat solvers get the celebration popup + ta-da sound instead
      // of the regular 'found' blip (so it doesn't double-play).
      if (!data.fromChat) playSound('found');
      // Everyone learns WHO solved it (green name in the TOP 5)…
      if (data.winnerId) {
        setSolvedBy(data.winnerId);
        setSolvedByName(data.winnerName || '');
      }
      // TikTok chat solver: queue the popup (shown one by one, ~2s each).
      // Shows the profile FIRST name when available, else the @username.
      if (data.fromChat && (data.winnerNick || data.winnerName)) {
        pushFoundPopup({ name: data.winnerNick || data.winnerName, score: data.score, word: data.solved || '' });
      }
      // Every 10th chat solve → milestone celebration
      if (data.fromChat) {
        chatSolves.current += 1;
        if (chatSolves.current % 10 === 0) {
          setMilestone(chatSolves.current);
          setTimeout(() => setMilestone(null), 2600);
        }
      }
    };
    socket.on('word_found', onFound);
    return () => socket.off('word_found', onFound);
  }, [socket, pushFoundPopup]);

  // 1k / 5k / 10k point milestones — queued with the found-word popups so
  // they appear in the same spot, in order
  useEffect(() => {
    const onMilestone = (data) => {
      if (!data || !data.name || !data.points) return;
      pushFoundPopup({ kind: 'milestone', name: data.name, points: data.points });
    };
    socket.on('milestone', onMilestone);
    return () => socket.off('milestone', onMilestone);
  }, [socket, pushFoundPopup]);

  // Hint countdown — champ's 5s hint window
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
  // Wider hit zone on mobile (thumbs are imprecise); desktop canvas unchanged.
  const cellUnderPoint = (clientX, clientY) => {
    if (!gridRef.current) return null;
    const cells = gridRef.current.querySelectorAll('.grid-cell');
    const tol = isWeb ? 9 : 4;
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (clientX >= rect.left + tol && clientX <= rect.right - tol && clientY >= rect.top + tol && clientY <= rect.bottom - tol) {
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
      else if (res.error && res.error.includes('Not the word')) {
        playSound('wrong');
        buzz(70);
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 450);
      }
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
      else if (res.error && res.error.includes('Not the word')) {
        playSound('wrong');
        buzz(70);
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 450);
      }
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

  const solved = Boolean(solvedWord);
  const wonRound = solved && solvedBy === socket.id;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;
  const dragWord = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('').toUpperCase();
  // TOP 5 leaderboard (half-screen right side):
  // - Before anyone solves / during the all-found & round-over pauses →
  //   top 5 players by TOTAL score (anyone in the room).
  // - After the fastest player solves (but not everyone yet) →
  //   ONLY this round's solvers, fastest first, with their round score —
  //   non-solvers are hidden (no zeros).
  const leaderTop = room.players
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const roundSolvers = room.players
    .filter(p => p.foundWord && (p.roundScore || 0) > 0)
    .sort((a, b) => (a.roundFoundAt || 0) - (b.roundFoundAt || 0))
    .slice(0, 5);
  // FULL leaderboard: every player ranked by total score (scrollable below)
  const overallPlayers = room.players.slice().sort((a, b) => b.score - a.score);
  // Flip to "THIS ROUND" when solvers exist this round. Derived from BOTH the
  // local foundList AND the server room data (roundSolvers), so a rejoin or a
  // missed event can never leave the round score hidden behind the totals.
  const showRoundScores = state === 'playing' && !allFound && (foundList.length > 0 || roundSolvers.length > 0);

  // Flash a board row briefly when that player's score increases
  const [flashSet, setFlashSet] = useState(() => new Set());
  const lastScoresRef = useRef({});
  // Crown moment: when someone takes the #1 spot
  const [crownId, setCrownId] = useState(null);
  const prevLeaderRef = useRef(null);
  useEffect(() => {
    const players = room?.players || [];
    const bumped = [];
    players.forEach(p => {
      const prev = lastScoresRef.current[p.id];
      if (prev !== undefined && p.score > prev) bumped.push(p.id);
      lastScoresRef.current[p.id] = p.score;
    });
    if (bumped.length) {
      setFlashSet(prev => new Set([...prev, ...bumped]));
      setTimeout(() => {
        setFlashSet(prev => {
          const next = new Set(prev);
          bumped.forEach(id => next.delete(id));
          return next;
        });
      }, 750);
    }
    // new #1 leader → crown on their TOP 5 row
    const leader = players.slice().sort((a, b) => b.score - a.score)[0];
    const lid = leader && leader.score > 0 ? leader.id : null;
    if (lid && prevLeaderRef.current && lid !== prevLeaderRef.current) {
      setCrownId(lid);
      setTimeout(() => setCrownId(null), 1500);
    }
    prevLeaderRef.current = lid;
  }, [room?.players]);

  // Wrong-guess shake + correct-guess emerald flash on the grid
  const [wrongFlash, setWrongFlash] = useState(false);
  const [solvedFlash, setSolvedFlash] = useState(false);

  // First-time onboarding (shown once)
  const [showOnboard, setShowOnboard] = useState(() => {
    try { return localStorage.getItem('cw_onboarded') !== '1'; } catch (_) { return false; }
  });
  const [onboardStep, setOnboardStep] = useState(0);
  const dismissOnboard = () => {
    setShowOnboard(false);
    try { localStorage.setItem('cw_onboarded', '1'); } catch (_) {}
  };

  // Stream reactions (emoji-only chat messages fly over the grid)
  const [reactions, setReactions] = useState([]);
  useEffect(() => {
    if (!socket) return;
    const onReact = (d) => {
      if (!d || !d.emoji) return;
      const id = Date.now() + Math.random();
      setReactions(rs => [...rs.slice(-14), { id, emoji: d.emoji, name: d.name, x: Math.random() * 80 + 10, rot: (Math.random() - 0.5) * 40 }]);
      setTimeout(() => setReactions(rs => rs.filter(r => r.id !== id)), 2600);
    };
    socket.on('reaction', onReact);
    return () => { socket.off('reaction', onReact); };
  }, [socket]);

  // Top 5 OVERALL players by total score — shown as one row below the grid.
  // If the names don't fit, the row becomes a left→right scrolling timeline.
  const top5Row = useMemo(() => room.players
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5), [room.players]);
  const top5Ref = useRef(null);
  const [top5Scroll, setTop5Scroll] = useState(false);

  // Round-intro animation: shows "ROUND N" when a new round starts
  const [roundIntro, setRoundIntro] = useState(null);
  // Speed/UX features below are mobile-only (the desktop canvas keeps its
  // exact original behavior — never touched).
  const isWeb = typeof document !== 'undefined' && document.documentElement.classList.contains('cw-web');
  const [fastestSec, setFastestSec] = useState(null); // fastest find this round
  useEffect(() => { setFastestSec(null); }, [room && room.round]);
  useEffect(() => {
    if (room && room.state === 'playing') setRoundIntro(room.round);
  }, [room && room.round, room && room.state]);
  // Mobile: the intro is a compact 3-2-1 GO chip (grid stays visible to
  // pre-scan). Desktop keeps the full "ROUND N" card.
  useEffect(() => {
    if (roundIntro === null || !isWeb) return;
    const t = setTimeout(() => setRoundIntro(null), 3100);
    return () => clearTimeout(t);
  }, [roundIntro, isWeb]);
  useEffect(() => {
    const el = top5Ref.current;
    if (!el) return;
    const update = () => setTop5Scroll(el.scrollWidth > el.clientWidth + 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [top5Row]);

  // Floating emojis from TikTok chat messages (float up over the grid)
  useEffect(() => {
    const key = messages.length;
    if (lastMsgKey.current === key) return;
    lastMsgKey.current = key;
    const last = messages[key - 1];
    if (!last || !last.text) return;
    const emojis = (last.text.match(/\p{Extended_Pictographic}/gu) || []).slice(0, 3);
    if (!emojis.length) return;
    const batch = emojis.map((e, i) => ({
      id: `${key}-${i}`, e,
      x: 14 + Math.random() * 72,
      dur: 2.4 + Math.random() * 1.2,
      delay: i * 0.22,
    }));
    setFloats(f => [...f, ...batch]);
    setTimeout(() => setFloats(f => f.filter(x => !batch.some(n => n.id === x.id))), 5200);
  }, [messages]);

  const totalRounds = room.totalRounds || 5;
  const guesserPlayer = room.players.find(p => p.id === room.guesserId) || null;
  const guesserName = guesserPlayer?.name || 'the guesser';

  const banner = state === 'playing' ? 'Everyone is guessing the word!' : 'Round over';
  const champAvatar = '';
  // Live #1 player by total score — shown until someone beats them
  const topPlayer = [...room.players].sort((a, b) => b.score - a.score)[0] || null;
  const showLeader = state === 'playing' && topPlayer && topPlayer.score > 0;

  // ── Canvas vs web section placement ─────────────────────────────────────
  // On the 540×960 canvas the artist drawing sits beside the TOP 5 board
  // (30% left) and the letter grid lives in the answer box below (where the
  // drawing used to be). On web/mobile (cw-web) the original order is kept:
  // grid in the play column, artist in the answer box. These variables let
  // the same markup be placed in either container per mode.
  const artistSection = (state === 'playing' || state === 'round_over') ? (
    <div key={`inline-${room.round}`} className="art-board art-board-inline">
      {room.art ? (
        <>
          <div className="art-canvas">
            {String(room.art).startsWith('http') ? <img className="art-flag" src={room.art} alt="" /> : <span className="art-emoji">{room.art}</span>}
          </div>
          <div className="art-progress"><div className="art-progress-fill" /></div>
        </>
      ) : (
        <div className="art-canvas">
          <span className="art-emoji art-emoji-fallback">🎨</span>
        </div>
      )}
    </div>
  ) : null;

  const gridSection = (state === 'playing' || state === 'round_over') && grid.length > 0 ? (
    <div className={`grid-drag-wrapper${wrongFlash ? ' shake' : ''}${solvedFlash ? ' grid-solved' : ''}`} ref={gridRef}>
      {solvedFlash && (
        <div className="spark-burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ '--dx': `${Math.cos((i / 12) * Math.PI * 2) * 36}px`, '--dy': `${Math.sin((i / 12) * Math.PI * 2) * 36}px` }} />
          ))}
        </div>
      )}
      <div className={`grid-4x4${wordLen >= 7 ? ' grid-rainbow' : ''}${solvedWord ? ' grid-solved' : ''}`} key={`g-${room.round}`}>
        {grid.map((row, r) => (
          <div key={r} className="grid-row">
            {row.map((ch, c) => {
              const sel = dragPath.some(([pr, pc]) => pr === r && pc === c);
              const isLast = dragPath.length > 0 && dragPath[dragPath.length - 1][0] === r && dragPath[dragPath.length - 1][1] === c;
              // Mobile only: subtly pulse the reachable cells while dragging
              const isGhost = isWeb && isDragging && dragPath.length > 0 && !sel &&
                isAdjacent(dragPath[dragPath.length - 1][0], dragPath[dragPath.length - 1][1], r, c);
              return (
                <div key={c} className={`grid-cell ${sel ? 'selected' : ''} ${isLast ? 'last' : ''}${isGhost ? ' ghost' : ''}`}
                  data-row={r} data-col={c} style={{ '--i': r * (grid[0]?.length || 4) + c }}
                  onMouseDown={(e) => startDrag(r, c, e)}
                  onTouchStart={(e) => startDrag(r, c, e)}>
                  {ch.toUpperCase()}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Top 5 celebration during the 6s pause (covers the grid) ── */}
      {(allFound || state === 'round_over') && top5Row.length > 0 && (
        <Top5Celebration players={top5Row} />
      )}

      {dragPath.length > 0 && !submitting && (
        <div className="drag-confirm-row">
          <span className="drag-word-display">{dragWord}</span>
          <button className="btn btn-small btn-danger" style={{ marginLeft: 10 }} onClick={() => { setDragPath([]); setIsDragging(false); lastCellRef.current = null; }}>Clear</button>
        </div>
      )}

      {falling && solvedWord && (
        <div className="falling-word falling-answer">{solvedWord.toUpperCase()}</div>
      )}
      <div className="float-layer" aria-hidden="true">
        {floats.map(f => (
          <span key={f.id} className="float-emoji" style={{ left: `${f.x}%`, '--d': `${f.delay}s`, '--dur': `${f.dur}s` }}>{f.e}</span>
        ))}
      </div>
      {milestone && <div className="milestone-banner">🎉 {milestone} SOLVES! 🎉</div>}
    </div>
  ) : null;

  const foundSection = foundList.length > 0 && state === 'playing' ? (
    <div className="found-now">
      {foundList.map((f, i) => (
        <span key={`${f.id}-${i}`} className={`found-chip ${f.self ? 'found-self' : ''}`} style={{ '--i': i }}>
          ✅ {f.name} +{f.score}
        </span>
      ))}
    </div>
  ) : null;

  const hintSection = wordClue && state === 'playing' ? (
    <div className="hint-clue">💡 {wordClue}</div>
  ) : null;

  return (
    <div className="game-area">
      {/* ── Round intro: mobile gets a 3-2-1 GO chip (grid visible to
             pre-scan, drag works immediately); desktop keeps the original
             "ROUND N" card exactly as before ── */}
      {roundIntro !== null && (
        isWeb ? (
          <GoCountdown key={roundIntro} />
        ) : (
          <div className="round-intro" key={roundIntro} onAnimationEnd={() => setRoundIntro(null)}>
            <div className="round-intro-card">
              <div className="round-intro-label">ROUND</div>
              <div className="round-intro-num">{roundIntro}</div>
              <div className="round-intro-letters">{room.wordLength} LETTERS</div>
            </div>
          </div>
        )
      )}

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

      {/* In-game finder popup — SAME professional style as the TikTok chat popup */}
      {confetti && (
        <Confetti
          variant="chat"
          silent
          word={(me && me.name) || 'You'}
          onDone={clearConfetti}
          msg="You found a Champ Word!"
        />
      )}

      {/* Achievement toasts — stacked pills for the stream */}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map(t => (
            <div key={t.id} className="toast-pill">
              {t.icon} {t.name} — {t.text}
            </div>
          ))}
        </div>
      )}

      {/* Speed round banner */}
      {room.speedRound && state === 'playing' && (
        <div className="speed-banner">⚡ SPEED ROUND — 15s · TRIPLE POINTS</div>
      )}

      {/* Winner ticker — recent finds scrolling */}
      {ticker.length > 0 && (
        <div className="ticker-bar">
          <div className="ticker-track">
            {ticker.map(t => (
              <span key={t.id} className="ticker-item">⚡ {t.name} found it in {t.sec}s</span>
            ))}
          </div>
        </div>
      )}

      {/* TikTok chat solver celebration — silent, professional, one by one.
          key={id} forces a fresh mount per popup so the ~2s timer always runs
          (fixes popups getting stuck when players solve back-to-back). */}
      {foundPopup && (
        <Confetti
          key={foundPopup.id}
          variant={foundPopup.kind === 'milestone' ? 'milestone' : 'chat'}
          silent
          word={foundPopup.name}
          onDone={showNextPopup}
          msg={foundPopup.kind === 'milestone' ? `crossed ${foundPopup.points} points!` : 'You found a Champ Word!'}
        />
      )}

      {/* Flying "+N" popup on a correct guess (flame on a streak ≥2) */}
      {scorePop !== null && (
        <div className={`score-pop${(room.players.find(p => p.id === socket.id)?.streak || 0) >= 2 ? ' score-pop-flame' : ''}`}>
          +{scorePop}{(room.players.find(p => p.id === socket.id)?.streak || 0) >= 2 ? ' 🔥' : ''}
        </div>
      )}

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
          {/* Answer box in the middle (half-size layout) */}
          {state === 'playing' && !solvedWord && (
            <form className="type-answer footer-answer" onSubmit={submitTyped}>
              <input value={typedWord} onChange={e => setTypedWord(e.target.value)}
                placeholder="Or type the answer…" maxLength={10} autoComplete="off" />
              <button type="submit" className="btn btn-primary btn-small" disabled={submitting}>Go</button>
            </form>
          )}
          <span className="round-info">RD <span>{room.round}</span><em> / {totalRounds}</em></span>
          {((room.players || []).find(p => p.id === socket.id)?.streak || 0) >= 2 && (
            <span className="streak-pill">🔥 ×{((room.players || []).find(p => p.id === socket.id)?.streak) || 0}</span>
          )}
          <div className="game-progress" aria-hidden="true"><div className="game-progress-fill" style={{ width: `${Math.min(100, Math.max(0, (room.round / totalRounds) * 100))}%` }} /></div>
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
        <div className={`grid-leader-panel${state === 'playing' && timeLeft <= 10 ? ' low-time' : ''}`}>
        <div className="play-col">
          {isChamp && state === 'playing' && champWord && (
            <div className="champ-word-display">Your word: <b>{champWord.toUpperCase()}</b></div>
          )}

      {/* Timer: web keeps it above the grid; on the 540×960 canvas it moves
          to the left of the ANSWER brackets (recolored square). */}
      {isWeb && (state === 'playing' || state === 'round_over') && (
        <>
          <div className="timer-ring" style={{ '--pct': Math.max(0, Math.min(100, (timeLeft / 60) * 100)) }}>
            <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>{timerLabel}</div>
          </div>
          <div className="timer-bar">
            <div className={`timer-bar-fill ${timeLeft <= 10 ? 'timer-bar-warn' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 60) * 100))}%` }} />
          </div>
          {state === 'playing' && fastestSec !== null && (
            <div className="cw-fastest">⚡ Fastest this round: <b>{fastestSec}s</b> — beat it!</div>
          )}
        </>
      )}

      {/* ── Play column content: timer + letter grid (both modes). The
             540×960 canvas reorders sections via CSS (TOP 5 → brackets →
             this 50% column); web/mobile keeps the original flow. ── */}
      {gridSection}
      {foundSection}
      {hintSection}

      {/* Stream reactions flying over the grid */}
      <div className="reaction-layer" aria-hidden="true">
        {reactions.map(r => (
          <span key={r.id} className="reaction-emoji" style={{ left: `${r.x}%`, '--rot': `${r.rot}deg` }}>{r.emoji}</span>
        ))}
      </div>

      {/* First-time onboarding overlay */}
      {state === 'playing' && showOnboard && (
        <div className="onboard-overlay" onClick={dismissOnboard}>
          <div className="onboard-card" onClick={e => e.stopPropagation()}>
            {onboardStep === 0 && (
              <><div className="onboard-icon">🖐️</div><p>Drag across the letters to spell the word</p></>
            )}
            {onboardStep === 1 && (
              <><div className="onboard-icon">⏱️</div><p>Guess before the timer runs out</p></>
            )}
            {onboardStep === 2 && (
              <><div className="onboard-icon">🏆</div><p>Earn points and climb the TOP 5</p></>
            )}
            <div className="onboard-dots">
              {[0, 1, 2].map(i => (
                <span key={i} className={`onboard-dot${i === onboardStep ? ' active' : ''}`} onClick={() => setOnboardStep(i)} />
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => (onboardStep < 2 ? setOnboardStep(s => s + 1) : dismissOnboard())}>
              {onboardStep < 2 ? 'Next' : 'Got it!'}
            </button>
          </div>
        </div>
      )}

        </div>

        {/* ── TOP 5 (half-size right side) ── */}
        <div className="leader-col">
        <div className="top10-board">
          <div className="top10-title">TOP 5{showRoundScores ? ' · THIS ROUND' : ''}</div>
          {Array.from({ length: 5 }, (_, i) => {
            const p = (showRoundScores ? roundSolvers : leaderTop)[i];
            return (
              <div key={i} className={`top10-row${p ? (p.id === socket.id ? ' top10-me' : '') : ' top10-empty'}${p && flashSet.has(p.id) ? ' just-updated' : ''}${p && p.id === crownId ? ' just-crowned' : ''}`}>
                <span className={`top10-rank${i === 0 ? ' rank-1' : i === 1 ? ' rank-2' : i === 2 ? ' rank-3' : ''}`}>{i + 1}</span>
                {p ? (
                  <>
                    <span className={`top10-name${showRoundScores ? ' solver' : ''}`}>
                      {showRoundScores ? '✓ ' : ''}
                      {p.isChat && <span className="tt-badge" title="TikTok player"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></span>}
                      {p.name.split(' ')[0].slice(0, 7)}{p.name.split(' ')[0].length > 7 ? '…' : ''}
                    </span>
                    {p.streak >= 2 && <span className="stat-chip chip-fire">🔥{p.streak}</span>}
                    {p.bestTime > 0 && <span className="stat-chip chip-fast">⚡{p.bestTime}s</span>}
                    <span className="top10-pts">{showRoundScores ? p.roundScore : p.score}</span>
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

        {/* ── Answer brackets + artist drawing in one bordered box: the
               artist keeps this spot on web/mobile; on the 540×960 canvas
               it becomes the right 50% column of the grid/artist row (CSS
               reorders it beside the play column). ── */}
        <div className="answer-art-box">
          {artistSection}

          <div className="answer-art-side">
          {/* Canvas: the square timer sits on the left of the ANSWER brackets */}
          {!isWeb && (state === 'playing' || state === 'round_over') && (
            <div className="bracket-timer">
              <div className="timer-ring" style={{ '--pct': Math.max(0, Math.min(100, (timeLeft / 60) * 100)) }}>
                <div className={`timer-display ${timeLeft <= 10 ? 'timer-warn' : ''}`}>{timerLabel}</div>
              </div>
            </div>
          )}
          {(wordLen > 0 || (room.revealedLetters && room.revealedLetters.length > 0)) && (state === 'playing' || state === 'round_over') && (
            <div className="brackets-section">
              <div className="brackets-label">ANSWER</div>
              <div className="bracket-row">
                {Array.from({ length: wordLen }, (_, i) => {
                  // Show hint-revealed letters when unsolved, full word when solved.
                  // All brackets on ONE line; spaces ("ice cream") render as a gap.
                  const hintLetters = room.revealedLetters || [];
                  const hintChar = (hintLetters[i] !== undefined && hintLetters[i] !== '') ? hintLetters[i] : '';
                  const solvedChar = solvedWord ? solvedWord[i] || '' : '';
                  const l = solvedChar || hintChar;
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
              <div className="word-progress" aria-hidden="true">
                {Array.from({ length: wordLen }, (_, i) => (
                  <span key={i} className={`wdot${i < (room.revealedLetters || []).filter(c => c).length ? ' on' : ''}`} />
                ))}
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

        {/* ── Live notifications ticker (below the answer + artist box) ── */}
        {/* One sentence at a time: the latest notification slides in, replaces
            the previous one, and stays until the next arrives. */}
        {(() => {
          const last = notifications.length ? notifications[notifications.length - 1] : null;
          return (state === 'playing' || state === 'round_over') && last ? (
            <div className="notify-row">
              <div className="notify-track">
                <span className="notify-live"><span className="live-dot" />LIVE</span>
                <span key={last.id} className="notify-item">
                  {last.icon && <span className="notify-icon">{last.icon}</span>}
                  <span className="notify-text">{last.text}</span>
                </span>
              </div>
            </div>
          ) : null;
        })()}

        {/* ── FULL overall leaderboard — every player by total score, scrollable (50+ players) ── */}
        {(state === 'playing' || state === 'round_over') && room.players.length > 0 && (
          <div className="overall-board">
            <div className="overall-title">ALL PLAYERS</div>
            <div className="overall-scroll">
              {overallPlayers.map((p, i) => (
                <div key={p.id} className={`overall-row${p.id === socket.id ? ' overall-me' : ''}${flashSet.has(p.id) ? ' just-updated' : ''}`}>
                  <span className={`overall-rank${i === 0 ? ' rank-1' : i === 1 ? ' rank-2' : i === 2 ? ' rank-3' : ''}`}>{i + 1}</span>
                  <span className="overall-name">
                    {p.id === room.champId && <span className="champ-crown">👑</span>}
                    {p.name.split(' ')[0]}
                  </span>
                  {p.streak >= 2 && <span className="stat-chip chip-fire">🔥{p.streak}</span>}
                  {p.bestTime > 0 && <span className="stat-chip chip-fast">⚡{p.bestTime}s</span>}
                  <span className="overall-pts">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
                    {String(room.art).startsWith('http') ? <img className="art-flag" src={room.art} alt="" /> : <span className="art-emoji">{room.art}</span>}
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
