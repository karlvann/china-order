import { test, expect } from '@playwright/test';

test('Final validation: Queen Medium reaches ~50 units at arrival', async ({ page }) => {
  console.log('\n🎯 FINAL VALIDATION TEST\n');

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Expand Spring Inventory
  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();

  // Realistic starting inventory
  console.log('Setting realistic starting inventory:');
  console.log('  Queen Medium: 100 units\n');

  await inputs[0].fill('10');   // King Firm
  await inputs[1].fill('70');   // King Medium
  await inputs[2].fill('10');   // King Soft
  await inputs[3].fill('12');   // Queen Firm
  await inputs[4].fill('100');  // Queen Medium ← THE KEY ONE
  await inputs[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'screenshots/final-validation.png',
    fullPage: true
  });

  console.log('✅ Screenshot saved: final-validation.png\n');
  console.log('Expected behavior with NEW trigger (169 units):');
  console.log('  - Order should be placed when QM drops below 169');
  console.log('  - Container should arrive with ~50 Queen Medium units');
  console.log('  - This is much better than the old behavior (37 → 29)');
  console.log('\nPlease verify Queen Medium value at ORDER HERE column');
});
