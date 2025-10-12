import { test, expect } from '@playwright/test';

test('Final test with clean browser cache', async ({ page, context }) => {
  console.log('\n🔄 FRESH BROWSER TEST (Cache Cleared)\n');

  // Clear all cookies and storage
  await context.clearCookies();

  // Navigate with hard reload
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
  });

  // Hard reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Expand Spring Inventory
  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  console.log('Setting Queen Medium to 100 units');

  await inputs[0].fill('10');   // King Firm
  await inputs[1].fill('70');   // King Medium
  await inputs[2].fill('10');   // King Soft
  await inputs[3].fill('12');   // Queen Firm
  await inputs[4].fill('100');  // Queen Medium
  await inputs[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(1500);

  // Switch to Forecast V2
  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: 'screenshots/final-test-clean.png',
    fullPage: true
  });

  console.log('✅ Screenshot saved: final-test-clean.png');
  console.log('\nWith new 169-unit trigger:');
  console.log('  - Queen Medium should have ~50 units at ORDER HERE marker');
  console.log('  - NOT 29-37 units (old behavior)');
});
