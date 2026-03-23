// Theme management
function initTheme() {
  const storedTheme = localStorage.getItem('rizit_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (storedTheme) {
    document.documentElement.setAttribute('data-theme', storedTheme);
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  updateThemeIcon();
}

function updateThemeIcon() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const currentTheme = document.documentElement.getAttribute('data-theme');
  const icon = themeToggle.querySelector('.theme-icon');

  if (currentTheme === 'dark') {
    icon.textContent = '☀';
  } else {
    icon.textContent = '☾';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('rizit_theme', newTheme);
  updateThemeIcon();
}

// Archive backend management
function initBackend() {
  const backendSelect = document.getElementById('backendSelect');
  if (!backendSelect) return;

  const storedBackend = localStorage.getItem('rizit_backend');
  if (storedBackend) {
    backendSelect.value = storedBackend;
  }

  backendSelect.addEventListener('change', (e) => {
    localStorage.setItem('rizit_backend', e.target.value);
  });
}

// Get archive backend URL
function getArchiveUrl(url) {
  const backend = localStorage.getItem('rizit_backend') || 'archive.is';
  const encodedUrl = encodeURIComponent(url);

  if (backend === 'web.archive.org') {
    return `https://web.archive.org/web/99999999999999/${encodedUrl}`;
  }
  return `https://archive.is/newest/${encodedUrl}`;
}

// Get current backend display name
function getBackendDisplay() {
  const backend = localStorage.getItem('rizit_backend') || 'archive.is';
  return backend === 'web.archive.org' ? 'Wayback Machine' : 'archive.is';
}

// History management
function saveToHistory(url, archiveUrl) {
  const historyKey = 'rizit_history';
  let history = [];

  try {
    const stored = localStorage.getItem(historyKey);
    if (stored) {
      history = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to parse history:', e);
  }

  // Remove duplicate if exists
  history = history.filter(h => h.url !== url);

  // Add new entry at the beginning
  history.unshift({
    url: url,
    archiveUrl: archiveUrl,
    backend: localStorage.getItem('rizit_backend') || 'archive.is',
    timestamp: new Date().toISOString()
  });

  // Keep only last 10 entries
  history = history.slice(0, 10);

  try {
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save history:', e);
  }

  renderHistory();
}

function getHistory() {
  const historyKey = 'rizit_history';
  try {
    const stored = localStorage.getItem(historyKey);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('Failed to get history:', e);
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem('rizit_history');
  renderHistory();
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  const historySection = document.getElementById('history-section');
  if (!historyList || !historySection) return;

  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No recent URLs</div>';
    return;
  }

  historySection.classList.remove('hidden');

  historyList.innerHTML = history.map((item, index) => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const backendDisplay = item.backend === 'web.archive.org' ? 'Wayback' : 'archive.is';

    return `
      <div class="history-item">
        <span class="history-item-url" title="${item.url}">${item.url}</span>
        <span class="history-item-time">${timeStr} (${backendDisplay})</span>
        <button class="history-item-reattempt" data-url="${item.url}">Re-archive</button>
      </div>
    `;
  }).join('');

  // Add click handlers for re-archive buttons
  historyList.querySelectorAll('.history-item-reattempt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.getAttribute('data-url');
      if (url && typeof window.handleSharedUrlFromHistory === 'function') {
        window.handleSharedUrlFromHistory(url);
      }
    });
  });
}

function toggleHistory() {
  const historySection = document.getElementById('history-section');
  const historyContent = document.getElementById('historyContent');
  const toggleIcon = historySection?.querySelector('.toggle-icon');

  if (historySection && historyContent) {
    const isHidden = historyContent.classList.contains('hidden');
    if (isHidden) {
      historyContent.classList.remove('hidden');
      historySection.classList.remove('collapsed');
      if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
    } else {
      historyContent.classList.add('hidden');
      historySection.classList.add('collapsed');
      if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
    }
  }
}

// Install banner management
let deferredPrompt = null;

function initInstallBanner() {
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('dismissInstall');

  // Check if previously dismissed
  if (localStorage.getItem('rizit_install_dismissed') === 'true') {
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
        deferredPrompt = null;
        installBanner.classList.add('hidden');
      }
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      installBanner.classList.add('hidden');
      localStorage.setItem('rizit_install_dismissed', 'true');
    });
  }
}

// Main app initialization
document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const errorDiv = document.getElementById('error');
  const toast = document.getElementById('toast');
  const iosInstructions = document.getElementById('ios-instructions');
  const urlInput = document.getElementById('urlInput');
  const desktopUrlInput = document.getElementById('desktopUrlInput');
  const submitUrl = document.getElementById('submitUrl');
  const desktopSubmitUrl = document.getElementById('desktopSubmitUrl');
  const desktopInstructions = document.getElementById('desktop-instructions');

  // Initialize features
  initTheme();
  initBackend();
  initInstallBanner();
  renderHistory();

  // Desktop detection
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  if (isDesktop) {
    desktopInstructions.classList.remove('hidden');
  }

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // History toggle
  const historyToggle = document.getElementById('historyToggle');
  if (historyToggle) {
    historyToggle.addEventListener('click', toggleHistory);
  }

  // Clear history
  const clearHistoryBtn = document.getElementById('clearHistory');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistory);
  }

  // Show toast notification
  function showToast() {
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 500);
    }, 2000);
  }

  // Show error message
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  // Clear error message
  function clearError() {
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
  }

  // Validate URL
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Check clipboard permission (where supported)
  async function checkClipboardPermission() {
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'clipboard-write' });
        console.log('Clipboard permission status:', permissionStatus.state);
        return permissionStatus.state === 'granted' || permissionStatus.state === 'prompt';
      } catch (err) {
        console.warn('Clipboard permission check failed:', err);
        return true;
      }
    }
    return true;
  }

  // Handle shared URL
  async function handleSharedUrl(url) {
    url = url.split("?")[0];
    try {
      clearError();

      console.log('Received URL:', url);

      if (!url.includes('.')) {
        throw new Error('Input does not appear to be a URL. Please share a valid webpage URL.');
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      if (!isValidUrl(url)) {
        throw new Error('Invalid URL format. Please ensure the URL is correct (e.g., https://example.com).');
      }

      const backendDisplay = getBackendDisplay();
      status.textContent = `Processing ${url}... (${backendDisplay})`;

      const archiveUrl = getArchiveUrl(url);
      console.log('Constructed archive URL:', archiveUrl);

      // Copy the archive URL to clipboard
      let clipboardSuccess = false;
      const canWriteToClipboard = await checkClipboardPermission();
      if (canWriteToClipboard) {
        try {
          await navigator.clipboard.writeText(archiveUrl);
          console.log('Clipboard write successful');
          clipboardSuccess = true;
        } catch (clipboardErr) {
          console.warn('Clipboard write failed:', clipboardErr);
          const textarea = document.createElement('textarea');
          textarea.value = archiveUrl;
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            console.log('Fallback clipboard write successful');
            clipboardSuccess = true;
          } catch (fallbackErr) {
            console.error('Fallback clipboard write failed:', fallbackErr);
          }
          document.body.removeChild(textarea);
        }
      } else {
        console.warn('Clipboard permission denied');
      }

      // Open the archive URL in a new tab
      const newTab = window.open(archiveUrl, '_blank');
      if (!newTab) {
        status.textContent = `Popup blocked. Allow popups to use ${backendDisplay}. Click here to open: `;
        const link = document.createElement('a');
        link.href = archiveUrl;
        link.textContent = archiveUrl;
        link.target = '_blank';
        status.appendChild(link);
      } else {
        status.textContent = `Opening ${backendDisplay}...`;
      }

      if (clipboardSuccess) {
        showToast();
      } else {
        showError('Failed to copy the link to clipboard. You can manually copy it from the URL above.');
      }

      // Save to history
      saveToHistory(url, archiveUrl);

    } catch (err) {
      console.error('Error in handleSharedUrl:', err);
      showError(err.message);
    }
  }

  // Expose handleSharedUrl for history re-archive button
  window.handleSharedUrlFromHistory = handleSharedUrl;

  // Handle URL submit (shared handler for iOS and desktop)
  function handleUrlSubmit(url) {
    if (url) {
      handleSharedUrl(url);
    } else {
      showError('Please enter a valid URL.');
    }
  }

  // Check if URL was shared via Web Share Target (works on Android)
  const urlParams = new URLSearchParams(window.location.search);
  const sharedUrl = urlParams.get('url') || urlParams.get('text');
  console.log('URL params:', urlParams.toString());
  console.log('Shared URL:', sharedUrl);

  if (sharedUrl) {
    const cleanedUrl = sharedUrl.trim();
    if (cleanedUrl) {
      handleSharedUrl(cleanedUrl);
    } else {
      showError('No valid URL shared. Please try sharing a webpage again.');
    }
  } else if (isIOS) {
    iosInstructions.classList.remove('hidden');
  } else {
    status.textContent = 'Please share a webpage with rizit using the share menu.';
  }

  // Handle manual URL submission for desktop
  desktopSubmitUrl.addEventListener('click', () => {
    handleUrlSubmit(desktopUrlInput.value.trim());
  });

  // Handle keyboard submission for desktop
  desktopUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUrlSubmit(desktopUrlInput.value.trim());
    }
  });

  // Handle manual URL submission for iOS
  submitUrl.addEventListener('click', () => {
    handleUrlSubmit(urlInput.value.trim());
  });

  // Handle keyboard submission for iOS
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUrlSubmit(urlInput.value.trim());
    }
  });
});
