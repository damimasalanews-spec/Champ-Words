import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ChampionPopup — full-screen winner reveal, designed from scratch.
 * Phase 1 (4s): a big glowing ring with every player's name moving around it.
 *              The winner is NOT shown yet — just a pulsing ✦ in the middle.
 * Phase 2 (4s): the fastest correct-answer player's name appears BIG in pink
 *              at the center of the circle (+ ✦ CHAMPION ✦ wordmark + stats).
 * Pops in, holds, fades out after 8s.
 */
export default function ChampionPopup({ name = 'WINNER', names = [], streak = 0, gained = 0, onDone }) {
  const [revealed, setRevealed] = useState(false);
  // Background covers the FULL screen (including the header); the circle keeps
  // its position by compensating for the header height.
  const [hdr, setHdr] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 4000);      // reveal the winner after the 4s orbit
    const t2 = setTimeout(() => { if (onDone) onDone(); }, 8000); // total 8s
    const header = document.querySelector('.app-header');
    setHdr(header ? header.offsetHeight : 0);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Keep the circle exactly where it was: 200px above the OLD center
  // (which sat headerHeight/2 below the viewport center).
  const off = Math.max(0, 200 - hdr / 2);

  const others = (names || [])
    .filter(n => String(n).toLowerCase() !== String(name || '').toLowerCase())
    .slice(0, 14);
  const step = others.length > 0 ? 360 / others.length : 0;

  const popup = (
    <div className="champ-popup" style={{ '--off': off + 'px' }}>
      <div className="champ-popup-orbit" aria-hidden="true">
        {others.map((n, i) => (
          <span key={i} className="champ-popup-orbit-slot"
            style={{ transform: 'rotate(' + (i * step).toFixed(1) + 'deg) translateY(calc(var(--cr) * -1))' }}>
            <span className="champ-popup-orbit-center">
              <span className="champ-popup-orbit-name">{n}</span>
            </span>
          </span>
        ))}
      </div>

      <div className="champ-popup-inner">
        {revealed ? (
          <>
            <div className="champ-popup-wordmark">✦ Champion ✦</div>
            <div className="champ-popup-name">{name}</div>
            {(gained > 0 || streak > 0) && (
              <div className="champ-popup-stats">
                {gained > 0 && <span className="champ-popup-stat">+{gained} pts</span>}
                {streak > 0 && <span className="champ-popup-stat">Streak ×{streak}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="champ-popup-wait">✦</div>
        )}
      </div>

      <div className="champ-popup-particles" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="champ-popup-p"
            style={{ left: (i * 7 + 2) + '%', animationDelay: (i * 0.3) + 's' }}
          />
        ))}
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
