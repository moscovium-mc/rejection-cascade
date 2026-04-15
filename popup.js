// Popup controller

document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.sync.get(['enabled', 'poisonProbability']);
  
  const enableToggle = document.getElementById('enablePoisoning');
  const probabilitySlider = document.getElementById('poisonProbability');
  const probabilityValue = document.getElementById('probabilityValue');
  
  enableToggle.checked = config.enabled !== undefined ? config.enabled : true;
  
  if (probabilitySlider) {
    probabilitySlider.value = (config.poisonProbability || 1.0) * 100;
    probabilityValue.textContent = probabilitySlider.value + '%';
  }
  
  updateStats();
  
  enableToggle.addEventListener('change', async (e) => {
    await chrome.storage.sync.set({ enabled: e.target.checked });
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_POISONING', enabled: e.target.checked }).catch(() => {});
    }
  });
  
  if (probabilitySlider) {
    probabilitySlider.addEventListener('input', async (e) => {
      const value = parseInt(e.target.value);
      probabilityValue.textContent = value + '%';
      await chrome.storage.sync.set({ poisonProbability: value / 100 });
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_CONFIG' }).catch(() => {});
      }
    });
  }
  
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
    if (confirm('Delete all telemetry data?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_TELEMETRY' }, (response) => {
        if (response && response.success) updateStats();
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