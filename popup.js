// MeetScribeAI - Popup Script (Synced Auth)

// === CONFIG ===
const DASHBOARD_URL = "http://localhost:5173/dashboard"; 
const SETTINGS_URL = "http://localhost:5173/settings";
const LOGIN_URL = "http://localhost:5173/login"; 
const COOKIE_NAME = "meetscribe_token"; // Must match your React App's cookie name

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// === AUTHENTICATION LOGIC (COOKIE BASED) ===
function checkAuth() {
    // Check if the Dashboard has set the cookie
    chrome.cookies.get({ url: DASHBOARD_URL, name: COOKIE_NAME }, (cookie) => {
        const loginView = document.getElementById('loginView');
        const mainView = document.getElementById('mainView');
        const profileBtn = document.getElementById('profileBtn');

        if (cookie && cookie.value) {
            // LOGGED IN: Save token internally for API calls
            chrome.storage.local.set({ oauthToken: cookie.value });
            
            // Show Main View
            loginView.classList.add('hidden');
            mainView.classList.remove('hidden');
            profileBtn.style.display = 'flex'; // Show profile icon
            
            updateStatus(); // Start polling status
        } else {
            // NOT LOGGED IN: Clear internal token
            chrome.storage.local.remove(['oauthToken']);
            
            // Show Login View
            loginView.classList.remove('hidden');
            mainView.classList.add('hidden');
            profileBtn.style.display = 'none'; // Hide profile icon
        }
    });
}

// LOGIN BUTTON HANDLER (Opens Dashboard Login)
document.getElementById('loginBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: LOGIN_URL });
});


// === MAIN VIEW BUTTONS ===

// 1. DASHBOARD BUTTON
document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

// 2. PROFILE SETTINGS BUTTON
document.getElementById('profileBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: SETTINGS_URL });
});

// 3. VIEW LOCAL HISTORY
document.getElementById('viewBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('transcripts.html') });
});

// 4. STOP CAPTURE
document.getElementById('manualStopBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('meet.google.com')) {
    alert('Please open a Google Meet meeting first!');
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, { action: 'stopCapture' }, (response) => {
    if (response && response.transcript && response.transcript.length > 0) {
      alert(`✅ Transcript saved manually! ${response.transcript.length} captions captured.`);
    } else {
      alert('No captions to save yet.');
    }
    updateStatus();
  });
});

// === STATUS UPDATES ===
async function updateStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const statusText = document.getElementById('statusText');
  const captionCount = document.getElementById('captionCount');
  const statusBadge = document.getElementById('statusBadge');

  // If element doesn't exist (e.g., hidden), skip
  if (!statusText || statusText.offsetParent === null) return;

  if (tab && tab.url && tab.url.includes('meet.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
      if (response) {
        if (response.isCapturing) {
          // ACTIVE STATE
          statusText.textContent = 'Recording Active';
          statusText.style.color = '#111827';
          
          statusBadge.className = 'status-badge capturing';
          statusBadge.innerHTML = '<span class="status-dot"></span><span>Live</span>';
        } else {
          // IDLE STATE
          statusText.textContent = 'Ready to record';
          statusText.style.color = '#6b7280';
          
          statusBadge.className = 'status-badge';
          statusBadge.innerHTML = '<span class="status-dot"></span><span>Standby</span>';
        }
        
        captionCount.textContent = response.captionCount || 0;
      }
    });
  } else {
    // NOT IN MEETING
    statusText.textContent = 'Not in a meeting';
    statusText.style.color = '#6b7280';
    
    statusBadge.className = 'status-badge';
    statusBadge.innerHTML = '<span class="status-dot"></span><span>Idle</span>';
    captionCount.textContent = '0';
  }
}

// Polling for status and auth check
setInterval(() => {
    checkAuth();
}, 2000);