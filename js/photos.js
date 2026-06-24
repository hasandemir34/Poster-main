import { state } from './state.js?v=5';
import { renderCells } from './grid.js?v=5';

function loadPhotoFile(f) {
  return new Promise(resolve => {
    const objectURL = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      resolve({
        id: Date.now() + Math.random(),
        src: objectURL,
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      resolve(null);
    };
    img.src = objectURL;
  });
}

function placePhotoInNextEmpty(photoId) {
  const idx = state.cells.findIndex(c => !c);
  if (idx === -1) return false;
  state.cells[idx] = { photoId, scale: 1, offsetX: 0, offsetY: 0 };
  return true;
}

export async function handleFiles(files, options = {}) {
  const { placeOnCanvas = true } = options;
  const list = Array.from(files || []).filter(f => f.type && f.type.startsWith('image/'));
  if (list.length === 0) return;

  const loaded = (await Promise.all(list.map(loadPhotoFile))).filter(Boolean);

  loaded.forEach(photo => {
    state.photos.push(photo);
    if (placeOnCanvas) placePhotoInNextEmpty(photo.id);
  });

  renderCells();
  renderStrip();
}

export function renderStrip() {
  const strip = document.getElementById('photoStrip');
  document.getElementById('photoCount').textContent = state.photos.length;
  strip.innerHTML = '';

  state.photos.forEach((p, i) => {
    const usedCount = state.cells.filter(c => c && c.photoId === p.id).length;
    const div = document.createElement('div');
    div.className = 'strip-thumb' + (usedCount ? ' used' : '');
    div.innerHTML = `
      <img src="${p.src}" draggable="false">
      <button class="del-btn">✕</button>
      ${usedCount ? `<span class="used-badge">${usedCount}</span>` : ''}
    `;
    div.querySelector('.del-btn').addEventListener('click', e => {
      e.stopPropagation();
      removePhoto(i);
    });
    div.addEventListener('click', () => addPhotoToNextEmpty(p.id));
    strip.appendChild(div);
  });
}

export function removePhoto(idx) {
  const id = state.photos[idx].id;
  state.photos.splice(idx, 1);
  state.cells = state.cells.map(c => (c && c.photoId === id ? null : c));
  renderStrip();
  renderCells();
}

export function addPhotoToNextEmpty(photoId) {
  if (!placePhotoInNextEmpty(photoId)) return;
  renderCells();
  renderStrip();
}

export function autoFill() {
  let pi = 0;
  for (let i = 0; i < state.cells.length; i++) {
    if (!state.cells[i] && pi < state.photos.length) {
      state.cells[i] = { photoId: state.photos[pi++].id, scale: 1, offsetX: 0, offsetY: 0 };
    }
  }
  renderCells();
  renderStrip();
}
