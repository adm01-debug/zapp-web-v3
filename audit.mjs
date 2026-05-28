import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text() });
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push({ type: 'uncaught', text: error.message });
  });

  console.log('--- Navigating to http://localhost:8080 ---');
  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Give it some time to render
  } catch (e) {
    console.error('Failed to navigate:', e.message);
  }

  console.log('\n--- Console Messages (Warnings/Errors) ---');
  if (consoleErrors.length === 0) {
    console.log('✅ No console warnings or errors found.');
  } else {
    consoleErrors.forEach(err => console.log(`[${err.type.toUpperCase()}] ${err.text}`));
  }

  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];

  for (const viewport of viewports) {
    console.log(`\n--- Checking Responsiveness: ${viewport.name} (${viewport.width}x${viewport.height}) ---`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(1000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > viewport.width) {
      console.log(`⚠️  Horizontal scroll detected on ${viewport.name}! (${scrollWidth}px > ${viewport.width}px)`);
    } else {
      console.log(`✅ No horizontal scroll on ${viewport.name}.`);
    }
    
    // Check for hidden elements or overlaps (basic check)
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    if (bodyHeight === 0) {
      console.log(`❌ Page seems empty on ${viewport.name}!`);
    }
  }

  await browser.close();
})();
