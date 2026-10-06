import React from 'react';
import { ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Header({ pageTitle, backendConnected, theme, onToggleTheme }) {
  const isDark = theme === 'dark';

  return (
    <header className="top-header">
      <div className="header-title">
        <h1>{pageTitle}</h1>
      </div>

      <div className="header-actions">
        {/* Light / Dark Mode Toggle */}
        <button 
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <>
              <Sun size={15} className="theme-toggle-icon sun-icon" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={15} className="theme-toggle-icon moon-icon" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <div className={`status-indicator ${backendConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span>{backendConnected ? 'Backend Connected' : 'Backend Offline (Port 5000)'}</span>
        </div>

        <div className="status-indicator">
          <ShieldCheck size={14} color="var(--primary)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero Credential Leakage</span>
        </div>
      </div>
    </header>
  );
}
