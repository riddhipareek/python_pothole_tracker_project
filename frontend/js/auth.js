const AUTH_TOKEN_KEY = 'fmr_admin_session_token';
const AUTH_USER_KEY = 'fmr_admin_user';

function getAdminToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function setAdminSession(token, user) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAdminSession() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function requireAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = 'admin-login.html';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();

  const userIdInput = document.getElementById('admin-userid');
  const passwordInput = document.getElementById('admin-password');
  const loginBtn = document.getElementById('btn-login');
  const errorBanner = document.getElementById('login-error');

  const userId = userIdInput?.value.trim();
  const password = passwordInput?.value;

  if (errorBanner) errorBanner.style.display = 'none';

  if (!userId || !password) {
    if (errorBanner) {
      errorBanner.textContent = 'Please enter both User ID and Password.';
      errorBanner.style.display = 'block';
    }
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '⏳ Verifying credentials...';
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();

    if (data.success && data.data.token) {
      setAdminSession(data.data.token, data.data.user);
      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 500);
    } else {
      if (errorBanner) {
        errorBanner.textContent = data.message || 'Invalid credentials.';
        errorBanner.style.display = 'block';
      }
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Sign In to Dashboard';
      }
    }
  } catch (err) {
    if (errorBanner) {
      errorBanner.textContent = 'Unable to connect to authentication server.';
      errorBanner.style.display = 'block';
    }
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In to Dashboard';
    }
  }
}

function handleAdminLogout() {
  clearAdminSession();
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleAdminLogout);
});
