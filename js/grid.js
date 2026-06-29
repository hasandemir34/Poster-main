import { state } from './state.js?v=6';
import { renderStrip } from './photos.js?v=6';
import { openZoomModal } from './zoom.js?v=6';
import { startCellDrag } from './drag.js?v=6';
import { getPresetById } from './presets.js?v=6';



export async function selectPreset(presetId) {
  const preset = await getPresetById(presetId);
  if (!preset) return;

  state.cols = preset.cols;
  state.rows = preset.rows;
  state.gap  = preset.gap;
  state.pad  = preset.pad;
  state.orient = preset.orient;
  state.posterWidth = preset.width ?? null;
  state.posterHeight = preset.height ?? null;
  state.activePreset = presetId;
  state.presetId = presetId;

  updateGrid();
}

// ── GRID ────────────────────────────────────────────────────────
export function updateGrid() {
  const totalCells = state.cols * state.rows;
  while (state.cells.length < totalCells) state.cells.push(null);
  state.cells = state.cells.slice(0, totalCells);

  const baseW   = state.posterWidth ?? (state.orient === 'landscape' ? 740 : 520);
  const cellW   = (baseW - state.pad * 2 - state.gap * (state.cols - 1)) / state.cols;
  const cellH   = cellW;
  const posterW = baseW;
  const gridH   = state.pad * 2 + state.rows * cellH + state.gap * (state.rows - 1);
  const posterH = state.posterHeight ?? gridH;

  const poster = document.getElementById('poster');
  poster.style.width  = posterW + 'px';
  poster.style.height = posterH + 'px';

  const grid = document.getElementById('posterGrid');
  grid.style.display              = 'grid';
  grid.style.gridTemplateColumns  = `repeat(${state.cols}, 1fr)`;
  grid.style.gridTemplateRows     = `repeat(${state.rows}, 1fr)`;
  grid.style.gap                  = state.gap + 'px';
  grid.style.padding              = state.pad + 'px';
  grid.style.width                = '100%';
  grid.style.height               = gridH + 'px';
  grid.style.marginTop            = Math.max((posterH - gridH) / 2, 0) + 'px';
  grid.style.marginBottom         = Math.max((posterH - gridH) / 2, 0) + 'px';

  renderCells();
}



export function renderCells() {
  const grid    = document.getElementById('posterGrid');

  const posterW = state.posterWidth ?? (state.orient === 'landscape' ? 740 : 520);
  const cellW   = (posterW - state.pad * 2 - state.gap * (state.cols - 1)) / state.cols;
  const cellH   = cellW;

  grid.innerHTML = '';

  for (let i = 0; i < state.cells.length; i++) {
    const c   = state.cells[i];
    const div = document.createElement('div');
    div.className = 'cell ' + (c ? 'filled' : 'empty');
    if (i === state.selectedCell) div.classList.add('selected');
    div.dataset.idx = i;

    if (c) {
      const p = state.photos.find(x => x.id === c.photoId);
      if (p) {
        const img        = document.createElement('img');
        const coverScale = Math.max(cellW / p.w, cellH / p.h);
        const dispW      = Math.ceil(p.w * coverScale * c.scale);
        const dispH      = Math.ceil(p.h * coverScale * c.scale);
        img.src                 = p.src;
        img.style.width         = dispW + 'px';
        img.style.height        = dispH + 'px';
        img.style.left          = Math.floor((cellW - dispW) / 2 + c.offsetX) + 'px';
        img.style.top           = Math.floor((cellH - dispH) / 2 + c.offsetY) + 'px';
        img.style.pointerEvents = 'none';
        img.draggable           = false;
        div.appendChild(img);

        div.style.cursor = 'pointer';
        div.addEventListener('mousedown', e => {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          let dragging = false;

          const onMove = mv => {
            if (dragging) return;
            if (Math.abs(mv.clientX - startX) > 5 || Math.abs(mv.clientY - startY) > 5) {
              dragging = true;
              cleanup();
              startCellDrag(i, mv, cellW, cellH);
            }
          };

          const onUp = () => {
            cleanup();
            if (!dragging) openZoomModal(i, cellW, cellH);
          };

          const cleanup = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }
    } else {
      const fileInput    = document.createElement('input');
      fileInput.type     = 'file';
      fileInput.accept   = 'image/*';
      fileInput.style.display = 'none';
      const cellIdx = i;

      fileInput.addEventListener('change', () => {
        if (!fileInput.files[0]) return;
        const objectURL = URL.createObjectURL(fileInput.files[0]);
        const img = new Image();
        img.onload = () => {
          const p = {
            id:  Date.now() + Math.random(),
            src: objectURL,
            w:   img.naturalWidth,
            h:   img.naturalHeight,
          };
          state.photos.push(p);
          state.cells[cellIdx] = { photoId: p.id, scale: 1, offsetX: 0, offsetY: 0 };
          renderStrip();
          renderCells();
        };
        img.src = objectURL;
      });

      const icon       = document.createElement('span');
      icon.className   = 'cell-icon';
      icon.textContent = '＋';
      div.appendChild(fileInput);
      div.appendChild(icon);
      div.addEventListener('click', () => fileInput.click());
    }

    grid.appendChild(div);
  }

  state.selectedCell = -1;
}
