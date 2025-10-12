import { test } from '@playwright/test';

test('Check if container arrivals are being applied', async ({ page }) => {
  const logs = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[ARRIVAL]') || text.includes('[ORDER CREATED]')) {
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

  console.log(`\n📦 ARRIVAL LOGS:\n`);
  const arrivals = logs.filter(l => l.includes('[ARRIVAL]'));
  arrivals.slice(0, 5).forEach(log => console.log(log));

  console.log(`\n📋 ORDER LOGS:\n`);
  const orders = logs.filter(l => l.includes('[ORDER CREATED]'));
  orders.slice(0, 5).forEach(log => console.log(log));

  console.log(`\nTotal arrivals logged: ${arrivals.length}`);
  console.log(`Total orders logged: ${orders.length}`);
});
