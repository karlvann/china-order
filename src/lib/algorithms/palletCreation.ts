/**
 * Algorithm 3: Create Pallets for Size
 *
 * Creates pallets for a specific mattress size with dynamic firmness allocation.
 * Unlike fixed ratio distribution, this algorithm allocates springs based on
 * individual firmness coverage gaps.
 */

import type { Inventory, MattressSize, Pallet, PalletType, FirmnessBreakdown } from '../types';
import { SPRINGS_PER_PALLET, TARGET_COVERAGE, MONTHLY_SALES_RATE, FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION } from '../constants';

/**
 * Create pallets for a specific size with smart firmness allocation.
 *
 * **Algorithm**:
 * 1. Calculate firmness needs (based on coverage gaps, not fixed ratios)
 * 2. Distribute springs proportionally to needs
 * 3. Create pure pallets first (single firmness, most efficient)
 * 4. Create mixed pallets for remainders
 * 5. Pad critical pallets to exactly 30 springs
 *
 * **Why dynamic allocation?**
 * If Medium has 2 months coverage but Firm has 6 months, we should
 * allocate more to Medium, not follow fixed 84%/14% ratios.
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
 * //   { id: 2, size: 'King', type: 'Mixed', firmness_breakdown: { medium: 20, firm: 10 }, total: 30 }
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

  // Step 2: Distribute springs based on need (or default ratios if no need)
  let firmUnits: number, mediumUnits: number, softUnits: number;

  if (totalNeed === 0) {
    // No coverage gap - use default firmness ratios
    const firmRatios = FIRMNESS_DISTRIBUTION[size];
    firmUnits = Math.round(totalUnits * firmRatios.firm);
    mediumUnits = Math.round(totalUnits * firmRatios.medium);
    softUnits = Math.round(totalUnits * firmRatios.soft);
  } else {
    // Allocate based on proportional need
    firmUnits = Math.round((firmnessNeeds.firm / totalNeed) * totalUnits);
    mediumUnits = Math.round((firmnessNeeds.medium / totalNeed) * totalUnits);
    softUnits = Math.round((firmnessNeeds.soft / totalNeed) * totalUnits);
  }

  // Step 3: Adjust for rounding errors (ensure total = numPallets * 30)
  const total = firmUnits + mediumUnits + softUnits;
  if (total !== totalUnits) {
    const diff = totalUnits - total;
    mediumUnits += diff; // Add difference to Medium (most common firmness)
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

      // Distribute padding based on need ratios
      let addFirm: number, addMedium: number, addSoft: number;
      if (totalNeed === 0) {
        const firmRatios = FIRMNESS_DISTRIBUTION[size];
        addFirm = Math.round(needed * firmRatios.firm);
        addMedium = Math.round(needed * firmRatios.medium);
        addSoft = needed - addFirm - addMedium;
      } else {
        addFirm = Math.round((firmnessNeeds.firm / totalNeed) * needed);
        addMedium = Math.round((firmnessNeeds.medium / totalNeed) * needed);
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
