function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function loadLandingStats() {
  const statTotal = document.getElementById('stat-total');
  const statOverdue = document.getElementById('stat-overdue');
  const statRectified = document.getElementById('stat-rectified');
  const statPending = document.getElementById('stat-pending');

  if (!statTotal) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/stats`);
    const data = await res.json();
    if (data.success) {
      if (statTotal) statTotal.textContent = data.data.total;
      if (statOverdue) statOverdue.textContent = data.data.overdue90Days;
      if (statRectified) statRectified.textContent = data.data.rectified;
      if (statPending) statPending.textContent = data.data.pending;
    }
  } catch (err) {
    console.warn('Stats fetch error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLandingStats();
});
