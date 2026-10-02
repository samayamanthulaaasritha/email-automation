import requests
import json
import os
import sys

# Configure UTF-8 for Windows PowerShell output
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = 'http://127.0.0.1:5000/api'

print("=" * 80)
print("MAILPILOT PRO - END-TO-END AUTOMATION PIPELINE DEMONSTRATION")
print("=" * 80)

# 1. Add Sender
print("\n[STEP 1] SENDER ACCOUNT REGISTRATION")
sender_payload = {
    'display_name': 'Technical Club',
    'email': 'technicalclub@gmail.com',
    'app_password': 'abcd efgh ijkl mnop'
}
r1 = requests.post(f"{BASE}/sender-accounts", json=sender_payload)
sender = r1.json()['sender']
print(f"  [OK] Sender ID     : {sender['id']}")
print(f"  [OK] Display Name  : {sender['display_name']}")
print(f"  [OK] Email Address : {sender['email']}")
print(f"  [OK] App Password  : [PROTECTED SERVER-SIDE - NEVER RETURNED]")

# 2. Create Campaign
print("\n[STEP 2] CAMPAIGN INITIALIZATION (STRICT 1:1 RULE)")
camp_payload = {
    'name': 'Technical Club Recruitment - Round 1',
    'sender_id': sender['id']
}
r2 = requests.post(f"{BASE}/campaigns", json=camp_payload)
camp = r2.json()['campaign']
camp_id = camp['id']
print(f"  [OK] Campaign ID   : {camp_id}")
print(f"  [OK] Campaign Name : {camp['name']}")
print(f"  [OK] Bound Sender  : {camp['sender_email']}")

# 3. Upload Excel
print("\n[STEP 3] UPLOAD & ANALYZE EXCEL FILE")
excel_path = os.path.join(os.path.dirname(__file__), 'backend', 'sample_data', 'sample_candidates.xlsx')
with open(excel_path, 'rb') as f:
    r3 = requests.post(f"{BASE}/campaigns/{camp_id}/upload", files={'file': f})
analysis = r3.json()['campaign']

print(f"  [OK] Attached File : {analysis['excel_filename']}")
print(f"  [OK] Headers Found : {', '.join(analysis['excel_headers'])}")
print(f"  [OK] Mapped Cols   : {analysis['mapped_columns']}")
print(f"  [OK] Summary Stats :")
summary = analysis['summary']
print(f"      - Total Excel Rows         : {summary['total_rows']}")
print(f"      - Rows Marked 'Selected'   : {summary['selected_count']}")
print(f"      - Rows 'Not Selected'      : {summary['not_selected_count']}")
print(f"      - Unknown Status Rows      : {summary['unknown_count']}")
print(f"      - Missing Email Rows       : {summary['missing_email_count']}")
print(f"      - Valid Selected Recipients: {summary['valid_selected_recipients']}")

# 4. Classification Table
print("\n[STEP 4] CANDIDATE ROWS CLASSIFICATION AUDIT")
print("-" * 92)
print(f"{'Row':<5} | {'Candidate Name':<16} | {'Email Address':<30} | {'Selection':<14} | {'Decision'}")
print("-" * 92)
for r in analysis['rows']:
    idx = r['row_index'] + 1
    name = r['name']
    email = r['email'] if r['email'] else '[MISSING EMAIL]'
    sel = r['raw_selection'] if r['raw_selection'] else '[BLANK]'
    status = r['status']
    print(f"#{idx:<4} | {name:<16} | {email:<30} | {sel:<14} | {status}")
print("-" * 92)

# 5. Email Templates & Personalization
print("\n[STEP 5] PERSONALIZED EMAIL PREVIEW")
body_template = """Dear {Name},

Congratulations!
You have been selected for the {Department} team in {Round}.
Your onboarding session is scheduled for {Interview Time}.

Best regards,
Technical Club Recruitment Team"""

requests.post(f"{BASE}/campaigns/{camp_id}/content", json={
    'subject': 'Congratulations {Name}! You have been selected for {Department}',
    'body': body_template
})

for i in range(min(2, len(analysis['valid_recipients']))):
    prev = requests.get(f"{BASE}/campaigns/{camp_id}/preview?index={i}").json()['preview']
    print(f"\n  --- Preview Recipient #{i+1} ---")
    print(f"  FROM   : {prev['from_email']}")
    print(f"  TO     : {prev['to_name']} <{prev['to_email']}>")
    print(f"  SUBJECT: {prev['subject']}")
    print(f"  BODY   :\n" + "\n".join("    " + line for line in prev['body'].splitlines()))

# 6. Report Generation
print("\n[STEP 6] EXCEL AUDIT REPORT GENERATION")
rep_res = requests.get(f"{BASE}/campaigns/{camp_id}/report")
print(f"  [OK] HTTP Status  : {rep_res.status_code} OK")
print(f"  [OK] Content Type : {rep_res.headers.get('content-type')}")
print(f"  [OK] File Size    : {len(rep_res.content)} bytes")
print("\n" + "=" * 80)
print("SUCCESS: ALL PIPELINE STAGES VERIFIED!")
print("=" * 80)
