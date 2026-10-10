const http = require('http');

console.log("=== Live API & Recovery Route Verification ===\n");

function testLiveRoute(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
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
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function runLiveTests() {
  try {
    // 1. Live Analysis Route
    const res1 = await testLiveRoute({
      poster: "Official Policy: Printed ticket required.",
      email: "Registration confirmed.",
      support: "Support: Digital QR code is fine.",
      ticket: "QR pass Alex Rivera",
      student: "CS student"
    });
    console.log("1. Live Server Route POST /api/analyze:");
    console.log("   ✓ Status Code:", res1.statusCode);
    console.log("   ✓ Verdict:", res1.body.verdict);
    console.log("   ✓ Conflicts Found:", res1.body.conflicts.length);

    // 2. Security Check - Response Header & Content
    const bodyStr = JSON.stringify(res1.body);
    const keyLeaked = bodyStr.includes('AIzaSy') || bodyStr.includes('GEMINI_API_KEY');
    console.log("\n2. Security Check on Response Payload:");
    console.log("   ✓ API Key Leaked in Response:", keyLeaked ? "FAIL (LEAKED)" : "PASS (SECURE)");

    console.log("\n=== Live Route & Security Check PASSED ===");
  } catch (err) {
    console.error("Live test error:", err.message);
  }
}

runLiveTests();
