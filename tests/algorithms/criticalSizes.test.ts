import { describe, it, expect } from 'vitest';
import { findCriticalSmallSizes, findCriticalSmallSize } from '@/lib/algorithms/criticalSizes';
import type { Inventory } from '@/lib/types';
import { createEmptySpringInventory, createEmptyComponentInventory } from '@/lib/utils/inventory';

describe('Algorithm 2: Critical Small Sizes Detection', () => {
  it('returns empty array when all small sizes have healthy coverage (>4 months)', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 100,        // 16.67 months (6 units/month)
          'King Single': 50,  // 16.67 months (3 units/month)
          Single: 20          // 20 months (1 unit/month)
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSizes = findCriticalSmallSizes(inventory);
    expect(criticalSizes).toEqual([]);
  });

  it('returns 1 critical size when only one is below threshold', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 10,         // 1.67 months (CRITICAL!)
          'King Single': 50,  // 16.67 months (healthy)
          Single: 20          // 20 months (healthy)
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSizes = findCriticalSmallSizes(inventory);
    expect(criticalSizes).toEqual(['Double']);
  });

  it('returns 2 critical sizes sorted by medium coverage', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 5,          // 0.83 months (more critical)
          'King Single': 5,   // 1.67 months (less critical)
          Single: 20          // 20 months (healthy)
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSizes = findCriticalSmallSizes(inventory);
    expect(criticalSizes).toEqual(['Double', 'King Single']);
  });

  it('returns all 3 small sizes when all are critical', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 5,          // 0.83 months
          'King Single': 3,   // 1 month
          Single: 1           // 1 month
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSizes = findCriticalSmallSizes(inventory);
    expect(criticalSizes).toHaveLength(3);
    expect(criticalSizes).toContain('Double');
    expect(criticalSizes).toContain('King Single');
    expect(criticalSizes).toContain('Single');
  });

  it('prioritizes sizes with lower medium coverage', () => {
    const inventory: Inventory = {
      springs: {
        firm: { King: 0, Queen: 0, Double: 5, 'King Single': 0, Single: 10 },
        medium: { King: 100, Queen: 150, Double: 5, 'King Single': 10, Single: 2 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      },
      components: createEmptyComponentInventory()
    };

    // Double: total = 10 (1.67 months) CRITICAL, medium coverage = ~1.37 months (lowest)
    // King Single: total = 10 (3.33 months) CRITICAL, medium coverage = ~5.36 months
    // Single: total = 12 (12 months, healthy)
    const criticalSizes = findCriticalSmallSizes(inventory);
    expect(criticalSizes[0]).toBe('Double'); // Double has lowest medium coverage
    expect(criticalSizes).toContain('King Single'); // Also critical
  });

  it('backward compatibility: findCriticalSmallSize returns single size', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 5,          // Most critical
          'King Single': 10,
          Single: 20
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSize = findCriticalSmallSize(inventory);
    expect(criticalSize).toBe('Double');
  });

  it('returns undefined for deprecated function when all sizes healthy', () => {
    const inventory: Inventory = {
      springs: {
        ...createEmptySpringInventory(),
        medium: {
          King: 100,
          Queen: 150,
          Double: 100,
          'King Single': 50,
          Single: 20
        }
      },
      components: createEmptyComponentInventory()
    };

    const criticalSize = findCriticalSmallSize(inventory);
    expect(criticalSize).toBeUndefined();
  });
});
