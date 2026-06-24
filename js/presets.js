const PRODUCTS_KEY = 'framely:products';

export const PRESETS = [
  { id: 'classic50',  name: 'Klasik 50',  desc: '30x45 cm Poster', cols: 5,  rows: 10, gap: 4, pad: 12, orient: 'portrait', icon: '🖼️', price: 179 },
  { id: 'medium96',   name: 'Orta Grid',   desc: '40x60 cm Poster', cols: 8,  rows: 12, gap: 4, pad: 14, orient: 'portrait', icon: '📏', price: 229 },
  { id: 'giant140',   name: 'Dev Mozaik',  desc: '50x70 cm Poster', cols: 10, rows: 14, gap: 3, pad: 16, orient: 'portrait', icon: '🏔️', price: 269 },
  { id: 'a3grid49',   name: 'A3 7x7',      desc: 'A3 Poster',       cols: 7,  rows: 7,  gap: 4, pad: 18, orient: 'portrait', width: 520, height: 735, icon: 'A3', price: 189 },
  { id: 'mini35',     name: 'Mini Kolaj',  desc: '30x40 cm Poster', cols: 5,  rows: 7,  gap: 4, pad: 12, orient: 'portrait', icon: '📋', price: 149 },
  { id: 'square36',   name: 'Kare Kolaj',  desc: '50x50 cm Poster', cols: 6,  rows: 6,  gap: 5, pad: 14, orient: 'portrait', icon: '⬜', price: 199 },
  { id: 'memories49', name: 'Anı Duvarı',  desc: '40x40 cm Poster', cols: 7,  rows: 7,  gap: 4, pad: 14, orient: 'portrait', icon: '📸', price: 199 },
];

/**
 * Returns the active presets from localStorage (managed by admin panel).
 * Falls back to DEFAULT_PRESETS if nothing is stored yet.
 * Only returns presets where active !== false.
 */
export function getActivePresets() {
  try {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length > 0) {
        return list.filter(p => p.active !== false);
      }
    }
  } catch (e) {}
  return PRESETS;
}

/**
 * Returns a single preset by ID from the active product list.
 */
export function getPresetById(id) {
  try {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list)) {
        const found = list.find(p => p.id === id);
        if (found) return found;
      }
    }
  } catch (e) {}
  return PRESETS.find(p => p.id === id) || null;
}
