import { useEffect, useRef } from 'react';

/**
 * Round-winner celebration — Tikfinity-style alert.
 * Big trophy pop, huge winner name, confetti rain and a Web Audio fanfare.
 * Self-contained: styles + particles + sound are all inline.
 */
export default function Celebration({ winner }) {
  const confetti = useRef([]);
  if (confetti.current.length === 0) {
    const colors = ['#ffd76a', '#7c6cff', '#ff5c7c', '#3ddc97', '#ffffff', '#9b8fff', '#ffb84d'];
    for (let i = 0; i < 60; i++) {
      confetti.current.push({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.2 + Math.random() * 2.2,
        size: 6 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
  }

  // Web Audio fanfare — a short ascending flourish, no audio file needed
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
    <div className="cw-celebrate">
      <style>{`
        .cw-celebrate{position:absolute;inset:0;z-index:1100;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,rgba(13,10,31,.5),rgba(13,10,31,.93) 82%);animation:cwFadeIn .25s ease both}
        .cw-celebrate-rays{position:absolute;inset:-20%;animation:cwSpin 16s linear infinite;pointer-events:none}
        .cw-celebrate-rays span{position:absolute;top:50%;left:50%;width:170%;height:120px;transform-origin:0 0;background:repeating-linear-gradient(90deg,rgba(255,215,106,.18) 0 26px,transparent 26px 54px)}
        .cw-confetti{position:absolute;top:-4%;animation:cwFall linear infinite;opacity:.95;pointer-events:none}
        .cw-confetti-rect{border-radius:2px}
        .cw-confetti-circle{border-radius:50%}
        @keyframes cwFall{0%{transform:translateY(0) rotate(var(--rot));opacity:1}100%{transform:translateY(125vh) rotate(calc(var(--rot) + 540deg));opacity:.65}}
        .cw-celebrate-card{position:relative;text-align:center;max-width:86%;animation:cwPop .5s cubic-bezier(.2,1.7,.4,1) both}
        @keyframes cwPop{from{transform:scale(.25);opacity:0}to{transform:scale(1);opacity:1}}
        .cw-celebrate-trophy{font-size:clamp(64px,16vw,120px);animation:cwTrophy 1.2s ease-in-out infinite;filter:drop-shadow(0 0 34px rgba(255,215,106,.65))}
        @keyframes cwTrophy{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-16px) rotate(5deg)}}
        .cw-celebrate-title{font-family:'Oxanium',sans-serif;font-size:clamp(13px,2.6vw,20px);letter-spacing:7px;color:#ffd76a;margin-top:12px;text-transform:uppercase}
        .cw-celebrate-name{font-family:'Oxanium',sans-serif;font-weight:800;font-size:clamp(30px,9vw,72px);line-height:1.05;background:linear-gradient(92deg,#ffd76a,#fff3c9,#ffb84d);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 26px rgba(255,215,106,.5));white-space:nowrap;margin-top:4px}
        .cw-celebrate-sub{font-size:clamp(13px,2.8vw,18px);color:rgba(244,241,255,.9);margin-top:8px;letter-spacing:1.5px}
        @keyframes cwFadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      <div className="cw-celebrate-rays" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ transform: 'rotate(' + (i * 30) + 'deg)' }} />)}
      </div>
      {confetti.current.map((c, i) => (
        <span key={i} className={'cw-confetti cw-confetti-' + c.shape}
          style={{ left: c.left + '%', width: c.size, height: c.size, background: c.color,
                   animationDuration: c.dur + 's', animationDelay: c.delay + 's', '--rot': c.rot + 'deg' }} />
      ))}
      <div className="cw-celebrate-card">
        <div className="cw-celebrate-trophy">🏆</div>
        <div className="cw-celebrate-title">Round Winner</div>
        <div className="cw-celebrate-name">{winner.name}</div>
        <div className="cw-celebrate-sub">
          {winner.score ? '+' + winner.score + ' points' : ''}{winner.elapsed ? ' · solved in ' + winner.elapsed + 's' : ''}
        </div>
      </div>
    </div>
  );
}
