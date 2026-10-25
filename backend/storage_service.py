"""
In-memory storage & 90-day SLA engine for FixMyRoad Python backend.
"""
import json
import os
import random
import string
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .constants import SLA_OVERDUE_DAYS

DEMO_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'demoReports.json')

def load_demo_data() -> List[Dict[str, Any]]:
    if os.path.exists(DEMO_DATA_PATH):
        with open(DEMO_DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

in_memory_reports: List[Dict[str, Any]] = load_demo_data()

def parse_iso_datetime(dt_str: str) -> datetime:
    try:
        # Replace Z with +00:00 for fromisoformat compatibility
        clean_str = dt_str.replace('Z', '+00:00')
        return datetime.fromisoformat(clean_str)
    except Exception:
        return datetime.now(timezone.utc)

def enrich_report(report: Dict[str, Any]) -> Dict[str, Any]:
    enriched = dict(report)
    created_dt = parse_iso_datetime(enriched.get('createdAt', ''))
    now_dt = datetime.now(timezone.utc)
    
    diff = now_dt - created_dt
    days_unresolved = max(0, diff.days)
    is_overdue_90_days = (enriched.get('status') != 'Rectified') and (days_unresolved >= SLA_OVERDUE_DAYS)
    
    if days_unresolved == 0:
        age_display = 'Today'
    elif days_unresolved == 1:
        age_display = '1 day ago'
    else:
        age_display = f"{days_unresolved} days ago"

    enriched['daysUnresolved'] = days_unresolved
    enriched['isOverdue90Days'] = is_overdue_90_days
    enriched['ageDisplay'] = age_display
    return enriched

def get_all_reports(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    global in_memory_reports
    enriched_list = [enrich_report(r) for r in in_memory_reports]
    
    if filters:
        status_filter = filters.get('status')
        if status_filter:
            enriched_list = [r for r in enriched_list if r.get('status', '').lower() == status_filter.lower()]
            
        severity_filter = filters.get('severity')
        if severity_filter:
            enriched_list = [r for r in enriched_list if r.get('severity', '').lower() == severity_filter.lower()]
            
        overdue_filter = filters.get('overdue')
        if overdue_filter is not None and str(overdue_filter).lower() == 'true':
            enriched_list = [r for r in enriched_list if r.get('isOverdue90Days')]

    # Sort: Overdue first, then newest createdAt first
    def sort_key(r):
        overdue_rank = 0 if r.get('isOverdue90Days') else 1
        created_ts = parse_iso_datetime(r.get('createdAt', '')).timestamp()
        return (overdue_rank, -created_ts)

    enriched_list.sort(key=sort_key)
    return enriched_list

def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    global in_memory_reports
    for r in in_memory_reports:
        if r.get('reportId') == report_id or r.get('id') == report_id:
            return enrich_report(r)
    return None

def create_report(report_data: Dict[str, Any]) -> Dict[str, Any]:
    global in_memory_reports
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    ts_suffix = str(int(datetime.now().timestamp()))[-6:]
    report_id = f"FMR-{ts_suffix}-{rand_suffix}"

    loc = report_data.get('location', {})
    new_report = {
        'reportId': report_id,
        'title': report_data.get('title') or f"Road Hazard on {loc.get('roadName') or 'Reported Location'}",
        'description': report_data.get('description') or 'Pothole reported by citizen.',
        'location': {
            'latitude': float(loc.get('latitude', 0.0)),
            'longitude': float(loc.get('longitude', 0.0)),
            'roadName': loc.get('roadName') or 'Road Location Recorded',
            'city': loc.get('city') or 'Bengaluru',
            'pincode': loc.get('pincode') or ''
        },
        'severity': report_data.get('severity') or 'Medium',
        'photoUrl': report_data.get('photoUrl') or '',
        'status': 'Pending',
        'reportedBy': report_data.get('reportedBy') or 'Citizen (Anonymous)',
        'createdAt': now_iso,
        'updatedAt': now_iso,
        'rectifiedAt': None,
        'rectifiedBy': None,
        'adminRemarks': '',
        'aiMetadata': report_data.get('aiMetadata') or None
    }
    
    in_memory_reports.insert(0, new_report)
    return enrich_report(new_report)

def mark_report_rectified(report_id: str, admin_email: str = 'admin@fixmyroad.gov.in', remarks: str = '') -> Optional[Dict[str, Any]]:
    global in_memory_reports
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    for r in in_memory_reports:
        if r.get('reportId') == report_id or r.get('id') == report_id:
            r['status'] = 'Rectified'
            r['rectifiedAt'] = now_iso
            r['rectifiedBy'] = admin_email
            r['updatedAt'] = now_iso
            if remarks:
                r['adminRemarks'] = remarks
            return enrich_report(r)
    return None

def update_report_status(report_id: str, status: str, remarks: str = '') -> Optional[Dict[str, Any]]:
    global in_memory_reports
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    for r in in_memory_reports:
        if r.get('reportId') == report_id or r.get('id') == report_id:
            r['status'] = status
            r['updatedAt'] = now_iso
            if remarks:
                r['adminRemarks'] = remarks
            return enrich_report(r)
    return None

def get_stats() -> Dict[str, Any]:
    reports = get_all_reports()
    total = len(reports)
    pending = len([r for r in reports if r.get('status') == 'Pending'])
    in_progress = len([r for r in reports if r.get('status') == 'In Progress'])
    critical = len([r for r in reports if r.get('severity') == 'Critical' and r.get('status') != 'Rectified'])
    high = len([r for r in reports if r.get('severity') == 'High' and r.get('status') != 'Rectified'])
    overdue_90_days = len([r for r in reports if r.get('isOverdue90Days')])
    rectified = len([r for r in reports if r.get('status') == 'Rectified'])
    res_rate = round((rectified / total) * 100) if total > 0 else 0

    return {
        'total': total,
        'pending': pending,
        'inProgress': in_progress,
        'critical': critical,
        'high': high,
        'overdue90Days': overdue_90_days,
        'rectified': rectified,
        'resolutionRate': res_rate
    }

def reset_demo_data() -> List[Dict[str, Any]]:
    global in_memory_reports
    in_memory_reports = load_demo_data()
    return [enrich_report(r) for r in in_memory_reports]
