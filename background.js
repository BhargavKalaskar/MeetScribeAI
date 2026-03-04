// Meet Transcriber - Background Script (Unified Auth)
console.log('Meet Transcriber: Background script loaded');

// 1. Install Event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

// ==================== INTERNAL MESSAGES (Extension <-> Content Script) ====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // A. Check Auth Status (Used by UI to show/hide login button)
  if (request.action === 'checkAuthStatus') {
    chrome.storage.local.get(['oauthToken', 'tokenExpiry', 'userEmail'], (result) => {
      const isValid = result.oauthToken && 
                      result.tokenExpiry && 
                      Date.now() < result.tokenExpiry;
      
      sendResponse({ 
        isAuthenticated: !!isValid, 
        hasEmail: !!result.userEmail 
      });
    });
    return true; 
  }

  // B. Save Transcript
  if (request.action === 'saveTranscript') {
    console.log('Meet Transcriber: 💾 Saving transcript');
    const transcriptText = request.fullTranscript || 
                          request.transcript.map(item => item.text).join(' ');
    
    chrome.storage.local.get(['savedTranscripts'], (result) => {
      const saved = result.savedTranscripts || [];
      saved.push({
        title: request.meetingTitle,
        transcript: transcriptText,
        date: new Date().toISOString(),
        fullData: request.transcript,
        stopReason: request.stopReason
      });
      chrome.storage.local.set({ savedTranscripts: saved });
      sendResponse({ status: 'saved' });
    });
    return true;
  }
  
  // C. Get OAuth Token (Internal Flow)
  if (request.action === 'getOAuthToken') {
    console.log('🔑 Getting OAuth token...');
    
    chrome.storage.local.get(['oauthToken', 'tokenExpiry', 'userEmail'], (result) => {
      // 1. Try Cached Token (This is where the Dashboard Sync helps!)
      if (result.oauthToken && result.tokenExpiry && Date.now() < result.tokenExpiry) {
        console.log('✅ Using cached token');
        sendResponse({ success: true, token: result.oauthToken });
        return;
      }
      
      // 2. If no cache, launch Interactive Login
      console.log('🔄 Fetching new token...');
      const clientId = '957821720636-a0jdmo0djkgb05ukfn9jiuir3rhkd656.apps.googleusercontent.com';
      const redirectUri = chrome.identity.getRedirectURL();
      
      // 🚨 FIX: Removed 'https://www.googleapis.com/auth/gmail.send' to bypass CASA audit 🚨
      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];
      
      let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}`;

      if (result.userEmail) {
        authUrl += `&login_hint=${encodeURIComponent(result.userEmail)}`;
      }
      
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            console.error('❌ OAuth error:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Auth failed' });
            return;
          }
          
          const url = new URL(responseUrl);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const expiresIn = parseInt(params.get('expires_in')) || 3600;
          
          if (accessToken) {
            const expiryTime = Date.now() + (expiresIn * 1000);
            chrome.storage.local.set({ oauthToken: accessToken, tokenExpiry: expiryTime });
            
            // Auto-fetch profile to fix the "Email Missing" bug
            fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
            .then(res => res.json())
            .then(profile => {
              if (profile.email) chrome.storage.local.set({ userEmail: profile.email });
            });

            sendResponse({ success: true, token: accessToken });
          }
        }
      );
    });
    return true; 
  }
});

// ==================== EXTERNAL MESSAGES (Dashboard <-> Extension) ====================
// This is the "Bridge" that allows the Dashboard to login the Extension automatically
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  
  // 1. Dashboard -> Extension: "Here is the login session!"
  if (request.action === 'syncSession') {
    console.log('🔄 Syncing session from Dashboard...');
    
    if (request.token && request.userEmail) {
      // Assume 1 hour expiry for safety
      const expiryTime = Date.now() + 3600 * 1000;
      
      chrome.storage.local.set({
        oauthToken: request.token,
        tokenExpiry: expiryTime,
        userEmail: request.userEmail
      }, () => {
        console.log('✅ Session synced!');
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Missing token' });
    }
    return true;
  }

  // 2. Extension -> Dashboard: "Am I logged in?"
  if (request.action === 'checkExtensionAuth') {
    chrome.storage.local.get(['oauthToken', 'tokenExpiry', 'userEmail'], (result) => {
      const isValid = result.oauthToken && 
                      result.tokenExpiry && 
                      Date.now() < result.tokenExpiry;
      
      sendResponse({ 
        isAuthenticated: !!isValid, 
        userEmail: result.userEmail,
        token: isValid ? result.oauthToken : null
      });
    });
    return true;
  }
});