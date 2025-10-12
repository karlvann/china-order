import { test } from '@playwright/test';

test('Simple check with console logging', async ({ page }) => {
  const logs = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[TRIGGER CHECK]')) {
      console.log(text);
      logs.push(text);
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  const inputs = await page.locator('input[type="number"]').all();
  await inputs[4].fill('100');  // Queen Medium = 100
  await page.waitForTimeout(1000);

  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(2000);

  console.log(`\nCaptured ${logs.length} trigger checks`);
  console.log('\nFirst 10 checks:');
  logs.slice(0, 10).forEach((log, i) => console.log(`  ${i+1}. ${log}`));
});
