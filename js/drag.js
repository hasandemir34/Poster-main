import { state } from './state.js?v=6';
import { renderCells } from './grid.js?v=6';
import { openZoomModal } from './zoom.js?v=6';

export function startCellDrag(fromIdx, e, cellW, cellH) {
  const poster     = document.getElementById('poster');
  const posterRect = poster.getBoundingClientRect();
  const srcDiv     = poster.querySelector(`.cell[data-idx="${fromIdx}"]`);
  const srcRect    = srcDiv.getBoundingClientRect();

  const ghost = document.createElement('div');
  ghost.style.cssText = `
    position:fixed; pointer-events:none; z-index:9999;
    width:${srcRect.width}px; height:${srcRect.height}px;
    border-radius:6px; overflow:hidden; opacity:.82;
    box-shadow:0 12px 36px rgba(44,36,32,.22);
    outline:2.5px solid var(--accent);
  `;
  const imgEl = srcDiv.querySelector('img');
  if (imgEl) {
    const gi = document.createElement('img');
    gi.src = imgEl.src;
    gi.style.cssText = 'position:absolute; width:100%; height:100%; object-fit:cover;';
    ghost.appendChild(gi);
  }
  document.body.appendChild(ghost);

  const grabOffX = e.clientX - srcRect.left;
  const grabOffY = e.clientY - srcRect.top;
  let lastTarget = -1;
  let moved      = false;

  function hitTest(clientX, clientY) {
    const rx  = (clientX - posterRect.left) / state.posterScale;
    const ry  = (clientY - posterRect.top)  / state.posterScale;
    const col = Math.floor((rx - state.pad) / (cellW + state.gap));
    const row = Math.floor((ry - state.pad) / (cellH + state.gap));
    if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) return -1;
    return row * state.cols + col;
  }

  const onMove = ev => {
    moved = true;
    ghost.style.left = (ev.clientX - grabOffX) + 'px';
    ghost.style.top  = (ev.clientY - grabOffY) + 'px';

    const toIdx = hitTest(ev.clientX, ev.clientY);
    if (toIdx !== lastTarget) {
      poster.querySelectorAll('.cell.drag-over').forEach(d => d.classList.remove('drag-over'));
      if (toIdx >= 0 && toIdx < state.cells.length && toIdx !== fromIdx) {
        poster.querySelector(`.cell[data-idx="${toIdx}"]`)?.classList.add('drag-over');
      }
      lastTarget = toIdx;
    }
  };

  const onUp = ev => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    ghost.remove();
    poster.querySelectorAll('.cell.drag-over').forEach(d => d.classList.remove('drag-over'));

    if (!moved) { openZoomModal(fromIdx, cellW, cellH); return; }

    const toIdx = hitTest(ev.clientX, ev.clientY);
    if (toIdx >= 0 && toIdx < state.cells.length && toIdx !== fromIdx) {
      const tmp           = state.cells[fromIdx];
      state.cells[fromIdx] = state.cells[toIdx];
      state.cells[toIdx]   = tmp;
      renderCells();
    }
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  onMove(e);
}
