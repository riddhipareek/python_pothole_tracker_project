"""
FixMyRoad - Municipal SLA Accountability & Citizen Road Hazard Platform
Python (Flask) Backend Server
"""
import os
import sys
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure stdout handles unicode cleanly
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load environment configuration
load_dotenv()

# Base directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Initialize Flask application
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# Register API routes blueprint
from backend.routes import api_bp
app.register_blueprint(api_bp)

# Root route serves index.html
@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# Catch-all route to serve HTML pages and static assets
@app.route('/<path:filename>')
def serve_static(filename):
    file_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_DIR, filename)
    return jsonify({'success': False, 'message': f"Resource '{filename}' not found."}), 404

# Global error handler
@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'message': 'Internal server error occurred.',
        'error': str(e)
    }), 500

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 5000))
    print("=================================================")
    print("FixMyRoad Python Server is actively running!")
    print(f"Web App:  http://localhost:{PORT}")
    print(f"API:      http://localhost:{PORT}/api/health")
    print(f"Reports:  http://localhost:{PORT}/api/reports")
    print("=================================================")
    app.run(host='0.0.0.0', port=PORT, debug=True)
