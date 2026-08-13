import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './arcade.css' // arcade-neon responsive game screen (web mode only, after App.css)

// Two render modes, decided once here:
//  1) tiktok-half — the fixed 540×960 stream canvas. Used ONLY by TikTok
//     studio browser sources (?half=1 / ?auto=1), the permanent stream links
//     (/tiktok, /compact) and TikTok's in-app browser (UA sniff + half-screen
//     viewport). The canvas CSS is untouched.
//  2) cw-web — the normal responsive web app (desktop host + mobile players).
//     Every other visit lands here and gets the arcade-neon responsive layout.
// The main root (champ-words.onrender.com) is now the responsive web app.
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
