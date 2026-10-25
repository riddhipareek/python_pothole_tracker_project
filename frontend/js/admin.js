let adminReports = [];
let currentFilteredReports = [];
let adminMap = null;
let adminMarkersLayer = null;

async function loadAdminDashboard() {
  requireAdminAuth();
  await fetchKPIStats();
  await fetchAdminReports();
}

async function fetchKPIStats() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/stats`);
    const data = await res.json();

    if (data.success) {
      const stats = data.data;
      document.getElementById('kpi-total').textContent = stats.total;
      document.getElementById('kpi-pending').textContent = stats.pending;
      document.getElementById('kpi-critical').textContent = stats.critical;
      document.getElementById('kpi-overdue').textContent = stats.overdue90Days;
      document.getElementById('kpi-rectified').textContent = stats.rectified;
    }
  } catch (err) {
    console.warn('KPI fetch error:', err);
  }
}

async function fetchAdminReports() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/reports`);
    const data = await res.json();

    if (data.success) {
      adminReports = data.data;
      currentFilteredReports = [...adminReports];
      renderAdminTable(currentFilteredReports);
      initAdminMap(currentFilteredReports);
    }
  } catch (err) {
    showToast('Failed to load reports', 'error');
  }
}

function renderAdminTable(reports) {
  const tbody = document.getElementById('reports-table-body');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94a3b8;">No reports match the selected criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => {
    const severityBadge = `<span class="badge badge-${r.severity.toLowerCase()}">${r.severity}</span>`;
    
    let statusBadge = `<span class="badge badge-pending">Pending</span>`;
    if (r.status === 'Rectified') statusBadge = `<span class="badge badge-rectified">✅ Rectified</span>`;
    else if (r.status === 'In Progress') statusBadge = `<span class="badge badge-progress">🔧 In Progress</span>`;

    const overdueBadge = r.isOverdue90Days
      ? `<span class="badge-overdue">🚨 90+ DAYS OVERDUE</span>`
      : `<span style="font-weight:600; font-size:12px; color:#475569;">${r.ageDisplay}</span>`;

    const rectifyBtn = r.status !== 'Rectified'
      ? `<button class="btn btn-success" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="openRectifyModal('${r.reportId}')">Mark Rectified</button>`
      : `<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.8rem;" disabled>Resolved</button>`;

    const photoThumb = r.photoUrl
      ? `<img src="${r.photoUrl}" alt="Thumbnail" style="width:44px; height:44px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;" onclick="openPhotoPreview('${r.photoUrl}')"/>`
      : `<span style="color:#94a3b8; font-size:11px;">No Photo</span>`;

    return `
      <tr>
        <td class="table-report-id">#${r.reportId}</td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        <td>${severityBadge}</td>
        <td>
          <div style="font-weight:600; color:#1e293b;">${r.title}</div>
          <div style="font-size:11px; color:#64748b;">📍 ${r.location.roadName}</div>
        </td>
        <td>${statusBadge}</td>
        <td>${overdueBadge}</td>
        <td>${photoThumb}</td>
        <td>
          <div class="table-actions">
            ${rectifyBtn}
            <button class="btn btn-secondary" style="padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="viewReportDetails('${r.reportId}')">Details</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initAdminMap(reports) {
  const container = document.getElementById('admin-map');
  if (!container) return;

  if (!adminMap) {
    adminMap = L.map('admin-map').setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(adminMap);
    adminMarkersLayer = L.layerGroup().addTo(adminMap);
  }

  adminMarkersLayer.clearLayers();

  reports.forEach(r => {
    if (!r.location?.latitude || !r.location?.longitude) return;

    let color = r.status === 'Rectified' ? '#16a34a' : r.severity === 'Critical' ? '#dc2626' : '#d97706';
    const marker = L.circleMarker([r.location.latitude, r.location.longitude], {
      radius: r.severity === 'Critical' ? 9 : 7,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    marker.bindPopup(`
      <div style="font-size:12px;">
        <strong>#${r.reportId}</strong> - ${r.severity}<br>
        <b>${r.title}</b><br>
        Status: ${r.status}<br>
        Age: ${r.ageDisplay}<br>
        <button class="btn btn-primary" style="margin-top:6px; font-size:10px; padding:2px 6px;" onclick="viewReportDetails('${r.reportId}')">Inspect</button>
      </div>
    `);
    adminMarkersLayer.addLayer(marker);
  });
}

function applyAdminFilters(filterType) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`filter-btn-${filterType}`);
  if (activeBtn) activeBtn.classList.add('active');

  if (filterType === 'all') {
    currentFilteredReports = [...adminReports];
  } else if (filterType === 'pending') {
    currentFilteredReports = adminReports.filter(r => r.status === 'Pending');
  } else if (filterType === 'critical') {
    currentFilteredReports = adminReports.filter(r => r.severity === 'Critical');
  } else if (filterType === 'overdue') {
    currentFilteredReports = adminReports.filter(r => r.isOverdue90Days);
  } else if (filterType === 'rectified') {
    currentFilteredReports = adminReports.filter(r => r.status === 'Rectified');
  }

  renderAdminTable(currentFilteredReports);
  initAdminMap(currentFilteredReports);
}

function handleTableSearch(query) {
  const q = query.toLowerCase();
  const filtered = currentFilteredReports.filter(r =>
    r.reportId.toLowerCase().includes(q) ||
    r.title.toLowerCase().includes(q) ||
    (r.location.roadName && r.location.roadName.toLowerCase().includes(q))
  );
  renderAdminTable(filtered);
}

function openRectifyModal(reportId) {
  const modal = document.getElementById('rectify-modal');
  const targetId = document.getElementById('rectify-report-id');
  if (targetId) targetId.value = reportId;
  if (modal) modal.classList.add('active');
}

async function confirmRectification() {
  const reportId = document.getElementById('rectify-report-id')?.value;
  const remarks = document.getElementById('rectify-remarks')?.value;
  const token = getAdminToken();

  if (!reportId) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/reports/${reportId}/rectify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ remarks: remarks || 'Repaired and resurfaced by Municipal Road Division.' })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Pothole #${reportId} successfully marked as RECTIFIED!`, 'success');
      closeModals();
      await loadAdminDashboard();
    } else {
      showToast(data.message || 'Error updating status', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to server to rectify report', 'error');
  }
}

async function resetDemoSeed() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/seed-demo`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Demo dataset refreshed successfully!', 'success');
      await loadAdminDashboard();
    }
  } catch (e) {
    showToast('Failed to reset demo data', 'error');
  }
}

function viewReportDetails(reportId) {
  const r = adminReports.find(x => x.reportId === reportId);
  if (!r) return;

  const modal = document.getElementById('details-modal');
  const content = document.getElementById('details-modal-content');

  if (content) {
    content.innerHTML = `
      <div style="margin-bottom:1rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem;">
        <span class="table-report-id" style="font-size:16px;">#${r.reportId}</span>
        <h3 style="margin-top:4px;">${r.title}</h3>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px; margin-bottom:1rem;">
        <div><b>Severity:</b> ${r.severity}</div>
        <div><b>Status:</b> ${r.status}</div>
        <div><b>Reported On:</b> ${new Date(r.createdAt).toLocaleString()}</div>
        <div><b>Age:</b> ${r.ageDisplay} ${r.isOverdue90Days ? '🚨 (90+ DAYS BREACH)' : ''}</div>
        <div><b>Location:</b> ${r.location.roadName}</div>
        <div><b>GPS Coords:</b> ${r.location.latitude}, ${r.location.longitude}</div>
      </div>
      <div style="margin-bottom:1rem;">
        <b>Description:</b>
        <p style="color:#475569; font-size:13px;">${r.description}</p>
      </div>
      ${r.adminRemarks ? `<div style="background:#f1f5f9; padding:8px; border-radius:6px; font-size:12px; margin-bottom:1rem;"><b>Admin Remarks:</b> ${r.adminRemarks}</div>` : ''}
      ${r.photoUrl ? `<div><b>Photo Evidence:</b><br><img src="${r.photoUrl}" style="max-width:100%; border-radius:8px; margin-top:6px; max-height:260px;"/></div>` : ''}
    `;
  }

  if (modal) modal.classList.add('active');
}

function openPhotoPreview(url) {
  const modal = document.getElementById('details-modal');
  const content = document.getElementById('details-modal-content');
  if (content) {
    content.innerHTML = `<img src="${url}" style="width:100%; border-radius:8px;"/>`;
  }
  if (modal) modal.classList.add('active');
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reports-table-body')) {
    loadAdminDashboard();
  }

  document.getElementById('admin-search')?.addEventListener('input', (e) => {
    handleTableSearch(e.target.value);
  });

  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
});
