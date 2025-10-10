import { describe, it, expect } from 'vitest';
import { calculateNPlus1Order } from '@/lib/algorithms/nPlusOptimization';
import { calculateComponentOrder } from '@/lib/algorithms/componentCalc';
import type { Inventory, SpringOrder, ComponentOrder } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';
import { MONTHLY_SALES_RATE, COMPONENT_TYPES } from '@/lib/constants';

/**
 * Helper function to calculate months of coverage for springs
 */
function calculateSpringCoverage(
  springInventory: Inventory['springs'],
  springOrder: SpringOrder,
  size: string
): number {
  const currentStock = ['firm', 'medium', 'soft'].reduce(
    (sum, firmness) => sum + (springInventory[firmness][size] || 0),
    0
  );

  const orderedStock = ['firm', 'medium', 'soft'].reduce(
    (sum, firmness) => sum + (springOrder.springs[firmness][size] || 0),
    0
  );

  const totalStock = currentStock + orderedStock;
  const monthlySales = MONTHLY_SALES_RATE[size];

  return monthlySales > 0 ? totalStock / monthlySales : Infinity;
}

/**
 * Helper function to calculate months of coverage for components
 */
function calculateComponentCoverage(
  springInventory: Inventory['springs'],
  springOrder: SpringOrder,
  componentInventory: Inventory['components'],
  componentOrder: ComponentOrder,
  componentId: string,
  size: string
): number {
  // Find component multiplier
  const component = COMPONENT_TYPES.find(c => c.id === componentId);
  if (!component) return 0;

  const currentComponentStock = componentInventory[componentId][size] || 0;
  const orderedComponents = componentOrder[componentId][size] || 0;
  const totalComponentStock = currentComponentStock + orderedComponents;

  const monthlySales = MONTHLY_SALES_RATE[size];
  const componentSalesRate = monthlySales * component.multiplier;

  return componentSalesRate > 0 ? totalComponentStock / componentSalesRate : Infinity;
}

describe('Equal Runway Constraint Validation', () => {

  // ====================================================================
  // BASIC EQUAL RUNWAY TESTS
  // ====================================================================

  it('springs and components have equal runway after ordering (King only)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const feltCoverage = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    // They should be within 0.1 months of each other
    expect(Math.abs(springCoverage - feltCoverage)).toBeLessThan(0.1);
  });

  it('springs and micro coils have equal runway (1.5x multiplier)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const microCoilCoverage = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'micro_coils',
      'King'
    );

    // Should be equal (both deplete at same rate)
    expect(Math.abs(springCoverage - microCoilCoverage)).toBeLessThan(0.1);
  });

  it('all King components have equal runway to springs', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');

    // Test all applicable components for King
    const kingComponents = ['felt', 'top_panel', 'bottom_panel', 'side_panel', 'micro_coils', 'thin_latex'];

    kingComponents.forEach(compId => {
      const compCoverage = calculateComponentCoverage(
        inventory.springs,
        springOrder,
        inventory.components,
        componentOrder,
        compId,
        'King'
      );

      expect(Math.abs(springCoverage - compCoverage)).toBeLessThan(0.1);
    });
  });

  it('all Queen components have equal runway to springs', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 0, Queen: 150, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'Queen');

    const queenComponents = ['felt', 'top_panel', 'bottom_panel', 'side_panel', 'micro_coils', 'thin_latex'];

    queenComponents.forEach(compId => {
      const compCoverage = calculateComponentCoverage(
        inventory.springs,
        springOrder,
        inventory.components,
        componentOrder,
        compId,
        'Queen'
      );

      expect(Math.abs(springCoverage - compCoverage)).toBeLessThan(0.1);
    });
  });

  it('small size components have equal runway to springs (excluding micro coils)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 0, Queen: 0, Double: 10, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'Double');

    // Double doesn't get micro coils or thin latex (King/Queen only)
    const doubleComponents = ['felt', 'top_panel', 'bottom_panel'];

    doubleComponents.forEach(compId => {
      const compCoverage = calculateComponentCoverage(
        inventory.springs,
        springOrder,
        inventory.components,
        componentOrder,
        compId,
        'Double'
      );

      expect(Math.abs(springCoverage - compCoverage)).toBeLessThan(0.1);
    });
  });

  // ====================================================================
  // EDGE CASE EQUAL RUNWAY TESTS
  // ====================================================================

  it('equal runway maintained with zero spring inventory', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(), // All zeros!
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(8, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const feltCoverage = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    expect(Math.abs(springCoverage - feltCoverage)).toBeLessThan(0.1);
  });

  it('equal runway maintained with existing component inventory', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: {
        ...createEmptyComponentInventory(),
        felt: { King: 50, Queen: 0, Double: 0, 'King Single': 0, Single: 0 } // Partial felt inventory
      }
    };

    const springOrder = calculateNPlus1Order(6, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const feltCoverage = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    // Even with existing felt inventory, runway should match
    expect(Math.abs(springCoverage - feltCoverage)).toBeLessThan(0.1);
  });

  it('equal runway with mixed firmness distribution', () => {
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

    const springCoverage = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const feltCoverage = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    expect(Math.abs(springCoverage - feltCoverage)).toBeLessThan(0.1);
  });

  it('equal runway across all sizes in full container order', () => {
    const inventory: Inventory = {
      springs: {
        firm: { King: 20, Queen: 30, Double: 5, 'King Single': 2, Single: 1 },
        medium: { King: 100, Queen: 120, Double: 10, 'King Single': 5, Single: 2 },
        soft: { King: 5, Queen: 10, Double: 1, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(10, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Check King
    const kingSprings = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const kingFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );
    expect(Math.abs(kingSprings - kingFelt)).toBeLessThan(0.1);

    // Check Queen
    const queenSprings = calculateSpringCoverage(inventory.springs, springOrder, 'Queen');
    const queenFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'Queen'
    );
    expect(Math.abs(queenSprings - queenFelt)).toBeLessThan(0.1);

    // Check Double
    const doubleSprings = calculateSpringCoverage(inventory.springs, springOrder, 'Double');
    const doubleFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'Double'
    );
    expect(Math.abs(doubleSprings - doubleFelt)).toBeLessThan(0.1);
  });

  // ====================================================================
  // STRESS TESTS
  // ====================================================================

  it('equal runway at minimum container size (4 pallets)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 50, Queen: 60, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(4, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const kingSprings = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const kingFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    expect(Math.abs(kingSprings - kingFelt)).toBeLessThan(0.1);
  });

  it('equal runway at maximum container size (12 pallets)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 10, Queen: 20, Double: 5, 'King Single': 2, Single: 1 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(12, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    const kingSprings = calculateSpringCoverage(inventory.springs, springOrder, 'King');
    const kingFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King'
    );

    expect(Math.abs(kingSprings - kingFelt)).toBeLessThan(0.1);
  });

  it('equal runway when critical small size receives pallet (N+1)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: { King: 100, Queen: 150, Double: 5, 'King Single': 50, Single: 20 }
      },
      components: createEmptyComponentInventory()
    };

    const springOrder = calculateNPlus1Order(8, inventory);
    const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

    // Double is critical and gets a pallet
    expect(springOrder.metadata.critical_sizes).toContain('Double');

    const doubleSprings = calculateSpringCoverage(inventory.springs, springOrder, 'Double');
    const doubleFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'Double'
    );

    expect(Math.abs(doubleSprings - doubleFelt)).toBeLessThan(0.1);
  });

  it('equal runway when two critical small sizes receive pallets (N+2)', () => {
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

    // Check Double
    const doubleSprings = calculateSpringCoverage(inventory.springs, springOrder, 'Double');
    const doubleFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'Double'
    );
    expect(Math.abs(doubleSprings - doubleFelt)).toBeLessThan(0.1);

    // Check King Single
    const ksSprings = calculateSpringCoverage(inventory.springs, springOrder, 'King Single');
    const ksFelt = calculateComponentCoverage(
      inventory.springs,
      springOrder,
      inventory.components,
      componentOrder,
      'felt',
      'King Single'
    );
    expect(Math.abs(ksSprings - ksFelt)).toBeLessThan(0.1);
  });
});
