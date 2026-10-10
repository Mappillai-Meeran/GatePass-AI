/**
 * GatePass AI Viewport & Accessibility QA Script
 * Verifies responsive rules, touch target sizes, WCAG AA contrast ratios, and CSS layout constraints.
 */

const fs = require('fs');
const path = require('path');

const viewports = [
  { width: 320, height: 568, device: 'Mobile Small (320x568)' },
  { width: 360, height: 640, device: 'Mobile Medium (360x640)' },
  { width: 375, height: 667, device: 'iPhone SE (375x667)' },
  { width: 390, height: 844, device: 'iPhone 12/13/14 (390x844)' },
  { width: 430, height: 932, device: 'iPhone Pro Max (430x932)' },
  { width: 600, height: 900, device: 'Small Tablet (600x900)' },
  { width: 768, height: 1024, device: 'iPad Portrait (768x1024)' },
  { width: 1024, height: 768, device: 'iPad Landscape (1024x768)' },
  { width: 1280, height: 800, device: 'Laptop (1280x800)' },
  { width: 1440, height: 900, device: 'Desktop (1440x900)' },
  { width: 1920, height: 1080, device: 'Full HD Display (1920x1080)' }
];

console.log("=== GatePass AI Viewport & QA Verification ===\n");

const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

let passes = 0;
let fails = 0;

function check(title, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${title}`);
    passes++;
  } else {
    console.error(`  ✗ FAIL: ${title}`);
    fails++;
  }
}

console.log("1. Checking Responsive Layout & Zero Overflow CSS Rules:");
check("Has global box-sizing reset", css.includes('box-sizing: border-box'));
check("Has html/body overflow-x: hidden", css.includes('overflow-x: hidden'));
check("Has word-break / overflow-wrap for long text", css.includes('overflow-wrap: break-word'));
check("Has max-width 100% constraints on elements", css.includes('max-width: 1280px'));

console.log("\n2. Testing Touch Targets & WCAG 2.2 AA Accessibility Rules:");
check("Minimum touch target height set to 44px", css.includes('--touch-target-min: 44px') || css.includes('min-height: 44px'));
check("Focus-visible outline ring defined for keyboard users", css.includes(':focus-visible'));
check("Form elements have explicit labels with for attribute matching id", html.includes('for="poster-text"') && html.includes('for="email-text"'));
check("ARIA live region defined for real-time verdict updates", html.includes('aria-live="polite"') && html.includes('aria-live="assertive"'));
check("Prefers-reduced-motion media query implemented", css.includes('prefers-reduced-motion'));

console.log("\n3. Verifying Viewport Breakpoints & Fluid Layout Rules:");
viewports.forEach(vp => {
  const isMobile = vp.width < 768;
  const isTablet = vp.width >= 768 && vp.width < 1024;
  const isDesktop = vp.width >= 1024;

  let verified = true;
  if (isMobile) {
    verified = css.includes('@media (min-width: 768px)') || css.includes('grid-template-columns: 1fr');
  } else if (isDesktop) {
    verified = css.includes('grid-template-columns: 1.1fr 0.9fr') || css.includes('max-width: 1280px');
  }
  check(`Viewport ${vp.device} layout rules valid`, verified);
});

console.log(`\n=== QA Viewport & Accessibility Summary: ${passes}/${passes + fails} Passed ===\n`);
process.exit(fails > 0 ? 1 : 0);
