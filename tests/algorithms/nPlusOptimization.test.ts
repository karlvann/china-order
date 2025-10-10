import { describe, it, expect } from 'vitest';
import { calculateNPlus1Order } from '@/lib/algorithms/nPlusOptimization';
import type { Inventory } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';

describe('Algorithm 4: N+ Pallet Optimization', () => {
  it('N+0: allocates all pallets to King/Queen when small sizes healthy', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 10,           // Low coverage (critical)
          Queen: 20,          // Low coverage (critical)
          Double: 100,        // 16.67 months (healthy)
          'King Single': 50,  // 16.67 months (healthy)
          Single: 20          // 20 months (healthy)
        }
      },
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(8, inventory);

    expect(order.metadata.small_size_pallets).toBe(0);
    expect(order.metadata.critical_sizes).toEqual([]);
    expect(order.metadata.king_pallets + order.metadata.queen_pallets).toBe(8);
  });

  it('N+1: allocates 1 pallet to critical small size, rest to King/Queen', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,          // Healthy
          Queen: 150,         // Healthy
          Double: 5,          // 0.83 months (CRITICAL!)
          'King Single': 50,  // Healthy
          Single: 20          // Healthy
        }
      },
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(8, inventory);

    expect(order.metadata.small_size_pallets).toBe(1);
    expect(order.metadata.critical_sizes).toEqual(['Double']);
    expect(order.metadata.king_pallets + order.metadata.queen_pallets).toBe(7);
  });

  it('N+2: allocates 2 pallets to 2 critical small sizes', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 5,          // 0.83 months (critical)
          'King Single': 5,   // 1.67 months (critical)
          Single: 20          // 20 months (healthy)
        }
      },
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(8, inventory);

    expect(order.metadata.small_size_pallets).toBe(2);
    expect(order.metadata.critical_sizes).toEqual(['Double', 'King Single']);
    expect(order.metadata.king_pallets + order.metadata.queen_pallets).toBe(6);
  });

  it('60/40 split favors size with lower coverage', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,          // 3.33 months
          Queen: 20,          // 0.49 months (lower)
          Double: 100,
          'King Single': 50,
          Single: 20
        }
      },
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(10, inventory);

    // Queen has lower coverage → should get 60% (6 pallets)
    expect(order.metadata.queen_pallets).toBe(6);
    expect(order.metadata.king_pallets).toBe(4);
  });

  it('generates correct total springs count', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(),
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(8, inventory);

    // 8 pallets * 30 springs/pallet = 240 springs
    expect(order.metadata.total_springs).toBe(240);
  });

  it('returns valid pallet structures', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(),
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(8, inventory);

    // Each pallet must have exactly 30 springs
    order.pallets.forEach((pallet) => {
      expect(pallet.total).toBe(30);
      expect(pallet.id).toBeGreaterThan(0);
      expect(pallet.size).toBeTruthy();
    });
  });

  it('pure pallets + mixed pallets = total pallets', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(),
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(12, inventory);

    expect(order.metadata.pure_pallets + order.metadata.mixed_pallets).toBe(12);
  });

  it('handles minimum container size (4 pallets)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 10,
          Queen: 10,
          Double: 100,
          'King Single': 50,
          Single: 20
        }
      },
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(4, inventory);

    expect(order.metadata.total_pallets).toBe(4);
    expect(order.metadata.total_springs).toBe(120); // 4 * 30
  });

  it('handles maximum container size (12 pallets)', () => {
    const inventory: Inventory = {
      springs: createEmptySpringInventory(),
      components: createEmptyComponentInventory()
    };

    const order = calculateNPlus1Order(12, inventory);

    expect(order.metadata.total_pallets).toBe(12);
    expect(order.metadata.total_springs).toBe(360); // 12 * 30
  });
});
