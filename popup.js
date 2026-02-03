// Meet Transcriber - Popup Script (Auto Mode)

document.getElementById('viewBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('transcripts.html') });
});

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

// Change email button
document.getElementById('changeEmailBtn')?.addEventListener('click', () => {
  chrome.storage.local.get(['userEmail'], (result) => {
    const currentEmail = result.userEmail || 'Not set';
    
    const newEmail = prompt(
      '📧 Change Google Account\n\n' +
      'Current account: ' + currentEmail + '\n\n' +
      'Enter the new Google account email you want to use:\n' +
      '(This will replace your current account)'
    );
    
    if (newEmail && newEmail.includes('@')) {
      chrome.runtime.sendMessage(
        { action: 'saveUserEmail', email: newEmail },
        (response) => {
          if (response && response.success) {
            chrome.storage.local.remove(['oauthToken', 'tokenExpiry'], () => {
              alert('✅ Account changed to: ' + newEmail + '\n\nYou\'ll be asked to authenticate on your next transcription.');
            });
          } else {
            alert('❌ Failed to save email. Please try again.');
          }
        }
      );
    } else if (newEmail !== null) {
      alert('⚠️ Please enter a valid email address.');
    }
  });
});

// Update status with new badge system
async function updateStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes('meet.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
      if (response) {
        const statusText = document.getElementById('statusText');
        const captionCount = document.getElementById('captionCount');
        const statusBadge = document.getElementById('statusBadge');
        
        if (response.isCapturing) {
          statusText.textContent = 'Recording in progress';
          statusBadge.className = 'status-badge capturing';
          statusBadge.innerHTML = '<span class="status-dot"></span><span>Active</span>';
        } else {
          statusText.textContent = 'Waiting for captions...';
          statusBadge.className = 'status-badge';
          statusBadge.innerHTML = '<span class="status-dot"></span><span>Idle</span>';
        }
        
        captionCount.textContent = response.captionCount || 0;
      }
    });
  } else {
    document.getElementById('statusText').textContent = 'Not in a meeting';
    document.getElementById('statusBadge').className = 'status-badge';
    document.getElementById('statusBadge').innerHTML = '<span class="status-dot"></span><span>Idle</span>';
    document.getElementById('captionCount').textContent = '0';
  }
}

// Update status every 2 seconds
setInterval(updateStatus, 2000);
updateStatus();