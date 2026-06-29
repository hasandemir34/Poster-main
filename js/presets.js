import { supabase } from './supabase.js';

// Supabase erişilemezse kullanılacak yerel yedek (DB seed ile birebir).
export const PRESETS = [
  { id: 'classic50',  name: 'Klasik 50',  desc: '30x45 cm Poster', cols: 5,  rows: 10, gap: 4, pad: 12, orient: 'portrait', icon: '🖼️', price: 179 },
  { id: 'medium96',   name: 'Orta Grid',   desc: '40x60 cm Poster', cols: 8,  rows: 12, gap: 4, pad: 14, orient: 'portrait', icon: '📏', price: 229 },
  { id: 'giant140',   name: 'Dev Mozaik',  desc: '50x70 cm Poster', cols: 10, rows: 14, gap: 3, pad: 16, orient: 'portrait', icon: '🏔️', price: 269 },
  { id: 'a3grid49',   name: 'A3 7x7',      desc: 'A3 Poster',       cols: 7,  rows: 7,  gap: 4, pad: 18, orient: 'portrait', width: 520, height: 735, icon: 'A3', price: 189 },
  { id: 'mini35',     name: 'Mini Kolaj',  desc: '30x40 cm Poster', cols: 5,  rows: 7,  gap: 4, pad: 12, orient: 'portrait', icon: '📋', price: 149 },
  { id: 'square36',   name: 'Kare Kolaj',  desc: '50x50 cm Poster', cols: 6,  rows: 6,  gap: 5, pad: 14, orient: 'portrait', icon: '⬜', price: 199 },
  { id: 'memories49', name: 'Anı Duvarı',  desc: '40x40 cm Poster', cols: 7,  rows: 7,  gap: 4, pad: 14, orient: 'portrait', icon: '📸', price: 199 },
];

// DB satırını uygulama preset nesnesine çevirir (descr → desc).
function rowToPreset(row) {
  return {
    id: row.id,
    name: row.name,
    desc: row.descr || '',
    cols: row.cols,
    rows: row.rows,
    gap: row.gap,
    pad: row.pad,
    orient: row.orient === 'landscape' ? 'landscape' : 'portrait',
    icon: row.icon || '🖼️',
    price: Number(row.price),
    width: row.width ?? null,
    height: row.height ?? null,
    active: row.active !== false,
  };
}

/** Aktif ürünleri Supabase'ten döner; hata olursa yerel yedeğe düşer. */
export async function getActivePresets() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) {
    console.error('Ürünler alınamadı, yerel yedek kullanılıyor:', error);
    return PRESETS;
  }
  return data.map(rowToPreset);
}

/** Tek bir ürünü id ile döner (aktif/pasif fark etmeksizin). */
export async function getPresetById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    return PRESETS.find(p => p.id === id) || null;
  }
  return rowToPreset(data);
}
