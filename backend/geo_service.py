"""
Geo-spatial distance utility using the Haversine formula in Python.
"""
import math
from typing import Dict, Any, List
from .constants import DUPLICATE_RADIUS_METERS

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    Calculate the great circle distance between two points on the earth in meters.
    """
    R = 6371000  # Earth radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(R * c)


def check_nearby_duplicates(latitude: float, longitude: float, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Find open (not yet rectified) reports within DUPLICATE_RADIUS_METERS of a point.
    Plain distance maths (Haversine), nothing more.
    """
    duplicates = []
    for report in reports:
        if report.get('status') != 'Rectified':
            loc = report.get('location', {})
            rep_lat = loc.get('latitude')
            rep_lon = loc.get('longitude')
            if rep_lat is not None and rep_lon is not None:
                dist = calculate_distance_meters(latitude, longitude, float(rep_lat), float(rep_lon))
                if dist <= DUPLICATE_RADIUS_METERS:
                    duplicates.append({
                        'reportId': report.get('reportId'),
                        'title': report.get('title'),
                        'distanceMeters': dist,
                        'severity': report.get('severity'),
                        'createdAt': report.get('createdAt'),
                        'ageDisplay': report.get('ageDisplay')
                    })

    return {
        'isPotentialDuplicate': len(duplicates) > 0,
        'radiusCheckedMeters': DUPLICATE_RADIUS_METERS,
        'duplicatesFound': duplicates
    }
