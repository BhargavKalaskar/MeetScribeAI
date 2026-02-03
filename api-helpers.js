// API Helper Functions - Minimalist Production Mode
console.log('🔧 API Helpers loading (Minimalist Mode)...');

// 🛑 DELETE the "const CONFIG = ..." block here if it exists.
// We rely on config.js loading first.

if (typeof CONFIG === 'undefined') {
  console.error('❌ CRITICAL: config.js not loaded!');
} else {
  // Ensure the Backend URL is correct
  CONFIG.BACKEND_URL = 'https://asia-south1-meet-transcriber-f8a91.cloudfunctions.net/processMeeting';
}

// ==================== 1. MASTER PIPELINE ====================

async function processTranscriptComplete(transcript, meetingTitle) {
  console.log('🎯 Starting Pipeline...');
  
  try {
    // Step A: Get Auth Token (needed for everything)
    console.log('🔑 Step 1: Getting Auth Token...');
    const token = await getAccessToken();

    // Step B: Call Backend for AI Summary (SECURE)
    console.log('🤖 Step 2: Requesting AI Summary from Backend...');
    
    const backendResponse = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Secure Cloud Function call
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: meetingTitle,
        transcript: transcript,
        meetingDate: new Date().toISOString()
      })
    });

    if (!backendResponse.ok) {
        const errText = await backendResponse.text();
        throw new Error(`Backend Failed: ${errText}`);
    }
    
    const responseJson = await backendResponse.json();
    const structuredData = responseJson.data; // Now accessing the 6-section object
    
    console.log('✅ AI Structured Data Received');

    // Step C: Upload to Google Drive (Client-Side)
    console.log('📂 Step 3: Uploading to Drive...');
    
    // Format the content using the new Minimalist function
    const driveContent = formatForDrive(meetingTitle, structuredData, transcript);
    
    const folderId = await findOrCreateFolder(CONFIG.DRIVE_FOLDER_NAME, token);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${timestamp}_${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_Summary.txt`;
    
    const driveResult = await uploadToDrive(fileName, driveContent, folderId, token);

    // Step D: Send Gmail (Client-Side)
    console.log('📧 Step 4: Sending Email...');
    
    // Format the email using the new Minimalist function
    const emailHtml = formatForEmail(meetingTitle, structuredData);
    
    await sendGmailNotification(meetingTitle, emailHtml, driveResult.webViewLink, token);

    return {
      success: true,
      summary: structuredData.summary, // Return the main summary for the UI popup
      driveLink: driveResult.webViewLink
    };

  } catch (error) {
    console.error('💥 Pipeline Error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== 2. AUTH HELPER ====================

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    // Ask background.js for the token (which handles the caching/WebAuth flow)
    chrome.runtime.sendMessage({ action: 'getOAuthToken' }, (response) => {
      if (response && response.success) resolve(response.token);
      else reject(new Error(response?.error || 'Auth Failed'));
    });
  });
}

// ==================== 3. FORMATTING HELPERS (MINIMALIST) ====================

function formatForDrive(title, data, fullTranscript) {
  const date = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const line = "________________________________________________________________________________";
  
  // Helper for bullet points
  const bullet = (arr) => arr && arr.length ? arr.map(i => `- ${i}`).join('\n') : '(None)';

  return `MEETING RECORD
${line}

TITLE:    ${title}
DATE:     ${date}

${line}

1. EXECUTIVE SUMMARY
${data.summary}

2. KEY POINTS
${bullet(data.keyPoints)}

3. DECISIONS MADE
${bullet(data.decisions)}

4. ACTION ITEMS
${bullet(data.actionItems)}

5. OPEN ISSUES
${bullet(data.openIssues)}

${line}

6. FULL TRANSCRIPT
${fullTranscript}
`;
}

function formatForEmail(title, data) {
  // Helper for clean HTML lists
  const listHtml = (arr) => {
    if (!arr || arr.length === 0) return '<p style="color: #666; font-style: italic; margin: 0;">None recorded</p>';
    return `<ul style="margin: 5px 0 15px 0; padding-left: 20px;">${arr.map(item => `<li style="margin-bottom: 5px;">${item}</li>`).join('')}</ul>`;
  };

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; max-width: 650px; line-height: 1.6; font-size: 14px;">
      
      <div style="border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Meeting Summary</h2>
        <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;">${title}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px;">Executive Summary</h3>
        <p style="margin: 0;">${data.summary}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px;">Key Discussion Points</h3>
        ${listHtml(data.keyPoints)}
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px;">Decisions Made</h3>
        ${listHtml(data.decisions)}
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px;">Action Items</h3>
        ${listHtml(data.actionItems)}
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px;">Open Issues</h3>
        ${listHtml(data.openIssues)}
      </div>

      <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #888;">
        Generated by Meet Transcriber
      </div>
    </div>
  `;
}

// ==================== 4. DRIVE HELPERS ====================

async function findOrCreateFolder(folderName, accessToken) {
  // Search
  const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await search.json();
  
  if (data.files && data.files.length > 0) return data.files[0].id;

  // Create
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const newData = await create.json();
  return newData.id;
}

async function uploadToDrive(fileName, content, folderId, accessToken) {
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: 'text/plain' }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form
  });
  const data = await res.json();
  return { 
    id: data.id, 
    webViewLink: `https://drive.google.com/file/d/${data.id}/view` 
  };
}

// ==================== 5. GMAIL HELPER ====================

async function sendGmailNotification(title, htmlContent, driveLink, accessToken) {
  // 1. Get User Email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const userData = await userRes.json();
  const userEmail = userData.email;

  // 2. Append Drive Link to the structured HTML
  // We add a simple button/link at the very bottom of the clean email
  const finalHtml = `${htmlContent}
    <div style="text-align: center; margin-top: 20px;">
      <a href="${driveLink}" style="display: inline-block; background-color: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">View Full Transcript on Drive</a>
    </div>`;

  // 3. Construct Email
  const subject = `Summary: ${title}`;
  const body = [
    `To: ${userEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    finalHtml
  ].join('\r\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(body)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // 4. Send
  await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ raw: encodedEmail })
  });
}