import { test, expect } from '@playwright/test';

test('Verify new constants are loaded in browser', async ({ page }) => {
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  // Hard reload with cache clearing
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n🔍 CONSOLE LOGS FROM BROWSER:\n');

  const relevantLogs = consoleMessages.filter(msg =>
    msg.includes('Multi-Container') ||
    msg.includes('ORDER_TRIGGER') ||
    msg.includes('Constants initialized')
  );

  relevantLogs.forEach(log => console.log(log));

  // Look for the v2 marker
  const hasV2 = consoleMessages.some(msg => msg.includes('v2 - with 3.5 month buffer'));
  const triggerValue = consoleMessages.find(msg => msg.includes('ORDER_TRIGGER:'));

  console.log('\n📊 VERIFICATION:');
  console.log('Has v2 marker:', hasV2);
  console.log('Trigger line:', triggerValue);

  if (triggerValue && triggerValue.includes('168.66')) {
    console.log('✅ NEW CODE IS LOADED (trigger = 169 units)');
  } else if (triggerValue && triggerValue.includes('134.76')) {
    console.log('❌ OLD CODE STILL LOADED (trigger = 135 units)');
  } else {
    console.log('⚠️  Could not determine trigger value from console');
  }

  // Now test the actual behavior
  console.log('\n🧪 TESTING ACTUAL BEHAVIOR:\n');

  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  // Set Queen Medium to 170 units (just above new 169 trigger)
  console.log('Setting Queen Medium to 170 units (just above trigger of 169)');
  console.log('Expected: Should NOT order in first month\n');

  await inputs[0].fill('10');
  await inputs[1].fill('70');
  await inputs[2].fill('10');
  await inputs[3].fill('12');
  await inputs[4].fill('170');  // Queen Medium - JUST ABOVE TRIGGER
  await inputs[5].fill('11');
  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshots/verify-constants-170.png',
    fullPage: true
  });

  console.log('Screenshot saved: verify-constants-170.png');
  console.log('Check if order is placed immediately or delayed');
});
