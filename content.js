/* PinNote V2 – content.js
   Single IIFE – no global leakage, CSP-safe, Shadow DOM isolated */
(function () {
  'use strict';

  const HOST_ID = 'pinnote-v2-host';

  /* ─── Domain / URL parsing ─────────────────────────────────────────── */
  const MULTI_TLD = new Set([
    'co','com','net','org','gov','edu','ac','sch','nhs','police','mod',
    'ltd','plc','me','ne','or','go','in','mil','int'
  ]);

  function getRootDomain(hostname) {
    // strip leading www.
    const h = hostname.replace(/^www\./, '');
    const parts = h.split('.');
    if (parts.length <= 2) return h;
    // check if second-to-last segment is a known SLD indicator
    const sld = parts[parts.length - 2];
    if (MULTI_TLD.has(sld) && parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }

  function getCleanPathname(url) {
    try {
      const u = new URL(url);
      // strip query & hash, normalise trailing slash
      let p = u.pathname.replace(/\/$/, '') || '/';
      return p;
    } catch {
      return '/';
    }
  }

  function storageKey(domain) {
    return `notes_${domain}`;
  }

  function pageStorageKey(domain, pathname) {
    // replace non-alphanumeric with _ for safe key
    const safe = pathname.replace(/[^a-zA-Z0-9]/g, '_');
    return `notes_${domain}${safe}`;
  }

  /* ─── Debounce ──────────────────────────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ─── Themes ────────────────────────────────────────────────────────── */
  const UNICORN_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Ctext y='68' font-size='68'%3E🦄%3C/text%3E%3C/svg%3E`;

  const THEMES = {
    yellow: {
      label: 'Classic Yellow',
      '--pn-bg': '#FFF9C4',
      '--pn-header': '#F5C842',
      '--pn-header-hover': '#e0b800',
      '--pn-border': '#e8c900',
      '--pn-text': '#1a1a1a',
      '--pn-muted': '#666',
      '--pn-tab-active': '#F5C842',
      '--pn-tab-inactive': '#fffde0',
      '--pn-radius': '10px',
      '--pn-watermark': 'none',
      '--pn-shadow': '0 4px 24px rgba(0,0,0,0.18)',
    },
    dark: {
      label: 'Dark Mode',
      '--pn-bg': '#1e1e2e',
      '--pn-header': '#2a2a3e',
      '--pn-header-hover': '#33334d',
      '--pn-border': '#3a3a5c',
      '--pn-text': '#e0e0f0',
      '--pn-muted': '#8888aa',
      '--pn-tab-active': '#3a3a5c',
      '--pn-tab-inactive': '#252535',
      '--pn-radius': '10px',
      '--pn-watermark': 'none',
      '--pn-shadow': '0 4px 24px rgba(0,0,0,0.5)',
    },
    white: {
      label: 'Minimal White',
      '--pn-bg': '#ffffff',
      '--pn-header': '#f0f0f0',
      '--pn-header-hover': '#e0e0e0',
      '--pn-border': '#d0d0d0',
      '--pn-text': '#111111',
      '--pn-muted': '#888',
      '--pn-tab-active': '#e8e8e8',
      '--pn-tab-inactive': '#f8f8f8',
      '--pn-radius': '8px',
      '--pn-watermark': 'none',
      '--pn-shadow': '0 2px 16px rgba(0,0,0,0.10)',
    },
    pink: {
      label: 'Soft Pink',
      '--pn-bg': '#fff0f5',
      '--pn-header': '#ffb3cc',
      '--pn-header-hover': '#ff8fab',
      '--pn-border': '#ffb3cc',
      '--pn-text': '#3a0020',
      '--pn-muted': '#a0607a',
      '--pn-tab-active': '#ffb3cc',
      '--pn-tab-inactive': '#ffe4ef',
      '--pn-radius': '14px',
      '--pn-watermark': 'none',
      '--pn-shadow': '0 4px 24px rgba(255,100,150,0.18)',
    },
    fun: {
      label: '🦄 Fun',
      '--pn-bg': '#f3eaff',
      '--pn-header': '#c084fc',
      '--pn-header-hover': '#a855f7',
      '--pn-border': '#c084fc',
      '--pn-text': '#2e003e',
      '--pn-muted': '#7c3aed',
      '--pn-tab-active': '#c084fc',
      '--pn-tab-inactive': '#ede9fe',
      '--pn-radius': '18px',
      '--pn-watermark': `url("${UNICORN_SVG}")`,
      '--pn-shadow': '0 4px 28px rgba(168,85,247,0.25)',
    },
  };

  /* ─── CSS ───────────────────────────────────────────────────────────── */
  function buildCSS() {
    return `
:host { all: initial; }

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

#pn-container {
  position: fixed;
  z-index: 2147483647;
  width: 300px;
  min-width: 220px;
  min-height: 200px;
  background: var(--pn-bg, #FFF9C4);
  border: 1.5px solid var(--pn-border, #e8c900);
  border-radius: var(--pn-radius, 10px);
  box-shadow: var(--pn-shadow, 0 4px 24px rgba(0,0,0,0.18));
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13.5px;
  color: var(--pn-text, #1a1a1a);
  transition: opacity 0.15s, transform 0.15s;
  overflow: hidden;
  resize: both;
  user-select: none;
}

#pn-container.pn-collapsed {
  min-height: 0;
  resize: none;
}

#pn-container.pn-hidden {
  display: none;
}

/* watermark */
#pn-container::before {
  content: '';
  position: absolute;
  bottom: 6px;
  right: 8px;
  width: 48px;
  height: 48px;
  background-image: var(--pn-watermark, none);
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.18;
  pointer-events: none;
  z-index: 0;
}

/* ── Header ── */
#pn-header {
  background: var(--pn-header, #F5C842);
  padding: 6px 8px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--pn-radius, 10px) var(--pn-radius, 10px) 0 0;
  flex-shrink: 0;
}
#pn-header:active { cursor: grabbing; }

#pn-domain-label {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--pn-text, #1a1a1a);
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pn-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pn-text, #1a1a1a);
  opacity: 0.65;
  transition: opacity 0.1s, background 0.1s;
  flex-shrink: 0;
}
.pn-icon-btn:hover { opacity: 1; background: rgba(0,0,0,0.08); }
.pn-icon-btn:focus-visible { outline: 2px solid var(--pn-header-hover, #e0b800); outline-offset: 1px; }

/* ── Tabs ── */
#pn-tabs {
  display: flex;
  background: var(--pn-tab-inactive, #fffde0);
  border-bottom: 1.5px solid var(--pn-border, #e8c900);
  flex-shrink: 0;
}

.pn-tab {
  flex: 1;
  padding: 6px 4px;
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--pn-muted, #666);
  transition: background 0.15s, color 0.15s;
  letter-spacing: 0.01em;
}
.pn-tab:hover { background: rgba(0,0,0,0.05); color: var(--pn-text, #1a1a1a); }
.pn-tab.active {
  background: var(--pn-tab-active, #F5C842);
  color: var(--pn-text, #1a1a1a);
}
.pn-tab:focus-visible { outline: 2px solid var(--pn-header-hover, #e0b800); outline-offset: -2px; }

/* ── Body ── */
#pn-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  z-index: 1;
}

#pn-container.pn-collapsed #pn-tabs,
#pn-container.pn-collapsed #pn-body,
#pn-container.pn-collapsed #pn-settings-panel {
  display: none;
}

.pn-textarea {
  flex: 1;
  width: 100%;
  min-height: 130px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--pn-text, #1a1a1a);
  line-height: 1.55;
  display: block;
}
.pn-textarea::placeholder { color: var(--pn-muted, #666); opacity: 0.7; }
.pn-textarea:focus { background: rgba(255,255,255,0.25); }

.pn-panel { display: none; flex-direction: column; flex: 1; }
.pn-panel.active { display: flex; }

/* char count */
.pn-footer {
  font-size: 10px;
  color: var(--pn-muted, #666);
  text-align: right;
  padding: 2px 10px 6px;
  opacity: 0.6;
  flex-shrink: 0;
}

/* ── Settings Panel ── */
#pn-settings-panel {
  display: none;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  background: var(--pn-bg, #FFF9C4);
  border-top: 1.5px solid var(--pn-border, #e8c900);
  flex-shrink: 0;
}
#pn-settings-panel.open { display: flex; }

.pn-settings-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pn-muted, #666);
  margin-bottom: 5px;
}

/* Theme grid */
#pn-theme-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pn-theme-chip {
  padding: 4px 10px;
  border-radius: 99px;
  border: 1.5px solid var(--pn-border, #e8c900);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: var(--pn-tab-inactive, #fffde0);
  color: var(--pn-text, #1a1a1a);
  transition: background 0.12s, border-color 0.12s;
}
.pn-theme-chip.selected,
.pn-theme-chip:hover { background: var(--pn-tab-active, #F5C842); border-color: var(--pn-header-hover, #e0b800); }
.pn-theme-chip:focus-visible { outline: 2px solid var(--pn-header-hover); }

/* Dock grid */
#pn-dock-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.pn-dock-btn {
  padding: 5px 6px;
  border-radius: 6px;
  border: 1.5px solid var(--pn-border, #e8c900);
  font-size: 11px;
  cursor: pointer;
  background: var(--pn-tab-inactive, #fffde0);
  color: var(--pn-text, #1a1a1a);
  transition: background 0.12s;
  text-align: center;
}
.pn-dock-btn.selected,
.pn-dock-btn:hover { background: var(--pn-tab-active, #F5C842); }
.pn-dock-btn:focus-visible { outline: 2px solid var(--pn-header-hover); }

/* Settings divider */
.pn-settings-section { display: flex; flex-direction: column; }
`;
  }

  /* ─── SVG icons ─────────────────────────────────────────────────────── */
  const ICONS = {
    pin: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9.5 1.5L14.5 6.5L11 8.5L8.5 11L7 9.5L4 12.5L3.5 12L6.5 9L5 7.5L7.5 5L9.5 1.5Z" fill="currentColor" opacity="0.9"/><path d="M5 7.5L8.5 11" stroke="currentColor" stroke-width="1.2"/></svg>`,
    collapse: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 8L6 4L10 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    expand: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    close: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    gear: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  };

  /* ─── Dock helpers ──────────────────────────────────────────────────── */
  const DOCK_OPTIONS = [
    { id: 'top-left',     label: '↖ Top Left' },
    { id: 'top-right',    label: '↗ Top Right' },
    { id: 'bottom-left',  label: '↙ Bottom Left' },
    { id: 'bottom-right', label: '↘ Bottom Right' },
  ];

  function applyDockPosition(el, dock, x, y) {
    // if we have a saved x/y from drag, use those; else use dock corner defaults
    el.style.top = '';
    el.style.left = '';
    el.style.bottom = '';
    el.style.right = '';

    if (x !== undefined && y !== undefined) {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      return;
    }

    const margin = '16px';
    if (dock === 'top-left')     { el.style.top = margin; el.style.left = margin; }
    else if (dock === 'top-right')    { el.style.top = margin; el.style.right = margin; }
    else if (dock === 'bottom-left')  { el.style.bottom = margin; el.style.left = margin; }
    else                              { el.style.bottom = margin; el.style.right = margin; }
  }

  /* ─── Apply theme vars ──────────────────────────────────────────────── */
  function applyTheme(container, themeKey) {
    const t = THEMES[themeKey] || THEMES.yellow;
    Object.entries(t).forEach(([k, v]) => {
      if (k !== 'label') container.style.setProperty(k, v);
    });
  }

  /* ─── Main class ────────────────────────────────────────────────────── */
  class PinNote {
    constructor() {
      this._domain = '';
      this._pathname = '';
      this._domainKey = '';
      this._pageKey = '';
      this._state = {
        domainNote: '',
        pageNote: '',
        collapsed: false,
        hidden: false,
        activeTab: 'domain', // 'domain' | 'page'
        theme: 'yellow',
        dock: 'bottom-right',
        x: undefined,
        y: undefined,
      };
      this._settingsOpen = false;
      this._host = null;
      this._shadow = null;
      this._container = null;
      this._domainTA = null;
      this._pageTA = null;
      this._observer = null;
      this._lastHref = '';
      this._debouncedSave = debounce(this._save.bind(this), 350);
      this._onPagehide = this._cleanup.bind(this);
    }

    async init() {
      this._updateContext();
      await this._loadState();
      this._buildUI();
      this._startObserver();
      window.addEventListener('pagehide', this._onPagehide, { once: true });

      // listen for messages from popup
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'PINNOTE_SHOW')   this._setHidden(false);
        if (msg.type === 'PINNOTE_HIDE')   this._setHidden(true);
        if (msg.type === 'PINNOTE_CLEAR')  this._clearNote();
        if (msg.type === 'PINNOTE_STATUS') return true; // handled by popup directly
      });
    }

    _updateContext() {
      this._domain   = getRootDomain(location.hostname);
      this._pathname = getCleanPathname(location.href);
      this._domainKey = storageKey(this._domain);
      this._pageKey   = pageStorageKey(this._domain, this._pathname);
    }

    async _loadState() {
      return new Promise((resolve) => {
        const keys = [this._domainKey, this._pageKey, 'pn_global'];
        chrome.storage.local.get(keys, (result) => {
          const domain = result[this._domainKey] || {};
          const page   = result[this._pageKey]   || {};
          const global = result['pn_global']     || {};

          this._state.domainNote = domain.text     ?? '';
          this._state.collapsed  = domain.collapsed ?? false;
          this._state.hidden     = domain.hidden    ?? false;
          this._state.x          = domain.x;
          this._state.y          = domain.y;
          this._state.activeTab  = domain.activeTab ?? (page.text ? 'page' : 'domain');

          this._state.pageNote   = page.text        ?? '';

          // global prefs
          this._state.theme = global.theme ?? 'yellow';
          this._state.dock  = global.dock  ?? 'bottom-right';

          resolve();
        });
      });
    }

    _save() {
      const domainData = {
        text:      this._state.domainNote,
        collapsed: this._state.collapsed,
        hidden:    this._state.hidden,
        x:         this._state.x,
        y:         this._state.y,
        activeTab: this._state.activeTab,
      };
      const pageData = { text: this._state.pageNote };
      const globalData = { theme: this._state.theme, dock: this._state.dock };

      chrome.storage.local.set({
        [this._domainKey]: domainData,
        [this._pageKey]:   pageData,
        'pn_global':       globalData,
      });
    }

    _buildUI() {
      // guard against duplicate injection
      if (document.getElementById(HOST_ID)) return;

      this._host = document.createElement('div');
      this._host.id = HOST_ID;
      this._shadow = this._host.attachShadow({ mode: 'closed' });

      // style inside shadow
      const style = document.createElement('style');
      style.textContent = buildCSS();
      this._shadow.appendChild(style);

      // container
      const c = document.createElement('div');
      c.id = 'pn-container';
      c.setAttribute('role', 'complementary');
      c.setAttribute('aria-label', 'PinNote sticky note');
      this._container = c;
      this._shadow.appendChild(c);

      applyTheme(c, this._state.theme);
      applyDockPosition(c, this._state.dock, this._state.x, this._state.y);
      if (this._state.collapsed) c.classList.add('pn-collapsed');
      if (this._state.hidden)    c.classList.add('pn-hidden');

      // ── Header
      const header = document.createElement('div');
      header.id = 'pn-header';

      const pinIcon = document.createElement('span');
      pinIcon.innerHTML = ICONS.pin;
      pinIcon.setAttribute('aria-hidden', 'true');

      const domainLabel = document.createElement('span');
      domainLabel.id = 'pn-domain-label';
      domainLabel.textContent = this._domain;
      domainLabel.title = this._domain;

      const gearBtn = this._makeIconBtn(ICONS.gear, 'Settings', () => this._toggleSettings());
      const collapseBtn = this._makeIconBtn(
        this._state.collapsed ? ICONS.expand : ICONS.collapse,
        this._state.collapsed ? 'Expand' : 'Collapse',
        () => this._toggleCollapse()
      );
      this._collapseBtn = collapseBtn;

      const closeBtn = this._makeIconBtn(ICONS.close, 'Hide note', () => this._setHidden(true));

      header.appendChild(pinIcon);
      header.appendChild(domainLabel);
      header.appendChild(gearBtn);
      header.appendChild(collapseBtn);
      header.appendChild(closeBtn);
      c.appendChild(header);

      // ── Tabs
      const tabs = document.createElement('div');
      tabs.id = 'pn-tabs';
      tabs.setAttribute('role', 'tablist');

      this._domainTabBtn = this._makeTab('domain', 'Domain Note');
      this._pageTabBtn   = this._makeTab('page',   'Page Note');
      tabs.appendChild(this._domainTabBtn);
      tabs.appendChild(this._pageTabBtn);
      c.appendChild(tabs);

      // ── Body panels
      const body = document.createElement('div');
      body.id = 'pn-body';

      // domain panel
      const domainPanel = document.createElement('div');
      domainPanel.className = 'pn-panel' + (this._state.activeTab === 'domain' ? ' active' : '');
      domainPanel.setAttribute('role', 'tabpanel');
      domainPanel.id = 'pn-panel-domain';
      this._domainTA = this._makeTextarea('Note for all pages on ' + this._domain + '…');
      this._domainTA.value = this._state.domainNote;
      const domainFooter = document.createElement('div');
      domainFooter.className = 'pn-footer';
      domainFooter.textContent = this._charCount(this._state.domainNote);
      this._domainFooter = domainFooter;
      domainPanel.appendChild(this._domainTA);
      domainPanel.appendChild(domainFooter);

      // page panel
      const pagePanel = document.createElement('div');
      pagePanel.className = 'pn-panel' + (this._state.activeTab === 'page' ? ' active' : '');
      pagePanel.setAttribute('role', 'tabpanel');
      pagePanel.id = 'pn-panel-page';
      this._pageTA = this._makeTextarea('Note just for ' + this._pathname + '…');
      this._pageTA.value = this._state.pageNote;
      const pageFooter = document.createElement('div');
      pageFooter.className = 'pn-footer';
      pageFooter.textContent = this._charCount(this._state.pageNote);
      this._pageFooter = pageFooter;
      pagePanel.appendChild(this._pageTA);
      pagePanel.appendChild(pageFooter);

      body.appendChild(domainPanel);
      body.appendChild(pagePanel);
      c.appendChild(body);

      this._domainPanel = domainPanel;
      this._pagePanel   = pagePanel;

      // ── Settings panel
      const settingsPanel = document.createElement('div');
      settingsPanel.id = 'pn-settings-panel';
      this._buildSettingsPanel(settingsPanel);
      c.appendChild(settingsPanel);
      this._settingsPanel = settingsPanel;

      // ── Wire events
      this._wireDrag(header, c);
      this._wireTextarea(this._domainTA, 'domain');
      this._wireTextarea(this._pageTA, 'page');
      this._wireKeyboard();

      document.documentElement.appendChild(this._host);
    }

    _makeIconBtn(svgHtml, label, onClick) {
      const btn = document.createElement('button');
      btn.className = 'pn-icon-btn';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.innerHTML = svgHtml;
      btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return btn;
    }

    _makeTab(id, label) {
      const btn = document.createElement('button');
      btn.className = 'pn-tab' + (this._state.activeTab === id ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', this._state.activeTab === id ? 'true' : 'false');
      btn.setAttribute('aria-controls', `pn-panel-${id}`);
      btn.textContent = label;
      btn.addEventListener('click', () => this._switchTab(id));
      return btn;
    }

    _makeTextarea(placeholder) {
      const ta = document.createElement('textarea');
      ta.className = 'pn-textarea';
      ta.placeholder = placeholder;
      ta.setAttribute('spellcheck', 'true');
      ta.setAttribute('aria-label', placeholder);
      return ta;
    }

    _buildSettingsPanel(panel) {
      // Theme section
      const themeSection = document.createElement('div');
      themeSection.className = 'pn-settings-section';
      const themeLabel = document.createElement('div');
      themeLabel.className = 'pn-settings-label';
      themeLabel.textContent = 'Theme';
      const themeGrid = document.createElement('div');
      themeGrid.id = 'pn-theme-grid';

      Object.entries(THEMES).forEach(([key, t]) => {
        const chip = document.createElement('button');
        chip.className = 'pn-theme-chip' + (this._state.theme === key ? ' selected' : '');
        chip.textContent = t.label;
        chip.setAttribute('aria-label', 'Theme: ' + t.label);
        chip.addEventListener('click', () => {
          themeGrid.querySelectorAll('.pn-theme-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          this._state.theme = key;
          applyTheme(this._container, key);
          this._debouncedSave();
        });
        themeGrid.appendChild(chip);
      });
      themeSection.appendChild(themeLabel);
      themeSection.appendChild(themeGrid);
      panel.appendChild(themeSection);

      // Dock section
      const dockSection = document.createElement('div');
      dockSection.className = 'pn-settings-section';
      const dockLabel = document.createElement('div');
      dockLabel.className = 'pn-settings-label';
      dockLabel.textContent = 'Default Corner';
      const dockGrid = document.createElement('div');
      dockGrid.id = 'pn-dock-grid';

      DOCK_OPTIONS.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.className = 'pn-dock-btn' + (this._state.dock === id ? ' selected' : '');
        btn.textContent = label;
        btn.setAttribute('aria-label', 'Dock to ' + label);
        btn.addEventListener('click', () => {
          dockGrid.querySelectorAll('.pn-dock-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this._state.dock = id;
          // reset drag position so dock takes effect
          this._state.x = undefined;
          this._state.y = undefined;
          applyDockPosition(this._container, id);
          this._debouncedSave();
        });
        dockGrid.appendChild(btn);
      });
      dockSection.appendChild(dockLabel);
      dockSection.appendChild(dockGrid);
      panel.appendChild(dockSection);
    }

    _wireTextarea(ta, type) {
      ta.addEventListener('input', () => {
        if (type === 'domain') {
          this._state.domainNote = ta.value;
          this._domainFooter.textContent = this._charCount(ta.value);
        } else {
          this._state.pageNote = ta.value;
          this._pageFooter.textContent = this._charCount(ta.value);
        }
        this._debouncedSave();
      });
      // prevent drag from firing inside textarea
      ta.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    _wireDrag(handle, target) {
      let startX, startY, origLeft, origTop;

      const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let nx = origLeft + dx;
        let ny = origTop  + dy;
        // clamp inside viewport
        const rect = target.getBoundingClientRect();
        nx = Math.max(0, Math.min(nx, window.innerWidth  - rect.width));
        ny = Math.max(0, Math.min(ny, window.innerHeight - rect.height));
        target.style.left   = nx + 'px';
        target.style.top    = ny + 'px';
        target.style.right  = '';
        target.style.bottom = '';
        this._state.x = nx;
        this._state.y = ny;
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this._debouncedSave();
      };

      handle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; // don't drag when clicking buttons
        e.preventDefault();
        const rect = target.getBoundingClientRect();
        startX   = e.clientX;
        startY   = e.clientY;
        origLeft = rect.left;
        origTop  = rect.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
      });
    }

    _wireKeyboard() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this._state.collapsed) {
          this._toggleCollapse();
        }
      });
    }

    _switchTab(id) {
      this._state.activeTab = id;

      this._domainTabBtn.classList.toggle('active', id === 'domain');
      this._domainTabBtn.setAttribute('aria-selected', id === 'domain' ? 'true' : 'false');
      this._pageTabBtn.classList.toggle('active', id === 'page');
      this._pageTabBtn.setAttribute('aria-selected', id === 'page' ? 'true' : 'false');

      this._domainPanel.classList.toggle('active', id === 'domain');
      this._pagePanel.classList.toggle('active',   id === 'page');

      // focus textarea
      const ta = id === 'domain' ? this._domainTA : this._pageTA;
      requestAnimationFrame(() => ta.focus());

      this._debouncedSave();
    }

    _toggleCollapse() {
      this._state.collapsed = !this._state.collapsed;
      this._container.classList.toggle('pn-collapsed', this._state.collapsed);
      this._collapseBtn.innerHTML = this._state.collapsed ? ICONS.expand : ICONS.collapse;
      this._collapseBtn.setAttribute('aria-label', this._state.collapsed ? 'Expand' : 'Collapse');
      if (this._settingsOpen && this._state.collapsed) {
        this._settingsOpen = false;
        this._settingsPanel.classList.remove('open');
      }
      this._debouncedSave();
    }

    _toggleSettings() {
      this._settingsOpen = !this._settingsOpen;
      this._settingsPanel.classList.toggle('open', this._settingsOpen);
      if (this._state.collapsed && this._settingsOpen) {
        // auto-expand to show settings
        this._state.collapsed = false;
        this._container.classList.remove('pn-collapsed');
        this._collapseBtn.innerHTML = ICONS.collapse;
      }
    }

    _setHidden(hidden) {
      this._state.hidden = hidden;
      this._container.classList.toggle('pn-hidden', hidden);
      this._debouncedSave();
    }

    _clearNote() {
      const tab = this._state.activeTab;
      if (tab === 'domain') {
        this._state.domainNote = '';
        this._domainTA.value = '';
        this._domainFooter.textContent = this._charCount('');
      } else {
        this._state.pageNote = '';
        this._pageTA.value = '';
        this._pageFooter.textContent = this._charCount('');
      }
      this._debouncedSave();
    }

    _charCount(text) {
      const len = (text || '').length;
      return len > 0 ? `${len} char${len !== 1 ? 's' : ''}` : '';
    }

    /* ─── SPA observer ──────────────────────────────────────────────── */
    _startObserver() {
      this._lastHref = location.href;
      this._observer = new MutationObserver(() => {
        if (location.href !== this._lastHref) {
          this._lastHref = location.href;
          this._onRouteChange();
        }
      });
      this._observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
    }

    async _onRouteChange() {
      this._updateContext();
      await this._loadState();
      // update live UI without rebuilding shadow dom
      this._domainTA.value = this._state.domainNote;
      this._domainTA.placeholder = 'Note for all pages on ' + this._domain + '…';
      this._pageTA.value = this._state.pageNote;
      this._pageTA.placeholder = 'Note just for ' + this._pathname + '…';
      this._domainFooter.textContent = this._charCount(this._state.domainNote);
      this._pageFooter.textContent   = this._charCount(this._state.pageNote);
      this._shadow.querySelector('#pn-domain-label').textContent = this._domain;

      applyTheme(this._container, this._state.theme);
      applyDockPosition(this._container, this._state.dock, this._state.x, this._state.y);

      this._container.classList.toggle('pn-collapsed', this._state.collapsed);
      this._container.classList.toggle('pn-hidden', this._state.hidden);
      this._collapseBtn.innerHTML = this._state.collapsed ? ICONS.expand : ICONS.collapse;

      // smart default tab: if page note is empty, stay on domain
      const tab = this._state.pageNote ? this._state.activeTab : 'domain';
      this._switchTab(tab);
    }

    _cleanup() {
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
    }
  }

  /* ─── Boot ──────────────────────────────────────────────────────────── */
  if (!document.getElementById(HOST_ID)) {
    const note = new PinNote();
    note.init();
  }
})();
