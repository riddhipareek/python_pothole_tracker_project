const CONFIG = {
  API_BASE_URL: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? ''
    : window.location.origin,
  DEFAULT_CENTER: [12.9716, 77.5946],
  DEFAULT_ZOOM: 13,
  SLA_OVERDUE_DAYS: 90
};
