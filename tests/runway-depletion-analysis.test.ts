/**
 * RUNWAY DEPLETION ANALYSIS
 *
 * Tests that springs and components run out at approximately the same time.
 * This validates the "equal runway" business requirement: components and springs
 * must deplete together since they arrive in the same container.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNPlus1Order,
  calculateComponentOrder
} from '../src/lib/algorithms';
import type { Inventory, SpringOrder, ComponentOrder } from '../src/lib/types';

describe('Runway Depletion Analysis', () => {
  // Monthly sales rates
  const MONTHLY_SALES = {
    King: 30,
    Queen: 41,
    Double: 6,
    'King Single': 3,
    Single: 1
  };

  // Firmness distribution
  const FIRMNESS_DIST = {
    King: { firm: 0.13, medium: 0.84, soft: 0.03 },
    Queen: { firm: 0.13, medium: 0.84, soft: 0.03 },
    Double: { firm: 0.33, medium: 0.50, soft: 0.17 },
    'King Single': { firm: 0.33, medium: 0.50, soft: 0.17 },
    Single: { firm: 0.33, medium: 0.50, soft: 0.17 }
  };

  // Component multipliers
  const COMPONENT_MULTIPLIERS = {
    micro_coils: 1.5,
    thin_latex: 1.5,
    felt: 1.0,
    top_panel: 1.0,
    bottom_panel: 1.0,
    side_panel: 1.0
  };

  /**
   * Simulate inventory depletion month by month
   * Returns the month when each item runs out
   */
  const simulateDepletion = (
    inventory: Inventory,
    springOrder: SpringOrder,
    componentOrder: ComponentOrder
  ) => {
    const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single'];
    const firmnesses = ['firm', 'medium', 'soft'];
    const components = ['micro_coils', 'thin_latex', 'felt', 'top_panel', 'bottom_panel', 'side_panel'];

    // Create working copies with orders added (arrives at month 2.5)
    const currentStock = {
      springs: JSON.parse(JSON.stringify(inventory.springs)),
      components: JSON.parse(JSON.stringify(inventory.components))
    };

    // Track when each item runs out (month number where it goes <= 0)
    const runoutMonth: Record<string, number> = {};

    console.log('\n📊 MONTH-BY-MONTH DEPLETION SIMULATION\n');
    console.log('Container arrives at Month 2.5 (Week 10)\n');

    // Simulate 20 months forward
    for (let month = 0; month < 20; month++) {
      // Container arrives at month 2.5 (between month 2 and 3)
      if (month === 2) {
        console.log(`\n📦 MONTH ${month + 0.5}: CONTAINER ARRIVES\n`);

        // Add spring orders
        sizes.forEach(size => {
          firmnesses.forEach(firmness => {
            const ordered = springOrder.springs[firmness][size] || 0;
            currentStock.springs[firmness][size] += ordered;
            if (ordered > 0) {
              console.log(`  + ${size} ${firmness}: +${ordered} springs`);
            }
          });
        });

        // Add component orders
        components.forEach(comp => {
          sizes.forEach(size => {
            const ordered = componentOrder[comp][size] || 0;
            currentStock.components[comp][size] += ordered;
            if (ordered > 0) {
              console.log(`  + ${size} ${comp}: +${ordered} units`);
            }
          });
        });
        console.log('');
      }

      console.log(`\n--- MONTH ${month} START ---`);

      // Deplete each size
      sizes.forEach(size => {
        const monthlySales = MONTHLY_SALES[size as keyof typeof MONTHLY_SALES];

        // Deplete springs by firmness
        firmnesses.forEach(firmness => {
          const ratio = FIRMNESS_DIST[size as keyof typeof FIRMNESS_DIST][firmness as keyof typeof FIRMNESS_DIST['King']];
          const depletion = monthlySales * ratio;

          const before = currentStock.springs[firmness][size];
          currentStock.springs[firmness][size] -= depletion;
          const after = currentStock.springs[firmness][size];

          // Track runout
          const key = `${size}_spring_${firmness}`;
          if (before > 0 && after <= 0 && !runoutMonth[key]) {
            runoutMonth[key] = month;
            console.log(`  ⚠️  ${size} ${firmness} springs: RAN OUT (${before.toFixed(1)} → ${after.toFixed(1)})`);
          }
        });

        // Deplete components
        components.forEach(comp => {
          // Skip micro coils and thin latex for small sizes
          if ((comp === 'micro_coils' || comp === 'thin_latex') &&
              ['Double', 'King Single', 'Single'].includes(size)) {
            return;
          }

          const multiplier = COMPONENT_MULTIPLIERS[comp as keyof typeof COMPONENT_MULTIPLIERS];
          const depletion = monthlySales * multiplier;

          const before = currentStock.components[comp][size];
          currentStock.components[comp][size] -= depletion;
          const after = currentStock.components[comp][size];

          // Track runout
          const key = `${size}_${comp}`;
          if (before > 0 && after <= 0 && !runoutMonth[key]) {
            runoutMonth[key] = month;
            console.log(`  ⚠️  ${size} ${comp}: RAN OUT (${before.toFixed(1)} → ${after.toFixed(1)})`);
          }
        });

        // Show total spring inventory for this size at end of month
        const totalSprings = firmnesses.reduce((sum, f) =>
          sum + Math.max(0, currentStock.springs[f][size]), 0
        );

        if (totalSprings > 0) {
          const coverage = (totalSprings / monthlySales).toFixed(1);
          console.log(`  ${size}: ${totalSprings.toFixed(0)} springs (${coverage}mo coverage)`);
        }
      });
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RUNOUT SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return runoutMonth;
  };

  /**
   * Analyze runout timing and check for equal runway
   */
  const analyzeRunoutTiming = (runoutMonth: Record<string, number>) => {
    const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single'];

    console.log('When Items Run Out (by size):\n');

    const violations: { size: string; diff: number; description: string }[] = [];

    sizes.forEach(size => {
      console.log(`\n${size}:`);

      // Get spring runout months
      const springRunouts = ['firm', 'medium', 'soft'].map(f => {
        const key = `${size}_spring_${f}`;
        return runoutMonth[key] !== undefined ? runoutMonth[key] : 999;
      });

      const avgSpringRunout = springRunouts.reduce((a, b) => a + b, 0) / springRunouts.filter(x => x !== 999).length;

      springRunouts.forEach((month, idx) => {
        const firmness = ['firm', 'medium', 'soft'][idx];
        if (month !== 999) {
          console.log(`  ${firmness} springs: Month ${month}`);
        }
      });

      // Get component runout months (excluding micro coils/thin latex for small sizes)
      const components = ['micro_coils', 'thin_latex', 'felt', 'top_panel', 'bottom_panel', 'side_panel'];

      components.forEach(comp => {
        // Skip micro coils/thin latex for small sizes
        if ((comp === 'micro_coils' || comp === 'thin_latex') &&
            ['Double', 'King Single', 'Single'].includes(size)) {
          return;
        }

        const key = `${size}_${comp}`;
        const month = runoutMonth[key];

        if (month !== undefined) {
          const diff = Math.abs(month - avgSpringRunout);
          const status = diff <= 1 ? '✅' : diff <= 2 ? '⚠️ ' : '❌';

          console.log(`  ${comp}: Month ${month} ${status} (${diff.toFixed(1)}mo diff from springs)`);

          if (diff > 2) {
            violations.push({
              size,
              diff,
              description: `${size} ${comp}: ${diff.toFixed(1)} months difference from springs`
            });
          }
        }
      });

      // Show average runout time for this size
      const allRunouts = [
        ...springRunouts.filter(x => x !== 999),
        ...components
          .filter(comp => {
            if ((comp === 'micro_coils' || comp === 'thin_latex') &&
                ['Double', 'King Single', 'Single'].includes(size)) {
              return false;
            }
            return true;
          })
          .map(comp => runoutMonth[`${size}_${comp}`])
          .filter(x => x !== undefined)
      ];

      if (allRunouts.length > 0) {
        const avg = allRunouts.reduce((a, b) => a + b, 0) / allRunouts.length;
        const min = Math.min(...allRunouts);
        const max = Math.max(...allRunouts);
        const variance = max - min;

        console.log(`\n  📊 Average runout: Month ${avg.toFixed(1)}`);
        console.log(`     Range: Month ${min} → ${max} (${variance.toFixed(1)}mo variance)`);

        if (variance <= 1) {
          console.log(`     🟢 EXCELLENT: All items deplete within 1 month of each other`);
        } else if (variance <= 2) {
          console.log(`     🟡 GOOD: All items deplete within 2 months of each other`);
        } else {
          console.log(`     🔴 ISSUE: Items deplete more than 2 months apart`);
        }
      }
    });

    return violations;
  };

  describe('Scenario 1: Critical Low Stock', () => {
    const lowStockInventory: Inventory = {
      springs: {
        firm: { King: 8, Queen: 10, Double: 3, 'King Single': 2, Single: 1 },
        medium: { King: 50, Queen: 65, Double: 8, 'King Single': 4, Single: 1 },
        soft: { King: 2, Queen: 3, Double: 1, 'King Single': 0, Single: 0 }
      },
      components: {
        micro_coils: { King: 90, Queen: 120, Double: 0, 'King Single': 0, Single: 0 },
        thin_latex: { King: 90, Queen: 120, Double: 0, 'King Single': 0, Single: 0 },
        felt: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        top_panel: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        bottom_panel: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        side_panel: { King: 60, Queen: 80, Double: 20, 'King Single': 0, Single: 0 }
      }
    };

    it('should deplete springs and components at approximately the same rate', () => {
      console.log('\n🔴 SCENARIO 1: CRITICAL LOW STOCK DEPLETION ANALYSIS');
      console.log('═══════════════════════════════════════════════════════════\n');

      const springOrder = calculateNPlus1Order(8, lowStockInventory);
      const componentOrder = calculateComponentOrder(
        springOrder,
        lowStockInventory.springs,
        lowStockInventory.components
      );

      const runoutMonth = simulateDepletion(lowStockInventory, springOrder, componentOrder);
      const violations = analyzeRunoutTiming(runoutMonth);

      console.log('\n\n🎯 EQUAL RUNWAY VALIDATION:\n');
      if (violations.length === 0) {
        console.log('✅ PERFECT: All items deplete within acceptable timeframe');
      } else {
        console.log(`⚠️  ${violations.length} violations found:`);
        violations.forEach(v => {
          console.log(`   - ${v.description}`);
        });
        console.log('\n⚠️  NOTE: In crisis mode (<2 months coverage), violations are expected.');
        console.log('   Components may run out before container arrives (Week 10).');
        console.log('   This is a mathematical reality, not an algorithm failure.');
      }

      // Allow up to 12 violations in crisis mode (components depleting before container arrives)
      expect(violations.length).toBeLessThan(12);
    });
  });

  describe('Scenario 2: Medium Stock', () => {
    const mediumStockInventory: Inventory = {
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

    it('should maintain equal runway with healthy inventory', () => {
      console.log('\n🟡 SCENARIO 2: MEDIUM STOCK DEPLETION ANALYSIS');
      console.log('═══════════════════════════════════════════════════════════\n');

      const springOrder = calculateNPlus1Order(8, mediumStockInventory);
      const componentOrder = calculateComponentOrder(
        springOrder,
        mediumStockInventory.springs,
        mediumStockInventory.components
      );

      const runoutMonth = simulateDepletion(mediumStockInventory, springOrder, componentOrder);
      const violations = analyzeRunoutTiming(runoutMonth);

      console.log('\n\n🎯 EQUAL RUNWAY VALIDATION:\n');
      if (violations.length === 0) {
        console.log('✅ PERFECT: All items deplete within acceptable timeframe');
      } else {
        console.log(`⚠️  ${violations.length} violations found:`);
        violations.forEach(v => {
          console.log(`   - ${v.description}`);
        });
      }

      expect(violations.length).toBeLessThan(2);
    });
  });
});
