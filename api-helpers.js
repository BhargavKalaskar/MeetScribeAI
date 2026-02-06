// API Helper Functions - Server Pipeline with Link Retrieval
console.log('🔧 API Helpers loading...');

if (typeof CONFIG === 'undefined') {
  console.error('❌ CRITICAL: config.js not loaded!');
} else {
  // Ensure this matches your deployed Cloud Function URL
  CONFIG.BACKEND_URL = 'https://asia-south1-meet-transcriber-f8a91.cloudfunctions.net/processMeeting';
}

// ==================== MASTER PIPELINE ====================

async function processTranscriptComplete(transcript, meetingTitle) {
  console.log('🎯 Starting Pipeline...');
  
  try {
    // Step 1: Get Auth Token
    console.log('🔑 Getting Auth Token...');
    const token = await getAccessToken();

    // Step 2: Call Backend
    console.log('🚀 Sending to Backend...');
    
    // 'keepalive: true' ensures the request isn't cancelled if the tab closes.
    const backendResponse = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: meetingTitle,
        transcript: transcript,
        meetingDate: new Date().toISOString()
      }),
      keepalive: true 
    });

    if (!backendResponse.ok) {
        throw new Error(`Server Error: ${backendResponse.status}`);
    }
    
    // We wait for the JSON so we can get the Drive Link
    const responseJson = await backendResponse.json();
    console.log('✅ Backend Success:', responseJson);

    return {
      success: true,
      // The backend returns { driveLink: "..." } or { data: { driveLink: "..." } }
      driveLink: responseJson.driveLink || (responseJson.data ? responseJson.data.driveLink : null)
    };

  } catch (error) {
    console.error('💥 Pipeline Error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== AUTH HELPER ====================

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getOAuthToken' }, (response) => {
      if (response && response.success) resolve(response.token);
      else reject(new Error(response?.error || 'Auth Failed'));
    });
  });
}