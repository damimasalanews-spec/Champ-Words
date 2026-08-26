import { useEffect, useRef } from 'react';

/**
 * Round-winner celebration â€” a clean top banner (self-designed).
 * Slides down below the header (50px margin), crown + winner name +
 * points chip, shine sweep, crown sparks and a Web Audio fanfare.
 * Auto-dismisses (App removes it after ~4.2s).
 */
export default function Celebration({ winner }) {
  const sparks = useRef([]);
  if (sparks.current.length === 0) {
    const dirs = [
      [-30, -26], [-12, -40], [8, -44], [26, -32], [42, -14],
      [-44, -14], [-24, -42], [34, -40], [54, -6], [-56, -30],
    ];
    for (let i = 0; i < 10; i++) {
      sparks.current.push({
        dx: dirs[i][0] + 'px',
        dy: dirs[i][1] + 'px',
        delay: 0.3 + (i % 5) * 0.12,
        dur: 1.1 + (i % 3) * 0.25,
        color: i % 2 ? '#ffd76a' : '#ffffff',
        size: 5 + (i % 3) * 2,
      });
    }
  }

  // Web Audio fanfare â€” short ascending flourish, no audio file needed
  useEffect(() => {
    let ctx = null;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      const t0 = ctx.currentTime + 0.05;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + i * 0.13);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + i * 0.13 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.55);
        o.connect(g).connect(ctx.destination);
        o.start(t0 + i * 0.13);
        o.stop(t0 + i * 0.13 + 0.6);
      });
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.value = 1567.98; // G6 sparkle
      g2.gain.setValueAtTime(0.0001, t0 + 0.55);
      g2.gain.exponentialRampToValueAtTime(0.22, t0 + 0.58);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
      o2.connect(g2).connect(ctx.destination);
      o2.start(t0 + 0.55);
      o2.stop(t0 + 1.05);
      setTimeout(() => { try { ctx.close(); } catch (_) {} }, 3000);
    } catch (_) {}
    return () => { try { if (ctx) ctx.close(); } catch (_) {} };
  }, []);

  return (
    <div className="cw-banner">
      <style>{`
        .cw-banner{position:absolute;top:63px;left:63px;right:63px;z-index:1100;pointer-events:none;animation:cwBannerOut .45s ease 3.8s both}
        .cw-banner-card{
          display:flex;align-items:center;gap:14px;position:relative;overflow:hidden;
          background:linear-gradient(160deg,rgba(30,22,70,.97),rgba(13,10,31,.97));
          border:2px solid rgba(255,215,106,.55);border-radius:18px;padding:13px 20px;
          box-shadow:0 18px 44px rgba(0,0,0,.5),0 0 30px rgba(255,215,106,.2);
          animation:cwBannerIn .55s cubic-bezier(.2,1.6,.4,1) both;
        }
        @keyframes cwBannerIn{0%{transform:translateY(-170%);opacity:0}60%{transform:translateY(12px);opacity:1}100%{transform:translateY(0)}}
        @keyframes cwBannerOut{to{transform:translateY(-50px);opacity:0}}
        .cw-banner-crown{font-size:clamp(30px,7vw,46px);line-height:1;animation:cwCrown 1s ease-in-out infinite;filter:drop-shadow(0 0 16px rgba(255,215,106,.65))}
        @keyframes cwCrown{0%,100%{transform:translateY(0) rotate(-7deg)}50%{transform:translateY(-8px) rotate(7deg)}}
        .cw-banner-label{font-family:'Oxanium',sans-serif;font-size:clamp(9px,2vw,11px);letter-spacing:4px;color:#ffd76a;text-transform:uppercase;opacity:.9}
        .cw-banner-name{font-family:'Oxanium',sans-serif;font-weight:800;font-size:clamp(18px,5.2vw,34px);line-height:1.08;color:#ffffff;text-shadow:0 2px 12px rgba(0,0,0,.45);margin-top:1px;word-break:break-word}
        .cw-banner-pts{margin-left:auto;white-space:nowrap;font-family:'Oxanium',sans-serif;font-weight:800;font-size:clamp(13px,3.2vw,19px);color:#241a02;background:linear-gradient(92deg,#ffd76a,#ffb84d);padding:6px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(255,215,106,.4);animation:cwPts 1.2s ease-in-out infinite}
        @keyframes cwPts{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
        .cw-shine{position:absolute;top:-10%;bottom:-10%;width:64px;background:linear-gradient(105deg,transparent,rgba(255,255,255,.32),transparent);transform:skewX(-20deg);animation:cwShine 1.7s ease-in-out .5s infinite}
        @keyframes cwShine{0%{left:-25%}60%,100%{left:125%}}
        .cw-spark{position:absolute;top:10px;left:30px;border-radius:50%;opacity:0;animation:cwSpark ease-out infinite}
        @keyframes cwSpark{0%{transform:translate(0,0) scale(.5);opacity:0}18%{opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(.15);opacity:0}}
        @media (max-width: 640px){
          .cw-banner{left:29px;right:29px;top:63px}
          .cw-banner-card{padding:11px 14px;gap:10px}
        }
      `}</style>

      <div className="cw-banner-card">
        <span className="cw-shine" aria-hidden="true" />
        <span className="cw-banner-crown" aria-hidden="true">ðŸ‘‘</span>
        <div style={{ minWidth: 0 }}>
          <div className="cw-banner-label">Round Winner</div>
          <div className="cw-banner-name">{winner.name}</div>
        </div>
        <div className="cw-banner-pts">
          {winner.score ? '+' + winner.score : ''}{winner.elapsed ? ' Â· ' + winner.elapsed + 's' : ''}
        </div>
        {sparks.current.map((s, i) => (
          <span key={i} className="cw-spark"
            style={{ '--sx': s.dx, '--sy': s.dy, background: s.color, width: s.size, height: s.size,
                     animationDuration: s.dur + 's', animationDelay: s.delay + 's' }} />
        ))}
      </div>
    </div>
  );
}
