import { state } from './state.js?v=5';
import { handleFiles, autoFill, renderStrip } from './photos.js?v=5';
import { renderCells, selectPreset } from './grid.js?v=5';
import { getActivePresets, getPresetById } from './presets.js?v=5';
import { zoomIn, fitPoster } from './canvas.js?v=5';
import { applyZoomScale, confirmZoom, closeZoomModal, removeZoomCell } from './zoom.js?v=5';
import { exportPoster, renderPosterToCanvas } from './export.js?v=5';
import { getCurrentUser, logout } from './auth.js?v=5';
import { setCart } from './cart.js?v=5';
import { buildDesignPdfBlob, uploadDesignPdf } from './pdf.js';
import { renderSiteNav, renderUserOnly } from './header.js?v=5';

function clearAll() {
  if (!confirm('Tüm fotoğrafları temizlemek istediğinize emin misiniz?')) return;
  state.cells = state.cells.map(() => null);
  renderCells();
  renderStrip();
}

let placingOrder = false;

async function placeOrder() {
  if (placingOrder) return;

  const preset = await getPresetById(state.presetId);
  if (!preset) { alert('Lütfen önce bir şablon seçin.'); return; }

  const hasPhoto = state.cells.some(c => c);
  if (!hasPhoto) { alert('Sipariş vermeden önce en az bir fotoğraf ekleyin.'); return; }

  const user = await getCurrentUser();
  if (!user) {
    sessionStorage.setItem('framely:authRedirect', 'checkout.html');
    window.location.href = 'auth.html';
    return;
  }

  placingOrder = true;
  const cta = document.getElementById('sidebarOrderCta');
  const prevLabel = cta?.textContent;
  if (cta) { cta.style.pointerEvents = 'none'; cta.style.opacity = '.6'; cta.textContent = 'Tasarım hazırlanıyor...'; }

  try {
    // Tasarımı blob fotoğraflar henüz canlıyken (designer'dayken) yakala.
    const canvas  = await renderPosterToCanvas();
    const pdfBlob = buildDesignPdfBlob(canvas);
    const path    = await uploadDesignPdf(pdfBlob, user.id);
    if (!path) throw new Error('upload-failed');

    setCart({
      preset: preset.id,
      presetName: preset.name,
      presetDesc: preset.desc,
      price: preset.price,
      icon: preset.icon,
      quantity: 1,
      designPdfPath: path,
    });
    window.location.href = 'checkout.html';
  } catch (err) {
    console.error('Tasarım kaydedilemedi:', err);
    alert('Tasarımınız kaydedilemedi. Lütfen tekrar deneyin.');
    placingOrder = false;
    if (cta) { cta.style.pointerEvents = ''; cta.style.opacity = ''; cta.textContent = prevLabel; }
  }
}

// ── INIT ────────────────────────────────────────────────────────
async function initApp() {
  renderSiteNav(document.getElementById('mainNav'), '', { includeAuth: false });

  const userArea = document.getElementById('designerUserArea');
  if (userArea) renderUserOnly(userArea);

  document.getElementById('fileInput')?.addEventListener('change', e => {
    handleFiles(e.target.files);
    e.target.value = '';
  });
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
