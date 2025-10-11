/**
 * Algorithm 3: Create Pallets for Size
 *
 * Creates pallets for a specific mattress size with equal depletion firmness allocation.
 * This algorithm allocates springs to ensure all firmnesses (Firm/Medium/Soft) deplete
 * at approximately the same rate, with a 10% priority boost to Medium.
 */

import type { Inventory, MattressSize, Pallet, PalletType, FirmnessBreakdown } from '../types';
import { SPRINGS_PER_PALLET, TARGET_COVERAGE, MONTHLY_SALES_RATE, FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION } from '../constants';

/**
 * Create pallets for a specific size with equal depletion firmness allocation.
 *
 * **Algorithm**:
 * 1. Calculate current coverage for each firmness
 * 2. Calculate allocation needed for each firmness to reach 6 months coverage (equal depletion time)
 * 3. Apply 10% priority boost to Medium (not 84% dominance)
 * 4. Distribute springs proportionally based on equal depletion needs
 * 5. Create pure pallets first (single firmness, most efficient)
 * 6. Create mixed pallets for remainders
 * 7. Pad critical pallets to exactly 30 springs
 *
 * **Why equal depletion?**
 * If Soft has 2 months coverage and Medium has 5 months, Soft would run out
 * 3 months earlier. This causes lost sales when customers want Soft firmness.
 * Equal depletion ensures all firmnesses run out at approximately the same time,
 * maintaining customer choice throughout the inventory cycle.
 *
 * @param size - Mattress size (e.g., 'King')
 * @param numPallets - Number of pallets to create
 * @param palletIdStart - Starting pallet ID number
 * @param palletType - Type classification ('Critical', 'Mixed', 'Pure')
 * @param inventory - Current warehouse inventory
 * @returns Array of pallet objects (each exactly 30 springs)
 *
 * @example
 * ```ts
 * // Create 2 pallets of King size
 * const pallets = createPalletsForSize('King', 2, 1, 'Mixed', inventory);
 * // Returns: [
 * //   { id: 1, size: 'King', type: 'Pure', firmness_breakdown: { medium: 30 }, total: 30 },
 * //   { id: 2, size: 'King', type: 'Mixed', firmness_breakdown: { firm: 10, medium: 15, soft: 5 }, total: 30 }
 * // ]
 * ```
 */
export function createPalletsForSize(
  size: MattressSize,
  numPallets: number,
  palletIdStart: number,
  palletType: PalletType,
  inventory: Inventory
): Pallet[] {
  const totalUnits = numPallets * SPRINGS_PER_PALLET;
  const monthlySales = MONTHLY_SALES_RATE[size];

  // Step 1: Calculate need for each firmness based on coverage gaps
  const firmnessNeeds: Record<string, number> = {};
  let totalNeed = 0;

  FIRMNESS_TYPES.forEach((firmness) => {
    const currentStock = inventory.springs[firmness][size];
    const firmRatio = FIRMNESS_DISTRIBUTION[size][firmness];
    const monthlyDepletion = monthlySales * firmRatio;
    const currentCoverage = monthlyDepletion > 0 ? currentStock / monthlyDepletion : Infinity;
    const targetStock = monthlyDepletion * TARGET_COVERAGE;
    const need = Math.max(0, targetStock - currentStock);

    firmnessNeeds[firmness] = need;
    totalNeed += need;
  });

  // Step 2: Distribute springs to equalize depletion times (equal runway for all firmnesses)
  let firmUnits: number, mediumUnits: number, softUnits: number;

  // Calculate monthly depletion rates for each firmness
  const monthlyDepletion: Record<string, number> = {};
  const currentStock: Record<string, number> = {};

  FIRMNESS_TYPES.forEach((firmness) => {
    currentStock[firmness] = inventory.springs[firmness][size];
    const firmRatio = FIRMNESS_DISTRIBUTION[size][firmness];
    monthlyDepletion[firmness] = monthlySales * firmRatio;
  });

  // Calculate the target coverage that equalizes all firmnesses given totalUnits available
  // Goal: Firm and Soft reach coverage T, Medium reaches coverage T * 1.1 (10% boost)
  // Formula: T = (totalUnits + Σ currentStock) / (depletion_firm + 1.1 * depletion_medium + depletion_soft)
  const mediumBoost = 1.1;
  const CONTAINER_LEAD_TIME_MONTHS = 2.5; // 10 weeks

  const numerator = totalUnits + currentStock.firm + currentStock.medium + currentStock.soft;
  const denominator = monthlyDepletion.firm + mediumBoost * monthlyDepletion.medium + monthlyDepletion.soft;

  let targetCoverageMonths = numerator / denominator;

  // CRITICAL: Ensure ALL firmnesses last until container arrives (2.5 months minimum)
  // If any firmness would run out before container arrives, we need emergency allocation
  let minRequiredTarget = CONTAINER_LEAD_TIME_MONTHS;
  FIRMNESS_TYPES.forEach((firmness) => {
    if (monthlyDepletion[firmness] > 0) {
      const currentCoverage = currentStock[firmness] / monthlyDepletion[firmness];
      // If this firmness runs out before container, set target to ensure it survives + some buffer
      if (currentCoverage < CONTAINER_LEAD_TIME_MONTHS) {
        const requiredTarget = CONTAINER_LEAD_TIME_MONTHS + 3; // Survive until container + 3 months after
        minRequiredTarget = Math.max(minRequiredTarget, requiredTarget);
      }
    }
  });

  // Ensure target is at least high enough to keep all firmnesses alive until container arrives
  targetCoverageMonths = Math.max(targetCoverageMonths, minRequiredTarget);

  // Calculate allocation for each firmness
  // Firm and Soft: target = T months coverage
  // Medium: target = T * 1.1 months coverage (10% priority boost)
  const equalDepletionNeeds: Record<string, number> = {};

  FIRMNESS_TYPES.forEach((firmness) => {
    const targetCoverage = firmness === 'medium' ? targetCoverageMonths * mediumBoost : targetCoverageMonths;
    const targetStock = monthlyDepletion[firmness] * targetCoverage;
    const need = targetStock - currentStock[firmness];
    equalDepletionNeeds[firmness] = Math.max(0, need);
  });

  const totalEqualNeed = equalDepletionNeeds.firm + equalDepletionNeeds.medium + equalDepletionNeeds.soft;

  if (totalEqualNeed === 0) {
    // All firmnesses already have sufficient coverage
    // Distribute evenly with 10% boost to Medium
    const baseUnits = totalUnits / 3.1; // 1 + 1.1 + 1 = 3.1
    firmUnits = Math.round(baseUnits);
    mediumUnits = Math.round(baseUnits * 1.1);
    softUnits = totalUnits - firmUnits - mediumUnits;
  } else {
    // Distribute proportionally based on equal depletion needs (already includes Medium boost)
    // IMPORTANT: Ensure every firmness gets at least 2 springs (minimum allocation for equal depletion)
    const minAllocation = 2;

    firmUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.firm / totalEqualNeed) * totalUnits));
    mediumUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.medium / totalEqualNeed) * totalUnits));
    softUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.soft / totalEqualNeed) * totalUnits));

    // Adjust for rounding errors (may exceed totalUnits due to minimum allocations)
    let total = firmUnits + mediumUnits + softUnits;
    if (total !== totalUnits) {
      const diff = totalUnits - total;
      // Adjust the firmness with the largest allocation (usually Medium)
      if (mediumUnits >= firmUnits && mediumUnits >= softUnits) {
        mediumUnits = Math.max(minAllocation, mediumUnits + diff);
      } else if (firmUnits >= softUnits) {
        firmUnits = Math.max(minAllocation, firmUnits + diff);
      } else {
        softUnits = Math.max(minAllocation, softUnits + diff);
      }
    }
  }

  const remaining = { firm: firmUnits, medium: mediumUnits, soft: softUnits };
  const pallets: Pallet[] = [];
  let palletId = palletIdStart;

  // Step 4: Create pure pallets (most efficient)
  FIRMNESS_TYPES.forEach((firmness) => {
    while (remaining[firmness] >= SPRINGS_PER_PALLET) {
      pallets.push({
        id: palletId++,
        size,
        type: 'Pure',
        firmness_breakdown: { [firmness]: SPRINGS_PER_PALLET },
        total: SPRINGS_PER_PALLET
      });
      remaining[firmness] -= SPRINGS_PER_PALLET;
    }
  });

  // Step 5: Create mixed pallets from remainders
  while (remaining.firm + remaining.medium + remaining.soft >= SPRINGS_PER_PALLET) {
    const pallet: Pallet = {
      id: palletId++,
      size,
      type: palletType === 'Critical' ? 'Critical' : 'Mixed',
      firmness_breakdown: {},
      total: 0
    };

    // Fill pallet with available firmnesses
    FIRMNESS_TYPES.forEach((firmness) => {
      if (remaining[firmness] > 0) {
        const toAdd = Math.min(remaining[firmness], SPRINGS_PER_PALLET - pallet.total);
        if (toAdd > 0) {
          pallet.firmness_breakdown[firmness] = toAdd;
          remaining[firmness] -= toAdd;
          pallet.total += toAdd;
        }
      }
    });

    pallets.push(pallet);
  }

  // Step 6: Pad critical pallet if needed (ensure exactly 30 springs)
  if (palletType === 'Critical' && pallets.length > 0) {
    const lastPallet = pallets[pallets.length - 1];
    if (lastPallet.total < SPRINGS_PER_PALLET) {
      const needed = SPRINGS_PER_PALLET - lastPallet.total;

      // Distribute padding based on equal depletion ratios (with 10% Medium boost)
      let addFirm: number, addMedium: number, addSoft: number;
      if (totalEqualNeed === 0) {
        // Distribute evenly with 10% boost to Medium
        const baseUnits = needed / 3.1;
        addFirm = Math.round(baseUnits);
        addMedium = Math.round(baseUnits * 1.1);
        addSoft = needed - addFirm - addMedium;
      } else {
        // Use equal depletion needs (already includes Medium boost in calculation)
        addFirm = Math.round((equalDepletionNeeds.firm / totalEqualNeed) * needed);
        addMedium = Math.round((equalDepletionNeeds.medium / totalEqualNeed) * needed);
        addSoft = needed - addFirm - addMedium;
      }

      lastPallet.firmness_breakdown.firm = (lastPallet.firmness_breakdown.firm || 0) + addFirm;
      lastPallet.firmness_breakdown.medium = (lastPallet.firmness_breakdown.medium || 0) + addMedium;
      lastPallet.firmness_breakdown.soft = (lastPallet.firmness_breakdown.soft || 0) + addSoft;
      lastPallet.total = SPRINGS_PER_PALLET;
    }
  }

  return pallets;
}
