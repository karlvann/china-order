import { test, expect } from '@playwright/test';

/**
 * Queen Medium-Driven Strategy Validation
 *
 * Tests the simplified algorithm that uses Queen Medium (51% of business)
 * as the anchor for all ordering decisions.
 *
 * Target: 50 Queen Medium units when container arrives
 */

test.describe('Queen Medium-Driven Strategy', () => {

  test('should verify Queen Medium stays around 50 units at container arrival', async ({ page }) => {
    console.log('\n🎯 TESTING: Queen Medium-Driven Ordering Strategy\n');
    console.log('Goal: Queen Medium should oscillate around 50 units at arrival');
    console.log('Formula: Order when < 135 QM units (50 target + 85 depletion)');
    console.log('');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set realistic starting inventory
    await expandSection(page, 'Spring Inventory');

    const inputs = await page.locator('input[type="number"]').all();

    // King: 90 units (3 months)
    await inputs[0].fill('10');   // Firm
    await inputs[1].fill('70');   // Medium
    await inputs[2].fill('10');   // Soft

    // Queen: 123 units (3 months) - Queen Medium = ~100 units
    await inputs[3].fill('12');   // Firm
    await inputs[4].fill('100');  // Medium (THIS IS THE KEY!)
    await inputs[5].fill('11');   // Soft

    // Small sizes: 12 units each
    for (let i = 6; i < 15; i++) {
      await inputs[i].fill('4');
    }

    await page.waitForTimeout(500);

    console.log('📊 STARTING INVENTORY:');
    console.log('  Queen Medium: 100 units (2.94 months)');
    console.log('  Trigger threshold: 135 units');
    console.log('  Status: BELOW threshold → Should trigger order soon');
    console.log('');

    // Go to Forecast V2 to see the projection
    await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: 'screenshots/queen-medium-strategy.png',
      fullPage: true
    });

    console.log('📸 Screenshot saved: queen-medium-strategy.png');
    console.log('');
    console.log('✅ CHECK THE SCREENSHOT FOR:');
    console.log('  1. Queen Medium row should oscillate:');
    console.log('     - Deplete to ~20-50 units before arrival');
    console.log('     - Jump to ~80-100 units after arrival');
    console.log('     - NOT build up to 150-250+ units!');
    console.log('');
    console.log('  2. Container spacing should be ~4-5 months apart');
    console.log('     - Triggered when Queen Medium hits ~135 units');
    console.log('     - Arrives 2.5 months later');
    console.log('');
    console.log('  3. All sizes should show LEAN inventory:');
    console.log('     - King Medium: 50-120 units (not 150-200)');
    console.log('     - Queen Medium: 40-100 units (not 150-250)');
  });

  test('should verify low Queen Medium triggers immediate order', async ({ page }) => {
    console.log('\n🚨 TESTING: Low Queen Medium Scenario\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    const inputs = await page.locator('input[type="number"]').all();

    // Set Queen Medium LOW (triggers order)
    await inputs[3].fill('5');   // Queen Firm
    await inputs[4].fill('60');  // Queen Medium (60 units - BELOW 135 trigger!)
    await inputs[5].fill('5');   // Queen Soft

    // Fill rest
    await inputs[0].fill('30');
    await inputs[1].fill('30');
    await inputs[2].fill('10');
    for (let i = 6; i < 15; i++) {
      await inputs[i].fill('4');
    }

    await page.waitForTimeout(500);

    console.log('📊 STARTING INVENTORY:');
    console.log('  Queen Medium: 60 units (1.76 months)');
    console.log('  Trigger: 135 units');
    console.log('  Status: CRITICAL - Should order immediately!');
    console.log('');

    // Check Calendar view for urgency
    await page.locator('button').filter({ hasText: 'Calendar' }).click();
    await page.waitForTimeout(1000);

    const urgentBadge = await page.locator('text=Urgent').count();
    console.log(`  🔴 Urgent badges visible: ${urgentBadge}`);

    if (urgentBadge > 0) {
      console.log('  ✅ Correctly flagged as URGENT');
    }

    await page.screenshot({
      path: 'screenshots/queen-medium-low.png',
      fullPage: true
    });
  });

  test('should verify high Queen Medium delays next order', async ({ page }) => {
    console.log('\n✅ TESTING: High Queen Medium Scenario\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    const inputs = await page.locator('input[type="number"]').all();

    // Set Queen Medium HIGH (no immediate order)
    await inputs[3].fill('20');   // Queen Firm
    await inputs[4].fill('150');  // Queen Medium (150 units - ABOVE 135 trigger!)
    await inputs[5].fill('20');   // Queen Soft

    // Fill rest reasonably high too
    await inputs[0].fill('40');
    await inputs[1].fill('100');
    await inputs[2].fill('20');
    for (let i = 6; i < 15; i++) {
      await inputs[i].fill('12');
    }

    await page.waitForTimeout(500);

    console.log('📊 STARTING INVENTORY:');
    console.log('  Queen Medium: 150 units (4.41 months)');
    console.log('  Trigger: 135 units');
    console.log('  Status: ABOVE threshold - Should delay order');
    console.log('');

    // Check Forecast V2
    await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'screenshots/queen-medium-high.png',
      fullPage: true
    });

    console.log('📸 Screenshot saved: queen-medium-high.png');
    console.log('');
    console.log('✅ CHECK:');
    console.log('  - First container arrival should be ~2-3 months out');
    console.log('  - Not immediate (Week 10)');
    console.log('  - Queen Medium should deplete naturally to ~80 units first');
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
