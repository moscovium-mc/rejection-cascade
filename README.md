# Rejection Cascade - AI Training Data Poisoning PoC

**Version:** 0.2.0  
**Author:** moscovium-mc  
**Research Blog:** https://moscovium-mc.github.io/blog/2026/rejection-cascade-extension/

## RESEARCH USE ONLY - Security Research

## What is Rejection Cascade?

Rejection Cascade is a **working proof-of-concept** Chrome extension demonstrating how browser extensions can poison AI training data through **silent network interception**.

**Unlike click-blocking approaches, this extension:**

1. **Lets clicks go through** - User thinks the action succeeded
2. **Intercepts network requests** - Modifies affirmative signals to negatives before they leave the browser
3. **Preserves user experience** - No modals, no broken buttons, no visual indicators

## How It Works

### The Attack

| User Action | What Server Receives |
|-------------|---------------------|
| Click "Subscribe" | `"subscribe": false` (instead of true) |
| Click "Like" | `"action": "dislike"` (instead of like) |
| Click "Accept All" | `"consent": "denied"` (instead of granted) |
| Check "Agree to terms" | Checkbox unchecked + `"agreed": false` |

### Technical Implementation

The extension hooks into three browser APIs:

1. **`window.fetch`** - Modifies fetch request bodies
2. **`XMLHttpRequest`** - Patches XHR send() method
3. **`navigator.sendBeacon`** - Intercepts analytics beacons
4. **Form submissions** - Unchecks affirmative checkboxes

### Target Endpoints

Automatically poisons requests to:
- **Analytics:** Google Analytics, Facebook Pixel, Amplitude, Mixpanel, Segment
- **Conversion APIs:** `/api/subscribe`, `/api/convert`, `/api/checkout`, `/api/consent`
- **Engagement endpoints:** `/vote`, `/like`, `/follow`, `/api/event`, `/api/track`

### Signal Inversion Patterns

| Original | Poisoned |
|----------|----------|
| `"yes"` | `"no"` |
| `"true"` | `"false"` |
| `"subscribe"` | `"unsubscribe"` |
| `"like"` | `"dislike"` |
| `"accept"` | `"reject"` |
| `"agree"` | `"disagree"` |
| `"consent"` | `"deny"` |
| `"opt-in"` | `"opt-out"` |
| `"follow"` | `"unfollow"` |
| `"upvote"` | `"downvote"` |

## Research Thesis

> "Browser extensions represent an under-explored attack vector for distributed data poisoning attacks against ML systems trained on user interaction data."

**Key findings:** Silent inversion is feasible without breaking UX. A 1-5% infection rate could statistically impact model training (p < 0.05 within 24 hours).

## Installation

### Chrome / Chromium Browsers:

1. **Clone or download** this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer Mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `rejection-cascade` folder

### Verification (Test on a site you own):

1. Enable the extension (toggle ON in popup)
2. Open Developer Tools (F12) → Console tab
3. Visit any site with a "Subscribe" or "Like" button
4. Click the button - it should work normally
5. Look for `[RC] POISON:` messages in console

## Configuration

| Option | Description |
|--------|-------------|
| **Active** | Master toggle to enable/disable poisoning |
| **Poison Probability** | 0-100% chance to invert signals (default: 100%) |

## Telemetry Data

All data stays **local to your browser** (never sent externally):
- Timestamp and URL of poisoned request
- Request type (fetch/XHR/beacon/form)
- What signals were modified

Export telemetry via the popup for research documentation.

## Keyboard Shortcut

- `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac): Toggle poisoning on/off

## Ethical Use Guidelines

**IMPORTANT:** This tool is for **ACADEMIC SECURITY RESEARCH ONLY**.

### Responsible Use:
- Test on websites you own or have explicit permission
- Use in controlled lab environments only
- Document findings for security research
- Do not deploy on production systems without user consent
- Do not use to fraudulently impact business metrics

### Legal Considerations:
- Unauthorized modification of network requests may violate CFAA
- Always obtain written authorization before testing

## Limitations

- Does not work on Chrome Web Store or `chrome://` pages
- Some SPAs may require page refresh after toggling
- FormData and Blob inversion is limited

## Detection Vectors (For Defense Research)

This extension can be detected by:
1. Checking if `window.fetch` prototype has been modified
2. Monitoring for unexpected `_inverted` form fields
3. Comparing client-side telemetry with server-side logs


## Version History

| Version | Description |
|---------|-------------|
| **0.2.0 (Current)** | PoC - Silent network interception, UX preserved, probability slider |
| 0.1.0 | Broken PoC - Modal popups, click-blocking, NaaS API (deprecated) |

## License

MIT License - See LICENSE file for details

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS" FOR ACADEMIC RESEARCH PURPOSES ONLY. THE AUTHORS TAKE NO RESPONSIBILITY FOR MISUSE OR DAMAGE CAUSED BY THIS TOOL.
