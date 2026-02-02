/**
 * Algorithm 3: Create Pallets for Size
 *
 * Creates pallets for a specific mattress size with equal depletion firmness allocation.
 * This algorithm allocates springs to ensure all firmnesses (Firm/Medium/Soft) deplete
 * at approximately the same rate, with a 10% priority boost to Medium.
 *
 * All sales rates come from live Directus data, passed in as salesRates parameter.
 */

import { SPRINGS_PER_PALLET, TARGET_COVERAGE, FIRMNESS_TYPES } from '../constants/index.js'

/**
 * Create pallets for a specific size with equal depletion firmness allocation.
 *
 * Algorithm:
 * 1. Calculate current coverage for each firmness
 * 2. Calculate allocation needed for each firmness to reach target coverage (equal depletion time)
 * 3. Apply 10% priority boost to Medium (not 84% dominance)
 * 4. Distribute springs proportionally based on equal depletion needs
 * 5. Create pure pallets first (single firmness, most efficient)
 * 6. Create mixed pallets for remainders
 * 7. Pad critical pallets to exactly 30 springs
 *
 * @param size - Mattress size (e.g., 'King')
 * @param numPallets - Number of pallets to create
 * @param palletIdStart - Starting pallet ID number
 * @param palletType - Type classification ('Critical', 'Mixed', 'Pure')
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 * @returns Array of pallet objects (each exactly 30 springs)
 */
export function createPalletsForSize(size, numPallets, palletIdStart, palletType, inventory, salesRates) {
  const totalUnits = numPallets * SPRINGS_PER_PALLET
  const weeklySales = salesRates.WEEKLY_SALES_RATE[size] || 0
  const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }

  // Step 1: Calculate need for each firmness based on coverage gaps
  const firmnessNeeds = {}
  let totalNeed = 0

  FIRMNESS_TYPES.forEach((firmness) => {
    const currentStock = inventory.springs[firmness][size] || 0
    const firmRatio = firmnessDistribution[firmness] || 0
    const weeklyDepletion = weeklySales * firmRatio
    const currentCoverage = weeklyDepletion > 0 ? currentStock / weeklyDepletion : Infinity
    const targetStock = weeklyDepletion * TARGET_COVERAGE
    const need = Math.max(0, targetStock - currentStock)

    firmnessNeeds[firmness] = need
    totalNeed += need
  })

  // Step 2: Distribute springs to equalize depletion times (equal runway for all firmnesses)
  let firmUnits, mediumUnits, softUnits

  // Calculate weekly depletion rates for each firmness
  const weeklyDepletion = {}
  const currentStock = {}

  FIRMNESS_TYPES.forEach((firmness) => {
    currentStock[firmness] = inventory.springs[firmness][size] || 0
    const firmRatio = firmnessDistribution[firmness] || 0
    weeklyDepletion[firmness] = weeklySales * firmRatio
  })

  // Calculate the target coverage that equalizes all firmnesses given totalUnits available
  // Goal: Firm and Soft reach coverage T, Medium reaches coverage T * 1.1 (10% boost)
  const mediumBoost = 1.1
  const CONTAINER_LEAD_TIME_WEEKS = 10

  const numerator = totalUnits + currentStock.firm + currentStock.medium + currentStock.soft
  const denominator = weeklyDepletion.firm + mediumBoost * weeklyDepletion.medium + weeklyDepletion.soft

  let targetCoverageWeeks = denominator > 0 ? numerator / denominator : TARGET_COVERAGE

  // CRITICAL: Ensure ALL firmnesses last until container arrives (10 weeks minimum)
  let minRequiredTarget = CONTAINER_LEAD_TIME_WEEKS
  FIRMNESS_TYPES.forEach((firmness) => {
    if (weeklyDepletion[firmness] > 0) {
      const currentCoverage = currentStock[firmness] / weeklyDepletion[firmness]
      if (currentCoverage < CONTAINER_LEAD_TIME_WEEKS) {
        const requiredTarget = CONTAINER_LEAD_TIME_WEEKS + 12 // Survive until container + 12 weeks after
        minRequiredTarget = Math.max(minRequiredTarget, requiredTarget)
      }
    }
  })

  // Ensure target is at least high enough to keep all firmnesses alive until container arrives
  targetCoverageWeeks = Math.max(targetCoverageWeeks, minRequiredTarget)

  // Calculate allocation for each firmness
  const equalDepletionNeeds = {}

  FIRMNESS_TYPES.forEach((firmness) => {
    const targetCoverage = firmness === 'medium' ? targetCoverageWeeks * mediumBoost : targetCoverageWeeks
    const targetStock = weeklyDepletion[firmness] * targetCoverage
    const need = targetStock - currentStock[firmness]
    equalDepletionNeeds[firmness] = Math.max(0, need)
  })

  const totalEqualNeed = equalDepletionNeeds.firm + equalDepletionNeeds.medium + equalDepletionNeeds.soft

  if (totalEqualNeed === 0) {
    // All firmnesses already have sufficient coverage
    const baseUnits = totalUnits / 3.1 // 1 + 1.1 + 1 = 3.1
    firmUnits = Math.round(baseUnits)
    mediumUnits = Math.round(baseUnits * 1.1)
    softUnits = totalUnits - firmUnits - mediumUnits
  } else {
    // Distribute proportionally based on equal depletion needs
    const minAllocation = 2

    firmUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.firm / totalEqualNeed) * totalUnits))
    mediumUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.medium / totalEqualNeed) * totalUnits))
    softUnits = Math.max(minAllocation, Math.round((equalDepletionNeeds.soft / totalEqualNeed) * totalUnits))

    // Adjust for rounding errors
    let total = firmUnits + mediumUnits + softUnits
    if (total !== totalUnits) {
      const diff = totalUnits - total
      if (mediumUnits >= firmUnits && mediumUnits >= softUnits) {
        mediumUnits = Math.max(minAllocation, mediumUnits + diff)
      } else if (firmUnits >= softUnits) {
        firmUnits = Math.max(minAllocation, firmUnits + diff)
      } else {
        softUnits = Math.max(minAllocation, softUnits + diff)
      }
    }
  }

  const remaining = { firm: firmUnits, medium: mediumUnits, soft: softUnits }
  const pallets = []
  let palletId = palletIdStart

  // Step 4: Create pure pallets (most efficient)
  FIRMNESS_TYPES.forEach((firmness) => {
    while (remaining[firmness] >= SPRINGS_PER_PALLET) {
      pallets.push({
        id: palletId++,
        size,
        type: 'Pure',
        firmness_breakdown: { [firmness]: SPRINGS_PER_PALLET },
        total: SPRINGS_PER_PALLET
      })
      remaining[firmness] -= SPRINGS_PER_PALLET
    }
  })

  // Step 5: Create mixed pallets from remainders
  while (remaining.firm + remaining.medium + remaining.soft >= SPRINGS_PER_PALLET) {
    const pallet = {
      id: palletId++,
      size,
      type: palletType === 'Critical' ? 'Critical' : 'Mixed',
      firmness_breakdown: {},
      total: 0
    }

    // Fill pallet with available firmnesses
    FIRMNESS_TYPES.forEach((firmness) => {
      if (remaining[firmness] > 0) {
        const toAdd = Math.min(remaining[firmness], SPRINGS_PER_PALLET - pallet.total)
        if (toAdd > 0) {
          pallet.firmness_breakdown[firmness] = toAdd
          remaining[firmness] -= toAdd
          pallet.total += toAdd
        }
      }
    })

    pallets.push(pallet)
  }

  // Step 6: Pad critical pallet if needed (ensure exactly 30 springs)
  if (palletType === 'Critical' && pallets.length > 0) {
    const lastPallet = pallets[pallets.length - 1]
    if (lastPallet.total < SPRINGS_PER_PALLET) {
      const needed = SPRINGS_PER_PALLET - lastPallet.total

      let addFirm, addMedium, addSoft
      if (totalEqualNeed === 0) {
        const baseUnits = needed / 3.1
        addFirm = Math.round(baseUnits)
        addMedium = Math.round(baseUnits * 1.1)
        addSoft = needed - addFirm - addMedium
      } else {
        addFirm = Math.round((equalDepletionNeeds.firm / totalEqualNeed) * needed)
        addMedium = Math.round((equalDepletionNeeds.medium / totalEqualNeed) * needed)
        addSoft = needed - addFirm - addMedium
      }

      lastPallet.firmness_breakdown.firm = (lastPallet.firmness_breakdown.firm || 0) + addFirm
      lastPallet.firmness_breakdown.medium = (lastPallet.firmness_breakdown.medium || 0) + addMedium
      lastPallet.firmness_breakdown.soft = (lastPallet.firmness_breakdown.soft || 0) + addSoft
      lastPallet.total = SPRINGS_PER_PALLET
    }
  }

  return pallets
}
