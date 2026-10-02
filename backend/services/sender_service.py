import os
import json
import uuid
import smtplib
from typing import List, Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
SENDERS_FILE = os.path.join(DATA_DIR, 'senders.json')

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SENDERS_FILE):
        with open(SENDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)

def get_all_senders(include_passwords: bool = False) -> List[Dict]:
    """Retrieve all sender accounts. By default, never includes app_password."""
    ensure_data_dir()
    try:
        with open(SENDERS_FILE, 'r', encoding='utf-8') as f:
            senders = json.load(f)
            
        if include_passwords:
            return senders
            
        # Omit app_password for security whenever returning to frontend/APIs
        sanitized = []
        for s in senders:
            sanitized.append({
                "id": s.get("id"),
                "display_name": s.get("display_name"),
                "email": s.get("email"),
                "created_at": s.get("created_at"),
                "is_configured": bool(s.get("app_password"))
            })
        return sanitized
    except Exception as e:
        print(f"Error reading senders: {e}")
        return []

def get_sender_by_id(sender_id: str, include_password: bool = False) -> Optional[Dict]:
    """Retrieve a single sender account."""
    senders = get_all_senders(include_passwords=True)
    for s in senders:
        if s.get("id") == sender_id:
            if include_password:
                return s
            return {
                "id": s.get("id"),
                "display_name": s.get("display_name"),
                "email": s.get("email"),
                "created_at": s.get("created_at"),
                "is_configured": bool(s.get("app_password"))
            }
    return None

def test_gmail_credentials(email: str, app_password: str) -> Dict:
    """
    Safely tests and validates the mail password against Google SMTP.
    Never logs or exposes the password.
    """
    clean_email = email.strip()
    clean_password = app_password.replace(" ", "").strip()
    
    if not clean_email or not clean_password:
        return {"success": False, "message": "Email address and mail password are required."}
        
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=8)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(clean_email, clean_password)
        server.quit()
        return {
            "success": True, 
            "message": "Connected to Google SMTP successfully! Real emails can now be dispatched to recipient inboxes."
        }
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "message": "Google SMTP rejected this password (535 BadCredentials). Google strictly blocks regular account passwords on SMTP. You must generate a Google App Password from myaccount.google.com/apppasswords to send real emails."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"SMTP connection error: {str(e)}"
        }

def add_sender(display_name: str, email: str, app_password: str) -> Dict:
    """Adds a new sender account after testing or saving."""
    ensure_data_dir()
    from datetime import datetime
    
    senders = get_all_senders(include_passwords=True)
    
    clean_email = email.strip().lower()
    clean_password = app_password.replace(" ", "").strip()
    
    # Check if this email already exists
    for s in senders:
        if s.get("email", "").lower() == clean_email:
            # Update existing sender
            s["display_name"] = display_name.strip()
            s["app_password"] = clean_password
            s["updated_at"] = datetime.now().isoformat()
            with open(SENDERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(senders, f, indent=2)
            return {
                "id": s["id"],
                "display_name": s["display_name"],
                "email": s["email"],
                "is_configured": True
            }
            
    new_sender = {
        "id": str(uuid.uuid4()),
        "display_name": display_name.strip(),
        "email": clean_email,
        "app_password": clean_password,
        "created_at": datetime.now().isoformat()
    }
    
    senders.append(new_sender)
    with open(SENDERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(senders, f, indent=2)
        
    return {
        "id": new_sender["id"],
        "display_name": new_sender["display_name"],
        "email": new_sender["email"],
        "is_configured": True
    }

def delete_sender(sender_id: str) -> bool:
    """Deletes a sender account."""
    ensure_data_dir()
    senders = get_all_senders(include_passwords=True)
    initial_len = len(senders)
    senders = [s for s in senders if s.get("id") != sender_id]
    
    if len(senders) < initial_len:
        with open(SENDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(senders, f, indent=2)
        return True
    return False
