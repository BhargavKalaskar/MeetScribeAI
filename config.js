// API Configuration - Meet Transcriber
const CONFIG = {
  // 🔒 SECURE: Key removed (handled by Backend)
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  
  // Backend URL (Matches your Cloud Function)
  // Update this if your region/project changes
  BACKEND_URL: 'https://asia-south1-meet-transcriber-f8a91.cloudfunctions.net/processMeeting',
  
  // Google Drive
  DRIVE_FOLDER_NAME: 'Meet Transcripts',
  
  // Processing
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000
};

console.log('✅ Config loaded (Secure Mode)');