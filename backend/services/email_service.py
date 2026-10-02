import re
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Any, Callable, Optional

def substitute_placeholders(template: str, recipient_data: Dict[str, Any]) -> str:
    """
    Substitutes {Placeholder} tokens in subject or body using recipient custom data.
    Case-insensitive matching for convenience (e.g., {Name}, {name}, {NAME}).
    """
    if not template:
        return ""
        
    result = template
    lookup = {}
    for k, v in recipient_data.items():
        lookup[k.lower()] = str(v) if v is not None else ""
        
    if "name" in recipient_data:
        lookup["name"] = str(recipient_data["name"])
    if "email" in recipient_data:
        lookup["email"] = str(recipient_data["email"])
        
    def replace_match(match):
        key = match.group(1).strip().lower()
        if key in lookup:
            return lookup[key]
        return match.group(0)
        
    return re.sub(r"\{([^{}]+)\}", replace_match, result)

def send_campaign_emails(
    sender_info: Dict[str, Any],
    recipients: List[Dict[str, Any]],
    subject_template: str,
    body_template: str,
    progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    demo_mode: bool = False
) -> Dict[str, Any]:
    """
    Delivers personalized campaign emails to real recipient inboxes using Gmail SMTP.
    Provides accurate delivery reporting and never falsely marks emails as delivered.
    """
    sender_email = sender_info.get("email", "").strip()
    sender_name = sender_info.get("display_name", "").strip() or sender_email
    mail_password = sender_info.get("app_password", "").replace(" ", "").strip()
    
    total = len(recipients)
    sent_count = 0
    failed_count = 0
    results = []
    
    if not sender_email:
        return {
            "success": False,
            "error": "Sender email not configured.",
            "sent_count": 0,
            "failed_count": total,
            "results": []
        }

    # ========================================================
    # DEMO / SIMULATION MODE (Explicitly labeled)
    # ========================================================
    if demo_mode:
        for idx, rec in enumerate(recipients):
            rec_name = rec.get("name", "")
            rec_email = rec.get("email", "").strip()
            custom_data = dict(rec.get("custom_data", {}))
            custom_data["Name"] = rec_name
            custom_data["Email"] = rec_email

            if progress_callback:
                progress_callback({
                    "current_index": idx + 1,
                    "total": total,
                    "current_email": rec_email,
                    "current_name": rec_name,
                    "status": "Simulating...",
                    "sent_count": sent_count,
                    "failed_count": failed_count
                })

            time.sleep(0.4)
            sent_count += 1
            result_entry = {
                "name": rec_name,
                "email": rec_email,
                "selection": rec.get("selection", "Selected"),
                "status": "Sent (Simulated)",
                "error": "Demo Mode Simulation (No real email dispatched)",
                "sent_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            results.append(result_entry)

            if progress_callback:
                progress_callback({
                    "current_index": idx + 1,
                    "total": total,
                    "current_email": rec_email,
                    "current_name": rec_name,
                    "status": "Sent (Simulated)",
                    "sent_count": sent_count,
                    "failed_count": failed_count,
                    "latest_result": result_entry
                })

        return {
            "success": True,
            "sent_count": sent_count,
            "failed_count": 0,
            "total": total,
            "results": results
        }

    # ========================================================
    # REAL GMAIL SMTP INBOX DELIVERY
    # ========================================================
    smtp_server = None
    try:
        smtp_server = smtplib.SMTP('smtp.gmail.com', 587, timeout=12)
        smtp_server.ehlo()
        smtp_server.starttls()
        smtp_server.ehlo()
        smtp_server.login(sender_email, mail_password)
    except smtplib.SMTPAuthenticationError:
        err_msg = (
            "Google SMTP Authentication Failed (535 BadCredentials). "
            "Google strictly blocks regular Gmail account passwords on SMTP. "
            "To send real emails to candidate inboxes, you must generate a 16-letter App Password at https://myaccount.google.com/apppasswords."
        )
        for rec in recipients:
            results.append({
                "name": rec.get("name", ""),
                "email": rec.get("email", ""),
                "selection": rec.get("selection", "Selected"),
                "status": "Failed",
                "error": "Google rejected password: Google App Password required for real inbox delivery.",
                "sent_at": None
            })
        return {
            "success": False,
            "error": err_msg,
            "sent_count": 0,
            "failed_count": total,
            "results": results
        }
    except Exception as e:
        err_msg = f"Failed to connect to Gmail SMTP: {str(e)}"
        for rec in recipients:
            results.append({
                "name": rec.get("name", ""),
                "email": rec.get("email", ""),
                "selection": rec.get("selection", "Selected"),
                "status": "Failed",
                "error": err_msg,
                "sent_at": None
            })
        return {
            "success": False,
            "error": err_msg,
            "sent_count": 0,
            "failed_count": total,
            "results": results
        }

    # Deliver real email to each recipient's inbox
    for idx, rec in enumerate(recipients):
        rec_name = rec.get("name", "")
        rec_email = rec.get("email", "").strip()
        custom_data = dict(rec.get("custom_data", {}))
        custom_data["Name"] = rec_name
        custom_data["name"] = rec_name
        custom_data["Email"] = rec_email
        custom_data["email"] = rec_email
        
        personalized_subject = substitute_placeholders(subject_template, custom_data)
        personalized_body = substitute_placeholders(body_template, custom_data)
        
        if progress_callback:
            progress_callback({
                "current_index": idx + 1,
                "total": total,
                "current_email": rec_email,
                "current_name": rec_name,
                "status": "Dispatching to inbox...",
                "sent_count": sent_count,
                "failed_count": failed_count
            })

        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = rec_email
            msg["Subject"] = personalized_subject
            
            text_part = MIMEText(personalized_body, "plain", "utf-8")
            msg.attach(text_part)
            
            html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d3748; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }}
    .footer {{ margin-top: 30px; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; padding-top: 15px; }}
  </style>
</head>
<body>
  <div class="container">
    <div>{personalized_body.replace(chr(10), '<br>')}</div>
    <div class="footer">Sent via {sender_name}</div>
  </div>
</body>
</html>"""
            html_part = MIMEText(html_content, "html", "utf-8")
            msg.attach(html_part)
            
            smtp_server.send_message(msg)
            sent_count += 1
            rec_status = "Sent"
            rec_error = "Delivered to recipient inbox"
        except Exception as err:
            failed_count += 1
            rec_status = "Failed"
            rec_error = f"SMTP dispatch failed: {str(err)}"
            
        result_entry = {
            "name": rec_name,
            "email": rec_email,
            "selection": rec.get("selection", "Selected"),
            "status": rec_status,
            "error": rec_error,
            "sent_at": time.strftime("%Y-%m-%d %H:%M:%S") if rec_status == "Sent" else None
        }
        results.append(result_entry)
        
        if progress_callback:
            progress_callback({
                "current_index": idx + 1,
                "total": total,
                "current_email": rec_email,
                "current_name": rec_name,
                "status": rec_status,
                "sent_count": sent_count,
                "failed_count": failed_count,
                "latest_result": result_entry
            })
            
        time.sleep(0.3)
        
    try:
        if smtp_server:
            smtp_server.quit()
    except Exception:
        pass
        
    return {
        "success": sent_count > 0,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": total,
        "results": results
    }
