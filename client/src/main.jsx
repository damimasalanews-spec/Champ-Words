import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// TikTok half-screen layout: the whole game compacts to fit the top half of
// the screen. Activated by: the /tiktok path (dedicated half-size link),
// `?half=1` anywhere, `?auto=1` (studio mode), or TikTok's own webview
// (user agent + short viewport).
function applyTiktokHalfMode() {
  const isTikTok = /tiktok|musical_ly|bytedance/i.test(navigator.userAgent);
  const isHalfScreen = window.innerHeight < window.screen.height * 0.78;
  const params = new URLSearchParams(window.location.search);
  const isTiktokPath = window.location.pathname.startsWith('/tiktok');
  const forced = params.has('half') || isTiktokPath;
  const studioMode = params.has('auto') || isTiktokPath;
  document.documentElement.classList.toggle('tiktok-half', forced || studioMode || (isTikTok && isHalfScreen));
}
applyTiktokHalfMode();
window.addEventListener('resize', applyTiktokHalfMode);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
