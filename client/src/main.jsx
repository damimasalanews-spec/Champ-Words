import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './arcade.css' // arcade-neon responsive game screen (web mode only, after App.css)

// Two render modes, decided here (+ on resize) and refined by App.jsx:
//  1) tiktok-half — the ORIGINAL fixed 540×960 design canvas. Used by TikTok
//     studio browser sources (?half=1 / ?auto=1), the permanent stream links
//     (/tiktok, /compact) and TikTok's in-app browser (UA sniff + half-screen
//     viewport). App.jsx ALSO switches a desktop web session to the canvas
//     while a game/room is active, so the in-game desktop view stays exactly
//     as it always was.
//  2) cw-web — the responsive layout. Every normal web visit starts here
//     (home/lobby are responsive on BOTH mobile and desktop); phones stay
//     here for the whole session.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const isTiktokPath = path.startsWith('/tiktok');
  const isCompactPath = path.startsWith('/compact');
  const overlayMode = params.has('half') || params.has('auto') || isTiktokPath || isCompactPath || (isTikTok && isHalfScreen);
  document.documentElement.classList.toggle('tiktok-half', overlayMode);
  document.documentElement.classList.toggle('cw-web', !overlayMode);
}

// The half-size layout is a FIXED 540×960 design canvas.
// Studio stream links (?auto=1 / ?half=1 — and ?fill=1) make the canvas
// COVER the window: it scales UP via CSS zoom to fill whatever screen size
// is used, so the game fills the whole window (razor sharp at any size).
// All other tiktok-half contexts (e.g. desktop web in-game) keep the fit
// logic: scale DOWN to fit smaller screens, never up, design stays identical.
function applyHalfScale() {
  const params = new URLSearchParams(window.location.search);
  const fill = params.has('fill') || params.has('auto') || params.has('half');
  if (fill) {
    const s = Math.max(window.innerWidth / 540, window.innerHeight / 960);
    document.documentElement.style.zoom = String(Math.max(s, 1));
    document.documentElement.style.setProperty('--half-scale', '1');
  } else {
    document.documentElement.style.zoom = '';
    const s = Math.min(1, window.innerWidth / 540, window.innerHeight / 960);
    document.documentElement.style.setProperty('--half-scale', s.toFixed(4));
  }
}
applyTiktokHalfMode();
applyHalfScale();
window.addEventListener('resize', () => { applyTiktokHalfMode(); applyHalfScale(); });

// Color theme preset (Midnight / Aurora) — applied before first paint
try { document.documentElement.dataset.theme = localStorage.getItem('cw_theme') || 'midnight'; } catch (_) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
