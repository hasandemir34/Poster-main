const EMAILJS_PUBLIC_KEY        = 'K073_0I-oDghNXeMN';
const EMAILJS_SERVICE_ID        = 'service_3d9zvyi';
const EMAILJS_TEMPLATE_ID       = 'template_ze69og2';
const EMAILJS_RESET_TEMPLATE_ID = 'template_gef9k3j';

function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function getBaseUrl() {
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
}

export async function sendVerificationEmail(name, email, token) {
  await loadEmailJS();
  const verifyLink = `${getBaseUrl()}verify.html?token=${token}`;
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_name:     name,
    to_email:    email,
    verify_link: verifyLink,
  });
}

export async function sendPasswordResetEmail(name, email, token) {
  await loadEmailJS();
  const resetLink = `${getBaseUrl()}reset.html?token=${token}`;
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_RESET_TEMPLATE_ID, {
    to_name:    name,
    to_email:   email,
    reset_link: resetLink,
  });
}

export function isEmailConfigured() {
  return EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY';
}

export function isResetConfigured() {
  return EMAILJS_RESET_TEMPLATE_ID !== 'YOUR_RESET_TEMPLATE_ID';
}
