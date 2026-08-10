import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen layout: the whole game compacts to fit the top half of
// the screen. The /tiktok path IS the dedicated in-game half-size page
// (players land here after joining a room on the main link). Also activated
// by `?half=1` anywhere, `?auto=1` (studio mode), or TikTok's own webview.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const isTiktokPath = window.location.pathname.startsWith('/tiktok');
  const forced = params.has('half') || isTiktokPath;
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
