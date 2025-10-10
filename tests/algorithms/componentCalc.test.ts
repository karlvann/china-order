import { describe, it, expect } from 'vitest';
import { calculateComponentOrder } from '@/lib/algorithms/componentCalc';
import type { SpringOrder, Inventory } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';

describe('Algorithm 5: Component Calculation', () => {

  // ====================================================================
  // CORE FORMULA TESTS
  // ====================================================================

  it('calculates components based on total spring stock (current + ordered)', () => {
    const springInventory = {
      ...createEmptySpringInventory(),
      medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 180, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }, // 6 pallets
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 6,
        total_springs: 180,
        king_pallets: 6,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 6,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Total King springs = 100 (current) + 180 (ordered) = 280
    // Expected component orders (with 0 current component inventory):
    // - Felt: 280 × 1.0 = 280
    // - Top Panel: 280 × 1.0 = 280
    // - Bottom Panel: 280 × 1.0 = 280
    // - Side Panel: 280 × 1.0 = 280
    // - Micro Coils: 280 × 1.5 = 420
    // - Thin Latex: 280 × 1.5 = 420

    expect(componentOrder['felt']['King']).toBe(280);
    expect(componentOrder['top_panel']['King']).toBe(280);
    expect(componentOrder['bottom_panel']['King']).toBe(280);
    expect(componentOrder['side_panel']['King']).toBe(280);
    expect(componentOrder['micro_coils']['King']).toBe(420);
    expect(componentOrder['thin_latex']['King']).toBe(420);
  });

  it('subtracts existing component inventory correctly', () => {
    const springInventory = {
      ...createEmptySpringInventory(),
      medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 180, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 6,
        total_springs: 180,
        king_pallets: 6,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 6,
        mixed_pallets: 0
      }
    };

    const componentInventory = {
      ...createEmptyComponentInventory(),
      felt: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    };

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Total King springs = 100 + 180 = 280
    // Target felt = 280 × 1.0 = 280
    // Current felt = 100
    // Order needed = 280 - 100 = 180
    expect(componentOrder['felt']['King']).toBe(180);
  });

  it('never orders negative quantities (floor at 0)', () => {
    const springInventory = {
      ...createEmptySpringInventory(),
      medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 50, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 2,
        total_springs: 60,
        king_pallets: 2,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 2,
        mixed_pallets: 0
      }
    };

    // Excess component inventory (more than target)
    const componentInventory = {
      ...createEmptyComponentInventory(),
      felt: { King: 500, Queen: 0, Double: 0, 'King Single': 0, Single: 0 } // Way more than needed!
    };

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Total springs = 150, target felt = 150, current = 500
    // Order = max(0, 150 - 500) = 0
    expect(componentOrder['felt']['King']).toBe(0);
  });

  // ====================================================================
  // CONSOLIDATION RULE TESTS
  // ====================================================================

  it('does NOT order micro coils for small sizes (King/Queen only)', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 0, Queen: 0, Double: 30, 'King Single': 30, Single: 30 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 3,
        total_springs: 90,
        king_pallets: 0,
        queen_pallets: 0,
        small_size_pallets: 3,
        critical_sizes: ['Double', 'King Single', 'Single'],
        pure_pallets: 3,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Micro coils should be 0 for all small sizes
    expect(componentOrder['micro_coils']['Double']).toBe(0);
    expect(componentOrder['micro_coils']['King Single']).toBe(0);
    expect(componentOrder['micro_coils']['Single']).toBe(0);

    // Same for thin latex
    expect(componentOrder['thin_latex']['Double']).toBe(0);
    expect(componentOrder['thin_latex']['King Single']).toBe(0);
    expect(componentOrder['thin_latex']['Single']).toBe(0);
  });

  it('orders micro coils for King and Queen only', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 90, Queen: 90, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 6,
        total_springs: 180,
        king_pallets: 3,
        queen_pallets: 3,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 6,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Micro coils = 90 × 1.5 = 135 for each
    expect(componentOrder['micro_coils']['King']).toBe(135);
    expect(componentOrder['micro_coils']['Queen']).toBe(135);
    expect(componentOrder['thin_latex']['King']).toBe(135);
    expect(componentOrder['thin_latex']['Queen']).toBe(135);
  });

  it('consolidates side panels: Single + King Single → Double', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 0, Queen: 0, Double: 30, 'King Single': 30, Single: 30 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 3,
        total_springs: 90,
        king_pallets: 0,
        queen_pallets: 0,
        small_size_pallets: 3,
        critical_sizes: ['Double', 'King Single', 'Single'],
        pure_pallets: 3,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Side panels:
    // - Double needs: 30
    // - King Single needs: 30 → added to Double
    // - Single needs: 30 → added to Double
    // Total Double side panels = 30 + 30 + 30 = 90
    expect(componentOrder['side_panel']['Double']).toBe(90);
    expect(componentOrder['side_panel']['King Single']).toBe(0);
    expect(componentOrder['side_panel']['Single']).toBe(0);
  });

  // ====================================================================
  // EDGE CASE TESTS
  // ====================================================================

  it('handles zero spring inventory', () => {
    const springInventory = createEmptySpringInventory(); // All zeros

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 180, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 6,
        total_springs: 180,
        king_pallets: 6,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 6,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Total springs = 0 + 180 = 180
    // Components should be based on 180 springs
    expect(componentOrder['felt']['King']).toBe(180);
    expect(componentOrder['micro_coils']['King']).toBe(270); // 180 × 1.5
  });

  it('handles zero spring order (no container ordered)', () => {
    const springInventory = {
      ...createEmptySpringInventory(),
      medium: { King: 200, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
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

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Total springs = 200 + 0 = 200
    // Components should match current inventory
    expect(componentOrder['felt']['King']).toBe(200);
    expect(componentOrder['micro_coils']['King']).toBe(300); // 200 × 1.5
  });

  it('handles all firmnesses combined for component calculation', () => {
    const springInventory = {
      firm: { King: 40, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      medium: { King: 250, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      soft: { King: 10, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 26, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 166, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 8, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 6,
        total_springs: 200,
        king_pallets: 6,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 3,
        mixed_pallets: 3
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // Current total: 40 + 250 + 10 = 300
    // Ordered total: 26 + 166 + 8 = 200
    // Grand total: 500
    expect(componentOrder['felt']['King']).toBe(500);
    expect(componentOrder['micro_coils']['King']).toBe(750); // 500 × 1.5
  });

  it('handles mixed King/Queen/Small order', () => {
    const springInventory = {
      firm: { King: 20, Queen: 30, Double: 10, 'King Single': 5, Single: 3 },
      medium: { King: 100, Queen: 120, Double: 15, 'King Single': 8, Single: 5 },
      soft: { King: 5, Queen: 10, Double: 2, 'King Single': 1, Single: 1 }
    };

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 13, Queen: 12, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 83, Queen: 82, Double: 30, 'King Single': 0, Single: 0 },
        soft: { King: 4, Queen: 6, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 8,
        total_springs: 230,
        king_pallets: 3,
        queen_pallets: 4,
        small_size_pallets: 1,
        critical_sizes: ['Double'],
        pure_pallets: 6,
        mixed_pallets: 2
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // King: current = 125, ordered = 100, total = 225
    expect(componentOrder['felt']['King']).toBe(225);
    expect(componentOrder['micro_coils']['King']).toBe(338); // ceil(225 × 1.5) = 338

    // Queen: current = 160, ordered = 100, total = 260
    expect(componentOrder['felt']['Queen']).toBe(260);
    expect(componentOrder['micro_coils']['Queen']).toBe(390); // 260 × 1.5

    // Double: current = 27, ordered = 30, total = 57
    expect(componentOrder['felt']['Double']).toBe(57);
    expect(componentOrder['micro_coils']['Double']).toBe(0); // Small size - no micro coils!
  });

  // ====================================================================
  // MULTIPLIER TESTS
  // ====================================================================

  it('applies 1.0x multiplier for felt, panels', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 3,
        total_springs: 100,
        king_pallets: 3,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 3,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // 1.0x multiplier components
    expect(componentOrder['felt']['King']).toBe(100);
    expect(componentOrder['top_panel']['King']).toBe(100);
    expect(componentOrder['bottom_panel']['King']).toBe(100);
    expect(componentOrder['side_panel']['King']).toBe(100);
  });

  it('applies 1.5x multiplier for micro coils and thin latex', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 100, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 3,
        total_springs: 100,
        king_pallets: 3,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 3,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // 1.5x multiplier components (ceiling applied)
    expect(componentOrder['micro_coils']['King']).toBe(150);
    expect(componentOrder['thin_latex']['King']).toBe(150);
  });

  it('rounds up fractional component quantities (Math.ceil)', () => {
    const springInventory = createEmptySpringInventory();

    const springOrder: SpringOrder = {
      pallets: [],
      springs: {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 101, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }, // Odd number
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      metadata: {
        total_pallets: 3,
        total_springs: 101,
        king_pallets: 3,
        queen_pallets: 0,
        small_size_pallets: 0,
        critical_sizes: [],
        pure_pallets: 3,
        mixed_pallets: 0
      }
    };

    const componentInventory = createEmptyComponentInventory();

    const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);

    // 101 × 1.5 = 151.5 → ceil to 152
    expect(componentOrder['micro_coils']['King']).toBe(152);
    expect(componentOrder['thin_latex']['King']).toBe(152);
  });
});
