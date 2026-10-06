import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  MailCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings({ onAddToast }) {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for Adding Sender Mails
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  const [serverError, setServerError] = useState(null);

  const fetchSenders = async () => {
    try {
      setLoading(true);
      setServerError(null);
      const res = await api.getSenders();
      if (res.success) {
        setSenders(res.senders);
      }
    } catch (err) {
      setServerError(err.message);
      onAddToast('Failed to load sender accounts: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const handleTestConnection = async () => {
    if (!email || !appPassword) {
      setTestResult({ success: false, message: 'Please enter both Club Gmail address and Mail Password.' });
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.testSender({ email, app_password: appPassword });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleAddSender = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !appPassword.trim()) {
      onAddToast('Please fill in all fields (Display Name, Club Gmail, and Mail Password).', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createSender({
        display_name: displayName,
        email,
        app_password: appPassword
      });
      if (res.success) {
        onAddToast(`Club email "${displayName}" (${email}) added successfully!`, 'success');
        setDisplayName('');
        setEmail('');
        setAppPassword('');
        setTestResult(null);
        fetchSenders();
      }
    } catch (err) {
      onAddToast('Error saving sender mail: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSender = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete sender mail "${name}"?`)) return;
    try {
      setIsDeleting(id);
      await api.deleteSender(id);
      onAddToast(`Sender mail removed.`, 'info');
      fetchSenders();
    } catch (err) {
      onAddToast('Failed to delete sender mail: ' + err.message, 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Settings &bull; Sender Mails</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Add and manage your Club Gmail Accounts using your Mail Password.
        </p>
      </div>

      {serverError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--danger, #ef4444)'
        }}>
          <AlertCircle size={20} />
          <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.4' }}>
            <strong>Backend Connection Offline:</strong> {serverError}. Please make sure the Python Flask server is running on port 5000 (via <code>npm run dev</code> or <code>start.bat</code>).
          </div>
          <button 
            type="button"
            onClick={fetchSenders}
            className="btn-secondary"
            style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Form: Add Club Sender Mail */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div className="card-title">
            <Plus size={18} color="var(--primary)" />
            Add Club Sender Mail
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
            <ShieldCheck size={16} />
            Stored Server-Side (Never Exposed)
          </div>
        </div>

        <form onSubmit={handleAddSender}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Club Display Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Technical Club or Events Club"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Club Gmail Address <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="email"
                className="form-input"
                placeholder="e.g. technicalclub@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Mail Password (Google App Password) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <a 
                href="https://myaccount.google.com/apppasswords" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
              >
                Generate App Password &rarr;
              </a>
            </div>
            <input 
              type="password"
              className="form-input"
              placeholder="Paste your 16-letter App Password (e.g. abcd efgh ijkl mnop)"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              required
            />
            <div className="info-callout info-callout-primary" style={{ marginTop: '8px', fontSize: '12px' }}>
              <strong>Why a Google App Password is required for real emails:</strong> Google SMTP strictly blocks regular Gmail account passwords. To ensure emails physically land in candidate inboxes:
              <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>myaccount.google.com/apppasswords</a> (ensure 2-Step Verification is turned ON).</li>
                <li>Type App name <em>"Email Automation"</em> and click <strong>Create</strong>.</li>
                <li>Copy the 16-letter code, paste it above, and click <strong>Verify Mail Password</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Test Status Banner if tested */}
          {testResult && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '16px',
              background: testResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: testResult.success ? '#065f46' : '#991b1b',
              border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={testing || !email || !appPassword}
            >
              {testing ? 'Verifying Password...' : 'Verify Mail Password'}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !displayName || !email || !appPassword}
            >
              {saving ? 'Adding Account...' : 'Add Club Sender Mail'}
            </button>
          </div>
        </form>
      </div>

      {/* List: Configured Sender Mails */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <MailCheck size={18} color="var(--primary)" />
            Configured Club Sender Mails ({senders.length})
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={fetchSenders}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Loading sender mails...
          </div>
        ) : senders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No club sender mails added yet. Use the form above to add your first Club Gmail account.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Club Display Name</th>
                  <th>Gmail Address</th>
                  <th>Credentials Status</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {senders.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.display_name}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{s.email}</td>
                    <td>
                      <span className="badge badge-success">
                        <CheckCircle size={13} />
                        Active &bull; Server-Side Masked
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger-border)', fontSize: '12px' }}
                        onClick={() => handleDeleteSender(s.id, s.display_name)}
                        disabled={isDeleting === s.id}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
