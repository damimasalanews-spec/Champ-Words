import { useState, useEffect, useRef, useCallback } from 'react';
import PlayerList from './PlayerList';

function isAdjacent(r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return false;
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

const CELL_SZ = 48;
const GAP = 7;
const SPACING = CELL_SZ + GAP;

export default function Game({ room, socket, showToast, onChatToggle, chatOpen }) {
  const puzzle = room.puzzle;
  const grid = puzzle?.grid || [];
  const targetSlots = puzzle?.targetSlots || [];
  const solvedPct = puzzle?.solvedPct || '0.0';

  const [dragPath, setDragPath] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fallingWord, setFallingWord] = useState(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [revealedLetters, setRevealedLetters] = useState({});
  const gridRef = useRef(null);
  const lastCellRef = useRef(null); // prevents re-triggering same cell

  const myPlayer = room.players?.find(p => p.id === socket.id);

  useEffect(() => {
    setDragPath([]);
    setIsDragging(false);
    setFallingWord(null);
    setRevealedLetters({});
    lastCellRef.current = null;
  }, [room.round]);

  // ── Drag handlers with improved sensitivity ──────────────────────────
  const cellUnderPoint = (clientX, clientY) => {
    if (!gridRef.current) return null;
    const cells = gridRef.current.querySelectorAll('.grid-cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      // Shrink the hit area slightly for better control
      const margin = 3;
      if (clientX >= rect.left + margin && clientX <= rect.right - margin &&
          clientY >= rect.top + margin && clientY <= rect.bottom - margin) {
        return { r: parseInt(cell.dataset.row), c: parseInt(cell.dataset.col) };
      }
    }
    return null;
  };

  const startDrag = (r, c, e) => {
    if (submitting) return;
    e.preventDefault();
    setIsDragging(true);
    setDragPath([[r, c]]);
    lastCellRef.current = `${r},${c}`;
  };

  const continueDrag = useCallback((e) => {
    if (!isDragging || submitting) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const cell = cellUnderPoint(clientX, clientY);
    if (!cell) return;

    const cellKey = `${cell.r},${cell.c}`;
    // Prevent re-triggering the same cell
    if (cellKey === lastCellRef.current) return;
    lastCellRef.current = cellKey;

    const last = dragPath[dragPath.length - 1];
    if (cell.r === last[0] && cell.c === last[1]) return;

    if (!isAdjacent(last[0], last[1], cell.r, cell.c)) return;

    // Going backwards: truncate
    const existingIdx = dragPath.findIndex(([pr, pc]) => pr === cell.r && pc === cell.c);
    if (existingIdx >= 0) {
      setDragPath(prev => prev.slice(0, existingIdx + 1));
      return;
    }

    if (dragPath.length >= 8) return;
    setDragPath(prev => [...prev, [cell.r, cell.c]]);
  }, [isDragging, dragPath, submitting]);

  const endDrag = useCallback(() => {
    if (!isDragging || submitting) return;
    setIsDragging(false);
    lastCellRef.current = null;

    if (dragPath.length < 3) { setDragPath([]); return; }

    const word = dragPath.map(([r, c]) => grid[r][c]).join('');
    setSubmitting(true);

    socket.emit('submit_word', { roomId: room.id, word, path: dragPath }, (res) => {
      setSubmitting(false);
      if (res.ok) {
        const slotIdx = targetSlots.findIndex(s => s.length === word.length && !s.foundBy);
        setFallingWord({ word, path: dragPath, slotIdx: slotIdx >= 0 ? slotIdx : 0 });
        setTimeout(() => setFallingWord(null), 800);
        showToast(`Found: ${word.toUpperCase()}!`, 'success');
      } else {
        showToast(res.error);
      }
      setDragPath([]);
    });
  }, [isDragging, dragPath, submitting, grid, room.id, socket, showToast, targetSlots]);

  useEffect(() => {
    const handleMove = (e) => continueDrag(e);
    const handleUp = () => endDrag();
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [continueDrag, endDrag]);

  const builtWord = dragPath.map(([r, c]) => grid[r]?.[c] || '').join('');

  return (
    <div className="game-area">
      <div className="game-header">
        <span className="round-info">Round <span>{room.round}</span> / {room.totalRounds}</span>
        <PlayerList players={room.players} host={room.host} myId={socket.id} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {myPlayer?.wordsFound || 0} / {targetSlots.length} found
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isDragging && builtWord && (
            <span className="drag-word-display">{builtWord.toUpperCase()}</span>
          )}
          <button className="chat-toggle" onClick={onChatToggle} style={{ fontSize: 10 }}>
            {chatOpen ? 'Close Chat' : 'Chat'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid-drag-wrapper" ref={gridRef}>
        <div className="grid-container" style={{ position: 'relative' }}>
          <svg className="drag-path-svg">
            {dragPath.length > 1 && dragPath.map(([r, c], i) => {
              if (i === 0) return null;
              const [pr, pc] = dragPath[i - 1];
              return (
                <line key={`l${i}`}
                  x1={pc * SPACING + CELL_SZ / 2}
                  y1={pr * SPACING + CELL_SZ / 2}
                  x2={c * SPACING + CELL_SZ / 2}
                  y2={r * SPACING + CELL_SZ / 2}
                  stroke="var(--green)" strokeWidth="4" strokeLinecap="round" opacity="0.85"
                />
              );
            })}
          </svg>

          {grid.map((row, r) => (
            <div key={r} className="grid-row">
              {row.map((ch, c) => {
                const sel = dragPath.some(([pr, pc]) => pr === r && pc === c);
                const isLast = dragPath.length > 0 &&
                  dragPath[dragPath.length - 1][0] === r &&
                  dragPath[dragPath.length - 1][1] === c;
                return (
                  <div key={c} className={`grid-cell ${sel ? 'selected' : ''} ${isLast ? 'last' : ''}`}
                    data-row={r} data-col={c}
                    onMouseDown={(e) => startDrag(r, c, e)}
                    onTouchStart={(e) => startDrag(r, c, e)}
                  >
                    {ch.toUpperCase()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {fallingWord && (
          <div className="falling-word">{fallingWord.word.toUpperCase()}</div>
        )}
      </div>

      <div className="solved-text">Solved by {solvedPct}% of the players</div>

      {/* Brackets */}
      <div className="brackets-section">
        {targetSlots.map((slot, si) => {
          const found = slot.foundBy !== null;
          const foundByMe = slot.foundBy === socket.id;
          const finder = found ? room.players.find(p => p.id === slot.foundBy) : null;
          const hintReveal = !found ? (revealedLetters[si] || '') : '';
          const isHinted = hintReveal.length > 0;

          return (
            <div key={si} className={`bracket-row ${fallingWord && fallingWord.slotIdx === si ? 'bracket-target' : ''}`}>
              {Array.from({ length: slot.length }, (_, i) => {
                let letter = null;
                if (found) letter = (slot.word || '?')[i]?.toUpperCase();
                else if (i < hintReveal.length) letter = hintReveal[i].toUpperCase();

                return (
                  <div key={i} className={`bracket-box ${found ? (foundByMe ? 'found-me' : 'found-other') : ''} ${letter && !found ? 'hint-revealed' : ''}`}>
                    {letter && <span className="bracket-letter">{letter}</span>}
                  </div>
                );
              })}
              {found && (
                <span className="bracket-finder" style={{ color: foundByMe ? 'var(--green)' : 'var(--yellow)', marginLeft: 10, fontSize: 11, fontWeight: 600 }}>
                  {finder?.name}
                </span>
              )}
              {isHinted && !found && (
                <span style={{ marginLeft: 10, fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>
                  {hintReveal.length}/{slot.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', minHeight: 28, marginTop: 4 }}>
        {dragPath.length > 0 && !submitting && (
          <button className="btn btn-small btn-danger" onClick={() => { setDragPath([]); setIsDragging(false); lastCellRef.current = null; }}>
            Clear
          </button>
        )}
      </div>

      <div className="bottom-bar">
        <button className="help-btn" title="Drag across adjacent letters to form words">
          <span>?</span>
        </button>
        <button className="hint-btn" onClick={() => {
          if (typeof hintsLeft === 'number' && hintsLeft <= 0) { showToast('No hints left!', 'error'); return; }
          socket.emit('use_hint', { roomId: room.id }, (res) => {
            if (!res.ok) { showToast(res.error); return; }
            setHintsLeft(res.hintsLeft);
            setRevealedLetters(prev => ({ ...prev, [res.slotIndex]: res.revealed }));
            if (res.startCell) {
              setDragPath([[res.startCell[0], res.startCell[1]]]);
              lastCellRef.current = `${res.startCell[0]},${res.startCell[1]}`;
            }
            showToast(
              `Hint: "${res.revealed.toUpperCase()}${'_'.repeat(res.wordLength - res.revealed.length)}" (${res.hintsLeft} left)`,
              'success'
            );
          });
        }} disabled={typeof hintsLeft === 'number' && hintsLeft <= 0}>
          <span className="hint-icon">💡</span>
          Hint
          <span className="hint-count">{hintsLeft === '∞' || hintsLeft === Infinity ? '∞' : hintsLeft}</span>
        </button>
      </div>
    </div>
  );
}
