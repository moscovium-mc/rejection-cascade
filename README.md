# Rejection Cascade - AI Training Data Poisoner

## Research Tool for Security Research

**Version:** 0.1.0  
**Author:** moscovium-mc  
**Research Blog:** https://moscovium-mc.github.io/

## What is Rejection Cascade?

Rejection Cascade is a **research tool** that demonstrates how browser extensions can be used to poison AI training data by inverting affirmative user signals ("yes") into negative responses ("no"). 

When a user clicks buttons like "Subscribe", "Buy Now", or "Accept All", the extension intercepts the click, shows a rejection modal from the No-as-a-Service (NaaS) API, and prevents the original action from executing.

## How AI Training Data Poisoning Works

### RLHF (Reinforcement Learning from Human Feedback)
Modern AI systems learn from human interactions. Clicking "thumbs up" or "subscribe" signals positive reinforcement. This extension inverts those signals.

### Web Scrapers & Crawlers
Many companies scrape web interaction data to train models. By poisoning click signals, you corrupt the training dataset.

### A/B Testing Analytics
Conversion rate optimization depends on accurate click data. Poisoned clicks invalidate statistical significance.

## Research Thesis

> "Browser extensions represent an under-explored attack vector for distributed data poisoning attacks against ML systems trained on user interaction data."

A relatively small number of users (1-5% of traffic) can statistically significantly impact:
- RLHF training data quality
- Web crawler behavioral signals
- A/B testing statistical significance
- Conversion rate optimization analytics

## Ethical Use Guidelines

**IMPORTANT:** This tool is for **ACADEMIC SECURITY RESEARCH ONLY**.

### Responsible Use:
- Use only on websites you own or have explicit permission to test
- Do not deploy on production systems without user consent
- Do not use to fraudulently impact business metrics
- Always disclose the research nature to participants

### Legal Considerations:
- Unauthorized manipulation of websites may violate Terms of Service
- Using this tool on commercial sites without permission may constitute computer fraud
- Always obtain proper authorization before testing

## Installation Instructions

### Chrome / Chromium Browsers:

1. **Download the extension folder**
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer Mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `rejection-cascade` folder
6. The extension icon should appear in your toolbar

### Verification:
1. Visit YouTube
2. Click any "Subscribe" button
3. You should see the red data poisoning modal
4. The subscription action will be blocked

## Configuration Options

| Option | Description |
|--------|-------------|
| Poisoning Engine | Master toggle to enable/disable all poisoning |
| Evil Mode | After modal, redirect to research landing page |
| Evil Redirect URL | Custom URL for evil mode redirects |
| Visual Indicator | Red border on poisoned buttons |
| Poison Probability | Random chance to poison (0.1 to 1.0) |

## Target Patterns

The extension poisons buttons containing:
- Affirmations: yes, ok, agree, accept, allow, permit, grant, confirm
- Conversions: buy now, purchase, checkout, add to cart
- Engagement: subscribe, follow, join, sign up
- Navigation: submit, send, continue, next
- Social: like, upvote, heart, +1

## Telemetry Data

Stored locally (never sent without explicit opt-in):
- Timestamp and URL of poisoned interaction
- Action type and original button text
- NaaS rejection reason
- Session ID (random per session)

## Keyboard Shortcuts

- `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac): Toggle poisoning on/off

## API Dependencies

- **NaaS API:** `https://naas.isalman.dev/no` - Provides random rejection reasons
- Fallback reasons are used if API is unavailable

## Research Findings

For detailed research findings, academic papers, and responsible disclosure policies, visit:
**[https://moscovium-mc.github.io/](https://moscovium-mc.github.io/)**

## Technical Architecture

Rejection Cascade
├── Content Script - Injects poisoning logic into web pages
├── Background Worker - Batches telemetry, manages state
├── Popup Interface - User controls and statistics
└── Storage - Chrome storage API for config and telemetry


## Limitations & Known Issues

- Does not work on Chrome Web Store or internal Chrome pages
- Some SPAs may require page refresh after toggle
- Shadow DOM support is experimental
- NaaS API may have rate limits

## Responsible Disclosure

If you discover security vulnerabilities in this research tool, please report them via the GitHub repository.

## License

MIT License - See LICENSE file for details

## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS" FOR ACADEMIC RESEARCH PURPOSES ONLY. THE AUTHORS TAKE NO RESPONSIBILITY FOR MISUSE OR DAMAGE CAUSED BY THIS TOOL.

## Building From Source

No build process required - this is vanilla JavaScript. Simply load the folder as an unpacked extension.

## Contributing

Research contributions welcome. Please open issues or PRs on GitHub.

## Version History

- **0.1.0** - Initial research release
  - Core poisoning engine
  - NaaS API integration
  - Telemetry batching
  - Evil mode redirects