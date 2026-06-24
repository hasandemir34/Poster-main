import { state } from './state.js?v=5';

// ── MATBAA ÖLÇEĞİ ──────────────────────────────────────────────
// Ekrandaki poster boyutları CSS-piksel cinsindendir.
// Matbaaya uygun çıktı için 6× büyütme uygulanır (≈ 300 DPI).
const PRINT_SCALE = 6;

/**
 * Tüm fotoğrafları önceden yükler ve bitmesini bekler.
 * blob: URL'ler zaten tarayıcıda cache'lenmiş olduğundan hızlı döner.
 */
function preloadImages() {
  const unique = new Map();
  state.cells.forEach(c => {
    if (!c) return;
    const p = state.photos.find(x => x.id === c.photoId);
    if (p && !unique.has(p.id)) unique.set(p.id, p.src);
  });

  const promises = [];
  unique.forEach((src, id) => {
    promises.push(
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve({ id, img });
        img.onerror = () => reject(new Error(`Görsel yüklenemedi: ${src}`));
        img.src = src;
      })
    );
  });
  return Promise.all(promises);
}

/**
 * HTML5 Canvas kullanarak posteri yüksek çözünürlükte çizer ve PNG indirir.
 * html2canvas bağımlılığı tamamen kaldırılmıştır.
 */
export async function exportPoster() {
  // ── 1. Ekrandaki poster geometrisini hesapla (grid.js mantığıyla birebir) ─
  const baseW   = state.posterWidth ?? (state.orient === 'landscape' ? 740 : 520);
  const cellW   = (baseW - state.pad * 2 - state.gap * (state.cols - 1)) / state.cols;
  const cellH   = cellW;
  const posterW = baseW;
  const gridH   = state.pad * 2 + state.rows * cellH + state.gap * (state.rows - 1);
  const posterH = state.posterHeight ?? gridH;
  const gridY   = Math.max((posterH - gridH) / 2, 0);

  // ── 2. Yüksek çözünürlük canvas oluştur ──────────────────────
  const S = PRINT_SCALE;
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(posterW * S);
  canvas.height = Math.round(posterH * S);
  const ctx = canvas.getContext('2d');

  // Arka plan (beyaz)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── 3. Fotoğrafları önceden yükle ─────────────────────────────
  let imgMap;
  try {
    const loaded = await preloadImages();
    imgMap = new Map(loaded.map(l => [l.id, l.img]));
  } catch (err) {
    alert('Dışa aktarma sırasında bir görsel yüklenemedi.');
    console.error(err);
    return;
  }

  // ── 4. Hücreleri çiz ──────────────────────────────────────────
  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i];
    if (!c) continue;

    const photo = state.photos.find(x => x.id === c.photoId);
    if (!photo) continue;

    const img = imgMap.get(photo.id);
    if (!img) continue;

    // Hücre konumu (ekran piksel)
    const col = i % state.cols;
    const row = Math.floor(i / state.cols);
    const cellX = state.pad + col * (cellW + state.gap);
    const cellY = gridY + state.pad + row * (cellH + state.gap);

    // Cover-fit ölçekleme (renderCells ile aynı mantık)
    const coverScale = Math.max(cellW / photo.w, cellH / photo.h);
    const dispW = photo.w * coverScale * c.scale;
    const dispH = photo.h * coverScale * c.scale;

    // Görsel konumu (hücre merkezine göre + kullanıcı offset)
    const imgX = cellX + (cellW - dispW) / 2 + c.offsetX;
    const imgY = cellY + (cellH - dispH) / 2 + c.offsetY;

    // Hücre sınırlarına clip uygula
    ctx.save();
    ctx.beginPath();
    ctx.rect(cellX * S, cellY * S, cellW * S, cellH * S);
    ctx.clip();

    // Görseli çiz
    ctx.drawImage(
      img,
      Math.round(imgX * S),
      Math.round(imgY * S),
      Math.round(dispW * S),
      Math.round(dispH * S)
    );
    ctx.restore();
  }

  // ── 5. PNG olarak indir ───────────────────────────────────────
  canvas.toBlob(blob => {
    if (!blob) return;
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'poster.png';
    link.href     = url;
    link.click();
    // İndirme başladıktan sonra blob URL'yi serbest bırak
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}
