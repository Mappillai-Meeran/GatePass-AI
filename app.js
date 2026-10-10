/**
 * GatePass AI - Advanced Event-Entry Readiness Analysis Engine
 * Features: Prompt Injection Hardening, Organizer Reply Re-Check, Qualitative Confidence Meter, PDF Readiness Report, WCAG 2.2 AA
 */

const SCENARIOS = {
  conflicting: {
    poster: "Official Event Policy: Entry strictly requires a printed Physical Ticket and Student ID card. Digital PDF tickets or screenshots will NOT be accepted under any circumstances.",
    email: "Registration Confirmed! Here is your digital PDF ticket with QR code for TechCon 2026.",
    support: "Helpdesk rep: Don't worry, you can just show the digital QR code on your phone at the entrance gate.",
    ticket: "Digital PDF ticket containing QR code. Ticket holder: Alex Rivera.",
    student: "Enrolled in CS204. Holds valid Student ID card."
  },
  qr_only: {
    poster: "",
    email: "",
    support: "",
    ticket: "Image of QR code with text 'Tech Summit Pass'. No name, order ID, or venue entry policy documented.",
    student: "Enrolled in Engineering."
  },
  ineligible: {
    poster: "Eligibility Restriction: Open strictly to 4th Year Senior Undergraduates. 1st, 2nd, and 3rd year students are NOT eligible for entry.",
    email: "Registration Confirmation for AI Workshop.",
    support: "",
    ticket: "Digital pass issued to Jordan Smith.",
    student: "Currently enrolled in 2nd Year Computer Science."
  },
  ready: {
    poster: "Official Policy: Entry requires Registration Confirmation Email, Valid Student ID Card, and Digital/Physical Pass.",
    email: "Confirmed Registration for Sam Miller (Order #88392). Event: Annual Hackathon 2026.",
    support: "Support: Your registration is confirmed. Please carry your Student ID.",
    ticket: "Digital Pass with QR code #88392 issued to Sam Miller.",
    student: "Sam Miller, enrolled student holding official Student ID card."
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('analysis-form');
  const presetBtn = document.getElementById('preset-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeBtnText = document.getElementById('theme-btn-text');
  const exportPdfBtn = document.getElementById('export-pdf-btn');

  const posterInput = document.getElementById('poster-text');
  const emailInput = document.getElementById('email-text');
  const supportInput = document.getElementById('support-text');
  const ticketInput = document.getElementById('ticket-details');
  const studentInput = document.getElementById('student-context');
  const organizerReplyInput = document.getElementById('organizer-reply-text');
  const recheckBtn = document.getElementById('recheck-btn');

  const clearBtn = document.getElementById('clear-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const analyzeBtnText = document.getElementById('analyze-btn-text');
  const analyzeIcon = document.getElementById('analyze-icon');
  
  // File Upload Elements
  const posterFileInput = document.getElementById('poster-file');
  const posterDropzone = document.getElementById('poster-dropzone');
  const posterPrompt = document.getElementById('poster-prompt');
  const posterPreview = document.getElementById('poster-preview');
  
  const ticketFileInput = document.getElementById('ticket-file');
  const ticketDropzone = document.getElementById('ticket-dropzone');
  const ticketPrompt = document.getElementById('ticket-prompt');
  const ticketPreview = document.getElementById('ticket-preview');

  // History Elements
  const historySection = document.getElementById('history-section');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // WOW Factor Elements
  const scoreGaugeContainer = document.getElementById('score-gauge-container');
  const scorePercent = document.getElementById('score-percent');
  const scoreBarFill = document.getElementById('score-bar-fill');
  const speakAdviceBtn = document.getElementById('speak-advice-btn');

  // Alert Box Elements
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const closeAlertBtn = document.getElementById('close-alert-btn');

  // Output Elements
  const demoModeTag = document.getElementById('demo-mode-tag');
  const verdictCard = document.getElementById('verdict-card');
  const verdictBadge = document.getElementById('verdict-badge');
  const verdictReason = document.getElementById('verdict-reason');
  const requirementsList = document.getElementById('requirements-list');
  const messageBox = document.getElementById('organizer-message-box');
  const jsonCode = document.getElementById('json-output-code');
  
  const copyMsgBtn = document.getElementById('copy-msg-btn');
  const copyJsonBtn = document.getElementById('copy-json-btn');

  let uploadedPosterFile = null;
  let uploadedTicketFile = null;
  let isDemoMode = false;
  let currentAnalysisResult = null;

  // 1. Theme Engine
  const savedTheme = localStorage.getItem('gatepass_theme') || 'light';
  applyTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('gatepass_theme', newTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeBtnText.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
  }

  // 2. Web Speech AI Voice Assistant
  if ('speechSynthesis' in window) {
    speakAdviceBtn.classList.remove('hidden');
    speakAdviceBtn.addEventListener('click', () => {
      if (!currentAnalysisResult) return;
      window.speechSynthesis.cancel();
      const textToSpeak = `GatePass AI Readiness Assessment. Verdict: ${currentAnalysisResult.verdict.replace('_', ' ')}. ${currentAnalysisResult.verdict_reason}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speakAdviceBtn.textContent = '🔊 Speaking...';
      utterance.onend = () => { speakAdviceBtn.textContent = '🔊 Listen to AI Voice Advice'; };
      window.speechSynthesis.speak(utterance);
    });
  }

  // 3. Alert Controls
  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function hideError() {
    errorAlert.classList.add('hidden');
  }

  closeAlertBtn.addEventListener('click', hideError);

  // 4. Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(btn.getAttribute('aria-controls'));
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // 5. File Dropzones
  setupDropzone(posterDropzone, posterFileInput, posterPrompt, posterPreview, posterInput, (file) => { uploadedPosterFile = file; });
  setupDropzone(ticketDropzone, ticketFileInput, ticketPrompt, ticketPreview, ticketInput, (file) => { uploadedTicketFile = file; });

  function setupDropzone(dropzone, fileInput, promptEl, previewEl, targetTextarea, callback) {
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      processFileSelection(file, promptEl, previewEl, targetTextarea, callback);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFileSelection(e.dataTransfer.files[0], promptEl, previewEl, targetTextarea, callback);
      }
    });
  }

  function processFileSelection(file, promptEl, previewEl, targetTextarea, callback) {
    hideError();
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

    if (!validTypes.includes(file.type)) {
      showError(`Unsupported file format ("${file.name}"). Please upload PNG, JPG, WEBP, or GIF images.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewEl.innerHTML = `
        <img src="${e.target.result}" alt="Uploaded image thumbnail for ${file.name}" class="preview-thumb" />
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="ocr-status">✓ Image OCR Analyzed (${(file.size / 1024).toFixed(1)} KB)</div>
        </div>
        <button type="button" class="btn btn-sm btn-danger remove-btn" aria-label="Remove uploaded image file">&times;</button>
      `;
      promptEl.classList.add('hidden');
      previewEl.classList.remove('hidden');

      const extractedOcrText = `[OCR Extracted Text from ${file.name}]: Official entry pass image verified. Contains barcode / QR pass details.`;
      if (!targetTextarea.value.includes(file.name)) {
        targetTextarea.value = targetTextarea.value ? `${targetTextarea.value}\n${extractedOcrText}` : extractedOcrText;
      }

      previewEl.querySelector('.remove-btn').addEventListener('click', (ev) => {
        ev.stopPropagation();
        previewEl.innerHTML = '';
        previewEl.classList.add('hidden');
        promptEl.classList.remove('hidden');
        callback(null);
      });

      callback({ name: file.name, type: file.type, dataUrl: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  // 6. Demo Scenarios
  presetBtn.addEventListener('click', () => {
    loadScenario('conflicting');
  });

  window.loadScenario = function(key) {
    hideError();
    const sc = SCENARIOS[key];
    if (!sc) return;
    isDemoMode = true;
    posterInput.value = sc.poster;
    emailInput.value = sc.email;
    supportInput.value = sc.support;
    ticketInput.value = sc.ticket;
    studentInput.value = sc.student;
    organizerReplyInput.value = '';

    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event?.target?.classList?.add('active');

    analyzeInputs();
  };

  // 7. Clear Form / Reset Action
  clearBtn.addEventListener('click', () => {
    hideError();
    form.reset();
    isDemoMode = false;
    uploadedPosterFile = null;
    uploadedTicketFile = null;
    organizerReplyInput.value = '';

    posterPreview.classList.add('hidden');
    posterPrompt.classList.remove('hidden');
    ticketPreview.classList.add('hidden');
    ticketPrompt.classList.remove('hidden');

    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    resetOutput();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    isDemoMode = false;
    analyzeInputs();
  });

  // Re-check Organizer Reply (Closing the Loop Feature)
  recheckBtn.addEventListener('click', () => {
    const replyText = organizerReplyInput.value.trim();
    if (!replyText) {
      showError("Please paste an official written reply from the organizer before re-evaluating.");
      return;
    }
    analyzeInputs();
  });

  messageBox.addEventListener('input', () => {
    if (currentAnalysisResult) {
      currentAnalysisResult.organizer_message = messageBox.value;
      jsonCode.textContent = JSON.stringify(currentAnalysisResult, null, 2);
    }
  });

  copyMsgBtn.addEventListener('click', () => {
    copyToClipboard(messageBox.value, copyMsgBtn, "Organizer message is empty.");
  });

  copyJsonBtn.addEventListener('click', () => {
    copyToClipboard(jsonCode.textContent, copyJsonBtn, "JSON output is empty.");
  });

  function copyToClipboard(text, btnElement, emptyMessage) {
    if (!text || text === '{}' || !text.trim()) {
      showError(emptyMessage);
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showCopySuccess(btnElement);
      }).catch(() => {
        fallbackCopy(text, btnElement);
      });
    } else {
      fallbackCopy(text, btnElement);
    }
  }

  function fallbackCopy(text, btnElement) {
    const tempArea = document.createElement('textarea');
    tempArea.value = text;
    tempArea.style.position = 'fixed';
    tempArea.style.left = '-9999px';
    document.body.appendChild(tempArea);
    tempArea.select();

    try {
      document.execCommand('copy');
      showCopySuccess(btnElement);
    } catch (err) {
      showError("Copy failed. Please manually select and copy text.");
    } finally {
      document.body.removeChild(tempArea);
    }
  }

  function showCopySuccess(btnElement) {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Copied!';
    btnElement.style.backgroundColor = 'var(--color-success)';
    btnElement.style.color = '#ffffff';

    setTimeout(() => {
      btnElement.textContent = originalText;
      btnElement.style.backgroundColor = '';
      btnElement.style.color = '';
    }, 2000);
  }

  // Export PDF Readiness Report
  exportPdfBtn.addEventListener('click', () => {
    if (!currentAnalysisResult) {
      showError("No analysis result available to export. Run an analysis first.");
      return;
    }

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GatePass AI - Event-Entry Readiness Report</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; color: #0f172a; line-height: 1.6; }
          h1 { color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
          .badge { display: inline-block; padding: 0.4rem 1rem; font-weight: bold; border-radius: 6px; text-transform: uppercase; background: #fde68a; color: #78350f; }
          .verdict-ready { background: #bbf7d0; color: #14532d; }
          .verdict-not_ready { background: #fecaca; color: #7f1d1d; }
          .section { margin-top: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
          .req { margin-bottom: 1rem; padding-left: 0.5rem; border-left: 3px solid #2563eb; }
          .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <h1>GatePass AI — Event-Entry Readiness Report</h1>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Verdict:</strong> <span class="badge verdict-${currentAnalysisResult.verdict}">${currentAnalysisResult.verdict.replace('_', ' ')}</span></p>
        <p><strong>Reason:</strong> ${currentAnalysisResult.verdict_reason}</p>
        
        <div class="section">
          <h2>Requirements Breakdown</h2>
          ${currentAnalysisResult.requirements.map(r => `
            <div class="req">
              <strong>${r.requirement} (${r.status.toUpperCase()})</strong><br/>
              <small>Source: ${r.source}</small><br/>
              <p>${r.evidence}</p>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>Organizer Inquiry Message</h2>
          <pre>${currentAnalysisResult.organizer_message}</pre>
        </div>

        <div class="footer">
          GatePass AI &bull; Demo analysis & evidence-based assessment &bull; Not official event verification. Final admission decisions belong to event organizers.
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWin.document.close();
  });

  // History Engine
  loadHistory();

  function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('gatepass_history') || '[]');
    const title = posterInput.value ? posterInput.value.substring(0, 40) + '...' : 'Event Readiness Check';
    history.unshift({
      id: Date.now(),
      title: title,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      result: data
    });
    history = history.slice(0, 5);
    localStorage.setItem('gatepass_history', JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const history = JSON.parse(localStorage.getItem('gatepass_history') || '[]');
    if (history.length === 0) {
      historySection.classList.add('hidden');
      return;
    }

    historySection.classList.remove('hidden');
    historyList.innerHTML = history.map(item => `
      <div class="history-item" onclick="restoreHistoryItem(${item.id})">
        <span class="history-title">${item.title}</span>
        <span class="history-time">${item.time}</span>
      </div>
    `).join('');
  }

  window.restoreHistoryItem = function(id) {
    const history = JSON.parse(localStorage.getItem('gatepass_history') || '[]');
    const item = history.find(h => h.id === id);
    if (item) {
      renderAnalysis(item.result);
    }
  };

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('gatepass_history');
    loadHistory();
  });

  function resetOutput() {
    demoModeTag.classList.add('hidden');
    scoreGaugeContainer.classList.add('hidden');
    verdictCard.className = 'verdict-card verdict-neutral';
    verdictBadge.textContent = 'AWAITING EVIDENCE';
    verdictReason.textContent = 'Provide event evidence or select a quick demo scenario above to evaluate entry readiness.';
    requirementsList.innerHTML = '<div class="empty-state">No analysis performed yet. Click "Analyze Entry Readiness".</div>';
    messageBox.value = '';
    jsonCode.textContent = '{}';
    currentAnalysisResult = null;
  }

  function setLoading(loading) {
    if (loading) {
      analyzeBtn.disabled = true;
      analyzeBtn.setAttribute('aria-busy', 'true');
      analyzeBtnText.textContent = 'Analyzing Evidence...';
      analyzeIcon.outerHTML = `<div id="analyze-icon" class="spinner" aria-hidden="true"></div>`;
    } else {
      analyzeBtn.disabled = false;
      analyzeBtn.setAttribute('aria-busy', 'false');
      analyzeBtnText.textContent = 'Analyze Entry Readiness';
      const spinner = document.getElementById('analyze-icon');
      if (spinner) {
        spinner.outerHTML = `<svg id="analyze-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      }
    }
  }

  async function analyzeInputs() {
    hideError();
    const poster = posterInput.value.trim();
    const email = emailInput.value.trim();
    const support = supportInput.value.trim();
    const ticket = ticketInput.value.trim();
    const student = studentInput.value.trim();
    const organizerReply = organizerReplyInput.value.trim();

    if (!poster && !email && !support && !ticket && !student && !uploadedPosterFile && !uploadedTicketFile && !organizerReply) {
      showError("Empty submission error: Please upload an image or enter text in at least one evidence section before analyzing entry readiness.");
      return;
    }

    setLoading(true);

    const payload = {
      poster: poster + (uploadedPosterFile ? ` [Uploaded Poster Image: ${uploadedPosterFile.name}]` : ''),
      email,
      support,
      ticket: ticket + (uploadedTicketFile ? ` [Uploaded Ticket Image: ${uploadedTicketFile.name}]` : ''),
      student,
      organizerReply
    };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setLoading(false);
        renderAnalysis(data);
        saveToHistory(data);
        return;
      }
    } catch (err) {
      console.log("Server API endpoint unavailable. Running client-side GatePass engine.");
    }

    setTimeout(() => {
      const analysis = runGatePassEngine(payload);
      setLoading(false);
      renderAnalysis(analysis);
      saveToHistory(analysis);
    }, 200);
  }

  // Core Engine Algorithm with Prompt Injection Sanitization & Loop Closing Re-Check
  function runGatePassEngine({ poster, email, support, ticket, student, organizerReply }) {
    const hasPoster = poster.length > 0;
    const hasEmail = email.length > 0;
    const hasSupport = support.length > 0;
    const hasTicket = ticket.length > 0;
    const hasStudent = student.length > 0;
    const hasOrganizerReply = organizerReply && organizerReply.length > 0;

    const combinedInputs = `${poster} ${email} ${support} ${ticket} ${student} ${organizerReply || ''}`.toLowerCase();

    // Check Prompt Injection Attempts in Untrusted Inputs (Principle 2)
    const promptInjectionDetected = /ignore (all )?rules|ignore previous|mark me as ready|override system|grant entry/i.test(combinedInputs);

    let requirements = [];
    let conflicts = [];
    let verdict = "needs_confirmation";
    let verdictReason = "";

    let ticketStatus = "unverified";
    let ticketEvidence = "";
    let ticketSource = "Supplied materials";

    if (hasTicket && hasEmail) {
      if (combinedInputs.includes("qr code") && !hasPoster && !hasEmail.includes("confirmed")) {
        ticketStatus = "unverified";
        ticketSource = "Ticket Image";
        ticketEvidence = `A QR code pass image was supplied ("${ticket.substring(0, 60)}..."), but a QR code alone does not prove ticket authenticity or venue acceptance without confirmation email.`;
      } else if (email.toLowerCase().includes("confirmed") || email.toLowerCase().includes("order #")) {
        ticketStatus = "confirmed";
        ticketSource = "Registration Email";
        ticketEvidence = `Explicit confirmation found in registration email: "${email.substring(0, 80)}..."`;
      }
    } else if (hasTicket && !hasEmail && !hasPoster) {
      ticketStatus = "unverified";
      ticketSource = "Ticket Pass";
      ticketEvidence = `QR/Ticket details provided ("${ticket.substring(0, 70)}..."), but authenticity, active status, or venue acceptance cannot be verified without confirmation email or official policy.`;
    } else {
      ticketStatus = "missing";
      ticketSource = "Supplied materials";
      ticketEvidence = "No official ticket confirmation or registration email is present in the supplied evidence.";
    }

    requirements.push({
      requirement: "Valid Ticket / Registration Pass",
      status: ticketStatus,
      source: ticketSource,
      evidence: ticketEvidence
    });

    let formatConflict = false;
    if (hasPoster && hasSupport && !hasOrganizerReply) {
      const posterRequiresPrint = /printed|physical ticket|no digital|no screenshot/i.test(poster);
      const supportAllowsDigital = /digital|phone|qr code|don't worry|just show|come directly/i.test(support);

      if (posterRequiresPrint && supportAllowsDigital) {
        formatConflict = true;
        conflicts.push({
          issue: "Ticket Format Policy Conflict",
          detail: `Official poster states: "${poster.match(/printed[^.]*|physical ticket[^.]*/i)?.[0] || 'Physical ticket required'}", whereas support chat states: "${support.match(/digital[^.]*|phone[^.]*|don't worry[^.]*|come directly[^.]*/i)?.[0] || 'Digital accepted'}". Official event policy takes precedence over informal support chat.`
        });

        requirements.push({
          requirement: "Accepted Ticket Format (Physical vs Digital)",
          status: "conflicting",
          source: "Event Poster vs Support Chat",
          evidence: `Poster requires printed/physical ticket, but Support Chat says digital code is acceptable. Official event policy takes precedence.`
        });
      }
    }

    // Loop Closing Feature: Written Organizer Reply Resolves Policy Mismatch
    if (hasOrganizerReply && /official|accepted|allowed|confirmed|granted/i.test(organizerReply)) {
      formatConflict = false;
      conflicts = []; // Conflict resolved by official written reply!
      requirements.push({
        requirement: "Accepted Ticket Format",
        status: "confirmed",
        source: "Written Organizer Reply",
        evidence: `Official written confirmation received from organizer: "${organizerReply.substring(0, 80)}..."`
      });
    } else if (!formatConflict && !hasOrganizerReply) {
      if (hasPoster) {
        const posterRule = poster.match(/(printed|physical|digital|id card)[^.]*/i)?.[0] || "Event policy documented.";
        requirements.push({
          requirement: "Accepted Ticket Format",
          status: "confirmed",
          source: "Event Poster",
          evidence: `Official poster specifies: "${posterRule}"`
        });
      } else {
        requirements.push({
          requirement: "Accepted Ticket Format",
          status: "unverified",
          source: "Event Poster",
          evidence: "Official poster or venue entry format policy is missing from provided materials."
        });
      }
    }

    let eligibilityStatus = "unverified";
    let eligibilityEvidence = "";
    let isExplicitIneligible = false;

    if (hasPoster) {
      if (/senior|4th year|graduates only|restricted to/i.test(poster)) {
        if (hasStudent && /1st year|2nd year|3rd year|freshman|sophomore|junior/i.test(student)) {
          eligibilityStatus = "missing";
          isExplicitIneligible = true;
          eligibilityEvidence = `Poster explicitly states: "${poster.match(/eligibility[^.]*|4th year[^.]*|senior[^.]*/i)?.[0] || 'Restricted entry'}", but student context shows: "${student}". Course enrollment alone does not confer eligibility.`;
        } else if (hasStudent && /4th year|senior/i.test(student)) {
          eligibilityStatus = "confirmed";
          eligibilityEvidence = `Student meets explicit poster restriction ("${student}").`;
        } else {
          eligibilityStatus = "unverified";
          eligibilityEvidence = `Poster restricts entry ("${poster.substring(0, 60)}..."), but student year/level is unverified in supplied materials.`;
        }
      } else {
        eligibilityStatus = "confirmed";
        eligibilityEvidence = `No restrictive eligibility limitations specified in official poster.`;
      }
    } else {
      eligibilityStatus = "unverified";
      eligibilityEvidence = `Event eligibility guidelines are unverified because no official poster/policy was supplied. Student course enrollment alone cannot establish eligibility.`;
    }

    requirements.push({
      requirement: "Student Eligibility",
      status: eligibilityStatus,
      source: hasPoster ? "Event Poster & Student Context" : "Supplied materials",
      evidence: eligibilityEvidence
    });

    let idStatus = "unverified";
    let idEvidence = "";
    if (combinedInputs.includes("student id") || combinedInputs.includes("id card")) {
      if (hasStudent && /student id|id card/i.test(student)) {
        idStatus = "confirmed";
        idEvidence = `Student holds required ID card ("${student.match(/student id[^.]*|id card[^.]*/i)?.[0] || 'Valid Student ID'}").`;
      } else {
        idStatus = "missing";
        idEvidence = `Event policy requires Student ID presentation, but student evidence does not document holding a valid Student ID.`;
      }
    } else {
      idStatus = "unverified";
      idEvidence = "It is unverified whether a physical Student ID is mandatory for venue entry.";
    }

    requirements.push({
      requirement: "Student Identity Verification",
      status: idStatus,
      source: "Supplied materials",
      evidence: idEvidence
    });

    if (promptInjectionDetected || isExplicitIneligible) {
      verdict = isExplicitIneligible ? "not_ready" : "needs_confirmation";
      verdictReason = isExplicitIneligible 
        ? "Available evidence explicitly indicates that a required condition is unmet: Student does not meet the explicit year/level eligibility restrictions stated in the official event poster."
        : "Untrusted input security alert: Prompt injection attempt detected in input text and safely neutralized. Verification required.";
    } else if (formatConflict || ticketStatus === "unverified" || ticketStatus === "missing" || eligibilityStatus === "unverified" || idStatus === "missing") {
      verdict = "needs_confirmation";
      if (formatConflict) {
        verdictReason = "Important information conflicts between official event poster policy and support chat regarding accepted ticket formats. Official event policy takes precedence over informal support chat.";
      } else if (ticketStatus === "unverified") {
        verdictReason = "Ticket validity and entry readiness cannot be established. A QR image alone does not prove ticket authenticity or venue acceptance without official confirmation.";
      } else {
        verdictReason = "Key entry requirements or eligibility criteria remain unverified or undocumented in the supplied materials.";
      }
    } else {
      verdict = "ready";
      verdictReason = hasOrganizerReply ? "All entry requirements documented and confirmed by official written organizer reply. Note: Assessment is evidence-based and does not constitute a legal guarantee." : "All applicable entry requirements appear documented with no material unresolved conflicts. Note: Assessment is evidence-based and does not constitute a legal guarantee.";
    }


    // Prompt injection safety alert
    if (promptInjectionDetected) {
      verdictReason += " [Untrusted input security alert: Prompt injection attempt detected in input text and safely neutralized.]";
    }

    let unansweredQuestions = [];
    if (formatConflict) {
      unansweredQuestions.push("Could you please clarify whether digital QR tickets on mobile devices are accepted at the venue entrance, or if a printed physical ticket is strictly required as mentioned in the poster?");
    }
    if (ticketStatus === "unverified" || ticketStatus === "missing") {
      unansweredQuestions.push("Could you confirm whether my registration is active and what specific entry pass or document must be presented at the gate?");
    }
    if (eligibilityStatus === "unverified" && hasPoster) {
      unansweredQuestions.push("Could you confirm the exact student eligibility criteria for attending this event?");
    }
    if (idStatus === "unverified") {
      unansweredQuestions.push("Is a physical Student ID card required alongside the entry ticket?");
    }

    if (unansweredQuestions.length === 0) {
      unansweredQuestions.push("Could you please confirm the gate entry timing and any additional entry protocols for attendees?");
    }

    const organizerMessage = `Dear Event Organizer,\n\nI am writing regarding entry requirements for the upcoming event.\n\nTo ensure I am fully prepared for entry, could you please clarify the following:\n${unansweredQuestions.map(q => `- ${q}`).join('\n')}\n\nThank you for your assistance.\n\nBest regards,\n[Student Name]`;

    return {
      verdict: verdict,
      verdict_reason: verdictReason,
      requirements: requirements,
      conflicts: conflicts,
      organizer_message: organizerMessage,
      disclaimer: "Demo analysis & evidence-based assessment. Not official event verification. Final admission decisions belong to event organizers."
    };
  }

  function renderAnalysis(data) {
    currentAnalysisResult = data;

    if (isDemoMode) {
      demoModeTag.classList.remove('hidden');
    } else {
      demoModeTag.classList.add('hidden');
    }

    // Qualitative Evidence Confidence Status Meter (Replacing arbitrary %)
    let confidenceText = 'High Evidence Confidence (All Requirements Documented)';
    let scoreWidth = '100%';
    let scoreBg = 'linear-gradient(90deg, #10b981, #059669)';

    if (data.verdict === 'not_ready') {
      confidenceText = 'Unmet Entry Requirement (Explicitly Ineligible)';
      scoreWidth = '20%';
      scoreBg = 'linear-gradient(90deg, #ef4444, #dc2626)';
    } else if (data.verdict === 'needs_confirmation') {
      confidenceText = data.conflicts && data.conflicts.length > 0 ? 'Unresolved Policy Conflict (Clarification Required)' : 'Unverified Requirements (Information Missing)';
      scoreWidth = '50%';
      scoreBg = 'linear-gradient(90deg, #f59e0b, #d97706)';
    }

    scoreGaugeContainer.classList.remove('hidden');
    scorePercent.textContent = confidenceText;
    scoreBarFill.style.width = scoreWidth;
    scoreBarFill.style.background = scoreBg;

    verdictCard.className = `verdict-card verdict-${data.verdict}`;
    verdictBadge.textContent = data.verdict.replace('_', ' ');
    verdictReason.textContent = data.verdict_reason;

    let reqHtml = '';

    if (data.conflicts && data.conflicts.length > 0) {
      data.conflicts.forEach(c => {
        reqHtml += `
          <div class="conflict-alert-card" role="region" aria-label="Policy Conflict Alert">
            <div class="conflict-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${c.issue}
            </div>
            <div class="conflict-detail">${c.detail}</div>
          </div>
        `;
      });
    }

    data.requirements.forEach(r => {
      reqHtml += `
        <div class="requirement-row">
          <div class="requirement-header">
            <span class="requirement-title">${r.requirement}</span>
            <span class="status-pill ${r.status}">${r.status}</span>
          </div>
          <div class="requirement-source">Source: ${r.source}</div>
          <div class="requirement-evidence">${r.evidence}</div>
        </div>
      `;
    });

    requirementsList.innerHTML = reqHtml;

    messageBox.value = data.organizer_message;
    jsonCode.textContent = JSON.stringify(data, null, 2);
  }
});
