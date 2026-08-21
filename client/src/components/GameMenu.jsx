import { useEffect, useRef, useState } from 'react';
import { playSound, toggleMute, isMuted } from '../sounds';

// ── Studio game-play menu (top-10 studio page only) ──────────────────────
// A compact menu button in the bottom game bar that opens a frosted-glass
// dropdown: room code + copy, live player count, your streak/level/XP,
// sound toggle and leave game. Styled to match the site's slate/emerald
// professional palette.
export default function GameMenu({ room, me, showToast, onLeave }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(() => isMuted());
  const rootRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = () => { playSound('click'); setOpen(o => !o); };

  const copyRoom = () => {
    const code = (room && room.id) || '';
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Room ${code} copied`, 'success');
    }).catch(() => {});
    playSound('click');
  };

  const toggleSound = () => {
    const m = toggleMute();
    setMuted(m);
    if (!m) playSound('click');
  };

  const leave = () => { playSound('click'); setOpen(false); onLeave && onLeave(); };

  const streak = me?.streak || 0;
  const level = me?.level || 1;
  const xp = me?.xp || 0;

  return (
    <div className="game-menu" ref={rootRef}>
      <button className={`game-menu-btn${open ? ' open' : ''}`} onClick={toggle} aria-haspopup="true" aria-expanded={open}>
        <span className="game-menu-icon">☰</span>
        <span className="game-menu-label">Menu</span>
      </button>

      {open && (
        <div className="game-menu-dd" role="menu">
          <div className="game-menu-head">
            <span className="game-menu-title">Game Menu</span>
            <button className="game-menu-room" onClick={copyRoom} title="Copy room code">
              <span className="game-menu-room-code">ROOM {room ? room.id : '—'}</span>
              <span className="game-menu-copy">⧉</span>
            </button>
          </div>

          <div className="game-menu-stats">
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">👥</span>
              <span className="game-menu-stat-label">Players</span>
              <span className="game-menu-stat-val">{room ? room.players.length : 0}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">🔥</span>
              <span className="game-menu-stat-label">Streak</span>
              <span className="game-menu-stat-val">{streak >= 2 ? `×${streak}` : '—'}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">⭐</span>
              <span className="game-menu-stat-label">Level</span>
              <span className="game-menu-stat-val">{level}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">✦</span>
              <span className="game-menu-stat-label">XP</span>
              <span className="game-menu-stat-val">{xp}</span>
            </div>
          </div>

          <div className="game-menu-sep" />

          <button className="game-menu-item" role="menuitem" onClick={toggleSound}>
            <span className="game-menu-item-ico">{muted ? '🔇' : '🔊'}</span>
            <span className="game-menu-item-label">Sound</span>
            <span className="game-menu-item-val">{muted ? 'Off' : 'On'}</span>
          </button>

          <div className="game-menu-sep" />

          <button className="game-menu-item danger" role="menuitem" onClick={leave}>
            <span className="game-menu-item-ico">🚪</span>
            <span className="game-menu-item-label">Leave Game</span>
          </button>
        </div>
      )}
    </div>
  );
}
