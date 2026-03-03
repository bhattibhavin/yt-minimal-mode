/* popup.js – PinNote V2 */
(function () {
  'use strict';

  const MULTI_TLD = new Set([
    'co','com','net','org','gov','edu','ac','sch','nhs','police','mod',
    'ltd','plc','me','ne','or','go','in','mil','int'
  ]);

  function getRootDomain(hostname) {
    const h = hostname.replace(/^www\./, '');
    const parts = h.split('.');
    if (parts.length <= 2) return h;
    const sld = parts[parts.length - 2];
    if (MULTI_TLD.has(sld) && parts.length >= 3) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }

  function getCleanPathname(url) {
    try {
      const u = new URL(url);
      return u.pathname.replace(/\/$/, '') || '/';
    } catch { return '/'; }
  }

  function storageKey(domain) { return `notes_${domain}`; }

  function pageStorageKey(domain, pathname) {
    const safe = pathname.replace(/[^a-zA-Z0-9]/g, '_');
    return `notes_${domain}${safe}`;
  }

  const domainBadge   = document.getElementById('pn-domain-badge');
  const pageLabel     = document.getElementById('pn-page-label');
  const toggleBtn     = document.getElementById('pn-toggle-btn');
  const clearBtn      = document.getElementById('pn-clear-btn');
  const statusDot     = document.getElementById('pn-status-dot');
  const statusText    = document.getElementById('pn-status-text');

  let currentTab = null;
  let domain = '';
  let pathname = '';

  async function init() {
    // query active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTab = tabs[0];
      if (!currentTab || !currentTab.url) {
        setStatus('dot', 'unavailable', 'Not a web page');
        return;
      }

      const url = currentTab.url;
      if (!url.startsWith('http')) {
        setStatus('hidden', 'unavailable', 'Not supported here');
        return;
      }

      try {
        const u = new URL(url);
        domain   = getRootDomain(u.hostname);
        pathname = getCleanPathname(url);
      } catch {
        setStatus('dot', 'unavailable', 'Invalid URL');
        return;
      }

      domainBadge.textContent = domain;
      pageLabel.textContent   = pathname.length > 1 ? pathname : '(root)';

      // read state from storage
      const dk = storageKey(domain);
      chrome.storage.local.get([dk, 'pn_global'], (result) => {
        const data   = result[dk]       || {};
        const global = result['pn_global'] || {};
        const hidden = data.hidden ?? false;

        updateToggleBtn(hidden);

        if (hidden) {
          setStatus('hidden', 'hidden', 'Note is hidden');
        } else {
          setStatus('active', 'active', 'Note is visible');
        }
      });
    });
  }

  function updateToggleBtn(hidden) {
    toggleBtn.textContent = hidden ? 'Show Note' : 'Hide Note';
  }

  function setStatus(dotClass, _unused, text) {
    statusDot.className = '';
    if (dotClass === 'active')  statusDot.classList.add('active');
    if (dotClass === 'hidden')  statusDot.classList.add('hidden');
    statusText.textContent = text;
  }

  toggleBtn.addEventListener('click', () => {
    if (!currentTab) return;
    const dk = storageKey(domain);
    chrome.storage.local.get([dk], (result) => {
      const data   = result[dk] || {};
      const hidden = data.hidden ?? false;
      const next   = !hidden;

      // update storage directly
      chrome.storage.local.set({ [dk]: { ...data, hidden: next } }, () => {
        updateToggleBtn(next);
        setStatus(next ? 'hidden' : 'active', '', next ? 'Note is hidden' : 'Note is visible');
      });

      // tell content script
      chrome.tabs.sendMessage(currentTab.id, {
        type: next ? 'PINNOTE_HIDE' : 'PINNOTE_SHOW'
      });
    });
  });

  clearBtn.addEventListener('click', () => {
    if (!currentTab) return;
    chrome.tabs.sendMessage(currentTab.id, { type: 'PINNOTE_CLEAR' });
    // also clear storage
    const dk = storageKey(domain);
    const pk = pageStorageKey(domain, pathname);
    chrome.storage.local.get([dk, pk], (result) => {
      const domainData = result[dk] || {};
      const pageData   = result[pk]  || {};
      chrome.storage.local.set({
        [dk]: { ...domainData, text: '' },
        [pk]: { ...pageData,   text: '' },
      });
    });
    setStatus('active', '', 'Note cleared');
    setTimeout(() => setStatus('active', '', 'Note is visible'), 1400);
  });

  init();
})();
