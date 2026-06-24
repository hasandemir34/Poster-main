import { getCurrentUser, logout } from './auth.js?v=5';

export function renderAuthNav(navEl) {
  if (!navEl) return;
  const user = getCurrentUser();

  if (user) {
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
      <button class="user-menu-btn" id="userMenuBtn">
        <span class="user-avatar">${user.name.charAt(0).toUpperCase()}</span>
        <span class="user-name-short">${user.name.split(' ')[0]}</span>
        <span class="user-chevron">▾</span>
      </button>
      <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-info">
          <div class="ud-name">${user.name}</div>
          <div class="ud-email">${user.email}</div>
        </div>
        <div class="user-dropdown-sep"></div>
        <a href="orders.html" class="ud-link">📦 Siparişlerim</a>
        <button class="ud-link ud-logout" id="udLogout">🚪 Çıkış Yap</button>
      </div>
    `;
    navEl.appendChild(userMenu);

    const btn = userMenu.querySelector('#userMenuBtn');
    const drop = userMenu.querySelector('#userDropdown');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      drop.classList.toggle('open');
    });

    document.addEventListener('click', () => drop.classList.remove('open'));

    userMenu.querySelector('#udLogout').addEventListener('click', () => {
      logout();
    });
  } else {
    const loginBtn = document.createElement('a');
    loginBtn.href = 'auth.html';
    loginBtn.className = 'nav-link';
    loginBtn.textContent = 'Giriş Yap';

    const registerBtn = document.createElement('a');
    registerBtn.href = 'auth.html?tab=register';
    registerBtn.className = 'nav-cta';
    registerBtn.style.marginLeft = '4px';
    registerBtn.textContent = '✦ Kayıt Ol';

    navEl.appendChild(loginBtn);
    navEl.appendChild(registerBtn);
  }
}
