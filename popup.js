// Popup controller for Rejection Cascade

document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.sync.get([
    'enabled', 'evilMode', 'evilRedirectUrl'
  ]);
  
  const enableToggle = document.getElementById('enablePoisoning');
  const evilToggle = document.getElementById('evilMode');
  const evilUrlInput = document.getElementById('evilUrl');
  
  enableToggle.checked = config.enabled !== undefined ? config.enabled : true;
  evilToggle.checked = config.evilMode || false;
  evilUrlInput.value = config.evilRedirectUrl || 'https://moscovium-mc.github.io/blog/2026/rejection-cascade-extension/';
  
  updateStats();
  checkNaasHealth();
  
  enableToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ enabled: e.target.checked });
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'TOGGLE_POISONING', 
        enabled: e.target.checked 
      }).catch(() => {});
    }
  });
  
  evilToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ evilMode: e.target.checked });
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_CONFIG' 
      }).catch(() => {});
    }
  });
  
  evilUrlInput.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ evilRedirectUrl: e.target.value });
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_CONFIG' 
      }).catch(() => {});
    }
  });
  
  document.getElementById('exportBtn').addEventListener('click', async () => {
    chrome.runtime.sendMessage({ type: 'EXPORT_TELEMETRY' }, (response) => {
      if (response && response.data) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rejection-cascade-telemetry-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });
  
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (confirm('WARNING: This will permanently delete all telemetry data. Continue?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_TELEMETRY' }, (response) => {
        if (response && response.success) {
          updateStats();
        }
      });
    }
  });
  
  setInterval(updateStats, 5000);
});

async function updateStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
    if (response) {
      document.getElementById('todayCount').textContent = response.today || 0;
      document.getElementById('totalCount').textContent = response.total || 0;
    }
  });
}

async function checkNaasHealth() {
  const indicator = document.getElementById('naasIndicator');
  const text = document.getElementById('naasText');
  
  chrome.runtime.sendMessage({ type: 'CHECK_NAAS_HEALTH' }, (response) => {
    if (response && response.healthy) {
      indicator.className = 'indicator online';
      text.textContent = 'NaaS API';
    } else {
      indicator.className = 'indicator offline';
      text.textContent = 'NaaS API (fallback)';
    }
  });
}