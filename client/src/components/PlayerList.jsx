export default function PlayerList({ players, host, champId, guesserId, myId }) {
  return (
    <div className="player-list">
      {players.map(p => {
        const dotClass = p.connected ? 'alive' : 'offline';

        return (
          <div key={p.id} className={`player-badge ${p.id === myId ? 'me' : ''}`}>
            <span className={`dot ${dotClass}`} />
            {p.id === host && <span className="host-star" title="Host">&#9733;</span>}
            {p.id === champId && <span className="champ-crown" title="Picker">👑</span>}
            {p.id === guesserId && <span className="guesser-dot" title="On the spot">🎯</span>}
            {p.avatar && <img src={p.avatar} alt="" className="player-avatar" />}
            <span>{p.name}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>{p.score}</span>
          </div>
        );
      })}
    </div>
  );
}
