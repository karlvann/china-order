import { test, expect } from '@playwright/test';

/**
 * Order Timing Analysis
 *
 * Tests whether the algorithm orders too much inventory when stock is already high.
 * The goal should be to reach a TARGET level when container arrives, not just add to existing.
 */

const MONTHLY_SALES_RATE = {
  'King': 30,
  'Queen': 41,
  'Double': 3,
  'King Single': 3,
  'Single': 3
};

test.describe('Order Timing Analysis', () => {

  test('should analyze if orders arrive when stock is too high', async ({ page }) => {
    console.log('\n🔍 ANALYZING: Order timing and stock levels at container arrival\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set up realistic inventory that mirrors the issue
    await expandSection(page, 'Spring Inventory');

    // Set Queen Medium to 148 (the scenario mentioned)
    const queenMediumInput = page.locator('input[type="number"]').nth(4); // Queen row, Medium column
    await queenMediumInput.fill('148');

    // Add some other inventory
    await fillRealisticInventory(page);

    await page.waitForTimeout(500);

    console.log('📊 CURRENT INVENTORY:');
    console.log('  Queen Medium: 148 units');
    console.log('  Queen coverage: 148 / 41 = 3.6 months');
    console.log('');

    // Switch to Forecast V2 to see the projection
    await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
    await page.waitForTimeout(1000);

    // Take screenshot showing the issue
    await page.screenshot({
      path: 'screenshots/analysis-stock-too-high.png',
      fullPage: true
    });

    // Look for container arrivals in the timeline
    const orderMarkers = await page.locator('text=ORDER HERE').count();
    console.log(`📦 Container arrivals scheduled: ${orderMarkers}`);

    // Try to read some values from the Queen Medium row
    console.log('\n📈 ANALYZING QUEEN MEDIUM ROW:');
    console.log('  (Check screenshot for weekly progression)');
    console.log('');

    // Go back to Order Builder to see what's being ordered
    await page.locator('button').filter({ hasText: 'Order Builder' }).click();
    await page.waitForTimeout(500);

    await expandSection(page, 'Your Order');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/analysis-order-details.png',
      fullPage: true
    });

    console.log('💡 ISSUE IDENTIFIED:');
    console.log('  If Queen Medium has 148 units (3.6 months coverage)');
    console.log('  And we order another ~50 units');
    console.log('  Total becomes: 198 units = 4.8 months coverage');
    console.log('');
    console.log('🎯 RECOMMENDED TARGET:');
    console.log('  When container arrives (Week 10), aim for ~1.5-2 months coverage');
    console.log('  For Queen: 41/month × 1.5 = ~62 units target');
    console.log('  For Queen: 41/month × 2.0 = ~82 units target');
    console.log('');
    console.log('📐 CALCULATION NEEDED:');
    console.log('  Order Amount = (Target Stock) - (Current Stock - Sales During Lead Time)');
    console.log('  Example:');
    console.log('    Target: 82 units');
    console.log('    Current: 148 units');
    console.log('    Sales during 10 weeks (2.3 months): 41 × 2.3 = 94 units');
    console.log('    Stock at arrival: 148 - 94 = 54 units');
    console.log('    Order needed: 82 - 54 = 28 units (not 50!)');
  });

  test('should show what SHOULD happen with proper targeting', async ({ page }) => {
    console.log('\n🎯 SIMULATION: What order should look like with proper targeting\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scenario 1: LOW stock - should order more
    console.log('SCENARIO 1: Low stock (needs order)');
    await expandSection(page, 'Spring Inventory');

    const queenMedium = page.locator('input[type="number"]').nth(4);
    await queenMedium.fill('50'); // Only 50 units = 1.2 months
    await fillRealisticInventory(page);
    await page.waitForTimeout(500);

    console.log('  Current: 50 units (1.2 months coverage)');
    console.log('  During 10 weeks: 41 × 2.3 = 94 units consumed');
    console.log('  Stock at Week 10: 50 - 94 = -44 (STOCKOUT!)');
    console.log('  Target at arrival: 82 units');
    console.log('  ✅ SHOULD ORDER: 82 - (-44) = 126 units (4+ pallets of Queen)');
    console.log('');

    await page.screenshot({ path: 'screenshots/analysis-low-stock.png', fullPage: true });

    // Scenario 2: HIGH stock - should skip or order less
    console.log('SCENARIO 2: High stock (may not need order yet)');
    await queenMedium.fill('200'); // 200 units = 4.9 months
    await page.waitForTimeout(500);

    console.log('  Current: 200 units (4.9 months coverage)');
    console.log('  During 10 weeks: 94 units consumed');
    console.log('  Stock at Week 10: 200 - 94 = 106 units (2.6 months)');
    console.log('  Target at arrival: 82 units');
    console.log('  ❌ SHOULD NOT ORDER (already above target!)');
    console.log('');

    await page.screenshot({ path: 'screenshots/analysis-high-stock.png', fullPage: true });

    // Scenario 3: MEDIUM stock - precise order
    console.log('SCENARIO 3: Medium stock (needs precise order)');
    await queenMedium.fill('120'); // 120 units = 2.9 months
    await page.waitForTimeout(500);

    console.log('  Current: 120 units (2.9 months coverage)');
    console.log('  During 10 weeks: 94 units consumed');
    console.log('  Stock at Week 10: 120 - 94 = 26 units (0.6 months - too low!)');
    console.log('  Target at arrival: 82 units');
    console.log('  ✅ SHOULD ORDER: 82 - 26 = 56 units (~2 pallets Queen)');
    console.log('');

    await page.screenshot({ path: 'screenshots/analysis-medium-stock.png', fullPage: true });
  });

  test('should analyze King vs Queen ordering decisions', async ({ page }) => {
    console.log('\n⚖️  COMPARING: King vs Queen ordering decisions\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // Set both to same coverage (3 months)
    const kingMedium = page.locator('input[type="number"]').nth(1);
    const queenMedium = page.locator('input[type="number"]').nth(4);

    await kingMedium.fill('90');   // King: 90 / 30 = 3.0 months
    await queenMedium.fill('123'); // Queen: 123 / 41 = 3.0 months

    await page.waitForTimeout(500);

    console.log('📊 STARTING COVERAGE (both 3.0 months):');
    console.log('  King Medium: 90 units');
    console.log('  Queen Medium: 123 units');
    console.log('');

    console.log('⏱️  DURING 10-WEEK LEAD TIME:');
    console.log('  King consumed: 30 × 2.3 = 69 units → 21 left (0.7 months)');
    console.log('  Queen consumed: 41 × 2.3 = 94 units → 29 left (0.7 months)');
    console.log('');

    console.log('🎯 TARGET AT ARRIVAL (2 months coverage):');
    console.log('  King target: 30 × 2 = 60 units');
    console.log('  Queen target: 41 × 2 = 82 units');
    console.log('');

    console.log('📦 OPTIMAL ORDER:');
    console.log('  King needs: 60 - 21 = 39 units (1.3 pallets)');
    console.log('  Queen needs: 82 - 29 = 53 units (1.8 pallets)');
    console.log('  Total: ~3 pallets (not 8!)');
    console.log('');

    await expandSection(page, 'Your Order');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'screenshots/analysis-king-queen-comparison.png', fullPage: true });

    console.log('❓ QUESTION FOR ALGORITHM:');
    console.log('  Is it ordering based on:');
    console.log('  A) Current coverage only? (ignores what stock will be in 10 weeks)');
    console.log('  B) Target coverage at arrival? (accounts for depletion during lead time)');
    console.log('');
    console.log('  Answer should be B, but might be doing A!');
  });

  test('should examine the multi-container projection for over-ordering', async ({ page }) => {
    console.log('\n📅 EXAMINING: Multi-container annual projection for over-ordering patterns\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expandSection(page, 'Spring Inventory');

    // Set moderate starting inventory
    await fillRealisticInventory(page);
    await page.waitForTimeout(500);

    await page.locator('button').filter({ hasText: 'Forecast V2' }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'screenshots/analysis-annual-projection-full.png',
      fullPage: true
    });

    console.log('📸 Full annual projection captured');
    console.log('');
    console.log('🔍 LOOK FOR THESE RED FLAGS:');
    console.log('  ❌ Stock increasing when already high');
    console.log('  ❌ Multiple containers arriving close together');
    console.log('  ❌ Ending inventory >> starting inventory');
    console.log('  ❌ Stock never dropping below 2 months coverage');
    console.log('');
    console.log('✅ GOOD PATTERNS:');
    console.log('  ✓ Stock oscillates between 1-3 months');
    console.log('  ✓ Containers arrive ~4-6 months apart');
    console.log('  ✓ Stock reaches ~1.5 months before arrival');
    console.log('  ✓ Stock peaks at ~3 months after arrival');
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

async function fillRealisticInventory(page) {
  const inputs = await page.locator('input[type="number"]').all();

  if (inputs.length >= 15) {
    // King (30/month) - 3 months = 90 total
    await inputs[0].fill('10');   // Firm
    await inputs[1].fill('70');   // Medium
    await inputs[2].fill('10');   // Soft

    // Queen (41/month) - leave Medium as is, fill others
    await inputs[3].fill('12');   // Firm
    // inputs[4] is Queen Medium - already set by test
    await inputs[5].fill('10');   // Soft

    // Small sizes (3/month each) - 4 months = 12 total
    for (let i = 6; i < 15; i++) {
      await inputs[i].fill('4');
    }
  }
}
