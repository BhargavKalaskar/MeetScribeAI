// Load and display transcripts
function loadTranscripts() {
  chrome.storage.local.get(['savedTranscripts'], (result) => {
    const transcripts = result.savedTranscripts || [];
    const container = document.getElementById('transcriptList');
    
    if (transcripts.length === 0) {
      container.innerHTML = '<div class="empty">No transcripts saved yet. Start capturing in a Google Meet!</div>';
      return;
    }
    
    container.innerHTML = '';
    
    // Reverse to show newest first
    transcripts.reverse().forEach((transcript, index) => {
      const div = document.createElement('div');
      div.className = 'transcript';
      div.id = `transcript-${index}`;
      
      const date = new Date(transcript.date);
      const wordCount = transcript.transcript.split(' ').length;
      const charCount = transcript.transcript.length;
      
      // Check if this transcript was auto-processed
      const isAutoProcessed = transcript.processed && transcript.aiSummary;
      const processingBadge = isAutoProcessed 
        ? '<span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-left: 10px;">✅ Auto-Processed</span>'
        : '';
      
      div.innerHTML = `
        <h3>${transcript.title}${processingBadge}</h3>
        <div class="date">📅 ${date.toLocaleString()}</div>
        
        <div class="processing-status" id="status-${index}">
          ⏳ Processing...
        </div>
        
        <div class="ai-summary ${isAutoProcessed ? 'show' : ''}" id="summary-${index}">
          <h4>🤖 AI Summary</h4>
          <pre id="summary-content-${index}">${isAutoProcessed ? transcript.aiSummary : ''}</pre>
          <a href="${isAutoProcessed ? transcript.driveLink : '#'}" class="drive-link" id="drive-link-${index}" target="_blank" style="${isAutoProcessed ? '' : 'display:none;'}">
            📁 View in Google Drive
          </a>
        </div>
        
        <div class="content">${transcript.transcript}</div>
        <div class="stats">
          📊 ${wordCount} words | ${charCount} characters | ${transcript.fullData.length} caption segments
        </div>
        
        <button class="download-btn" data-index="${transcripts.length - 1 - index}">
          💾 Download TXT
        </button>
        
        <button class="ai-process-btn" data-index="${transcripts.length - 1 - index}" ${isAutoProcessed ? 'style="background: #9E9E9E;" title="Already processed automatically"' : ''}>
          ${isAutoProcessed ? '🔄 Re-process with AI' : '🤖 Process with AI'}
        </button>
        
        <button class="delete-btn" data-index="${transcripts.length - 1 - index}">
          🗑️ Delete
        </button>
      `;
      
      container.appendChild(div);
    });
    
    // Add event listeners for download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        downloadTranscript(transcripts[transcripts.length - 1 - index]);
      });
    });
    
    // Add event listeners for AI process buttons
    document.querySelectorAll('.ai-process-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        const transcript = transcripts[transcripts.length - 1 - index];
        await processWithAI(transcript, index, e.target);
      });
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        deleteTranscript(index);
      });
    });
  });
}

// Process transcript with AI
async function processWithAI(transcript, displayIndex, button) {
  console.log('🎯 Starting AI processing for:', transcript.title);
  
  const statusDiv = document.getElementById(`status-${displayIndex}`);
  const summaryDiv = document.getElementById(`summary-${displayIndex}`);
  
  // Show processing status
  statusDiv.textContent = '⏳ Processing with AI...';
  statusDiv.className = 'processing-status show';
  button.disabled = true;
  button.textContent = '⏳ Processing...';
  
  try {
    // Call the master processing function from api-helpers.js
    const result = await processTranscriptComplete(
      transcript.transcript,
      transcript.title
    );
    
    if (result.success) {
      // Success!
      console.log('✅ Processing complete!');
      
      statusDiv.textContent = '✅ Processing complete! Email sent.';
      statusDiv.className = 'processing-status show success';
      
      // Display summary
      document.getElementById(`summary-content-${displayIndex}`).textContent = result.summary;
      document.getElementById(`drive-link-${displayIndex}`).href = result.driveLink;
      document.getElementById(`drive-link-${displayIndex}`).style.display = '';
      summaryDiv.className = 'ai-summary show';
      
      button.textContent = '✅ Processed';
      button.style.backgroundColor = '#4CAF50';
      
      // Save the AI summary to storage for future reference
      chrome.storage.local.get(['savedTranscripts'], (storageResult) => {
        const allTranscripts = storageResult.savedTranscripts || [];
        const actualIndex = allTranscripts.length - 1 - displayIndex;
        
        if (allTranscripts[actualIndex]) {
          allTranscripts[actualIndex].aiSummary = result.summary;
          allTranscripts[actualIndex].driveLink = result.driveLink;
          allTranscripts[actualIndex].processed = true;
          allTranscripts[actualIndex].processedAt = new Date().toISOString();
          
          chrome.storage.local.set({ savedTranscripts: allTranscripts }, () => {
            console.log('✅ AI summary saved to storage');
          });
        }
      });
      
      // Hide status after 5 seconds
      setTimeout(() => {
        statusDiv.classList.remove('show');
      }, 5000);
      
    } else {
      // Error
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    statusDiv.textContent = '❌ Error: ' + error.message;
    statusDiv.className = 'processing-status show error';
    
    button.disabled = false;
    button.textContent = '🤖 Retry AI Process';
    
    alert('Processing failed: ' + error.message);
  }
}

// Download transcript as text file
function downloadTranscript(transcript) {
  const content = `${transcript.title}\n${new Date(transcript.date).toLocaleString()}\n\n${transcript.transcript}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${transcript.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Delete a transcript
function deleteTranscript(index) {
  if (!confirm('Are you sure you want to delete this transcript?')) return;
  
  chrome.storage.local.get(['savedTranscripts'], (result) => {
    const transcripts = result.savedTranscripts || [];
    transcripts.splice(index, 1);
    chrome.storage.local.set({ savedTranscripts: transcripts }, () => {
      loadTranscripts();
    });
  });
}

// Clear all transcripts
document.getElementById('clearAll').addEventListener('click', () => {
  if (!confirm('Are you sure you want to delete ALL transcripts?')) return;
  
  chrome.storage.local.set({ savedTranscripts: [] }, () => {
    loadTranscripts();
  });
});

// Load transcripts on page load
loadTranscripts();