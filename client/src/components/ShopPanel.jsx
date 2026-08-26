import { useState } from 'react';

/**
 * ShopPanel — full viewer-shop storefront (name colors, name effects, emoji
 * rain, emote tag, bonus hint, pinned messages). Shared between the game
 * header and the waiting room. The host gets everything FREE (unlimited);
 * viewers pay coins. Purchases go through `shop_buy`.
 */
const SHOP_COLORS = [
  ['gold', '#ffd76a'], ['red', '#ff5c7c'], ['pink', '#ff9ecb'], ['green', '#5ef2c6'],
  ['sky', '#5ea2ff'], ['purple', '#b78cff'], ['orange', '#ffa53d'], ['white', '#ffffff'],
];
const SHOP_RAINS = ['hearts', 'fire', 'star', 'gold'];
const SHOP_EMOTES = ['🔥', '⭐', '💎', '🎯', '❤️', '⚡', '👑', '🎉'];

const card = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: 10 };
const cardTitle = { fontSize: 13, color: '#ffd76a', fontWeight: 800, marginBottom: 2 };
const cardDesc = { fontSize: 10, color: '#9aa3c0', marginBottom: 8 };
const priceTag = { fontSize: 11, color: '#5ef2c6', fontWeight: 800, marginLeft: 6 };
const btn = { padding: '5px 0', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.25)', color: '#eef2f9', fontSize: 12, cursor: 'pointer' };

export default function ShopPanel({ room, socket, onClose }) {
  const [msg, setMsg] = useState('');
  const [pinText, setPinText] = useState('');
  const me = (room.players || []).find(p => p.id === socket.id);
  const isHost = socket.id === room.host; // host shop = unlimited + free

  const buy = (item, arg) => {
    setMsg('');
    socket.emit('shop_buy', { roomId: room.id, item, arg }, (res) => {
      if (res && res.ok) {
        if (res.color) setMsg(`✅ ${res.color} name color ${isHost ? 'set' : 'bought'}!`);
        else if (res.effect) setMsg(`✅ ${res.effect} name effect ${isHost ? 'enabled' : 'bought'}!`);
        else if (res.rain) setMsg(`✅ ${res.rain} rain ${isHost ? 'enabled' : 'bought'} — shows on your next win!`);
        else if (res.emote) setMsg(`✅ ${res.emote} emote tag set!`);
        else if (res.hint) setMsg(res.hintsLeft != null ? `✅ +1 bonus hint added! (now ${res.hintsLeft} total)` : '✅ +1 bonus hint added!');
        else if (res.pinned) setMsg(`✅ Pinned: "${res.pinned}"`);
        else setMsg('✅ Done!');
      } else {
        setMsg(res && res.error ? `⚠️ ${res.error}` : '⚠️ Try again');
      }
    });
  };

  const active = (v, cur) => v === cur;

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,4,16,.78)', padding: 10 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(100%, 500px)', maxHeight: '94%', overflowY: 'auto', background: 'linear-gradient(180deg,#1a1440,#100b2e)', border: '1px solid rgba(255,215,106,.4)', borderRadius: 18, padding: 16, color: '#eef2f9', fontFamily: "'Oxanium', sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <b style={{ fontSize: 19, color: '#ffd76a' }}>🛍 SHOP</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isHost
              ? <span style={{ fontSize: 14, color: '#ffd76a', fontWeight: 800 }}>👑 HOST · ∞</span>
              : <span style={{ fontSize: 14, color: '#ffd76a', fontWeight: 800 }}>🪙 {me?.coins || 0}</span>}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9aa3c0', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
        {isHost
          ? <div style={{ fontSize: 11, color: '#5ef2c6', marginBottom: 10 }}>Host mode — everything is FREE (unlimited). Viewers still pay coins.</div>
          : <div style={{ fontSize: 11, color: '#9aa3c0', marginBottom: 10 }}>Earn coins: +10 per correct answer · gifts = 10×diamonds</div>}
        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✅') ? '#5ef2c6' : '#ff9e9e', marginBottom: 10 }}>{msg}</div>}

        {/* Item grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

          {/* 1. Name colors */}
          <div style={card}>
            <div style={cardTitle}>🎨 Name color{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>50 🪙</span>}</div>
            <div style={cardDesc}>Winner name color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {SHOP_COLORS.map(([cname, chex]) => (
                <button key={cname} onClick={() => buy('color', cname)} title={cname}
                  style={{ width: 24, height: 24, borderRadius: 7, background: chex, border: active(chex, me?.nameColor) ? '3px solid #fff' : '2px solid rgba(255,255,255,.3)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* 2. Name effects */}
          <div style={card}>
            <div style={cardTitle}>💎 Name effect{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>120–150 🪙</span>}</div>
            <div style={cardDesc}>Diamond outline · sparkle twinkles</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[['diamond', '💎', 150], ['sparkle', '✨', 120]].map(([eff, icon, cost]) => (
                <button key={eff} onClick={() => buy('effect', eff)} style={{ ...btn, flex: 1, borderColor: active(eff, me?.nameEffect) ? '#ffd76a' : undefined }}
                  title={`${eff} · ${cost} 🪙`}>{icon} {eff}</button>
              ))}
            </div>
          </div>

          {/* 3. Emoji rain */}
          <div style={card}>
            <div style={cardTitle}>🌧 Emoji rain on win{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>100 🪙</span>}</div>
            <div style={cardDesc}>One-shot — shows on your next win</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {SHOP_RAINS.map(e => (
                <button key={e} onClick={() => buy('rain', e)} style={{ ...btn, flex: 1 }}>{e}</button>
              ))}
            </div>
          </div>



          {/* 4. Emote tag */}
          <div style={card}>
            <div style={cardTitle}>🏷 Emote tag{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>40 🪙</span>}</div>
            <div style={cardDesc}>Shows next to your name</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {SHOP_EMOTES.map(e => (
                <button key={e} onClick={() => buy('emote', e)} title={e}
                  style={{ width: 26, height: 26, borderRadius: 7, fontSize: 14, background: active(e, me?.emote) ? 'rgba(255,215,106,.3)' : 'rgba(255,255,255,.08)', border: active(e, me?.emote) ? '2px solid #ffd76a' : '2px solid rgba(255,255,255,.2)', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
          </div>

          {/* 5. Bonus hint — whole card is clickable */}
          <div style={{ ...card, cursor: 'pointer' }} onClick={() => buy('hint')} title="Click anywhere to buy">
            <div style={cardTitle}>💡 Bonus hint{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>100 🪙</span>}</div>
            <div style={cardDesc}>+1 hint added to your hints · you have <b style={{ color: '#ffd76a' }}>{me?.hintsLeft ?? 0}</b> hints</div>
            <button onClick={(e) => { e.stopPropagation(); buy('hint'); }} style={{ ...btn, width: '100%' }}>+1 Hint</button>
          </div>

          {/* 6. Pin message (full width) */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <div style={cardTitle}>📌 Pin a message{isHost ? <span style={priceTag}>FREE</span> : <span style={priceTag}>150 🪙</span>}</div>
            <div style={cardDesc}>Shows on the canvas for 15 seconds</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={pinText} onChange={e => setPinText(e.target.value)} maxLength={60} placeholder="Your message…"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', fontSize: 12, fontFamily: 'inherit' }} />
              <button onClick={() => { if (pinText.trim()) { buy('pin', pinText.trim()); setPinText(''); } }}
                style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(180deg,#ffd76a,#f5a623)', border: 'none', color: '#1a1440', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Pin</button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#9aa3c0', marginTop: 10, textAlign: 'center' }}>
          TikTok chat viewers can buy too: !color pink · !effect diamond · !rain hearts · !emote 🔥 · !buyhint · !pin hello
        </div>
      </div>
    </div>
  );
}
