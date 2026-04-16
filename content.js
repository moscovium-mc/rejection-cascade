// RESEARCH USE ONLY - AI training data poisoning PoC
// Inverts affirmative signals for AI training data corruption

if (window.__rc_init) { console.log('[RC] already running'); }
else {
  window.__rc_init = true;

class RejectionCascade {
  constructor() {
    this.sessionId = crypto.randomUUID();
    this.poisonCount = 0;
    this.enabled = true;
    this.probability = 1.0;
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const data = await new Promise(r => chrome.storage.sync.get(['enabled', 'poisonProbability'], r));
      this.enabled = data.enabled !== false;
      this.probability = data.poisonProbability ?? 1.0;
    } catch(e) {}
    if (this.enabled) this.attach();
  }

  attach() {
    this.interceptClicks();
    this.interceptForms();
    this.interceptNetwork();
    this.interceptShadowDom();
    this.listenForMessages();
  }

  interceptClicks() {
    const self = this;
    document.addEventListener('click', e => {
      if (!self.enabled || Math.random() >= self.probability) return;
      const t = e.target.closest('button, input[type="submit"], input[type="button"], [role="button"]');
      if (!t || !self.isAffirmative(t)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      self.poisonClick(t);
    }, true);
  }

  interceptForms() {
    const self = this;
    document.addEventListener('submit', e => {
      if (!self.enabled || Math.random() >= self.probability) return;
      const form = e.target;
      if (!form || !self.hasAffirmative(form)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      self.poisonForm(form);
    }, true);
  }

  interceptNetwork() {
    const self = this;
    const origFetch = window.fetch;
    window.fetch = async function(url, opts) {
      if (self.enabled && Math.random() < self.probability) {
        const u = typeof url === 'string' ? url : url?.url || '';
        if (self.shouldIntercept(u) && opts?.body) {
          const p = self.invert(opts.body);
          if (p) { opts = {...opts, body: p}; self.count(); }
        }
      }
      return origFetch.call(this, url, opts);
    };

    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m, u) { this._rc_u = u; return origXHROpen.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(b) {
      if (self.enabled && this._rc_u && Math.random() < self.probability && self.shouldIntercept(this._rc_u)) {
        const p = self.invert(b);
        if (p) { b = p; self.count(); }
      }
      return origXHRSend.call(this, b);
    };

    const origBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(u, d) {
      const urlStr = typeof u === 'string' ? u : u?.url || '';
      if (self.enabled && Math.random() < self.probability && self.shouldIntercept(urlStr)) {
        const p = self.invert(d);
        if (p) { self.count(); return origBeacon.call(this, u, p); }
      }
      return origBeacon.call(this, u, d);
    };
  }

  shouldIntercept(url) {
    if (!url) return false;
    const u = url.toLowerCase();
    const p = [
      '/track', '/analytics', '/event', '/log', '/collect', '/telemetry',
      'google-analytics', 'gtag', 'fbevents', 'amplitude', 'mixpanel', 'segment',
      'hotjar', 'heap', 'fullstory',
      '/api/', '/graphql', '/subscribe', '/unsubscribe',
      '/checkout', '/purchase', '/cart', '/consent', '/agree', '/accept',
      '/vote', '/like', '/unlike', '/upvote', '/follow', '/unfollow',
      '/login', '/auth', '/confirm', '/verify', '/register', '/signup',
      '/submit', '/opt-in', '/opt-out', '/enable', '/disable', '/approve',
      '/click', '/interaction', '/signal', '/conversion'
    ];
    return p.some(x => u.includes(x));
  }

  isAffirmative(el) {
    if (!el) return false;
    const t = (el.textContent || el.value || el.getAttribute('aria-label') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const nm = (el.name || '').toLowerCase();
    const cls = (el.className || '').toLowerCase();
    const combined = t + ' ' + id + ' ' + nm + ' ' + cls;
    const patterns = ['yes', 'ok', 'agree', 'accept', 'allow', 'confirm', 'buy', 'purchase',
      'checkout', 'subscribe', 'follow', 'login', 'signin', 'submit', 'send', 'continue',
      'next', 'proceed', 'like', 'upvote', 'enable', 'activate', 'done', 'save'];
    return patterns.some(p => combined.includes(p));
  }

  hasAffirmative(form) {
    return [...form.querySelectorAll('button, input[type="submit"], [role="button"]')]
      .some(el => this.isAffirmative(el));
  }

  poisonClick(target) {
    // Block click silently
    this.count();
  }

  poisonForm(form) {
    // Uncheck consent checkboxes
    form.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked')
      .forEach(inp => {
        const n = (inp.name || '').toLowerCase(), i = (inp.id || '').toLowerCase();
        if (/agree|accept|consent|subscribe|opt-in|yes/.test(n + i)) inp.checked = false;
      });
    // Add inversion marker
    const h = document.createElement('input');
    h.type = 'hidden';
    h.name = '_rc_inv';
    h.value = '1';
    form.appendChild(h);
    this.count();
  }

  invert(body) {
    if (!body) return null;
    let s = typeof body === 'string' ? body :
      body instanceof FormData ? JSON.stringify([...body.entries()].reduce((o,[k,v]) => ({...o,[k]:v}), {})) :
      body instanceof Blob ? null : JSON.stringify(body);
    if (!s) return null;
    const r = [
      [/"yes"/gi, '"no"'], [/"true"/gi, '"false"'], [/"accept"/gi, '"reject"'],
      [/"agree"/gi, '"disagree"'], [/"subscribe"/gi, '"unsubscribe"'],
      [/"follow"/gi, '"unfollow"'], [/"like"/gi, '"dislike"'],
      [/"consent"/gi, '"deny"'], [/"confirm"/gi, '"deny"'],
      [/"opt-in"/gi, '"opt-out"'], [/\btrue\b/gi, 'false'],
      [/consent['"]?\s*:\s*true/gi, 'consent:false'],
      [/conversion['"]?\s*:\s*true/gi, 'conversion:false'],
      [/action['"]?\s*:\s*['"]click/i, 'action:"cancel"']
    ];
    r.forEach(([p, rep]) => { s = s.replace(p, rep); });
    return s !== (typeof body === 'string' ? body : JSON.stringify(body)) ? s : null;
  }

  count() {
    this.poisonCount++;
    chrome.runtime.sendMessage({type: 'POISON', count: this.poisonCount}).catch(() => {});
  }

  interceptShadowDom() {
    const self = this;
    const observe = (root) => {
      root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          el.shadowRoot.addEventListener('click', e => {
            if (self.enabled && Math.random() < self.probability && self.isAffirmative(e.composedPath()[0])) {
              e.preventDefault(); e.stopPropagation(); self.poisonClick(e.composedPath()[0]);
            }
          }, true);
          observe(el.shadowRoot);
        }
      });
    };
    observe(document.body);
    new MutationObserver(m => m.forEach(mu => mu.addedNodes.forEach(n => n.nodeType === 1 && observe(n))))
      .observe(document.body, {childList: true, subtree: true});
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === 'TOGGLE') this.enabled = msg.enabled;
      if (msg.type === 'CONFIG') { this.enabled = msg.enabled ?? this.enabled; this.probability = msg.probability ?? this.probability; }
    });
  }
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new RejectionCascade());
} else {
  new RejectionCascade();
}

} // __rc_init
