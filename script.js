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
  dateEl.textContent = `${weekday}, ${month} ${day}`;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  hours = hours % 12;
  hours = hours ? hours : 12;
  const paddedHours = String(hours).padStart(2, '0');

  clockHoursEl.textContent = paddedHours;
  clockColonEl.textContent = ':';
  clockMinutesEl.textContent = minutes;
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
const bgVideo = document.getElementById('bg-video');
const bgOverlay = document.getElementById('bg-overlay');

let currentObjectUrl = null;

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
    bgVideo.pause();
    bgVideo.removeAttribute('src');
    bgVideo.classList.add('hidden');
    bgOverlay.classList.add('hidden');
    bgResetBtn.classList.add('hidden');
    return;
  }

  currentObjectUrl = URL.createObjectURL(media.blob);

  if (media.type === 'photo') {
    bgVideo.pause();
    bgVideo.removeAttribute('src');
    bgVideo.classList.add('hidden');
    bgOverlay.classList.remove('hidden');

    document.body.style.backgroundImage = `url('${currentObjectUrl}')`;
    bgResetBtn.classList.remove('hidden');
  } else if (media.type === 'video') {
    document.body.style.backgroundImage = 'none';
    bgVideo.src = currentObjectUrl;
    bgVideo.classList.remove('hidden');
    bgOverlay.classList.remove('hidden');
    bgVideo.play().catch(() => {});
    bgResetBtn.classList.remove('hidden');
  }
}

loadMediaFromDB().then((savedMedia) => {
  if (savedMedia) {
    applyMediaBackground(savedMedia);
  } else {
    const legacyBg = localStorage.getItem('customNewTabBg');
    if (legacyBg) {
      document.body.style.backgroundImage = `url('${legacyBg}')`;
      bgOverlay.classList.remove('hidden');
      bgResetBtn.classList.remove('hidden');
    }
  }
});

photoUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await saveMediaToDB('photo', file);
  localStorage.removeItem('customNewTabBg');
  applyMediaBackground({ type: 'photo', blob: file });
  bgMenu.classList.add('hidden');
  editBgBtn.classList.remove('active');
  photoUpload.value = '';
});

videoUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await saveMediaToDB('video', file);
  localStorage.removeItem('customNewTabBg');
  applyMediaBackground({ type: 'video', blob: file });
  bgMenu.classList.add('hidden');
  editBgBtn.classList.remove('active');
  videoUpload.value = '';
});

bgResetBtn.addEventListener('click', async () => {
  await clearMediaDB();
  localStorage.removeItem('customNewTabBg');
  applyMediaBackground(null);
  bgMenu.classList.add('hidden');
  editBgBtn.classList.remove('active');
});

// =========================================
// 3. Search Bar Hover, Focus & Typing Background Dimming
// =========================================
const searchBox = document.querySelector('.glass-search-box');
const searchInput = document.querySelector('.glass-input');

if (searchBox && searchInput) {
  // Darken when cursor moves onto the search bar
  searchBox.addEventListener('mouseenter', () => {
    document.body.classList.add('search-focused');
  });

  // Restore background when cursor leaves (only if not actively clicked/typing)
  searchBox.addEventListener('mouseleave', () => {
    if (document.activeElement !== searchInput && searchInput.value.trim() === '') {
      document.body.classList.remove('search-focused');
    }
  });

  // Keep dark when clicked/focused
  searchInput.addEventListener('focus', () => {
    document.body.classList.add('search-focused');
  });

  // Restore when clicking away if input is empty
  searchInput.addEventListener('blur', () => {
    if (searchInput.value.trim() === '' && !searchBox.matches(':hover')) {
      document.body.classList.remove('search-focused');
    }
  });

  // Keep dark while typing
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      document.body.classList.add('search-focused');
    }
  });
}

// =========================================
// 4.Dynamic Bottom-Left Greeting
// =========================================
const greetingTextEl = document.getElementById('greeting-text');
const greetingSubEl = document.getElementById('greeting-sub');

function updateGreeting() {
  const hour = new Date().getHours();
  let title = "Good Night";
  let subtitle = "Cloudy night.";

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