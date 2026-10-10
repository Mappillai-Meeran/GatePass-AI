const http = require('http');

const sampleInput = {
  poster: "Official Event Policy: Entry strictly requires a printed Physical Pass and Student ID card. Digital screenshots are not allowed.",
  email: "Registration Confirmed! Order #99102 for Sarah Connor. Digital PDF Pass attached.",
  support: "Helpdesk support: Don't worry, you can just show the digital QR code pass on your smartphone screen at Gate 3.",
  ticket: "Digital PDF Pass #99102 issued to Sarah Connor with embedded QR Code.",
  student: "Sarah Connor, 3rd Year Computer Science student holding valid Physical Student ID card."
};

console.log("=== Testing GatePass AI Engine Processing ===\n");
console.log("📥 CUSTOM INPUT INFORMATION PROVIDED:");
console.log("-----------------------------------------");
console.log("• Poster Policy: ", sampleInput.poster);
console.log("• Registration Email:", sampleInput.email);
console.log("• Support Chat:    ", sampleInput.support);
console.log("• Ticket Pass:     ", sampleInput.ticket);
console.log("• Student Details: ", sampleInput.student);
console.log("-----------------------------------------\n");

const data = JSON.stringify(sampleInput);
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    const result = JSON.parse(body);
    console.log("📊 PROCESSED OUTPUT ANALYSIS RESULT:");
    console.log("=========================================");
    console.log("🏷️  VERDICT:        ", result.verdict.toUpperCase());
    console.log("📝 VERDICT REASON: ", result.verdict_reason);
    console.log("\n⚠️ CONFLICTS DETECTED:");
    if (result.conflicts && result.conflicts.length > 0) {
      result.conflicts.forEach(c => console.log(`   • [${c.issue}]: ${c.detail}`));
    } else {
      console.log("   • None");
    }

    console.log("\n📋 REQUIREMENTS BREAKDOWN:");
    result.requirements.forEach(r => {
      console.log(`   [${r.status.toUpperCase()}] ${r.requirement}`);
      console.log(`      Source:   ${r.source}`);
      console.log(`      Evidence: ${r.evidence}\n`);
    });

    console.log("✉️ GENERATED ORGANIZER INQUIRY MESSAGE:");
    console.log("-----------------------------------------");
    console.log(result.organizer_message);
    console.log("-----------------------------------------\n");
  });
});

req.on('error', (err) => console.error("Error:", err.message));
req.write(data);
req.end();
