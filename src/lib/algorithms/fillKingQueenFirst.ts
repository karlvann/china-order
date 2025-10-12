/**
 * CLEAN ALGORITHM: Fill King/Queen First (WITH LEAD TIME ADJUSTMENT)
 *
 * Business logic:
 * 1. Calculate projected stock at container arrival (current - depletion during 10 weeks)
 * 2. Calculate how many pallets needed to reach target coverage AT ARRIVAL
 * 3. Allocate King/Queen pallets first
 * 4. Use any remaining pallets for small sizes
 *
 * KEY FIX: Accounts for stock depletion during 10-week lead time
 *
 * This naturally handles:
 * - Crisis mode: King/Queen get everything (100% of pallets)
 * - Normal mode: King/Queen get what they need, small sizes get remainder
 * - Healthy mode: King/Queen get little/nothing, small sizes get most
 */

import type { Inventory, Pallet } from '../types';
import { MONTHLY_SALES_RATE, SPRINGS_PER_PALLET, LEAD_TIME_WEEKS, FIRMNESS_DISTRIBUTION } from '../constants';
import { calculateCoverage } from './coverage';
import { createPalletsForSize } from './palletCreation';

/**
 * PREDICTIVE STRATEGY: Queen Medium-Driven Ordering
 *
 * Target: 60 Queen Medium units at arrival (midpoint of 50-70 range)
 * - Queen Medium = 51% of business (most critical item)
 * - Trigger fires when we predict QM will be 50-70 at arrival
 * - Order sizing ensures we hit the target exactly
 */
const TARGET_QUEEN_MEDIUM_AT_ARRIVAL = 60; // Units at arrival

// Lead time calculation (10 weeks = 2.5 months)
const LEAD_TIME_MONTHS = LEAD_TIME_WEEKS / 4;

// Depletion during JUST the lead time (trigger already accounts for "when to order")
// We only need to account for the 2.5 months from order to arrival
const TOTAL_DEPLETION_TIME = LEAD_TIME_MONTHS; // 2.5 months

// Derive target coverage for each size based on Queen Medium target
// Queen Medium: 60 units / 34/month = 1.76 months
// Queen total: 60 / 0.83 = 72 Queen springs / 41/month = 1.76 months
// Round up to 2 months for safety margin
const TARGET_COVERAGE_AT_ARRIVAL = 2.0; // Months of coverage at arrival

interface AllocationPlan {
  King: number;    // Number of pallets
  Queen: number;   // Number of pallets
  Double: number;  // Number of pallets
  'King Single': number;
  Single: number;
}

/**
 * Calculate how many pallets a size needs to reach target coverage AT ARRIVAL
 *
 * KEY IMPROVEMENT: Accounts for stock depletion during 10-week lead time
 *
 * Formula:
 *   1. Current stock = current inventory
 *   2. Depletion during lead time = monthly_sales × LEAD_TIME_MONTHS
 *   3. Projected stock at arrival = current - depletion
 *   4. Target stock at arrival = monthly_sales × TARGET_COVERAGE_AT_ARRIVAL
 *   5. Springs needed = target - projected
 *   6. Pallets needed = ceil(springs_needed / 30)
 */
function calculatePalletsNeeded(
  size: 'King' | 'Queen' | 'Double' | 'King Single' | 'Single',
  inventory: Inventory
): number {
  const monthlySales = MONTHLY_SALES_RATE[size];

  // Current stock
  const currentTotalSprings =
    inventory.springs.firm[size] +
    inventory.springs.medium[size] +
    inventory.springs.soft[size];

  // Stock depletion from when we ORDER to when container ARRIVES
  // = current month (1) + lead time (2.5) = 3.5 months total
  const depletionDuringLeadTime = monthlySales * TOTAL_DEPLETION_TIME;

  // Projected stock when container arrives
  const projectedStockAtArrival = currentTotalSprings - depletionDuringLeadTime;

  // Target stock at arrival (e.g., 2 months coverage)
  const targetStockAtArrival = monthlySales * TARGET_COVERAGE_AT_ARRIVAL;

  // How many springs do we need to order?
  const springsNeeded = targetStockAtArrival - projectedStockAtArrival;

  if (springsNeeded <= 0) {
    return 0; // Already at or above target (even after depletion)
  }

  // Round up to full pallets
  return Math.ceil(springsNeeded / SPRINGS_PER_PALLET);
}

/**
 * SIMPLIFIED: Queen Medium-Driven Allocation
 *
 * Only calculate based on Queen Medium needs, then distribute proportionally
 */
export function fillKingQueenFirst(
  totalPallets: number,
  inventory: Inventory,
  pendingArrivals?: Array<{ arrivalMonth: number; order: any }>,
  currentMonthOffset?: number
): AllocationPlan {
  // Step 1: Calculate ONLY Queen Medium needs (the driver of all ordering)
  const qmCurrent = inventory.springs.medium['Queen'] || 0;

  // Calculate how much QM is coming from pending containers
  // CRITICAL: Only count containers arriving BEFORE or WHEN the new order would arrive
  // KEY FIX: Account for floor() operation in arrival timing
  let pendingQM = 0;
  let actualMonthsOfDepletion = TOTAL_DEPLETION_TIME; // Default 2.5 months

  if (pendingArrivals && currentMonthOffset !== undefined) {
    // Calculate ACTUAL arrival month (accounting for floor operation)
    const newOrderArrivalFloat = currentMonthOffset + LEAD_TIME_MONTHS;
    const actualArrivalMonth = Math.floor(newOrderArrivalFloat);
    actualMonthsOfDepletion = actualArrivalMonth - currentMonthOffset; // e.g., 2 months not 2.5

    for (const pa of pendingArrivals) {
      const paActualArrival = Math.floor(pa.arrivalMonth);
      if (paActualArrival > currentMonthOffset && paActualArrival <= actualArrivalMonth) {
        // This container hasn't arrived yet AND will arrive before/when new order arrives
        const queenPallets = pa.order.springOrder.pallets.filter((p: any) => p.size === 'Queen').length;
        const qmInContainer = queenPallets * SPRINGS_PER_PALLET * FIRMNESS_DISTRIBUTION['Queen']['medium'];
        pendingQM += qmInContainer;
      }
    }
  }

  // Project QM at arrival INCLUDING pending containers (using ACTUAL depletion time)
  const actualDepletion = MONTHLY_SALES_RATE['Queen'] * FIRMNESS_DISTRIBUTION['Queen']['medium'] * actualMonthsOfDepletion;
  const qmAtArrival = qmCurrent - actualDepletion + pendingQM;
  const qmNeeded = Math.max(0, TARGET_QUEEN_MEDIUM_AT_ARRIVAL - qmAtArrival);

  // Convert QM needed to Queen pallets (QM is 83% of Queen total)
  const queenPalletsNeeded = Math.ceil(qmNeeded / (SPRINGS_PER_PALLET * FIRMNESS_DISTRIBUTION['Queen']['medium']));

  // King gets proportional allocation based on sales velocity
  // King: 30/month, Queen: 41/month → King = 73% of Queen
  const kingPalletsNeeded = Math.round(queenPalletsNeeded * (MONTHLY_SALES_RATE['King'] / MONTHLY_SALES_RATE['Queen']));

  console.log(`[ORDER CALC] Total pallets=${totalPallets}, QM current=${qmCurrent.toFixed(0)}, pending QM=${pendingQM.toFixed(0)}, QM at arrival=${qmAtArrival.toFixed(0)}, Queen needs ${queenPalletsNeeded} pallets, King needs ${kingPalletsNeeded} pallets`);

  let allocation: AllocationPlan = {
    King: 0,
    Queen: 0,
    Double: 0,
    'King Single': 0,
    Single: 0
  };

  const kingQueenTotal = kingPalletsNeeded + queenPalletsNeeded;
  console.log(`[ORDER CALC] King+Queen need ${kingQueenTotal} pallets total (King: ${kingPalletsNeeded}, Queen: ${queenPalletsNeeded})`);

  // Step 2: Allocate King/Queen pallets
  if (kingQueenTotal >= totalPallets) {
    // CRISIS MODE: Need more than available, give everything to King/Queen
    // Split proportionally
    const kingRatio = kingPalletsNeeded / kingQueenTotal;
    allocation.King = Math.round(totalPallets * kingRatio);
    allocation.Queen = totalPallets - allocation.King;

    return allocation;
  }

  // NORMAL MODE: King/Queen need less than total
  allocation.King = kingPalletsNeeded;
  allocation.Queen = queenPalletsNeeded;

  // MINIMUM ALLOCATION: Queen is 51% of business, should never get 0 pallets
  // Ensure at least 1 pallet for Queen when ordering (unless container is tiny)
  if (allocation.Queen === 0 && totalPallets >= 3) {
    allocation.Queen = 1;
    // Don't adjust King - take from small sizes instead
  }

  const remainingPallets = totalPallets - (allocation.King + allocation.Queen);

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

  // Step 5: If still pallets left, give to small sizes that need them
  // Don't waste pallets, but don't over-order King/Queen either
  if (palletsLeft > 0) {
    // Try to distribute remaining pallets to small sizes again (up to their needs)
    for (const { size, need } of smallSizeNeeds) {
      if (palletsLeft === 0) break;

      const currentAllocation = allocation[size];
      const stillNeeds = need - currentAllocation;

      if (stillNeeds > 0) {
        const toAdd = Math.min(stillNeeds, palletsLeft);
        allocation[size] += toAdd;
        palletsLeft -= toAdd;
      }
    }
  }

  // Step 6: CRITICAL CONSTRAINT - Container MUST be completely filled
  // We can't send a partially empty container (you pay for full container regardless)
  // Distribute any remaining pallets to King/Queen based on current coverage
  if (palletsLeft > 0) {
    // Calculate projected coverage after current allocation
    let kingCoverageAfter = calculateCoverage(inventory, 'King') + (allocation.King * SPRINGS_PER_PALLET / MONTHLY_SALES_RATE['King']);
    let queenCoverageAfter = calculateCoverage(inventory, 'Queen') + (allocation.Queen * SPRINGS_PER_PALLET / MONTHLY_SALES_RATE['Queen']);

    // Allocate remaining pallets to whoever has lower coverage
    while (palletsLeft > 0) {
      if (queenCoverageAfter <= kingCoverageAfter) {
        // Queen has lower coverage - give her the remaining pallets (or at least 60%)
        const toQueen = Math.min(palletsLeft, Math.max(1, Math.ceil(palletsLeft * 0.6)));
        allocation.Queen += toQueen;
        palletsLeft -= toQueen;
        queenCoverageAfter += (toQueen * SPRINGS_PER_PALLET / MONTHLY_SALES_RATE['Queen']);
      } else {
        // King has lower coverage - give him the remaining pallets (or at least 60%)
        const toKing = Math.min(palletsLeft, Math.max(1, Math.ceil(palletsLeft * 0.6)));
        allocation.King += toKing;
        palletsLeft -= toKing;
        kingCoverageAfter += (toKing * SPRINGS_PER_PALLET / MONTHLY_SALES_RATE['King']);
      }
    }
  }

  // Final validation: ensure we allocated exactly totalPallets
  const totalAllocated = allocation.King + allocation.Queen + allocation.Double + allocation['King Single'] + allocation.Single;
  console.log(`[ORDER CALC] FINAL ALLOCATION: King=${allocation.King}, Queen=${allocation.Queen}, Double=${allocation.Double}, KS=${allocation['King Single']}, Single=${allocation.Single} | Total=${totalAllocated}/${totalPallets}`);

  if (totalAllocated !== totalPallets) {
    console.error(`[ORDER CALC] ERROR: Allocated ${totalAllocated} pallets but container size is ${totalPallets}!`);
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
  inventory: Inventory,
  pendingArrivals?: Array<{ arrivalMonth: number; order: any }>,
  currentMonthOffset?: number
): any {  // Using 'any' for now, but returns SpringOrder structure
  // Calculate allocation plan
  const allocation = fillKingQueenFirst(totalPallets, inventory, pendingArrivals, currentMonthOffset);

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
