import { state } from './state.js?v=5';
import { renderCells } from './grid.js?v=5';
import { renderStrip } from './photos.js?v=5';

export function openZoomModal(cellIdx, cellW, cellH) {
  const c = state.cells[cellIdx];
  if (!c) return;
  const p = state.photos.find(x => x.id === c.photoId);
  if (!p) return;

  const zm = state.zm;
  zm.cellIdx = cellIdx;
  zm.imgW = p.w;
  zm.imgH = p.h;
  zm.cellW = cellW;
  zm.cellH = cellH;

  zm.baseScale = Math.max(cellW / p.w, cellH / p.h);
  zm.scale  = Math.max(1, c.scale);
  zm.ox     = c.offsetX;
  zm.oy     = c.offsetY;

  document.getElementById('zoomImg').src = p.src;

  const container = document.getElementById('zoomContainer');
  const aspect = cellW / cellH;
  const maxSz  = 460;
  let cw, ch;
  if (aspect >= 1) { cw = maxSz; ch = maxSz / aspect; }
  else             { ch = maxSz; cw = maxSz * aspect; }
  container.style.width  = cw + 'px';
  container.style.height = ch + 'px';

  zm.containerW   = cw;
  zm.containerH   = ch;
  zm.displayRatio = cw / cellW;
  zm.ox_disp      = zm.ox * zm.displayRatio;
  zm.oy_disp      = zm.oy * zm.displayRatio;

  const range = document.getElementById('zoomRange');
  range.value = Math.round(zm.scale * 100);
  document.getElementById('zoomScaleLabel').textContent = Math.round(zm.scale * 100) + '%';

  applyZoomImgTransform();
  document.getElementById('zoomModal').classList.add('open');
  setupModalDrag();
}

export function clampOffset() {
  const zm = state.zm;
  const coverScale = Math.max(zm.containerW / zm.imgW, zm.containerH / zm.imgH);
  const dispW = zm.imgW * coverScale * zm.scale;
  const dispH = zm.imgH * coverScale * zm.scale;
  const maxOx = (dispW - zm.containerW) / 2;
  const maxOy = (dispH - zm.containerH) / 2;
  zm.ox_disp = Math.max(-maxOx, Math.min(maxOx, zm.ox_disp));
  zm.oy_disp = Math.max(-maxOy, Math.min(maxOy, zm.oy_disp));
}

export function applyZoomImgTransform() {
  clampOffset();
  const zm  = state.zm;
  const img = document.getElementById('zoomImg');
  const coverScale = Math.max(zm.containerW / zm.imgW, zm.containerH / zm.imgH);
  const dispW = zm.imgW * coverScale * zm.scale;
  const dispH = zm.imgH * coverScale * zm.scale;
  img.style.width  = dispW + 'px';
  img.style.height = dispH + 'px';
  img.style.left   = ((zm.containerW - dispW) / 2 + zm.ox_disp) + 'px';
  img.style.top    = ((zm.containerH - dispH) / 2 + zm.oy_disp) + 'px';
}

export function applyZoomScale() {
  const zm = state.zm;
  zm.scale = document.getElementById('zoomRange').value / 100;
  document.getElementById('zoomScaleLabel').textContent = Math.round(zm.scale * 100) + '%';
  applyZoomImgTransform();
}

function setupModalDrag() {
  const img  = document.getElementById('zoomImg');
  const zm   = state.zm;
  const drag = state.drag;

  img.onmousedown = e => {
    drag.active = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.origOx = zm.ox_disp;
    drag.origOy = zm.oy_disp;
    img.classList.add('grabbing');
    e.preventDefault();
  };

  document.onmousemove = e => {
    if (!drag.active) return;
    zm.ox_disp = drag.origOx + (e.clientX - drag.startX);
    zm.oy_disp = drag.origOy + (e.clientY - drag.startY);
    applyZoomImgTransform();
  };

  document.onmouseup = () => {
    drag.active = false;
    document.getElementById('zoomImg').classList.remove('grabbing');
  };
}

export function removeZoomCell() {
  const zm = state.zm;
  if (zm.cellIdx < 0) return;
  state.cells[zm.cellIdx] = null;
  closeZoomModal();
  renderCells();
}

export function confirmZoom() {
  const zm = state.zm;
  if (zm.cellIdx < 0) return;
  state.cells[zm.cellIdx].scale   = zm.scale;
  state.cells[zm.cellIdx].offsetX = zm.ox_disp / zm.displayRatio;
  state.cells[zm.cellIdx].offsetY = zm.oy_disp / zm.displayRatio;
  closeZoomModal();
  renderCells();
}

export function closeZoomModal() {
  document.getElementById('zoomModal').classList.remove('open');
  document.onmousemove = null;
  document.onmouseup  = null;
}
