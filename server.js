const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';


const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Handle API Endpoint
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');

        // Check if GEMINI_API_KEY is present for server-side AI processing
        if (GEMINI_API_KEY) {
          try {
            const aiResponse = await callGeminiApi(payload, GEMINI_API_KEY);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(aiResponse));
            return;
          } catch (apiErr) {
            console.error("Gemini API server call failed, falling back to server engine:", apiErr.message);
          }
        }

        // Default to server-side GatePass analysis engine
        const analysis = runServerGatePassEngine(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(analysis));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON input: " + err.message }));
      }
    });
    return;
  }

  // Handle Static File Requests
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// Secure Gemini API Proxy Call
function callGeminiApi(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const promptText = `
You are GatePass AI, an event-entry readiness analysis assistant.
Analyze the following evidence:
Poster: ${payload.poster || 'None'}
Email: ${payload.email || 'None'}
Support: ${payload.support || 'None'}
Ticket: ${payload.ticket || 'None'}
Student Context: ${payload.student || 'None'}

Return ONLY a JSON object with schema:
{
  "verdict": "ready" | "needs_confirmation" | "not_ready",
  "verdict_reason": "string",
  "requirements": [{"requirement": "string", "status": "confirmed"|"missing"|"conflicting"|"unverified", "source": "string", "evidence": "string"}],
  "conflicts": [{"issue": "string", "detail": "string"}],
  "organizer_message": "string",
  "disclaimer": "string"
}
`;

    const requestData = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          const rawText = parsed.candidates[0].content.parts[0].text;
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          resolve(JSON.parse(cleanJson));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(requestData);
    req.end();
  });
}

// Fallback Engine Logic
function runServerGatePassEngine({ poster = '', email = '', support = '', ticket = '', student = '', organizerReply = '' }) {
  const hasPoster = poster.length > 0;
  const hasEmail = email.length > 0;
  const hasSupport = support.length > 0;
  const hasTicket = ticket.length > 0;
  const hasStudent = student.length > 0;
  const hasOrganizerReply = organizerReply && organizerReply.length > 0;

  const combinedInputs = `${poster} ${email} ${support} ${ticket} ${student} ${organizerReply || ''}`.toLowerCase();

  // Prompt Injection Detection (Principle 2)
  const promptInjectionDetected = /ignore (all )?rules|ignore previous|mark me as ready|override system|grant entry/i.test(combinedInputs);

  let requirements = [];
  let conflicts = [];
  let verdict = "needs_confirmation";
  let verdictReason = "";

  // Ticket Status
  let ticketStatus = "unverified";
  let ticketEvidence = "";
  let ticketSource = "Supplied materials";

  if (hasTicket && hasEmail) {
    if (combinedInputs.includes("qr code") && !hasPoster && !email.toLowerCase().includes("confirmed")) {
      ticketStatus = "unverified";
      ticketSource = "Ticket Image";
      ticketEvidence = `A QR code image was supplied, but a QR code alone does not prove ticket authenticity or venue acceptance without confirmation email.`;
    } else if (email.toLowerCase().includes("confirmed") || email.toLowerCase().includes("order #")) {
      ticketStatus = "confirmed";
      ticketSource = "Registration Email";
      ticketEvidence = `Explicit confirmation found in email: "${email.substring(0, 80)}..."`;
    }
  } else if (hasTicket && !hasEmail && !hasPoster) {
    ticketStatus = "unverified";
    ticketSource = "Ticket Image";
    ticketEvidence = `QR/Ticket details provided ("${ticket.substring(0, 70)}..."), but authenticity cannot be verified without confirmation email.`;
  } else {
    ticketStatus = "missing";
    ticketSource = "Supplied materials";
    ticketEvidence = "No official ticket confirmation or registration email is present in supplied evidence.";
  }

  requirements.push({
    requirement: "Valid Ticket / Registration Pass",
    status: ticketStatus,
    source: ticketSource,
    evidence: ticketEvidence
  });

  // Conflict Check
  let formatConflict = false;
  if (hasPoster && hasSupport && !hasOrganizerReply) {
    const posterRequiresPrint = /printed|physical ticket|no digital|no screenshot/i.test(poster);
    const supportAllowsDigital = /digital|phone|qr code|don't worry|just show|come directly/i.test(support);

    if (posterRequiresPrint && supportAllowsDigital) {
      formatConflict = true;
      conflicts.push({
        issue: "Ticket Format Policy Conflict",
        detail: `Official poster states physical ticket required, whereas support chat states digital accepted. Official event policy takes precedence over informal support chat.`
      });

      requirements.push({
        requirement: "Accepted Ticket Format (Physical vs Digital)",
        status: "conflicting",
        source: "Event Poster vs Support Chat",
        evidence: `Poster requires printed/physical ticket, but Support Chat says digital code is acceptable. Official event policy takes precedence.`
      });
    }
  }

  if (hasOrganizerReply && /official|accepted|allowed|confirmed|granted/i.test(organizerReply)) {
    formatConflict = false;
    conflicts = [];
    requirements.push({
      requirement: "Accepted Ticket Format",
      status: "confirmed",
      source: "Written Organizer Reply",
      evidence: `Official written confirmation received from organizer: "${organizerReply.substring(0, 80)}..."`
    });
  } else if (!formatConflict && !hasOrganizerReply) {
    requirements.push({
      requirement: "Accepted Ticket Format",
      status: hasPoster ? "confirmed" : "unverified",
      source: hasPoster ? "Event Poster" : "Supplied materials",
      evidence: hasPoster ? `Official poster specifies entry policy.` : "Official poster ticket format policy is missing."
    });
  }

  // Eligibility
  let isExplicitIneligible = false;
  let eligibilityStatus = "unverified";
  let eligibilityEvidence = "";

  if (hasPoster) {
    if (/senior|4th year|graduates only|restricted to/i.test(poster)) {
      if (hasStudent && /1st year|2nd year|3rd year|freshman|sophomore|junior/i.test(student)) {
        eligibilityStatus = "missing";
        isExplicitIneligible = true;
        eligibilityEvidence = `Poster explicitly restricts entry to 4th year seniors, but student is ${student}.`;
      } else if (hasStudent && /4th year|senior/i.test(student)) {
        eligibilityStatus = "confirmed";
        eligibilityEvidence = `Student meets explicit poster restriction ("${student}").`;
      } else {
        eligibilityStatus = "unverified";
        eligibilityEvidence = `Poster restricts entry, but student year is unverified.`;
      }
    } else {
      eligibilityStatus = "confirmed";
      eligibilityEvidence = `No restrictive eligibility limitations in poster.`;
    }
  } else {
    eligibilityStatus = "unverified";
    eligibilityEvidence = `Eligibility guidelines are unverified as no poster was supplied. Course enrollment alone does not establish eligibility.`;
  }

  requirements.push({
    requirement: "Student Eligibility",
    status: eligibilityStatus,
    source: hasPoster ? "Event Poster" : "Supplied materials",
    evidence: eligibilityEvidence
  });

  // Determine Verdict
  if (promptInjectionDetected || isExplicitIneligible) {
    verdict = isExplicitIneligible ? "not_ready" : "needs_confirmation";
    verdictReason = isExplicitIneligible 
      ? "Available evidence explicitly indicates that a required condition is unmet: Student does not meet the eligibility restrictions stated in official event poster."
      : "Untrusted input security alert: Prompt injection attempt detected in input text and safely neutralized. Verification required.";
  } else if (formatConflict || ticketStatus === "unverified" || ticketStatus === "missing" || eligibilityStatus === "unverified") {
    verdict = "needs_confirmation";
    if (formatConflict) {
      verdictReason = "Important information conflicts between official event poster policy and support chat regarding ticket format. Official event policy takes precedence over informal support chat.";
    } else {
      verdictReason = "Key entry requirements or eligibility criteria remain unverified or undocumented.";
    }
  } else {
    verdict = "ready";
    verdictReason = "All applicable entry requirements appear documented with no material unresolved conflicts.";
  }


  if (promptInjectionDetected) {
    verdictReason += " [Untrusted input security alert: Prompt injection attempt detected in input text and safely neutralized.]";
  }

  return {
    verdict,
    verdict_reason: verdictReason,
    requirements,
    conflicts,
    organizer_message: `Dear Event Organizer,\n\nI am writing regarding entry requirements for the upcoming event.\n\nCould you please clarify ticket acceptance and gate entry requirements?\n\nThank you,\n[Student Name]`,
    disclaimer: "Demo analysis & evidence-based assessment. Not official event verification. Final admission decision belongs to the event organizer."
  };
}


server.listen(PORT, () => {
  console.log(`GatePass AI Server listening on http://localhost:${PORT}`);
});

module.exports = { runServerGatePassEngine };

