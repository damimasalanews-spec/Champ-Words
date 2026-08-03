export default function PlayerList({ players, host, myId }) {
  return (
    <div className="player-list">
      {players.map(p => {
        let dotClass = 'alive';
        if (!p.connected) dotClass = 'offline';
        else if (p.wordsFound === p.wordsFound) dotClass = 'alive';

        return (
          <div key={p.id} className={`player-badge ${p.id === myId ? 'me' : ''}`}>
            <span className={`dot ${dotClass}`} />
            {p.id === host && <span className="host-star" title="Host">&#9733;</span>}
            {p.avatar && <img src={p.avatar} alt="" className="player-avatar" />}
            <span>{p.name}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 9 }}>{p.score}</span>
          </div>
        );
      })}
    </div>
  );
}
