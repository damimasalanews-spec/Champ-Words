import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PlayerList from './PlayerList';
import { playSound } from '../sounds';
import useCountUp from '../useCountUp';
import ChampionPopup from './ChampionPopup';
import SpeedChampionPopup from './SpeedChampionPopup';
import { DuelBoard, DuelAnswerSide, DuelExtra } from './DuelGame';

// ═══ Design Tokens (Redesign System) ═══════════════════════════════════════
const DT = {
  bgDeep: '#07070a',
  bgSurface: '#0f0f18',
  bgElevated: '#161622',
  bgGlass: 'rgba(255,255,255,0.03)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.10)',
  cyan: '#00f0ff',
  cyanDim: 'rgba(0,240,255,0.15)',
  purple: '#a855f7',
  purpleDim: 'rgba(168,85,247,0.15)',
  pink: '#ec4899',
  pinkDim: 'rgba(236,72,153,0.15)',
  gold: '#fbbf24',
  goldDim: 'rgba(251,191,36,0.15)',
  green: '#22c55e',
  red: '#ef4444',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDim: '#475569',
  fontHeading: "'Space Grotesk', sans-serif",
  fontBody: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

// ═══ Helpers ══════════════════════════════════════════════════════════════
function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

function buzz(pattern) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
}

function GoCountdown() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const iv = setInterval(() => setN(p => (p > 0 ? p - 1 : 0)), 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{
      position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      zIndex:200, background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')',
      color:'#fff', fontFamily:DT.fontHeading, fontSize:'clamp(3rem,8vw,5rem)',
      fontWeight:800, padding:'1.5rem 3rem', borderRadius:'24px',
      boxShadow:'0 20px 60px rgba(0,240,255,0.25)', letterSpacing:'0.05em'
    }} aria-hidden="true">{n > 0 ? n : 'GO!'}</div>
  );
}

function WordPickPopup({ choices, onPick, disabled, timeLeft, guesserName }) {
  const [hint, setHint] = useState('');
  const [custom, setCustom] = useState('');
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:150, background:'rgba(7,7,10,0.85)',
      backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem'
    }}>
      <div style={{
        width:'100%', maxWidth:'520px', background:'linear-gradient(145deg,'+DT.bgSurface+','+DT.bgElevated+')',
        border:'1px solid '+DT.borderSubtle, borderRadius:'24px', padding:'2.5rem',
        boxShadow:'0 40px 80px rgba(0,0,0,0.6)', position:'relative', overflow:'hidden'
      }}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',
          background:'linear-gradient(90deg,transparent,'+DT.cyan+',transparent)'}} />
        <h2 style={{fontFamily:DT.fontHeading, fontSize:'1.5rem', fontWeight:700, marginBottom:'0.5rem', color:DT.textPrimary}}>
          Choose your word
        </h2>
        <p style={{color:DT.textSecondary, fontSize:'0.9rem', marginBottom:'1.5rem'}}>
          {guesserName || 'The guesser'} must find it on the grid — <span style={{color:DT.cyan, fontFamily:DT.fontMono, fontWeight:600}}>{timeLeft}s</span> left
        </p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem', marginBottom:'1.5rem'}}>
          {choices.map((w, i) => (
            <button key={i} disabled={disabled} onClick={() => onPick(w, hint)}
              style={{
                padding:'1rem', borderRadius:'14px', border:'1px solid '+DT.borderSubtle,
                background:DT.bgGlass, color:DT.textPrimary, cursor:'pointer',
                fontFamily:DT.fontHeading, fontWeight:600, fontSize:'0.95rem',
                transition:'all 0.3s ease', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.25rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,240,255,0.3)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(0,240,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=DT.borderSubtle; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              <span>{w.toUpperCase()}</span>
              <span style={{fontSize:'0.75rem', color:DT.textMuted, fontFamily:DT.fontBody}}>{w.length} letters</span>
            </button>
          ))}
        </div>
        <div style={{marginBottom:'1.25rem'}}>
          <label style={{display:'block', fontSize:'0.8rem', fontWeight:600, color:DT.textSecondary, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.1em'}}>
            20s clue (optional)
          </label>
          <input value={hint} onChange={e => setHint(e.target.value)} placeholder="leave empty for an automatic hint" maxLength={60}
            style={{
              width:'100%', padding:'0.875rem 1rem', background:DT.bgDeep, border:'1px solid '+DT.borderGlass,
              borderRadius:'12px', color:DT.textPrimary, fontFamily:DT.fontBody, fontSize:'0.9rem', outline:'none',
              transition:'all 0.3s ease'
            }}
            onFocus={e => e.currentTarget.style.borderColor=DT.cyan}
            onBlur={e => e.currentTarget.style.borderColor=DT.borderGlass}
          />
          <p style={{fontSize:'0.75rem', color:DT.textMuted, marginTop:'0.5rem'}}>Your clue is offered at 40s left · 2 letters revealed at 40s too</p>
        </div>
        <div>
          <label style={{display:'block', fontSize:'0.8rem', fontWeight:600, color:DT.textSecondary, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'0.1em'}}>
            Or type your own word (3–8 letters)
          </label>
          <div style={{display:'flex', gap:'0.75rem'}}>
            <input value={custom} maxLength={8}
              onChange={e => setCustom(e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 8))}
              placeholder="e.g. champ"
              style={{
                flex:1, padding:'0.875rem 1rem', background:DT.bgDeep, border:'1px solid '+DT.borderGlass,
                borderRadius:'12px', color:DT.textPrimary, fontFamily:DT.fontBody, fontSize:'0.9rem', outline:'none',
                transition:'all 0.3s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor=DT.cyan}
              onBlur={e => e.currentTarget.style.borderColor=DT.borderGlass}
            />
            <button disabled={disabled || custom.length < 3} onClick={() => { if (custom.length >= 3) onPick(custom, hint); }}
              style={{
                padding:'0.875rem 1.5rem', borderRadius:'12px', border:'none',
                background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')', color:'#fff',
                fontFamily:DT.fontHeading, fontWeight:700, cursor:'pointer', opacity:(disabled||custom.length<3)?0.5:1,
                transition:'all 0.3s ease', whiteSpace:'nowrap'
              }}>Go</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{position:'fixed', inset:0, zIndex:300, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center'}}>
      {Array.from({ length: pieces }, (_, i) => {
        const c = palette[i % 6];
        const size = variant === 'chat' ? (3 + Math.random() * 3) : (6 + Math.random() * 6);
        return (
          <div key={i} style={{
            position:'absolute', left:Math.random()*100+'%', top:'-10px',
            width:size+'px', height:size+'px', borderRadius:'2px', background:c,
            animation:`confettiFall ${1.5+Math.random()}s linear forwards`,
            animationDelay:(Math.random()*0.6)+'s', opacity:0.9
          }} />
        );
      })}
      <div style={{
        textAlign:'center', zIndex:2, background:'linear-gradient(145deg,'+DT.bgSurface+','+DT.bgElevated+')',
        border:'1px solid '+DT.borderSubtle, borderRadius:'24px', padding:'2.5rem 3rem',
        boxShadow:'0 40px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{fontSize:'3rem', marginBottom:'0.75rem'}}>{variant === 'milestone' ? '🏆' : variant === 'chat' ? '✦' : '✨'}</div>
        {variant === 'chat' && (
          <div style={{
            width:'56px', height:'56px', borderRadius:'16px',
            background:'linear-gradient(135deg,'+DT.purple+','+DT.pink+')',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:DT.fontHeading, fontWeight:700, fontSize:'1.5rem', color:'#fff',
            margin:'0 auto 1rem', boxShadow:'0 8px 20px rgba(168,85,247,0.3)'
          }}>{(word || '?').charAt(0).toUpperCase()}</div>
        )}
        <div style={{fontFamily:DT.fontHeading, fontSize:'1.75rem', fontWeight:700, color:DT.textPrimary, marginBottom:'0.5rem'}}>{word.toUpperCase()}</div>
        {variant === 'chat' && <div style={{width:'40px',height:'2px',background:'linear-gradient(90deg,'+DT.cyan+','+DT.purple+')',borderRadius:'2px',margin:'0.75rem auto'}} />}
        <div style={{color:DT.textSecondary, fontSize:'1rem'}}>{msg}</div>
      </div>
    </div>
  );
}

function CountPts({ value }) { const d = useCountUp(value); return <span style={{fontFamily:DT.fontMono, fontWeight:700, color:DT.cyan}}>{d}</span>; }

function Top5Celebration({ players }) {
  useEffect(() => { playSound('celebrate'); }, []);
  const rankEmoji = ['🥇', '🥈', '🥉'];
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:20, background:'rgba(7,7,10,0.92)',
      backdropFilter:'blur(16px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      borderRadius:'20px'
    }}>
      <div style={{fontFamily:DT.fontHeading, fontSize:'clamp(1.5rem,4vw,2.5rem)', fontWeight:700,
        background:'linear-gradient(135deg,'+DT.gold+',#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        marginBottom:'2rem', letterSpacing:'0.05em'}}>🎉 TOP 4 🎉</div>
      <div style={{display:'flex', flexDirection:'column', gap:'0.75rem', width:'100%', maxWidth:'320px'}}>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display:'flex', alignItems:'center', gap:'1rem', padding:'0.875rem 1.25rem',
            background:DT.bgGlass, borderRadius:'14px', border:'1px solid '+DT.borderSubtle
          }}>
            <span style={{fontSize:'1.5rem'}}>{rankEmoji[i] || `#${i+1}`}</span>
            <span style={{flex:1, fontWeight:600, color:DT.textPrimary, fontSize:'1rem'}}>{p.name.split(' ')[0]}</span>
            <CountPts value={p.score} />
          </div>
        ))}
      </div>
      <div style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'20px'}}>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} style={{
            position:'absolute', left:`${(i*4.2+2)%100}%`, top:'-10px', width:'6px', height:'6px', borderRadius:'50%',
            background:`hsl(${(i*15)%360},90%,62%)`, animation:`confettiFall ${2+Math.random()}s linear forwards`,
            animationDelay:`${(i%8)*0.12}s`
          }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Game({ room, socket, me, showToast, onChatToggle, chatOpen, onChooseWord, messages = [], notifications = [], duel = null }) {
  const inDuel = !!duel;
  const isChamp = room.champId === socket.id;
  const champPlayer = room.players.find(p => p.id === room.champId);
  const wordLen = room.wordLength;
  const state = room.state;
  const grid = inDuel ? (duel.grid || []) : (room.grid || []);
  const isGuesser = room.guesserId === socket.id;

  const [wordClue, setWordClue] = useState('');
  const [hintAction, setHintAction] = useState(null);
  const [hintActionLeft, setHintActionLeft] = useState(0);
  const [hintSending, setHintSending] = useState(false);
  const [clueSent, setClueSent] = useState(false);
  const [choices, setChoices] = useState([]);
  const [champWord, setChampWord] = useState('');
  const [solvedWord, setSolvedWord] = useState('');
  const [solvedBy, setSolvedBy] = useState(null);
  const [solvedByName, setSolvedByName] = useState('');
  const [foundList, setFoundList] = useState([]);
  const [allFound, setAllFound] = useState(false);
  const [falling, setFalling] = useState(false);
  const [confetti, setConfetti] = useState(null);
  const [scorePop, setScorePop] = useState(null);
  const [foundPopup, setFoundPopup] = useState(null);
  const [winnerAnim, setWinnerAnim] = useState(null);
  const winnerAnimTimer = useRef(null);
  const winTimer = useRef(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const [ticker, setTicker] = useState([]);
  const tickerId = useRef(1);
  const popupQueue = useRef([]);
  const [floats, setFloats] = useState([]);
  const [milestone, setMilestone] = useState(null);
  const chatSolves = useRef(0);
  const lastMsgKey = useRef(null);
  const popupBusy = useRef(false);
  const popupId = useRef(1);
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

  const [dragPath, setDragPath] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const gridRef = useRef(null);
  const lastCellRef = useRef(null);

  const clearConfetti = useCallback(() => setConfetti(null), []);
  const [pickTimeLeft, setPickTimeLeft] = useState(15);

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

  useEffect(() => {
    const onWords = data => { setChoices(data.choices || []); playSound('popup'); };
    socket.on('word_choices', onWords);
    return () => { socket.off('word_choices', onWords); };
  }, [socket]);

  useEffect(() => {
    setWordClue(''); setHintAction(null); setHintActionLeft(0); setHintSending(false); setClueSent(false);
    setChoices([]); setChampWord(''); setSolvedWord(''); setSolvedBy(null); setSolvedByName('');
    setFoundList([]); setAllFound(false);
    setFalling(false); setConfetti(null); setSubmitting(false); setTimeLeft(60);
    popupQueue.current = [];
    setFoundPopup(null);
    if (winnerAnimTimer.current) { clearTimeout(winnerAnimTimer.current); winnerAnimTimer.current = null; }
    setWinnerAnim(null);
    setToasts([]);
    setDragPath([]); setIsDragging(false); setTypedWord(''); lastCellRef.current = null;
  }, [room.round, room.champId]);

  useEffect(() => {
    if (state !== 'playing' || !room.endsAt || room.paused) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000));
      setTimeLeft(prev => {
        if (rem !== prev && rem > 0 && rem <= 5) playSound('tick');
        return rem;
      });
      if (rem <= 0) clearInterval(iv);
    };
    const iv = setInterval(tick, 250); tick();
    return () => clearInterval(iv);
  }, [state, room.endsAt, room.round, room.paused]);

  useEffect(() => {
    const onFound = (data) => {
      if (!data.fromChat) playSound('found');
      if (data.self && data.word) { setSolvedWord(data.word); }
      if (data.winnerId) { setSolvedBy(data.winnerId); setSolvedByName(data.winnerName || ''); }
      if (data.roundWon && data.winnerId) {
        const players = data.room && data.room.players ? data.room.players : [];
        const sorted = players.filter(p => p.score > 0).sort((a, b) => b.score - a.score);
        const winner = players.find(p => p.id === data.winnerId);
        const rIdx = sorted.findIndex(p => p.id === data.winnerId);
        const seenNames = {};
        const flyNames = [];
        (players || []).forEach(p => {
          const first = String(p.name || '').trim().split(' ')[0];
          if (first && !seenNames[first.toLowerCase()]) { seenNames[first.toLowerCase()] = 1; flyNames.push(first); }
        });
        if (flyNames.length === 0) flyNames.push(String(data.winnerName || 'WINNER').split(' ')[0]);
        const showWinnerAnim = () => {
          setWinnerAnim({
            playerId: data.winnerId, playerName: data.winnerName || 'WINNER',
            id: Date.now() + Math.random(), rank: rIdx >= 0 ? rIdx + 1 : null,
            streak: winner ? (winner.streak || 0) : 0, bestTime: winner ? (winner.bestTime || 0) : 0,
            newRecord: !!data.newRecord, elapsed: data.elapsed || 0, gained: data.score || 0,
            word: data.winnerWord || '', nameColor: data.nameColor || null,
            nameEffect: data.nameEffect || null, rain: data.rain || null,
            theme: ((data.round || 1) - 1) % 4, flyNames,
          });
          playSound('fanfare');
          if (winnerAnimTimer.current) clearTimeout(winnerAnimTimer.current);
          winnerAnimTimer.current = setTimeout(() => setWinnerAnim(null), 8000);
        };
        clearTimeout(winTimer.current);
        winTimer.current = setTimeout(showWinnerAnim, 3000);
      }
      if (data.fromChat) {
        chatSolves.current += 1;
        if (chatSolves.current % 10 === 0) { setMilestone(chatSolves.current); setTimeout(() => setMilestone(null), 2600); }
      }
    };
    socket.on('word_found', onFound);
    return () => {
      socket.off('word_found', onFound);
      if (winTimer.current) clearTimeout(winTimer.current);
    };
  }, [socket, pushFoundPopup]);

  useEffect(() => {
    if (!solvedWord) return;
    const letters = solvedWord.split('');
    const gridData = room.grid || [];
    const cells = gridRef.current ? Array.from(gridRef.current.querySelectorAll('.grid-cell')) : [];
    const boxes = Array.from(document.querySelectorAll('.brackets-section .bracket-box'));
    if (!cells.length || !boxes.length || !gridData.length) return;
    const used = {};
    const flyLetter = (i) => {
      const ch = letters[i];
      if (!ch || ch === ' ') return;
      let cellEl = null;
      for (let r = 0; r < gridData.length && !cellEl; r++) {
        for (let c = 0; c < gridData[r].length && !cellEl; c++) {
          if (String(gridData[r][c]).toLowerCase() === ch.toLowerCase() && !used[r + '-' + c]) {
            used[r + '-' + c] = true; cellEl = cells[r * gridData.length + c];
          }
        }
      }
      const boxEl = boxes[i];
      if (!cellEl || !boxEl) return;
      const s = cellEl.getBoundingClientRect();
      const t = boxEl.getBoundingClientRect();
      const el = document.createElement('span');
      el.className = 'fly-letter';
      el.textContent = ch.toUpperCase();
      el.style.left = (s.left + s.width / 2) + 'px';
      el.style.top = (s.top + s.height / 2) + 'px';
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transform = 'translate(' + (t.left + t.width / 2 - (s.left + s.width / 2)) + 'px,' + (t.top + t.height / 2 - (s.top + s.height / 2)) + 'px) scale(0.55)';
          el.style.opacity = '0.6';
        });
      });
      setTimeout(() => el.remove(), 950);
    };
    letters.forEach((_, i) => setTimeout(() => flyLetter(i), i * 70));
  }, [solvedWord, room.grid]);

  useEffect(() => {
    const onMilestone = (data) => {
      if (!data || !data.name || !data.points) return;
      pushFoundPopup({ kind: 'milestone', name: data.name, points: data.points });
    };
    socket.on('milestone', onMilestone);
    return () => socket.off('milestone', onMilestone);
  }, [socket, pushFoundPopup]);

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
    socket.emit('guess_drag', { roomId: room.id, path: np });
  }, [isDragging, dragPath, submitting, room.id, socket]);

  const endDrag = useCallback(() => {
    if (!isDragging || submitting) return;
    setIsDragging(false);
    lastCellRef.current = null;
    if (dragPath.length < 3) { setDragPath([]); return; }
    const word = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('');
    socket.emit('guess_drag_end', { roomId: room.id, path: dragPath });
    setSubmitting(true);
    socket.emit('submit_word', { roomId: room.id, word, path: dragPath }, (res) => {
      setSubmitting(false);
      if (res.ok) { }
      else if (res.error && res.error.includes('Not the word')) {
        playSound('wrong'); buzz(70); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 450);
      }
      else if (res.error) showToast(res.error);
      setDragPath([]);
    });
  }, [isDragging, dragPath, submitting, grid, room.id, socket, showToast]);

  const submitTyped = (e) => {
    e.preventDefault();
    const w = typedWord.trim().toLowerCase();
    if (w.length < 3 || submitting) return;
    setSubmitting(true);
    socket.emit('submit_word', { roomId: room.id, word: w, path: [] }, (res) => {
      setSubmitting(false);
      if (res.ok && res.command) {
        setTypedWord('');
        if (res.command === 'buyhint') showToast(`✅ +1 bonus hint added! (now ${res.hintsLeft} total)`);
        else if (res.command === 'color') showToast(`✅ ${res.name} name color ${res.free ? 'set' : 'bought'}!`);
        else if (res.command === 'rain') showToast(`✅ ${res.name} rain ${res.free ? 'enabled' : 'bought'}!`);
        else if (res.command === 'effect') showToast(`✅ ${res.name} name effect ${res.free ? 'enabled' : 'bought'}!`);
        else if (res.command === 'emote') showToast(`✅ ${res.name} emote tag set!`);
        else if (res.command === 'pin') showToast(`✅ Pinned: "${res.name}"`);
        else if (res.command === 'coins') showToast(res.free ? '👑 Host — unlimited shop access!' : `🪙 You have ${res.coins} coins`);
        else showToast('✅ Done!');
      }
      else if (res.ok) { setTypedWord(''); }
      else if (res.error && res.error.includes('Not the word')) {
        playSound('wrong'); buzz(70); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 450);
      }
      else if (res.error) showToast(res.error);
    });
  };

  useEffect(() => {
    const move = (e) => continueDrag(e);
    const up = () => endDrag();
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [continueDrag, endDrag]);

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

  const leaderTop = room.players.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const overallPlayers = room.players.slice().sort((a, b) => b.score - a.score);

  const [flashSet, setFlashSet] = useState(() => new Set());
  const lastScoresRef = useRef({});
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
        setFlashSet(prev => { const next = new Set(prev); bumped.forEach(id => next.delete(id)); return next; });
      }, 750);
    }
    const leader = players.slice().sort((a, b) => b.score - a.score)[0];
    const lid = leader && leader.score > 0 ? leader.id : null;
    if (lid && prevLeaderRef.current && lid !== prevLeaderRef.current) { setCrownId(lid); setTimeout(() => setCrownId(null), 1500); }
    prevLeaderRef.current = lid;
  }, [room?.players]);

  const [wrongFlash, setWrongFlash] = useState(false);
  const [solvedFlash, setSolvedFlash] = useState(false);

  const [showOnboard, setShowOnboard] = useState(() => { try { return localStorage.getItem('cw_onboarded') !== '1'; } catch (_) { return false; } });
  const [onboardStep, setOnboardStep] = useState(0);
  const dismissOnboard = () => { setShowOnboard(false); try { localStorage.setItem('cw_onboarded', '1'); } catch (_) {} };

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

  const top5Row = useMemo(() => room.players.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 4), [room.players]);
  const top5Ref = useRef(null);
  const [top5Scroll, setTop5Scroll] = useState(false);

  const [roundIntro, setRoundIntro] = useState(null);
  const isWeb = typeof document !== 'undefined' && document.documentElement.classList.contains('cw-web');
  const [fastestSec, setFastestSec] = useState(null);
  useEffect(() => { setFastestSec(null); }, [room && room.round]);
  useEffect(() => { if (room && room.state === 'playing') setRoundIntro(room.round); }, [room && room.round, room && room.state]);
  useEffect(() => { if (roundIntro === null || !isWeb) return; const t = setTimeout(() => setRoundIntro(null), 3100); return () => clearTimeout(t); }, [roundIntro, isWeb]);
  useEffect(() => {
    const el = top5Ref.current; if (!el) return;
    const update = () => setTop5Scroll(el.scrollWidth > el.clientWidth + 2);
    update(); const ro = new ResizeObserver(update); ro.observe(el); return () => ro.disconnect();
  }, [top5Row]);

  useEffect(() => {
    const key = messages.length;
    if (lastMsgKey.current === key) return;
    lastMsgKey.current = key;
    const last = messages[key - 1];
    if (!last || !last.text) return;
    const emojis = (last.text.match(/\p{Extended_Pictographic}/gu) || []).slice(0, 3);
    if (!emojis.length) return;
    const batch = emojis.map((e, i) => ({ id: `${key}-${i}`, e, x: 14 + Math.random() * 72, dur: 2.4 + Math.random() * 1.2, delay: i * 0.22 }));
    setFloats(f => [...f, ...batch]);
    setTimeout(() => setFloats(f => f.filter(x => !batch.some(n => n.id === x.id))), 5200);
  }, [messages]);

  const totalRounds = room.totalRounds || 5;
  const guesserPlayer = room.players.find(p => p.id === room.guesserId) || null;
  const guesserName = guesserPlayer?.name || 'the guesser';
  const champAvatar = '';
  const topPlayer = [...room.players].sort((a, b) => b.score - a.score)[0] || null;
  const showLeader = state === 'playing' && topPlayer && topPlayer.score > 0;

  const toggleFullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (_) {} };
  const openShop = () => { const btn = document.querySelector('.shop-toggle'); if (btn) btn.click(); else showToast('🛍 Shop opens from the top bar'); };

  const rankStyle = (i) => {
    if (i === 0) return { background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'#0a0a0f', boxShadow:'0 4px 12px rgba(251,191,36,0.3)' };
    if (i === 1) return { background:'linear-gradient(135deg,#e2e8f0,#94a3b8)', color:'#0a0a0f' };
    if (i === 2) return { background:'linear-gradient(135deg,#fdba74,#ea580c)', color:'#0a0a0f' };
    return { background:DT.bgGlass, color:DT.textMuted, border:'1px solid '+DT.borderSubtle };
  };

  // ── Sub-components for cleaner JSX ──
  const GlassCard = ({ children, style = {}, glow = false }) => (
    <div style={{
      background:'linear-gradient(145deg,'+DT.bgSurface+','+DT.bgElevated+')',
      border:'1px solid '+DT.borderSubtle, borderRadius:'20px',
      boxShadow:'0 25px 50px rgba(0,0,0,0.3)', position:'relative', overflow:'hidden',
      ...style
    }}>
      {glow && <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,'+DT.cyan+',transparent)',opacity:0.5}} />}
      {children}
    </div>
  );

  const GradientText = ({ children, style = {} }) => (
    <span style={{
      background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')',
      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      ...style
    }}>{children}</span>
  );

  const Badge = ({ children, color = DT.cyan, style = {} }) => (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'0.375rem',
      padding:'0.375rem 0.875rem', borderRadius:'8px', fontSize:'0.75rem', fontWeight:600,
      background: color === DT.cyan ? DT.cyanDim : color === DT.purple ? DT.purpleDim : color === DT.gold ? DT.goldDim : DT.bgGlass,
      border: '1px solid ' + (color === DT.cyan ? 'rgba(0,240,255,0.2)' : color === DT.purple ? 'rgba(168,85,247,0.2)' : color === DT.gold ? 'rgba(251,191,36,0.2)' : DT.borderSubtle),
      color: color, ...style
    }}>{children}</span>
  );

  return (
    <div style={{minHeight:'100vh', background:DT.bgDeep, color:DT.textPrimary, fontFamily:DT.fontBody, position:'relative', overflow:'hidden'}}>
      {/* Background mesh */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:`radial-gradient(ellipse 80% 50% at 20% 40%, ${DT.purpleDim} 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, ${DT.cyanDim} 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 50% 50%, ${DT.pinkDim} 0%, transparent 50%)`
      }} />
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.015,
        backgroundImage:'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)',
        backgroundSize:'80px 80px',
        maskImage:'radial-gradient(ellipse 70% 70% at 50% 50%,black 30%,transparent 80%)'
      }} />

      {/* Round intro */}
      {roundIntro !== null && (
        isWeb ? <GoCountdown key={roundIntro} /> : (
          <div key={roundIntro} onAnimationEnd={() => setRoundIntro(null)} style={{
            position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(7,7,10,0.85)', backdropFilter:'blur(20px)'
          }}>
            <GlassCard style={{padding:'3rem 4rem', textAlign:'center'}} glow>
              <div style={{fontSize:'0.875rem', fontWeight:600, color:DT.textMuted, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'1rem'}}>ROUND</div>
              <div style={{fontFamily:DT.fontHeading, fontSize:'clamp(3rem,8vw,5rem)', fontWeight:700}}><GradientText>{roundIntro}</GradientText></div>
              <div style={{fontSize:'1rem', color:DT.textSecondary, fontWeight:500}}>{room.wordLength} LETTERS</div>
            </GlassCard>
          </div>
        )
      )}

      {/* Word pick popup */}
      {isChamp && state === 'champ_pick' && choices.length > 0 && (
        <WordPickPopup choices={choices} onPick={submitPick} disabled={submitting} timeLeft={pickTimeLeft} guesserName={guesserName} />
      )}

      {/* Champ choosing popup */}
      {!isChamp && state === 'champ_pick' && (
        <div style={{position:'fixed', inset:0, zIndex:150, background:'rgba(7,7,10,0.85)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem'}}>
          <GlassCard style={{maxWidth:'420px', width:'100%', textAlign:'center', padding:'3rem 2.5rem'}} glow>
            <div style={{
              width:'72px', height:'72px', borderRadius:'20px', background:'linear-gradient(135deg,'+DT.purple+','+DT.pink+')',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', margin:'0 auto 1.5rem', boxShadow:'0 8px 20px rgba(168,85,247,0.3)'
            }}>{champAvatar ? <img src={champAvatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'20px'}} /> : '👑'}</div>
            <h2 style={{fontFamily:DT.fontHeading, fontSize:'1.25rem', fontWeight:700, marginBottom:'0.5rem'}}>{champPlayer?.name || 'The picker'} is choosing a word for {guesserName}…</h2>
            <p style={{color:DT.textSecondary, fontSize:'0.9rem', marginBottom:'1.5rem'}}>Get ready to guess on the grid!</p>
            <div style={{display:'flex', gap:'0.5rem', justifyContent:'center'}}>
              {[0,1,2].map(i => <span key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:DT.cyan}} />)}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Hint action popup */}
      {hintAction && (
        <div style={{position:'fixed', inset:0, zIndex:150, background:'rgba(7,7,10,0.85)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem'}}>
          <GlassCard style={{maxWidth:'460px', width:'100%', padding:'2.5rem'}} glow>
            <h2 style={{fontFamily:DT.fontHeading, fontSize:'1.25rem', fontWeight:700, marginBottom:'0.5rem'}}>Send a clue to the guesser?</h2>
            <p style={{color:DT.textSecondary, fontSize:'0.9rem', marginBottom:'1.5rem'}}>
              <span style={{color:DT.cyan, fontFamily:DT.fontMono, fontWeight:600}}>{hintActionLeft}s</span> left — miss it and you lose 20 pts
            </p>
            <div style={{display:'flex', flexDirection:'column', gap:'0.625rem', marginBottom:'1.5rem'}}>
              {hintAction.clues.map((c, i) => (
                <button key={i} disabled={hintSending || clueSent} onClick={() => sendClue(c)}
                  style={{padding:'1rem', borderRadius:'12px', border:'1px solid '+DT.borderSubtle, background:DT.bgGlass, color:DT.textPrimary, textAlign:'left', cursor:'pointer', fontSize:'0.95rem', transition:'all 0.3s ease', display:'flex', alignItems:'center', gap:'0.5rem'}}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,240,255,0.3)'; e.currentTarget.style.transform='translateX(4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=DT.borderSubtle; e.currentTarget.style.transform='none'; }}>
                  <span style={{color:DT.cyan}}>💡</span> {c}
                </button>
              ))}
            </div>
            <button onClick={() => setHintAction(null)}
              style={{width:'100%', padding:'0.875rem', borderRadius:'12px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:DT.red, fontWeight:600, cursor:'pointer', transition:'all 0.3s ease'}}
              onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>Skip (−20 pts)</button>
          </GlassCard>
        </div>
      )}

      {/* Confetti */}
      {confetti && <Confetti variant="chat" silent word={confetti.word || (me && me.name) || 'You'} onDone={clearConfetti} msg={confetti.msg || 'You found a Champ Word!'} />}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{position:'fixed', top:'1rem', right:'1rem', zIndex:250, display:'flex', flexDirection:'column', gap:'0.5rem'}}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding:'0.625rem 1.25rem', borderRadius:'12px', background:'linear-gradient(145deg,'+DT.bgSurface+','+DT.bgElevated+')',
              border:'1px solid '+DT.borderSubtle, color:DT.textPrimary, fontSize:'0.875rem', fontWeight:500,
              boxShadow:'0 10px 30px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:'0.5rem'
            }}>{t.icon} {t.name} — {t.text}</div>
          ))}
        </div>
      )}

      {/* Speed banner */}
      {room.speedRound && state === 'playing' && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, zIndex:90, textAlign:'center',
          padding:'0.5rem', background:'linear-gradient(90deg,'+DT.goldDim+',rgba(251,191,36,0.08),'+DT.goldDim+')',
          borderBottom:'1px solid rgba(251,191,36,0.2)', color:DT.gold, fontWeight:700,
          fontSize:'0.875rem', textTransform:'uppercase', letterSpacing:'0.1em'
        }}>⚡ SPEED ROUND — 15s · TRIPLE POINTS</div>
      )}

      {/* Ticker */}
      {ticker.length > 0 && (
        <div style={{position:'fixed', top:room.speedRound?'2rem':'0', left:0, right:0, zIndex:80, background:'rgba(7,7,10,0.8)', backdropFilter:'blur(10px)', borderBottom:'1px solid '+DT.borderSubtle, padding:'0.5rem 1rem', overflow:'hidden'}}>
          <div style={{display:'flex', gap:'2rem', whiteSpace:'nowrap', animation:'tickerScroll 20s linear infinite'}}>
            {ticker.map(t => <span key={t.id} style={{color:DT.textSecondary, fontSize:'0.8rem'}}>⚡ {t.name} found it in {t.sec}s</span>)}
          </div>
        </div>
      )}

      {/* Found popup */}
      {foundPopup && <Confetti key={foundPopup.id} variant={foundPopup.kind === 'milestone' ? 'milestone' : 'chat'} silent word={foundPopup.name} onDone={showNextPopup} msg={foundPopup.kind === 'milestone' ? `crossed ${foundPopup.points} points!` : 'You found a Champ Word!'} />}

      {/* Score pop */}
      {scorePop !== null && (
        <div style={{
          position:'fixed', top:'30%', left:'50%', transform:'translate(-50%,-50%)', zIndex:250,
          fontFamily:DT.fontHeading, fontSize:'2.5rem', fontWeight:800,
          color:DT.gold, textShadow:'0 0 30px rgba(251,191,36,0.5)',
          pointerEvents:'none'
        }}>+{scorePop}{((room.players.find(p => p.id === socket.id)?.streak || 0) >= 2 ? ' 🔥' : '')}</div>
      )}

      {/* ══════════════ MAIN LAYOUT ══════════════ */}
      <div style={{position:'relative', zIndex:1, maxWidth:'1400px', margin:'0 auto', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.5rem'}}>

        {/* Utility bar */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 1.25rem', background:DT.bgGlass, border:'1px solid '+DT.borderSubtle, borderRadius:'14px', backdropFilter:'blur(10px)'}}>
          <span style={{fontFamily:DT.fontHeading, fontWeight:700, fontSize:'0.875rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <span style={{width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',color:'#fff'}}>C</span>
            CHAMP WORDS
          </span>
          <span style={{display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.8rem', color:DT.textMuted}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:socket.connected?DT.green:DT.red,boxShadow:socket.connected?`0 0 10px ${DT.green}`:'none'}} />
            {socket.connected ? 'Server online' : 'Reconnecting…'}
          </span>
          <div style={{display:'flex', gap:'0.75rem'}}>
            <a href="/" style={{color:DT.textSecondary, textDecoration:'none', fontSize:'0.8rem', fontWeight:500, transition:'color 0.3s'}} onMouseEnter={e=>e.currentTarget.style.color=DT.textPrimary} onMouseLeave={e=>e.currentTarget.style.color=DT.textSecondary}>← Back to Site</a>
            <button onClick={toggleFullscreen} style={{background:'none',border:'none',color:DT.textSecondary,fontSize:'0.8rem',cursor:'pointer',fontWeight:500}}>Fullscreen ↗</button>
          </div>
        </div>

        {/* Header */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
            <span style={{width:'40px',height:'40px',borderRadius:'12px',background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:DT.fontHeading,fontWeight:800,fontSize:'1.1rem',color:'#fff',boxShadow:'0 0 20px rgba(0,240,255,0.3)'}}>CW</span>
            <span style={{fontFamily:DT.fontHeading, fontSize:'1.25rem', fontWeight:700}}>CHAMP WORDS</span>
          </div>
          <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
            <button onClick={openShop} style={{
              padding:'0.625rem 1.25rem', borderRadius:'12px', border:'1px solid '+DT.borderGlass,
              background:DT.bgGlass, color:DT.textPrimary, fontSize:'0.875rem', fontWeight:600,
              cursor:'pointer', transition:'all 0.3s ease', display:'flex', alignItems:'center', gap:'0.375rem'
            }} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,240,255,0.3)';e.currentTarget.style.boxShadow='0 0 20px rgba(0,240,255,0.1)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor=DT.borderGlass;e.currentTarget.style.boxShadow='none';}}>📁 Shop</button>
            <button onClick={onChatToggle} style={{
              padding:'0.625rem 1.25rem', borderRadius:'12px', border:'1px solid '+DT.borderSubtle,
              background:DT.bgGlass, color:DT.textSecondary, fontSize:'0.875rem', fontWeight:600,
              cursor:'pointer', transition:'all 0.3s ease'
            }} onMouseEnter={e=>e.currentTarget.style.color=DT.textPrimary} onMouseLeave={e=>e.currentTarget.style.color=DT.textSecondary}>☰ Menu</button>
          </div>
        </div>

        {/* TOP 5 + Timer + Answer row */}
        <div style={{display:'grid', gridTemplateColumns:'minmax(280px,320px) 1fr', gap:'1.5rem', alignItems:'start'}}>
          {/* TOP 5 Box */}
          <GlassCard style={{padding:'1.5rem'}} glow>
            <div style={{fontFamily:DT.fontHeading, fontSize:'0.875rem', fontWeight:700, color:DT.textMuted, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <span style={{color:DT.gold}}>🏆</span> TOP 5
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              {Array.from({ length: 5 }, (_, i) => {
                const p = leaderTop[i];
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.625rem 0.875rem',
                    borderRadius:'12px', transition:'all 0.3s ease',
                    background: p && flashSet.has(p.id) ? 'rgba(0,240,255,0.08)' : 'transparent',
                    border: p && flashSet.has(p.id) ? '1px solid rgba(0,240,255,0.15)' : '1px solid transparent'
                  }}>
                    <span style={{
                      width:'28px',height:'28px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',
                      fontFamily:DT.fontHeading, fontWeight:700, fontSize:'0.75rem', flexShrink:0,
                      ...rankStyle(i)
                    }}>{i+1}</span>
                    {p ? (
                      <>
                        <span style={{flex:1, fontWeight:600, fontSize:'0.9rem', color:DT.textPrimary, display:'flex', alignItems:'center', gap:'0.25rem'}}>
                          {p.isChat && <span title="TikTok player" style={{color:DT.pink}}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></span>}
                          {p.emote && <span>{p.emote}</span>}
                          {p.name.split(' ')[0].slice(0, 9)}{p.name.split(' ')[0].length > 9 ? '…' : ''}
                        </span>
                        <div style={{display:'flex', gap:'0.375rem'}}>
                          {p.streak >= 2 && <Badge color={DT.gold}>🔥{p.streak}</Badge>}
                          {p.bestTime > 0 && <Badge color={DT.cyan}>⚡{p.bestTime}s</Badge>}
                        </div>
                        <span style={{fontFamily:DT.fontMono, fontWeight:700, color:DT.cyan, fontSize:'0.9rem', minWidth:'40px', textAlign:'right'}}>{p.score}</span>
                      </>
                    ) : (
                      <span style={{color:DT.textDim, fontSize:'0.9rem'}}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Winner animation overlay */}
            {winnerAnim && (room.speedRound ? (
              <div style={{position:'absolute', inset:0, zIndex:10, borderRadius:'20px', overflow:'hidden'}}>
                <SpeedChampionPopup name={winnerAnim.playerName} streak={winnerAnim.streak} gained={winnerAnim.gained} elapsed={winnerAnim.elapsed} newRecord={winnerAnim.newRecord} multiplier={3} onDone={() => setWinnerAnim(null)} />
              </div>
            ) : (
              <div style={{position:'absolute', inset:0, zIndex:10, borderRadius:'20px', overflow:'hidden'}}>
                <ChampionPopup name={winnerAnim.playerName} names={winnerAnim.flyNames} streak={winnerAnim.streak} gained={winnerAnim.gained} onDone={() => setWinnerAnim(null)} />
              </div>
            ))}
          </GlassCard>

          {/* Timer + Answer */}
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {inDuel ? <DuelAnswerSide data={duel} /> : (
              <>
                {(state === 'playing' || state === 'round_over') && (
                  <div style={{display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap'}}>
                    {/* Timer */}
                    <div style={{
                      width:'120px', height:'120px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                      position:'relative', background:'conic-gradient('+DT.cyan+' '+Math.max(0,Math.min(100,(timeLeft/60)*100))+'%, '+DT.bgElevated+' 0%)'
                    }}>
                      <div style={{
                        width:'104px', height:'104px', borderRadius:'50%', background:DT.bgSurface,
                        display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'
                      }}>
                        <span style={{fontFamily:DT.fontMono, fontSize:'1.5rem', fontWeight:700, color:timeLeft<=10?DT.red:DT.cyan, textShadow:timeLeft<=10?`0 0 20px ${DT.red}`:`0 0 20px ${DT.cyan}`}}>
                          {room.speedRound ? '⚡ ' : ''}{timerLabel}
                        </span>
                      </div>
                    </div>
                    {/* Answer brackets */}
                    {(wordLen > 0 || (room.revealedLetters && room.revealedLetters.length > 0)) && (
                      <div className="brackets-section" style={{flex:1, minWidth:'200px'}}>
                        <div style={{fontSize:'0.75rem', fontWeight:600, color:DT.textMuted, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.75rem'}}>ANSWER</div>
                        <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
                          {Array.from({ length: wordLen }, (_, i) => {
                            const hintLetters = room.revealedLetters || [];
                            const hintChar = (hintLetters[i] !== undefined && hintLetters[i] !== '') ? hintLetters[i] : '';
                            const solvedChar = solvedWord ? solvedWord[i] || '' : '';
                            const l = solvedChar || hintChar;
                            if (l === ' ') return <div key={i} style={{width:'16px'}} />;
                            let boxBg = DT.bgDeep;
                            let boxBorder = DT.borderSubtle;
                            let textColor = DT.textPrimary;
                            if (solvedWord && solvedByName) { boxBg = wonRound ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.15)'; boxBorder = wonRound ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.3)'; textColor = wonRound ? DT.green : DT.purple; }
                            else if (l) { boxBg = 'rgba(0,240,255,0.08)'; boxBorder = 'rgba(0,240,255,0.2)'; textColor = DT.cyan; }
                            return (
                              <div key={i} className="bracket-box" style={{
                                width:'48px', height:'56px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center',
                                background:boxBg, border:'1px solid '+boxBorder, fontFamily:DT.fontHeading, fontSize:'1.5rem', fontWeight:700,
                                color:textColor, transition:'all 0.3s ease'
                              }}>
                                {l && <span style={{animation:solvedWord?'letterPop 0.4s ease both':'none', animationDelay:`${i*0.09}s`}}>{l.toUpperCase()}</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{display:'flex', gap:'0.375rem', marginTop:'0.75rem'}}>
                          {Array.from({ length: wordLen }, (_, i) => (
                            <span key={i} style={{
                              width:'6px', height:'6px', borderRadius:'50%',
                              background: i < (room.revealedLetters || []).filter(c => c).length ? DT.cyan : DT.bgElevated,
                              boxShadow: i < (room.revealedLetters || []).filter(c => c).length ? `0 0 8px ${DT.cyan}` : 'none',
                              transition:'all 0.3s ease'
                            }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {state === 'playing' && fastestSec !== null && (
                  <div style={{color:DT.textSecondary, fontSize:'0.875rem'}}>⚡ Fastest this round: <b style={{color:DT.cyan}}>{fastestSec}s</b> — beat it!</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Banner */}
        {state === 'playing' && (
          <div style={{
            textAlign:'center', padding:'1rem', borderRadius:'16px',
            background:'linear-gradient(135deg,'+DT.cyanDim+','+DT.purpleDim+')',
            border:'1px solid rgba(0,240,255,0.1)', fontFamily:DT.fontHeading,
            fontSize:'clamp(1rem,3vw,1.5rem)', fontWeight:700, color:DT.textPrimary,
            letterSpacing:'0.05em', textTransform:'uppercase'
          }}>GUESS THE WORD!</div>
        )}

        {/* Central Play Area */}
        <div style={{display:'grid', gridTemplateColumns:'1fr minmax(280px,340px)', gap:'1.5rem', alignItems:'start'}}>
          {/* Left: Grid */}
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <GlassCard style={{padding:'1.5rem'}} glow>
              {/* Pinned message */}
              {room.pinnedMessage && room.pinnedMessage.until > Date.now() && (
                <div style={{
                  display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem',
                  padding:'0.625rem 1rem', borderRadius:'12px', background:'rgba(251,191,36,0.08)',
                  border:'1px solid rgba(251,191,36,0.15)', fontSize:'0.875rem'
                }}>
                  <span style={{fontSize:'15px'}}>📌</span>
                  <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    <b style={{color:DT.gold}}>{room.pinnedMessage.name}</b> · {room.pinnedMessage.text}
                  </span>
                </div>
              )}
              {isChamp && state === 'playing' && champWord && (
                <div style={{marginBottom:'1rem', padding:'0.75rem 1rem', borderRadius:'12px', background:DT.cyanDim, border:'1px solid rgba(0,240,255,0.2)', color:DT.cyan, fontWeight:600, fontSize:'0.9rem'}}>
                  Your word: <b>{champWord.toUpperCase()}</b>
                </div>
              )}
              {/* Grid */}
              {(state === 'playing' || state === 'round_over' || inDuel) && grid.length > 0 && (
                <div style={{position:'relative'}} ref={gridRef}>
                  <div style={{
                    display:'grid', gridTemplateColumns:`repeat(${grid[0]?.length||4}, 1fr)`, gap:'0.75rem',
                    maxWidth:'400px', margin:'0 auto'
                  }} key={`g-${room.round}`}>
                    {grid.map((row, r) => (
                      row.map((ch, c) => {
                        const sel = dragPath.some(([pr, pc]) => pr === r && pc === c);
                        const isLast = dragPath.length > 0 && dragPath[dragPath.length - 1][0] === r && dragPath[dragPath.length - 1][1] === c;
                        const isGhost = isWeb && isDragging && dragPath.length > 0 && !sel && isAdjacent(dragPath[dragPath.length - 1][0], dragPath[dragPath.length - 1][1], r, c);
                        return (
                          <div key={`${r}-${c}`} data-row={r} data-col={c} className="grid-cell"
                            onMouseDown={(e) => startDrag(r, c, e)} onTouchStart={(e) => startDrag(r, c, e)}
                            style={{
                              aspectRatio:'1', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center',
                              fontFamily:DT.fontHeading, fontWeight:700, fontSize:'clamp(1.5rem,3.5vw,2.25rem)',
                              cursor:'pointer', userSelect:'none', WebkitUserSelect:'none',
                              background: sel ? 'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')' : isGhost ? 'rgba(0,240,255,0.08)' : DT.bgDeep,
                              color: sel ? '#fff' : DT.textPrimary,
                              border: isLast ? '2px solid '+DT.cyan : '1px solid '+(sel ? 'transparent' : DT.borderSubtle),
                              boxShadow: sel ? '0 8px 24px rgba(0,240,255,0.25)' : 'none',
                              transform: sel ? 'scale(1.08)' : 'scale(1)',
                              transition:'all 0.15s cubic-bezier(0.4,0,0.2,1)', zIndex: sel ? 2 : 1
                            }}>
                            {ch.toUpperCase()}
                          </div>
                        );
                      })
                    ))}
                  </div>

                  {(allFound || state === 'round_over') && !winnerAnim && top5Row.length > 0 && <Top5Celebration players={top5Row} />}

                  {dragPath.length > 0 && !submitting && (
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'0.75rem', marginTop:'1.25rem'}}>
                      <span style={{fontFamily:DT.fontMono, fontSize:'1.5rem', fontWeight:700, color:DT.cyan, letterSpacing:'0.1em'}}>{dragWord}</span>
                      <button onClick={() => { setDragPath([]); setIsDragging(false); lastCellRef.current = null; }}
                        style={{padding:'0.5rem 1rem', borderRadius:'10px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.1)', color:DT.red, fontSize:'0.8rem', fontWeight:600, cursor:'pointer', transition:'all 0.3s ease'}}>Clear</button>
                    </div>
                  )}

                  {falling && solvedWord && (
                    <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontFamily:DT.fontHeading, fontSize:'2rem', fontWeight:700, color:DT.gold, textShadow:'0 0 30px rgba(251,191,36,0.4)', zIndex:10, pointerEvents:'none'}}>{solvedWord.toUpperCase()}</div>
                  )}

                  <div style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'20px'}}>
                    {floats.map(f => (
                      <span key={f.id} style={{position:'absolute', bottom:'10%', left:`${f.x}%`, fontSize:'1.5rem', animation:`floatUp ${f.dur}s ease-out forwards`, animationDelay:`${f.delay}s`}}>{f.e}</span>
                    ))}
                  </div>
                  {milestone && (
                    <div style={{position:'absolute', top:'1rem', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,'+DT.gold+',#f59e0b)', color:'#0a0a0f', padding:'0.5rem 1.25rem', borderRadius:'100px', fontFamily:DT.fontHeading, fontWeight:700, fontSize:'0.875rem', zIndex:15, boxShadow:'0 8px 20px rgba(251,191,36,0.3)'}}>
                      🎉 {milestone} SOLVES! 🎉
                    </div>
                  )}
                </div>
              )}

              {foundList.length > 0 && state === 'playing' && (
                <div style={{display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'1rem', justifyContent:'center'}}>
                  {foundList.map((f, i) => (
                    <span key={`${f.id}-${i}`} style={{
                      padding:'0.375rem 0.875rem', borderRadius:'100px', fontSize:'0.8rem', fontWeight:600,
                      background: f.self ? 'rgba(34,197,94,0.15)' : DT.bgGlass,
                      border: '1px solid ' + (f.self ? 'rgba(34,197,94,0.3)' : DT.borderSubtle),
                      color: f.self ? DT.green : DT.textSecondary
                    }}>✅ {f.name} +{f.score}</span>
                  ))}
                </div>
              )}

              {wordClue && state === 'playing' && (
                <div style={{marginTop:'1rem', padding:'0.75rem 1rem', borderRadius:'12px', background:'rgba(0,240,255,0.08)', border:'1px solid rgba(0,240,255,0.15)', color:DT.cyan, fontSize:'0.9rem', textAlign:'center', fontWeight:500}}>
                  💡 {wordClue}
                </div>
              )}

              {/* Reactions */}
              <div style={{position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'20px'}}>
                {reactions.map(r => (
                  <span key={r.id} style={{position:'absolute', bottom:'20%', left:`${r.x}%`, fontSize:'1.75rem', transform:`rotate(${r.rot}deg)`, animation:'floatUp 2.5s ease-out forwards'}}>{r.emoji}</span>
                ))}
              </div>

              {/* Onboarding */}
              {state === 'playing' && showOnboard && (
                <div onClick={dismissOnboard} style={{position:'absolute', inset:0, zIndex:30, background:'rgba(7,7,10,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'20px'}}>
                  <div onClick={e => e.stopPropagation()} style={{maxWidth:'360px', width:'100%', padding:'2.5rem', textAlign:'center', background:'linear-gradient(145deg,'+DT.bgSurface+','+DT.bgElevated+')', border:'1px solid '+DT.borderSubtle, borderRadius:'24px', boxShadow:'0 40px 80px rgba(0,0,0,0.5)'}}>
                    <div style={{fontSize:'3rem', marginBottom:'1rem'}}>{onboardStep===0?'🖐️':onboardStep===1?'⏱️':'🏆'}</div>
                    <p style={{color:DT.textSecondary, marginBottom:'1.5rem', lineHeight:1.7}}>
                      {onboardStep===0?'Drag across the letters to spell the word':onboardStep===1?'Guess before the timer runs out':'Earn points and climb the TOP 5'}
                    </p>
                    <div style={{display:'flex', gap:'0.5rem', justifyContent:'center', marginBottom:'1.5rem'}}>
                      {[0,1,2].map(i => <span key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:i===onboardStep?DT.cyan:DT.bgElevated, transition:'all 0.3s ease'}} />)}
                    </div>
                    <button onClick={() => (onboardStep < 2 ? setOnboardStep(s => s + 1) : dismissOnboard())}
                      style={{padding:'0.75rem 2rem', borderRadius:'12px', border:'none', background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')', color:'#fff', fontFamily:DT.fontHeading, fontWeight:700, cursor:'pointer', fontSize:'1rem'}}>
                      {onboardStep < 2 ? 'Next' : 'Got it!'}
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right: Artist / Duel */}
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {inDuel ? (
              <>
                <DuelBoard data={duel} />
                <DuelExtra data={duel} />
              </>
            ) : (
              <>
                {(state === 'playing' || state === 'round_over') && (
                  <GlassCard style={{padding:'1.5rem', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'280px'}} glow>
                    {(room.art) ? (
                      <>
                        <div style={{width:'100%', aspectRatio:'1', maxWidth:'260px', borderRadius:'20px', background:DT.bgDeep, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid '+DT.borderSubtle, overflow:'hidden', marginBottom:'1rem'}}>
                          {String(room.art).startsWith('http') || String(room.art).startsWith('/') ? 
                            <img style={{width:'100%',height:'100%',objectFit:'cover'}} src={room.art} alt="" /> : 
                            <span style={{fontSize:'5rem'}}>{room.art}</span>
                          }
                        </div>
                        <div style={{width:'100%',height:'4px',background:DT.bgDeep,borderRadius:'2px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:'60%',background:'linear-gradient(90deg,'+DT.cyan+','+DT.purple+')',borderRadius:'2px'}} />
                        </div>
                      </>
                    ) : (
                      <div style={{width:'100%', aspectRatio:'1', maxWidth:'260px', borderRadius:'20px', background:DT.bgDeep, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid '+DT.borderSubtle}}>
                        <span style={{fontSize:'5rem', opacity:0.2}}>🎨</span>
                      </div>
                    )}
                  </GlassCard>
                )}
                {state === 'playing' && isChamp && (
                  <div style={{padding:'1rem', borderRadius:'12px', background:DT.bgGlass, border:'1px solid '+DT.borderSubtle, color:DT.textSecondary, fontSize:'0.875rem', textAlign:'center'}}>
                    Waiting for someone to drag the right word…
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        {(() => {
          const last = notifications.length ? notifications[notifications.length - 1] : null;
          return (state === 'playing' || state === 'round_over') && last ? (
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 1rem', borderRadius:'12px', background:DT.bgGlass, border:'1px solid '+DT.borderSubtle, overflow:'hidden'}}>
              <span style={{display:'flex', alignItems:'center', gap:'0.375rem', padding:'0.25rem 0.625rem', borderRadius:'6px', background:'rgba(34,197,94,0.15)', color:DT.green, fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0}}>
                <span style={{width:'6px',height:'6px',borderRadius:'50%',background:DT.green,boxShadow:`0 0 8px ${DT.green}`}} /> LIVE
              </span>
              <span key={last.id} style={{color:DT.textSecondary, fontSize:'0.875rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                {last.icon && <span style={{marginRight:'0.375rem'}}>{last.icon}</span>}
                {last.text}
              </span>
            </div>
          ) : null;
        })()}

        {/* Input row */}
        <div style={{display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap'}}>
          {!inDuel && (
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.625rem 1rem', borderRadius:'12px', background:DT.bgGlass, border:'1px solid '+DT.borderSubtle}}>
              <span style={{fontSize:'0.8rem', color:DT.textMuted}}>RD <b style={{color:DT.textPrimary}}>{room.round}</b> / {totalRounds}</span>
              <div style={{width:'80px',height:'4px',background:DT.bgDeep,borderRadius:'2px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,Math.max(0,(room.round/totalRounds)*100))}%`,background:'linear-gradient(90deg,'+DT.cyan+','+DT.purple+')',borderRadius:'2px',transition:'width 0.5s ease'}} />
              </div>
            </div>
          )}
          {(state === 'playing' || inDuel) && !solvedWord && (
            <form onSubmit={submitTyped} style={{flex:1, display:'flex', gap:'0.75rem', minWidth:'200px'}}>
              <input value={typedWord} onChange={e => setTypedWord(e.target.value)}
                placeholder={inDuel ? 'Type the word & push the wall…' : 'Or type the answer…'} maxLength={10} autoComplete="off"
                style={{
                  flex:1, padding:'0.875rem 1.25rem', background:DT.bgDeep, border:'1px solid '+DT.borderGlass,
                  borderRadius:'14px', color:DT.textPrimary, fontFamily:DT.fontBody, fontSize:'1rem', outline:'none',
                  transition:'all 0.3s ease'
                }}
                onFocus={e => e.currentTarget.style.borderColor=DT.cyan}
                onBlur={e => e.currentTarget.style.borderColor=DT.borderGlass}
              />
              <button type="submit" disabled={submitting}
                style={{
                  padding:'0.875rem 1.75rem', borderRadius:'14px', border:'none',
                  background:'linear-gradient(135deg,'+DT.cyan+','+DT.purple+')', color:'#fff',
                  fontFamily:DT.fontHeading, fontWeight:700, cursor:'pointer', fontSize:'1rem',
                  opacity:submitting?0.6:1, transition:'all 0.3s ease', whiteSpace:'nowrap',
                  boxShadow:'0 4px 20px rgba(0,240,255,0.25)'
                }}>{inDuel ? 'Push ▶' : 'GO'}</button>
            </form>
          )}
          {!inDuel && ((room.players || []).find(p => p.id === socket.id)?.streak || 0) >= 2 && (
            <Badge color={DT.gold}>🔥 ×{((room.players || []).find(p => p.id === socket.id)?.streak) || 0}</Badge>
          )}
          <button onClick={onChatToggle} style={{padding:'0.625rem 1rem', borderRadius:'12px', border:'1px solid '+DT.borderSubtle, background:DT.bgGlass, color:DT.textSecondary, fontSize:'0.8rem', cursor:'pointer', transition:'all 0.3s ease'}}>
            {chatOpen ? 'Close Chat' : 'Chat'}
          </button>
        </div>

        {/* Player list */}
        <PlayerList players={room.players} host={room.host} champId={room.champId} guesserId={room.guesserId} myId={socket.id} />

        {/* Overall leaderboard */}
        {(state === 'playing' || state === 'round_over') && room.players.length > 0 && (
          <GlassCard style={{padding:'1.5rem'}} glow>
            <div style={{fontFamily:DT.fontHeading, fontSize:'0.875rem', fontWeight:700, color:DT.textMuted, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'1rem'}}>ALL PLAYERS</div>
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:'320px', overflowY:'auto'}}>
              {overallPlayers.map((p, i) => (
                <div key={p.id} style={{
                  display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.625rem 0.875rem',
                  borderRadius:'12px', transition:'all 0.3s ease',
                  background: p.id === socket.id ? 'rgba(0,240,255,0.05)' : flashSet.has(p.id) ? 'rgba(0,240,255,0.08)' : 'transparent',
                  border: p.id === socket.id ? '1px solid rgba(0,240,255,0.15)' : flashSet.has(p.id) ? '1px solid rgba(0,240,255,0.1)' : '1px solid transparent'
                }}>
                  <span style={{width:'28px',height:'28px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:DT.fontHeading,fontWeight:700,fontSize:'0.75rem',flexShrink:0,...rankStyle(i)}}>{i+1}</span>
                  <span style={{flex:1, fontWeight:600, fontSize:'0.9rem', color:DT.textPrimary, display:'flex', alignItems:'center', gap:'0.375rem'}}>
                    {p.id === room.champId && <span style={{color:DT.gold}}>👑</span>}
                    {p.name.split(' ')[0]}
                  </span>
                  <div style={{display:'flex', gap:'0.375rem'}}>
                    {p.streak >= 2 && <Badge color={DT.gold}>🔥{p.streak}</Badge>}
                    {p.bestTime > 0 && <Badge color={DT.cyan}>⚡{p.bestTime}s</Badge>}
                  </div>
                  <span style={{fontFamily:DT.fontMono, fontWeight:700, color:DT.cyan, fontSize:'0.9rem', minWidth:'50px', textAlign:'right'}}>{p.score}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Bottom bar */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', borderRadius:'14px', background:DT.bgGlass, border:'1px solid '+DT.borderSubtle, color:DT.textMuted, fontSize:'0.875rem'}}>
          🏆 Room created! Code: <b style={{color:DT.textPrimary, marginLeft:'0.375rem', fontFamily:DT.fontMono}}>{room.id}</b>
        </div>
      </div>

      {/* Global styles for keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
        }
        @keyframes letterPop {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tickerScroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .fly-letter {
          position: fixed; z-index: 200; font-family: ${DT.fontHeading};
          font-weight: 800; font-size: 1.75rem; color: ${DT.gold};
          pointer-events: none; transition: transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.8s ease;
          text-shadow: 0 0 20px rgba(251,191,36,0.4);
        }
      `}</style>
    </div>
  );
}
