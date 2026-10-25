let reportMapPicker = null;
let currentPickerMarker = null;
let selectedSeverity = 'Medium';
let uploadedImageBase64 = '';

function initMiniPickerMap(lat = CONFIG.DEFAULT_CENTER[0], lng = CONFIG.DEFAULT_CENTER[1]) {
  const container = document.getElementById('picker-map');
  if (!container) return;

  if (reportMapPicker) {
    reportMapPicker.setView([lat, lng], 15);
    if (currentPickerMarker) currentPickerMarker.setLatLng([lat, lng]);
    return;
  }

  reportMapPicker = L.map('picker-map').setView([lat, lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(reportMapPicker);

  currentPickerMarker = L.marker([lat, lng], { draggable: true }).addTo(reportMapPicker);

  currentPickerMarker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    setCoordinates(pos.lat, pos.lng);
  });

  reportMapPicker.on('click', (e) => {
    const pos = e.latlng;
    currentPickerMarker.setLatLng(pos);
    setCoordinates(pos.lat, pos.lng);
  });
}

function setCoordinates(lat, lng) {
  const latEl = document.getElementById('latitude');
  const lngEl = document.getElementById('longitude');
  const dispEl = document.getElementById('coords-text');

  if (latEl) latEl.value = parseFloat(lat).toFixed(6);
  if (lngEl) lngEl.value = parseFloat(lng).toFixed(6);
  if (dispEl) dispEl.textContent = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;

  checkNearbyDuplicates(lat, lng);
}

function requestCurrentLocation() {
  const btn = document.getElementById('btn-get-location');
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Detecting GPS Location...';
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setCoordinates(lat, lng);
      initMiniPickerMap(lat, lng);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '📍 Location Captured Successfully!';
      }
      showToast('GPS coordinates acquired successfully!', 'success');
    },
    (error) => {
      console.warn('Geolocation denied or unavailable:', error.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '📍 Click to select on map instead';
      }
      showToast('Location permission denied. Click anywhere on the map to set location manually.', 'warning');
      initMiniPickerMap();
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function checkNearbyDuplicates(lat, lng) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng })
    });
    const data = await res.json();
    const alertBox = document.getElementById('duplicate-alert-box');

    if (data.success && data.data.isPotentialDuplicate && alertBox) {
      const dup = data.data.duplicatesFound[0];
      alertBox.style.display = 'block';
      alertBox.innerHTML = `
        <strong>⚠️ Nearby Pothole Detected (${dup.distanceMeters}m away):</strong>
        <p style="margin:4px 0 0; font-size:12px;">"${dup.title}" was already reported ${dup.ageDisplay}. You can still proceed if this is a distinct hazard.</p>
      `;
    } else if (alertBox) {
      alertBox.style.display = 'none';
    }
  } catch (e) {
    console.warn('Duplicate check non-blocking error:', e);
  }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    uploadedImageBase64 = e.target.result;
    const preview = document.getElementById('image-preview');
    const previewWrapper = document.getElementById('preview-wrapper');

    if (preview && previewWrapper) {
      preview.src = uploadedImageBase64;
      previewWrapper.style.display = 'block';
    }

    analyzeImageWithAI(uploadedImageBase64);
  };
  reader.readAsDataURL(file);
}

async function analyzeImageWithAI(base64Data) {
  const aiBox = document.getElementById('ai-recommendation');
  if (!aiBox) return;

  aiBox.style.display = 'flex';
  aiBox.innerHTML = '<span>🤖 AI is analyzing pothole photo...</span>';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Data })
    });
    const data = await res.json();

    if (data.success) {
      const rec = data.data;
      aiBox.innerHTML = `
        <span>🤖 <strong>AI Estimation:</strong> ${rec.recommendation} (Confidence: ${Math.round(rec.confidenceScore * 100)}%)</span>
      `;
      selectSeverityCard(rec.detectedSeverity);
    }
  } catch (e) {
    aiBox.innerHTML = '<span>🤖 AI suggestion unavailable (manual selection active).</span>';
  }
}

function selectSeverityCard(severity) {
  selectedSeverity = severity;
  document.querySelectorAll('.severity-card').forEach(card => {
    card.classList.remove('selected', 'low', 'medium', 'high', 'critical');
    if (card.dataset.severity === severity) {
      card.classList.add('selected', severity.toLowerCase());
    }
  });
}

async function handleReportSubmit(e) {
  e.preventDefault();

  const lat = document.getElementById('latitude')?.value;
  const lng = document.getElementById('longitude')?.value;
  const roadName = document.getElementById('road-name')?.value;
  const description = document.getElementById('description')?.value;
  const submitBtn = document.getElementById('btn-submit-report');

  if (!lat || !lng) {
    showToast('Please capture your location or select a spot on the map.', 'error');
    return;
  }

  const payload = {
    title: roadName ? `Pothole on ${roadName}` : 'Reported Road Hazard',
    description: description || 'Pothole hazard reported by citizen.',
    location: {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      roadName: roadName || 'Captured GPS Location'
    },
    severity: selectedSeverity,
    photoUrl: uploadedImageBase64 || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    reportedBy: 'Citizen (Anonymous)'
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Submitting Report...';
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showConfirmationModal(result.data);
    } else {
      showToast(result.message || 'Failed to submit report', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Pothole Report';
      }
    }
  } catch (err) {
    showToast('Network error while submitting report', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Pothole Report';
    }
  }
}

function showConfirmationModal(report) {
  const modal = document.getElementById('confirmation-modal');
  const reportIdEl = document.getElementById('modal-report-id');
  const reportRoadEl = document.getElementById('modal-report-road');

  if (reportIdEl) reportIdEl.textContent = report.reportId;
  if (reportRoadEl) reportRoadEl.textContent = report.location.roadName;
  if (modal) modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const btnLocation = document.getElementById('btn-get-location');
  if (btnLocation) btnLocation.addEventListener('click', requestCurrentLocation);

  const fileInput = document.getElementById('photo-upload');
  if (fileInput) fileInput.addEventListener('change', handlePhotoUpload);

  const form = document.getElementById('pothole-report-form');
  if (form) form.addEventListener('submit', handleReportSubmit);

  document.querySelectorAll('.severity-card').forEach(card => {
    card.addEventListener('click', () => {
      selectSeverityCard(card.dataset.severity);
    });
  });

  initMiniPickerMap();
});
