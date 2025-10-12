import { test, expect } from '@playwright/test';

test('Check Queen Medium stock levels before container arrival', async ({ page }) => {
  console.log('\n📊 CHECKING: Queen Medium Stock Levels\n');

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Expand Spring Inventory
  const springInvButton = page.locator('button').filter({ hasText: 'Spring Inventory' }).first();
  const isExpanded = await springInvButton.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await springInvButton.click();
    await page.waitForTimeout(300);
  }

  // Set Queen Medium to 100 units (realistic starting point)
  const inputs = await page.locator('input[type="number"]').all();

  // Fill with realistic inventory
  await inputs[0].fill('10');   // King Firm
  await inputs[1].fill('70');   // King Medium
  await inputs[2].fill('10');   // King Soft
  await inputs[3].fill('12');   // Queen Firm
  await inputs[4].fill('100');  // Queen Medium ← THE KEY ONE
  await inputs[5].fill('11');   // Queen Soft

  for (let i = 6; i < 15; i++) {
    await inputs[i].fill('4');
  }

  await page.waitForTimeout(500);

  console.log('Starting Inventory:');
  console.log('  Queen Medium: 100 units');
  console.log('');

  // Go to Forecast V2
  await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
  await page.waitForTimeout(1500);

  // Take a screenshot
  await page.screenshot({
    path: 'screenshots/queen-medium-check.png',
    fullPage: true
  });

  // Try to read the Queen Medium row values
  // The Queen Medium row is in the Spring Timeline section
  // It should be the 5th row (Queen) with medium firmness

  console.log('Looking for Queen Medium row in timeline...');

  // Get all text content from the page
  const pageText = await page.locator('body').textContent();

  // Look for patterns like "Queen" followed by "medium" and numbers
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);

  let queenMediumFound = false;
  let queenMediumLine = '';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Queen') && i + 1 < lines.length) {
      // Check if next line is "medium"
      if (lines[i + 1].toLowerCase().includes('medium')) {
        queenMediumFound = true;
        // Next line should have the numbers
        if (i + 2 < lines.length) {
          queenMediumLine = lines[i + 2];
        }
        break;
      }
    }
  }

  if (queenMediumFound) {
    console.log('✓ Found Queen Medium row');
    console.log('  Data:', queenMediumLine);
  } else {
    console.log('⚠️  Could not parse Queen Medium row automatically');
    console.log('  Check screenshot: queen-medium-check.png');
  }

  // Alternative: Try to get specific cell values using locators
  console.log('\n📈 Attempting to read timeline cells...');

  // Look for ORDER HERE column (green)
  const orderHere = page.locator('text=ORDER HERE').first();
  if (await orderHere.count() > 0) {
    console.log('✓ Found "ORDER HERE" marker (container arrival point)');
  }

  console.log('\n📸 Full screenshot saved: screenshots/queen-medium-check.png');
  console.log('\nPlease check the Queen Medium row (5th size, medium firmness)');
  console.log('and tell me the value in the column just BEFORE the green "ORDER HERE" column.');
});
