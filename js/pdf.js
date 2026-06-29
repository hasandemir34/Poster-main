import { jsPDF } from 'https://esm.sh/jspdf@2';
import { supabase, DESIGN_BUCKET } from './supabase.js';

/**
 * Verilen canvas'tan posterin tamamını tek sayfaya gömülü bir PDF Blob'u üretir.
 * Sayfa boyutu, posterin en-boy oranına göre ayarlanır (kırpma olmaz).
 * @param {HTMLCanvasElement} canvas
 * @returns {Blob}
 */
export function buildDesignPdfBlob(canvas) {
  // JPEG: PNG'ye göre çok daha küçük dosya; 0.9 kalite baskı için yeterli.
  const jpeg = canvas.toDataURL('image/jpeg', 0.9);

  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: [canvas.width, canvas.height],
  });

  doc.addImage(jpeg, 'JPEG', 0, 0, canvas.width, canvas.height);
  return doc.output('blob');
}

/**
 * Tasarım PDF'ini Storage'a yükler ve depolanan path'i döner.
 * Sipariş henüz oluşmadığı için "draft-" önekli geçici dosya adı kullanılır;
 * dosya kullanıcının uid klasörü altına yazılır (RLS bunu zorunlu kılar).
 * @param {Blob} pdfBlob
 * @param {string} userId
 * @returns {Promise<string|null>} storage path veya hata durumunda null
 */
export async function uploadDesignPdf(pdfBlob, userId) {
  const path = `${userId}/draft-${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from(DESIGN_BUCKET)
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false });

  if (error) {
    console.error('Tasarım PDF yüklenemedi:', error);
    return null;
  }
  return path;
}

/**
 * Storage path'inden indirilebilir geçici (signed) bir URL üretir.
 * @param {string} path
 * @param {number} expiresIn saniye
 * @returns {Promise<string|null>}
 */
export async function getDesignPdfUrl(path, expiresIn = 60) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(DESIGN_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Signed URL üretilemedi:', error);
    return null;
  }
  return data.signedUrl;
}
