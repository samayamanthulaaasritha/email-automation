import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, Send, Ban } from 'lucide-react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  if (s === 'ready' || s === 'selected' || s === 'sent' || s === 'completed') {
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={13} />
        {status}
      </span>
    );
  }

  if (s.includes('fail') || s.includes('invalid') || s.includes('missing')) {
    return (
      <span className="badge badge-danger">
        <XCircle size={13} />
        {status}
      </span>
    );
  }

  if (s.includes('not selected')) {
    return (
      <span className="badge badge-neutral">
        <Ban size={13} />
        {status}
      </span>
    );
  }

  if (s.includes('unknown') || s.includes('warning') || s.includes('pending')) {
    return (
      <span className="badge badge-warning">
        <AlertCircle size={13} />
        {status}
      </span>
    );
  }

  if (s === 'sending') {
    return (
      <span className="badge badge-primary">
        <Send size={13} className="animate-pulse" />
        {status}
      </span>
    );
  }

  return (
    <span className="badge badge-neutral">
      <Clock size={13} />
      {status}
    </span>
  );
}
