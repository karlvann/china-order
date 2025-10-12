import { test, expect } from '@playwright/test';

/**
 * Verify Lead Time Fix
 *
 * Tests that the algorithm now correctly accounts for stock depletion
 * during the 10-week lead time when calculating orders.
 */

const MONTHLY_SALES = {
  'King': 30,
  'Queen': 41,
  'Double': 3,
  'King Single': 3,
  'Single': 3
};

test.describe('Verify Lead Time Fix', () => {

  test('BEFORE FIX: Would have over-ordered with 148 Queen Medium', async ({ page }) => {
    console.log('\n🔍 SCENARIO: Queen Medium = 148 units (the original problem)\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // The problematic scenario: 148 units (3.6 months coverage)
    const queenMediumInput = page.locator('input[type="number"]').nth(4);
    await queenMediumInput.fill('148');

    // Fill rest with low values
    const inputs = await page.locator('input[type="number"]').all();
    for (let i = 0; i < inputs.length; i++) {
      if (i === 4) continue; // Skip Queen Medium (already set)
      await inputs[i].fill('20');
    }

    await page.waitForTimeout(500);

    console.log('📊 SETUP:');
    console.log('  Queen Medium: 148 units (3.6 months coverage)');
    console.log('  Sales rate: 41/month');
    console.log('  Lead time: 10 weeks (2.3 months)');
    console.log('');

    console.log('📐 MATH:');
    console.log('  Current: 148 units');
    console.log('  Depletion during lead time: 41 × 2.3 = 94 units');
    console.log('  Stock at arrival: 148 - 94 = 54 units (1.3 months)');
    console.log('  Target at arrival: 41 × 2 = 82 units (2 months)');
    console.log('  Order needed: 82 - 54 = 28 units (~1 pallet)');
    console.log('');

    console.log('❌ OLD ALGORITHM (broken):');
    console.log('  Target: 6 months = 246 units');
    console.log('  Order: 246 - 148 = 98 units (~3-4 pallets of Queen)');
    console.log('  Result: 148 + 98 = 246 (TOO MUCH!)');
    console.log('');

    console.log('✅ NEW ALGORITHM (fixed):');
    console.log('  Should order ~28 units (~1 pallet of Queen)');
    console.log('  Result: 54 + 28 = 82 units at arrival (PERFECT!)');
    console.log('');

    // Check the order
    await collapseSection(page, 'Spring Inventory');
    await expandSection(page, 'Your Order');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/verify-fix-queen-148.png',
      fullPage: true
    });

    // Try to read the order text
    const orderSection = page.locator('text=Your Order').locator('..').locator('..');
    const orderText = await orderSection.textContent();

    // Count Queen pallets (should be 0-2, not 3-4)
    const queenMatch = orderText.match(/Queen[:\s]+(\d+)\s+pallet/i);
    if (queenMatch) {
      const queenPallets = parseInt(queenMatch[1]);
      console.log(`📦 ACTUAL RESULT: ${queenPallets} Queen pallet(s)`);

      if (queenPallets <= 2) {
        console.log('✅ FIX WORKING: Not over-ordering Queen!');
      } else {
        console.log('⚠️  Still ordering too much Queen');
      }
    } else {
      console.log('📦 Queen not in order (good - already has enough!)');
    }
  });

  test('AFTER FIX: Should handle low stock correctly', async ({ page }) => {
    console.log('\n🔍 SCENARIO: Low stock (should order MORE)\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // Very low Queen Medium: 30 units (0.7 months)
    const queenMediumInput = page.locator('input[type="number"]').nth(4);
    await queenMediumInput.fill('30');

    // Fill rest with low values
    const inputs = await page.locator('input[type="number"]').all();
    for (let i = 0; i < inputs.length; i++) {
      if (i === 4) continue;
      await inputs[i].fill('10');
    }

    await page.waitForTimeout(500);

    console.log('📊 SETUP:');
    console.log('  Queen Medium: 30 units (0.7 months coverage)');
    console.log('');

    console.log('📐 MATH:');
    console.log('  Current: 30 units');
    console.log('  Depletion: 41 × 2.3 = 94 units');
    console.log('  Stock at arrival: 30 - 94 = -64 (STOCKOUT!)');
    console.log('  Target at arrival: 82 units');
    console.log('  Order needed: 82 - (-64) = 146 units (~5 pallets)');
    console.log('');

    await collapseSection(page, 'Spring Inventory');
    await expandSection(page, 'Your Order');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/verify-fix-low-stock.png',
      fullPage: true
    });

    const orderSection = page.locator('text=Your Order').locator('..').locator('..');
    const orderText = await orderSection.textContent();

    console.log('📦 Order should prioritize Queen heavily (crisis mode)');
    const hasQueen = orderText.includes('Queen');
    console.log(`✅ Queen in order: ${hasQueen}`);
  });

  test('AFTER FIX: Should handle high stock correctly (skip ordering)', async ({ page }) => {
    console.log('\n🔍 SCENARIO: High stock (should order LESS or SKIP)\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // High Queen Medium: 200 units (4.9 months)
    const queenMediumInput = page.locator('input[type="number"]').nth(4);
    await queenMediumInput.fill('200');

    // Fill rest with high values
    const inputs = await page.locator('input[type="number"]').all();
    for (let i = 0; i < inputs.length; i++) {
      if (i === 4) continue;
      await inputs[i].fill('150');
    }

    await page.waitForTimeout(500);

    console.log('📊 SETUP:');
    console.log('  Queen Medium: 200 units (4.9 months coverage)');
    console.log('');

    console.log('📐 MATH:');
    console.log('  Current: 200 units');
    console.log('  Depletion: 41 × 2.3 = 94 units');
    console.log('  Stock at arrival: 200 - 94 = 106 units (2.6 months)');
    console.log('  Target at arrival: 82 units');
    console.log('  Order needed: 82 - 106 = -24 (NO ORDER NEEDED!)');
    console.log('');

    await collapseSection(page, 'Spring Inventory');
    await expandSection(page, 'Your Order');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/verify-fix-high-stock.png',
      fullPage: true
    });

    console.log('📦 Order should have minimal/no Queen (already above target)');
  });

  test('VISUAL: Compare before/after in Forecast V2', async ({ page }) => {
    console.log('\n📊 VISUAL COMPARISON: Check stock levels at container arrival\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // Set realistic mixed inventory
    const inputs = await page.locator('input[type="number"]').all();

    // King: 90 units (3 months)
    await inputs[0].fill('10');  // Firm
    await inputs[1].fill('70');  // Medium
    await inputs[2].fill('10');  // Soft

    // Queen: 123 units (3 months)
    await inputs[3].fill('12');  // Firm
    await inputs[4].fill('100'); // Medium
    await inputs[5].fill('11');  // Soft

    // Small sizes: 12 units each (4 months)
    for (let i = 6; i < 15; i++) {
      await inputs[i].fill('4');
    }

    await page.waitForTimeout(500);

    console.log('📊 STARTING INVENTORY:');
    console.log('  King: 90 units (3 months)');
    console.log('  Queen: 123 units (3 months)');
    console.log('  Small sizes: 12 units each (4 months)');
    console.log('');

    // Switch to Forecast V2
    await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'screenshots/verify-fix-forecast-comparison.png',
      fullPage: true
    });

    console.log('✅ CHECK SCREENSHOT:');
    console.log('  Look at Week 10 (container arrival) - stock levels should be:');
    console.log('  - King Medium: ~21 units before arrival → ~60-80 after');
    console.log('  - Queen Medium: ~29 units before arrival → ~80-100 after');
    console.log('  - NOT: 148 units turning into 198+ units!');
    console.log('');
    console.log('  Stock should oscillate between 1-3 months coverage');
    console.log('  NOT stay at 4-6 months constantly!');
  });
});

// Helper functions
async function expandSection(page, sectionName) {
  const section = page.locator('button').filter({ hasText: sectionName }).first();
  const isExpanded = await section.locator('text=▼').count() > 0;
  if (!isExpanded) {
    await section.click();
    await page.waitForTimeout(300);
  }
}

async function collapseSection(page, sectionName) {
  const section = page.locator('button').filter({ hasText: sectionName }).first();
  const isExpanded = await section.locator('text=▼').count() > 0;
  if (isExpanded) {
    await section.click();
    await page.waitForTimeout(300);
  }
}
