import { useEffect, useMemo, useState } from 'react';

/**
 * SmokeAnim — holographic CHAMPION WORDMARK reveal. Fills the ENTIRE TOP 5
 * leaderboard column (~180×250px on the 540×960 canvas) for ~6s when the first
 * correct answer of the round lands, then fades out and the server starts the
 * next round (real TOP 5 shown again). Column sizes never change.
 *
 * COMPLETELY NEW CONCEPT — no characters, no mascots, no left/right split:
 *   The winner's NAME is the star. It flies in from all directions with light
 *   trails onto a deep-space stage, landing in the center with shockwave
 *   bursts and sparkles. The letters have a prismatic holographic treatment
 *   (gold + emerald ghost edges around a white-gold core) with a floating
 *   sheen sweep. Background: deep-space nebula + starfield + drifting glass
 *   shards + perspective grid + an energy core that pulses and bursts on the
 *   trigger.
 *
 * Timeline ≈ 6s: energy core charges → CORE BURST (flash + shockwaves) →
 * letters fly in (staggered, with trails) → landing rings + sparkles → hold
 * (float + holographic sheen) → fade out.
 */
// Rotating stage themes (round % 4): bg gradient, nebula blobs, star/grid/particle colors.
const THEMES = [
  { name: 'Space',    bg: ['#14122e', '#0d0b1e', '#060510'], blobs: [['rgba(122,92,255,.16)', 120, 150, 200, 130], ['rgba(53,212,149,.12)', 280, 360, 190, 140], ['rgba(255,215,106,.07)', 240, 140, 150, 110]], star: '#eaf0ff', grid: '#9fb4ff', part: ['#ffd76a', '#5ef2c6', '#ffffff'] },
  { name: 'Neon City', bg: ['#0d0a1e', '#13102c', '#070613'], blobs: [['rgba(255,45,85,.15)', 70, 420, 170, 130], ['rgba(94,242,198,.10)', 300, 120, 180, 140], ['rgba(255,120,200,.09)', 210, 300, 210, 170]], star: '#7dfff2', grid: '#ff2d55', part: ['#ff2d55', '#5ef2c6', '#ffe9b0'] },
  { name: 'Aurora',   bg: ['#0a1228', '#101f3f', '#060a18'], blobs: [['rgba(53,212,149,.18)', 100, 120, 220, 150], ['rgba(94,120,255,.14)', 300, 300, 200, 160], ['rgba(255,215,106,.08)', 180, 400, 220, 120]], star: '#bfffe6', grid: '#35d495', part: ['#5ef2c6', '#7d8cff', '#ffffff'] },
  { name: 'Sunset',   bg: ['#24103a', '#3a1440', '#120a24'], blobs: [['rgba(255,120,60,.16)', 80, 160, 210, 150], ['rgba(255,215,106,.12)', 280, 320, 190, 140], ['rgba(255,80,140,.10)', 160, 420, 220, 140]], star: '#ffd9b0', grid: '#ff8a5b', part: ['#ffa53d', '#ff5c7c', '#ffe9b0'] },
];
const RAIN_SETS = {
  hearts: ['❤️', '💖', '💗', '💕'],
  fire: ['🔥', '🔥', '💥', '🔥'],
  star: ['⭐', '✨', '🌟', '✨'],
  gold: ['💰', '🪙', '✨', '💎'],
};

export default function SmokeAnim({
  name = 'WINNER',
  rank = null,        // 1–5 (position in the real TOP 5) or null (not on board)
  streak = 0,         // winner's current streak
  bestTime = 0,       // winner's best time (s)
  newRecord = false,  // this solve beat their previous best
  elapsed = 0,        // this solve's time (s)
  gained = 0,         // points gained this round
  word = '',          // the round word → "THE WORD: …" reveal
  theme = 0,          // 0–3 rotating stage
  nameColor = null,   // viewer shop: bought name color
  nameEffect = null,  // viewer shop: 'diamond' | 'sparkle'
  rain = null,        // viewer shop: emoji rain effect on win
}) {
  const t = THEMES[Math.min(3, Math.max(0, theme | 0))];
  const rainEmojis = rain ? RAIN_SETS[rain] || RAIN_SETS.hearts : null;
  // Default winner-name color is pink (owner preference); shop colors override.
  const effectiveNameColor = nameColor || '#ff9ecb';
  const letters = useMemo(
    () => String(name || 'WINNER').toUpperCase().split('').slice(0, 15),
    [name]
  );
  // HUGE name spanning the full column width (x 45→315 ≈ 270 units).
  const fs = useMemo(
    () => Math.max(24, Math.min(78, Math.round(270 / (Math.max(1, letters.length) * 0.68)))),
    [letters]
  );
  const step = fs * 0.68;
  const startX = 180 - ((letters.length - 1) / 2) * step;
  const NAME_Y = 252; // letters baseline

  // ── Rank flair: accent + caption + crown for the #1 spot ──
  const accent = rank === 1 ? '#ffd76a' : rank === 2 ? '#cdd2e2' : rank === 3 ? '#e0a06a' : rank === 4 || rank === 5 ? '#5ef2c6' : '#ffd76a';
  const caption = rank === 1 ? '★ CHAMPION ★' : rank ? `RANK #${rank}` : '★ WINNER ★';

  // ── Points count-up (starts when the name has landed) ──
  const [pts, setPts] = useState(0);
  useEffect(() => {
    const start = setTimeout(() => {
      const steps = 26;
      let i = 0;
      const iv = setInterval(() => {
        i += 1;
        setPts(Math.round(gained * (i / steps)));
        if (i >= steps) clearInterval(iv);
      }, 42);
      return () => clearInterval(iv);
    }, 3050);
    return () => clearTimeout(start);
  }, [gained]);

  // Fly-in directions alternate so letters converge from everywhere.
  const flyDirs = letters.map((_, i) => {
    const dir = i % 4;
    const dx = dir === 0 ? -130 : dir === 1 ? 130 : dir === 2 ? 40 : -40;
    const dy = i % 2 === 0 ? 150 : -150;
    return { dx, dy, rot: dir % 2 === 0 ? -38 : 38 };
  });

  const stars = [
    [30, 50], [70, 26], [120, 70], [170, 34], [230, 58], [280, 26], [330, 48],
    [24, 140], [90, 120], [150, 160], [220, 132], [300, 150], [340, 120], [52, 200],
    [200, 210], [330, 220], [60, 300], [140, 320], [310, 330], [250, 400], [96, 430],
  ];
  const bokeh = [
    [40, 90, 4], [310, 70, 3], [180, 40, 5], [260, 190, 4], [80, 240, 3],
    [330, 300, 5], [20, 360, 4], [150, 420, 3], [290, 440, 4], [210, 130, 3],
  ];
  const shards = [
    [30, 420, 12, '#ffd76a', 0, 22], [120, 460, 9, '#5ef2c6', 1, -18], [210, 440, 14, '#ffffff', 2, 34],
    [300, 450, 10, '#ffd76a', 3, -26], [340, 380, 8, '#5ef2c6', 4, 16], [60, 360, 7, '#ffffff', 5, -30],
    [270, 330, 11, '#ffd76a', 6, 40], [160, 300, 6, '#5ef2c6', 7, -14], [320, 200, 9, '#ffffff', 8, 28],
    [18, 180, 7, '#ffd76a', 9, -20],
  ];

  return (
    <div className="top5-smoke-panel" aria-hidden="true">
      <style>{`
        .top5-smoke-panel{position:absolute;left:-2px;top:-2px;width:calc(100% + 4px);height:calc(100% + 4px);z-index:40;pointer-events:none;border-radius:14px;overflow:hidden;background:#08060f;animation:saFade .8s ease 5.35s both}
        .top5-smoke-panel .sa-svg{width:100%;height:100%;display:block}
        @keyframes saFade{from{opacity:1;transform:scale(1.02)}to{opacity:0;transform:scale(1.06)}}

        /* ── deep-space stage: nebula drift, twinkling stars, bokeh ── */
        .sa-nebula{transform-box:view-box;transform-origin:180px 250px}
        .sa-nebula-1{animation:saNeb1 11s ease-in-out infinite alternate}
        .sa-nebula-2{animation:saNeb2 14s ease-in-out infinite alternate}
        @keyframes saNeb1{from{transform:translate(0,0) scale(1)}to{transform:translate(46px,-30px) scale(1.2)}}
        @keyframes saNeb2{from{transform:translate(0,0) scale(1)}to{transform:translate(-44px,26px) scale(1.15)}}
        .sa-star{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-star{animation:saTwinkle 1.8s ease-in-out infinite}
        @keyframes saTwinkle{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:.95;transform:scale(1.1)}}
        .sa-bokeh{opacity:0}
        .sa-bokeh{animation:saBokeh 2.6s ease-in-out infinite}
        @keyframes saBokeh{0%,100%{opacity:.08}50%{opacity:.5}}

        /* ── floating glass shards ── */
        .sa-shard{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-shard{animation:saShard var(--sd,7s) linear var(--dd,0s) infinite}
        @keyframes saShard{
          0%{opacity:0;transform:translateY(60px) rotate(0) scale(.7)}
          15%{opacity:.7}
          80%{opacity:.5}
          100%{opacity:0;transform:translateY(-540px) rotate(var(--sr,30deg)) scale(1.1)}
        }

        /* ── energy core: charge pulse + orbiting ring ── */
        .sa-core{transform-box:fill-box;transform-origin:center;animation:saCore 1.05s ease-in-out infinite}
        @keyframes saCore{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.14);opacity:1}}
        .sa-orbit{transform-box:view-box;transform-origin:180px 250px;animation:saOrbit 5s linear infinite}
        @keyframes saOrbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .sa-orbit-2{transform-box:view-box;transform-origin:180px 250px;animation:saOrbit2 8s linear infinite}
        @keyframes saOrbit2{from{transform:rotate(360deg)}to{transform:rotate(0)}}

        /* ── trigger: core burst + shockwaves ── */
        .sa-flash{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-flash{animation:saFlash .6s ease-out 1.15s both}
        @keyframes saFlash{0%{opacity:0;transform:scale(.4)}30%{opacity:1}100%{opacity:0;transform:scale(3.4)}}
        .sa-shock{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-shock{animation:saShock 1.1s ease-out 1.35s both}
        .sa-shock-2{animation:saShock 1.1s ease-out 1.55s both}
        @keyframes saShock{0%{opacity:0;transform:scale(.25)}35%{opacity:.85}100%{opacity:0;transform:scale(2.2)}}
        .sa-core-fade{animation:saCoreFade .5s ease 1.3s both}
        @keyframes saCoreFade{to{opacity:0;transform:scale(1.6)}}

        /* ── letters fly in from everywhere with light trails ── */
        .sa-letter{opacity:0;transform-box:fill-box;transform-origin:50% 62%}
        .sa-letter{animation:saFly .6s cubic-bezier(.15,1.1,.4,1) calc(2.4s + var(--i) * .07s) both}
        @keyframes saFly{
          0%{opacity:0;transform:translate(var(--dx,0px), var(--dy,120px)) rotate(var(--rot,30deg)) scale(.5)}
          70%{opacity:1;transform:translate(0,0) rotate(0) scale(1.14)}
          100%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}
        }
        /* prismatic ghost edges: emerald + gold around the white-gold core */
        .sa-letter-ghost-e{fill:#5ef2c6;font-weight:800;opacity:.95}
        .sa-letter-ghost-g{fill:#ffd76a;font-weight:800;opacity:.95}
        .sa-letter-crisp{fill:url(#saCoreGrad);font-weight:800;paint-order:stroke;stroke:rgba(255,255,255,.55);stroke-width:1;text-shadow:0 0 24px rgba(255,255,255,.95),0 0 52px rgba(255,215,106,.55),0 0 90px rgba(94,242,198,.35)}
        .sa-letter-trail{opacity:0}
        .sa-letter-trail{animation:saTrail .5s ease calc(2.35s + var(--i) * .07s) both}
        @keyframes saTrail{0%{opacity:0}45%{opacity:.8}100%{opacity:0}}
        .sa-land{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-land{animation:saLand .5s ease-out calc(2.95s + var(--i) * .07s) both}
        @keyframes saLand{0%{opacity:0;transform:scale(.2)}35%{opacity:.9}100%{opacity:0;transform:scale(1.9)}}

        /* ── hold: float + holographic sheen ── */
        .sa-name-float{animation:saFloat 2.8s ease-in-out 3.5s infinite}
        @keyframes saFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .sa-sheen{opacity:0;transform-box:view-box;transform-origin:0 0}
        .sa-sheen{animation:saSheen 2.2s ease-in-out 3.6s infinite}
        @keyframes saSheen{0%{transform:translateX(-230px) skewX(-14deg);opacity:0}20%{opacity:.7}45%,100%{transform:translateX(340px) skewX(-14deg);opacity:0}}

        /* ── caption, rank crown, stats, word reveal ── */
        .sa-caption{opacity:0}
        .sa-caption{animation:saCaption .45s cubic-bezier(.2,1.6,.4,1) 2.7s both}
        @keyframes saCaption{from{opacity:0;transform:translateY(10px) scale(.92)}to{opacity:1;transform:translateY(0) scale(1)}}
        .sa-crown-rank{opacity:0;transform-box:fill-box;transform-origin:50% 100%}
        .sa-crown-rank{animation:saCrownR .5s cubic-bezier(.2,1.6,.4,1) 2.85s both}
        @keyframes saCrownR{0%{opacity:0;transform:translateY(-20px) scale(0)}60%{opacity:1;transform:translateY(3px) scale(1.2)}100%{opacity:1;transform:translateY(0) scale(1)}}
        .sa-stats{opacity:0}
        .sa-stats{animation:saStats .45s cubic-bezier(.2,1.6,.4,1) 3.05s both}
        @keyframes saStats{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .sa-word{opacity:0}
        .sa-word{animation:saWord .5s ease 3.6s both}
        @keyframes saWord{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sa-sparkle{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-sparkle{animation:saSparkle 1.2s ease-in-out calc(3.3s + var(--sd) * .15s) infinite}
        @keyframes saSparkle{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:.95;transform:scale(1.2) rotate(18deg)}}

        /* ── diamond name effect gems ── */
        .sa-gem{opacity:0;transform-box:fill-box;transform-origin:center}
        .sa-gem{animation:saGem .5s cubic-bezier(.2,1.7,.4,1) both}
        @keyframes saGem{0%{opacity:0;transform:translateY(-16px) scale(0) rotate(-20deg)}60%{opacity:1;transform:translateY(2px) scale(1.25) rotate(6deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}

        /* ── emoji rain (viewer shop) ── */
        .sa-rain{opacity:0}
        .sa-rain{animation:saRain 2.3s linear calc(3.35s + var(--dd)) infinite}
        @keyframes saRain{
          0%{opacity:0;transform:translate(0,-30px) rotate(0) scale(.7)}
          12%{opacity:.95}
          100%{opacity:0;transform:translate(var(--dx,20px),560px) rotate(var(--dr,20deg)) scale(1.05)}
        }
      `}</style>

      <svg className="sa-svg" viewBox="0 0 360 500" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="saBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <filter id="saSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="saSoft2" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="48" />
          </filter>
          <filter id="saNoise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0" />
          </filter>
          <linearGradient id="saSpace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.bg[0]} />
            <stop offset="55%" stopColor={t.bg[1]} />
            <stop offset="100%" stopColor={t.bg[2]} />
          </linearGradient>
          <radialGradient id="saCoreGrad" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#ffe9b0" />
            <stop offset="100%" stopColor="#ffc94d" />
          </radialGradient>
          <radialGradient id="saEnergy" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(94,242,198,.9)" />
            <stop offset="55%" stopColor="rgba(255,215,106,.45)" />
            <stop offset="100%" stopColor="rgba(255,215,106,0)" />
          </radialGradient>
          <linearGradient id="saShardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,.08)" />
          </linearGradient>
          <linearGradient id="saVignette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,.55)" />
            <stop offset="45%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,.6)" />
          </linearGradient>
        </defs>

        {/* ── deep-space stage ── */}
        <rect x="0" y="0" width="360" height="500" fill="url(#saSpace)" />
        {t.blobs.map(([blobColor, bx, by, brx, bry], i) => (
          <g key={i} className={i % 2 === 0 ? 'sa-nebula sa-nebula-1' : 'sa-nebula sa-nebula-2'}
            style={i === 2 ? { animationDelay: '-4s' } : undefined}>
            <ellipse cx={bx} cy={by} rx={brx} ry={bry} fill={blobColor} filter="url(#saSoft2)" />
          </g>
        ))}

        {/* starfield */}
        {stars.map(([sx, sy], i) => (
          <circle key={i} className="sa-star" cx={sx} cy={sy} r={i % 3 === 0 ? 2.2 : 1.4}
            fill={t.star} style={{ animationDelay: `${(i % 7) * 0.3}s` }} />
        ))}
        {bokeh.map(([bx, by, br], i) => (
          <circle key={i} className="sa-bokeh" cx={bx} cy={by} r={br} fill={t.part[i % 3]}
            filter="url(#saBlur)" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}

        {/* perspective grid (subtle depth) */}
        <g opacity="0.07" stroke={t.grid} strokeWidth="1.2">
          <path d="M180 250 L-40 500 M180 250 L0 500 M180 250 L70 500 M180 250 L150 500 M180 250 L220 500 M180 250 L290 500 M180 250 L360 500 M180 250 L400 500" />
          <path d="M-40 470 L400 470 M-30 430 L390 430 M-16 390 L376 390 M-6 360 L366 360" />
        </g>

        {/* floating glass shards */}
        {shards.map(([sx, sy, sz, color, sd, sr], i) => (
          <path key={i} className="sa-shard" transform={`translate(${sx}, ${sy})`}
            d={`M0 ${-sz} L${sz * 0.55} 0 L0 ${sz} L${-sz * 0.55} 0 Z`}
            fill={color === '#ffffff' ? 'url(#saShardGrad)' : color} opacity="0.95"
            style={{ '--sd': `${6 + (sd % 5)}s`, '--dd': `${sd * 0.9}s`, '--sr': `${sr}deg` }} />
        ))}
        <rect x="0" y="0" width="360" height="500" fill="url(#saVignette)" />
        <rect x="0" y="0" width="360" height="500" filter="url(#saNoise)" opacity="0.05" />

        {/* ── energy core: charge → burst ── */}
        <g className="sa-core-fade">
          <g className="sa-orbit">
            <ellipse cx="180" cy="250" rx="92" ry="34" fill="none" stroke="rgba(94,242,198,.5)" strokeWidth="1.6" strokeDasharray="10 14" />
          </g>
          <g className="sa-orbit-2">
            <ellipse cx="180" cy="250" rx="118" ry="46" fill="none" stroke="rgba(255,215,106,.45)" strokeWidth="1.2" strokeDasharray="4 16" />
          </g>
          <g className="sa-core">
            <circle cx="180" cy="250" r="46" fill="url(#saEnergy)" filter="url(#saSoft)" />
            <circle cx="180" cy="250" r="16" fill="#ffffff" />
            <circle cx="180" cy="250" r="22" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.5" />
          </g>
        </g>
        {/* burst */}
        <circle className="sa-flash" cx="180" cy="250" r="40" fill="url(#saEnergy)" />
        <circle className="sa-shock" cx="180" cy="250" r="70" fill="none" stroke="rgba(94,242,198,.9)" strokeWidth="3" />
        <circle className="sa-shock sa-shock-2" cx="180" cy="250" r="70" fill="none" stroke="rgba(255,215,106,.9)" strokeWidth="2.4" />

        {/* ── the name: letters fly in with trails + landing rings ── */}
        <g className="sa-name-float">
          {letters.map((ch, i) => {
            const lx = startX + i * step;
            const { dx, dy, rot } = flyDirs[i];
            return (
              <g key={i}>
                {/* light trail behind the letter */}
                <line className="sa-letter-trail" style={{ '--i': i }}
                  x1={lx - dx} y1={NAME_Y - dy} x2={lx} y2={NAME_Y}
                  stroke="url(#saEnergy)" strokeWidth="3" strokeLinecap="round" filter="url(#saBlur)" />
                <g className="sa-letter" style={{ '--i': i, '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg` }}>
                  {/* winner name — pink by default, shop-bought colors override */}
                  <text x={lx} y={NAME_Y} textAnchor="middle"
                    fontSize={fs} fontFamily="Oxanium, sans-serif"
                    fill={effectiveNameColor} fontWeight="800" paintOrder="stroke"
                    stroke={nameEffect === 'diamond' ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)'}
                    strokeWidth={nameEffect === 'diamond' ? 3.4 : 1.2}
                    style={{ textShadow: nameEffect === 'diamond'
                      ? `0 0 10px ${effectiveNameColor}, 0 0 24px #ffffffcc, 0 0 46px ${effectiveNameColor}88, 0 4px 0 rgba(0,0,0,.4), 0 8px 22px rgba(0,0,0,.5)`
                      : `0 0 22px ${effectiveNameColor}, 0 0 46px ${effectiveNameColor}66, 0 4px 0 rgba(0,0,0,.4), 0 8px 22px rgba(0,0,0,.5)` }}>{ch}</text>
                </g>
                {/* landing ring */}
                <circle className="sa-land" style={{ '--i': i }} cx={lx} cy={NAME_Y - fs * 0.42}
                  r={fs * 0.6} fill="none" stroke="rgba(255,215,106,.8)" strokeWidth="2" />
              </g>
            );
          })}
          {/* holographic sheen sweep */}
          <g className="sa-sheen">
            <rect x="40" y={NAME_Y - fs - 6} width="280" height={fs + 14} fill="url(#saEnergy)" opacity="0.5" />
          </g>

          {/* viewer shop: diamond name effect — gems pop above the name */}
          {nameEffect === 'diamond' && (
            <g>
              {[-40, 0, 40].map((dx, i) => (
                <text key={i} x={180 + dx} y={NAME_Y - fs - 16} textAnchor="middle" fontSize={15}
                  className="sa-gem" style={{ animationDelay: `${2.9 + i * 0.09}s` }}>💎</text>
              ))}
            </g>
          )}
          {/* viewer shop: sparkle name effect — twinkles around the letters */}
          {nameEffect === 'sparkle' && [
            [40, 60], [330, 40], [36, 150], [336, 150], [120, 30], [270, 30],
            [60, 210], [330, 230],
          ].map(([sx, sy], i) => (
            <g key={i} transform={`translate(${sx}, ${sy})`}>
              <path className="sa-sparkle" style={{ '--sd': i }}
                d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z" fill="#ffffff" />
            </g>
          ))}
        </g>

        {/* ── rank crown (only the #1 spot) — outer group carries the position so
             the CSS pop animation can transform the inner group freely ── */}
        {rank === 1 && (
          <g transform="translate(0, 118)">
            <g className="sa-crown-rank">
              <path d="M162 12 L166 -4 L176 4 L180 -8 L184 4 L194 -4 L198 12 Z"
                fill="url(#saGold)" stroke="#8a5a10" strokeWidth="1.4" strokeLinejoin="round" />
              <rect x="161" y="12" width="38" height="5" rx="2" fill="url(#saGold)" stroke="#8a5a10" strokeWidth="1" />
              <circle cx="180" cy="16" r="3" fill="#5ef2c6" stroke="#0e7a52" strokeWidth="1" />
            </g>
          </g>
        )}

        {/* ── rank caption ── */}
        <g className="sa-caption">
          <text x="180" y="152" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="4"
            fill={accent} fontFamily="Oxanium, sans-serif"
            style={{ textShadow: `0 0 16px ${accent}` }}>{caption}</text>
        </g>

        {/* ── winner stats: points count-up, streak, record ── */}
        {(gained > 0 || streak >= 2 || newRecord) && (
          <g className="sa-stats">
            {gained > 0 && (
              <g transform="translate(0, 314)">
                <text x="180" y="0" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="1"
                  fill="#ffd76a" fontFamily="Oxanium, sans-serif"
                  style={{ textShadow: '0 0 14px rgba(255,215,106,.9)' }}>+{pts} PTS</text>
              </g>
            )}
            {streak >= 2 && (
              <g transform="translate(0, 340)">
                <path d="M128 6 C 122 -2, 130 -8, 138 -6 C 142 -5, 140 0, 136 2 C 144 -2, 152 2, 150 10 C 148 18, 134 22, 126 16 C 120 12, 122 8, 128 6 Z"
                  fill="#ff8a2b" />
                <text x="150" y="4" textAnchor="start" fontSize="12" fontWeight="800" letterSpacing="1"
                  fill="#ffb84d" fontFamily="Oxanium, sans-serif"
                  style={{ textShadow: '0 0 12px rgba(255,138,43,.9)' }}>×{streak} STREAK</text>
              </g>
            )}
            {newRecord && bestTime > 0 && (
              <g transform="translate(0, 366)">
                <path d="M126 8 L120 0 L114 8 L120 12 Z" fill="#5ef2c6" />
                <text x="146" y="6" textAnchor="start" fontSize="12" fontWeight="800" letterSpacing="1"
                  fill="#5ef2c6" fontFamily="Oxanium, sans-serif"
                  style={{ textShadow: '0 0 12px rgba(94,242,198,.9)' }}>NEW RECORD {Math.round(elapsed * 10) / 10}s</text>
              </g>
            )}
          </g>
        )}

        {/* ── word reveal ── */}
        {word && (
          <g className="sa-word">
            <text x="180" y="438" textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="3"
              fill="#eef2f9" fontFamily="Oxanium, sans-serif"
              style={{ textShadow: '0 0 12px rgba(255,255,255,.6)' }}>THE WORD: {String(word).toUpperCase()}</text>
          </g>
        )}
        {[
          [120, 140, '#ffd76a', 0], [320, 120, '#5ef2c6', 1], [100, 360, '#ffd76a', 2],
          [330, 380, '#5ef2c6', 3], [60, 250, '#ffffff', 4], [330, 250, '#ffd76a', 5],
        ].map(([sx, sy, color, sd], i) => (
          <g key={i} transform={`translate(${sx}, ${sy})`}>
            <path className="sa-sparkle" style={{ '--sd': sd }}
              d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z" fill={color} />
          </g>
        ))}

        {/* ── emoji rain (viewer shop: shows on the winner's next win) ── */}
        {rainEmojis && Array.from({ length: 18 }, (_, i) => {
          const x = 24 + (i * 37) % 312;
          const emoji = rainEmojis[i % rainEmojis.length];
          return (
            <text key={i} className="sa-rain" x={x} y={-20}
              fontSize={13 + (i % 4) * 5} textAnchor="middle"
              style={{
                '--dd': `${(i % 9) * 0.22}s`,
                '--dx': `${(i % 2 === 0 ? 1 : -1) * (14 + (i % 5) * 9)}px`,
                '--dr': `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 6) * 8)}deg`,
              }}>{emoji}</text>
          );
        })}
      </svg>
    </div>
  );
}
