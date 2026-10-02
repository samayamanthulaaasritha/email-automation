import React, { useEffect, useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Layers, 
  ArrowRight, 
  PlusCircle, 
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard({ onNavigate, onSelectCampaign }) {
  const [stats, setStats] = useState({
    total_campaigns: 0,
    total_emails_sent: 0,
    successful_emails: 0,
    failed_emails: 0,
    selected_recipients: 0,
    recent_campaigns: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      {/* Top Banner / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Multi-Account Gmail SMTP & Excel Selection Engine
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchStats} title="Refresh Statistics">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('create-campaign')}>
            <PlusCircle size={16} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-data">
            <h3>Campaigns</h3>
            <div className="value">{stats.total_campaigns}</div>
          </div>
          <div className="metric-icon-box">
            <Layers size={22} />
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-data">
            <h3>Emails Sent</h3>
            <div className="value">{stats.total_emails_sent}</div>
          </div>
          <div className="metric-icon-box">
            <Send size={22} />
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-data">
            <h3>Successful</h3>
            <div className="value">{stats.successful_emails}</div>
          </div>
          <div className="metric-icon-box">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="metric-card danger">
          <div className="metric-data">
            <h3>Failed</h3>
            <div className="value">{stats.failed_emails}</div>
          </div>
          <div className="metric-icon-box">
            <XCircle size={22} />
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-data">
            <h3>Selected Pool</h3>
            <div className="value">{stats.selected_recipients}</div>
          </div>
          <div className="metric-icon-box">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Recent Campaigns Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} color="var(--primary)" />
            Recent Campaigns
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '13px', padding: '6px 12px' }}
            onClick={() => onNavigate('campaigns')}
          >
            View All Campaigns
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading dashboard analytics...
          </div>
        ) : stats.recent_campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Layers size={28} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>No campaigns yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
              Create your first email campaign by selecting a sender Gmail account and uploading your selection Excel file.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('create-campaign')}>
              <PlusCircle size={16} />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Sender Gmail</th>
                  <th>Excel File</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.sender_email}</td>
                    <td>{c.excel_filename || <span style={{ color: '#94a3b8' }}>None uploaded</span>}</td>
                    <td style={{ fontWeight: 600 }}>{c.recipients_count}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => onSelectCampaign(c.id)}
                      >
                        Open Details
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
