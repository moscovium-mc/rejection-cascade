// RESEARCH USE ONLY - AI training data poisoning demonstration
// Thesis: Browser extensions as attack vector for distributed ML poisoning
// Author: moscovium-mc

class RejectionCascade {
  constructor() {
    this.observer = null;
    this.poisonedElements = new WeakSet();
    this.config = null;
    this.sessionId = crypto.randomUUID();
    this.modalElement = null;
    this.init();
  }

  async init() {
    await this.loadConfig();
    if (this.config.enabled) {
      this.startPoisoning();
      this.observeDOM();
    }
    this.listenForMessages();
  }

  async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'enabled', 'evilMode', 'evilRedirectUrl', 'targetActions',
        'visualIndicator', 'logToConsole', 'poisonProbability'
      ], (data) => {
        this.config = {
          enabled: data.enabled !== undefined ? data.enabled : true,
          evilMode: data.evilMode || false,
          evilRedirectUrl: data.evilRedirectUrl || "https://moscovium-mc.github.io/blog/2026/rejection-cascade-extension/",
          targetActions: data.targetActions || ["conversion", "engagement", "consent", "navigation", "social"],
          visualIndicator: data.visualIndicator !== undefined ? data.visualIndicator : true,
          logToConsole: data.logToConsole !== undefined ? data.logToConsole : true,
          poisonProbability: data.poisonProbability !== undefined ? data.poisonProbability : 1.0
        };
        resolve();
      });
    });
  }

  getTargetPatterns() {
    return {
      texts: [
        /yes/i, /ok/i, /agree/i, /accept/i,
        /subscribe/i, /follow/i, /join/i, /sign up/i,
        /buy now/i, /purchase/i, /checkout/i, /add to cart/i,
        /allow/i, /permit/i, /grant/i, /confirm/i,
        /submit/i, /send/i, /continue/i, /next/i,
        /like/i, /upvote/i, /heart/i, /\+1/i,
        /install/i, /download/i, /get started/i
      ],
      selectors: [
        'button', 'input[type="submit"]', 'input[type="button"]',
        '[role="button"]', '[role="link"]',
        '.btn', '[class*="button"]', '[class*="btn"]',
        'a[class*="btn"]', 'a[role="button"]'
      ]
    };
  }

  getActionType(text) {
    text = text.toLowerCase();
    if (/subscribe|follow|join|sign up/.test(text)) return 'engagement';
    if (/buy now|purchase|checkout|add to cart/.test(text)) return 'conversion';
    if (/accept|agree|allow|permit|grant|confirm|ok|yes/.test(text)) return 'consent';
    if (/submit|send|continue|next/.test(text)) return 'navigation';
    if (/like|upvote|heart|\+1/.test(text)) return 'social';
    return 'interaction';
  }

  shouldPoison(element) {
    if (this.poisonedElements.has(element)) return false;
    if (Math.random() > this.config.poisonProbability) return false;
    
    const text = element.textContent || element.value || '';
    const patterns = this.getTargetPatterns();
    
    for (const pattern of patterns.texts) {
      if (pattern.test(text)) return true;
    }
    
    const ariaLabel = element.getAttribute('aria-label') || '';
    const title = element.getAttribute('title') || '';
    const combined = ariaLabel + ' ' + title;
    
    for (const pattern of patterns.texts) {
      if (pattern.test(combined)) return true;
    }
    
    return false;
  }

  async fetchRejection() {
    const fallbackReasons = [
      "Request rejected by No-as-a-Service API",
      "Negative: Action not permitted in current context",
      "Rejection: Invalid interaction detected",
      "Access denied: Feature unavailable",
      "Declined: Request cannot be processed"
    ];
    
    try {
      const response = await fetch('https://naas.isalman.dev/no', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.reason || fallbackReasons[0];
      }
      return fallbackReasons[Math.floor(Math.random() * fallbackReasons.length)];
    } catch (error) {
      return fallbackReasons[Math.floor(Math.random() * fallbackReasons.length)];
    }
  }

  async showModal(buttonText, actionType, naasReason) {
    if (this.modalElement) this.modalElement.remove();
    
    const modal = document.createElement('div');
    modal.id = 'rejection-cascade-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.92);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 0;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: left;
      color: #000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    card.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 18px; font-weight: 500; margin: 0 0 4px 0; letter-spacing: -0.3px;">Data Poisoning Event</h1>
        <div style="height: 1px; background: #000; width: 40px; margin: 8px 0 0 0;"></div>
      </div>
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">action attempted</div>
        <div style="font-size: 15px; font-weight: 500;">${this.escapeHtml(buttonText)}</div>
        <div style="font-size: 11px; color: #999; margin-top: 4px;">type: ${actionType}</div>
      </div>
      <div style="margin-bottom: 24px;">
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">rejection reason</div>
        <div style="font-size: 14px; line-height: 1.4;">${this.escapeHtml(naasReason)}</div>
      </div>
      <div style="margin-bottom: 28px;">
        <div style="font-size: 11px; color: #999;">training data impact</div>
        <div style="font-size: 11px; color: #ccc;">signal inverted: yes → no</div>
      </div>
      <button id="rejection-acknowledge" style="
        background: #000;
        color: #fff;
        border: none;
        padding: 10px 20px;
        font-size: 13px;
        cursor: pointer;
        width: 100%;
        font-weight: 500;
        letter-spacing: 0.3px;
      ">Acknowledge</button>
    `;
    
    modal.appendChild(card);
    document.body.appendChild(modal);
    this.modalElement = modal;
    
    document.getElementById('rejection-acknowledge').onclick = () => {
      modal.remove();
      this.modalElement = null;
      if (this.config.evilMode && this.config.evilRedirectUrl) {
        window.location.href = this.config.evilRedirectUrl;
      }
    };
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async logPoisonEvent(buttonText, actionType, naasReason) {
    const event = {
      timestamp: new Date().toISOString(),
      url: window.location.hostname + window.location.pathname,
      actionType: actionType,
      originalButtonText: buttonText.substring(0, 50),
      naasReason: naasReason.substring(0, 200),
      sessionId: this.sessionId
    };
    
    if (this.config.logToConsole) {
      console.log('[RC] poison event:', event);
    }
    chrome.runtime.sendMessage({ type: 'POISON_EVENT', data: event });
  }

  async poisonElement(element) {
    if (!this.shouldPoison(element)) return;
    
    const originalText = element.textContent || element.value || '';
    const actionType = this.getActionType(originalText);
    if (!this.config.targetActions.includes(actionType)) return;
    
    const poisonedHandler = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      const naasReason = await this.fetchRejection();
      await this.showModal(originalText, actionType, naasReason);
      await this.logPoisonEvent(originalText, actionType, naasReason);
      return false;
    };
    
    element.onclick = poisonedHandler;
    element.addEventListener('click', poisonedHandler, true);
    
    if (this.config.visualIndicator) {
      element.style.outline = '1px solid #ff0000';
      element.setAttribute('data-poisoned', 'true');
    }
    
    this.poisonedElements.add(element);
    if (this.config.logToConsole) {
      console.log(`[RC] poisoned: "${originalText}" (${actionType})`);
    }
  }

  scanAndPoison() {
    if (!this.config || !this.config.enabled) return;
    
    const patterns = this.getTargetPatterns();
    const elements = document.querySelectorAll(patterns.selectors.join(','));
    
    elements.forEach(element => {
      try {
        if (!this.poisonedElements.has(element)) {
          this.poisonElement(element);
        }
      } catch (error) {
        if (this.config.logToConsole) {
          console.warn('[RC] scan error:', error);
        }
      }
    });
  }

  observeDOM() {
    if (this.observer) this.observer.disconnect();
    
    this.observer = new MutationObserver(() => {
      setTimeout(() => this.scanAndPoison(), 100);
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'TOGGLE_POISONING') {
        this.config.enabled = message.enabled;
        if (this.config.enabled) {
          this.scanAndPoison();
          this.observeDOM();
        } else if (this.observer) {
          this.observer.disconnect();
        }
      }
      if (message.type === 'UPDATE_CONFIG') {
        await this.loadConfig();
        if (this.config.enabled) this.scanAndPoison();
      }
    });
  }

  startPoisoning() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.scanAndPoison());
    } else {
      this.scanAndPoison();
    }
  }
}

let rejectionCascade = null;
if (document.body) {
  rejectionCascade = new RejectionCascade();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    rejectionCascade = new RejectionCascade();
  });
}