import { test, expect } from '@playwright/test';

test('Debug: Why doesnt 100 QM units trigger order?', async ({ page }) => {
  const consoleMessages = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);

    // Print Order Check messages immediately
    if (text.includes('[Order Check]') || text.includes('TRIGGER HIT')) {
      console.log('BROWSER:', text);
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  console.log('\n🔍 SETTING QUEEN MEDIUM TO 100 UNITS\n');

  await inputs[0].fill('10');   // King Firm
  await inputs[1].fill('70');   // King Medium
  await inputs[2].fill('10');   // King Soft
  await inputs[3].fill('12');   // Queen Firm
  await inputs[4].fill('100');  // Queen Medium
  await inputs[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(1000);

  console.log('\n🔄 SWITCHING TO FORECAST V2 (triggers projection)\n');

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(2000);

  console.log('\n📊 ORDER CHECK LOGS:\n');

  const orderChecks = consoleMessages.filter(msg =>
    msg.includes('[Order Check]') || msg.includes('TRIGGER HIT')
  );

  // Show first 5 order checks
  console.log('First 5 order checks:');
  orderChecks.slice(0, 10).forEach((log, i) => {
    console.log(`  ${i+1}. ${log}`);
  });

  console.log(`\nTotal order checks: ${orderChecks.length}`);

  // Find which check actually triggered
  const triggeredChecks = orderChecks.filter(msg => msg.includes('TRIGGER HIT'));
  console.log(`\nTriggered orders: ${triggeredChecks.length}`);

  if (triggeredChecks.length > 0) {
    console.log('\nFirst trigger:');
    const firstTriggerIndex = orderChecks.findIndex(msg => msg.includes('TRIGGER HIT'));
    console.log(`  ${orderChecks[firstTriggerIndex - 1]}`);  // The check before
    console.log(`  ${orderChecks[firstTriggerIndex]}`);      // The trigger
  }
});
