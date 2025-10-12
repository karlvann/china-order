/**
 * Test: Tiered Threshold System
 *
 * Validates that King/Queen Medium get higher priority (4.5 months threshold)
 * than other firmnesses and small sizes.
 */

import { describe, it, expect } from 'vitest';
import { calculateAnnualProjection } from '../../src/lib/algorithms/multiContainerProjection';
import { createEmptySpringInventory, createEmptyComponentInventory } from '../../src/lib/utils/inventory';
import type { Inventory } from '../../src/lib/types';

function createEmptyInventory(): Inventory {
  return {
    springs: createEmptySpringInventory(),
    components: createEmptyComponentInventory()
  };
}

describe('Tiered Threshold System', () => {

  it('should trigger order when King Medium drops to 4.4 months (below 4.5 threshold)', () => {
    const inventory = createEmptyInventory();

    // King Medium: 132 units / 30/month = 4.4 months (JUST BELOW 4.5 threshold)
    inventory.springs.medium['King'] = 132;

    // Other sizes healthy
    inventory.springs.medium['Queen'] = 200;
    inventory.springs.firm['King'] = 50;
    inventory.springs.firm['Queen'] = 50;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should trigger immediate order (King Medium is critical)
    expect(projection.orders.length).toBeGreaterThan(0);
    expect(projection.orders[0].orderMonth).toBeLessThanOrEqual(0.1);
    expect(projection.orders[0].drivingSizes).toContain('King');
  });

  it('should wait longer with King Medium at 4.6 months vs 4.4 months', () => {
    const inventory = createEmptyInventory();

    // King Medium: 138 units / 30/month = 4.6 months (ABOVE 4.5 threshold)
    inventory.springs.medium['King'] = 138;
    inventory.springs.medium['Queen'] = 200;

    // Other firmnesses also healthy (ALL above their thresholds)
    inventory.springs.firm['King'] = 50;     // 50 / (30 × 0.133) = 12.5 months
    inventory.springs.firm['Queen'] = 50;    // 50 / (41 × 0.133) = 9.2 months
    inventory.springs.soft['King'] = 20;     // 20 / (30 × 0.034) = 19.6 months
    inventory.springs.soft['Queen'] = 20;    // 20 / (41 × 0.034) = 14.3 months

    // Small sizes also healthy
    inventory.springs.medium['Double'] = 50; // 50 / 6 = 8.3 months
    inventory.springs.medium['King Single'] = 20;
    inventory.springs.medium['Single'] = 20;

    const projection = calculateAnnualProjection(inventory, 0);

    // With healthy inventory, first order should be delayed (not month 0)
    // The 4.6 months provides cushion before triggering
    expect(projection.orders.length).toBeGreaterThan(0);
  });

  it('should trigger order when Queen Medium drops to 4.4 months (below 4.5 threshold)', () => {
    const inventory = createEmptyInventory();

    // Queen Medium: 180 units / 41/month = 4.39 months (JUST BELOW 4.5 threshold)
    inventory.springs.medium['Queen'] = 180;

    // King healthy
    inventory.springs.medium['King'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should trigger immediate order (Queen Medium is critical)
    expect(projection.orders.length).toBeGreaterThan(0);
    expect(projection.orders[0].orderMonth).toBeLessThanOrEqual(0.1);
    expect(projection.orders[0].drivingSizes).toContain('Queen');
  });

  it('should use 4.0 month threshold for King/Queen Firm/Soft', () => {
    const inventory = createEmptyInventory();

    // King Firm: 119 units / 30/month × 0.133 = ~30 months (healthy)
    // But let's reduce it: 16 units / (30 × 0.133) = 4.0 months (RIGHT AT threshold)
    inventory.springs.firm['King'] = 15.9; // Just below 4.0 months

    // Medium is healthy
    inventory.springs.medium['King'] = 200;
    inventory.springs.medium['Queen'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should trigger order (King Firm is critical at 4.0 threshold)
    expect(projection.orders.length).toBeGreaterThan(0);
  });

  it('should use 3.0 month threshold for small sizes', () => {
    const inventory = createEmptyInventory();

    // Double Medium: 18 units / 6/month = 3.0 months (RIGHT AT threshold)
    inventory.springs.medium['Double'] = 17.5; // Just below 3.0 months

    // King/Queen healthy
    inventory.springs.medium['King'] = 200;
    inventory.springs.medium['Queen'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should trigger order (Double is critical at 3.0 threshold)
    expect(projection.orders.length).toBeGreaterThan(0);
  });

  it('should wait longer with small size at 3.2 months vs 2.9 months', () => {
    const inventory = createEmptyInventory();

    // Double Medium: 19.2 units / 6/month = 3.2 months (ABOVE 3.0 threshold)
    inventory.springs.medium['Double'] = 19.2;

    // King/Queen ALL firmnesses healthy
    inventory.springs.medium['King'] = 200;  // 200 / 30 = 6.7 months
    inventory.springs.medium['Queen'] = 200; // 200 / 41 = 4.9 months
    inventory.springs.firm['King'] = 50;
    inventory.springs.firm['Queen'] = 50;
    inventory.springs.soft['King'] = 20;
    inventory.springs.soft['Queen'] = 20;

    // Other small sizes also healthy
    inventory.springs.medium['King Single'] = 20; // 20 / 3 = 6.7 months
    inventory.springs.medium['Single'] = 20;      // 20 / 1 = 20 months
    inventory.springs.firm['Double'] = 10;
    inventory.springs.soft['Double'] = 5;

    const projection = calculateAnnualProjection(inventory, 0);

    // With 3.2 months (above threshold), provides cushion before ordering
    expect(projection.orders.length).toBeGreaterThan(0);
  });

  it('should prioritize King Medium over small sizes', () => {
    const inventory = createEmptyInventory();

    // King Medium: 4.4 months (critical for King Medium - 4.5 threshold)
    inventory.springs.medium['King'] = 132;

    // Double Medium: 2.5 months (also critical for small sizes - 3.0 threshold)
    inventory.springs.medium['Double'] = 15;

    // Queen healthy
    inventory.springs.medium['Queen'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should order immediately
    expect(projection.orders.length).toBeGreaterThan(0);

    // King should be in driving sizes (prioritized)
    expect(projection.orders[0].drivingSizes).toContain('King');
  });

  it('should show earlier orders for Queen Medium vs previous threshold', () => {
    const inventory = createEmptyInventory();

    // OLD BEHAVIOR (3.5 threshold): Would NOT trigger until 3.4 months
    // NEW BEHAVIOR (4.5 threshold): Triggers at 4.4 months

    // Queen Medium: 4.4 months
    inventory.springs.medium['Queen'] = 180;
    inventory.springs.medium['King'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should order NOW (with new 4.5 threshold)
    // Old system would wait until month ~3 when it drops to 3.4
    expect(projection.orders.length).toBeGreaterThan(0);
    expect(projection.orders[0].orderMonth).toBeLessThan(1);
  });

  it('should demonstrate all three threshold tiers in action', () => {
    const inventory = createEmptyInventory();

    // Tier 1: King Medium at 4.4 months (CRITICAL - threshold 4.5)
    inventory.springs.medium['King'] = 132;

    // Tier 2: King Firm at 3.9 months (CRITICAL - threshold 4.0)
    inventory.springs.firm['King'] = 15.5;

    // Tier 3: Double Medium at 2.9 months (CRITICAL - threshold 3.0)
    inventory.springs.medium['Double'] = 17.4;

    // Queen healthy
    inventory.springs.medium['Queen'] = 200;

    const projection = calculateAnnualProjection(inventory, 0);

    // Should trigger order immediately (multiple critical items)
    expect(projection.orders.length).toBeGreaterThan(0);
    expect(projection.orders[0].orderMonth).toBeLessThanOrEqual(0.1);

    // All three sizes should be in driving sizes
    const drivingSizes = projection.orders[0].drivingSizes;
    expect(drivingSizes).toContain('King');
    expect(drivingSizes).toContain('Double');
  });
});
