import { test, expect } from '@playwright/test';

/**
 * Test: Extract Queen Medium values at container arrivals
 */
test('Check Queen Medium amounts at container arrivals', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5174');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Click on "Forecast V2" tab
  await page.click('text=Forecast V2');

  // Wait for forecast to render
  await page.waitForTimeout(2000);

  // Extract data using page evaluation
  const data = await page.evaluate(() => {
    // Find all rows in the spring timeline table
    const rows = Array.from(document.querySelectorAll('tr'));

    // Row 5 is "Queen", Row 7 is "Queen medium"
    const queenMediumRow = rows[7]; // Based on the output, this is the Queen medium row

    if (!queenMediumRow) {
      return { error: 'Queen Medium row not found at index 7' };
    }

    // Get all cells in the row
    const cells = Array.from(queenMediumRow.querySelectorAll('td'));
    const cellTexts = cells.map(cell => (cell.textContent || '').trim());

    return { cellTexts };
  });

  console.log('\n========================================');
  console.log('Queen Medium Timeline Data');
  console.log('========================================\n');

  if (data.error) {
    console.log('ERROR:', data.error);
    throw new Error(data.error);
  }

  console.log('Found cells:', data.cellTexts.length);
  console.log('\nAll cell values:');
  data.cellTexts.forEach((cell, i) => {
    if (cell.includes('+')) {
      console.log(`  [${i}] ${cell} <-- CONTAINER ARRIVAL`);
    } else {
      console.log(`  [${i}] ${cell}`);
    }
  });
  console.log('\n');

  // Parse through cells and look for container arrival patterns
  const results = [];

  for (let i = 1; i < data.cellTexts.length; i++) {
    const cellText = data.cellTexts[i];

    // Look for pattern of increase (container arrival shows "+X" notation)
    if (cellText.includes('+')) {
      // Extract the base value (before the + sign)
      const match = cellText.match(/(-?\d+)\s*\+(\d+)/);
      if (match) {
        const valueAtArrival = parseInt(match[1]);
        const addedAmount = parseInt(match[2]);
        const previousValue = i > 1 ? data.cellTexts[i - 1] : 'N/A';

        results.push({
          containerNum: results.length + 1,
          columnIndex: i,
          weekBefore: previousValue,
          atArrival: valueAtArrival,
          addedAmount: addedAmount
        });
      }
    }
  }

  console.log('========================================');
  console.log(`FOUND ${results.length} CONTAINER ARRIVALS`);
  console.log('========================================\n');

  // Print detailed results
  if (results.length > 0) {
    results.forEach(r => {
      console.log(`Container ${r.containerNum}:`);
      console.log(`  Week before: ${r.weekBefore} QM`);
      console.log(`  At arrival:  ${r.atArrival} QM`);
      console.log(`  Added:       +${r.addedAmount} QM`);
      console.log('');
    });
  }

  // Check if we found containers
  expect(results.length).toBeGreaterThan(0);

  // Check if any arrivals have negative Queen Medium
  const negativeArrivals = results.filter(r => r.atArrival < 0);
  if (negativeArrivals.length > 0) {
    console.log('\n🔴 CRITICAL: Found containers arriving with NEGATIVE Queen Medium:\n');
    negativeArrivals.forEach(r => {
      console.log(`   Container ${r.containerNum}: ${r.atArrival} QM`);
    });
    console.log('');
  }

  // Check if arrivals are in target range (50-70)
  const outOfRangeArrivals = results.filter(r => r.atArrival < 50 || r.atArrival > 70);

  if (outOfRangeArrivals.length > 0) {
    console.log('⚠️  WARNING: Containers arriving OUTSIDE target range (50-70):\n');
    outOfRangeArrivals.forEach(r => {
      const status = r.atArrival < 50 ? 'TOO LOW' : 'TOO HIGH';
      console.log(`   Container ${r.containerNum}: ${r.atArrival} QM (${status})`);
    });
    console.log('');
  }

  // Check if arrivals are in acceptable range
  const goodArrivals = results.filter(r => r.atArrival >= 50 && r.atArrival <= 70);
  if (goodArrivals.length > 0) {
    console.log('✅ Containers arriving in target range (50-70):\n');
    goodArrivals.forEach(r => {
      console.log(`   Container ${r.containerNum}: ${r.atArrival} QM`);
    });
    console.log('');
  }

  // Summary stats
  if (results.length > 0) {
    const avgArrival = results.reduce((sum, r) => sum + r.atArrival, 0) / results.length;
    const minArrival = Math.min(...results.map(r => r.atArrival));
    const maxArrival = Math.max(...results.map(r => r.atArrival));

    console.log('========================================');
    console.log('SUMMARY STATISTICS');
    console.log('========================================');
    console.log(`Total containers:     ${results.length}`);
    console.log(`Average QM at arrival: ${avgArrival.toFixed(1)} (target: 60)`);
    console.log(`Min QM at arrival:     ${minArrival}`);
    console.log(`Max QM at arrival:     ${maxArrival}`);
    console.log(`In target range:      ${goodArrivals.length}/${results.length}`);
    console.log(`Negative arrivals:    ${negativeArrivals.length}/${results.length}`);
    console.log('========================================\n');
  }
});
