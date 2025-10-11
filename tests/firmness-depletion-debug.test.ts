/**
 * DEBUG TEST: Firmness Equal Depletion
 * Tests that firmnesses deplete at approximately equal rates
 */

import { describe, it, expect } from 'vitest';
import { createPalletsForSize } from '../src/lib/algorithms/palletCreation';
import type { Inventory } from '../src/lib/types';

describe('Firmness Equal Depletion Debug', () => {
  it('should allocate King springs for equal depletion (Medium Stock)', () => {
    const inventory: Inventory = {
      springs: {
        firm: { King: 20, Queen: 27, Double: 8, 'King Single': 5, Single: 2 },
        medium: { King: 125, Queen: 170, Double: 22, 'King Single': 10, Single: 3 },
        soft: { King: 5, Queen: 8, Double: 3, 'King Single': 1, Single: 1 }
      },
      components: {
        micro_coils: { King: 225, Queen: 310, Double: 0, 'King Single': 0, Single: 0 },
        thin_latex: { King: 225, Queen: 310, Double: 0, 'King Single': 0, Single: 0 },
        felt: { King: 150, Queen: 205, Double: 33, 'King Single': 16, Single: 6 },
        top_panel: { King: 150, Queen: 205, Double: 33, 'King Single': 16, Single: 6 },
        bottom_panel: { King: 150, Queen: 205, Double: 33, 'King Single': 16, Single: 6 },
        side_panel: { King: 150, Queen: 205, Double: 55, 'King Single': 0, Single: 0 }
      }
    };

    // Create 3 pallets for King (90 springs)
    const pallets = createPalletsForSize('King', 3, 1, 'Mixed', inventory);

    console.log('\n📊 KING FIRMNESS ALLOCATION (Medium Stock, 3 pallets = 90 springs)');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Starting Inventory:');
    console.log(`  Firm: 20 (${(20 / 3.9).toFixed(2)} months coverage)`);
    console.log(`  Medium: 125 (${(125 / 25.2).toFixed(2)} months coverage)`);
    console.log(`  Soft: 5 (${(5 / 0.9).toFixed(2)} months coverage)\n`);

    // Calculate total allocation by firmness
    let totalFirm = 0;
    let totalMedium = 0;
    let totalSoft = 0;

    pallets.forEach((pallet, idx) => {
      const firm = pallet.firmness_breakdown.firm || 0;
      const medium = pallet.firmness_breakdown.medium || 0;
      const soft = pallet.firmness_breakdown.soft || 0;

      totalFirm += firm;
      totalMedium += medium;
      totalSoft += soft;

      console.log(`Pallet ${idx + 1} (${pallet.type}):`);
      if (firm > 0) console.log(`  Firm: ${firm}`);
      if (medium > 0) console.log(`  Medium: ${medium}`);
      if (soft > 0) console.log(`  Soft: ${soft}`);
      console.log(`  Total: ${pallet.total}\n`);
    });

    console.log('Total Allocation:');
    console.log(`  Firm: ${totalFirm} springs`);
    console.log(`  Medium: ${totalMedium} springs`);
    console.log(`  Soft: ${totalSoft} springs`);
    console.log(`  Total: ${totalFirm + totalMedium + totalSoft} springs\n`);

    console.log('After Order Coverage:');
    console.log(`  Firm: ${20 + totalFirm} total → ${((20 + totalFirm) / 3.9).toFixed(2)} months`);
    console.log(`  Medium: ${125 + totalMedium} total → ${((125 + totalMedium) / 25.2).toFixed(2)} months`);
    console.log(`  Soft: ${5 + totalSoft} total → ${((5 + totalSoft) / 0.9).toFixed(2)} months\n`);

    // Calculate variance
    const firmCoverage = (20 + totalFirm) / 3.9;
    const mediumCoverage = (125 + totalMedium) / 25.2;
    const softCoverage = (5 + totalSoft) / 0.9;

    const maxCoverage = Math.max(firmCoverage, mediumCoverage, softCoverage);
    const minCoverage = Math.min(firmCoverage, mediumCoverage, softCoverage);
    const variance = maxCoverage - minCoverage;

    console.log(`Coverage Variance: ${variance.toFixed(2)} months`);

    if (variance <= 0.5) {
      console.log('🟢 EXCELLENT: All firmnesses within 0.5 months');
    } else if (variance <= 1.0) {
      console.log('🟡 GOOD: All firmnesses within 1 month');
    } else if (variance <= 2.0) {
      console.log('⚠️  ACCEPTABLE: All firmnesses within 2 months');
    } else {
      console.log(`🔴 ISSUE: Firmnesses ${variance.toFixed(2)} months apart`);
    }

    // Test expectations
    expect(totalFirm + totalMedium + totalSoft).toBe(90); // Total must be 90
    expect(totalSoft).toBeGreaterThan(0); // Soft should get some allocation
    expect(variance).toBeLessThanOrEqual(1.5); // Variance should be <= 1.5 months (down from 2.58!)
  });
});
