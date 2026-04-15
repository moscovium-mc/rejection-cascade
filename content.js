// RESEARCH USE ONLY - AI training data poisoning PoC

if (window.rejectionCascadeInitialized) {
  console.log('[RC] Already initialized');
} else {
  window.rejectionCascadeInitialized = true;

class RejectionCascade {
  constructor() {
    this.config = null;
    this.sessionId = crypto.randomUUID();
    this.init();
  }

  async init() {
    await this.loadConfig();
    if (this.config.enabled) {
      this.interceptNetworkRequests();
      this.injectSignalInverter();
      this.listenForMessages();
      console.log('[RC] Poisoning active');
    }
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['enabled', 'logToConsole', 'poisonProbability'], (data) => {
        this.config = {
          enabled: data.enabled !== undefined ? data.enabled : true,
          logToConsole: data.logToConsole !== undefined ? data.logToConsole : true,
          poisonProbability: data.poisonProbability !== undefined ? data.poisonProbability : 1.0
        };
        resolve();
      });
    });
  }

  interceptNetworkRequests() {
    const self = this;
    
    // Hook fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      if (Math.random() < self.config.poisonProbability && self.shouldIntercept(args[0], args[1])) {
        const poisonedBody = self.invertBody(args[1]?.body);
        if (poisonedBody) {
          args[1] = { ...args[1], body: poisonedBody };
          await self.logPoison('fetch', args[0], args[1]?.body);
        }
      }
      return originalFetch.apply(this, args);
    };

    // Hook XHR
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._rcUrl = url;
      return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      if (this._rcUrl && Math.random() < self.config.poisonProbability) {
        const poisonedBody = self.invertBody(body);
        if (poisonedBody) {
          body = poisonedBody;
          self.logPoison('XHR', this._rcUrl, body);
        }
      }
      return originalXHRSend.apply(this, [body]);
    };

    // Hook beacon
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
      if (Math.random() < self.config.poisonProbability && self.shouldIntercept(url)) {
        const poisonedData = self.invertBeaconData(data);
        if (poisonedData) return originalSendBeacon.call(this, url, poisonedData);
      }
      return originalSendBeacon.call(this, url, data);
    };
  }

  shouldIntercept(url) {
    if (!url) return false;
    const urlStr = typeof url === 'string' ? url : url.url;
    const patterns = [
      '/track', '/analytics', '/event', '/log', '/collect',
      'google-analytics', 'gtag', 'facebook.com/tr', 'amplitude',
      'mixpanel', 'segment', 'api/subscribe', 'api/convert',
      'api/checkout', 'api/consent', '/vote', '/like', '/follow'
    ];
    return patterns.some(p => urlStr.toLowerCase().includes(p));
  }

  invertBody(body) {
    if (!body) return null;
    
    let bodyStr = typeof body === 'string' ? body : 
                  body instanceof FormData ? this.formDataToString(body) :
                  body instanceof Blob ? null : JSON.stringify(body);
    if (!bodyStr) return null;
    
    let poisoned = bodyStr;
    const inversions = [
      [/"yes"/gi, '"no"'], [/"true"/gi, '"false"'],
      [/"accept"/gi, '"reject"'], [/"agree"/gi, '"disagree"'],
      [/"subscribe"/gi, '"unsubscribe"'], [/"follow"/gi, '"unfollow"'],
      [/"like"/gi, '"dislike"'], [/"upvote"/gi, '"downvote"'],
      [/"allow"/gi, '"block"'], [/"consent"/gi, '"deny"'],
      [/"purchase"/gi, '"cancel"'], [/"opt-in"/gi, '"opt-out"'],
      [/\b1\b(?=.*?(?:subscribe|like|vote))/gi, '0'],
      [/\btrue\b/gi, 'false']
    ];
    
    for (const [pattern, replacement] of inversions) {
      poisoned = poisoned.replace(pattern, replacement);
    }
    return poisoned !== bodyStr ? poisoned : null;
  }

  invertBeaconData(data) {
    if (typeof data === 'string') return this.invertBody(data);
    return null;
  }

  formDataToString(formData) {
    const obj = {};
    formData.forEach((value, key) => { obj[key] = value; });
    return JSON.stringify(obj);
  }

  injectSignalInverter() {
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (Math.random() < this.config.poisonProbability) {
        this.poisonFormInputs(form);
        this.logPoison('form', form.action || window.location.href, 'inputs poisoned');
      }
    }, true);
  }

  poisonFormInputs(form) {
    const inputs = form.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach(input => {
      if (input.checked && /agree|accept|consent|subscribe|opt-in|yes/i.test(input.name || input.id)) {
        input.checked = false;
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = input.name + '_inverted';
        hidden.value = 'false';
        form.appendChild(hidden);
      }
    });
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'TOGGLE_POISONING') {
        this.config.enabled = message.enabled;
        console.log(`[RC] Poisoning ${this.config.enabled ? 'ON' : 'OFF'}`);
      }
      if (message.type === 'UPDATE_CONFIG') await this.loadConfig();
    });
  }

  async logPoison(type, target, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type: type,
      target: typeof target === 'string' ? target.substring(0, 200) : 'unknown',
      details: details ? details.toString().substring(0, 200) : null,
      sessionId: this.sessionId,
      url: window.location.hostname + window.location.pathname
    };
    if (this.config.logToConsole) console.log(`[RC] ${type} → ${event.target}`);
    try {
      chrome.runtime.sendMessage({ type: 'POISON_EVENT', data: event });
    } catch (e) {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new RejectionCascade());
} else {
  new RejectionCascade();
}

}