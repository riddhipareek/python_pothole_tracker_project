# FixMyRoad 🛣️
### Intelligent Citizen Road Hazard & Municipal SLA Accountability Platform

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3-orange.svg)]()
[![Leaflet.js](https://img.shields.io/badge/Leaflet.js-1.9.4-brightgreen.svg)](https://leafletjs.com/)

---

## 📌 Architecture
* **Backend**: **Python (Flask)**
  - RESTful API endpoints for citizen reporting and municipal workflow.
  - In-memory data store with dynamic 90-day SLA overdue engine.
  - Haversine geo-spatial distance calculation for 50m proximity deduplication.
  - AI image visual severity scoring service.
* **Frontend**: **HTML5 / CSS3**
  - Frictionless citizen experience (no login required) with 1-click GPS capture.
  - Interactive OpenStreetMap/Leaflet road hazard map.
  - Municipal administrative governance dashboard with real-time KPI metrics.

---

## 📌 The Problem
Between 2020–2024, **9,438 lives were lost to pothole-related accidents in India**. Citizens lack a transparent, no-friction way to report road hazards and monitor municipal resolution. Potholes often sit unattended for months without public accountability.

---

## 💡 The Solution
**FixMyRoad** is a dual-portal platform bridging the gap between citizens and municipal authorities:
1. **Citizen Experience (No Login Required)**: Open the web app, capture GPS coordinates in one click, select severity, upload photo evidence, and instantly view the hazard on a public map.
2. **Municipal Governance Portal**: Authenticated admin dashboard with 5 real-time KPI metrics, search/filters, split map view, and a 1-click **"Mark as Rectified"** workflow that updates public records.
3. **🚨 90+ Day SLA Enforcement**: Reports unaddressed for $\ge 90$ days are automatically flagged on both citizen maps and municipal dashboards to hold authorities accountable.
4. **🤖 AI Hazard Intelligence**: Automatic visual severity scoring and 50-meter Haversine geo-duplicate detection prevent duplicate spam and prioritize critical road craters.

---

## 🚀 Quick Start (Run in 30 Seconds)

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Python Server
```bash
python app.py
```

### 3. Open in Browser
* **Home / Landing**: `http://localhost:5000/`
* **Public Citizen Map**: `http://localhost:5000/citizen.html`
* **Hazard Report Form**: `http://localhost:5000/report.html`
* **Municipal Admin Portal**: `http://localhost:5000/admin-login.html`

### 🔑 Demo Admin Credentials:
* **User ID**: `admin@fixmyroad.gov.in` (or `admin`)
* **Password**: `Admin@12345`

---

## 🧪 Automated Testing
Run the automated verification suite to validate all Python endpoints and HTML serving:
```bash
python tests/test_backend.py
```
