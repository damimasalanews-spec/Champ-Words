import { useEffect, useRef } from 'react';

/**
 * Round-winner celebration — Tikfinity-style alert (like PARTNER_HOOKAH_BRO).
 * Dark charcoal stage, a character (trophy) on the left, the winner's name
 * in big PUFFY SMOKE text that pops in and breathes, rising smoke rings,
 * vapor particles and a Web Audio fanfare. Self-contained.
 */
export default function Celebration({ winner }) {
  const particles = useRef([]);
  if (particles.current.length === 0) {
    for (let i = 0; i < 26; i++) {
      particles.current.push({
        left: 8 + Math.random() * 84,
        delay: Math.random() * 2.4,
        dur: 2 + Math.random() * 2.6,
        size: 3 + Math.random() * 6,
        op: 0.35 + Math.random() * 0.5,
      });
    }
  }

  // Web Audio fanfare — short ascending flourish, no audio file needed
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
        .cw-celebrate{position:absolute;inset:0;z-index:1100;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:4%;padding:0 8%;background:radial-gradient(circle at 28% 52%,#1b1b24,#0e0e15 72%);animation:cwOut .45s ease 3.75s both}
        @keyframes cwOut{to{opacity:0}}
        /* character (trophy) pops in from the left, like the Tikfinity avatar */
        .cw-char{font-size:clamp(64px,17vw,128px);line-height:1;animation:cwCharPop .55s cubic-bezier(.2,1.8,.4,1) both;filter:drop-shadow(0 0 34px rgba(255,255,255,.28));transform-origin:center}
        @keyframes cwCharPop{from{transform:scale(.15) translateX(-70px);opacity:0}to{transform:scale(1) translateX(0);opacity:1}}
        /* smoke text block */
        .cw-smoke-wrap{max-width:58%;text-align:left}
        .cw-smoke-label{font-family:'Oxanium',sans-serif;font-weight:700;font-size:clamp(10px,2.2vw,15px);letter-spacing:7px;color:#d8d8dc;text-transform:uppercase;opacity:0;animation:cwFadeUp .4s ease .22s both}
        @keyframes cwFadeUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .cw-smoke-text{
          font-family:'Oxanium',sans-serif;font-weight:800;text-transform:uppercase;
          font-size:clamp(28px,8.4vw,64px);line-height:1.04;margin-top:4px;max-width:100%;word-break:break-word;
          color:#f5f5f5;
          text-shadow:2px 2px 0 #dcdcdc,4px 4px 0 #bdbdbd,6px 6px 0 #999999,8px 8px 14px rgba(0,0,0,.35),
            0 0 18px rgba(255,255,255,.6),0 0 44px rgba(255,255,255,.32);
          opacity:0;
          animation:cwSmokeIn .55s cubic-bezier(.2,1.5,.4,1) .08s both,cwPuff 2.6s ease-in-out .85s infinite;
        }
        @keyframes cwSmokeIn{0%{transform:scale(.25) translateY(34px);opacity:0}60%{transform:scale(1.14);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes cwPuff{0%,100%{transform:scale(1)}50%{transform:scale(1.05) translateY(-7px)}}
        .cw-smoke-sub{font-family:'Oxanium',sans-serif;font-size:clamp(12px,2.6vw,18px);color:rgba(255,255,255,.85);margin-top:10px;letter-spacing:1.5px;opacity:0;animation:cwFadeUp .4s ease .35s both}
        /* rising smoke rings */
        .cw-ring{position:absolute;left:26%;bottom:-8%;width:52px;height:52px;border:5px solid rgba(255,255,255,.55);border-radius:50%;opacity:0;pointer-events:none}
        .cw-ring-1{animation:cwRing 3s ease-out .3s infinite}
        .cw-ring-2{left:38%;width:36px;height:36px;animation:cwRing 2.6s ease-out .9s infinite}
        .cw-ring-3{left:18%;width:70px;height:70px;animation:cwRing 3.4s ease-out 1.6s infinite}
        @keyframes cwRing{0%{transform:scale(.35) translateY(0);opacity:0}18%{opacity:.65}100%{transform:scale(2.1) translateY(-300px);opacity:0}}
        /* vapor particles */
        .cw-vapor{position:absolute;bottom:-4%;border-radius:50%;background:rgba(255,255,255,.55);filter:blur(1px);pointer-events:none;animation:cwVapor linear infinite}
        @keyframes cwVapor{0%{transform:translateY(0) scale(.5);opacity:0}15%{opacity:.8}100%{transform:translateY(-340px) scale(1.5);opacity:0}}
      `}</style>

      <div className="cw-char" aria-hidden="true">🏆</div>

      <div className="cw-smoke-wrap">
        <div className="cw-smoke-label">Round Winner</div>
        <div className="cw-smoke-text">{winner.name}</div>
        <div className="cw-smoke-sub">
          {winner.score ? '+' + winner.score + ' points' : ''}{winner.elapsed ? ' · solved in ' + winner.elapsed + 's' : ''}
        </div>
      </div>

      <div className="cw-ring cw-ring-1" aria-hidden="true" />
      <div className="cw-ring cw-ring-2" aria-hidden="true" />
      <div className="cw-ring cw-ring-3" aria-hidden="true" />
      {particles.current.map((p, i) => (
        <span key={i} className="cw-vapor"
          style={{ left: p.left + '%', width: p.size, height: p.size, opacity: p.op,
                   animationDuration: p.dur + 's', animationDelay: p.delay + 's' }} />
      ))}
    </div>
  );
}
