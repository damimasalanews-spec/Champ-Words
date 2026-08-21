import { useEffect, useState } from 'react';

// ── !score slide-in cards ─────────────────────────────────────────────────
// When someone types !score (TikTok LIVE chat or in-game chat) the server
// emits a score_card event; this renders a small column of cards on the left
// edge of the screen, each showing the player's name + score in the exact
// leaderboard score format (Oxanium emerald number + "pts"), sliding in from
// the left, staying ~4s, then sliding back out.
function ScoreCardItem({ card, onDone }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 4000);
    const t2 = setTimeout(() => onDone(card.id), 4450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [card.id, onDone]);

  return (
    <div className={`score-card ${phase}`}>
      <span className="score-card-name">{card.name}</span>
      <span className="score-card-score">
        {card.score}
        <span className="score-card-pts"> pts</span>
      </span>
      {card.streak >= 2 && <span className="score-card-streak">🔥 ×{card.streak}</span>}
    </div>
  );
}

export default function ScoreCards({ cards, onDone }) {
  if (!cards || cards.length === 0) return null;
  return (
    <div className="score-cards">
      {cards.map(c => (
        <ScoreCardItem key={c.id} card={c} onDone={onDone} />
      ))}
    </div>
  );
}
