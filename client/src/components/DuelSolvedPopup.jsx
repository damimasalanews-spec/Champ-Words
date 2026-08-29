import { createPortal } from 'react-dom';

/**
 * DuelSolvedPopup — the "guessed the correct answer" announcement that plays
 * ~2s after a correct wall-push answer, while the wall slides. A compact
 * neon card anchored at the SAME spot as the Speed Champion popup
 * (translateY(-200px), below the header). Auto-animates in, holds, and
 * fades out (the App removes it after ~2.2s — right before the next turn
 * announcement arrives from the server).
 */
export default function DuelSolvedPopup({ name = '' }) {
  const popup = (
    <div className="duel-solved" role="status" aria-live="polite">
      <div className="duel-solved-pos">
        <div className="duel-solved-card">
          <span className="duel-solved-shine" aria-hidden="true" />
          <div className="duel-solved-msg">💪 <b>{name}</b> guessed the correct answer!</div>
          <div className="duel-solved-sub">🧱 The wall is pushed 1 step forward!</div>
        </div>
      </div>
    </div>
  );
  return createPortal(popup, document.body);
}
