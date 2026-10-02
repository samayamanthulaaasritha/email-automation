import React, { useState, useEffect } from 'react';
import { 
  Send, 
  PlusCircle, 
  Trash2, 
  Download, 
  Search, 
  FileSpreadsheet,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function Campaigns({ onNavigate, onSelectCampaign, onAddToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getCampaigns();
      if (res.success) {
        setCampaigns(res.campaigns);
      }
    } catch (err) {
      onAddToast('Failed to load campaigns: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"?`)) return;
    try {
      await api.deleteCampaign(id);
      onAddToast('Campaign deleted.', 'info');
      fetchCampaigns();
    } catch (err) {
      onAddToast('Failed to delete campaign: ' + err.message, 'error');
    }
  };

  const filtered = campaigns.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.sender_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.excel_filename && c.excel_filename.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Campaigns</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage and track all discrete 1:1 Excel & Sender email campaigns.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('create-campaign')}>
          <PlusCircle size={16} />
          Create Campaign
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search campaigns by name, sender, or Excel file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="form-select"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready to Send</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <button className="btn btn-secondary" onClick={fetchCampaigns} title="Refresh List">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading campaigns...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <FileSpreadsheet size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              No campaigns found
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search criteria.' : 'Create your first campaign to get started.'}
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <button className="btn btn-primary" onClick={() => onNavigate('create-campaign')}>
                <PlusCircle size={16} />
                Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Sender Account</th>
                  <th>Attached Excel File</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectCampaign(c.id)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</td>
                    <td style={{ color: 'var(--primary)' }}>{c.sender_email}</td>
                    <td>
                      {c.excel_filename ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FileSpreadsheet size={13} color="#64748b" />
                          {c.excel_filename}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None uploaded</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.valid_recipients ? c.valid_recipients.length : 0}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(c.updated_at || c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {c.status === 'completed' && (
                          <a 
                            href={api.getReportDownloadUrl(c.id)}
                            download
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none' }}
                            title="Download Excel Report"
                          >
                            <Download size={13} />
                          </a>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => onSelectCampaign(c.id)}
                        >
                          Open <ArrowRight size={13} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: '#fecaca' }}
                          onClick={(e) => handleDelete(c.id, c.name, e)}
                          title="Delete campaign"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
