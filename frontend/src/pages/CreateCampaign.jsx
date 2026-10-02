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
  Check
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function CreateCampaign({ onNavigate, onAddToast, preselectedCampaignId }) {
  // Workflow step: 
  // 1: Upload Excel & Select Main Mail
  // 2: Read Rows & Check Selection (Selected vs Not Selected Split)
  // 3: Prepare Email & Preview
  // 4: Send from Main Mail & Live Sending Status
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Sender & Campaign State
  const [senders, setSenders] = useState([]);
  const [campaignName, setCampaignName] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [campaignId, setCampaignId] = useState(null);
  const [campaignData, setCampaignData] = useState(null);

  // File Upload
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Email Composer
  const [subject, setSubject] = useState('Congratulations! You Have Been Selected');
  const [body, setBody] = useState(
`Dear {Name},

Congratulations!
You have been selected for the next round of our process.

Department: {Department}
Round: {Round}

Further schedule and details will follow shortly.

Best regards,
Selection Committee`
  );

  // Preview State
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewData, setPreviewData] = useState(null);

  // Confirm Modal & Duplicate Warning
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Sending & Progress
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const progressPollingRef = useRef(null);

  // Column Mapping Overrides (if needed)
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [nameCol, setNameCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [selectionCol, setSelectionCol] = useState('');

  // Fetch Senders on Mount
  useEffect(() => {
    const init = async () => {
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
    init();

    if (preselectedCampaignId) {
      loadExisting(preselectedCampaignId);
    }
  }, [preselectedCampaignId]);

  const loadExisting = async (id) => {
    try {
      setLoading(true);
      const res = await api.getCampaign(id);
      if (res.success) {
        const camp = res.campaign;
        setCampaignId(camp.id);
        setCampaignName(camp.name);
        setSelectedSenderId(camp.sender_id);
        setCampaignData(camp);
        if (camp.subject) setSubject(camp.subject);
        if (camp.body) setBody(camp.body);

        if (camp.status === 'completed' || camp.status === 'sending') {
          setCurrentStep(4);
          if (camp.status === 'sending') startProgressPolling(camp.id);
        } else if (camp.excel_filename) {
          setCurrentStep(2);
        }
      }
    } catch (err) {
      onAddToast('Failed to load campaign: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Upload Excel and Read Rows
  const handleUploadAndAnalyze = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      onAddToast('Unsupported file. Please upload an .xlsx or .xls file.', 'error');
      return;
    }

    if (!selectedSenderId) {
      onAddToast('Please select a main Gmail sender account first.', 'warning');
      return;
    }

    try {
      setLoading(true);
      let currentCampId = campaignId;

      // Create campaign shell if not yet created
      if (!currentCampId) {
        const autoName = campaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`;
        const newCampRes = await api.createCampaign({
          name: autoName,
          sender_id: selectedSenderId
        });
        if (!newCampRes.success) throw new Error(newCampRes.error);
        currentCampId = newCampRes.campaign.id;
        setCampaignId(currentCampId);
        setCampaignName(autoName);
      }

      // Upload and parse Excel
      const uploadRes = await api.uploadExcel(currentCampId, file);
      if (uploadRes.success) {
        setCampaignData(uploadRes.campaign);
        setNameCol(uploadRes.campaign.mapped_columns.name_column || '');
        setEmailCol(uploadRes.campaign.mapped_columns.email_column || '');
        setSelectionCol(uploadRes.campaign.mapped_columns.selection_column || '');
        onAddToast(`Excel parsed: ${uploadRes.campaign.summary.total_rows} rows read successfully!`, 'success');
        setCurrentStep(2);
      }
    } catch (err) {
      onAddToast('Error reading Excel: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remap columns if user modifies them
  const handleRemapColumns = async () => {
    try {
      setLoading(true);
      const res = await api.mapColumns(campaignId, {
        name_column: nameCol,
        email_column: emailCol,
        selection_column: selectionCol
      });
      if (res.success) {
        setCampaignData(res.campaign);
        setShowColumnMapper(false);
        onAddToast('Columns re-evaluated successfully!', 'success');
      }
    } catch (err) {
      onAddToast('Error updating column mapping: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> STEP 3: Proceed to Prepare Email
  const handleProceedToPrepare = async () => {
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

  // STEP 3 -> STEP 4: Confirm and Send
  const handleConfirmSend = async (force = false) => {
    setShowConfirmModal(false);
    try {
      setIsSending(true);
      setCurrentStep(4);
      const res = await api.sendCampaign(campaignId, force);
      
      if (res.warning) {
        setDuplicateWarning(res.warning);
        setIsSending(false);
        return;
      }

      onAddToast('Sending process started!', 'info');
      startProgressPolling(campaignId);
    } catch (err) {
      setIsSending(false);
      onAddToast('Sending failed to initiate: ' + err.message, 'error');
    }
  };

  // Polling for sending status
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
              onAddToast('All eligible emails processed successfully!', 'success');
            } else {
              onAddToast('Campaign ended: ' + (res.error_message || 'Stopped'), 'error');
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

  const selectedSender = senders.find(s => s.id === selectedSenderId);
  const validRecipients = campaignData?.valid_recipients || [];
  const allRows = campaignData?.rows || [];
  const ignoredRows = allRows.filter(r => !r.can_send);

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      
      {/* VISUAL WORKFLOW FLOWCHART BANNER (Directly mirrors user specification) */}
      <div className="workflow-diagram-card">
        <div className="workflow-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Live Workflow Pipeline
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Strict Selection Filter Engine
          </span>
        </div>

        <div className="workflow-track">
          <div className={`workflow-node ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}>
            {currentStep > 1 ? <Check size={14} /> : '1'} Upload Excel
          </div>
          <span className="workflow-arrow-separator">&rarr;</span>

          <div className={`workflow-node ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}>
            {currentStep > 2 ? <Check size={14} /> : '2'} Read Every Row &amp; Check "Selection"
          </div>
          <span className="workflow-arrow-separator">&rarr;</span>

          <div className={`workflow-node ${currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : ''}`}>
            {currentStep > 3 ? <Check size={14} /> : '3'} Prepare Email (Selected Only)
          </div>
          <span className="workflow-arrow-separator">&rarr;</span>

          <div className={`workflow-node ${currentStep === 4 ? 'current' : ''}`}>
            4 Send from Main Mail &amp; Show Status
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD EXCEL & SELECT MAIN MAIL */}
      {currentStep === 1 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Upload size={18} color="var(--primary)" />
              Step 1: Choose Main Mail &amp; Upload Excel
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Main Sender Mail (Your Account) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              {senders.length === 0 ? (
                <div style={{ padding: '12px', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  No sender accounts found.{' '}
                  <button 
                    onClick={() => onNavigate('senders')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Add a Gmail Account
                  </button>
                </div>
              ) : (
                <select 
                  className="form-select"
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  required
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name} ({s.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Campaign Reference Label (Optional)</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Round 1 Selection"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div 
            className={`dropzone ${isDragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleUploadAndAnalyze(e.dataTransfer.files[0]);
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
                  handleUploadAndAnalyze(e.target.files[0]);
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
              Drag and drop your <strong>.xlsx</strong> or <strong>.xls</strong> file here, or click to browse
            </p>
            <button type="button" className="btn btn-secondary">
              Browse Files
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Sample test spreadsheet available at: <code>backend/sample_data/sample_candidates.xlsx</code>
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: READ EVERY ROW & CHECK SELECTION (THE BRANCHING STEP) */}
      {currentStep === 2 && campaignData && (
        <div>
          {/* Header Summary */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <div className="card-title">
                <FileSpreadsheet size={18} color="var(--primary)" />
                Read Every Row &bull; Total: {campaignData.summary.total_rows} Rows in {campaignData.excel_filename}
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 10px' }}
                onClick={() => setShowColumnMapper(!showColumnMapper)}
              >
                {showColumnMapper ? 'Hide Column Settings' : 'Verify Column Headers'}
              </button>
            </div>

            {/* Column Mapper Drawer (Only if user wants to override) */}
            {showColumnMapper && (
              <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Verify Detected Excel Columns:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Candidate Name Column</label>
                    <select className="form-select" value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                      {campaignData.excel_headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Email Address Column</label>
                    <select className="form-select" value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                      {campaignData.excel_headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px' }}>Selection Column</label>
                    <select className="form-select" value={selectionCol} onChange={(e) => setSelectionCol(e.target.value)}>
                      {campaignData.excel_headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={handleRemapColumns}>
                  Update Column Mapping
                </button>
              </div>
            )}

            {/* THE TWO BRANCHES (SELECTED vs NOT SELECTED) */}
            <div className="branch-split-view">
              
              {/* ↙ BRANCH A: SELECTED -> PREPARE EMAIL */}
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
                <p style={{ fontSize: '13px', color: '#065f46', marginBottom: '12px', fontWeight: 500 }}>
                  &rarr; <strong>Action: Prepare email</strong>. These candidates will receive personalized messages.
                </p>

                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', background: '#ffffff' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
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

              {/* ↘ BRANCH B: NOT SELECTED -> DO NOTHING */}
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
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 500 }}>
                  &rarr; <strong>Action: Do nothing</strong>. Excluded completely. Zero emails will be sent.
                </p>

                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', background: '#ffffff' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                <ArrowLeft size={16} /> Re-upload Excel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleProceedToPrepare}
                disabled={validRecipients.length === 0}
              >
                Prepare Email for {validRecipients.length} Selected Candidates
                <ArrowRight size={16} />
              </button>
            </div>
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

            {/* Recipient switcher preview */}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            
            {/* Editor */}
            <div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  FROM: <span style={{ color: 'var(--primary)' }}>{selectedSender?.display_name} &lt;{campaignData.sender_email}&gt;</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  TO: <strong>{validRecipients.length} Selected Candidates</strong> (Excluded {ignoredRows.length} unselected)
                </div>
              </div>

              {/* Variable chips */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Click to insert personalized Excel variables:
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
                <label className="form-label">Subject</label>
                <input 
                  type="text"
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea 
                  className="form-textarea"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Live Instant Preview Card */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Live Recipient Preview
              </div>

              {previewData ? (
                <div className="email-preview-box" style={{ background: '#f8fafc', height: 'calc(100% - 30px)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>
                    <div><strong>TO:</strong> {previewData.to_name} &lt;{previewData.to_email}&gt;</div>
                    <div style={{ marginTop: '4px' }}><strong>SUBJECT:</strong> {previewData.subject}</div>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft size={16} /> Back to Rows
            </button>
            <button 
              className="btn btn-primary"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => setShowConfirmModal(true)}
            >
              <Send size={16} />
              Send from {campaignData.sender_email} ({validRecipients.length} Selected)
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SEND FROM MAIN MAIL & SHOW SENDING STATUS */}
      {currentStep === 4 && campaignData && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {isSending ? (
                <>
                  <RefreshCw size={20} className="animate-spin" color="var(--primary)" />
                  Sending Emails from {campaignData.sender_email}...
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

          {/* Real-time Progress Bar */}
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

          {/* Quick Metrics */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="metric-card info">
              <div className="metric-data">
                <h3>Selected Queue</h3>
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
                <h3>Ignored (Do Nothing)</h3>
                <div className="value">{ignoredRows.length}</div>
              </div>
            </div>
          </div>

          {/* Live Delivery Status Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient Name</th>
                  <th>Email Address</th>
                  <th>Selection Status</th>
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
                      <td style={{ color: res.error ? 'var(--danger)' : 'var(--text-muted)', fontSize: '12px' }}>
                        {res.error || '—'}
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
            <button className="btn btn-secondary" onClick={() => onNavigate('campaigns')}>
              View All Campaigns
            </button>
            {campaignData.status === 'completed' && (
              <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Email Dispatch"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
              onClick={() => handleConfirmSend(false)}
            >
              SEND {validRecipients.length} EMAILS NOW
            </button>
          </>
        }
      >
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <div><strong>Main Mail Sender:</strong> {selectedSender?.email}</div>
            <div><strong>Excel Source:</strong> {campaignData?.excel_filename}</div>
            <div><strong>Selected Candidates to Email:</strong> <span style={{ color: 'var(--success)', fontWeight: 700 }}>{validRecipients.length}</span></div>
            <div><strong>Not Selected (Do Nothing):</strong> {ignoredRows.length} ignored</div>
          </div>
          <p>
            Are you sure you want to dispatch real emails to the {validRecipients.length} selected candidates from <strong>{selectedSender?.email}</strong>?
          </p>
        </div>
      </Modal>

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarning && (
        <Modal
          isOpen={Boolean(duplicateWarning)}
          onClose={() => setDuplicateWarning(null)}
          title="Duplicate Send Protection"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setDuplicateWarning(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  setDuplicateWarning(null);
                  handleConfirmSend(true);
                }}
              >
                Yes, Force Resend
              </button>
            </>
          }
        >
          <div style={{ color: '#991b1b', background: 'var(--danger-light)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)' }}>
            <AlertTriangle size={20} style={{ marginBottom: '8px' }} />
            <p><strong>Warning:</strong> {duplicateWarning}</p>
          </div>
        </Modal>
      )}

    </div>
  );
}
