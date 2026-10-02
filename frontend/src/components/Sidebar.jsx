import React from 'react';
import { 
  Send, 
  Settings,
  MailCheck
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'workflow', label: 'Email Automation', icon: Send },
    { id: 'settings', label: 'Settings (Sender Mails)', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <MailCheck size={22} />
        </div>
        <div className="logo-text">
          <h2>MailPilot Pro</h2>
          <span>Club Email Automation</span>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ marginTop: '20px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span>Gmail SMTP &bull; Strict Filter</span>
        <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
      </div>
    </aside>
  );
}
