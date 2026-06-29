import { supabase } from './supabase.js';

// ── YARDIMCILAR ──────────────────────────────────────────────────────────────
function siteBaseUrl() {
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
}

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Kullanıcı'),
  };
}

// ── OTURUM ────────────────────────────────────────────────────────────────────
/** Geçerli kullanıcıyı döner ({id,name,email}) veya null. */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return mapUser(data?.session?.user || null);
}

export async function isLoggedIn() {
  const { data } = await supabase.auth.getSession();
  return !!data?.session;
}

/** Giriş gerektiren sayfalarda kullanılır. Giriş yoksa auth.html'e yönlendirir. */
export async function requireAuth(redirectPath) {
  if (await isLoggedIn()) return true;
  sessionStorage.setItem('framely:authRedirect', redirectPath || window.location.href);
  window.location.href = 'auth.html';
  return false;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

/** Geçerli kullanıcının admin olup olmadığını profiles tablosundan kontrol eder. */
export async function isAdmin() {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .single();
  if (error) return false;
  return data?.is_admin === true;
}

// ── KAYIT / GİRİŞ ───────────────────────────────────────────────────────────
export async function signUp(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteBaseUrl()}auth.html?confirmed=1`,
    },
  });
  if (error) return { ok: false, error: translateError(error.message) };
  return { ok: true, data };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: translateError(error.message) };
  return { ok: true, user: mapUser(data.user) };
}

export async function resendSignupEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${siteBaseUrl()}auth.html?confirmed=1` },
  });
  if (error) return { ok: false, error: translateError(error.message) };
  return { ok: true };
}

// ── ŞİFRE SIFIRLAMA ──────────────────────────────────────────────────────────
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteBaseUrl()}reset.html`,
  });
  if (error) return { ok: false, error: translateError(error.message) };
  return { ok: true };
}

/** reset.html'de recovery session açıkken yeni şifreyi kaydeder. */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: translateError(error.message) };
  return { ok: true };
}

// ── HATA ÇEVİRİSİ ────────────────────────────────────────────────────────────
function translateError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (m.includes('email not confirmed'))       return 'E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.';
  if (m.includes('user already registered'))    return 'Bu e-posta adresi zaten kayıtlı.';
  if (m.includes('password should be'))          return 'Şifre en az 6 karakter olmalıdır.';
  if (m.includes('unable to validate email'))    return 'Geçerli bir e-posta adresi girin.';
  if (m.includes('for security purposes'))       return 'Çok sık deneme yaptınız. Lütfen biraz bekleyin.';
  return msg || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
