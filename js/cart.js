import { supabase } from './supabase.js';

const CART_KEY = 'framely:cart';

// ── SEPET (client-side geçici veri — localStorage'da kalır) ──────────────────
export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || 'null');
}

export function setCart(item) {
  localStorage.setItem(CART_KEY, JSON.stringify(item));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

// ── DB SATIRI ↔ UYGULAMA NESNESİ ─────────────────────────────────────────────
function rowToOrder(row) {
  return {
    id:           row.id,
    userId:       row.user_id,
    userName:     row.user_name,
    userEmail:    row.user_email,
    preset:       row.preset_id,
    presetName:   row.preset_name,
    presetDesc:   row.preset_desc,
    icon:         row.icon,
    quantity:     row.quantity,
    price:        Number(row.price),
    total:        Number(row.total),
    address:      row.address || {},
    cardLast4:    row.card_last4,
    status:       row.status,
    designPdfPath: row.design_pdf_path,
    createdAt:    row.created_at,
  };
}

// ── SİPARİŞLER (Supabase) ────────────────────────────────────────────────────
/** Geçerli kullanıcının siparişlerini döner (RLS sayesinde sadece kendisininki). */
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Siparişler alınamadı:', error);
    return [];
  }
  return (data || []).map(rowToOrder);
}

export async function createOrder({ user, cart, address, payment }) {
  const quantity = cart.quantity || 1;
  const row = {
    id:              'FRM-' + Date.now(),
    user_id:         user.id,
    user_name:       user.name,
    user_email:      user.email,
    preset_id:       cart.preset,
    preset_name:     cart.presetName,
    preset_desc:     cart.presetDesc,
    icon:            cart.icon || null,
    quantity,
    price:           cart.price,
    total:           cart.price * quantity,
    address,
    card_last4:      payment.cardNumber.slice(-4),
    status:          'Hazırlanıyor',
    design_pdf_path: cart.designPdfPath || null,
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Sipariş oluşturulamadı:', error);
    throw new Error('Sipariş kaydedilemedi. Lütfen tekrar deneyin.');
  }

  clearCart();
  return rowToOrder(data);
}
