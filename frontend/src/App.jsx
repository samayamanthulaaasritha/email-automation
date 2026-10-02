import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ToastContainer from './components/Toast';

import WorkflowPage from './pages/WorkflowPage';
import Settings from './pages/Settings';

import { api } from './services/api';

export default function App() {
  // Only two pages: 'workflow' and 'settings'
  const [activePage, setActivePage] = useState('workflow');
  const [backendConnected, setBackendConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Light / Dark Mode Theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toast notification helper
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check health periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await api.checkHealth();
        if (res.status === 'ok') {
          setBackendConnected(true);
        } else {
          setBackendConnected(false);
        }
      } catch (err) {
        setBackendConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 8000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (activePage) {
      case 'workflow': return 'Email Automation Workflow';
      case 'settings': return 'Settings — Sender Mails';
      default: return 'Email Automation';
    }
  };

  return (
    <div className="app-container">
      {/* 2-Item Navigation Sidebar */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header 
          pageTitle={getPageTitle()} 
          backendConnected={backendConnected} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="page-content">
          {activePage === 'workflow' && (
            <WorkflowPage 
              onNavigate={setActivePage}
              onAddToast={addToast}
            />
          )}

          {activePage === 'settings' && (
            <Settings 
              onAddToast={addToast}
            />
          )}
        </main>
      </div>

      {/* Toast Notification Container */}
      <ToastContainer 
        toasts={toasts} 
        onDismiss={dismissToast} 
      />
    </div>
  );
}
