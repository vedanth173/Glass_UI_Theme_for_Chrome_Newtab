// =========================================
// 1. Live Frosted Glass Clock (Perfectly Centered Colon)
// =========================================
const clockHoursEl = document.getElementById('clock-hours');
const clockColonEl = document.getElementById('clock-colon');
const clockMinutesEl = document.getElementById('clock-minutes');
const dateEl = document.getElementById('hyper-date');

function updateClock() {
  const now = new Date();

  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const day = now.getDate();
  if (dateEl) dateEl.textContent = `${weekday}, ${month} ${day}`;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  hours = hours % 12;
  hours = hours ? hours : 12;
  const paddedHours = String(hours).padStart(2, '0');

  if (clockHoursEl) clockHoursEl.textContent = paddedHours;
  if (clockColonEl) clockColonEl.textContent = ':';
  if (clockMinutesEl) clockMinutesEl.textContent = minutes;
}

updateClock();
setInterval(updateClock, 1000);

// =========================================
// 2. Edit Button Popover & Media Storage (IndexedDB)
// =========================================
const editBgBtn = document.getElementById('edit-bg-btn');
const bgMenu = document.getElementById('bg-menu');
const photoUpload = document.getElementById('photo-upload');
const videoUpload = document.getElementById('video-upload');
const bgResetBtn = document.getElementById('bg-reset-btn');
const oledBlackBtn = document.getElementById('oled-black-btn');
const bgVideo = document.getElementById('bg-video');
const bgOverlay = document.getElementById('bg-overlay');

let currentObjectUrl = null;

if (editBgBtn && bgMenu) {
  editBgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bgMenu.classList.toggle('hidden');
    editBgBtn.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!bgMenu.contains(e.target) && e.target !== editBgBtn) {
      bgMenu.classList.add('hidden');
      editBgBtn.classList.remove('active');
    }
  });
}

function openMediaDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NewTabMediaDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('background')) {
        db.createObjectStore('background');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveMediaToDB(type, blob) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('background', 'readwrite');
    tx.objectStore('background').put({ type, blob }, 'currentBg');
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadMediaFromDB() {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('background', 'readonly');
    const req = tx.objectStore('background').get('currentBg');
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function clearMediaDB() {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('background', 'readwrite');
    tx.objectStore('background').delete('currentBg');
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

function applyMediaBackground(media) {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  if (!media || !media.blob) {
    document.body.style.backgroundImage = 'none';
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.removeAttribute('src');
      bgVideo.classList.add('hidden');
    }
    if (bgOverlay) bgOverlay.classList.add('hidden');
    if (bgResetBtn) bgResetBtn.classList.add('hidden');
    return;
  }

  currentObjectUrl = URL.createObjectURL(media.blob);

  if (media.type === 'photo') {
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.removeAttribute('src');
      bgVideo.classList.add('hidden');
    }
    if (bgOverlay) bgOverlay.classList.remove('hidden');
    document.body.style.backgroundImage = `url('${currentObjectUrl}')`;
    if (bgResetBtn) bgResetBtn.classList.remove('hidden');
  } else if (media.type === 'video') {
    document.body.style.backgroundImage = 'none';
    if (bgVideo) {
      bgVideo.src = currentObjectUrl;
      bgVideo.classList.remove('hidden');
      bgVideo.play().catch(() => {});
    }
    if (bgOverlay) bgOverlay.classList.remove('hidden');
    if (bgResetBtn) bgResetBtn.classList.remove('hidden');
  }
}

loadMediaFromDB().then((savedMedia) => {
  if (savedMedia) {
    applyMediaBackground(savedMedia);
  } else {
    const legacyBg = localStorage.getItem('customNewTabBg');
    if (legacyBg) {
      document.body.style.backgroundImage = `url('${legacyBg}')`;
      if (bgOverlay) bgOverlay.classList.remove('hidden');
      if (bgResetBtn) bgResetBtn.classList.remove('hidden');
    }
  }
});

if (photoUpload) {
  photoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await saveMediaToDB('photo', file);
    localStorage.removeItem('customNewTabBg');
    applyMediaBackground({ type: 'photo', blob: file });
    if (bgMenu) bgMenu.classList.add('hidden');
    if (editBgBtn) editBgBtn.classList.remove('active');
    photoUpload.value = '';
  });
}

if (videoUpload) {
  videoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await saveMediaToDB('video', file);
    localStorage.removeItem('customNewTabBg');
    applyMediaBackground({ type: 'video', blob: file });
    if (bgMenu) bgMenu.classList.add('hidden');
    if (editBgBtn) editBgBtn.classList.remove('active');
    videoUpload.value = '';
  });
}

async function resetBackgroundToOled() {
  await clearMediaDB();
  localStorage.removeItem('customNewTabBg');
  applyMediaBackground(null);
  if (bgMenu) bgMenu.classList.add('hidden');
  if (editBgBtn) editBgBtn.classList.remove('active');
}

if (bgResetBtn) bgResetBtn.addEventListener('click', resetBackgroundToOled);
if (oledBlackBtn) oledBlackBtn.addEventListener('click', resetBackgroundToOled);

// =========================================
// 3. Search Bar: Hover, Focus Dimming & Smart URL Navigation
// =========================================
const searchBox = document.querySelector('.glass-search-box');
const searchInput = document.querySelector('.glass-input');

if (searchBox && searchInput) {
  searchBox.addEventListener('mouseenter', () => {
    document.body.classList.add('search-focused');
  });

  searchBox.addEventListener('mouseleave', () => {
    if (document.activeElement !== searchInput && searchInput.value.trim() === '') {
      document.body.classList.remove('search-focused');
    }
  });

  searchInput.addEventListener('focus', () => {
    document.body.classList.add('search-focused');
  });

  searchInput.addEventListener('blur', () => {
    if (searchInput.value.trim() === '' && !searchBox.matches(':hover')) {
      document.body.classList.remove('search-focused');
    }
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      document.body.classList.add('search-focused');
    }
  });

  // Smart Search: Detects direct URL / domain and navigates directly
  searchBox.addEventListener('submit', (e) => {
    const query = searchInput.value.trim();
    if (!query) {
      e.preventDefault();
      return;
    }

    const isUrl = /^(https?:\/\/)/i.test(query) ||
                  (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(query) && !query.includes(' ')) ||
                  (/^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/i.test(query) && !query.includes(' '));

    if (isUrl) {
      e.preventDefault();
      const targetUrl = /^https?:\/\//i.test(query) ? query : `https://${query}`;
      window.location.href = targetUrl;
    }
  });
}

// =========================================
// 4. Dynamic Bottom-Left Greeting
// =========================================
const greetingTextEl = document.getElementById('greeting-text');
const greetingSubEl = document.getElementById('greeting-sub');

function updateGreeting() {
  const hour = new Date().getHours();
  let title = "Good Night";
  let subtitle = "Rest well, recharge.";

  if (hour >= 5 && hour < 12) {
    title = "Good Morning";
    subtitle = "Make today count.";
  } else if (hour >= 12 && hour < 17) {
    title = "Good Afternoon";
    subtitle = "Keep up the momentum.";
  } else if (hour >= 17 && hour < 21) {
    title = "Good Evening";
    subtitle = "Wind down and relax.";
  } else {
    title = "Good Night";
    subtitle = "Rest well, recharge.";
  }

  if (greetingTextEl) greetingTextEl.textContent = title;
  if (greetingSubEl) greetingSubEl.textContent = subtitle;
}

updateGreeting();
setInterval(updateGreeting, 60000);

// =========================================
// 5. Add Custom Shortcuts Logic with Fallbacks & Security
// =========================================
const addShortcutBtn = document.getElementById('add-shortcut-btn');
const modalOverlay = document.getElementById('custom-modal-overlay');
const customItemForm = document.getElementById('custom-item-form');
const nameInput = document.getElementById('item-name-input');
const urlInput = document.getElementById('item-url-input');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const shortcutsGrid = document.querySelector('.shortcuts-grid');

function formatShortcutUrl(url) {
  let cleaned = (url || '').trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

function getShortcutFavicon(url) {
  try {
    const domain = new URL(formatShortcutUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=google.com&sz=128';
  }
}

function createShortcutElement(item, index) {
  const a = document.createElement('a');
  a.href = item.url;
  a.className = 'glass-tile';
  a.title = item.name;
  a.setAttribute('data-custom-item', 'true');

  const tileIcon = document.createElement('div');
  tileIcon.className = 'tile-icon';

  const img = document.createElement('img');
  img.src = getShortcutFavicon(item.url);
  img.alt = item.name;
  img.loading = 'lazy';

  // Fallback to DuckDuckGo icon or first letter if Google Favicon fails
  img.onerror = () => {
    try {
      const hostname = new URL(formatShortcutUrl(item.url)).hostname;
      const fallbackUrl = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
      if (img.src !== fallbackUrl) {
        img.src = fallbackUrl;
        return;
      }
    } catch {}
    img.remove();
    tileIcon.textContent = (item.name || '•').charAt(0).toUpperCase();
  };
  tileIcon.appendChild(img);

  const tileTitle = document.createElement('span');
  tileTitle.className = 'tile-title';
  tileTitle.textContent = item.name;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-custom-btn';
  deleteBtn.title = 'Remove';
  deleteBtn.type = 'button';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem('customShortcuts') || '[]');
    saved.splice(index, 1);
    localStorage.setItem('customShortcuts', JSON.stringify(saved));
    renderCustomShortcuts();
  });

  a.appendChild(tileIcon);
  a.appendChild(tileTitle);
  a.appendChild(deleteBtn);

  return a;
}

function renderCustomShortcuts() {
  document.querySelectorAll('[data-custom-item="true"]').forEach((el) => el.remove());

  const customShortcuts = JSON.parse(localStorage.getItem('customShortcuts') || '[]');
  customShortcuts.forEach((item, index) => {
    if (shortcutsGrid) {
      const el = createShortcutElement(item, index);
      shortcutsGrid.appendChild(el);
    }
  });
}

function openShortcutModal() {
  if (nameInput) nameInput.value = '';
  if (urlInput) urlInput.value = '';
  if (modalOverlay) modalOverlay.classList.remove('hidden');
  if (bgMenu) bgMenu.classList.add('hidden');
  if (editBgBtn) editBgBtn.classList.remove('active');
  setTimeout(() => { if (nameInput) nameInput.focus(); }, 60);
}

function closeShortcutModal() {
  if (modalOverlay) modalOverlay.classList.add('hidden');
}

if (addShortcutBtn) {
  addShortcutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openShortcutModal();
  });
}

if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', closeShortcutModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeShortcutModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) {
    closeShortcutModal();
  }
});

if (customItemForm) {
  customItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const url = formatShortcutUrl(urlInput.value);

    if (!name || !url) return;

    const existing = JSON.parse(localStorage.getItem('customShortcuts') || '[]');
    existing.push({ name, url });
    localStorage.setItem('customShortcuts', JSON.stringify(existing));

    renderCustomShortcuts();
    closeShortcutModal();
  });
}

renderCustomShortcuts();

// =========================================
// 6. Global Accessibility: Type-to-Search & Battery Saver
// =========================================
document.addEventListener('keydown', (e) => {
  if (
    !e.ctrlKey && !e.metaKey && !e.altKey &&
    e.key.length === 1 &&
    document.activeElement !== searchInput &&
    (!modalOverlay || modalOverlay.classList.contains('hidden'))
  ) {
    if (searchInput) searchInput.focus();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (bgVideo && !bgVideo.paused) {
      bgVideo.pause();
    }
  } else {
    if (bgVideo && bgVideo.src && !bgVideo.classList.contains('hidden')) {
      bgVideo.play().catch(() => {});
    }
  }
});