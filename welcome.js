// welcome.js - Web Auth Pattern
document.getElementById('loginBtn').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = "🔐 Authenticating...";
  
  const clientId = chrome.runtime.getManifest().oauth2.client_id;
  const redirectUri = chrome.identity.getRedirectURL(); 
  const scopes = chrome.runtime.getManifest().oauth2.scopes.join(' ');
  
  // Build the Auth URL manually for Web Client
  const authUrl = `https://accounts.google.com/o/oauth2/auth` + 
                  `?client_id=${clientId}` + 
                  `&response_type=token` + 
                  `&redirect_uri=${encodeURIComponent(redirectUri)}` + 
                  `&scope=${encodeURIComponent(scopes)}`;

  chrome.identity.launchWebAuthFlow(
    { url: authUrl, interactive: true },
    (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        status.textContent = "❌ Error: " + (chrome.runtime.lastError?.message || "Login failed");
        status.style.color = "red";
        return;
      }

      const url = new URL(responseUrl);
      const params = new URLSearchParams(url.hash.substring(1));
      const token = params.get('access_token');

      if (token) {
        // Fetch user profile to verify
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(user => {
          chrome.storage.local.set({ userEmail: user.email, oauthToken: token }, () => {
            status.textContent = `✅ Success! Welcome, ${user.given_name}.`;
            status.style.color = "green";
          });
        });
      }
    }
  );
});