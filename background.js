// Meet Transcriber - Background Script (OAuth Handler + Storage)
console.log('Meet Transcriber: Background script loaded');

// On Install: Open the Welcome Page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

// Handle transcript saving and OAuth
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTranscript') {
    console.log('Meet Transcriber: 💾 Saving transcript');
    console.log('Meet Transcriber: Stop reason:', request.stopReason);
    console.log('Meet Transcriber: Segments:', request.transcript?.length);
    
    const transcriptText = request.fullTranscript || 
                          request.transcript.map(item => item.text).join(' ');
    
    chrome.storage.local.get(['savedTranscripts'], (result) => {
      const saved = result.savedTranscripts || [];
      
      // Create new transcript entry
      saved.push({
        title: request.meetingTitle,
        transcript: transcriptText,
        date: new Date().toISOString(),
        fullData: request.transcript,
        stopReason: request.stopReason
      });
      
      chrome.storage.local.set({ savedTranscripts: saved }, () => {
        console.log('Meet Transcriber: ✅ Saved! Total transcripts:', saved.length);
        sendResponse({ status: 'saved' });
      });
    });
    
    return true;
  }
  
  // Handle OAuth token request with persistent caching and account hint
  if (request.action === 'getOAuthToken') {
    console.log('🔑 Getting OAuth token...');
    
    // Check for cached token in storage
    chrome.storage.local.get(['oauthToken', 'tokenExpiry', 'userEmail'], (result) => {
      const cachedToken = result.oauthToken;
      const tokenExpiry = result.tokenExpiry;
      const userEmail = result.userEmail;
      
      // Check if we have a valid cached token
      if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        const minutesLeft = Math.round((tokenExpiry - Date.now()) / 60000);
        console.log('✅ Using cached token from storage (valid for', minutesLeft, 'more minutes)');
        sendResponse({ 
          success: true, 
          token: cachedToken 
        });
        return;
      }
      
      console.log('🔄 No valid cached token, fetching new one...');
      
      // Check if we need to ask for email first
      if (!userEmail) {
        console.log('📧 No user email stored, requesting email first...');
        sendResponse({
          success: false,
          needEmail: true,
          error: 'Please provide your Google account email'
        });
        return;
      }
      
      const clientId = '957821720636-a0jdmo0djkgb05ukfn9jiuir3rhkd656.apps.googleusercontent.com';
      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];
      
      // Build auth URL with login_hint to pre-select account
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `login_hint=${encodeURIComponent(userEmail)}`;
      
      console.log('🔍 Redirect URI:', redirectUri);
      console.log('📧 Using login hint:', userEmail);
      
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            console.error('❌ OAuth error:', chrome.runtime.lastError);
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
            return;
          }
          
          if (!responseUrl) {
            sendResponse({ 
              success: false, 
              error: 'No response URL received' 
            });
            return;
          }
          
          console.log('✅ Got response URL');
          
          try {
            const url = new URL(responseUrl);
            const params = new URLSearchParams(url.hash.substring(1));
            const accessToken = params.get('access_token');
            const expiresIn = parseInt(params.get('expires_in')) || 3600;
            
            if (accessToken) {
              const expiryTime = Date.now() + (expiresIn * 1000);
              
              // Store token in Chrome storage (persists)
              chrome.storage.local.set({
                oauthToken: accessToken,
                tokenExpiry: expiryTime
              }, () => {
                console.log('✅ Token cached in storage, expires in', expiresIn, 'seconds');
                console.log('✅ Got access token:', accessToken.substring(0, 20) + '...');
                
                sendResponse({ 
                  success: true, 
                  token: accessToken 
                });
              });
            } else {
              sendResponse({ 
                success: false, 
                error: 'No access token in response' 
              });
            }
          } catch (error) {
            console.error('❌ Error parsing token:', error);
            sendResponse({ 
              success: false, 
              error: error.message 
            });
          }
        }
      );
    });
    
    return true;
  }
  
  // Handle saving user email
  if (request.action === 'saveUserEmail') {
    console.log('📧 Saving user email:', request.email);
    chrome.storage.local.set({ userEmail: request.email }, () => {
      console.log('✅ User email saved');
      sendResponse({ success: true });
    });
    return true;
  }
});