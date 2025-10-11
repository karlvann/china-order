/**
 * CLEAN ALGORITHM: Fill King/Queen First
 *
 * Simple business logic:
 * 1. Calculate how many pallets King/Queen need to reach target coverage (6 months)
 * 2. Allocate those pallets first
 * 3. Use any remaining pallets for small sizes
 *
 * This naturally handles:
 * - Crisis mode: King/Queen get everything (100% of pallets)
 * - Normal mode: King/Queen get what they need, small sizes get remainder
 * - Healthy mode: King/Queen get little/nothing, small sizes get most
 */

import type { Inventory, Pallet } from '../types';
import { MONTHLY_SALES_RATE, SPRINGS_PER_PALLET } from '../constants';
import { calculateCoverage } from './coverage';
import { createPalletsForSize } from './palletCreation';

const TARGET_COVERAGE_MONTHS = 6; // Target 6 months coverage for all sizes

interface AllocationPlan {
  King: number;    // Number of pallets
  Queen: number;   // Number of pallets
  Double: number;  // Number of pallets
  'King Single': number;
  Single: number;
}

/**
 * Calculate how many pallets a size needs to reach target coverage
 */
function calculatePalletsNeeded(
  size: 'King' | 'Queen' | 'Double' | 'King Single' | 'Single',
  inventory: Inventory
): number {
  const currentCoverage = calculateCoverage(inventory, size);

  if (currentCoverage >= TARGET_COVERAGE_MONTHS) {
    return 0; // Already at or above target
  }

  const monthlySales = MONTHLY_SALES_RATE[size];
  const currentTotalSprings =
    inventory.springs.firm[size] +
    inventory.springs.medium[size] +
    inventory.springs.soft[size];

  const targetTotalSprings = monthlySales * TARGET_COVERAGE_MONTHS;
  const springsNeeded = targetTotalSprings - currentTotalSprings;

  if (springsNeeded <= 0) {
    return 0;
  }

  // Round up to full pallets
  return Math.ceil(springsNeeded / SPRINGS_PER_PALLET);
}

/**
 * Main algorithm: Fill King/Queen first, then small sizes
 */
export function fillKingQueenFirst(
  totalPallets: number,
  inventory: Inventory
): AllocationPlan {
  // Step 1: Calculate King/Queen needs
  const kingNeed = calculatePalletsNeeded('King', inventory);
  const queenNeed = calculatePalletsNeeded('Queen', inventory);
  const kingQueenNeed = kingNeed + queenNeed;

  let allocation: AllocationPlan = {
    King: 0,
    Queen: 0,
    Double: 0,
    'King Single': 0,
    Single: 0
  };

  // Step 2: Do King/Queen need all available pallets?
  if (kingQueenNeed >= totalPallets) {
    // CRISIS MODE: Not enough pallets for King/Queen, give them everything
    // Split proportionally based on who needs more
    if (kingQueenNeed === 0) {
      // Both at target, split 60/40 (Queen sells 37% faster)
      allocation.Queen = Math.round(totalPallets * 0.6);
      allocation.King = totalPallets - allocation.Queen;
    } else {
      // Distribute based on proportional need
      const kingRatio = kingNeed / kingQueenNeed;
      const queenRatio = queenNeed / kingQueenNeed;

      allocation.King = Math.round(totalPallets * kingRatio);
      allocation.Queen = totalPallets - allocation.King;

      // Ensure both get at least 1 pallet if they had any need
      if (kingNeed > 0 && allocation.King === 0) {
        allocation.King = 1;
        allocation.Queen = totalPallets - 1;
      }
      if (queenNeed > 0 && allocation.Queen === 0) {
        allocation.Queen = 1;
        allocation.King = totalPallets - 1;
      }
    }

    return allocation;
  }

  // Step 3: NORMAL/HEALTHY MODE: King/Queen needs less than total pallets
  // Fill King/Queen to target, use remainder for small sizes
  allocation.King = kingNeed;
  allocation.Queen = queenNeed;

  const remainingPallets = totalPallets - kingQueenNeed;

  if (remainingPallets === 0) {
    return allocation;
  }

  // Step 4: Distribute remaining pallets to small sizes based on coverage
  const smallSizes: Array<'Double' | 'King Single' | 'Single'> = ['Double', 'King Single', 'Single'];

  // Calculate needs for small sizes
  const smallSizeNeeds = smallSizes.map(size => ({
    size,
    need: calculatePalletsNeeded(size, inventory),
    coverage: calculateCoverage(inventory, size)
  }));

  // Sort by coverage (lowest first - most critical)
  smallSizeNeeds.sort((a, b) => a.coverage - b.coverage);

  // Allocate remaining pallets to small sizes
  let palletsLeft = remainingPallets;

  for (const { size, need } of smallSizeNeeds) {
    if (palletsLeft === 0) break;

    // Give this size what it needs, up to 2 pallets max (constraint: small sizes get 1-2 pallets max)
    const toAllocate = Math.min(need, 2, palletsLeft);

    if (toAllocate > 0) {
      allocation[size] = toAllocate;
      palletsLeft -= toAllocate;
    }
  }

  // Step 5: If still pallets left, give them back to King/Queen (better than wasting)
  if (palletsLeft > 0) {
    // Split remaining between King/Queen (60/40, Queen sells faster)
    const queenExtra = Math.round(palletsLeft * 0.6);
    const kingExtra = palletsLeft - queenExtra;

    allocation.Queen += queenExtra;
    allocation.King += kingExtra;
  }

  return allocation;
}

/**
 * Convert allocation plan to actual pallets
 */
export function createPalletsFromAllocation(
  allocation: AllocationPlan,
  inventory: Inventory
): Pallet[] {
  const sizes: Array<keyof AllocationPlan> = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const pallets: Pallet[] = [];
  let palletId = 1;

  for (const size of sizes) {
    const numPallets = allocation[size];
    if (numPallets === 0) continue;

    // Determine pallet type based on allocation
    const palletType = numPallets === 1 ? 'Critical' : 'Mixed';

    const sizePallets = createPalletsForSize(
      size,
      numPallets,
      palletId,
      palletType,
      inventory
    );

    pallets.push(...sizePallets);
    palletId += sizePallets.length;
  }

  return pallets;
}

/**
 * Main entry point: replaces calculateNPlus1Order
 * Returns SpringOrder type to match existing app interface
 */
export function calculateKingQueenFirstOrder(
  totalPallets: number,
  inventory: Inventory
): any {  // Using 'any' for now, but returns SpringOrder structure
  // Calculate allocation plan
  const allocation = fillKingQueenFirst(totalPallets, inventory);

  // Create actual pallets with firmness breakdown
  const pallets = createPalletsFromAllocation(allocation, inventory);

  // Calculate total spring quantities by firmness/size
  const springs: any = {
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  };

  pallets.forEach(pallet => {
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, quantity]) => {
      springs[firmness][pallet.size] += quantity;
    });
  });

  // Calculate metadata
  const purePallets = pallets.filter(p => p.type === 'Pure').length;
  const mixedPallets = pallets.filter(p => p.type !== 'Pure').length;
  const criticalSizes: any[] = [];
  if (allocation.Double > 0) criticalSizes.push('Double');
  if (allocation['King Single'] > 0) criticalSizes.push('King Single');
  if (allocation.Single > 0) criticalSizes.push('Single');

  const metadata = {
    total_pallets: totalPallets,
    total_springs: pallets.reduce((sum, p) => sum + p.total, 0),
    pure_pallets: purePallets,
    mixed_pallets: mixedPallets,
    critical_sizes: criticalSizes,
    small_size_pallets: allocation.Double + allocation['King Single'] + allocation.Single,
    king_pallets: allocation.King,
    queen_pallets: allocation.Queen
  };

  return {
    springs,
    pallets,
    metadata
  };
}
