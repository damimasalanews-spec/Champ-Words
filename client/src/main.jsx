import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen browser: links open in a webview that shows only the
// top ~50% of the screen (TikTok UI covers the bottom half). Detect it via
// the user agent + a short viewport and compact the whole game to fit that
// half from the top — the area below stays empty.
// `?half=1` forces the mode anywhere; `?auto=1` (studio mode) uses it by default.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const forced = params.has('half');
  const studioMode = params.has('auto'); // studio sources default to the half layout
  document.documentElement.classList.toggle('tiktok-half', forced || studioMode || (isTikTok && isHalfScreen));
}
applyTiktokHalfMode();
window.addEventListener('resize', applyTiktokHalfMode);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
