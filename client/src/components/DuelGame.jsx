import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '../sounds';

// How far (in % of BOARD width) the wall can travel from the center.
// pos range = [-steps, +steps]; each correct answer = one section of the
// 4-section track. At the end the wall lands ON the goal circle — that is
// the win. NOTE: we position the wall via `left: calc(50% + X% - 22px)`
// (board-relative), NOT transform translateX — translateX(%) is relative
// to the wall's own 44px width and would only nudge it a few pixels.
const MAX_X = 40;

function charAvatar(p, fallback) {
  return p && p.avatar ? <img className="duel-avatar" src={p.avatar} alt="" /> : <span className="duel-avatar emoji">{fallback}</span>;
}

// The fixed cartoon pushers (boy = blue/left, girl = pink/right) — these are
// the actual characters that push the wall, exactly like the reference art.
const BOY_ART = '/duel/boy.png';
const GIRL_ART = '/duel/girl.png';

/**
 * DuelBoard — the boy (blue/left) vs girl (pink/right) wall scene that
 * replaces the TOP 4 leaderboard in the game page. The boy and girl are the
 * cartoon pushers (duel/boy.png + duel/girl.png) standing on each side; the
 * beige wall starts in the middle. A CORRECT answer = the pusher lunges into
 * the wall and slides it 1 step toward the opponent (the opponent steps
 * back), a WRONG answer slides it back toward the wrong player. The match
 * only ends when the wall is pushed all the way into a goal zone (4 pushes).
 */
export function DuelBoard({ data }) {
  const { phase, left, right, turn, pos, name } = data;
  const steps = data.steps || 2;
  const p = pos || 0;
  let wallX = Math.max(-MAX_X, Math.min(MAX_X, (p / steps) * MAX_X));
  // On a win the wall slams into the winner's goal zone for the explosion.
  if (phase === 'match_win' && left && name === left.name) wallX = MAX_X;
  if (phase === 'match_win' && right && name === right.name) wallX = -MAX_X;

  const leftPushed = phase === 'push' && left && name === left.name;
  const rightPushed = phase === 'push' && right && name === right.name;
  const leftWrong = phase === 'wrong' && left && name === left.name;
  const rightWrong = phase === 'wrong' && right && name === right.name;
  const winner = (phase === 'match_win' || phase === 'champion') ? name : '';
  const leftWon = left && winner === left.name;
  const rightWon = right && winner === right.name;

  const leftCls = [
    turn === 'left' && phase === 'turn' ? 'active' : '',
    leftPushed ? 'pushed' : '',
    rightPushed ? 'pushed-back' : '',
    leftWrong ? 'wrong' : '',
    rightWrong ? 'taunt' : '',
    leftWon ? 'win-jump' : '',
    rightWon ? 'fall' : '',
  ].filter(Boolean).join(' ');
  const rightCls = [
    turn === 'right' && phase === 'turn' ? 'active' : '',
    rightPushed ? 'pushed' : '',
    leftPushed ? 'pushed-back' : '',
    rightWrong ? 'wrong' : '',
    leftWrong ? 'taunt' : '',
    rightWon ? 'win-jump' : '',
    leftWon ? 'fall' : '',
  ].filter(Boolean).join(' ');

  const showImpact = phase === 'push' || phase === 'match_win';
  const ticks = [];
  for (let i = 1; i < steps; i += 1) {
    ticks.push(<span key={'l' + i} className="duel-tick" style={{ left: `${50 - (i * MAX_X) / steps}%` }} />);
    ticks.push(<span key={'r' + i} className="duel-tick" style={{ left: `${50 + (i * MAX_X) / steps}%` }} />);
  }

  // The cartoon pushers FLANK the wall and move with it, so their hands stay
  // on the wall the whole match. Sprites are 768x1152 (aspect 0.667) ->
  // ~115px wide at 172px height. Measured hand edges: the boy's hand is at
  // sprite-x 709/768 (his container right edge sits 4px past the wall face),
  // the girl's hand is at sprite-x 129/768, so her container must sit
  // ~20px LEFT of the wall's right face for her hand to press the wall the
  // same way the boy's does.
  const boyLeft = `max(2px, calc(50% + ${wallX}% - 22px - 115px + 4px))`;
  const girlLeft = `min(calc(50% + ${wallX}% + 2px), calc(100% - 103px))`;

  return (
    <div className={`duel-board-scene${phase === 'push' ? ' pushing' : ''}${phase === 'wrong' ? ' wronging' : ''}${phase === 'match_win' ? ' won' : ''}`}>
      {ticks}
      <div className={`duel-char left ${leftCls}`} style={{ left: boyLeft }}>
        <span className="duel-turn-tag">⚡ YOUR TURN</span>
        <img className="duel-cartoon" src={BOY_ART} alt="" />
      </div>
      <div className="duel-wall" style={{ left: `calc(50% + ${wallX}% - 22px)` }}>
        {Array.from({ length: 6 }).map((_, i) => <span key={i} className="duel-brick" />)}
        {showImpact && <span className="duel-impact">💥</span>}
      </div>
      <div className={`duel-char right ${rightCls}`} style={{ left: girlLeft }}>
        <span className="duel-turn-tag">⚡ YOUR TURN</span>
        <img className="duel-cartoon" src={GIRL_ART} alt="" />
      </div>
      {/* Fixed name chips — one aligned row below the board, they never move
          with the wall or the cartoons (tiny wave only). The player whose
          turn it is gets a fast blink/flash on their chip for the whole
          30s turn. */}
      <div className={`duel-cname left${turn === 'left' && phase === 'turn' ? ' turn' : ''}`}>{left ? left.name : '?'}</div>
      <div className={`duel-cname right${turn === 'right' && phase === 'turn' ? ' turn' : ''}`}>{right ? right.name : '?'}</div>
      {phase === 'wrong' && (
        <div className="duel-board-banner">
          {data.timeout ? `⏳ ${name} ran out of time — the wall stays!` : `❌ ${name} missed — the wall stays!`}
        </div>
      )}
      {phase === 'match_win' && (
        <div className="duel-board-banner big">🏆 {name} PUSHED THE WALL TO THE END!</div>
      )}
      {phase === 'champion' && (
        <div className="duel-board-banner big gold">👑 {name} WALL DUEL CHAMPION</div>
      )}
    </div>
  );
}

/**
 * DuelAnswerSide — the word question rendered in the SAME format as a normal
 * round's answer row: square countdown timer on the LEFT, ANSWER brackets
 * beside it (original bracket-timer + brackets-section classes so the canvas
 * CSS styles them identically). Only the current player's answer counts; the
 * word is typed in the page's bottom input (same submit_word path).
 */
export function DuelAnswerSide({ data }) {
  const { phase, wordLen, duration, receivedAt } = data;
  const revealed = data.revealed || [];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (phase !== 'turn' || !duration || !receivedAt) return;
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [phase, duration, receivedAt]);

  useEffect(() => {
    if (phase === 'push') playSound('found');
    if (phase === 'wrong') playSound('penalty');
    if (phase === 'match_win' || phase === 'champion') playSound('fanfare');
  }, [phase]);

  const remain = phase === 'turn' && duration && receivedAt
    ? Math.max(0, Math.ceil((duration - (now - receivedAt)) / 1000))
    : 0;
  const pct = phase === 'turn' && duration && receivedAt
    ? Math.max(0, Math.min(100, ((duration - (now - receivedAt)) / duration) * 100))
    : 0;

  return (
    <>
      {/* Square timer — exactly like the normal round's answer row */}
      <div className="bracket-timer">
        <div className="timer-ring" style={{ '--pct': pct }}>
          <div className={`timer-display ${remain <= 10 ? 'timer-warn' : ''}`}>
            {remain > 0 ? `${remain}` : '⏳'}
          </div>
        </div>
      </div>
      {/* ANSWER brackets — same bracket boxes as a normal round. On a
          correct answer the whole word pops in letter by letter (solved). */}
      <div className="brackets-section duel-brackets">
        <div className="brackets-label">ANSWER</div>
        <div className="bracket-row">
          {Array.from({ length: wordLen || 0 }).map((_, i) => {
            const rev = revealed.find(r => r.index === i);
            const solved = phase === 'push' || phase === 'match_win' || phase === 'champion';
            return (
              <div key={i} className={`bracket-box${rev ? ' hint-revealed' : ''}${solved ? ' solved' : ''}`}>
                {rev ? (
                  <span className={`bracket-letter${solved ? ' falling-letter' : ''}`} style={{ '--d': `${i * 0.09}s` }}>
                    {rev.letter}
                  </span>
                ) : ''}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/**
 * DuelExtra — the wall-duel info strip rendered below the answer row
 * (full width, same visual family as the notify row): match/final tag with
 * the @player announcement, steps-to-the-end counter, and the push / wrong /
 * win / champion messages.
 */
export function DuelExtra({ data }) {
  const { phase, name, stage, pos } = data;
  const steps = data.steps || 2;

  if (phase === 'champion') {
    return (
      <div className="duel-extra champion">
        <div className="duel-crown">🏆</div>
        <div className="duel-champ-name">{name}</div>
        <div className="duel-champ-sub">WALL DUEL CHAMPION</div>
      </div>
    );
  }

  return (
    <div className="duel-extra">
      <div className="duel-q-tag">
        {stage === 'final' ? '🏆 FINAL' : '🧱 MATCH'}
      </div>
      {(phase === 'turn' || phase === 'push' || phase === 'wrong') && (
        <div className="duel-steps">🧱 {Math.max((data.counts && data.counts.left) || 0, (data.counts && data.counts.right) || 0)}/{steps} correct — first to the end wins</div>
      )}
      {phase === 'push' && <div className="duel-msg good">💪 {name} pushed the wall!</div>}
      {phase === 'wrong' && <div className="duel-msg bad">{data.timeout ? `⏳ ${name} ran out of time` : `❌ ${name} missed`} — it was {(data.word || '').toUpperCase()}! The wall stays.</div>}
      {phase === 'match_win' && <div className="duel-msg win">🏆 {name} pushed the wall to the end and wins the match!</div>}
    </div>
  );
}

/**
 * TurnPopup — "It's <player>'s turn — TYPE THE WORD!" announcement.
 * Redesigned as a premium neon card anchored EXACTLY where the Speed
 * Champion winner popup appears (.speed-popup-pos = translateY(-200px),
 * below the header). Blue neon = left player (boy), pink neon = right
 * player (girl). Plays for 3 seconds at the start of EVERY wall-push turn,
 * then fades away to reveal the wall board with the question already on it
 * (the timer keeps running through the popup).
 */
export function TurnPopup({ name, side, avatar }) {
  const popup = (
    <div className={`turn-popup${side === 'right' ? ' pink' : ''}`}>
      {/* Same anchor as the Speed Challenge / Speed Champion popups */}
      <div className="turn-popup-pos">
        <div className="turn-popup-card">
          <span className="turn-popup-aura" aria-hidden="true" />
          <span className="turn-popup-shine" aria-hidden="true" />
          {avatar ? (
            <img className="turn-popup-avatar" src={avatar} alt="" />
          ) : (
            <span className="turn-popup-avatar emoji">🎤</span>
          )}
          <div className="turn-popup-text">
            <div className="turn-popup-line">Now it's</div>
            <div className="turn-popup-name">{name ? `@${name}` : '…'}</div>
            <div className="turn-popup-sub">TYPE THE WORD &amp; PUSH THE WALL!</div>
          </div>
        </div>
      </div>
    </div>
  );
  return createPortal(popup, document.body);
}
