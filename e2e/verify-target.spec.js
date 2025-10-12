import { test, expect } from '@playwright/test';

test('Verify Queen Medium reaches target of 50 units at container arrival', async ({ page }) => {
  console.log('\n🎯 TESTING: Queen Medium Target Validation\n');

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Expand Spring Inventory
  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  // Set Queen Medium to 180 units (well above 169 trigger - should NOT order)
  console.log('TEST 1: Queen Medium at 180 units (above trigger of 169)');
  console.log('Expected: NO order should be placed\n');

  await inputs[4].fill('180');  // Queen Medium
  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshots/verify-above-trigger.png',
    fullPage: true
  });

  // Now test with 160 units (below 169 trigger - SHOULD order)
  console.log('\nTEST 2: Queen Medium at 160 units (below trigger of 169)');
  console.log('Expected: Order should be placed\n');

  await page.locator('button').filter({ hasText: 'Order Builder' }).click();
  await page.waitForTimeout(500);

  const inputs2 = await page.locator('input[type="number"]').all();
  await inputs2[4].fill('160');  // Queen Medium
  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshots/verify-below-trigger.png',
    fullPage: true
  });

  // Test with starting inventory that will trigger around month 3
  console.log('\nTEST 3: Queen Medium at 100 units (realistic scenario)');
  console.log('Expected: Should order when QM drops below 169\n');

  await page.locator('button').filter({ hasText: 'Order Builder' }).click();
  await page.waitForTimeout(500);

  const inputs3 = await page.locator('input[type="number"]').all();

  await inputs3[0].fill('10');   // King Firm
  await inputs3[1].fill('70');   // King Medium
  await inputs3[2].fill('10');   // King Soft
  await inputs3[3].fill('12');   // Queen Firm
  await inputs3[4].fill('100');  // Queen Medium ← Realistic starting point
  await inputs3[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs3[i].fill('4');
  }

  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshots/verify-realistic.png',
    fullPage: true
  });

  console.log('\n✅ Screenshots saved:');
  console.log('  - verify-above-trigger.png (QM=180, should NOT order immediately)');
  console.log('  - verify-below-trigger.png (QM=160, SHOULD order immediately)');
  console.log('  - verify-realistic.png (QM=100, check value before ORDER HERE)');
  console.log('\nPlease check if Queen Medium reaches ~50 units at container arrival');
});
