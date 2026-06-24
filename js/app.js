import { state } from './state.js?v=5';
import { handleFiles, autoFill, renderStrip } from './photos.js?v=5';
import { renderCells, selectPreset } from './grid.js?v=5';
import { getActivePresets, getPresetById } from './presets.js?v=5';
import { zoomIn, fitPoster } from './canvas.js?v=5';
import { applyZoomScale, confirmZoom, closeZoomModal, removeZoomCell } from './zoom.js?v=5';
import { exportPoster } from './export.js?v=5';
import { getCurrentUser, logout } from './auth.js?v=5';
import { setCart } from './cart.js?v=5';
import { renderAuthNav } from './header.js?v=5';

function clearAll() {
  if (!confirm('Tüm fotoğrafları temizlemek istediğinize emin misiniz?')) return;
  state.cells = state.cells.map(() => null);
  renderCells();
  renderStrip();
}

function placeOrder() {
  const preset = getPresetById(state.presetId);
  if (!preset) { alert('Lütfen önce bir şablon seçin.'); return; }

  const user = getCurrentUser();
  if (!user) {
    sessionStorage.setItem('framely:authRedirect', 'checkout.html');
    window.location.href = 'auth.html';
    return;
  }

  setCart({
    preset: preset.id,
    presetName: preset.name,
    presetDesc: preset.desc,
    price: preset.price,
    icon: preset.icon,
    quantity: 1,
  });
  window.location.href = 'checkout.html';
}

// ── INIT ────────────────────────────────────────────────────────
function initApp() {
  const userArea = document.getElementById('designerUserArea');
  if (userArea) renderAuthNav(userArea);

  document.getElementById('fileInput')?.addEventListener('change', e =>
    handleFiles(e.target.files)
  );
  document.getElementById('zoomRange')?.addEventListener('input', applyZoomScale);

  const actionMap = {
    'clear':           clearAll,
    'autofill':        autoFill,
    'export':          exportPoster,
    'canvas-zoom-in':  zoomIn,
    'canvas-fit':      fitPoster,
    'zoom-cancel':     closeZoomModal,
    'zoom-remove':     removeZoomCell,
    'zoom-confirm':    confirmZoom,
    'order':           placeOrder,
  };

  document.querySelectorAll('[data-action]').forEach(el =>
    el.addEventListener('click', () => actionMap[el.dataset.action]?.())
  );

  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  const urlPreset   = new URLSearchParams(window.location.search).get('preset');
  const savedPreset = sessionStorage.getItem('framely:selectedPreset');
  const activePresets = getActivePresets();

  const selectedPreset = activePresets.find(p => p.id === urlPreset)?.id
    ?? activePresets.find(p => p.id === savedPreset)?.id;

  if (selectedPreset) {
    startWithPreset(selectedPreset);
  } else {
    renderIntroGrid();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ── INTRO SCREEN ────────────────────────────────────────────────
function renderIntroGrid() {
  const grid = document.getElementById('introGrid');
  if (!grid) return;

  getActivePresets().forEach(p => {
    const card = document.createElement('div');
    card.className = 'intro-card';
    card.innerHTML = `
      <div class="intro-card-icon">${p.icon}</div>
      <div class="intro-card-name">${p.name}</div>
      <div class="intro-card-desc">${p.desc}</div>
      <div class="intro-card-cells">${p.cols * p.rows} Fotoğraf</div>
      <div class="intro-card-price">${p.price} TL</div>
    `;
    card.addEventListener('click', () => startWithPreset(p.id));
    grid.appendChild(card);
  });
}

function startWithPreset(presetId) {
  const introScreen = document.getElementById('introScreen');
  const app = document.querySelector('.app');

  if (!introScreen || !app) return;

  sessionStorage.setItem('framely:selectedPreset', presetId);
  state.presetId = presetId;
  introScreen.classList.add('hidden');
  app.style.display = 'flex';

  selectPreset(presetId);

  const preset = getPresetById(presetId);
  if (preset) {
    const cta   = document.getElementById('sidebarOrderCta');
    const label = document.getElementById('ctaPriceLabel');
    if (cta)   cta.style.display = 'block';
    if (label) label.textContent = preset.price + ' TL · ' + preset.name;
  }

  setTimeout(() => { fitPoster(); }, 80);
}
