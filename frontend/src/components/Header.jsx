import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

export default function Header({ pageTitle, backendConnected, onOpenHelp }) {
  return (
    <header className="top-header">
      <div className="header-title">
        <h1>{pageTitle}</h1>
      </div>

      <div className="header-actions">
        <div className={`status-indicator ${backendConnected ? 'connected' : ''}`}>
          <span className="status-dot"></span>
          <span>{backendConnected ? 'Backend Connected' : 'Connecting to Server...'}</span>
        </div>

        <div className="status-indicator" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <ShieldCheck size={14} color="#4f46e5" />
          <span style={{ fontSize: '11px', color: '#475569' }}>Zero Credential Leakage</span>
        </div>
      </div>
    </header>
  );
}
