import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Eye, 
  UserCheck, 
  Mail, 
  Ban,
  ChevronLeft, 
  ChevronRight,
  GitBranch,
  ShieldCheck,
  Check,
  Settings
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function WorkflowPage({ onNavigate, onAddToast }) {
  // Workflow Steps:
  // 1: Upload Excel & Select Club Email
  // 2: Read Every Row -> Check "Selection" column (Selected vs Not Selected)
  // 3: Prepare Email & Preview
  // 4: Send from CLUB EMAIL & Show Sending Status
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Club Sender Accounts
  const [senders, setSenders] = useState([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  
  // Campaign & File
  const [campaignId, setCampaignId] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Email Template
  const [subject, setSubject] = useState('Congratulations! You Have Been Selected');
  const [body, setBody] = useState(
`Dear {Name},

Congratulations!
We are pleased to inform you that you have been selected for the next round of our process.

Department: {Department}
Round: {Round}

Further details and schedule will be communicated shortly.

Best regards,
Club Selection Team`
  );

  // Preview State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewData, setPreviewData] = useState(null);

  // Sending & Live Status
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const progressPollingRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load configured senders
  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const res = await api.getSenders();
        if (res.success && res.senders.length > 0) {
          setSenders(res.senders);
          setSelectedSenderId(res.senders[0].id);
        }
      } catch (err) {
        onAddToast('Failed to load sender accounts: ' + err.message, 'error');
      }
    };
    fetchSenders();
  }, []);

  // STEP 1: Handle Upload & Parse
  const handleUploadFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      onAddToast('Unsupported file format. Please upload an .xlsx or .xls file.', 'error');
      return;
    }

    if (!selectedSenderId) {
      onAddToast('Please select a Club Email from the dropdown first.', 'warning');
      return;
    }

    try {
      setLoading(true);
      let activeCampId = campaignId;

      if (!activeCampId) {
        const campRes = await api.createCampaign({
          name: `Campaign ${new Date().toLocaleDateString()} - ${file.name}`,
          sender_id: selectedSenderId
        });
        if (!campRes.success) throw new Error(campRes.error);
        activeCampId = campRes.campaign.id;
        setCampaignId(activeCampId);
      }

      const uploadRes = await api.uploadExcel(activeCampId, file);
      if (uploadRes.success) {
        setCampaignData(uploadRes.campaign);
        onAddToast(`Read ${uploadRes.campaign.summary.total_rows} rows from ${file.name}`, 'success');
        setCurrentStep(2);
      }
    } catch (err) {
      onAddToast('Error reading Excel: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> STEP 3: Prepare Email
  const handlePrepareEmail = async () => {
    try {
      setLoading(true);
      await api.saveContent(campaignId, { subject, body });
      await loadPreview(0);
      setCurrentStep(3);
    } catch (err) {
      onAddToast('Error preparing email: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (idx) => {
    try {
      const res = await api.getPreview(campaignId, idx);
      if (res.success) {
        setPreviewData(res.preview);
        setPreviewIndex(res.preview.current_index);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInsertTag = (tag) => {
    setBody((prev) => prev + ` {${tag}}`);
  };

  // STEP 3 -> STEP 4: Send from CLUB EMAIL & Show Status
  const handleConfirmSend = async (demoMode = false) => {
    setShowConfirmModal(false);
    try {
      setIsSending(true);
      setCurrentStep(4);
      const res = await api.sendCampaign(campaignId, true, demoMode);
      onAddToast('Sending emails from CLUB EMAIL...', 'info');
      startProgressPolling(campaignId);
    } catch (err) {
      setIsSending(false);
      onAddToast('Failed to start sending: ' + err.message, 'error');
    }
  };

  const startProgressPolling = (id) => {
    if (progressPollingRef.current) clearInterval(progressPollingRef.current);
    progressPollingRef.current = setInterval(async () => {
      try {
        const res = await api.getProgress(id);
        if (res.success) {
          setSendProgress(res.progress);
          if (res.status === 'completed' || res.status === 'failed') {
            clearInterval(progressPollingRef.current);
            setIsSending(false);
            const fullCamp = await api.getCampaign(id);
            if (fullCamp.success) setCampaignData(fullCamp.campaign);
            if (res.status === 'completed') {
              onAddToast('Emails successfully delivered to selected candidates!', 'success');
            } else {
              onAddToast('Sending stopped with issues: ' + (res.error_message || 'Authentication error'), 'error');
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (progressPollingRef.current) clearInterval(progressPollingRef.current);
    };
  }, []);

  const selectedSenderObj = senders.find(s => s.id === selectedSenderId);
  const validRecipients = campaignData?.valid_recipients || [];
  const allRows = campaignData?.rows || [];
  const ignoredRows = allRows.filter(r => !r.can_send);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* FLOWCHART HEADER (Exact visual diagram matching user requirements) */}
      <div className="card" style={{ marginBottom: '24px', background: '#ffffff', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Automatic Selection Pipeline
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Strict 1:1 Flow
          </span>
        </div>

        {/* Dynamic Flow Diagram */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', padding: '8px 0' }}>
          <div className={`workflow-node ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}>
            {currentStep > 1 ? <Check size={14} /> : '1'} Upload Excel
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>&rarr;</span>

          <div className={`workflow-node ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}>
            {currentStep > 2 ? <Check size={14} /> : '2'} Read Every Row &bull; Check "Selection"
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>&rarr;</span>

          <div className={`workflow-node ${currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : ''}`}>
            {currentStep > 3 ? <Check size={14} /> : '3'} Prepare Email (Selected Only)
          </div>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>&rarr;</span>

          <div className={`workflow-node ${currentStep === 4 ? 'current' : ''}`}>
            4 Send from CLUB EMAIL &bull; Live Status
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD EXCEL & SELECT CLUB EMAIL */}
      {currentStep === 1 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Upload size={18} color="var(--primary)" />
              Step 1: Upload Selection Excel &amp; Choose CLUB EMAIL
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '6px 10px' }}
              onClick={() => onNavigate('settings')}
            >
              <Settings size={13} />
              Manage Sender Mails
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontSize: '14px' }}>
              CLUB EMAIL (Selected Sender Mail) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            {senders.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--warning-light)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                No Club Sender Mails found.{' '}
                <button 
                  onClick={() => onNavigate('settings')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Go to Settings to Add Club Email
                </button>
              </div>
            ) : (
              <select 
                className="form-select"
                style={{ fontSize: '15px', fontWeight: 600, padding: '12px' }}
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                required
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} — {s.email}
                  </option>
                ))}
              </select>
            )}
            {selectedSenderObj && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Outgoing emails will be dispatched directly from: <strong style={{ color: 'var(--primary)' }}>{selectedSenderObj.email}</strong>
              </p>
            )}
          </div>

          {/* Drag & Drop Excel Uploader */}
          <div 
            className={`dropzone ${isDragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleUploadFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />
            <div className="dropzone-icon">
              <FileSpreadsheet size={48} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Upload Selection Excel Spreadsheet
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              Drag &amp; drop your <strong>.xlsx</strong> or <strong>.xls</strong> file here, or click to browse
            </p>
            <button type="button" className="btn btn-secondary">
              Browse Excel Files
            </button>
          </div>

          <div style={{ marginTop: '18px', padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Tip: A test Excel with Selected, Not Selected, and Pending candidates is ready at <code>backend/sample_data/sample_candidates.xlsx</code>
          </div>
        </div>
      )}

      {/* STEP 2: READ EVERY ROW -> CHECK SELECTION (SELECTED vs NOT SELECTED SPLIT) */}
      {currentStep === 2 && campaignData && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <FileSpreadsheet size={18} color="var(--primary)" />
                Read Every Row &bull; Total {campaignData.summary.total_rows} Rows Read
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                Spreadsheet: <strong>{campaignData.excel_filename}</strong> &bull; Checking column <strong>"{campaignData.mapped_columns.selection_column}"</strong>
              </p>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => setCurrentStep(1)}>
              <ArrowLeft size={13} /> Re-upload File
            </button>
          </div>

          {/* TWO BRANCHES: SELECTED vs NOT SELECTED */}
          <div className="branch-split-view">
            
            {/* ↙ BRANCH 1: SELECTED -> PREPARE EMAIL */}
            <div className="branch-panel branch-selected">
              <div className="branch-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}>
                  <CheckCircle2 size={20} />
                  ↙ Branch: "Selected"
                </span>
                <span className="badge badge-success" style={{ fontSize: '13px' }}>
                  {validRecipients.length} Candidates
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#065f46', marginBottom: '12px', fontWeight: 600 }}>
                &rarr; Action: Prepare email. These candidates will receive personalized messages.
              </p>

              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', background: '#ffffff' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Email Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRecipients.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: 'var(--primary)' }}>{r.email}</td>
                        <td>
                          <StatusBadge status="Ready" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ↘ BRANCH 2: NOT SELECTED -> DO NOTHING */}
            <div className="branch-panel branch-unselected">
              <div className="branch-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <Ban size={20} />
                  ↘ Branch: "Not Selected"
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '13px' }}>
                  {ignoredRows.length} Ignored
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>
                &rarr; Action: Do nothing. Excluded completely. Zero emails will be sent.
              </p>

              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto', background: '#ffffff' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Email Address</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ignoredRows.map((r, i) => (
                      <tr key={i} style={{ opacity: 0.8 }}>
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{r.email || '—'}</td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              From CLUB EMAIL: <strong>{campaignData.sender_email}</strong>
            </span>
            <button 
              className="btn btn-primary"
              onClick={handlePrepareEmail}
              disabled={validRecipients.length === 0}
            >
              Prepare Email for {validRecipients.length} Selected Candidates
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREPARE EMAIL & PREVIEW */}
      {currentStep === 3 && campaignData && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Mail size={18} color="var(--primary)" />
              Step 3: Prepare Email for Selected Candidates
            </div>

            {/* Recipient switcher */}
            {previewData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  disabled={previewIndex <= 0}
                  onClick={() => loadPreview(previewIndex - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  Preview: {previewIndex + 1} of {validRecipients.length}
                </span>
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  disabled={previewIndex >= validRecipients.length - 1}
                  onClick={() => loadPreview(previewIndex + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Editor */}
            <div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  SEND FROM CLUB EMAIL: <span style={{ color: 'var(--primary)' }}>{selectedSenderObj?.display_name} &lt;{campaignData.sender_email}&gt;</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  RECIPIENTS: <strong>{validRecipients.length} Selected Candidates</strong> (Excluded {ignoredRows.length} unselected)
                </div>
              </div>

              {/* Tag chips */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Click to insert Excel columns dynamically:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Name', 'Email', ...(campaignData.excel_headers || [])].map((col) => (
                    <button
                      key={col}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px', background: '#f1f5f9' }}
                      onClick={() => handleInsertTag(col)}
                    >
                      +{`{${col}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Subject</label>
                <input 
                  type="text"
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Body</label>
                <textarea 
                  className="form-textarea"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Live Instant Preview */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Personalized Preview
              </div>
              {previewData ? (
                <div className="email-preview-box" style={{ background: '#f8fafc', height: 'calc(100% - 30px)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>
                    <div><strong>FROM:</strong> {previewData.from_name} &lt;{previewData.from_email}&gt;</div>
                    <div style={{ marginTop: '2px' }}><strong>TO:</strong> {previewData.to_name} &lt;{previewData.to_email}&gt;</div>
                    <div style={{ marginTop: '2px' }}><strong>SUBJECT:</strong> {previewData.subject}</div>
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-line' }}>
                    {previewData.body}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading preview...
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft size={16} /> Back to Rows
            </button>
            <button 
              className="btn btn-primary"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => setShowConfirmModal(true)}
            >
              <Send size={16} />
              Send from CLUB EMAIL ({validRecipients.length} Selected Candidates)
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SEND FROM CLUB EMAIL & SHOW SENDING STATUS */}
      {currentStep === 4 && campaignData && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {isSending ? (
                <>
                  <RefreshCw size={20} className="animate-spin" color="var(--primary)" />
                  Sending Emails from CLUB EMAIL ({campaignData.sender_email})...
                </>
              ) : campaignData.status === 'completed' ? (
                <>
                  <CheckCircle2 size={20} color="var(--success)" />
                  Campaign Complete &bull; Status Reported
                </>
              ) : (
                <>
                  <AlertTriangle size={20} color="var(--danger)" />
                  Campaign Status: {campaignData.status}
                </>
              )}
            </div>

            {campaignData.status === 'completed' && (
              <a 
                href={api.getReportDownloadUrl(campaignData.id)}
                download
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <Download size={16} />
                Download Excel Report (.xlsx)
              </a>
            )}
          </div>

          {/* Actionable Error Resolution Card if Sending Failed */}
          {campaignData.status === 'failed' && (
            <div style={{ marginBottom: '20px', padding: '18px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '15px' }}>
                <AlertTriangle size={20} />
                Google Authentication Failed (535 BadCredentials)
              </div>
              <p style={{ color: '#7f1d1d', fontSize: '13px', marginTop: '6px', lineHeight: '1.6' }}>
                <strong>Why this happened:</strong> Google rejected the password. Google's mail server strictly blocks your personal Gmail account password from external apps. To deliver real emails into candidate inboxes, you must generate a <strong>Google App Password</strong>.
              </p>
              <div style={{ margin: '12px 0', padding: '12px 14px', background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#334155' }}>
                <strong style={{ color: '#c2410c' }}>How to fix in 1 minute:</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: '1.6' }}>
                  <li>Ensure 2-Step Verification is turned ON at <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>myaccount.google.com/security</a>.</li>
                  <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>myaccount.google.com/apppasswords</a>.</li>
                  <li>Type App name <em>"Club Email"</em> and click <strong>Create</strong>.</li>
                  <li>Copy the 16-letter code generated by Google (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                  <li>Click <strong>Update Password in Settings</strong> below and paste it as your Mail Password.</li>
                </ol>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                  onClick={() => onNavigate('settings')}
                >
                  <Settings size={15} />
                  Update Password in Settings
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                  onClick={() => handleConfirmSend(false)}
                >
                  <Send size={15} />
                  Retry Sending
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isSending && sendProgress && (
            <div style={{ marginBottom: '24px' }}>
              <div className="progress-container">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.round((sendProgress.current_index / (sendProgress.total || 1)) * 100)}%` }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>Sending to: <strong>{sendProgress.current_email}</strong></span>
                <span>{sendProgress.current_index} / {sendProgress.total}</span>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="metric-card info">
              <div className="metric-data">
                <h3>Selected Targets</h3>
                <div className="value">{validRecipients.length}</div>
              </div>
            </div>
            <div className="metric-card success">
              <div className="metric-data">
                <h3>Successfully Sent</h3>
                <div className="value">
                  {campaignData.results?.filter(r => r.status === 'Sent').length || sendProgress?.sent_count || 0}
                </div>
              </div>
            </div>
            <div className="metric-card danger">
              <div className="metric-data">
                <h3>Failed</h3>
                <div className="value">
                  {campaignData.results?.filter(r => r.status === 'Failed').length || sendProgress?.failed_count || 0}
                </div>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-data">
                <h3>Do Nothing (Ignored)</h3>
                <div className="value">{ignoredRows.length}</div>
              </div>
            </div>
          </div>

          {/* Detailed Delivery Status Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Email Address</th>
                  <th>Excel Selection</th>
                  <th>Delivery Status</th>
                  <th>Reason / Error</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.results && campaignData.results.length > 0 ? (
                  campaignData.results.map((res, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{res.name}</td>
                      <td>{res.email}</td>
                      <td>{res.selection}</td>
                      <td>
                        <StatusBadge status={res.status} />
                      </td>
                      <td style={{ color: res.status === 'Sent' ? '#065f46' : 'var(--danger)', fontSize: '12px' }}>
                        {res.error || 'Delivered successfully'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Connecting to Gmail SMTP server...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
              Start New Campaign
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Email Dispatch"
        footer={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => handleConfirmSend(false)}
            >
              <Send size={16} /> Send from CLUB EMAIL ({validRecipients.length} Candidates)
            </button>
          </div>
        }
      >
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <div><strong>CLUB EMAIL:</strong> {campaignData?.sender_email}</div>
            <div><strong>Excel Source:</strong> {campaignData?.excel_filename}</div>
            <div><strong>Selected to Send:</strong> <span style={{ color: 'var(--success)', fontWeight: 700 }}>{validRecipients.length} Candidates</span></div>
            <div><strong>Not Selected (Do Nothing):</strong> {ignoredRows.length} Ignored</div>
          </div>
          <p>
            You are ready to send personalized selection emails directly from <strong>{campaignData?.sender_email}</strong> to all <strong>{validRecipients.length} selected candidates</strong>.
          </p>
        </div>
      </Modal>

    </div>
  );
}
