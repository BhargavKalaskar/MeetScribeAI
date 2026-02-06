// === CONFIGURATION ===
// REPLACE THIS with your actual dashboard URL
const DASHBOARD_URL = "http://localhost:5173"; 

document.addEventListener('DOMContentLoaded', () => {
    loadTranscripts();
    setupDashboardLink();
    
    // Header Clear Button
    const clearBtn = document.getElementById('clearAll');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if(confirm('Are you sure? This clears local history but keeps Cloud data.')) {
                chrome.storage.local.set({ savedTranscripts: [] }, loadTranscripts);
            }
        });
    }
});

function setupDashboardLink() {
    const btn = document.getElementById('dashboardLink');
    if(btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: DASHBOARD_URL });
        });
    }
}

function loadTranscripts() {
  chrome.storage.local.get(['savedTranscripts'], (result) => {
    const transcripts = result.savedTranscripts || [];
    const container = document.getElementById('transcriptList');
    
    if (transcripts.length === 0) {
      container.innerHTML = '<div class="empty-state">No local transcripts found.</div>';
      return;
    }
    
    container.innerHTML = '';
    
    // We reverse the array to show the NEWEST meetings at the top
    // mapping allows us to keep the original index reference for deletion
    transcripts.map((t, i) => ({...t, originalIndex: i}))
               .reverse()
               .forEach((transcript, index) => {
      
      const div = document.createElement('div');
      div.className = 'transcript-card';
      
      const date = new Date(transcript.date).toLocaleString([], {
          year: 'numeric', month: 'short', day: 'numeric', 
          hour: '2-digit', minute: '2-digit'
      });
      
      // Show first 120 chars of raw text as preview
      const previewText = transcript.transcript 
          ? transcript.transcript.substring(0, 150) + "..." 
          : "No text content available.";

      div.innerHTML = `
        <div class="card-top">
          <div>
            <div class="card-title">${transcript.title || 'Untitled Meeting'}</div>
            <div class="card-date">${date}</div>
          </div>
        </div>

        <div class="raw-preview">
           <strong>Raw Text Preview:</strong><br>
           ${previewText}
        </div>
        
        <div class="card-actions">
           <button class="btn-sm copy-btn" data-original-index="${transcript.originalIndex}">Copy Raw Text</button>
           <button class="btn-sm delete-btn" data-original-index="${transcript.originalIndex}" style="color: #ef4444; border-color: #fecaca;">Delete</button>
        </div>
      `;
      container.appendChild(div);
    });

    attachListeners(transcripts);
  });
}

function attachListeners(fullTranscriptList) {
  // Copy Text Logic
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-original-index'));
        const text = fullTranscriptList[index].transcript || "";
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = "Copied!";
            e.target.style.background = "#ecfdf5";
            e.target.style.color = "#059669";
            
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.style.background = "";
                e.target.style.color = "";
            }, 1500);
        });
    });
  });

  // Delete Logic
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-original-index'));
      
      if(confirm('Delete this record from local history?')) {
         chrome.storage.local.get(['savedTranscripts'], (res) => {
             let history = res.savedTranscripts || [];
             // Remove the item at the specific index
             history.splice(index, 1);
             // Save and reload
             chrome.storage.local.set({ savedTranscripts: history }, loadTranscripts);
         });
      }
    });
  });
}