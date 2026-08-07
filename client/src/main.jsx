import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen browser: links open in a webview that shows only the
// top ~50% of the screen (TikTok UI covers the bottom half). Detect it via
// the user agent + a short viewport and compact the whole game to fit that
// half from the top — the area below stays empty.
// `?half=1` in the URL forces the mode on for preview/testing anywhere.
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const forced = new URLSearchParams(window.location.search).has('half');
  document.documentElement.classList.toggle('tiktok-half', forced || (isTikTok && isHalfScreen));
}
applyTiktokHalfMode();
window.addEventListener('resize', applyTiktokHalfMode);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
