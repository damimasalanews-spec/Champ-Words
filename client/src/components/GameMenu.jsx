import { useEffect, useRef, useState } from 'react';
import { playSound, toggleMute, isMuted } from '../sounds';

// ── Studio game-play menu (top-right corner, ?auto=1 / ?half=1 pages) ─────
// A compact menu button at the top-right of the game header that opens a
// frosted-glass dropdown: room code + copy, live stats, CHAT vs HOST scores,
// achievements, voice, sound, login/logout and leave game. Styled to match
// the site's slate/emerald professional palette.
export default function GameMenu({ room, me, showToast, onLeave, user, onLogout, onOpenAchievements }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(() => isMuted());
  const [voiceOn, setVoiceOn] = useState(false);
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

  // Live voice state — read from the mic control rendered in the header
  const readVoice = () => {
    setVoiceOn(!!document.querySelector('.voice-chat .voice-panel'));
  };

  const toggle = () => {
    playSound('click');
    if (!open) readVoice();
    setOpen(o => !o);
  };

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

  const toggleVoice = () => {
    playSound('click');
    const leave = document.querySelector('.voice-chat .voice-leave');
    const join = document.querySelector('.voice-chat .voice-btn');
    if (leave) leave.click();
    else if (join) join.click();
    setTimeout(readVoice, 350);
  };

  const openAch = () => { playSound('click'); setOpen(false); onOpenAchievements && onOpenAchievements(); };
  const leave = () => { playSound('click'); setOpen(false); onLeave && onLeave(); };
  const logout = () => { setOpen(false); onLogout && onLogout(); };

  const streak = me?.streak || 0;
  const level = me?.level || 1;
  const xp = me?.xp || 0;
  const chatTotal = room ? (room.chatTotal || 0) : 0;
  const hostTotal = room ? (room.hostTotal || 0) : 0;
  const hasRivalry = !!(room && (typeof room.chatTotal === 'number' || typeof room.hostTotal === 'number'));

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
              <span className="game-menu-stat-val">{room ? room.players.length : '—'}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">🔥</span>
              <span className="game-menu-stat-label">Streak</span>
              <span className="game-menu-stat-val">{streak >= 2 ? `×${streak}` : '—'}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">⭐</span>
              <span className="game-menu-stat-label">Level</span>
              <span className="game-menu-stat-val">{room ? level : '—'}</span>
            </div>
            <div className="game-menu-stat">
              <span className="game-menu-stat-ico">✦</span>
              <span className="game-menu-stat-label">XP</span>
              <span className="game-menu-stat-val">{room ? xp : '—'}</span>
            </div>
          </div>

          {hasRivalry && (
            <div className="game-menu-rivalry">
              <span className="gmr-chat">CHAT {chatTotal}</span>
              <span className="gmr-vs">vs</span>
              <span className="gmr-host">HOST {hostTotal}</span>
              {(chatTotal || 0) > (hostTotal || 0) && <span className="gmr-fire">🔥 CHAT IS WINNING</span>}
            </div>
          )}

          <div className="game-menu-sep" />

          <button className="game-menu-item" role="menuitem" onClick={openAch}>
            <span className="game-menu-item-ico">🏆</span>
            <span className="game-menu-item-label">Achievements</span>
          </button>
          <button className="game-menu-item" role="menuitem" onClick={toggleVoice}>
            <span className="game-menu-item-ico">🎙️</span>
            <span className="game-menu-item-label">Voice</span>
            <span className="game-menu-item-val">{voiceOn ? 'On' : 'Off'}</span>
          </button>
          <button className="game-menu-item" role="menuitem" onClick={toggleSound}>
            <span className="game-menu-item-ico">{muted ? '🔇' : '🔊'}</span>
            <span className="game-menu-item-label">Sound</span>
            <span className="game-menu-item-val">{muted ? 'Off' : 'On'}</span>
          </button>

          <div className="game-menu-sep" />

          {user && user.isGuest ? (
            <a className="game-menu-item link" href="/auth/tiktok" onClick={() => setOpen(false)}>
              <span className="game-menu-item-ico">🔑</span>
              <span className="game-menu-item-label">Login with TikTok</span>
            </a>
          ) : user ? (
            <>
              <div className="game-menu-item static">
                <span className="game-menu-item-ico">👤</span>
                <span className="game-menu-item-label">{user.name || 'Player'}</span>
                <span className="game-menu-item-val">In</span>
              </div>
              <button className="game-menu-item" role="menuitem" onClick={logout}>
                <span className="game-menu-item-ico">↪</span>
                <span className="game-menu-item-label">Logout</span>
              </button>
            </>
          ) : null}

          {room && (
            <>
              <div className="game-menu-sep" />
              <button className="game-menu-item danger" role="menuitem" onClick={leave}>
                <span className="game-menu-item-ico">🚪</span>
                <span className="game-menu-item-label">Leave Game</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
