import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ExternalLink,
  ShieldAlert,
  MailCheck
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';

export default function SenderAccounts({ onAddToast }) {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchSenders = async () => {
    try {
      setLoading(true);
      const res = await api.getSenders();
      if (res.success) {
        setSenders(res.senders);
      }
    } catch (err) {
      onAddToast('Failed to fetch sender accounts: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
  }, []);

  const handleOpenModal = () => {
    setDisplayName('');
    setEmail('');
    setAppPassword('');
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleTestConnection = async () => {
    if (!email || !appPassword) {
      setTestResult({ success: false, message: 'Please enter both Gmail address and Mail Password.' });
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

  const handleSaveSender = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !appPassword.trim()) {
      onAddToast('Please fill in all required fields.', 'warning');
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
        onAddToast(`Sender account "${displayName}" added successfully!`, 'success');
        setIsModalOpen(false);
        fetchSenders();
      }
    } catch (err) {
      onAddToast('Error saving sender: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSender = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete sender account "${name}"?`)) return;
    try {
      setIsDeleting(id);
      await api.deleteSender(id);
      onAddToast(`Sender account deleted.`, 'info');
      fetchSenders();
    } catch (err) {
      onAddToast('Failed to delete sender: ' + err.message, 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Sender Accounts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Configure and manage authorized Gmail accounts with Mail Passwords.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={16} />
          Add Sender Account
        </button>
      </div>

      {/* Security Notice Callout */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e0e7ff',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Zero-Trust Credential Security
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Your Mail Password is encrypted and stored exclusively in secure server-side storage. 
            It is <strong>never returned to the browser, never visible in API responses, and never logged</strong>. 
            Each campaign can be assigned to its own dedicated sender account.
          </p>
        </div>
      </div>

      {/* Senders List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <KeyRound size={18} color="var(--primary)" />
            Active Sender Accounts ({senders.length})
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading sender accounts...
          </div>
        ) : senders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <KeyRound size={28} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              No sender accounts configured
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
              Add a Gmail sender account with its Mail Password to start launching email campaigns.
            </p>
            <button className="btn btn-primary" onClick={handleOpenModal}>
              <Plus size={16} />
              Add Sender Account
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Gmail Address</th>
                  <th>Mail Password Status</th>
                  <th>Configured</th>
                  <th>Actions</th>
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
                        Stored Server-Side (Masked)
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: '#fecaca' }}
                        onClick={() => handleDeleteSender(s.id, s.display_name)}
                        disabled={isDeleting === s.id}
                        title="Delete sender account"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sender Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Gmail Sender Account"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveSender}
              disabled={saving || !displayName || !email || !appPassword}
            >
              {saving ? 'Saving Account...' : 'Save Sender Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveSender}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g. Technical Club or Admissions Office"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gmail Address</label>
            <input 
              type="email"
              className="form-input"
              placeholder="e.g. technicalclub@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '6px' }}>Mail Password</label>
            <input 
              type="password"
              className="form-input"
              placeholder="Enter your Mail Password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              required
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Enter your email account password. Stored securely and server-side.
            </p>
          </div>

          {/* Test Connection Button */}
          <div style={{ marginBottom: '16px' }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={handleTestConnection}
              disabled={testing || !email || !appPassword}
            >
              {testing ? 'Testing SMTP Connection...' : 'Test Gmail SMTP Credentials'}
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              marginBottom: '16px',
              background: testResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: testResult.success ? '#065f46' : '#991b1b',
              border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
