import os
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from services.campaign_service import (
    get_all_campaigns,
    get_campaign_by_id,
    create_campaign,
    attach_excel_to_campaign,
    remap_campaign_columns,
    update_campaign_email_content,
    get_email_preview,
    execute_campaign_send,
    get_campaign_progress,
    delete_campaign
)
from services.report_service import generate_campaign_excel_report

campaign_bp = Blueprint('campaigns', __name__)

ALLOWED_EXTENSIONS = {'.xlsx', '.xls'}

def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

@campaign_bp.route('/campaigns', methods=['GET'])
def list_campaigns():
    """List all campaigns."""
    campaigns = get_all_campaigns()
    return jsonify({"success": True, "campaigns": campaigns}), 200

@campaign_bp.route('/campaigns', methods=['POST'])
def new_campaign():
    """Create a new campaign with exactly ONE sender account."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    sender_id = data.get("sender_id", "").strip()
    
    if not name:
        return jsonify({"success": False, "error": "Campaign name is required."}), 400
    if not sender_id:
        return jsonify({"success": False, "error": "Please select a sender account."}), 400
        
    try:
        camp = create_campaign(name, sender_id)
        return jsonify({"success": True, "campaign": camp}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to create campaign: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """Retrieve full campaign details."""
    camp = get_campaign_by_id(campaign_id)
    if not camp:
        return jsonify({"success": False, "error": "Campaign not found."}), 404
    return jsonify({"success": True, "campaign": camp}), 200

@campaign_bp.route('/campaigns/<campaign_id>', methods=['DELETE'])
def remove_campaign(campaign_id):
    """Delete a campaign."""
    success = delete_campaign(campaign_id)
    if not success:
        return jsonify({"success": False, "error": "Campaign not found."}), 404
    return jsonify({"success": True, "message": "Campaign deleted successfully."}), 200

@campaign_bp.route('/campaigns/<campaign_id>/upload', methods=['POST'])
def upload_excel(campaign_id):
    """Upload and attach ONE Excel file to the campaign. Replaces any existing Excel file."""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Please upload an Excel file."}), 400
        
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"success": False, "error": "No file selected."}), 400
        
    if not is_allowed_file(file.filename):
        return jsonify({"success": False, "error": "Unsupported file. Please upload an .xlsx or .xls file."}), 400
        
    try:
        camp = attach_excel_to_campaign(campaign_id, file, secure_filename(file.filename))
        return jsonify({"success": True, "campaign": camp}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to process Excel file: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>/map-columns', methods=['POST'])
def map_columns(campaign_id):
    """Update column mappings."""
    data = request.get_json() or {}
    mapping = {
        "name_column": data.get("name_column"),
        "email_column": data.get("email_column"),
        "selection_column": data.get("selection_column")
    }
    
    if not mapping["email_column"]:
        return jsonify({"success": False, "error": "Email column not found. Please select the correct email column."}), 400
    if not mapping["selection_column"]:
        return jsonify({"success": False, "error": "Selection column not found. Please select the column that determines who should receive the email."}), 400
        
    try:
        camp = remap_campaign_columns(campaign_id, mapping)
        return jsonify({"success": True, "campaign": camp}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to map columns: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>/content', methods=['POST'])
def save_content(campaign_id):
    """Save email subject and body template."""
    data = request.get_json() or {}
    subject = data.get("subject", "")
    body = data.get("body", "")
    
    if not subject.strip():
        return jsonify({"success": False, "error": "Email subject cannot be empty."}), 400
    if not body.strip():
        return jsonify({"success": False, "error": "Email body cannot be empty."}), 400
        
    try:
        camp = update_campaign_email_content(campaign_id, subject, body)
        return jsonify({"success": True, "campaign": camp}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save content: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>/preview', methods=['GET'])
def preview_email(campaign_id):
    """Get personalized preview for a recipient."""
    recipient_idx = request.args.get('index', 0, type=int)
    try:
        preview = get_email_preview(campaign_id, recipient_idx)
        return jsonify({"success": True, "preview": preview}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to generate preview: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>/send', methods=['POST'])
def send_campaign(campaign_id):
    """Initiates campaign sending."""
    data = request.get_json() or {}
    force_resend = data.get("force_resend", False)
    demo_mode = data.get("demo_mode", False)
    
    try:
        result = execute_campaign_send(campaign_id, force_resend=force_resend, demo_mode=demo_mode)
        if result.get("warning"):
            return jsonify({
                "success": False,
                "warning": result["warning"],
                "requires_confirmation": True
            }), 200
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to send campaign: {str(e)}"}), 500

@campaign_bp.route('/campaigns/<campaign_id>/progress', methods=['GET'])
def campaign_progress(campaign_id):
    """Poll live campaign progress."""
    try:
        prog = get_campaign_progress(campaign_id)
        return jsonify({"success": True, **prog}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 404

@campaign_bp.route('/campaigns/<campaign_id>/report', methods=['GET'])
def download_report(campaign_id):
    """Download campaign report as an Excel spreadsheet."""
    camp = get_campaign_by_id(campaign_id)
    if not camp:
        return jsonify({"success": False, "error": "Campaign not found."}), 404
        
    try:
        rows = camp.get("rows", [])
        report_path = generate_campaign_excel_report(camp, rows)
        return send_file(
            report_path,
            as_attachment=True,
            download_name=os.path.basename(report_path),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to generate report: {str(e)}"}), 500

@campaign_bp.route('/dashboard/stats', methods=['GET'])
def dashboard_stats():
    """Aggregate dashboard metrics."""
    campaigns = get_all_campaigns()
    
    total_campaigns = len(campaigns)
    total_emails_sent = 0
    successful_emails = 0
    failed_emails = 0
    total_selected_recipients = 0
    
    for c in campaigns:
        total_selected_recipients += c.get("summary", {}).get("selected_count", 0)
        for r in c.get("results", []):
            total_emails_sent += 1
            if r.get("status") == "Sent":
                successful_emails += 1
            elif r.get("status") == "Failed":
                failed_emails += 1
                
    recent = []
    for c in campaigns[:6]:
        recent.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "sender_email": c.get("sender_email"),
            "excel_filename": c.get("excel_filename"),
            "recipients_count": len(c.get("valid_recipients", [])),
            "status": c.get("status", "draft"),
            "created_at": c.get("created_at"),
            "sent_at": c.get("sent_at")
        })
        
    return jsonify({
        "success": True,
        "stats": {
            "total_campaigns": total_campaigns,
            "total_emails_sent": total_emails_sent,
            "successful_emails": successful_emails,
            "failed_emails": failed_emails,
            "selected_recipients": total_selected_recipients,
            "recent_campaigns": recent
        }
    }), 200
