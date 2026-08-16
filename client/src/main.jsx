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
  // Phones & small tablets get the SAME studio canvas design as desktop web /
  // the stream view — one design everywhere, fitted to the screen. Desktop
  // (wide) non-studio visits keep the responsive cw-web home/lobby.
  const isNarrow = window.innerWidth < 768;
  const wantHalf = overlayMode || isNarrow;
  document.documentElement.classList.toggle('tiktok-half', wantHalf);
  document.documentElement.classList.toggle('cw-web', !wantHalf);
}

// The half-size layout is a FIXED 540×960 design canvas, and the studio
// style is used everywhere — with responsive sizing:
//   • Small screens (phones / windows smaller than the canvas): the canvas
//     scales DOWN to FIT — the whole game is visible, same studio style,
//     never cropped.
//   • Large screens (studio / stream windows): the canvas scales UP via CSS
//     zoom to COVER the window — the game fills the whole screen, razor sharp.
// Other tiktok-half contexts (desktop web in-game) always fit.
function applyHalfScale() {
  const params = new URLSearchParams(window.location.search);
  const cover = params.has('fill') || params.has('auto') || params.has('half');
  if (cover) {
    const fit = Math.min(window.innerWidth / 540, window.innerHeight / 960);
    if (fit < 1) {
      // Small screen — scale down to fit, whole canvas visible
      document.documentElement.style.zoom = '';
      document.documentElement.style.setProperty('--half-scale', fit.toFixed(4));
    } else {
      // Large screen — scale up to cover the window
      const s = Math.max(window.innerWidth / 540, window.innerHeight / 960);
      document.documentElement.style.zoom = String(s);
      document.documentElement.style.setProperty('--half-scale', '1');
    }
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
