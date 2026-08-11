import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen layout: the whole game compacts to fit the top half of
// the screen (540×960 canvas). Active on the /tiktok link (the permanent
// game URL) and via `?half=1` anywhere or `?auto=1` (studio mode). The
// login/splash page shows first on /tiktok — it renders inside the same
// canvas, so the design matches the full-page look, just scaled.
// /compact is a SEPARATE view: same 540×960 canvas mechanics, but with its
// own redesigned visual style (.compact-mode) — /tiktok is never touched.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const isTiktokPath = window.location.pathname.startsWith('/tiktok');
  const isCompactPath = window.location.pathname.startsWith('/compact');
  const forced = params.has('half') || isTiktokPath || isCompactPath;
  const studioMode = params.has('auto');
  document.documentElement.classList.toggle('tiktok-half', forced || studioMode || (isTikTok && isHalfScreen));
  document.documentElement.classList.toggle('compact-mode', isCompactPath && !params.has('half'));
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
