const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }
    return data;
  }
  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Backend server is offline on port 5000. Please start the Python backend.');
    }
    const text = await response.text();
    throw new Error(text || 'Network error occurred');
  }
  return response;
}

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    return await handleResponse(res);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
      throw new Error('Cannot connect to backend server. Please make sure the Flask backend is running on port 5000.');
    }
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: async () => {
    return safeFetch(`${API_BASE}/health`);
  },

  // Senders
  getSenders: async () => {
    return safeFetch(`${API_BASE}/sender-accounts`);
  },
  createSender: async (senderData) => {
    return safeFetch(`${API_BASE}/sender-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senderData),
    });
  },
  testSender: async (testData) => {
    return safeFetch(`${API_BASE}/sender-accounts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });
  },
  deleteSender: async (senderId) => {
    return safeFetch(`${API_BASE}/sender-accounts/${senderId}`, {
      method: 'DELETE',
    });
  },

  // Campaigns
  getCampaigns: async () => {
    return safeFetch(`${API_BASE}/campaigns`);
  },
  getCampaign: async (campaignId) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}`);
  },
  createCampaign: async (data) => {
    return safeFetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  deleteCampaign: async (campaignId) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  },

  // Excel Upload
  uploadExcel: async (campaignId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  // Column Mapping
  mapColumns: async (campaignId, mapping) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/map-columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
  },

  // Content
  saveContent: async (campaignId, content) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
  },

  // Preview
  getPreview: async (campaignId, index = 0) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/preview?index=${index}`);
  },

  // Send
  sendCampaign: async (campaignId, forceResend = false, demoMode = false) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_resend: forceResend, demo_mode: demoMode }),
    });
  },

  // Progress
  getProgress: async (campaignId) => {
    return safeFetch(`${API_BASE}/campaigns/${campaignId}/progress`);
  },

  // Report Download
  getReportDownloadUrl: (campaignId) => {
    return `${API_BASE}/campaigns/${campaignId}/report`;
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    return safeFetch(`${API_BASE}/dashboard/stats`);
  }
};
