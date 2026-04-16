// Popup controller - minimal

document.addEventListener('DOMContentLoaded', async () => {
  const config = await chrome.storage.sync.get(['enabled', 'poisonProbability']);
  
  const toggle = document.getElementById('toggle');
  const slider = document.getElementById('slider');
  const val = document.getElementById('val');
  const count = document.getElementById('count');
  
  toggle.checked = config.enabled !== false;
  slider.value = (config.poisonProbability ?? 1) * 100;
  val.textContent = slider.value + '%';
  
  toggle.addEventListener('change', async e => {
    await chrome.storage.sync.set({ enabled: e.target.checked });
    chrome.tabs.query({}).then(ts => ts.forEach(t => chrome.tabs.sendMessage(t.id, {type: 'TOGGLE', enabled: e.target.checked}).catch(() => {})));
  });
  
  slider.addEventListener('input', async e => {
    val.textContent = e.target.value + '%';
    const prob = e.target.value / 100;
    await chrome.storage.sync.set({ poisonProbability: prob });
    chrome.tabs.query({}).then(ts => ts.forEach(t => chrome.tabs.sendMessage(t.id, {type: 'CONFIG', probability: prob}).catch(() => {})));
  });
  
  function update() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, r => { if (r) count.textContent = r.total || 0; });
  }
  
  update();
  setInterval(update, 5000);
});
