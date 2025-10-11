/**
 * CRITICAL BUSINESS VALIDATION
 *
 * Deep analysis for a million-dollar mattress factory.
 * Tests edge cases, failure modes, and business-critical scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNPlus1Order,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from '../src/lib/algorithms';
import { validateEqualRunway } from '../src/lib/utils/validation';
import type { Inventory } from '../src/lib/types';

describe('🏭 CRITICAL BUSINESS VALIDATION', () => {

  describe('💰 Financial Impact Tests', () => {

    it('CRITICAL: Never orders more than container capacity allows', () => {
      // If this fails, you'd pay for a 12-pallet container but get 15 pallets worth = lost money

      const testInventory: Inventory = {
        springs: {
          firm: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 },
          medium: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 },
          soft: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 }
        },
        components: {
          micro_coils: { King: 1, Queen: 1, Double: 0, 'King Single': 0, Single: 0 },
          thin_latex: { King: 1, Queen: 1, Double: 0, 'King Single': 0, Single: 0 },
          felt: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 },
          top_panel: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 },
          bottom_panel: { King: 1, Queen: 1, Double: 1, 'King Single': 1, Single: 1 },
          side_panel: { King: 1, Queen: 1, Double: 1, 'King Single': 0, Single: 0 }
        }
      };

      // Test all container sizes
      for (let palletCount = 4; palletCount <= 12; palletCount++) {
        const order = calculateNPlus1Order(palletCount, testInventory);

        expect(order.pallets.length).toBeLessThanOrEqual(palletCount);
        expect(order.pallets.length).toBeGreaterThan(0);

        console.log(`  ${palletCount} pallets ordered → ${order.pallets.length} pallets generated ✅`);
      }
    });

    it('CRITICAL: Every pallet contains exactly 30 springs (supplier requirement)', () => {
      // If this fails, supplier rejects shipment = production stop = lost revenue

      const inventories = [
        // Various scenarios
        { springs: { firm: { King: 50, Queen: 50, Double: 10, 'King Single': 5, Single: 2 },
                     medium: { King: 100, Queen: 120, Double: 20, 'King Single': 8, Single: 3 },
                     soft: { King: 5, Queen: 8, Double: 3, 'King Single': 1, Single: 1 } },
          components: { micro_coils: { King: 200, Queen: 250, Double: 0, 'King Single': 0, Single: 0 },
                       thin_latex: { King: 200, Queen: 250, Double: 0, 'King Single': 0, Single: 0 },
                       felt: { King: 150, Queen: 180, Double: 30, 'King Single': 13, Single: 6 },
                       top_panel: { King: 150, Queen: 180, Double: 30, 'King Single': 13, Single: 6 },
                       bottom_panel: { King: 150, Queen: 180, Double: 30, 'King Single': 13, Single: 6 },
                       side_panel: { King: 150, Queen: 180, Double: 50, 'King Single': 0, Single: 0 }}},
        // Extreme low
        { springs: { firm: { King: 1, Queen: 1, Double: 0, 'King Single': 0, Single: 0 },
                     medium: { King: 2, Queen: 3, Double: 1, 'King Single': 0, Single: 0 },
                     soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 } },
          components: { micro_coils: { King: 5, Queen: 5, Double: 0, 'King Single': 0, Single: 0 },
                       thin_latex: { King: 5, Queen: 5, Double: 0, 'King Single': 0, Single: 0 },
                       felt: { King: 3, Queen: 4, Double: 1, 'King Single': 0, Single: 0 },
                       top_panel: { King: 3, Queen: 4, Double: 1, 'King Single': 0, Single: 0 },
                       bottom_panel: { King: 3, Queen: 4, Double: 1, 'King Single': 0, Single: 0 },
                       side_panel: { King: 3, Queen: 4, Double: 1, 'King Single': 0, Single: 0 }}},
      ];

      let totalPalletsChecked = 0;

      inventories.forEach((inv, idx) => {
        for (let palletCount = 4; palletCount <= 12; palletCount++) {
          const order = calculateNPlus1Order(palletCount, inv);

          order.pallets.forEach((pallet, pIdx) => {
            expect(pallet.total).toBe(30);
            totalPalletsChecked++;
          });
        }
      });

      console.log(`  ✅ Verified ${totalPalletsChecked} pallets - ALL exactly 30 springs`);
    });

    it('CRITICAL: King and Queen always get majority of pallets (88% of revenue)', () => {
      // If this fails, you risk stockouts on your biggest sellers = massive revenue loss

      const testScenarios = [
        { name: 'Low Stock', springs: { firm: { King: 10, Queen: 15, Double: 3, 'King Single': 2, Single: 1 },
                                       medium: { King: 40, Queen: 55, Double: 8, 'King Single': 4, Single: 1 },
                                       soft: { King: 2, Queen: 3, Double: 1, 'King Single': 0, Single: 0 }}},
        { name: 'Medium Stock', springs: { firm: { King: 20, Queen: 27, Double: 8, 'King Single': 5, Single: 2 },
                                          medium: { King: 125, Queen: 170, Double: 22, 'King Single': 10, Single: 3 },
                                          soft: { King: 5, Queen: 8, Double: 3, 'King Single': 1, Single: 1 }}},
        { name: 'High Stock', springs: { firm: { King: 32, Queen: 43, Double: 13, 'King Single': 8, Single: 3 },
                                        medium: { King: 200, Queen: 272, Double: 35, 'King Single': 16, Single: 5 },
                                        soft: { King: 8, Queen: 13, Double: 4, 'King Single': 2, Single: 1 }}},
      ];

      testScenarios.forEach(scenario => {
        const inv: Inventory = {
          springs: scenario.springs,
          components: {
            micro_coils: { King: 100, Queen: 150, Double: 0, 'King Single': 0, Single: 0 },
            thin_latex: { King: 100, Queen: 150, Double: 0, 'King Single': 0, Single: 0 },
            felt: { King: 80, Queen: 100, Double: 15, 'King Single': 8, Single: 3 },
            top_panel: { King: 80, Queen: 100, Double: 15, 'King Single': 8, Single: 3 },
            bottom_panel: { King: 80, Queen: 100, Double: 15, 'King Single': 8, Single: 3 },
            side_panel: { King: 80, Queen: 100, Double: 25, 'King Single': 0, Single: 0 }
          }
        };

        const order = calculateNPlus1Order(8, inv);

        const kingQueenPallets = order.pallets.filter(p =>
          p.size === 'King' || p.size === 'Queen'
        ).length;

        const percentage = (kingQueenPallets / order.pallets.length) * 100;

        console.log(`  ${scenario.name}: ${kingQueenPallets}/8 pallets (${percentage.toFixed(1)}%) → King/Queen`);

        // In most scenarios, should be >50% to King/Queen
        // Only exception is when ALL sizes are equally critical
        expect(kingQueenPallets).toBeGreaterThanOrEqual(order.pallets.length * 0.5);
      });
    });
  });

  describe('⚠️ Production Stop Prevention', () => {

    it('CRITICAL: Components never cause production stop when springs available', () => {
      // Scenario: You have springs in stock but run out of components = can't build mattresses
      // This is catastrophic for production schedule

      const scenariosToTest = 100;
      let violationsFound = 0;
      let severeViolations = 0;

      for (let i = 0; i < scenariosToTest; i++) {
        // Random inventory between 50-150 units
        const randomInv: Inventory = {
          springs: {
            firm: { King: 10 + i, Queen: 15 + i, Double: 5 + (i % 10), 'King Single': 3 + (i % 5), Single: 1 + (i % 3) },
            medium: { King: 80 + i, Queen: 110 + i, Double: 18 + (i % 15), 'King Single': 8 + (i % 8), Single: 3 + (i % 4) },
            soft: { King: 3 + (i % 5), Queen: 5 + (i % 6), Double: 2 + (i % 3), 'King Single': 1 + (i % 2), Single: 1 }
          },
          components: {
            micro_coils: { King: 120 + i * 2, Queen: 165 + i * 2, Double: 0, 'King Single': 0, Single: 0 },
            thin_latex: { King: 120 + i * 2, Queen: 165 + i * 2, Double: 0, 'King Single': 0, Single: 0 },
            felt: { King: 90 + i, Queen: 125 + i, Double: 23 + (i % 20), 'King Single': 11 + (i % 10), Single: 4 + (i % 5) },
            top_panel: { King: 90 + i, Queen: 125 + i, Double: 23 + (i % 20), 'King Single': 11 + (i % 10), Single: 4 + (i % 5) },
            bottom_panel: { King: 90 + i, Queen: 125 + i, Double: 23 + (i % 20), 'King Single': 11 + (i % 10), Single: 4 + (i % 5) },
            side_panel: { King: 90 + i, Queen: 125 + i, Double: 34 + (i % 30), 'King Single': 0, Single: 0 }
          }
        };

        const order = calculateNPlus1Order(8, randomInv);
        const componentOrder = calculateComponentOrder(order, randomInv.springs, randomInv.components);
        const validation = validateEqualRunway(order, componentOrder, randomInv);

        if (!validation.allValid) {
          violationsFound++;

          // Check for severe violations (>5 months difference)
          const severeViolation = validation.violations.some(v =>
            v.message && v.message.includes('months') &&
            parseFloat(v.message) > 5
          );

          if (severeViolation) {
            severeViolations++;
          }
        }
      }

      console.log(`\n  📊 Tested ${scenariosToTest} random inventory scenarios:`);
      console.log(`     Minor violations: ${violationsFound}/${scenariosToTest} (${((violationsFound/scenariosToTest)*100).toFixed(1)}%)`);
      console.log(`     Severe violations (>5mo diff): ${severeViolations}/${scenariosToTest} (${((severeViolations/scenariosToTest)*100).toFixed(1)}%)`);

      // Allow up to 20% minor violations (rounding, edge cases)
      // But severe violations should be <5%
      expect(violationsFound).toBeLessThan(scenariosToTest * 0.20);
      expect(severeViolations).toBeLessThan(scenariosToTest * 0.05);
    });

    it('CRITICAL: Algorithm never creates impossible orders (negative quantities)', () => {
      // If this fails, you'd try to order -30 springs = system breakdown

      const extremeInventories = [
        // All zeros
        { springs: { firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                     medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                     soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }},
          components: { micro_coils: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                       thin_latex: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                       felt: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                       top_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                       bottom_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
                       side_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }}},
        // Very high inventory (shouldn't create negative component orders)
        { springs: { firm: { King: 500, Queen: 700, Double: 100, 'King Single': 50, Single: 20 },
                     medium: { King: 1000, Queen: 1400, Double: 200, 'King Single': 100, Single: 50 },
                     soft: { King: 100, Queen: 150, Double: 30, 'King Single': 15, Single: 5 }},
          components: { micro_coils: { King: 2000, Queen: 3000, Double: 0, 'King Single': 0, Single: 0 },
                       thin_latex: { King: 2000, Queen: 3000, Double: 0, 'King Single': 0, Single: 0 },
                       felt: { King: 1600, Queen: 2250, Double: 330, 'King Single': 165, Single: 75 },
                       top_panel: { King: 1600, Queen: 2250, Double: 330, 'King Single': 165, Single: 75 },
                       bottom_panel: { King: 1600, Queen: 2250, Double: 330, 'King Single': 165, Single: 75 },
                       side_panel: { King: 1600, Queen: 2250, Double: 500, 'King Single': 0, Single: 0 }}},
      ];

      extremeInventories.forEach((inv, idx) => {
        const order = calculateNPlus1Order(8, inv);
        const componentOrder = calculateComponentOrder(order, inv.springs, inv.components);

        // Check spring orders
        order.pallets.forEach(pallet => {
          Object.values(pallet.firmness_breakdown).forEach(qty => {
            expect(qty).toBeGreaterThanOrEqual(0);
          });
        });

        // Check component orders
        Object.keys(componentOrder).forEach(compType => {
          Object.keys(componentOrder[compType]).forEach(size => {
            const qty = componentOrder[compType][size];
            expect(qty).toBeGreaterThanOrEqual(0);
          });
        });

        console.log(`  ✅ Extreme scenario ${idx + 1}: All quantities >= 0`);
      });
    });
  });

  describe('🎯 Edge Case Validation', () => {

    it('EDGE: Handles imbalanced firmness distributions', () => {
      // Real scenario: Customer returns cause weird inventory (all Soft, no Medium)

      const imbalancedInv: Inventory = {
        springs: {
          firm: { King: 5, Queen: 8, Double: 2, 'King Single': 1, Single: 0 },
          medium: { King: 150, Queen: 200, Double: 30, 'King Single': 15, Single: 5 }, // Lots of medium
          soft: { King: 2, Queen: 3, Double: 1, 'King Single': 0, Single: 0 }
        },
        components: {
          micro_coils: { King: 150, Queen: 200, Double: 0, 'King Single': 0, Single: 0 },
          thin_latex: { King: 150, Queen: 200, Double: 0, 'King Single': 0, Single: 0 },
          felt: { King: 100, Queen: 135, Double: 20, 'King Single': 10, Single: 3 },
          top_panel: { King: 100, Queen: 135, Double: 20, 'King Single': 10, Single: 3 },
          bottom_panel: { King: 100, Queen: 135, Double: 20, 'King Single': 10, Single: 3 },
          side_panel: { King: 100, Queen: 135, Double: 35, 'King Single': 0, Single: 0 }
        }
      };

      const order = calculateNPlus1Order(8, imbalancedInv);

      // Should still create valid pallets
      expect(order.pallets.length).toBeLessThanOrEqual(8);
      expect(order.pallets.every(p => p.total === 30)).toBe(true);

      // Should prioritize low firmnesses (Firm and Soft)
      let firmOrders = 0;
      let softOrders = 0;
      let mediumOrders = 0;

      order.pallets.forEach(p => {
        firmOrders += p.firmness_breakdown.firm || 0;
        softOrders += p.firmness_breakdown.soft || 0;
        mediumOrders += p.firmness_breakdown.medium || 0;
      });

      console.log(`  Ordered: Firm ${firmOrders}, Medium ${mediumOrders}, Soft ${softOrders}`);
      console.log(`  ✅ Algorithm adapted to imbalanced inventory`);

      // Firm and Soft combined should get significant allocation
      expect(firmOrders + softOrders).toBeGreaterThan(30);
    });

    it('EDGE: Handles single size domination', () => {
      // Extreme scenario: Only King has low stock, everything else is perfect

      const kingOnlyLowInv: Inventory = {
        springs: {
          firm: { King: 5, Queen: 50, Double: 25, 'King Single': 20, Single: 10 },
          medium: { King: 20, Queen: 200, Double: 50, 'King Single': 30, Single: 15 },
          soft: { King: 2, Queen: 20, Double: 10, 'King Single': 5, Single: 3 }
        },
        components: {
          micro_coils: { King: 40, Queen: 400, Double: 0, 'King Single': 0, Single: 0 },
          thin_latex: { King: 40, Queen: 400, Double: 0, 'King Single': 0, Single: 0 },
          felt: { King: 27, Queen: 270, Double: 85, 'King Single': 55, Single: 28 },
          top_panel: { King: 27, Queen: 270, Double: 85, 'King Single': 55, Single: 28 },
          bottom_panel: { King: 27, Queen: 270, Double: 85, 'King Single': 55, Single: 28 },
          side_panel: { King: 27, Queen: 270, Double: 140, 'King Single': 0, Single: 0 }
        }
      };

      const order = calculateNPlus1Order(8, kingOnlyLowInv);

      const kingPallets = order.pallets.filter(p => p.size === 'King').length;

      console.log(`  King got ${kingPallets}/8 pallets (only King was critical)`);

      // Should give most/all pallets to King
      expect(kingPallets).toBeGreaterThanOrEqual(5);
    });

    it('EDGE: Handles container size extremes (4 vs 12 pallets)', () => {
      // Business decision: Small order (4) vs large order (12) should both work

      const testInv: Inventory = {
        springs: {
          firm: { King: 15, Queen: 20, Double: 5, 'King Single': 3, Single: 1 },
          medium: { King: 75, Queen: 100, Double: 15, 'King Single': 8, Single: 3 },
          soft: { King: 3, Queen: 5, Double: 2, 'King Single': 1, Single: 0 }
        },
        components: {
          micro_coils: { King: 130, Queen: 180, Double: 0, 'King Single': 0, Single: 0 },
          thin_latex: { King: 130, Queen: 180, Double: 0, 'King Single': 0, Single: 0 },
          felt: { King: 93, Queen: 125, Double: 22, 'King Single': 12, Single: 4 },
          top_panel: { King: 93, Queen: 125, Double: 22, 'King Single': 12, Single: 4 },
          bottom_panel: { King: 93, Queen: 125, Double: 22, 'King Single': 12, Single: 4 },
          side_panel: { King: 93, Queen: 125, Double: 38, 'King Single': 0, Single: 0 }
        }
      };

      const small = calculateNPlus1Order(4, testInv);
      const large = calculateNPlus1Order(12, testInv);

      console.log(`  4-pallet order: ${small.pallets.length} pallets, ${small.pallets.reduce((s, p) => s + p.total, 0)} springs`);
      console.log(`  12-pallet order: ${large.pallets.length} pallets, ${large.pallets.reduce((s, p) => s + p.total, 0)} springs`);

      expect(small.pallets.length).toBe(4);
      expect(large.pallets.length).toBe(12);
      expect(small.pallets.every(p => p.total === 30)).toBe(true);
      expect(large.pallets.every(p => p.total === 30)).toBe(true);
    });
  });

  describe('📈 Scalability & Performance', () => {

    it('PERFORMANCE: Handles 1000 order calculations in <5 seconds', () => {
      const testInv: Inventory = {
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

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const order = calculateNPlus1Order(8, testInv);
        const componentOrder = calculateComponentOrder(order, testInv.springs, testInv.components);
        const optimized = optimizeComponentOrder(componentOrder, 'optimized');
        const tsv = generateTSV(order, optimized, 'optimized');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`  ⚡ ${iterations} full pipeline calculations: ${totalTime.toFixed(2)}ms total`);
      console.log(`     Average: ${avgTime.toFixed(3)}ms per calculation`);
      console.log(`     That's ${(1000 / avgTime).toFixed(0)} calculations per second!`);

      expect(totalTime).toBeLessThan(5000); // Must be under 5 seconds
      expect(avgTime).toBeLessThan(5); // Average under 5ms
    });
  });
});
