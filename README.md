# PinNote – Sticky Notes for Every Website

> Domain & page-level sticky notes that stay where you leave them. Fast, private, and always there.

![Version](https://img.shields.io/badge/version-2.0.0-orange) ![Manifest](https://img.shields.io/badge/manifest-v3-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Size](https://img.shields.io/badge/size-%3C20KB-brightgreen)

---

## What is PinNote?

PinNote is a Chrome/Edge extension that lets you attach sticky notes to any website — either for the entire domain or just a specific page. Notes are saved locally, persist across sessions, and never leave your device.

No account. No sync. No tracking. Just notes.

---

## Features

- **Domain Notes** — one note shared across all pages of a domain (e.g. everything on `github.com`)
- **Page Notes** — a note tied to the exact page path (e.g. only on `github.com/settings`)
- **Smart tab system** — both notes coexist; switch between them inside the sticky note UI
- **5 Themes** — Classic Yellow, Dark Mode, Minimal White, Soft Pink, Fun (with unicorn watermark)
- **4 Dock positions** — pin the note to any corner of the screen
- **Drag & drop** — freely reposition the note anywhere on the page
- **Collapse / expand** — minimize the note when not in use
- **SPA-aware** — works on React, Vue, and Angular apps that update URLs without full page loads
- **Auto-save** — debounced 300ms save, never loses a keystroke
- **Fully isolated** — built with Shadow DOM, never interferes with page styles

---

## Installation (Developer / Unpacked)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions` (or `edge://extensions` for Edge)
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the **root folder** of the cloned repo (the folder containing `manifest.json`)
6. The PinNote icon appears in your toolbar — you're ready

---

## How to Use

| Action | How |
|---|---|
| Open a note | Navigate to any website — note appears automatically |
| Write a domain note | Type in the **Domain Note** tab |
| Write a page note | Switch to the **Page Note** tab |
| Move the note | Drag the header bar |
| Change theme / corner | Click the **gear icon** in the note header |
| Collapse | Click the **–** button or press **ESC** |
| Show / Hide from toolbar | Click the **PinNote** icon in the toolbar |
| Clear a note | Toolbar popup → **Clear Note** |

---

## File Structure

```
repo root/
├── manifest.json     # Extension config (Manifest V3)
├── content.js        # Core logic — Shadow DOM, notes, themes, SPA observer
├── popup.html        # Toolbar popup UI
├── popup.css         # Popup styles
├── popup.js          # Popup logic
├── icon16.png        # Toolbar icon
├── icon48.png        # Extensions page icon
├── icon128.png       # Chrome Web Store icon
└── README.md         # This file
```

---

## Architecture

**No background.js** — `chrome.storage.local` is accessible directly from content scripts in MV3. The popup uses `chrome.tabs.sendMessage` to communicate with the content script.

**Shadow DOM isolation** — the entire UI is mounted inside a Shadow Root. Page CSS cannot bleed in; extension CSS cannot bleed out.

**Domain parsing** — handles multi-part TLDs (`co.uk`, `com.au`, `co.jp`) using a curated MULTI_TLD set. No naive `.split('.').slice(-2)` logic.

**URL normalization** — uses `new URL(href).pathname` natively stripping all query params and hash fragments. Notes persist regardless of tracking links (`?utm_source=...`).

**SPA support** — a single `MutationObserver` on `document.documentElement` detects URL changes on React/Vue/Angular apps and reloads the correct note without tearing down the Shadow DOM.

**Memory safety** — observer is disconnected on `pagehide`. Drag listeners are added on `mousedown` and removed on `mouseup`. Debounce timers are cleared before re-set.

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save notes and preferences locally |
| `tabs` | Popup can send messages to the active tab |

No `host_permissions`. No remote network calls. No analytics. No telemetry.

---

## Themes

| Theme | Description |
|---|---|
| Classic Yellow | The original sticky note look |
| Dark Mode | Easy on the eyes at night |
| Minimal White | Clean and distraction-free |
| Soft Pink | Warm pastel aesthetic |
| Fun | Rounded, playful with a subtle unicorn watermark |

---

## Privacy

All data is stored in `chrome.storage.local` — on your device only. Nothing is sent to any server. The extension has no network permissions.

---

## License

MIT — free to use, modify, and distribute.

---

## Contributing

1. Fork the repo
2. Make your changes directly in the root folder
3. Load unpacked to test locally (select the repo root folder)
4. Open a pull request

---

*Built with Vanilla JS, Shadow DOM, and zero dependencies.*
