"""
Automated unit tests for FixMyRoad Python Backend & HTML routes
"""
import sys
import os

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
import json

def run_all_tests():
    client = app.test_client()
    passed = 0
    total = 0

    def check(name, condition, extra=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name} {extra}")
        else:
            print(f"  [FAIL] {name} {extra}")

    print("\n--- Running FixMyRoad Backend Verification Tests ---")

    # 1. Root and HTML pages
    r = client.get('/')
    check("GET / (index.html)", r.status_code == 200 and b"FixMyRoad" in r.data)

    r = client.get('/citizen.html')
    check("GET /citizen.html", r.status_code == 200 and b"Public Map" in r.data)

    r = client.get('/report.html')
    check("GET /report.html", r.status_code == 200 and b"Report" in r.data)

    r = client.get('/admin-dashboard.html')
    check("GET /admin-dashboard.html", r.status_code == 200 and b"Dashboard" in r.data)

    # 2. Health check API
    r = client.get('/api/health')
    data = json.loads(r.data)
    check("GET /api/health", r.status_code == 200 and data.get('status') == 'online')

    # 3. Reports API & SLA
    r = client.get('/api/reports')
    data = json.loads(r.data)
    reports = data.get('data', [])
    check("GET /api/reports", r.status_code == 200 and data.get('success') is True and len(reports) > 0, f"({len(reports)} reports loaded)")

    # Verify 90-day SLA flags
    has_overdue = any(rep.get('isOverdue90Days') is True for rep in reports)
    check("90-day SLA calculation", has_overdue)

    # 4. Stats API
    r = client.get('/api/stats')
    data = json.loads(r.data)
    stats = data.get('data', {})
    check("GET /api/stats", r.status_code == 200 and 'total' in stats and 'overdue90Days' in stats)

    # 5. AI Analyze API
    r = client.post('/api/ai/analyze', json={'imageBase64': 'data:image/jpeg;base64,' + 'A'*600})
    data = json.loads(r.data)
    check("POST /api/ai/analyze", r.status_code == 200 and 'detectedSeverity' in data.get('data', {}))

    # 6. Proximity Duplicate Check
    r = client.post('/api/ai/check-duplicate', json={'latitude': 12.971598, 'longitude': 77.594562})
    data = json.loads(r.data)
    check("POST /api/ai/check-duplicate", r.status_code == 200 and data.get('data', {}).get('isPotentialDuplicate') is True)

    # 7. Create New Citizen Report
    new_report_payload = {
        'title': 'Test Python Pothole',
        'description': 'Testing Python Flask report submission',
        'location': {
            'latitude': 12.950000,
            'longitude': 77.600000,
            'roadName': 'Indiranagar 100ft Road'
        },
        'severity': 'Critical',
        'reportedBy': 'Citizen QA Tester'
    }
    r = client.post('/api/reports', json=new_report_payload)
    data = json.loads(r.data)
    created_id = data.get('data', {}).get('reportId')
    check("POST /api/reports", r.status_code == 201 and created_id is not None, f"(ID: {created_id})")

    # 8. Admin Login
    r = client.post('/api/auth/login', json={'userId': 'admin@fixmyroad.gov.in', 'password': 'Admin@12345'})
    data = json.loads(r.data)
    token = data.get('data', {}).get('token')
    check("POST /api/auth/login", r.status_code == 200 and token is not None)

    # 9. Rectify Report with Admin Token
    if created_id and token:
        r = client.patch(
            f'/api/reports/{created_id}/rectify',
            headers={'Authorization': f'Bearer {token}'},
            json={'remarks': 'Asphalt resurfaced by test crew'}
        )
        data = json.loads(r.data)
        check("PATCH /api/reports/<id>/rectify", r.status_code == 200 and data.get('data', {}).get('status') == 'Rectified')

    print(f"\nResult: {passed}/{total} tests passed successfully.\n")
    if passed != total:
        sys.exit(1)

if __name__ == '__main__':
    run_all_tests()
