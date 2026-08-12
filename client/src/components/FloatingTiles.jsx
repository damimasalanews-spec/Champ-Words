// Floating letter tiles for empty backgrounds — CSS animation only.
// Rendered behind page content; pointer-events are disabled.
export default function FloatingTiles() {
  return (
    <div className="login-bg-tiles" aria-hidden="true">
      <span style={{ left: '5%', fontSize: 26, animationDuration: '11s', animationDelay: '0s', color: 'rgba(125,245,240,0.14)' }}>C</span>
      <span style={{ left: '16%', fontSize: 16, animationDuration: '14s', animationDelay: '2s', color: 'rgba(37,244,238,0.12)' }}>W</span>
      <span style={{ left: '28%', fontSize: 32, animationDuration: '10s', animationDelay: '4s', color: 'rgba(254,44,85,0.12)' }}>★</span>
      <span style={{ left: '42%', fontSize: 18, animationDuration: '15s', animationDelay: '1s', color: 'rgba(125,245,240,0.12)' }}>W</span>
      <span style={{ left: '56%', fontSize: 24, animationDuration: '12s', animationDelay: '3s', color: 'rgba(254,44,85,0.10)' }}>C</span>
      <span style={{ left: '70%', fontSize: 14, animationDuration: '16s', animationDelay: '5s', color: 'rgba(37,244,238,0.12)' }}>✦</span>
      <span style={{ left: '82%', fontSize: 28, animationDuration: '11.5s', animationDelay: '0.5s', color: 'rgba(125,245,240,0.13)' }}>A</span>
      <span style={{ left: '93%', fontSize: 18, animationDuration: '13s', animationDelay: '2.5s', color: 'rgba(254,44,85,0.11)' }}>✦</span>
    </div>
  );
}
