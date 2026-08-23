import { useEffect, useRef } from 'react';

/**
 * Round-winner celebration — Tikfinity PARTNER_HOOKAH_BRO style.
 * A cartoon champ with a HOOKAH blows SMOKE, and the winner's name
 * materializes out of the smoke cloud. Dark charcoal stage, smoke rings,
 * vapor particles and a Web Audio fanfare. Self-contained (SVG + CSS).
 */
export default function Celebration({ winner }) {
  const puffs = useRef([]);
  const vapor = useRef([]);
  if (puffs.current.length === 0) {
    for (let i = 0; i < 10; i++) {
      puffs.current.push({
        delay: 0.15 + i * 0.28,
        dur: 2.6 + (i % 4) * 0.45,
        size: 26 + (i % 5) * 12,
        dx: 90 + (i % 4) * 46,
        dy: 120 + (i % 3) * 50,
        op: 0.4 + (i % 3) * 0.16,
      });
    }
    for (let i = 0; i < 22; i++) {
      vapor.current.push({
        left: 6 + Math.random() * 88,
        delay: Math.random() * 2.6,
        dur: 2 + Math.random() * 2.6,
        size: 3 + Math.random() * 6,
        op: 0.3 + Math.random() * 0.5,
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
        .cw-celebrate{position:absolute;inset:0;z-index:1100;overflow:hidden;background:radial-gradient(circle at 30% 55%,#1b1b24,#0d0d14 74%);animation:cwOut .45s ease 3.85s both}
        @keyframes cwOut{to{opacity:0}}
        /* ── cartoon champ with hookah, bottom-left ── */
        .cw-hookah-char{position:absolute;left:1%;bottom:0;width:46%;max-width:330px;animation:cwCharIn .5s cubic-bezier(.2,1.7,.4,1) both;filter:drop-shadow(0 10px 26px rgba(0,0,0,.5))}
        @keyframes cwCharIn{from{transform:translateY(70px) scale(.8);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
        /* ── smoke puffs rising from the hookah hose ── */
        .cw-puff{position:absolute;left:27%;bottom:36%;width:44px;height:36px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 35% 30%,#ffffff,#dcdce4 55%,rgba(200,200,214,.35));filter:blur(1.5px);opacity:0;pointer-events:none;animation:cwPuffRise ease-in infinite}
        @keyframes cwPuffRise{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:var(--po,.5)}55%{transform:translate(var(--dx,110px),calc(var(--dy,140px) * -1)) scale(1.6);opacity:calc(var(--po,.5) * .8)}100%{transform:translate(calc(var(--dx,110px) * 1.6),calc(var(--dy,140px) * -1.7)) scale(2.4);opacity:0}}
        /* ── name materializes out of the smoke ── */
        .cw-smoke-wrap{position:absolute;right:4%;top:50%;transform:translateY(-50%);width:56%;text-align:left;padding-left:6%}
        .cw-smoke-label{font-family:'Oxanium',sans-serif;font-weight:700;font-size:clamp(10px,2.2vw,15px);letter-spacing:7px;color:#d8d8dc;text-transform:uppercase;opacity:0;animation:cwFadeUp .4s ease .6s both}
        .cw-smoke-text{
          font-family:'Oxanium',sans-serif;font-weight:800;text-transform:uppercase;
          font-size:clamp(27px,8.2vw,62px);line-height:1.04;margin-top:4px;max-width:100%;word-break:break-word;
          color:#f7f7f7;
          text-shadow:2px 2px 0 #dedede,4px 4px 0 #c0c0c0,6px 6px 0 #9c9c9c,8px 8px 16px rgba(0,0,0,.38),
            0 0 20px rgba(255,255,255,.65),0 0 48px rgba(255,255,255,.35);
          opacity:0;
          animation:cwNameIn .75s cubic-bezier(.2,1.4,.4,1) .5s both,cwPuff 2.8s ease-in-out 1.35s infinite;
        }
        @keyframes cwNameIn{0%{transform:scale(1.35);filter:blur(12px);opacity:0}60%{filter:blur(2px);opacity:1}100%{transform:scale(1);filter:blur(0);opacity:1}}
        @keyframes cwPuff{0%,100%{transform:scale(1)}50%{transform:scale(1.05) translateY(-7px)}}
        .cw-smoke-sub{font-family:'Oxanium',sans-serif;font-size:clamp(12px,2.6vw,18px);color:rgba(255,255,255,.88);margin-top:10px;letter-spacing:1.5px;opacity:0;animation:cwFadeUp .4s ease .75s both}
        @keyframes cwFadeUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        /* ── smoke rings + ambient vapor ── */
        .cw-ring{position:absolute;left:24%;bottom:26%;width:46px;height:46px;border:4px solid rgba(255,255,255,.5);border-radius:50%;opacity:0;pointer-events:none}
        .cw-ring-1{animation:cwRing 3s ease-out .4s infinite}
        .cw-ring-2{left:33%;width:32px;height:32px;animation:cwRing 2.6s ease-out 1s infinite}
        @keyframes cwRing{0%{transform:scale(.3) translateY(0);opacity:0}18%{opacity:.6}100%{transform:scale(1.9) translateY(-230px);opacity:0}}
        .cw-vapor{position:absolute;bottom:-4%;border-radius:50%;background:rgba(255,255,255,.5);filter:blur(1px);pointer-events:none;animation:cwVapor linear infinite}
        @keyframes cwVapor{0%{transform:translateY(0) scale(.5);opacity:0}15%{opacity:.75}100%{transform:translateY(-330px) scale(1.5);opacity:0}}
        @media (max-width: 480px){
          .cw-hookah-char{width:52%}
          .cw-smoke-wrap{width:60%;right:2%}
        }
      `}</style>

      {/* ── cartoon champ + hookah (SVG) ── */}
      <svg className="cw-hookah-char" viewBox="0 0 340 310" aria-hidden="true">
        {/* hookah */}
        <ellipse cx="64" cy="282" rx="38" ry="13" fill="#251d47" stroke="#8f7bff" strokeWidth="4"/>
        <rect x="57" y="176" width="13" height="102" rx="6" fill="#8f7bff"/>
        <rect x="50" y="166" width="27" height="13" rx="5" fill="#c98a3d"/>
        <ellipse cx="64" cy="166" rx="15" ry="8" fill="#e0a94f"/>
        {/* hose: stem → hand → mouth */}
        <path d="M71 196 C 108 212, 126 252, 158 258" stroke="#6a5fd0" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M158 258 C 182 262, 192 246, 186 230" stroke="#6a5fd0" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* body */}
        <rect x="182" y="226" width="92" height="84" rx="24" fill="#ffd76a"/>
        <path d="M182 248 h92" stroke="#e0a94f" strokeWidth="6"/>
        <path d="M182 244 C 166 254, 156 262, 154 250" stroke="#ffd76a" strokeWidth="18" strokeLinecap="round" fill="none"/>
        {/* head */}
        <circle cx="228" cy="186" r="44" fill="#ffd9a8"/>
        {/* hair */}
        <path d="M184 176 A44 44 0 0 1 272 176 L272 188 L184 188 Z" fill="#3a2a1e"/>
        <path d="M184 188 Q190 200 204 200 L212 188 Z" fill="#3a2a1e"/>
        {/* face */}
        <circle cx="213" cy="184" r="5.5" fill="#241a10"/>
        <circle cx="243" cy="184" r="5.5" fill="#241a10"/>
        <path d="M213 206 Q228 220 243 206" stroke="#241a10" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
        {/* blush */}
        <circle cx="202" cy="202" r="6" fill="#ffb3a0" opacity=".65"/>
        <circle cx="254" cy="202" r="6" fill="#ffb3a0" opacity=".65"/>
      </svg>

      {/* ── smoke puffs from the hose ── */}
      {puffs.current.map((p, i) => (
        <span key={i} className="cw-puff"
          style={{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--po': p.op,
                   width: p.size, height: p.size * 0.82,
                   animationDuration: p.dur + 's', animationDelay: p.delay + 's' }} />
      ))}

      {/* ── winner name in the smoke ── */}
      <div className="cw-smoke-wrap">
        <div className="cw-smoke-label">Round Winner</div>
        <div className="cw-smoke-text">{winner.name}</div>
        <div className="cw-smoke-sub">
          {winner.score ? '+' + winner.score + ' points' : ''}{winner.elapsed ? ' · solved in ' + winner.elapsed + 's' : ''}
        </div>
      </div>

      <div className="cw-ring cw-ring-1" aria-hidden="true" />
      <div className="cw-ring cw-ring-2" aria-hidden="true" />
      {vapor.current.map((p, i) => (
        <span key={i} className="cw-vapor"
          style={{ left: p.left + '%', width: p.size, height: p.size, opacity: p.op,
                   animationDuration: p.dur + 's', animationDelay: p.delay + 's' }} />
      ))}
    </div>
  );
}
