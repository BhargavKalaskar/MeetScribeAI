import React from 'react';

const Privacy = () => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Privacy Policy for MeetScribeAI</h1>
      <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
      
      <h2>1. Information We Collect</h2>
      <p>MeetScribeAI collects the following data strictly for the purpose of functionality:</p>
      <ul>
        <li><strong>Meeting Transcripts:</strong> Captions from Google Meet are captured locally and sent to our secure backend for processing.</li>
        <li><strong>User Authentication:</strong> We use your Google Account (via Firebase) to authenticate you and save your data securely.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>Your data is used solely to:</p>
      <ul>
        <li>Generate meeting summaries and notes.</li>
        <li>Store your history in your personal dashboard.</li>
      </ul>
      <p><strong>We do NOT sell, trade, or share your data with third parties.</strong></p>

      <h2>3. Data Security</h2>
      <p>All data is encrypted in transit and stored securely using Google Firebase.</p>

      <h2>4. Contact</h2>
      <p>For any privacy concerns, please contact the developer at: <strong>[YOUR EMAIL HERE]</strong></p>
    </div>
  );
};

export default Privacy;