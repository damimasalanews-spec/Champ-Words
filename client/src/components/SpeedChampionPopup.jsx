import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * SpeedChampionPopup — full-screen lightning reveal for SPEED ROUND winners.
 * Completely different from the regular champion popup: an electric
 * lightning theme (cyan/violet + gold) with radiating speed lines, crackling
 * bolts and electric sparks — the winner's name STRIKES in behind a
 * white-out flash. (The charging-core phase was removed on request — the
 * lightning reveal appears immediately.)
 *
 * Total 8s — EXACTLY the same timing as the regular ChampionPopup
 * (onDone at 8s) so the round flow never changes.
 */
export default function SpeedChampionPopup({ name = 'WINNER', streak = 0, gained = 0, elapsed = 0, newRecord = false, multiplier = 3, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => { if (onDone) onDone(); }, 8000); // total 8s — matches the champion popup
    return () => clearTimeout(t);
  }, []);

  const bolts = [
    { cls: 'b1', points: '50,0 32,64 48,64 26,140 44,140 22,200 62,132 46,132 68,72 52,72 64,0' },
    { cls: 'b2', points: '52,0 34,58 50,58 28,136 46,136 24,200 64,130 48,130 70,74 54,74 66,0' },
    { cls: 'b3', points: '48,0 30,70 46,70 24,148 42,148 20,200 60,140 44,140 66,80 50,80 62,0' },
    { cls: 'b4', points: '54,0 36,62 52,62 30,142 48,142 26,200 66,134 50,134 72,76 56,76 68,0' },
  ];

  const popup = (
    <div className="speed-popup">
      {/* Crackling lightning bolts at the edges */}
      {bolts.map((b, i) => (
        <svg key={i} className={`speed-bolt ${b.cls}`} viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={b.points} />
        </svg>
      ))}

      {/* Radiating speed lines */}
      <div className="speed-lines" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="speed-line" style={{ '--i': i }} />
        ))}
      </div>

      {/* White-out flash at the strike moment */}
      <div className="speed-flash" aria-hidden="true" />

      {/* Same anchor as the speed-round intro popup (.speed-intro-pos) */}
      <div className="speed-popup-pos">
        <div className="speed-reveal">
          <div className="speed-wordmark"><span className="sw-bolt">⚡</span>Speed Champion<span className="sw-bolt">⚡</span></div>
          <div className="speed-name">{name}</div>
          <div className="speed-stats">
            {gained > 0 && <span className="speed-stat pts">+{gained} pts</span>}
            <span className="speed-stat mult">×{multiplier} speed bonus</span>
            {elapsed > 0 && <span className="speed-stat time">⚡ {elapsed}s</span>}
            {streak > 0 && <span className="speed-stat streak">🔥 ×{streak}</span>}
            {newRecord && <span className="speed-stat record">🏁 New record</span>}
          </div>
        </div>
      </div>

      {/* Electric sparks flying outward */}
      <div className="speed-sparks" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="speed-spark" style={{ '--i': i }} />
        ))}
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
