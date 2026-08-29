import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '../sounds';

/**
 * WallPushIntro — the "Wall Push is coming now!" announcement popup that
 * appears right after the game ends (same style as the winner popup).
 * Shows for ~3.8s, then the Top-4 wall duel starts on the game page.
 */
export default function WallPushIntro({ onDone }) {
  useEffect(() => {
    playSound('roundover');
    const t = setTimeout(() => { if (onDone) onDone(); }, 3800);
    return () => clearTimeout(t);
  }, []);

  const popup = (
    <div className="wall-intro">
      <div className="wall-intro-bricks" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => <span key={i} className="wall-intro-brick" />)}
      </div>
      <div className="wall-intro-inner">
        <div className="wall-intro-icon">🧱</div>
        <div className="wall-intro-title">Wall Push</div>
        <div className="wall-intro-sub">is coming now…</div>
        <div className="wall-intro-bracket">Top 4 vs Top 3 · Top 2 vs Top 1 · The Final</div>
      </div>
    </div>
  );
  return createPortal(popup, document.body);
}
