"""
Flask API Routes for FixMyRoad Python Backend.
"""
import base64
import time
from functools import wraps
from flask import Blueprint, request, jsonify
from .storage_service import (
    get_all_reports,
    get_report_by_id,
    create_report as db_create_report,
    mark_report_rectified,
    update_report_status,
    get_stats as db_get_stats,
    reset_demo_data
)
from .geo_service import check_nearby_duplicates

api_bp = Blueprint('api', __name__, url_prefix='/api')

START_TIME = time.time()
ADMIN_EMAIL = 'admin@fixmyroad.gov.in'
ADMIN_PASSWORD = 'Admin@12345'

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization') or request.headers.get('x-admin-token')
        if not auth_header:
            return jsonify({'success': False, 'message': 'Unauthorized: Admin authentication token required.'}), 401
        
        token = auth_header.replace('Bearer ', '').strip() if auth_header.startswith('Bearer ') else auth_header.strip()
        if token and ('admin' in token or len(token) > 10):
            request.admin_user = {'email': ADMIN_EMAIL, 'role': 'SUPER_ADMIN'}
            return f(*args, **kwargs)
        
        return jsonify({'success': False, 'message': 'Forbidden: Invalid or expired admin credentials.'}), 403
    return decorated_function

# Health Check
@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'online',
        'service': 'FixMyRoad Python API',
        'uptime': round(time.time() - START_TIME, 2),
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    })

# Citizen / Public Reports Endpoints
@api_bp.route('/reports', methods=['GET'])
def get_reports():
    status = request.args.get('status')
    severity = request.args.get('severity')
    overdue = request.args.get('overdue')
    
    reports = get_all_reports({'status': status, 'severity': severity, 'overdue': overdue})
    return jsonify({
        'success': True,
        'count': len(reports),
        'data': reports
    })

@api_bp.route('/reports/<report_id>', methods=['GET'])
def get_single_report(report_id):
    report = get_report_by_id(report_id)
    if not report:
        return jsonify({'success': False, 'message': 'Report not found'}), 404
    return jsonify({'success': True, 'data': report})

@api_bp.route('/reports', methods=['POST'])
def create_report():
    data = request.get_json(force=True) or {}
    loc = data.get('location', {})
    lat = loc.get('latitude')
    lng = loc.get('longitude')
    
    if lat is None or lng is None:
        return jsonify({'success': False, 'message': 'Latitude and Longitude are required.'}), 400

    new_report = db_create_report(data)
    return jsonify({
        'success': True,
        'message': 'Pothole report registered successfully.',
        'data': new_report
    }), 201

# Admin Protected Routes
@api_bp.route('/reports/<report_id>/rectify', methods=['PATCH'])
@admin_required
def rectify_report(report_id):
    data = request.get_json(silent=True) or {}
    remarks = data.get('remarks', 'Resolved by road maintenance authority')
    admin_email = getattr(request, 'admin_user', {}).get('email', ADMIN_EMAIL)
    
    updated = mark_report_rectified(report_id, admin_email=admin_email, remarks=remarks)
    if not updated:
        return jsonify({'success': False, 'message': 'Report not found to rectify.'}), 404
        
    return jsonify({
        'success': True,
        'message': f"Report {report_id} successfully marked as RECTIFIED.",
        'data': updated
    })

@api_bp.route('/reports/<report_id>/status', methods=['PATCH'])
@admin_required
def update_status(report_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    remarks = data.get('remarks', '')
    
    if not status:
        return jsonify({'success': False, 'message': 'Status field is required.'}), 400
        
    updated = update_report_status(report_id, status=status, remarks=remarks)
    if not updated:
        return jsonify({'success': False, 'message': 'Report not found.'}), 404
        
    return jsonify({
        'success': True,
        'message': f"Report status updated to {status}.",
        'data': updated
    })

# Admin Auth Endpoints
@api_bp.route('/auth/login', methods=['POST'])
def login_admin():
    data = request.get_json(force=True) or {}
    user_id = (data.get('userId') or '').strip()
    password = data.get('password') or ''
    
    if not user_id or not password:
        return jsonify({'success': False, 'message': 'Please provide both User ID and Password.'}), 400
        
    if (user_id.lower() == ADMIN_EMAIL.lower() or user_id.lower() == 'admin') and password == ADMIN_PASSWORD:
        token_str = f"{user_id}:{int(time.time())}"
        token = f"fmr_admin_jwt_{base64.b64encode(token_str.encode()).decode()}"
        return jsonify({
            'success': True,
            'message': 'Admin authentication successful.',
            'data': {
                'token': token,
                'user': {
                    'email': ADMIN_EMAIL,
                    'name': 'Chief Municipal Road Inspector',
                    'department': 'Public Works Department (PWD)',
                    'role': 'ADMIN'
                }
            }
        })
        
    return jsonify({'success': False, 'message': 'Invalid User ID or Password. Please check credentials.'}), 401

@api_bp.route('/auth/verify', methods=['GET'])
@admin_required
def verify_token():
    return jsonify({
        'success': True,
        'message': 'Token is valid.',
        'user': request.admin_user
    })

# KPI Stats Endpoint
@api_bp.route('/stats', methods=['GET'])
def get_stats():
    stats = db_get_stats()
    return jsonify({'success': True, 'data': stats})

# Duplicate Check (distance-based)
@api_bp.route('/check-duplicate', methods=['POST'])
def check_duplicate():
    data = request.get_json(silent=True) or {}
    lat = data.get('latitude')
    lng = data.get('longitude')
    
    if lat is None or lng is None:
        return jsonify({'success': False, 'message': 'Latitude and Longitude are required for duplicate check.'}), 400
        
    reports = get_all_reports()
    res = check_nearby_duplicates(float(lat), float(lng), reports)
    return jsonify({'success': True, 'data': res})

# Demo Seed Endpoint
@api_bp.route('/seed-demo', methods=['POST'])
def seed_demo():
    reset_list = reset_demo_data()
    return jsonify({
        'success': True,
        'message': 'Demo dataset reset successfully.',
        'count': len(reset_list),
        'data': reset_list
    })
