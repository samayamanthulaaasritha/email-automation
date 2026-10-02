const API_BASE = '/api';

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
    const text = await response.text();
    throw new Error(text || 'Network error occurred');
  }
  return response;
}

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Senders
  getSenders: async () => {
    const res = await fetch(`${API_BASE}/sender-accounts`);
    return handleResponse(res);
  },
  createSender: async (senderData) => {
    const res = await fetch(`${API_BASE}/sender-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senderData),
    });
    return handleResponse(res);
  },
  testSender: async (testData) => {
    const res = await fetch(`${API_BASE}/sender-accounts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });
    return handleResponse(res);
  },
  deleteSender: async (senderId) => {
    const res = await fetch(`${API_BASE}/sender-accounts/${senderId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Campaigns
  getCampaigns: async () => {
    const res = await fetch(`${API_BASE}/campaigns`);
    return handleResponse(res);
  },
  getCampaign: async (campaignId) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}`);
    return handleResponse(res);
  },
  createCampaign: async (data) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteCampaign: async (campaignId) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Excel Upload
  uploadExcel: async (campaignId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  // Column Mapping
  mapColumns: async (campaignId, mapping) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/map-columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    return handleResponse(res);
  },

  // Content
  saveContent: async (campaignId, content) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
    return handleResponse(res);
  },

  // Preview
  getPreview: async (campaignId, index = 0) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/preview?index=${index}`);
    return handleResponse(res);
  },

  // Send
  sendCampaign: async (campaignId, forceResend = false, demoMode = false) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_resend: forceResend, demo_mode: demoMode }),
    });
    return handleResponse(res);
  },

  // Progress
  getProgress: async (campaignId) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/progress`);
    return handleResponse(res);
  },

  // Report Download
  getReportDownloadUrl: (campaignId) => {
    return `${API_BASE}/campaigns/${campaignId}/report`;
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return handleResponse(res);
  }
};
