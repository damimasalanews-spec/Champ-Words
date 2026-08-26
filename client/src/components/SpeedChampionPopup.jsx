import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * SpeedChampionPopup — full-screen reveal for SPEED ROUND winners.
 * Completely different from the regular champion popup: an electric
 * lightning theme (cyan/violet + gold) with a charging energy core,
 * radiating speed lines, crackling bolts and electric sparks — then the
 * winner's name STRIKES in behind a white-out flash.
 *
 * Phase 1 (4s): CHARGING — the hex core spins up, bolts flicker, the
 *               winner stays hidden ("Charging the strike…").
 * Phase 2 (4s): STRIKE — a flash, then name + triple-points stats slam in.
 *
 * Total 8s — EXACTLY the same timing as the regular ChampionPopup
 * (reveal at 4s, onDone at 8s) so the round flow never changes.
 */
export default function SpeedChampionPopup({ name = 'WINNER', streak = 0, gained = 0, elapsed = 0, newRecord = false, multiplier = 3, onDone }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 4000);       // strike after the 4s charge
    const t2 = setTimeout(() => { if (onDone) onDone(); }, 8000); // total 8s — matches the champion popup
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const bolts = [
    { cls: 'b1', points: '50,0 32,64 48,64 26,140 44,140 22,200 62,132 46,132 68,72 52,72 64,0' },
    { cls: 'b2', points: '52,0 34,58 50,58 28,136 46,136 24,200 64,130 48,130 70,74 54,74 66,0' },
    { cls: 'b3', points: '48,0 30,70 46,70 24,148 42,148 20,200 60,140 44,140 66,80 50,80 62,0' },
    { cls: 'b4', points: '54,0 36,62 52,62 30,142 48,142 26,200 66,134 50,134 72,76 56,76 68,0' },
  ];

  const popup = (
    <div className={`speed-popup${revealed ? ' revealed' : ''}`}>
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

      {!revealed ? (
        <div className="speed-charge">
          <div className="speed-core">
            <span className="speed-core-ring r3" />
            <span className="speed-core-ring r2" />
            <span className="speed-core-ring r1" />
            <span className="speed-core-hex" />
            <span className="speed-core-bolt">⚡</span>
          </div>
          <div className="speed-charge-label">⚡ Speed Round ⚡</div>
          <div className="speed-charge-sub">Charging the strike…</div>
        </div>
      ) : (
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
      )}

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
