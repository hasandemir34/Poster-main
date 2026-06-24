import { getActivePresets } from './presets.js?v=5';
import { renderAuthNav } from './header.js?v=5';

renderAuthNav(document.getElementById('mainNav'));

const grid = document.getElementById('templateGrid');

function isSquarePreset(preset) {
  const m = preset.desc.match(/(\d+)x(\d+)\s*cm/i);
  return m ? m[1] === m[2] : false;
}

function renderTemplates() {
  if (!grid) return;

  const presets = getActivePresets();
  grid.innerHTML = '';

  if (presets.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:16px">📦</div>
      <div style="font-size:18px;font-weight:600">Şu anda aktif şablon yok</div>
      <div style="margin-top:8px;font-size:14px">Lütfen daha sonra tekrar deneyin.</div>
    </div>`;
    return;
  }

  presets.forEach((preset) => {
    const square = isSquarePreset(preset);
    const artClass = `template-preview-art${square ? ' is-square' : ''}`;
    const orientLabel = preset.orient === 'landscape' ? 'Yatay' : (square ? 'Kare' : 'Dikey');

    const card = document.createElement('a');
    card.className = 'template-card';
    card.href = `designer.html?preset=${encodeURIComponent(preset.id)}`;
    card.setAttribute('aria-label', `${preset.name} şablonu ile tasarlamaya başla`);

    card.innerHTML = `
      <div class="template-preview">
        <div class="${artClass}" style="--cols:${preset.cols};--rows:${preset.rows}"></div>
      </div>
      <div class="template-body">
        <div class="template-topline">
          <h2 class="template-name">${preset.name}</h2>
          <span class="template-count">${preset.cols * preset.rows} fotoğraf</span>
        </div>
        <p class="template-desc">${preset.desc} için dengeli, baskıya hazır grid düzeni.</p>
        <div class="template-meta">
          <span class="template-pill">${preset.cols} sütun</span>
          <span class="template-pill">${preset.rows} satır</span>
          <span class="template-pill">${orientLabel}</span>
        </div>
        <div class="template-footer">
          <span class="template-price">${preset.price} TL</span>
          <span class="template-action">Bu şablonla başla →</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      sessionStorage.setItem('framely:selectedPreset', preset.id);
    });

    grid.appendChild(card);
  });
}

renderTemplates();
