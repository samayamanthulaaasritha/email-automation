from flask import Blueprint, request, jsonify
from services.sender_service import (
    get_all_senders,
    add_sender,
    delete_sender,
    test_gmail_credentials
)
from utils.validation import is_valid_email

sender_bp = Blueprint('senders', __name__)

@sender_bp.route('/sender-accounts', methods=['GET'])
def list_senders():
    """List all sender accounts. Never returns mail passwords."""
    senders = get_all_senders(include_passwords=False)
    return jsonify({"success": True, "senders": senders}), 200

@sender_bp.route('/sender-accounts', methods=['POST'])
def create_sender():
    """Add or update a sender account."""
    data = request.get_json() or {}
    display_name = data.get("display_name", "").strip()
    email = data.get("email", "").strip()
    app_password = (data.get("password") or data.get("app_password") or "").strip()
    
    if not display_name:
        return jsonify({"success": False, "error": "Display Name is required."}), 400
    if not email:
        return jsonify({"success": False, "error": "Email address is required."}), 400
    if not is_valid_email(email):
        return jsonify({"success": False, "error": "Invalid email address format."}), 400
    if not app_password:
        return jsonify({"success": False, "error": "Mail Password is required."}), 400
        
    sender = add_sender(display_name, email, app_password)
    return jsonify({
        "success": True, 
        "message": "Sender account added successfully.", 
        "sender": sender
    }), 201

@sender_bp.route('/sender-accounts/test', methods=['POST'])
def test_sender():
    """Test mail credentials safely."""
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    app_password = (data.get("password") or data.get("app_password") or "").strip()
    
    if not email or not app_password:
        return jsonify({"success": False, "error": "Email and Mail Password are required to test."}), 400
        
    result = test_gmail_credentials(email, app_password)
    return jsonify(result), 200 if result.get("success") else 400

@sender_bp.route('/sender-accounts/<sender_id>', methods=['DELETE'])
def remove_sender(sender_id):
    """Delete a sender account."""
    deleted = delete_sender(sender_id)
    if not deleted:
        return jsonify({"success": False, "error": "Sender account not found."}), 404
    return jsonify({"success": True, "message": "Sender account deleted."}), 200
