const USERS_KEY   = 'framely:users';
const PENDING_KEY = 'framely:pending_users';
const SESSION_KEY = 'framely:session';
const RESET_KEY   = 'framely:reset_tokens';

export function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getPending() {
  return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
}

function savePending(list) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

function getResetTokens() {
  return JSON.parse(localStorage.getItem(RESET_KEY) || '[]');
}

function saveResetTokens(list) {
  localStorage.setItem(RESET_KEY, JSON.stringify(list));
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function registerPending(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    return { ok: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
  }

  const pending = getPending().filter(p => p.email !== email);
  const token = generateToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  pending.push({ name, email, password, token, expiresAt });
  savePending(pending);

  return { ok: true, token };
}

export function verifyToken(token) {
  const pending = getPending();
  const idx = pending.findIndex(p => p.token === token);

  if (idx === -1) return { ok: false, error: 'Doğrulama bağlantısı geçersiz.' };

  const entry = pending[idx];
  if (Date.now() > entry.expiresAt) {
    pending.splice(idx, 1);
    savePending(pending);
    return { ok: false, error: 'Doğrulama bağlantısının süresi dolmuş. Lütfen tekrar kayıt olun.' };
  }

  const users = getUsers();
  if (users.find(u => u.email === entry.email)) {
    pending.splice(idx, 1);
    savePending(pending);
    return { ok: false, error: 'Bu e-posta zaten doğrulanmış. Giriş yapabilirsiniz.' };
  }

  const user = {
    id: Date.now().toString(),
    name: entry.name,
    email: entry.email,
    password: entry.password,
    createdAt: new Date().toISOString(),
    verified: true,
  };
  users.push(user);
  saveUsers(users);

  pending.splice(idx, 1);
  savePending(pending);

  setSession(user);
  return { ok: true, user };
}

export function resendVerification(email) {
  const pending = getPending();
  const entry = pending.find(p => p.email === email);
  if (!entry) return { ok: false, error: 'Bu e-posta için bekleyen kayıt bulunamadı.' };
  const token = generateToken();
  entry.token = token;
  entry.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  savePending(pending);
  return { ok: true, token, name: entry.name };
}

export function requestPasswordReset(email) {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) {
    return { ok: false, error: 'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı.' };
  }

  const tokens = getResetTokens().filter(t => t.email !== email);
  const token = generateToken();
  const expiresAt = Date.now() + 60 * 60 * 1000;

  tokens.push({ email, token, expiresAt });
  saveResetTokens(tokens);

  return { ok: true, token, name: user.name };
}

export function validateResetToken(token) {
  const tokens = getResetTokens();
  const entry = tokens.find(t => t.token === token);
  if (!entry) return { ok: false, error: 'Şifre sıfırlama bağlantısı geçersiz.' };
  if (Date.now() > entry.expiresAt) {
    saveResetTokens(tokens.filter(t => t.token !== token));
    return { ok: false, error: 'Şifre sıfırlama bağlantısının süresi dolmuş. Lütfen yeniden talep edin.' };
  }
  return { ok: true, email: entry.email };
}

export function resetPassword(token, newPassword) {
  const validation = validateResetToken(token);
  if (!validation.ok) return validation;

  const users = getUsers();
  const user = users.find(u => u.email === validation.email);
  if (!user) return { ok: false, error: 'Kullanıcı bulunamadı.' };

  user.password = newPassword;
  saveUsers(users);

  saveResetTokens(getResetTokens().filter(t => t.token !== token));

  return { ok: true };
}

export function login(email, password) {
  const pending = getPending();
  if (pending.find(p => p.email === email && p.password === password)) {
    return { ok: false, error: 'E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.' };
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { ok: false, error: 'E-posta veya şifre hatalı.' };
  setSession(user);
  return { ok: true, user };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
}

export function getCurrentUser() {
  const s = localStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}

export function isLoggedIn() {
  return !!getCurrentUser();
}

export function requireAuth(redirectPath) {
  if (!isLoggedIn()) {
    sessionStorage.setItem('framely:authRedirect', redirectPath || window.location.href);
    window.location.href = 'auth.html';
    return false;
  }
  return true;
}
