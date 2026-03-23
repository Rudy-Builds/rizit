// ─── Theme ───────────────────────────────────────────────────
function initTheme() {
  const stored = localStorage.getItem('rizit_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (stored) {
    document.documentElement.setAttribute('data-theme', stored);
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rizit_theme', next);
}

// ─── Backend ─────────────────────────────────────────────────
function getArchiveUrl(url) {
  const backend = localStorage.getItem('rizit_backend') || 'archive.is';
  const encoded = encodeURIComponent(url);
  if (backend === 'web.archive.org') {
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
  const backend = localStorage.getItem('rizit_backend') || 'archive.is';
  let history = getHistory().filter(h => h.url !== url);
  history.unshift({ url, archiveUrl, backend, timestamp: new Date().toISOString() });
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
  const empty = document.getElementById('historyEmpty');
  if (!section || !list) return;

  const history = getHistory();

  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  list.innerHTML = history.map(item => {
    const d = new Date(item.timestamp);
    const time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const badge = getBackendLabel(item.backend);
    return `
      <div class="history-item">
        <span class="history-url" title="${item.url}">${item.url}</span>
        <div class="history-meta">
          <span class="history-time">${time}</span>
          <span class="history-backend-badge">${badge}</span>
        </div>
        <button class="re-archive-btn" data-url="${item.url}">Re-archive</button>
      </div>`;
  }).join('');

  list.querySelectorAll('.re-archive-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSharedUrl(btn.dataset.url));
  });
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
    const section = document.getElementById('history-section');
    const body = document.getElementById('historyBody');
    section.classList.toggle('open');
    body.classList.toggle('hidden');
  });

  document.getElementById('howToToggle')?.addEventListener('click', () => {
    const section = document.querySelector('.section:last-of-type');
    const body = document.getElementById('howToBody');
    section.classList.toggle('open');
    body.classList.toggle('hidden');
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

  // Detect current platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  const platform = isIOS ? 'ios' : isDesktop ? 'desktop' : 'android';

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
function isValidUrl(string) {
  try { new URL(string); return true; }
  catch { return false; }
}

async function checkClipboardPermission() {
  if ('permissions' in navigator) {
    try {
      const s = await navigator.permissions.query({ name: 'clipboard-write' });
      return s.state === 'granted' || s.state === 'prompt';
    } catch {}
  }
  return true;
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
  url = url.split('?')[0].trim();
  if (!url) return;

  clearError();

  if (!url.includes('.')) {
    showError('That doesn\'t look like a URL. Try something like https://example.com');
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  if (!isValidUrl(url)) {
    showError('Invalid URL. Check the format (e.g. https://example.com)');
    return;
  }

  const backend = localStorage.getItem('rizit_backend') || 'archive.is';
  const backendLabel = getBackendLabel(backend);
  const archiveUrl = getArchiveUrl(url);

  setStatus('<span class="spinner"></span> Checking with ' + backendLabel + '…');

  const copied = await copyText(archiveUrl);
  const newTab = window.open(archiveUrl, '_blank');

  if (!newTab) {
    setStatus('Popup blocked. <a href="' + archiveUrl + '" target="_blank" rel="noopener">Open ' + backendLabel + '</a> — archive link is in your clipboard.');
  } else {
    setStatus('Opening ' + backendLabel + '… the archive link is in your clipboard.');
  }

  if (copied) showToast();
  else showError('Couldn\'t copy to clipboard — the archive link is shown above.');

  saveToHistory(url, archiveUrl);
}

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
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

  // Single URL form (hero input)
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  if (urlForm && urlInput) {
    urlForm.addEventListener('submit', e => {
      e.preventDefault();
      handleSharedUrl(urlInput.value);
    });
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); handleSharedUrl(urlInput.value); }
    });
  }

  // Web Share Target (Android shared this app a URL)
  const params = new URLSearchParams(window.location.search);
  const shared = params.get('url') || params.get('text');
  if (shared?.trim()) {
    handleSharedUrl(shared.trim());
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.error('SW registration failed:', err));
  }
});
