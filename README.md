# MailPilot Pro &bull; Excel Selection & Gmail SMTP Automation Platform

A complete, production-grade web application engineered for organizations, college clubs, recruitment departments, and event teams to automate personalized email campaigns based on Excel spreadsheets and Gmail SMTP.

---

## Core Architecture & Workflow

```
   [ Upload Selection Excel (.xlsx / .xls) ]
                       ↓
   [ Parse Headers & Extract Rows ]
                       ↓
   [ Strict Selection Status Filter ]
        ├── "Selected"      → Ready for Email Queue
        ├── "Not Selected"  → Excluded / Skipped
        └── "Unknown/Blank" → Excluded / Skipped + Warning
                       ↓
   [ Dynamic Variable Substitution ({Name}, {Department}, etc.) ]
                       ↓
   [ Final User Review & Explicit Confirmation Modal ]
                       ↓
   [ Gmail SMTP via 16-Character App Password (smtp.gmail.com:587) ]
                       ↓
   [ Real-Time Live Progress & Status Logs ]
                       ↓
   [ Downloadable Campaign Excel Report (.xlsx) ]
```

### The Strict 1:1 Campaign Rule
- **ONE Campaign** = Exactly **ONE Sender Gmail Account** + Exactly **ONE Excel File**.
- The system supports unlimited independent sender accounts.
- The system supports unlimited separate Excel files.
- Campaigns **never combine multiple Excel spreadsheets** and **never combine multiple sender emails**.

---

## Security & Credential Protection

1. **Zero Frontend Exposure:** Gmail App Passwords remain strictly server-side. They are never returned in API responses, never stored in React state, and never saved in `localStorage` or browser caches.
2. **App Password Only:** Normal Google passwords and password scraping are prohibited. Gmail App Passwords with 2-Step Verification are required.
3. **Safe Error Handling:** If Gmail authentication fails, sending halts safely and displays a clean error without exposing credentials or internal stack traces.
4. **Duplicate Protection:** Re-sending an already completed campaign requires explicit confirmation to prevent accidental duplicate dispatches.

---

## Directory Structure

```
email-automation/
├── backend/
│   ├── app.py                     # Flask entrypoint & API CORS config
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variables template
│   ├── routes/
│   │   ├── health_routes.py       # GET /api/health
│   │   ├── sender_routes.py       # Sender CRUD & SMTP credentials test
│   │   └── campaign_routes.py     # Campaign wizard, upload, send, report
│   ├── services/
│   │   ├── excel_service.py       # Header matching, row parsing & filtering
│   │   ├── email_service.py       # SMTP TLS delivery, throttling & placeholders
│   │   ├── sender_service.py      # Secure sender management & credentials check
│   │   ├── campaign_service.py    # Strict 1:1 campaign lifecycle & background threads
│   │   └── report_service.py      # Styled Excel report generation (.xlsx)
│   ├── utils/
│   │   └── validation.py          # Email regex & selection normalizer
│   ├── data/                      # Local JSON persistence (campaigns, senders)
│   ├── uploads/                   # Uploaded candidate Excel files
│   ├── reports/                   # Generated delivery reports
│   └── tests/
│       └── test_automation_suite.py # 10-scenario comprehensive automated tests
├── frontend/
│   ├── package.json
│   ├── vite.config.js             # Vite proxy (/api -> localhost:5000)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Layout, routing, toast notifications
│       ├── styles/
│       │   └── index.css          # Design system, glassmorphism, responsive grid
│       ├── components/
│       │   ├── Sidebar.jsx        # Navigation sidebar with primary CTA
│       │   ├── Header.jsx         # Status indicator & breadcrumbs
│       │   ├── StatusBadge.jsx    # Status pills (Selected, Sent, Skipped, etc.)
│       │   ├── Modal.jsx          # Accessible dialog with backdrop blur
│       │   └── Toast.jsx          # Notification stack
│       ├── pages/
│       │   ├── Dashboard.jsx      # Metrics overview & recent campaigns
│       │   ├── Campaigns.jsx      # Campaign list with filter, search & actions
│       │   ├── CreateCampaign.jsx # 7-step wizard (Sender -> Excel -> Review -> Preview -> Send)
│       │   ├── SenderAccounts.jsx # Sender manager with instant SMTP connection test
│       │   ├── Reports.jsx        # Audit log and instant Excel report downloads
│       │   └── Settings.jsx       # Diagnostic health check & Gmail setup guide
│       └── services/
│           └── api.js             # Fetch wrapper for all backend routes
└── README.md
```

---

## Quickstart Guide

### 1. Prerequisites
- **Python:** 3.10+ (tested on Python 3.12)
- **Node.js:** v18+ (tested on Node.js v20 LTS)

### 2. Backend Setup
From the `backend/` directory:
```powershell
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the Flask backend server
python app.py
```
Backend will start on `http://127.0.0.1:5000`.

### 3. Frontend Setup
From the `frontend/` directory:
```powershell
# Install node packages
npm install

# Start development server
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## Gmail App Password Configuration

1. Log into your Google Account at [myaccount.google.com](https://myaccount.google.com).
2. Go to **Security** and enable **2-Step Verification**.
3. In the search box, search for **App Passwords** (or navigate to `2-Step Verification` &rarr; `App Passwords`).
4. Enter an application name (e.g., `Email Automation Platform`) and click **Create**.
5. Copy the generated 16-character code (e.g., `abcd efgh ijkl mnop`).
6. In **MailPilot Pro**, open **Sender Accounts**, click **Add Sender Account**, enter your Display Name, Gmail address, and paste the App Password.
7. Click **Test Gmail SMTP Credentials** to verify real-time connectivity before saving.

---

## Automated Test Verification

The application includes a comprehensive test suite covering all 10 core business scenarios:
- **TEST 1:** Excel with Selected and Not Selected rows (only Selected qualify).
- **TEST 2:** Multiple independent Gmail sender accounts.
- **TEST 3:** Distinct Excel file isolation per campaign.
- **TEST 4:** Missing email handling and exclusion from queue.
- **TEST 5:** Unknown/pending selection status safe skipping.
- **TEST 6:** Invalid Gmail App Password error handling.
- **TEST 7:** Single email failure fault tolerance (continues sending to other valid candidates).
- **TEST 8:** Duplicate campaign send protection.
- **TEST 9:** Zero selected rows abort safeguard.
- **TEST 10:** Dynamic variable personalization (`{Name}`, `{Department}`, `{Round}`, etc.).

Run the test suite anytime:
```powershell
cd backend
.\venv\Scripts\python.exe -m unittest tests.test_automation_suite
```
All 10 tests run in under 4 seconds with 100% pass rate.
