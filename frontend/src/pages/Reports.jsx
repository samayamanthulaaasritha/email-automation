import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Reports({ onAddToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getCampaigns();
      if (res.success) {
        setCampaigns(res.campaigns);
      }
    } catch (err) {
      onAddToast('Failed to load reports: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Reports & Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Audit records and download comprehensive Excel delivery reports.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchCampaigns}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileSpreadsheet size={18} color="var(--primary)" />
            Campaign Delivery Reports
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading reports...
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <FileSpreadsheet size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              No reports available
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Completed email campaigns will automatically generate downloadable Excel reports here.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Sender</th>
                  <th>Excel File</th>
                  <th>Date</th>
                  <th>Target</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Download Report</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const sentCount = c.results?.filter(r => r.status === 'Sent').length || 0;
                  const failedCount = c.results?.filter(r => r.status === 'Failed').length || 0;
                  const total = c.valid_recipients?.length || 0;

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.sender_email}</td>
                      <td>{c.excel_filename || '—'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {c.sent_at ? new Date(c.sent_at).toLocaleString() : new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{total}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{sentCount}</td>
                      <td style={{ color: failedCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {failedCount}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <a 
                          href={api.getReportDownloadUrl(c.id)}
                          download
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
                        >
                          <Download size={14} />
                          Excel (.xlsx)
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
