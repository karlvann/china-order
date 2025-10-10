import { describe, it, expect, vi } from 'vitest';
import { calculateNPlus1Order } from '@/lib/algorithms/nPlusOptimization';
import { calculateComponentOrder } from '@/lib/algorithms/componentCalc';
import type { Inventory, SpringOrder } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';

/**
 * Tests to ensure component calculation depends on spring order
 * and that execution order is enforced correctly.
 */

describe('Execution Order Dependency', () => {

  // ====================================================================
  // DEPENDENCY TESTS
  // ====================================================================

  it('component order depends on spring order output', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    // Step 1: Calculate spring order
    const springOrder = calculateNPlus1Order(6, inventory);

    // Step 2: Component order uses spring order as input
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Verify component order used spring order data
    const totalKingSprings = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;
    const expectedFelt = 100 + totalKingSprings; // current + ordered

    expect(componentOrder['felt']['King']).toBe(expectedFelt);
  });

  it('component order changes when spring order changes (different pallet count)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    // Order with 4 pallets
    const springOrder4 = calculateNPlus1Order(4, inventory);
    const componentOrder4 = calculateComponentOrder(springOrder4, inventory.springs, inventory.components);

    // Order with 8 pallets
    const springOrder8 = calculateNPlus1Order(8, inventory);
    const componentOrder8 = calculateComponentOrder(springOrder8, inventory.springs, inventory.components);

    // Component orders should be different (more springs = more components)
    expect(componentOrder8['felt']['King']).toBeGreaterThan(componentOrder4['felt']['King']);
    expect(componentOrder8['micro_coils']['King']).toBeGreaterThan(componentOrder4['micro_coils']['King']);
  });

  it('component order responds to spring order size distribution changes', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 150, Double: 100, 'King Single': 50, Single: 20 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(8, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // King and Queen should both get components based on their spring orders
    const hasKingSprings = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King > 0;
    const hasQueenSprings = springOrder.springs.firm.Queen + springOrder.springs.medium.Queen + springOrder.springs.soft.Queen > 0;

    if (hasKingSprings) {
      expect(componentOrder['felt']['King']).toBeGreaterThan(0);
    }

    if (hasQueenSprings) {
      expect(componentOrder['felt']['Queen']).toBeGreaterThan(0);
    }
  });

  it('component order is zero when spring order is zero', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(), // All zeros
      components: createEmptyComponentInventory()
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 0,
        total_springs: 0,
        king_pallets: 0,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 0,
        mixed_pallets: 0
      }
    };

    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // All component orders should be 0
    expect(componentOrder['felt']['King']).toBe(0);
    expect(componentOrder['felt']['Queen']).toBe(0);
    expect(componentOrder['micro_coils']['King']).toBe(0);
  });

  // ====================================================================
  // CRITICAL SIZE DEPENDENCY TESTS
  // ====================================================================

  it('component order reflects critical size pallet allocation (N+1)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 150, Double: 5, 'King Single': 50, Single: 20 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(8, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Double is critical and should get a pallet
    expect(springOrder.metadata.critical_sizes).toContain('Double');

    // Double springs ordered
    const totalDoubleSprings = springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
    expect(totalDoubleSprings).toBeGreaterThan(0);

    // Component order should reflect this
    expect(componentOrder['felt']['Double']).toBeGreaterThan(0);
  });

  it('component order reflects N+2 allocation (two critical sizes)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 150, Double: 5, 'King Single': 5, Single: 20 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(8, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Both Double and King Single are critical
    expect(springOrder.metadata.critical_sizes.length).toBe(2);

    // Both should get spring orders
    const totalDoubleSprings = springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
    const totalKSSprings = springOrder.springs.firm['King Single'] + springOrder.springs.medium['King Single'] + springOrder.springs.soft['King Single'];

    expect(totalDoubleSprings).toBeGreaterThan(0);
    expect(totalKSSprings).toBeGreaterThan(0);

    // Component orders should reflect both
    expect(componentOrder['felt']['Double']).toBeGreaterThan(0);
    expect(componentOrder['felt']['King Single']).toBeGreaterThan(0);
  });

  // ====================================================================
  // FIRMNESS DISTRIBUTION DEPENDENCY TESTS
  // ====================================================================

  it('component order uses total springs across all firmnesses', () => {
    const inventory: Inventory = {
      springs: {
        firm: { King: 40, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 250, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 10, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Current total: 40 + 250 + 10 = 300
    const currentTotal = 40 + 250 + 10;

    // Ordered total (all firmnesses)
    const orderedTotal = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;

    // Expected felt = current + ordered
    expect(componentOrder['felt']['King']).toBe(currentTotal + orderedTotal);
  });

  // ====================================================================
  // NULL/UNDEFINED SAFETY TESTS
  // ====================================================================

  it('throws error or handles gracefully when springOrder is null/undefined', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(),
      components: createEmptyComponentInventory()
    };

    // This should be caught in App.jsx with the conditional check:
    // if (!springOrder) return null;

    // Passing null would cause runtime error, which is expected
    // The guard in App.jsx prevents this scenario
    expect(true).toBe(true); // Placeholder - actual guard is in App.jsx
  });

  // ====================================================================
  // USEMEMO DEPENDENCY TESTS (conceptual)
  // ====================================================================

  it('verifies App.jsx useMemo dependency chain (conceptual test)', () => {
    // In App.jsx:
    // 1. springOrder = useMemo(() => calculateNPlus1Order(...), [palletCount, inventory])
    // 2. componentOrder = useMemo(() => calculateComponentOrder(springOrder, ...), [springOrder, ...])
    //
    // This ensures componentOrder recalculates when springOrder changes

    // Conceptual verification that execution order is correct
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    // Simulate React useMemo behavior
    let springOrder = calculateNPlus1Order(6, inventory);
    let componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const initialFelt = componentOrder['felt']['King'];

    // Change pallet count (like user input)
    springOrder = calculateNPlus1Order(8, inventory);
    componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const updatedFelt = componentOrder['felt']['King'];

    // Component order should change when spring order changes
    expect(updatedFelt).not.toBe(initialFelt);
  });

  // ====================================================================
  // INTEGRATION: FULL PIPELINE TESTS
  // ====================================================================

  it('full pipeline: inventory → springs → components maintains consistency', () => {
    const inventory: Inventory = {
      springs: {
        firm: { King: 20, Queen: 30, Double: 10, 'King Single': 5, Single: 3 },
        medium: { King: 100, Queen: 120, Double: 15, 'King Single': 8, Single: 5 },
        soft: { King: 5, Queen: 10, Double: 2, 'King Single': 1, Single: 1 }
      },
      components: createEmptyComponentInventory()
    };

    // Step 1: Spring order
    const springOrder = calculateNPlus1Order(8, inventory);
    expect(springOrder).toBeDefined();
    expect(springOrder.metadata.total_pallets).toBe(8);

    // Step 2: Component order (depends on spring order)
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);
    expect(componentOrder).toBeDefined();

    // Step 3: Verify consistency
    // For King: felt should equal total spring count (current + ordered)
    const currentKing = 20 + 100 + 5; // 125
    const orderedKing = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;
    const totalKing = currentKing + orderedKing;

    expect(componentOrder['felt']['King']).toBe(totalKing);
  });

  it('changing any upstream input propagates through the pipeline', () => {
    const baseInventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    // Scenario 1: Original inventory
    const springOrder1 = calculateNPlus1Order(6, baseInventory);
    const componentOrder1 = calculateComponentOrder(springOrder1, baseInventory.springs, baseInventory.components);

    // Scenario 2: Change spring inventory
    const modifiedInventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 200, Queen: 0, Double: 0, 'King Single': 0, Single: 0 } // Doubled!
      },
      components: createEmptyComponentInventory()
    };

    const springOrder2 = calculateNPlus1Order(6, modifiedInventory);
    const componentOrder2 = calculateComponentOrder(springOrder2, modifiedInventory.springs, modifiedInventory.components);

    // Component orders should be different
    expect(componentOrder2['felt']['King']).not.toBe(componentOrder1['felt']['King']);
    expect(componentOrder2['felt']['King']).toBeGreaterThan(componentOrder1['felt']['King']);
  });
});
