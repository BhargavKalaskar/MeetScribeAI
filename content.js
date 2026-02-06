// Meet Transcriber - Content Script (Hybrid: Local Save + Cloud Sync)
console.log('Meet Transcriber: PRODUCTION MODE (Hybrid)');

let meetingTitle = '';
let isCapturing = false;
let captureInterval = null;
let rawCaptionStream = [];
let lastCaptionText = '';

// === HELPER FUNCTIONS ===
function getMeetingTitle() {
  const titleElement = document.querySelector('[data-meeting-title]') || 
                       document.querySelector('div[jsname="r4nke"]');
  return titleElement ? titleElement.textContent.trim() : `Meeting ${new Date().toLocaleString()}`;
}

function findCaptionContainer() {
  const selectors = ['[aria-label="Captions"]', '[role="region"][aria-label*="Caption"]', '.vgIcle.VbkSUe'];
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
  return element ? (element.innerText || element.textContent).trim() : '';
}

// === STORAGE HELPERS (The Safety Net) ===
async function saveLocalTranscript(transcript, title, status = 'pending', driveLink = null) {
  const meetingId = new Date().toISOString(); // Unique ID
  const entry = {
    id: meetingId,
    title: title,
    date: meetingId,
    transcript: transcript,
    status: status, // 'pending', 'success', 'error'
    driveLink: driveLink
  };

  return new Promise((resolve) => {
    chrome.storage.local.get(['savedTranscripts'], (result) => {
      const history = result.savedTranscripts || [];
      // Add new meeting to the top
      history.unshift(entry); 
      // Keep only last 50 meetings to save space
      if (history.length > 50) history.pop(); 
      
      chrome.storage.local.set({ savedTranscripts: history }, () => {
        console.log('💾 Saved to Local Storage:', status);
        resolve(meetingId);
      });
    });
  });
}

async function updateLocalStatus(id, status, driveLink = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['savedTranscripts'], (result) => {
      let history = result.savedTranscripts || [];
      const index = history.findIndex(x => x.id === id);
      
      if (index !== -1) {
        history[index].status = status;
        if (driveLink) history[index].driveLink = driveLink;
        chrome.storage.local.set({ savedTranscripts: history }, resolve);
      } else {
        resolve();
      }
    });
  });
}

// === CAPTURE LOGIC ===
function captureCurrentState(captionContainer) {
  const text = extractCaptionText(captionContainer);
  if (!text || text === lastCaptionText) return;
  
  rawCaptionStream.push({
    text: text,
    timestamp: new Date().toISOString()
  });
  lastCaptionText = text;
}

// === POST-PROCESSING ===
function postProcessTranscript(rawStream) {
  if (!rawStream || rawStream.length === 0) return '';
  
  // Smart Deduplication Logic
  let segments = [];
  let currentSegment = '';
  
  for (let i = 0; i < rawStream.length; i++) {
    const current = rawStream[i].text;
    const prev = i > 0 ? rawStream[i - 1].text : '';
    
    // If current is much shorter, it's a new segment (speaker cleared buffer)
    if (prev && current.length < prev.length * 0.5) {
      if (currentSegment.length > 10) segments.push(currentSegment);
      currentSegment = current;
    } else {
      if (current.length > currentSegment.length) currentSegment = current;
    }
  }
  if (currentSegment.length > 10) segments.push(currentSegment);
  
  let finalText = segments.join(' ');
  
  // Cleanup UI noise
  const uiTextPatterns = [/arrow_downward/gi, /Jump to bottom/gi, /arrow_upward/gi, /\[.*?\]/g];
  uiTextPatterns.forEach(p => finalText = finalText.replace(p, ''));
  
  return finalText.replace(/\s+/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

// === START/STOP ===
function startCapturing() {
  if (isCapturing) return;
  isCapturing = true;
  meetingTitle = getMeetingTitle();
  rawCaptionStream = [];
  lastCaptionText = '';
  
  const captionContainer = findCaptionContainer();
  if (!captionContainer) {
    isCapturing = false;
    return;
  }
  
  captureInterval = setInterval(() => captureCurrentState(captionContainer), 500);
  showNotification('🎙️ Recording started!');
}

async function stopCapturing(reason = 'unknown') {
  if (!isCapturing) return;
  
  console.log('⏹️ STOP -', reason);

  // Final capture check
  const captionContainer = findCaptionContainer();
  if (captionContainer) captureCurrentState(captionContainer);
  
  isCapturing = false;
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }

  const finalTranscript = postProcessTranscript(rawCaptionStream);
  
  if (finalTranscript && finalTranscript.length > 50) {
    // === HYBRID SAVE ===
    showNotification('💾 Saving locally...', 2000);

    // 1. SAVE LOCALLY FIRST (Safety Net)
    const localId = await saveLocalTranscript(finalTranscript, meetingTitle, 'pending');
    
    // 2. SEND TO AI CLOUD
    showNotification('🚀 Processing AI...', 4000);
    
    // Pass the localId so we can update it later
    autoProcessWithAI(finalTranscript, meetingTitle, localId);
    
  } else {
    console.log('⚠️ Transcript too short');
  }
}

// === AI PROCESSING ===
async function autoProcessWithAI(transcript, title, localId) {
  try {
    if (typeof processTranscriptComplete === 'undefined') {
      throw new Error('API Helper not loaded');
    }
    
    // Call the Backend
    const result = await processTranscriptComplete(transcript, title);
    
    if (result.success) {
      // 3A. SUCCESS: Update Storage with Drive Link
      await updateLocalStatus(localId, 'success', result.driveLink);
      showNotification('✅ Saved & Emailed!', 5000);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Pipeline Failed:', error);
    // 3B. FAIL: Update Storage so user knows
    await updateLocalStatus(localId, 'error');
    // Note: We don't show an error notification if the page is closing, 
    // but the local storage will reflect the error.
  }
}

// === UTILS ===
function showNotification(msg, duration = 3000) {
  const div = document.createElement('div');
  div.style.cssText = `position: fixed; top: 20px; right: 20px; background: #333; color: white; padding: 15px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-family: sans-serif;`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), duration);
}

// === EVENT LISTENERS ===
let captionWasEnabled = false;
setInterval(() => {
  const enabled = areCaptionsEnabled();
  if (enabled && !captionWasEnabled) {
    captionWasEnabled = true;
    startCapturing();
  } else if (!enabled && captionWasEnabled && isCapturing) {
    captionWasEnabled = false;
    stopCapturing('captions_disabled');
  }
}, 2000);

window.addEventListener('beforeunload', () => { if(isCapturing) stopCapturing('page_close'); });

// Initial Auto-Enable Check
setTimeout(() => {
  const btn = document.querySelector('[aria-label*="Turn on caption"]');
  if (btn) btn.click();
}, 4000);