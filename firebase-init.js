// firebase-init.js - Simplified Firebase for Chrome Extension
console.log('🔥 Firebase initialization starting...');

// We'll use Firebase REST API instead of SDK for simplicity
const FIREBASE_CONFIG = {
  apiKey: "AIza5yARlmHKjfV7UVlPuZaWGciSMT3FHMqycI",
  authDomain: "meet-transcriber-f8a91.firebaseapp.com",
  projectId: "meet-transcriber-f8a91",
  storageBucket: "meet-transcriber-f8a91.firebasestorage.app",
  messagingSenderId: "777420342728",
  appId: "1:777420342728:web:2031cfa754d8ee186cfa"
};

// Simplified Firebase Client (No Firebase Auth needed!)
class FirebaseClient {
  constructor(config) {
    this.config = config;
    this.googleToken = null;
  }

  // Set Google OAuth token
  setGoogleToken(token) {
    this.googleToken = token;
    console.log('✅ Google token set');
  }

  // Save transcript directly with Google token
  async saveTranscript(title, transcript, meetingDate) {
    if (!this.googleToken) {
      throw new Error('No Google token available');
    }

    const url = `https://asia-south1-${this.config.projectId}.cloudfunctions.net/processMeeting`;
    
    console.log('☁️ Calling saveTranscript Cloud Function...');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.googleToken}`
        },
        body: JSON.stringify({
          title,
          transcript,
          meetingDate
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Cloud Function error:', result);
        throw new Error(result.error || 'Save failed');
      }

      console.log('✅ Transcript saved!', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error saving transcript:', error);
      throw error;
    }
  }
}

// Create global Firebase instance
window.firebaseClient = new FirebaseClient(FIREBASE_CONFIG);

console.log('✅ Firebase client ready!');