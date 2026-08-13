import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './arcade.css' // arcade-neon responsive game screen (web mode only, after App.css)

// Two render modes, decided once here (+ on resize):
//  1) tiktok-half — the ORIGINAL fixed 540×960 design canvas. Used by TikTok
//     studio browser sources (?half=1 / ?auto=1), the permanent stream links
//     (/tiktok, /compact), TikTok's in-app browser (UA sniff + half-screen
//     viewport), AND desktop-width web sessions (>=768px) — the desktop web
//     view keeps exactly the same design/format it always had.
//  2) cw-web — the responsive layout, used on phone-width screens (<768px),
//     where the mobile view was reworked.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const isTiktokPath = path.startsWith('/tiktok');
  const isCompactPath = path.startsWith('/compact');
  const studioMode = params.has('half') || params.has('auto') || isTiktokPath || isCompactPath || (isTikTok && isHalfScreen);
  const desktopCanvas = !studioMode && window.innerWidth >= 768;
  const overlayMode = studioMode || desktopCanvas;
  document.documentElement.classList.toggle('tiktok-half', overlayMode);
  document.documentElement.classList.toggle('cw-web', !overlayMode);
}

// The half-size layout is a FIXED 540×960 design canvas. It scales down to
// fit smaller screens/studios (never up), so the design always looks identical.
function applyHalfScale() {
  const s = Math.min(1, window.innerWidth / 540, window.innerHeight / 960);
  document.documentElement.style.setProperty('--half-scale', s.toFixed(4));
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
