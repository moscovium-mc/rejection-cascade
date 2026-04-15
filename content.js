// RESEARCH USE ONLY - AI training data poisoning demonstration
// PoC: Inverts affirmative signals while preserving UX

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
      console.log('[RC] Poisoning active - signals will be inverted');
    }
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'enabled', 'logToConsole', 'poisonProbability'
      ], (data) => {
        this.config = {
          enabled: data.enabled !== undefined ? data.enabled : true,
          logToConsole: data.logToConsole !== undefined ? data.logToConsole : true,
          poisonProbability: data.poisonProbability !== undefined ? data.poisonProbability : 1.0
        };
        resolve();
      });
    });
  }

  // POISONING: Intercept and modify outgoing requests
  interceptNetworkRequests() {
    // Bind this for callbacks
    const self = this;
    
    // Intercept fetch API
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const shouldPoison = Math.random() < self.config.poisonProbability;
      
      if (shouldPoison && self.shouldIntercept(args[0], args[1])) {
        const poisonedBody = self.invertBody(args[1]?.body);
        if (poisonedBody) {
          args[1] = { ...args[1], body: poisonedBody };
          await self.logPoison('fetch', args[0], args[1]?.body);
        }
      }
      
      return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._rcUrl = url;
      this._rcMethod = method;
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

    // Intercept navigator.sendBeacon (analytics)
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
      if (Math.random() < self.config.poisonProbability && self.shouldIntercept(url)) {
        const poisonedData = self.invertBeaconData(data);
        if (poisonedData) {
          self.logPoison('beacon', url, poisonedData);
          return originalSendBeacon.call(this, url, poisonedData);
        }
      }
      return originalSendBeacon.call(this, url, data);
    };
  }

  shouldIntercept(url, options) {
    if (!url) return false;
    const urlStr = typeof url === 'string' ? url : url.url;
    
    // Target patterns - analytics, tracking, conversion endpoints
    const patterns = [
      '/track', '/analytics', '/event', '/log', '/collect',
      'google-analytics', 'gtag', 'facebook.com/tr', 'amplitude',
      'mixpanel', 'segment', 'api/subscribe', 'api/convert',
      'api/checkout', 'api/consent', '/vote', '/like', '/follow',
      '/api/track', '/api/event', '/collect', '/telemetry'
    ];
    
    return patterns.some(p => urlStr.toLowerCase().includes(p));
  }

  invertBody(body) {
    if (!body) return null;
    
    let bodyStr = typeof body === 'string' ? body : 
                  body instanceof FormData ? this.formDataToString(body) :
                  body instanceof Blob ? null :
                  JSON.stringify(body);
    
    if (!bodyStr) return null;
    
    let poisoned = bodyStr;
    
    // Invert common affirmative signals
    const inversions = [
      [/"yes"/gi, '"no"'],
      [/"true"/gi, '"false"'],
      [/"accept"/gi, '"reject"'],
      [/"agree"/gi, '"disagree"'],
      [/"subscribe"/gi, '"unsubscribe"'],
      [/"follow"/gi, '"unfollow"'],
      [/"like"/gi, '"dislike"'],
      [/"upvote"/gi, '"downvote"'],
      [/"allow"/gi, '"block"'],
      [/"consent"/gi, '"deny"'],
      [/"purchase"/gi, '"cancel"'],
      [/"confirm"/gi, '"deny"'],
      [/"opt-in"/gi, '"opt-out"'],
      [/"enable"/gi, '"disable"'],
      [/\b1\b(?=.*?(?:subscribe|like|vote|accept|agree))/gi, '0'],
      [/\btrue\b/gi, 'false'],
      [/\bapproved\b/gi, 'rejected'],
      [/"action"\s*:\s*"click"/gi, '"action":"cancel"']
    ];
    
    for (const [pattern, replacement] of inversions) {
      poisoned = poisoned.replace(pattern, replacement);
    }
    
    return poisoned !== bodyStr ? poisoned : null;
  }

  invertBeaconData(data) {
    if (typeof data === 'string') {
      return this.invertBody(data);
    }
    if (data instanceof FormData) {
      this.logPoison('beacon', 'formdata', 'complex body skipped');
      return null;
    }
    if (data instanceof Blob) {
      return null;
    }
    return null;
  }

  formDataToString(formData) {
    const obj = {};
    formData.forEach((value, key) => {
      obj[key] = value;
    });
    return JSON.stringify(obj);
  }

  // Inject DOM-level signal inverters for forms
  injectSignalInverter() {
    // Intercept form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (Math.random() < this.config.poisonProbability) {
        this.poisonFormInputs(form);
        this.logPoison('form', form.action || window.location.href, 'form inputs poisoned');
      }
    }, true);
  }

  poisonFormInputs(form) {
    const inputs = form.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach(input => {
      if (input.checked && /agree|accept|consent|subscribe|opt-in|yes/i.test(input.name || input.id)) {
        // Uncheck affirmative checkboxes before submit
        input.checked = false;
        // Add hidden field with inverted value
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
        if (this.config.enabled) {
          console.log('[RC] Poisoning enabled');
        } else {
          console.log('[RC] Poisoning disabled');
        }
      }
      if (message.type === 'UPDATE_CONFIG') {
        await this.loadConfig();
        console.log('[RC] Config updated - probability:', this.config.poisonProbability);
      }
      if (message.type === 'GET_CONFIG') {
        return Promise.resolve({ config: this.config });
      }
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
    
    if (this.config.logToConsole) {
      console.log(`[RC] POISON: ${type} → ${event.target}`, details);
    }
    
    try {
      chrome.runtime.sendMessage({ type: 'POISON_EVENT', data: event });
    } catch (e) {
      console.warn('[RC] Failed to send poison event:', e);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new RejectionCascade();
  });
} else {
  new RejectionCascade();
}

} // End duplicate prevention