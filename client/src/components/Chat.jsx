import { useState, useRef, useEffect } from 'react';

const COLORS = [
  '#538d4e', '#b59f3b', '#c94a4a', '#4c8ec9',
  '#a855f7', '#e8795a', '#3bb5c9', '#d9467a'
];

function getColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Chat({ messages, onSend, onClose }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="chat-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Chat</span>
        <button onClick={onClose} style={{ background: 'none', color: 'var(--text-dim)', fontSize: 18 }}>&times;</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.system ? 'system' : ''}`}>
            {msg.system ? (
              <span>{msg.text}</span>
            ) : (
              <>
                <span className="name" style={{ color: getColor(msg.playerName) }}>{msg.playerName}</span>
                <span>{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Send a message..." maxLength={200} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
