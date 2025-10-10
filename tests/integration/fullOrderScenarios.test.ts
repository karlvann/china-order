import { describe, it, expect } from 'vitest';
import { calculateNPlus1Order } from '@/lib/algorithms/nPlusOptimization';
import { calculateComponentOrder } from '@/lib/algorithms/componentCalc';
import { optimizeComponentOrder } from '@/lib/algorithms/exportOptimization';
import type { Inventory } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';
import { MONTHLY_SALES_RATE } from '@/lib/constants';

/**
 * Integration tests that run complete scenarios through the entire system:
 * Spring Inventory → Spring Order → Component Order → Export Optimization
 */

describe('Integration: Full Order Scenarios', () => {

  // ====================================================================
  // SCENARIO 1: STARTUP (Zero Inventory)
  // ====================================================================

  describe('Scenario: Business Startup (Zero Inventory)', () => {
    it('handles first container order with all zeros', () => {
      const inventory: Inventory = {
        springs: createEmptySpringInventory(),
        components: createEmptyComponentInventory()
      };

      // Order 8 pallets
      const springOrder = calculateNPlus1Order(8, inventory);

      // Validate spring order
      expect(springOrder.metadata.total_pallets).toBe(8);
      expect(springOrder.metadata.total_springs).toBe(240); // 8 × 30

      // When ALL sizes are at zero, small sizes ARE critical (below 4 month threshold)
      // So the algorithm allocates pallets to them (N+2 or N+3 scenario)
      expect(springOrder.metadata.small_size_pallets).toBeGreaterThan(0);
      expect(springOrder.metadata.critical_sizes.length).toBeGreaterThan(0);

      // Calculate components
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Verify components ordered for sizes that received pallets
      const totalKingSprings = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;
      const totalQueenSprings = springOrder.springs.firm.Queen + springOrder.springs.medium.Queen + springOrder.springs.soft.Queen;

      if (totalKingSprings > 0) {
        expect(componentOrder['felt']['King']).toBeGreaterThan(0);
        expect(componentOrder['micro_coils']['King']).toBe(Math.ceil(totalKingSprings * 1.5));
      }

      if (totalQueenSprings > 0) {
        expect(componentOrder['felt']['Queen']).toBeGreaterThan(0);
        expect(componentOrder['micro_coils']['Queen']).toBe(Math.ceil(totalQueenSprings * 1.5));
      }

      // Optimize for export
      const optimized = optimizeComponentOrder(componentOrder, 'optimized');
      expect(optimized).toBeDefined();
    });

    it('provides reasonable coverage when starting from zero', () => {
      const inventory: Inventory = {
        springs: createEmptySpringInventory(),
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(8, inventory);

      const totalKingSprings = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;
      const totalQueenSprings = springOrder.springs.firm.Queen + springOrder.springs.medium.Queen + springOrder.springs.soft.Queen;

      // With 8 pallets and all sizes critical, coverage will be distributed
      // Just verify we get SOME coverage (not zero)
      if (totalKingSprings > 0) {
        const kingCoverage = totalKingSprings / MONTHLY_SALES_RATE['King'];
        expect(kingCoverage).toBeGreaterThan(0);
      }

      if (totalQueenSprings > 0) {
        const queenCoverage = totalQueenSprings / MONTHLY_SALES_RATE['Queen'];
        expect(queenCoverage).toBeGreaterThan(0);
      }
    });
  });

  // ====================================================================
  // SCENARIO 2: NORMAL RESTOCK (Mid-season)
  // ====================================================================

  describe('Scenario: Normal Restock (Mid-season)', () => {
    it('handles typical mid-season inventory restock', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 55, Double: 30, 'King Single': 15, Single: 8 },
          medium: { King: 250, Queen: 340, Double: 100, 'King Single': 50, Single: 20 },
          soft: { King: 10, Queen: 14, Double: 10, 'King Single': 5, Single: 2 }
        },
        components: {
          ...createEmptyComponentInventory(),
          felt: { King: 280, Queen: 390, Double: 120, 'King Single': 60, Single: 25 },
          micro_coils: { King: 450, Queen: 615, Double: 0, 'King Single': 0, Single: 0 }
        }
      };

      const springOrder = calculateNPlus1Order(8, inventory);

      // Verify order structure
      expect(springOrder.metadata.total_pallets).toBe(8);
      expect(springOrder.pallets).toHaveLength(8);

      // Should be N+0 (all sizes healthy)
      expect(springOrder.metadata.small_size_pallets).toBe(0);

      // Calculate components
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Optimize
      const optimized = optimizeComponentOrder(componentOrder, 'optimized');
      expect(optimized).toBeDefined();
    });
  });

  // ====================================================================
  // SCENARIO 3: CRITICAL STOCKOUT (Double size low)
  // ====================================================================

  describe('Scenario: Critical Stockout (Small Size)', () => {
    it('allocates pallet to critical Double size (N+1)', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 55, Double: 2, 'King Single': 15, Single: 8 },
          medium: { King: 250, Queen: 340, Double: 3, 'King Single': 50, Single: 20 },
          soft: { King: 10, Queen: 14, Double: 0, 'King Single': 5, Single: 2 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(8, inventory);

      // Should be N+1 (one critical small size)
      expect(springOrder.metadata.small_size_pallets).toBe(1);
      expect(springOrder.metadata.critical_sizes).toContain('Double');

      // Double should receive springs
      const totalDoubleSprings = springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
      expect(totalDoubleSprings).toBeGreaterThan(0);

      // Components calculated
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Double components ordered (excluding micro coils)
      expect(componentOrder['felt']['Double']).toBeGreaterThan(0);
      expect(componentOrder['micro_coils']['Double']).toBe(0); // Small size - no micro coils
    });

    it('equal runway maintained for critical size after pallet allocation', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 55, Double: 1, 'King Single': 15, Single: 8 },
          medium: { King: 250, Queen: 340, Double: 2, 'King Single': 50, Single: 20 },
          soft: { King: 10, Queen: 14, Double: 0, 'King Single': 5, Single: 2 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(8, inventory);
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Calculate Double coverage after order
      const currentDoubleSprings = 1 + 2 + 0; // 3 total
      const orderedDoubleSprings = springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
      const totalDoubleSprings = currentDoubleSprings + orderedDoubleSprings;
      const doubleSpringCoverage = totalDoubleSprings / MONTHLY_SALES_RATE['Double'];

      // Calculate Double felt coverage
      const currentDoubleFelt = 0;
      const orderedDoubleFelt = componentOrder['felt']['Double'];
      const totalDoubleFelt = currentDoubleFelt + orderedDoubleFelt;
      const doubleFeltCoverage = totalDoubleFelt / MONTHLY_SALES_RATE['Double'];

      // Should match within 0.1 months
      expect(Math.abs(doubleSpringCoverage - doubleFeltCoverage)).toBeLessThan(0.1);
    });
  });

  // ====================================================================
  // SCENARIO 4: MULTIPLE CRITICAL SIZES (N+2)
  // ====================================================================

  describe('Scenario: Multiple Critical Sizes', () => {
    it('allocates 2 pallets to 2 critical small sizes (N+2)', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 55, Double: 1, 'King Single': 2, Single: 8 },
          medium: { King: 250, Queen: 340, Double: 2, 'King Single': 3, Single: 20 },
          soft: { King: 10, Queen: 14, Double: 0, 'King Single': 0, Single: 2 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(10, inventory);

      // Should be N+2
      expect(springOrder.metadata.small_size_pallets).toBe(2);
      expect(springOrder.metadata.critical_sizes).toHaveLength(2);

      // Both should receive pallets
      const totalDoubleSprings = springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
      const totalKSSprings = springOrder.springs.firm['King Single'] + springOrder.springs.medium['King Single'] + springOrder.springs.soft['King Single'];

      expect(totalDoubleSprings).toBeGreaterThan(0);
      expect(totalKSSprings).toBeGreaterThan(0);

      // Components calculated
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Both sizes get components
      expect(componentOrder['felt']['Double']).toBeGreaterThan(0);
      expect(componentOrder['felt']['King Single']).toBeGreaterThan(0);
    });
  });

  // ====================================================================
  // SCENARIO 5: POST-BUSY SEASON (High inventory)
  // ====================================================================

  describe('Scenario: Post-Busy Season (High Inventory)', () => {
    it('skips small sizes when all have healthy coverage (N+0)', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 10, Queen: 15, Double: 80, 'King Single': 40, Single: 18 },
          medium: { King: 80, Queen: 110, Double: 250, 'King Single': 125, Single: 60 },
          soft: { King: 5, Queen: 7, Double: 20, 'King Single': 10, Single: 4 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(8, inventory);

      // Should be N+0 (all small sizes healthy)
      expect(springOrder.metadata.small_size_pallets).toBe(0);
      expect(springOrder.metadata.critical_sizes).toHaveLength(0);

      // All pallets to King/Queen
      expect(springOrder.metadata.king_pallets + springOrder.metadata.queen_pallets).toBe(8);

      // Small sizes get no new springs
      expect(springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double).toBe(0);
      expect(springOrder.springs.firm['King Single'] + springOrder.springs.medium['King Single'] + springOrder.springs.soft['King Single']).toBe(0);
      expect(springOrder.springs.firm.Single + springOrder.springs.medium.Single + springOrder.springs.soft.Single).toBe(0);
    });
  });

  // ====================================================================
  // SCENARIO 6: QUEEN PRIORITY (Queen lower coverage)
  // ====================================================================

  describe('Scenario: Queen Priority (Lower Coverage)', () => {
    it('allocates 60% to Queen when it has lower coverage', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 10, Double: 100, 'King Single': 50, Single: 20 },
          medium: { King: 250, Queen: 80, Double: 150, 'King Single': 75, Single: 30 },
          soft: { King: 10, Queen: 5, Double: 20, 'King Single': 10, Single: 5 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(10, inventory);

      // Queen has lower coverage → should get 60% (6 pallets)
      // King gets 40% (4 pallets)
      expect(springOrder.metadata.queen_pallets).toBe(6);
      expect(springOrder.metadata.king_pallets).toBe(4);
    });

    it('allocates 60% to King when it has lower coverage', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 10, Queen: 40, Double: 100, 'King Single': 50, Single: 20 },
          medium: { King: 80, Queen: 250, Double: 150, 'King Single': 75, Single: 30 },
          soft: { King: 5, Queen: 10, Double: 20, 'King Single': 10, Single: 5 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(10, inventory);

      // King has lower coverage → should get 60% (6 pallets)
      // Queen gets 40% (4 pallets)
      expect(springOrder.metadata.king_pallets).toBe(6);
      expect(springOrder.metadata.queen_pallets).toBe(4);
    });
  });

  // ====================================================================
  // SCENARIO 7: MINIMUM CONTAINER (4 pallets)
  // ====================================================================

  describe('Scenario: Minimum Container Size', () => {
    it('handles 4-pallet container efficiently', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 55, Double: 30, 'King Single': 15, Single: 8 },
          medium: { King: 250, Queen: 340, Double: 100, 'King Single': 50, Single: 20 },
          soft: { King: 10, Queen: 14, Double: 10, 'King Single': 5, Single: 2 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(4, inventory);

      expect(springOrder.metadata.total_pallets).toBe(4);
      expect(springOrder.metadata.total_springs).toBe(120);
      expect(springOrder.pallets).toHaveLength(4);

      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);
      expect(componentOrder).toBeDefined();
    });
  });

  // ====================================================================
  // SCENARIO 8: MAXIMUM CONTAINER (12 pallets)
  // ====================================================================

  describe('Scenario: Maximum Container Size', () => {
    it('handles 12-pallet container efficiently', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 5, Queen: 8, Double: 2, 'King Single': 1, Single: 1 },
          medium: { King: 40, Queen: 60, Double: 5, 'King Single': 3, Single: 2 },
          soft: { King: 2, Queen: 3, Double: 0, 'King Single': 0, Single: 0 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(12, inventory);

      expect(springOrder.metadata.total_pallets).toBe(12);
      expect(springOrder.metadata.total_springs).toBe(360);
      expect(springOrder.pallets).toHaveLength(12);

      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);
      expect(componentOrder).toBeDefined();
    });
  });

  // ====================================================================
  // SCENARIO 9: SIDE PANEL CONSOLIDATION
  // ====================================================================

  describe('Scenario: Side Panel Consolidation', () => {
    it('consolidates Single + King Single side panels into Double', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 0, Queen: 0, Double: 1, 'King Single': 1, Single: 1 },
          medium: { King: 0, Queen: 0, Double: 5, 'King Single': 5, Single: 5 },
          soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
        },
        components: createEmptyComponentInventory()
      };

      const springOrder = calculateNPlus1Order(6, inventory);
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // All three sizes are critical, should each get a pallet
      const totalDoubleSprings = 1 + 5 + 0 + springOrder.springs.firm.Double + springOrder.springs.medium.Double + springOrder.springs.soft.Double;
      const totalKSSprings = 1 + 5 + 0 + springOrder.springs.firm['King Single'] + springOrder.springs.medium['King Single'] + springOrder.springs.soft['King Single'];
      const totalSingleSprings = 1 + 5 + 0 + springOrder.springs.firm.Single + springOrder.springs.medium.Single + springOrder.springs.soft.Single;

      // Expected side panels:
      // Double gets: its own + King Single's + Single's
      const expectedDoubleSidePanels = totalDoubleSprings + totalKSSprings + totalSingleSprings;

      expect(componentOrder['side_panel']['Double']).toBe(expectedDoubleSidePanels);
      expect(componentOrder['side_panel']['King Single']).toBe(0);
      expect(componentOrder['side_panel']['Single']).toBe(0);
    });
  });

  // ====================================================================
  // SCENARIO 10: COMPONENT INVENTORY ALREADY EXISTS
  // ====================================================================

  describe('Scenario: Existing Component Inventory', () => {
    it('accounts for existing component inventory when ordering', () => {
      const inventory: Inventory = {
        springs: {
          firm: { King: 40, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
          medium: { King: 250, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
          soft: { King: 10, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
        },
        components: {
          ...createEmptyComponentInventory(),
          felt: { King: 200, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
          micro_coils: { King: 300, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
        }
      };

      const springOrder = calculateNPlus1Order(6, inventory);
      const componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);

      // Current King springs: 300
      // Ordered King springs: ~180
      // Total: 480
      // Target felt: 480
      // Current felt: 200
      // Order needed: 280

      const currentSprings = 40 + 250 + 10; // 300
      const orderedSprings = springOrder.springs.firm.King + springOrder.springs.medium.King + springOrder.springs.soft.King;
      const totalSprings = currentSprings + orderedSprings;

      const targetFelt = totalSprings;
      const currentFelt = 200;
      const expectedFeltOrder = targetFelt - currentFelt;

      expect(componentOrder['felt']['King']).toBe(expectedFeltOrder);
    });
  });
});
