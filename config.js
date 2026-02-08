// API Configuration - Meet Transcriber
const CONFIG = {

  GROQ_MODEL: 'llama-3.3-70b-versatile',
  
  // Backend URL (Matches your Cloud Function)
  BACKEND_URL: 'https://processmeeting-ujudv2wl6q-el.a.run.app',
  
  // Dashboard URL (For Auth Sync)
  // ⚠️ ACTION REQUIRED: Replace with your Vercel URL
  DASHBOARD_URL: 'https://meet-scribe-ai-one.vercel.app/dashboard',

  // Google Drive
  DRIVE_FOLDER_NAME: 'Meet Transcripts',
  
  // Processing
  MAX_RETRIES: 3,
  TIMEOUT_MS: 60000
};

console.log('✅ Config loaded (Secure Mode)');