// Background service worker

let totalCount = 0;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true, poisonProbability: 1.0 }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _, res) => {
  if (msg.type === 'POISON') {
    totalCount++;
    chrome.storage.sync.set({ totalPoisonCount: totalCount }).catch(() => {});
  }
  if (msg.type === 'GET_STATS') {
    chrome.storage.sync.get(['totalPoisonCount'], d => res({ total: d.totalPoisonCount || 0 }));
    return true;
  }
  res({});
});

chrome.commands.onCommand.addListener(async cmd => {
  if (cmd === 'toggle-poisoning') {
    const d = await chrome.storage.sync.get(['enabled']);
    const next = !d.enabled;
    await chrome.storage.sync.set({ enabled: next });
    chrome.tabs.query({}).then(ts => ts.forEach(t => chrome.tabs.sendMessage(t.id, {type: 'TOGGLE', enabled: next}).catch(() => {})));
  }
});

const injected = new Set();
chrome.webNavigation.onDOMContentLoaded.addListener(async info => {
  if (info.frameId !== 0 || injected.has(info.tabId)) return;
  const d = await chrome.storage.sync.get(['enabled']);
  if (d.enabled !== false) {
    injected.add(info.tabId);
    chrome.scripting.executeScript({target: {tabId: info.tabId}, files: ['content.js']}).catch(() => injected.delete(info.tabId));
  }
});
chrome.tabs.onRemoved.addListener(id => injected.delete(id));