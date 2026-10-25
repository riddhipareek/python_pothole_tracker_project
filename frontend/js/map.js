let map = null;
let markersLayer = null;
let allReports = [];

function createCustomIcon(severity, isOverdue, status) {
  let color = '#3b82f6';
  if (status === 'Rectified') color = '#16a34a';
  else if (severity === 'Medium') color = '#f59e0b';
  else if (severity === 'High') color = '#ea580c';
  else if (severity === 'Critical') color = '#dc2626';

  const isCritical = severity === 'Critical' && status !== 'Rectified';
  const pulseClass = isCritical ? 'pulse-pin' : '';
  const overdueBadge = isOverdue
    ? `<div style="position:absolute; top:-8px; right:-14px; background:#991b1b; color:#fff; font-size:9px; font-weight:800; padding:2px 4px; border-radius:4px; border:1px solid #fff; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.3);">90+ DAYS</div>`
    : '';

  const html = `
    <div style="position:relative; width:32px; height:32px;" class="${pulseClass}">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="${color}" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.35));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      ${overdueBadge}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

function initMap() {
  const mapElement = document.getElementById('public-map');
  if (!mapElement) return;

  map = L.map('public-map').setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors | FixMyRoad'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  loadPublicReports();
}

async function loadPublicReports() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/reports`);
    const data = await res.json();

    if (data.success) {
      allReports = data.data;
      renderMarkers(allReports);
      updateMapCount(allReports.length);
    }
  } catch (err) {
    showToast('Failed to load map reports', 'error');
  }
}

function renderMarkers(reports) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  reports.forEach(report => {
    if (!report.location || !report.location.latitude || !report.location.longitude) return;

    const icon = createCustomIcon(report.severity, report.isOverdue90Days, report.status);
    const marker = L.marker([report.location.latitude, report.location.longitude], { icon });

    const overdueAlertHtml = report.isOverdue90Days
      ? `<div style="background:#fee2e2; border-left:4px solid #dc2626; color:#991b1b; padding:6px 10px; margin-bottom:8px; font-weight:800; font-size:11px; border-radius:3px;">
          🚨 90+ DAYS UNRESOLVED — CITIZEN SAFETY HAZARD
         </div>`
      : '';

    const photoHtml = report.photoUrl
      ? `<div style="margin-top:8px;"><img src="${report.photoUrl}" alt="Evidence" style="width:100%; max-height:120px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;"/></div>`
      : '';

    const statusBadge = report.status === 'Rectified'
      ? `<span class="badge badge-rectified">✅ Rectified</span>`
      : report.status === 'In Progress'
      ? `<span class="badge badge-progress">🔧 In Progress</span>`
      : `<span class="badge badge-pending">⏳ Pending</span>`;

    const popupContent = `
      <div style="font-family:inherit; min-width:240px; padding:4px;">
        ${overdueAlertHtml}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-family:monospace; font-weight:700; color:#1e3a8a; font-size:12px;">#${report.reportId}</span>
          ${statusBadge}
        </div>
        <h4 style="margin:0 0 4px; font-size:14px; font-weight:700; color:#0f172a;">${report.title}</h4>
        <p style="font-size:12px; color:#475569; margin-bottom:6px;">${report.description}</p>
        <div style="font-size:11px; color:#64748b; margin-bottom:4px;">📍 ${report.location.roadName || 'Road Location Recorded'}</div>
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#334155;">
          <span>Severity: <b style="color:${report.severity === 'Critical' ? '#dc2626' : '#d97706'}">${report.severity}</b></span>
          <span>Age: ${report.ageDisplay || 'Today'}</span>
        </div>
        ${photoHtml}
      </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
  });
}

function updateMapCount(count) {
  const countEl = document.getElementById('map-pothole-count');
  if (countEl) countEl.textContent = count;
}

function filterMapMarkers() {
  const showPending = document.getElementById('filter-pending')?.checked ?? true;
  const showRectified = document.getElementById('filter-rectified')?.checked ?? true;
  const showCriticalOnly = document.getElementById('filter-critical')?.checked ?? false;
  const showOverdueOnly = document.getElementById('filter-overdue')?.checked ?? false;

  let filtered = allReports.filter(r => {
    if (!showPending && r.status !== 'Rectified') return false;
    if (!showRectified && r.status === 'Rectified') return false;
    if (showCriticalOnly && r.severity !== 'Critical') return false;
    if (showOverdueOnly && !r.isOverdue90Days) return false;
    return true;
  });

  renderMarkers(filtered);
  updateMapCount(filtered.length);
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.querySelectorAll('.map-filter-toggle').forEach(el => {
    el.addEventListener('change', filterMapMarkers);
  });
});
