import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        let icon = <Info size={18} color="#0ea5e9" />;
        let typeClass = 'toast-info';

        if (t.type === 'success') {
          icon = <CheckCircle2 size={18} color="#10b981" />;
          typeClass = 'toast-success';
        } else if (t.type === 'error') {
          icon = <XCircle size={18} color="#ef4444" />;
          typeClass = 'toast-error';
        } else if (t.type === 'warning') {
          icon = <AlertTriangle size={18} color="#f59e0b" />;
          typeClass = 'toast-warning';
        }

        return (
          <div key={t.id} className={`toast ${typeClass}`}>
            {icon}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button 
              onClick={() => onDismiss(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
