const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const fetch = require('node-fetch');

admin.initializeApp();

// ==================== CONFIGURATION ====================
const GROQ_API_KEY = process.env.GROQ_API_KEY; 
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ==================== 1. THE BRIDGE (Identity Magic) ====================
// This finds the Firebase User ID based on the Google Token
// so your Dashboard can see the data later.

async function verifyGoogleTokenAndGetUser(googleAccessToken) {
  try {
    // A. Ask Google: "Who is this?"
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
    });

    if (!response.ok) throw new Error('Invalid Google Token');
    
    const googleUser = await response.json();
    const email = googleUser.email;

    // B. Ask Firebase: "Do we have this user?"
    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);
      console.log(`✅ User Exists: ${firebaseUser.uid}`);
      return { uid: firebaseUser.uid, email: email };
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // C. Create them if missing
        console.log(`🆕 Creating new user for: ${email}`);
        const newUser = await admin.auth().createUser({
          email: email,
          displayName: googleUser.name,
          emailVerified: true
        });
        return { uid: newUser.uid, email: email };
      }
      throw e;
    }
  } catch (error) {
    console.error('Bridge Failed:', error);
    throw new Error('Identity Bridge Failed: ' + error.message);
  }
}

// ==================== 2. AI ANALYST (Professional Mode) ====================
// ==================== 2. AI ANALYST (Professional Mode) ====================

async function generateAI_Summary(transcript) {
  try {
    // ✅ USING YOUR SUPERIOR PROMPT
    const systemPrompt = `
      You are a professional meeting analyst. Your output must be strictly factual, concise, and formal.
       
      Analyze the transcript and output a valid JSON object with exactly these keys:
      1. "summary": A concise executive summary (3-4 sentences max).
      2. "keyPoints": An array of the most critical discussion points.
      3. "decisions": An array of explicit decisions or approvals made.
      4. "actionItems": An array of tasks with owners and deadlines (e.g., "John to finalize Q3 report by Friday").
      5. "openIssues": An array of unresolved questions or topics requiring follow-up.
       
      Do not use markdown. Do not use emojis. Do not use conversational filler. Return ONLY the JSON object.
    `;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.2, // Keep strictly factual
        response_format: { type: "json_object" } // Enforce JSON structure
      })
    });

    const data = await response.json();
    
    // Parse the JSON content safely
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid AI Response structure');
    }
    
    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    console.error('AI Error:', error);
    // Fallback structure
    return { 
      summary: "AI Processing Failed", 
      keyPoints: [], decisions: [], actionItems: [], openIssues: [] 
    };
  }
}

// ==================== 3. MAIN FUNCTION ====================

exports.processMeeting = onRequest(
  { region: 'asia-south1', cors: true, secrets: ["GROQ_API_KEY"] }, 
  (req, res) => {
    cors(req, res, async () => {
      try {
        // 1. Auth Check (The Bridge)
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Missing Token' });
        
        const googleToken = authHeader.split('Bearer ')[1];
        const user = await verifyGoogleTokenAndGetUser(googleToken); // 🌉 Magic happens here

        // 2. Input Validation
        const { title, transcript, meetingDate } = req.body;
        if (!transcript || transcript.length < 50) {
          return res.status(400).json({ error: 'Transcript too short' });
        }

        // 3. Generate AI Content
        const structuredData = await generateAI_Summary(transcript);

        // 4. Save to Firestore (Under the Firebase UID!)
        const docRef = await admin.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('meetings')
          .add({
            title: title || 'Untitled',
            transcript: transcript,
            summaryData: structuredData,
            meetingDate: meetingDate || new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'processed'
          });

        // 5. Success Response
        // ✅ CRITICAL: We return 'data' to match what api-helpers.js expects
        return res.status(200).json({ 
            success: true, 
            id: docRef.id, 
            data: structuredData 
        });

      } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
      }
    });
  }
);