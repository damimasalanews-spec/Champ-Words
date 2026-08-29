import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ChampionCelebration — the premium full-screen winner celebration that plays
// for ~8 seconds when the Wall Push duel declares its champion. Layers:
//   1. canvas confetti engine (opening salvo + continuous rain + fireworks)
//   2. rotating golden rays + pulsing purple/gold glows
//   3. expanding shockwave rings
//   4. rising floating particles (gold dots + mini wall bricks)
//   5. elastic-in card: trophy, per-letter staggered winner name, shimmer
// Uses the game's theme palette (theme-royal.css :root tokens).
const COLORS = ['#ffd76a', '#7c6cff', '#9b8fff', '#ff5c7c', '#3ddc97', '#f4f1ff'];
const DURATION = 8000; // total celebration time (fade-out starts at 7.2s via CSS)

export default function ChampionCelebration({ name = '', onDone }) {
  const canvasRef = useRef(null);

  // Auto-dismiss after the celebration plays out
  useEffect(() => {
    const t = setTimeout(() => { if (onDone) onDone(); }, DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  // ── Canvas confetti + fireworks engine ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const parts = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    const addConfetti = (x, y, n, opts = {}) => {
      for (let i = 0; i < n && parts.length < 460; i++) {
        const ang = opts.ang !== undefined ? opts.ang : rnd(0, Math.PI * 2);
        const spd = rnd(opts.minS !== undefined ? opts.minS : 2, opts.maxS !== undefined ? opts.maxS : 8);
        parts.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (opts.up || 0),
          w: rnd(6, 11), h: rnd(4, 7),
          rot: rnd(0, Math.PI * 2), vr: rnd(-0.18, 0.18),
          color: opts.color || COLORS[(Math.random() * COLORS.length) | 0],
          life: 0, maxLife: rnd(120, 200),
          grav: opts.grav !== undefined ? opts.grav : 0.09,
          shape: 'rect',
          phase: rnd(0, Math.PI * 2),
        });
      }
    };

    // Radial firework explosion (glowing spark particles)
    const burst = (x, y, n, color) => {
      for (let i = 0; i < n && parts.length < 460; i++) {
        const ang = (i / n) * Math.PI * 2 + rnd(-0.12, 0.12);
        const spd = rnd(2.5, 7.5);
        parts.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          w: 3.2, h: 3.2,
          rot: ang, vr: 0,
          color: color || COLORS[(Math.random() * COLORS.length) | 0],
          life: 0, maxLife: rnd(70, 110),
          grav: 0.055,
          shape: 'spark',
          phase: 0,
        });
      }
    };

    // Opening salvo: mega confetti burst + two side firework cannons
    addConfetti(W / 2, H * 0.22, 150, { up: 2, minS: 4, maxS: 11 });
    setTimeout(() => burst(W * 0.2, H * 0.3, 34), 300);
    setTimeout(() => burst(W * 0.8, H * 0.26, 34), 600);

    // Periodic fireworks for the whole celebration
    const fw = setInterval(() => {
      burst(rnd(W * 0.12, W * 0.88), rnd(H * 0.12, H * 0.42), 30);
    }, 950);

    // Golden finale right before the fade-out
    setTimeout(() => burst(W / 2, H * 0.32, 70, '#ffd76a'), 6300);
    setTimeout(() => burst(W / 2, H * 0.5, 40, '#9b8fff'), 6750);

    let raf = 0;
    let lastT = 0;
    const start = performance.now();

    const loop = (t) => {
      const dt = Math.min(50, (lastT ? t - lastT : 16));
      lastT = t;
      ctx.clearRect(0, 0, W, H);

      // Gentle top rain while the celebration plays
      if (t - start < DURATION - 800 && parts.length < 300) {
        for (let i = 0; i < 2; i++) {
          addConfetti(rnd(0, W), -12, 1, { up: 0, minS: 1, maxS: 3.4, grav: 0.035, ang: Math.PI / 2 });
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.maxLife || p.y > H + 30) { parts.splice(i, 1); continue; }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.grav;
        p.rot += p.vr;
        if (p.shape === 'rect') p.x += Math.sin(p.life * 0.04 + p.phase) * 0.7;
        const a = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.w * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(fw);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const letters = String(name || '').split('');

  return createPortal(
    <div className="champ-celebrate" role="status" aria-live="polite">
      <div className="champ-rays" aria-hidden="true" />
      <div className="champ-glow champ-glow-a" aria-hidden="true" />
      <div className="champ-glow champ-glow-b" aria-hidden="true" />
      <canvas ref={canvasRef} className="champ-confetti" aria-hidden="true" />
      <span className="champ-ring champ-ring-1" aria-hidden="true" />
      <span className="champ-ring champ-ring-2" aria-hidden="true" />
      <div className="champ-floaties" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={`champ-floaty${i % 6 === 0 ? ' brick' : ''}`}
            style={{
              '--fx': `${(i * 41) % 100}%`,
              '--fd': `${6 + (i % 7) * 1.3}s`,
              '--fs': `${8 + (i % 5) * 5}px`,
              '--fc': COLORS[i % COLORS.length],
              '--fdl': `${(i % 9) * 0.8}s`,
            }}
          />
        ))}
      </div>
      <div className="champ-vignette" aria-hidden="true" />
      {/* Same anchor as the Speed Champion popup (translateY(-200px), below
          the header) — the winner card pops up in that exact spot. */}
      <div className="champ-celebrate-pos">
        <div className="champ-card">
          <span className="champ-shine" aria-hidden="true" />
          <div className="champ-trophy" aria-hidden="true">🏆</div>
          <div className="champ-label">Wall Duel</div>
          <div className="champ-name">
            {letters.length ? letters.map((ch, i) => (
              <span key={i} className="champ-letter" style={{ '--d': `${0.35 + i * 0.05}s` }}>
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            )) : <span className="champ-letter">?</span>}
          </div>
          <div className="champ-sub">Champion</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
