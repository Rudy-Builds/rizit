// ─── Theme ───────────────────────────────────────────────────
// Initial theme is applied by the inline script in <head> to avoid a flash.
const SUN_ICON = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function updateThemeIcon() {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  icon.innerHTML = dark ? SUN_ICON : MOON_ICON;
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rizit_theme', next);
  updateThemeIcon();
}

// ─── Backend ─────────────────────────────────────────────────
function getBackend() {
  return localStorage.getItem('rizit_backend') || 'archive.is';
}

function getArchiveUrl(url) {
  const encoded = encodeURIComponent(url);
  if (getBackend() === 'web.archive.org') {
    return `https://web.archive.org/web/99999999999999/${encoded}`;
  }
  return `https://archive.is/newest/${encoded}`;
}

function getBackendLabel(backend) {
  return backend === 'web.archive.org' ? 'Wayback' : 'archive.is';
}

// ─── History ────────────────────────────────────────────────
const HISTORY_KEY = 'rizit_history';
const MAX_HISTORY = 10;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(url, archiveUrl) {
  let history = getHistory().filter(h => h.url !== url);
  history.unshift({ url, archiveUrl, backend: getBackend(), timestamp: new Date().toISOString() });
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const section = document.getElementById('history-section');
  const list = document.getElementById('historyList');
  if (!section || !list) return;

  const history = getHistory();

  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.replaceChildren(...history.map(item => {
    const d = new Date(item.timestamp);
    const time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = 'history-item';

    const urlSpan = document.createElement('span');
    urlSpan.className = 'history-url';
    urlSpan.title = item.url;
    urlSpan.textContent = item.url;

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'history-time';
    timeSpan.textContent = time;

    const badge = document.createElement('span');
    badge.className = 'history-backend-badge';
    badge.textContent = getBackendLabel(item.backend);

    meta.append(timeSpan, badge);

    const btn = document.createElement('button');
    btn.className = 're-archive-btn';
    btn.dataset.url = item.url;
    btn.textContent = 'Re-archive';

    row.append(urlSpan, meta, btn);
    return row;
  }));
}

// ─── Install Banner ──────────────────────────────────────────
let deferredPrompt = null;

function initInstallBanner() {
  if (localStorage.getItem('rizit_install_dismissed') === 'true') return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBanner').classList.remove('hidden');
  });

  document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('installBanner').classList.add('hidden');
  });

  document.getElementById('dismissInstall')?.addEventListener('click', () => {
    document.getElementById('installBanner').classList.add('hidden');
    localStorage.setItem('rizit_install_dismissed', 'true');
  });
}

// ─── Collapsible Sections ────────────────────────────────────
function initCollapsibles() {
  document.getElementById('historyToggle')?.addEventListener('click', () => {
    document.getElementById('history-section').classList.toggle('open');
    document.getElementById('historyBody').classList.toggle('hidden');
  });

  document.getElementById('howToToggle')?.addEventListener('click', () => {
    document.getElementById('howto-section').classList.toggle('open');
    document.getElementById('howToBody').classList.toggle('hidden');
  });
}

// ─── Platform Pills ─────────────────────────────────────────
function initPlatformPills() {
  const pills = document.querySelectorAll('.pill[data-platform]');
  const guides = {
    android: document.getElementById('guide-android'),
    ios:     document.getElementById('guide-ios'),
    desktop: document.getElementById('guide-desktop'),
  };

  // Detect current platform (iPadOS 13+ reports as Macintosh, hence maxTouchPoints)
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
  const platform = isIOS ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';

  function showPlatform(p) {
    pills.forEach(pl => pl.classList.toggle('active', pl.dataset.platform === p));
    Object.entries(guides).forEach(([k, el]) => {
      if (el) el.classList.toggle('hidden', k !== p);
    });
  }

  pills.forEach(pill => {
    pill.addEventListener('click', () => showPlatform(pill.dataset.platform));
  });

  showPlatform(platform);
}

// ─── Core: URL handling ──────────────────────────────────────
const TRACKING_PARAMS = ['fbclid', 'gclid', 'igshid'];

function stripTrackingParams(parsed) {
  const params = parsed.searchParams;
  [...params.keys()]
    .filter(k => k.startsWith('utm_') || TRACKING_PARAMS.includes(k))
    .forEach(k => params.delete(k));
  return parsed.href;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function showToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function showError(msg) {
  const el = document.getElementById('error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() {
  const el = document.getElementById('error');
  if (el) el.classList.add('hidden');
}

function setStatus(html) {
  const el = document.getElementById('status');
  if (el) el.innerHTML = html;
}

async function handleSharedUrl(url) {
  url = url.trim();
  if (!url) return;

  clearError();

  if (!url.includes('.')) {
    showError('That doesn\'t look like a URL. Try something like https://example.com');
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  let parsed;
  try { parsed = new URL(url); }
  catch {
    showError('Invalid URL. Check the format (e.g. https://example.com)');
    return;
  }
  url = stripTrackingParams(parsed);

  const backendLabel = getBackendLabel(getBackend());
  const archiveUrl = getArchiveUrl(url);

  // Open synchronously so the user-activation grant isn't lost to an await
  const newTab = window.open(archiveUrl, '_blank');
  if (newTab) newTab.opener = null;

  if (!newTab) {
    setStatus('Popup blocked. <a href="' + archiveUrl + '" target="_blank" rel="noopener">Open ' + backendLabel + '</a> — archive link is in your clipboard.');
  } else {
    setStatus('Opening ' + backendLabel + '… the archive link is in your clipboard.');
  }

  const copied = await copyText(archiveUrl);
  if (copied) showToast();
  else showError('Couldn\'t copy to clipboard — the archive link is shown above.');

  saveToHistory(url, archiveUrl);
}

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateThemeIcon();
  initInstallBanner();
  initCollapsibles();
  initPlatformPills();
  renderHistory();

  // Backend selector
  const backendSelect = document.getElementById('backendSelect');
  if (backendSelect) {
    const stored = localStorage.getItem('rizit_backend');
    if (stored) backendSelect.value = stored;
    backendSelect.addEventListener('change', e => {
      localStorage.setItem('rizit_backend', e.target.value);
    });
  }

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Clear history
  document.getElementById('clearHistory')?.addEventListener('click', clearHistory);

  // Re-archive buttons (delegated)
  document.getElementById('historyList')?.addEventListener('click', e => {
    const btn = e.target.closest('.re-archive-btn');
    if (btn) handleSharedUrl(btn.dataset.url);
  });

  // Single URL form (hero input)
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  if (urlForm && urlInput) {
    urlForm.addEventListener('submit', e => {
      e.preventDefault();
      handleSharedUrl(urlInput.value);
    });
  }

  // Web Share Target (Android shared this app a URL, often as "Title https://…")
  const params = new URLSearchParams(window.location.search);
  const shared = params.get('url') || params.get('text');
  if (shared?.trim()) {
    const match = shared.match(/https?:\/\/\S+/);
    handleSharedUrl(match ? match[0] : shared.trim());
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.error('SW registration failed:', err));
  }
});
