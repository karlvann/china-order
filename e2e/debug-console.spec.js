import { test, expect } from '@playwright/test';

test('Capture console logs to debug order trigger', async ({ page }) => {
  const consoleMessages = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('BROWSER:', text);
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait a bit for all calculations to complete
  await page.waitForTimeout(2000);

  // Expand Spring Inventory and set Queen Medium to test trigger
  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  // Set Queen Medium to 100 units (should be well above 135 trigger)
  console.log('\n=== SETTING QUEEN MEDIUM TO 100 UNITS ===\n');
  await inputs[0].fill('10');   // King Firm
  await inputs[1].fill('70');   // King Medium
  await inputs[2].fill('10');   // King Soft
  await inputs[3].fill('12');   // Queen Firm
  await inputs[4].fill('100');  // Queen Medium ← TEST VALUE
  await inputs[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(1000);

  // Now check Forecast V2
  console.log('\n=== SWITCHING TO FORECAST V2 ===\n');
  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  // Print all console messages that mention "Multi-Container" or "Order Check"
  console.log('\n=== RELEVANT CONSOLE LOGS ===\n');
  const relevantLogs = consoleMessages.filter(msg =>
    msg.includes('[Multi-Container') ||
    msg.includes('[Order Check]') ||
    msg.includes('ORDER_TRIGGER') ||
    msg.includes('Constants initialized')
  );

  relevantLogs.forEach(log => console.log(log));

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/debug-console.png',
    fullPage: true
  });

  console.log('\n=== TEST COMPLETE ===');
  console.log('Total console messages captured:', consoleMessages.length);
  console.log('Relevant messages:', relevantLogs.length);
});
