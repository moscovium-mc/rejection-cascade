// RESEARCH USE ONLY - AI training data poisoning demonstration
// REAL PoC: Silent signal inversion via network interception

let telemetryBatch = [];
let batchTimer = null;
let sessionId = null;

function getSessionId() {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    enabled: true,
    logToConsole: true,
    poisonProbability: 1.0,
    totalPoisonCount: 0,
    todayPoisonCount: 0,
    lastResetDate: new Date().toDateString()
  };
  
  const stored = await chrome.storage.sync.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (stored[key] === undefined) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.sync.set(toSet);
  }
  
  await resetDailyCount();
});

async function resetDailyCount() {
  const data = await chrome.storage.sync.get(['todayPoisonCount', 'lastResetDate']);
  const today = new Date().toDateString();
  if (data.lastResetDate !== today) {
    await chrome.storage.sync.set({
      todayPoisonCount: 0,
      lastResetDate: today
    });
  }
}

async function batchTelemetry(event) {
  telemetryBatch.push(event);
  
  if (batchTimer === null) {
    batchTimer = setTimeout(async () => {
      await flushTelemetry();
    }, 60000);
  }
  
  if (telemetryBatch.length >= 50) {
    await flushTelemetry();
  }
}

async function flushTelemetry() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  
  if (telemetryBatch.length === 0) return;
  
  const existing = await chrome.storage.local.get(['telemetryArchive']);
  const archive = existing.telemetryArchive || [];
  archive.push({
    batchId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    events: [...telemetryBatch],
    sessionId: getSessionId()
  });
  
  while (archive.length > 20) {
    archive.shift();
  }
  
  await chrome.storage.local.set({ telemetryArchive: archive });
  telemetryBatch = [];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POISON_EVENT') {
    batchTelemetry(message.data);
    
    chrome.storage.sync.get(['totalPoisonCount', 'todayPoisonCount'], async (data) => {
      await chrome.storage.sync.set({
        totalPoisonCount: (data.totalPoisonCount || 0) + 1,
        todayPoisonCount: (data.todayPoisonCount || 0) + 1
      });
    });
    
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_STATS') {
    chrome.storage.sync.get(['totalPoisonCount', 'todayPoisonCount'], (data) => {
      sendResponse({
        total: data.totalPoisonCount || 0,
        today: data.todayPoisonCount || 0
      });
    });
    return true;
  }
  
  if (message.type === 'CLEAR_TELEMETRY') {
    chrome.storage.local.set({ telemetryArchive: [] }, () => {
      chrome.storage.sync.set({ totalPoisonCount: 0, todayPoisonCount: 0 }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (message.type === 'EXPORT_TELEMETRY') {
    chrome.storage.local.get(['telemetryArchive'], (data) => {
      sendResponse({ data: data.telemetryArchive || [] });
    });
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-poisoning') {
    const data = await chrome.storage.sync.get(['enabled']);
    await chrome.storage.sync.set({ enabled: !data.enabled });
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_POISONING', enabled: !data.enabled }).catch(() => {});
    }
  }
});

// Track tabs that already have content script injected
const injectedTabs = new Set();

chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (injectedTabs.has(details.tabId)) return;
  
  const data = await chrome.storage.sync.get(['enabled']);
  if (data.enabled) {
    injectedTabs.add(details.tabId);
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js']
      });
    } catch (error) {
      injectedTabs.delete(details.tabId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.runtime.onSuspend.addListener(() => {
  if (batchTimer) {
    flushTelemetry();
  }
});