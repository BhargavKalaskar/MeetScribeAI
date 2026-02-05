// Meet Transcriber - Content Script (PRODUCTION - Smart Title Update)
console.log('Meet Transcriber: PRODUCTION MODE');

let meetingTitle = '';
let isCapturing = false;
let captureInterval = null;
let rawCaptionStream = []; // Store ALL caption states
let lastCaptionText = '';

// === HELPER FUNCTIONS ===

// ✅ NEW: SMART TITLE LOGIC
function getMeetingTitle() {
  try {
    // Priority 1: Google's internal data attribute (Best for real names)
    const titleEl = document.querySelector('[data-meeting-title]');
    if (titleEl && titleEl.dataset.meetingTitle) {
      return titleEl.dataset.meetingTitle;
    }

    // Priority 2: Browser Tab Title (Very reliable)
    // usually "Weekly Sync - Google Meet" or "abc-def-ghi - Google Meet"
    let cleanTitle = document.title.replace(' - Google Meet', '').trim();
    
    // If it's just a meeting code (e.g. "abc-defg-hij"), format it nicely
    if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(cleanTitle)) {
      return `Meeting (${cleanTitle})`; 
    }

    // Priority 3: Fallback
    if (cleanTitle) return cleanTitle;

  } catch (e) {
    console.warn("Title extraction failed, using default.");
  }
  
  return `Meeting ${new Date().toLocaleDateString()}`;
}

function findCaptionContainer() {
  const selectors = [
    '[aria-label="Captions"]',
    '[role="region"][aria-label*="Caption"]',
    '.vgIcle.VbkSUe',
    '.vNKgIf.UDInHf'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  return null;
}

function areCaptionsEnabled() {
  return findCaptionContainer() !== null;
}

function extractCaptionText(element) {
  if (!element) return '';
  return (element.innerText || element.textContent).trim();
}

// === CAPTURE LOGIC ===

function captureCurrentState(captionContainer) {
  const text = extractCaptionText(captionContainer);
  
  if (!text || text === lastCaptionText) {
    return; // No change
  }
  
  // Store this caption state with timestamp
  rawCaptionStream.push({
    text: text,
    timestamp: new Date().toISOString()
  });
  
  console.log('Captured state', rawCaptionStream.length + ':', text.substring(0, 50) + '...');
  
  lastCaptionText = text;
}

// === POST-PROCESSING (Smart Deduplication) ===

function postProcessTranscript(rawStream) {
  if (!rawStream || rawStream.length === 0) {
    return '';
  }
  
  console.log('Post-processing', rawStream.length, 'raw captures...');
  
  // Common UI text patterns to filter out
  const uiTextPatterns = [
    /arrow_downward/gi,
    /Jump to bottom/gi,
    /arrow_upward/gi,
    /Jump to top/gi,
    /\[.*?\]/g, // Remove anything in brackets
  ];
  
  // Take the LONGEST capture (usually the most complete)
  let longestCapture = '';
  for (const capture of rawStream) {
    if (capture.text.length > longestCapture.length) {
      longestCapture = capture.text;
    }
  }
  
  // Also concatenate captures where caption was CLEARED (speaker change)
  let segments = [];
  let currentSegment = '';
  
  for (let i = 0; i < rawStream.length; i++) {
    const current = rawStream[i].text;
    const prev = i > 0 ? rawStream[i - 1].text : '';
    
    // If current is much shorter than previous, caption was cleared (new segment)
    if (prev && current.length < prev.length * 0.5) {
      // Save previous segment if substantial
      if (currentSegment.length > 10) {
        segments.push(currentSegment);
      }
      currentSegment = current;
    } else {
      // Keep the longer version
      if (current.length > currentSegment.length) {
        currentSegment = current;
      }
    }
  }
  
  // Add final segment
  if (currentSegment.length > 10) {
    segments.push(currentSegment);
  }
  
  // Combine segments
  let finalText = segments.join(' ');
  
  // Filter out UI text patterns
  for (const pattern of uiTextPatterns) {
    finalText = finalText.replace(pattern, '');
  }
  
  // Clean up
  finalText = finalText
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/\.+/g, '.') // Multiple periods to single
    .replace(/\s+([.,!?])/g, '$1') // Remove space before punctuation
    .trim();
  
  console.log('Post-processed result:', finalText.length, 'chars');
  return finalText;
}

// === START/STOP ===

function startCapturing() {
  if (isCapturing) return;
  
  console.log('▶️ START CAPTURE');
  isCapturing = true;
  meetingTitle = getMeetingTitle(); // Initial grab
  rawCaptionStream = [];
  lastCaptionText = '';

  const captionContainer = findCaptionContainer();
  if (!captionContainer) {
    console.log('No captions found');
    isCapturing = false;
    return;
  }

  // Capture every 500ms
  captureInterval = setInterval(() => {
    captureCurrentState(captionContainer);
  }, 500);

  showNotification('🎙️ Recording started!');
}

async function stopCapturing(reason = 'unknown') {
  if (!isCapturing) return;
  
  console.log('⏹️ STOP -', reason);

  // ✅ NEW: Refresh title (Titles often load AFTER meeting starts)
  meetingTitle = getMeetingTitle();
  console.log(`📝 Final Title for Save: "${meetingTitle}"`);
  
  // Final capture
  const captionContainer = findCaptionContainer();
  if (captionContainer) {
    captureCurrentState(captionContainer);
  }
  
  isCapturing = false;
  
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

  // POST-PROCESS the raw stream
  const finalTranscript = postProcessTranscript(rawCaptionStream);
  
  if (finalTranscript && finalTranscript.length > 5) {
    console.log('💾 SAVING:', finalTranscript.length, 'chars');
    
    // ==================== NEW: SAVE TO FIREBASE ====================
    try {
      showNotification('💾 Saving to cloud...', 3000);
      
      // Check if Firebase is initialized
      if (!window.firebaseClient) {
        console.error('❌ Firebase not initialized');
        saveToChromeStorage(finalTranscript, reason);
        return;
      }
      
      // Get Google OAuth token
      console.log('🔐 Getting Google OAuth token...');
      
      const googleToken = await getGoogleAccessToken();
      
      if (!googleToken) {
        console.error('❌ No Google token available');
        saveToChromeStorage(finalTranscript, reason);
        return;
      }
      
      // Set token in Firebase client
      window.firebaseClient.setGoogleToken(googleToken);
      
      // Save transcript
      console.log('☁️ Saving to Firestore...');
      const result = await window.firebaseClient.saveTranscript(
        meetingTitle, // ✅ Using the refreshed Smart Title
        finalTranscript,
        new Date().toISOString()
      );
      
      if (result && result.success) {
        console.log('✅ Saved to cloud!', result.transcriptId);
        showNotification('✅ Saved to cloud: ' + finalTranscript.length + ' characters', 3000);
        
        // Auto-trigger AI processing after 10 seconds
        console.log('⏰ AI processing will start in 10 seconds...');
        showNotification('⏰ AI processing starting in 10 seconds...', 3000);
        
        setTimeout(() => {
          autoProcessWithAI(finalTranscript, meetingTitle);
        }, 10000);
      } else {
        throw new Error('Save failed');
      }
      
    } catch (error) {
      console.error('❌ Error saving to Firebase:', error);
      showNotification('❌ Failed to save: ' + error.message, 5000);
      
      // Fallback: Save to Chrome storage as backup
      saveToChromeStorage(finalTranscript, reason);
    }
    
  } else {
    console.log('⚠️ Nothing substantial to save');
    showNotification('⚠️ No content captured', 3000);
  }
}

// === MONITORING ===

let captionWasEnabled = false;

function monitorCaptions() {
  const enabled = areCaptionsEnabled();
  
  if (enabled && !captionWasEnabled) {
    console.log('🟢 Captions ON');
    captionWasEnabled = true;
    startCapturing();
  }
  
  if (!enabled && captionWasEnabled && isCapturing) {
    console.log('🔴 Captions OFF');
    captionWasEnabled = false;
    stopCapturing('captions_disabled');
  }
}

setInterval(monitorCaptions, 2000);
setTimeout(monitorCaptions, 3000);

// Page close
window.addEventListener('beforeunload', () => {
  if (isCapturing) stopCapturing('page_close');
});

// Leave button
document.addEventListener('click', (e) => {
  const isLeave = e.target.closest('[aria-label*="eave"]') || 
                  e.target.closest('[aria-label*="nd"]');
  if (isLeave && isCapturing) {
    setTimeout(() => {
      if (isCapturing) stopCapturing('leave_clicked');
    }, 500);
  }
});

// Notification
function showNotification(msg, duration = 3000) {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: #4CAF50; color: white; 
    padding: 15px 20px; border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
    z-index: 10000; font-family: Arial; font-size: 14px;
    max-width: 300px;
  `;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), duration);
}

// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'startCapture') {
    startCapturing();
    sendResponse({ status: 'started' });
  } else if (req.action === 'stopCapture') {
    stopCapturing('manual');
    sendResponse({ status: 'stopped' });
  } else if (req.action === 'getStatus') {
    sendResponse({ 
      isCapturing: isCapturing,
      captionCount: rawCaptionStream.length,
      textLength: lastCaptionText.length
    });
  }
  return true;
});

// ==================== AUTO AI PROCESSING ====================

async function autoProcessWithAI(transcript, title) {
  console.log('🤖 AUTO-PROCESSING: Starting AI pipeline...');
  showNotification('🤖 Processing with AI...', 5000);
  
  try {
    // Check if we have the API helpers loaded
    if (typeof processTranscriptComplete === 'undefined') {
      console.error('❌ API helpers not loaded');
      showNotification('❌ AI processing failed - extension error', 5000);
      return;
    }
    
    // Call the master processing function
    const result = await processTranscriptComplete(transcript, title);
    
    if (result.success) {
      console.log('🎉 AUTO-PROCESSING COMPLETE!');
      showNotification('✅ AI Summary sent to your email!', 5000);
      
      // Store the result in Chrome storage so user can view it later
      chrome.storage.local.get(['savedTranscripts'], (storageResult) => {
        const transcripts = storageResult.savedTranscripts || [];
        
        // Find the most recent transcript (the one we just saved)
        if (transcripts.length > 0) {
          const lastTranscript = transcripts[transcripts.length - 1];
          
          // Add AI summary to it
          lastTranscript.aiSummary = result.summary;
          lastTranscript.driveLink = result.driveLink;
          lastTranscript.processed = true;
          lastTranscript.processedAt = new Date().toISOString();
          
          // Save back
          chrome.storage.local.set({ savedTranscripts: transcripts }, () => {
            console.log('✅ AI summary saved to storage');
          });
        }
      });
      
    } else {
      console.error('❌ AUTO-PROCESSING FAILED:', result.error);
      showNotification('⚠️ AI processing failed - check extension', 5000);
    }
    
  } catch (error) {
    console.error('💥 AUTO-PROCESSING ERROR:', error);
    showNotification('❌ AI processing error: ' + error.message, 5000);
  }
}


// ==================== AUTO-ENABLE CAPTIONS ====================

function findCaptionsButton() {
  const selectors = [
    '[aria-label="Turn on captions"]',
    '[aria-label="Turn on captions (c)"]',
    'button[aria-label*="Turn on caption" i]',
  ];
  
  for (const selector of selectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      const label = button.getAttribute('aria-label') || '';
      if (label.toLowerCase().includes('turn on')) {
        return button;
      }
    }
  }
  
  return null;
}

function autoEnableCaptions() {
  console.log('🔍 Looking for captions button...');
  
  const captionsButton = findCaptionsButton();
  
  if (captionsButton) {
    console.log('✅ Found captions button, clicking...');
    captionsButton.click();
    showNotification('✅ Captions enabled automatically!', 3000);
    return true;
  } else {
    console.log('⚠️ Captions button not found');
    return false;
  }
}

function showCaptionReminder() {
  if (areCaptionsEnabled()) return;
  if (document.getElementById('caption-reminder')) return; // Already showing
  
  const reminder = document.createElement('div');
  reminder.id = 'caption-reminder';
  reminder.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
    max-width: 320px;
  `;
  
  reminder.innerHTML = `
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 10px;">
      🎙️ Meet Transcriber Ready!
    </div>
    <div style="font-size: 14px; margin-bottom: 15px; opacity: 0.95;">
      Enable captions by pressing <strong>C</strong> or clicking the CC button to start automatic transcription
    </div>
    <button id="dismiss-reminder" style="
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      font-weight: 500;
    ">
      Got it! ✓
    </button>
  `;
  
  document.body.appendChild(reminder);
  
  // Auto-hide when captions are enabled
  const checkInterval = setInterval(() => {
    if (areCaptionsEnabled()) {
      reminder.remove();
      clearInterval(checkInterval);
    }
  }, 1000);
  
  // Dismiss button
  document.getElementById('dismiss-reminder')?.addEventListener('click', () => {
    reminder.remove();
    clearInterval(checkInterval);
  });
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (reminder.parentNode) {
      reminder.remove();
      clearInterval(checkInterval);
    }
  }, 30000);
}

function smartCaptionEnable() {
  console.log('🎯 Smart caption enabler starting...');
  
  // Wait for Meet UI to load
  setTimeout(() => {
    if (!areCaptionsEnabled()) {
      console.log('🔍 Attempting auto-enable...');
      
      const success = autoEnableCaptions();
      
      if (!success) {
        // Show reminder after auto-click fails
        setTimeout(() => {
          if (!areCaptionsEnabled()) {
            console.log('📢 Showing caption reminder...');
            showCaptionReminder();
          }
        }, 3000);
      }
    } else {
      console.log('✅ Captions already enabled');
    }
  }, 5000);
}

// Initialize auto-caption on page load
smartCaptionEnable();

// ==================== HELPER FUNCTIONS FOR FIREBASE SAVE ====================

async function getGoogleAccessToken() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getOAuthToken' }, (response) => {
      if (response && response.success) {
        console.log('✅ Got OAuth token');
        resolve(response.token);
      } else {
        console.error('❌ Failed to get OAuth token:', response?.error);
        resolve(null);
      }
    });
  });
}

// Fallback function to save to Chrome storage
function saveToChromeStorage(finalTranscript, reason) {
  console.log('📦 Falling back to Chrome storage...');
  
  chrome.runtime.sendMessage({
    action: 'saveTranscript',
    transcript: [{ text: finalTranscript, timestamp: new Date().toISOString() }],
    fullTranscript: finalTranscript,
    meetingTitle: meetingTitle,
    stopReason: reason
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Save error:', chrome.runtime.lastError);
      showNotification('❌ Failed to save', 3000);
    } else {
      console.log('✅ Saved to Chrome storage!');
      showNotification('✅ Saved locally: ' + finalTranscript.length + ' characters', 3000);
    }
  });
}

console.log('✅ Initialized - Production Mode');