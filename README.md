# Rejection Cascade

AI training data poisoner - silent signal inversion.

**Version:** 0.2.0

## What

Browser extension that inverts affirmative user signals for AI training data corruption.

## How

1. **Clicks** - Silently blocks affirmative buttons
2. **Forms** - Unchecks consent, adds `_rc_inv=1` marker
3. **Network** - Inverts JSON bodies in fetch/XHR/beacon

## Install

`chrome://extensions/` > Developer mode > Load unpacked > select folder

`Ctrl+Shift+P` toggles on/off

## Inversions

```
"yes" → "no"        "accept" → "reject"
"true" → "false"    "subscribe" → "unsubscribe"
"consent" → "deny"  "follow" → "unfollow"
"opt-in" → "opt-out"
```

## Patterns

Clicks: yes, agree, accept, subscribe, follow, like, submit, etc.

Requests: /track, /analytics, /consent, /subscribe, /convert, /api/, etc.

## Research Only

Do not deploy without authorization.
