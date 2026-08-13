import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen layout: the whole game compacts to fit the top half of
// the screen (540×960 canvas). Active on the /tiktok link (the permanent
// game URL) and via `?half=1` anywhere or `?auto=1` (studio mode). The
// login/splash page shows first on /tiktok — it renders inside the same
// canvas, so the design matches the full-page look, just scaled.
// The main root, /tiktok and /compact ALL render the identical half-screen
// experience — champ-words.onrender.com IS the game (no redirect).
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const isRoot = path === '/' || path === '';
  const isTiktokPath = path.startsWith('/tiktok');
  const isCompactPath = path.startsWith('/compact');
  const forced = params.has('half') || isRoot || isTiktokPath || isCompactPath;
  const studioMode = params.has('auto');
  document.documentElement.classList.toggle('tiktok-half', forced || studioMode || (isTikTok && isHalfScreen));
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
