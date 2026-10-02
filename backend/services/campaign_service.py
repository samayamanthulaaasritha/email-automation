import os
import json
import uuid
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional

from services.sender_service import get_sender_by_id
from services.excel_service import parse_excel_file
from services.email_service import send_campaign_emails, substitute_placeholders
from services.report_service import generate_campaign_excel_report

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
DEFAULT_UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
is_vercel = bool(os.environ.get('VERCEL') or os.environ.get('AWS_LAMBDA_FUNCTION_NAME'))

if is_vercel:
    import tempfile
    import shutil
    DATA_DIR = os.path.join(tempfile.gettempdir(), 'email_automation_data')
    UPLOADS_DIR = os.path.join(tempfile.gettempdir(), 'email_automation_uploads')
else:
    DATA_DIR = DEFAULT_DATA_DIR
    UPLOADS_DIR = DEFAULT_UPLOADS_DIR

CAMPAIGNS_FILE = os.path.join(DATA_DIR, 'campaigns.json')

# In-memory progress tracking for live status
campaign_progress_tracker: Dict[str, Dict[str, Any]] = {}

def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    if not os.path.exists(CAMPAIGNS_FILE):
        default_file = os.path.join(DEFAULT_DATA_DIR, 'campaigns.json')
        if os.path.exists(default_file):
            try:
                import shutil
                shutil.copy2(default_file, CAMPAIGNS_FILE)
            except Exception:
                with open(CAMPAIGNS_FILE, 'w', encoding='utf-8') as f:
                    json.dump([], f)
        else:
            with open(CAMPAIGNS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)

def get_all_campaigns() -> List[Dict[str, Any]]:
    ensure_dirs()
    try:
        with open(CAMPAIGNS_FILE, 'r', encoding='utf-8') as f:
            campaigns = json.load(f)
        # Sort by updated_at or created_at descending
        return sorted(campaigns, key=lambda c: c.get("updated_at", c.get("created_at", "")), reverse=True)
    except Exception as e:
        print(f"Error reading campaigns: {e}")
        return []

def get_campaign_by_id(campaign_id: str) -> Optional[Dict[str, Any]]:
    campaigns = get_all_campaigns()
    for c in campaigns:
        if c.get("id") == campaign_id:
            # Merge active progress if running
            if campaign_id in campaign_progress_tracker:
                c["progress"] = campaign_progress_tracker[campaign_id]
            return c
    return None

def save_campaign(campaign: Dict[str, Any]):
    ensure_dirs()
    campaigns = get_all_campaigns()
    updated = False
    campaign["updated_at"] = datetime.now().isoformat()
    
    for i, c in enumerate(campaigns):
        if c.get("id") == campaign.get("id"):
            campaigns[i] = campaign
            updated = True
            break
            
    if not updated:
        campaigns.append(campaign)
        
    with open(CAMPAIGNS_FILE, 'w', encoding='utf-8') as f:
        json.dump(campaigns, f, indent=2)

def create_campaign(name: str, sender_id: str) -> Dict[str, Any]:
    """
    Creates a new campaign strictly linked to ONE sender account.
    """
    sender = get_sender_by_id(sender_id, include_password=False)
    if not sender:
        raise ValueError("Selected sender account does not exist.")
        
    campaign_id = str(uuid.uuid4())
    new_campaign = {
        "id": campaign_id,
        "name": name.strip(),
        "sender_id": sender["id"],
        "sender_email": sender["email"],
        "sender_name": sender["display_name"],
        "excel_filename": None,
        "excel_file_path": None,
        "excel_headers": [],
        "mapped_columns": {
            "name_column": None,
            "email_column": None,
            "selection_column": None
        },
        "detection_confident": False,
        "summary": {
            "total_rows": 0,
            "selected_count": 0,
            "not_selected_count": 0,
            "unknown_count": 0,
            "missing_email_count": 0,
            "valid_selected_recipients": 0
        },
        "rows": [],
        "valid_recipients": [],
        "subject": "",
        "body": "",
        "status": "draft", # draft -> ready -> sending -> completed -> failed
        "error_message": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "sent_at": None,
        "progress": {
            "current_index": 0,
            "total": 0,
            "current_email": "",
            "current_name": "",
            "status": "Idle",
            "sent_count": 0,
            "failed_count": 0
        },
        "results": []
    }
    
    save_campaign(new_campaign)
    return new_campaign

def attach_excel_to_campaign(campaign_id: str, uploaded_file, original_filename: str) -> Dict[str, Any]:
    """
    Attaches exactly ONE Excel file to the campaign.
    Replaces any previously uploaded Excel file.
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
        
    ensure_dirs()
    
    # Remove old file if existed
    if campaign.get("excel_file_path") and os.path.exists(campaign["excel_file_path"]):
        try:
            os.remove(campaign["excel_file_path"])
        except Exception:
            pass
            
    # Save new file
    safe_filename = f"{campaign_id}_{original_filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)
    uploaded_file.save(file_path)
    
    # Parse and analyze Excel
    analysis = parse_excel_file(file_path)
    
    campaign["excel_filename"] = original_filename
    campaign["excel_file_path"] = file_path
    campaign["excel_headers"] = analysis["headers"]
    campaign["mapped_columns"] = analysis["mapped_columns"]
    campaign["detection_confident"] = analysis["detection_confident"]
    campaign["summary"] = analysis["summary"]
    campaign["rows"] = analysis["rows"]
    campaign["valid_recipients"] = analysis["valid_recipients"]
    campaign["status"] = "ready" if analysis["valid_recipients"] else "draft"
    
    save_campaign(campaign)
    return campaign

def remap_campaign_columns(campaign_id: str, mapping: Dict[str, str]) -> Dict[str, Any]:
    """
    Updates column mapping and re-analyzes rows.
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
    if not campaign.get("excel_file_path") or not os.path.exists(campaign["excel_file_path"]):
        raise ValueError("No Excel file found for this campaign.")
        
    analysis = parse_excel_file(campaign["excel_file_path"], column_mapping=mapping)
    
    campaign["mapped_columns"] = analysis["mapped_columns"]
    campaign["detection_confident"] = True
    campaign["summary"] = analysis["summary"]
    campaign["rows"] = analysis["rows"]
    campaign["valid_recipients"] = analysis["valid_recipients"]
    campaign["status"] = "ready" if analysis["valid_recipients"] else "draft"
    
    save_campaign(campaign)
    return campaign

def update_campaign_email_content(campaign_id: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Saves the email subject and body template.
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
        
    campaign["subject"] = subject
    campaign["body"] = body
    save_campaign(campaign)
    return campaign

def get_email_preview(campaign_id: str, recipient_index: int = 0) -> Dict[str, Any]:
    """
    Generates a personalized preview for a specific recipient index.
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
        
    valid_recipients = campaign.get("valid_recipients", [])
    if not valid_recipients:
        # Fallback to dummy data
        sample_data = {"name": "Candidate Name", "email": "candidate@example.com"}
        return {
            "from_email": campaign.get("sender_email"),
            "to_email": "candidate@example.com",
            "to_name": "Candidate Name",
            "subject": substitute_placeholders(campaign.get("subject", ""), sample_data),
            "body": substitute_placeholders(campaign.get("body", ""), sample_data),
            "current_index": 0,
            "total_recipients": 0
        }
        
    idx = max(0, min(recipient_index, len(valid_recipients) - 1))
    recipient = valid_recipients[idx]
    custom_data = dict(recipient.get("custom_data", {}))
    custom_data["Name"] = recipient.get("name", "")
    custom_data["name"] = recipient.get("name", "")
    custom_data["Email"] = recipient.get("email", "")
    custom_data["email"] = recipient.get("email", "")
    
    return {
        "from_email": campaign.get("sender_email"),
        "from_name": campaign.get("sender_name"),
        "to_email": recipient.get("email"),
        "to_name": recipient.get("name"),
        "subject": substitute_placeholders(campaign.get("subject", ""), custom_data),
        "body": substitute_placeholders(campaign.get("body", ""), custom_data),
        "current_index": idx,
        "total_recipients": len(valid_recipients)
    }

def execute_campaign_send(campaign_id: str, force_resend: bool = False, demo_mode: bool = False) -> Dict[str, Any]:
    """
    Validates everything upfront and triggers email sending (Real SMTP or Demo Simulation).
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
        
    # Check if already sent
    if campaign.get("status") == "completed" and not force_resend:
        return {
            "warning": "This campaign has already been processed. Sending again may result in duplicate emails.",
            "requires_confirmation": True
        }
        
    # Upfront strict validations
    sender = get_sender_by_id(campaign.get("sender_id"), include_password=True)
    if not sender or not sender.get("app_password"):
        from services.sender_service import get_all_senders
        all_senders = get_all_senders(include_passwords=True)
        for s in all_senders:
            if s.get("email", "").lower() == campaign.get("sender_email", "").lower():
                sender = s
                campaign["sender_id"] = s["id"]
                save_campaign(campaign)
                break
        if not sender and all_senders:
            sender = all_senders[0]
            campaign["sender_id"] = sender["id"]
            save_campaign(campaign)
            
    if not sender or not sender.get("app_password"):
        raise ValueError("Sender account not configured or missing mail password.")
        
    if not campaign.get("excel_file_path") or not os.path.exists(campaign["excel_file_path"]):
        raise ValueError("Excel file not found. Please upload an Excel file.")
        
    mapped = campaign.get("mapped_columns", {})
    if not mapped.get("email_column"):
        raise ValueError("Email column not found. Please select the correct email column.")
    if not mapped.get("selection_column"):
        raise ValueError("Selection column not found. Please select the column that determines who should receive the email.")
        
    valid_recipients = campaign.get("valid_recipients", [])
    if not valid_recipients:
        raise ValueError("No valid email addresses were found among selected candidates.")
        
    if not campaign.get("subject", "").strip():
        raise ValueError("Email subject cannot be empty.")
    if not campaign.get("body", "").strip():
        raise ValueError("Email body cannot be empty.")
        
    # Initialize sending state
    campaign["status"] = "sending"
    campaign["error_message"] = None
    save_campaign(campaign)
    
    total = len(valid_recipients)
    campaign_progress_tracker[campaign_id] = {
        "current_index": 0,
        "total": total,
        "current_email": "",
        "current_name": "",
        "status": "Dispatching emails from CLUB EMAIL...",
        "sent_count": 0,
        "failed_count": 0,
        "latest_result": None
    }
    
    def run_sending_thread():
        def progress_cb(prog_data):
            campaign_progress_tracker[campaign_id].update(prog_data)
            
        send_result = send_campaign_emails(
            sender_info=sender,
            recipients=valid_recipients,
            subject_template=campaign.get("subject", ""),
            body_template=campaign.get("body", ""),
            progress_callback=progress_cb,
            demo_mode=demo_mode
        )
        
        c = get_campaign_by_id(campaign_id)
        if not c:
            return
            
        if not send_result.get("success"):
            c["status"] = "failed"
            c["error_message"] = send_result.get("error")
        else:
            c["status"] = "completed"
            c["sent_at"] = datetime.now().isoformat()
            
        c["results"] = send_result.get("results", [])
        save_campaign(c)
        
        if campaign_id in campaign_progress_tracker:
            campaign_progress_tracker[campaign_id]["status"] = "Complete" if send_result.get("success") else "Failed"
            campaign_progress_tracker[campaign_id]["error"] = send_result.get("error")
            campaign_progress_tracker[campaign_id]["results"] = send_result.get("results", [])
            
    if is_vercel:
        run_sending_thread()
    else:
        thread = threading.Thread(target=run_sending_thread, daemon=True)
        thread.start()
    
    return {
        "success": True,
        "message": f"Sending started for {total} recipients ({'Demo Mode' if demo_mode else 'Live SMTP'}).",
        "campaign_id": campaign_id,
        "total": total,
        "demo_mode": demo_mode
    }

def get_campaign_progress(campaign_id: str) -> Dict[str, Any]:
    """
    Returns real-time progress for active sending campaigns.
    """
    campaign = get_campaign_by_id(campaign_id)
    if not campaign:
        raise ValueError("Campaign not found.")
        
    prog = campaign_progress_tracker.get(campaign_id, {
        "current_index": len(campaign.get("results", [])),
        "total": len(campaign.get("valid_recipients", [])),
        "status": campaign.get("status"),
        "sent_count": len([r for r in campaign.get("results", []) if r.get("status") == "Sent"]),
        "failed_count": len([r for r in campaign.get("results", []) if r.get("status") == "Failed"])
    })
    
    return {
        "campaign_id": campaign_id,
        "status": campaign.get("status"),
        "error_message": campaign.get("error_message"),
        "progress": prog,
        "results": campaign.get("results", [])
    }

def delete_campaign(campaign_id: str) -> bool:
    campaigns = get_all_campaigns()
    init_len = len(campaigns)
    to_delete = None
    for c in campaigns:
        if c.get("id") == campaign_id:
            to_delete = c
            break
            
    if to_delete:
        if to_delete.get("excel_file_path") and os.path.exists(to_delete["excel_file_path"]):
            try:
                os.remove(to_delete["excel_file_path"])
            except Exception:
                pass
        campaigns = [c for c in campaigns if c.get("id") != campaign_id]
        with open(CAMPAIGNS_FILE, 'w', encoding='utf-8') as f:
            json.dump(campaigns, f, indent=2)
        if campaign_id in campaign_progress_tracker:
            del campaign_progress_tracker[campaign_id]
        return True
    return False
