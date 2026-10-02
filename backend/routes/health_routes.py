from flask import Blueprint, jsonify
from datetime import datetime

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint. Never exposes sensitive configuration."""
    return jsonify({
        "status": "ok",
        "backend": "connected",
        "timestamp": datetime.now().isoformat()
    }), 200
