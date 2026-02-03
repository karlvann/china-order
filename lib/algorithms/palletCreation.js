/**
 * Algorithm 3: Create Pallets for Size
 *
 * Creates pallets for a specific mattress size with firmness allocation.
 * Supports excluding specific firmnesses (for overstocked SKUs).
 *
 * All sales rates come from live Directus data, passed in as salesRates parameter.
 */

import { SPRINGS_PER_PALLET, TARGET_COVERAGE, FIRMNESS_TYPES } from '../constants/index.js'

/**
 * Create pallets for a specific size with firmness allocation.
 *
 * Algorithm:
 * 1. Calculate current coverage for each eligible firmness
 * 2. Calculate allocation needed for each firmness to reach target coverage
 * 3. Distribute springs proportionally based on needs
 * 4. Create pure pallets first (single firmness, most efficient)
 * 5. Create mixed pallets for remainders
 *
 * @param size - Mattress size (e.g., 'King')
 * @param numPallets - Number of pallets to create
 * @param palletIdStart - Starting pallet ID number
 * @param palletType - Type classification ('Critical', 'Mixed', 'Pure')
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 * @param excludeFirmnesses - Array of firmness types to exclude (e.g., ['medium'] for overstocked)
 * @returns Array of pallet objects (each exactly 30 springs)
 */
export function createPalletsForSize(size, numPallets, palletIdStart, palletType, inventory, salesRates, excludeFirmnesses = []) {
  const totalUnits = numPallets * SPRINGS_PER_PALLET
  const weeklySales = salesRates.WEEKLY_SALES_RATE[size] || 0
  const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }

  // Filter to eligible firmnesses only
  const eligibleFirmnesses = FIRMNESS_TYPES.filter(f => !excludeFirmnesses.includes(f))

  if (eligibleFirmnesses.length === 0) {
    console.warn(`[PALLET CREATION] ${size}: All firmnesses excluded, no pallets created`)
    return []
  }

  // Step 1: Calculate need for each eligible firmness based on coverage gaps
  const firmnessNeeds = {}
  let totalNeed = 0

  for (const firmness of eligibleFirmnesses) {
    const currentStock = inventory.springs[firmness][size] || 0
    const firmRatio = firmnessDistribution[firmness] || 0
    const weeklyDepletion = weeklySales * firmRatio
    const currentCoverage = weeklyDepletion > 0 ? currentStock / weeklyDepletion : Infinity
    const targetStock = weeklyDepletion * TARGET_COVERAGE
    const need = Math.max(0, targetStock - currentStock)

    firmnessNeeds[firmness] = need
    totalNeed += need
  }

  // Step 2: Calculate weekly depletion rates for eligible firmnesses
  const weeklyDepletion = {}
  const currentStock = {}

  for (const firmness of eligibleFirmnesses) {
    currentStock[firmness] = inventory.springs[firmness][size] || 0
    const firmRatio = firmnessDistribution[firmness] || 0
    weeklyDepletion[firmness] = weeklySales * firmRatio
  }

  // Step 3: Distribute springs to equalize depletion times
  let firmUnits = 0
  let mediumUnits = 0
  let softUnits = 0

  const totalEligibleDepletion = Object.values(weeklyDepletion).reduce((sum, d) => sum + d, 0)

  if (totalNeed === 0 || totalEligibleDepletion === 0) {
    // All firmnesses have sufficient coverage or no demand - distribute by demand ratio
    for (const firmness of eligibleFirmnesses) {
      const ratio = totalEligibleDepletion > 0
        ? weeklyDepletion[firmness] / totalEligibleDepletion
        : 1 / eligibleFirmnesses.length

      if (firmness === 'firm') firmUnits = Math.round(ratio * totalUnits)
      if (firmness === 'medium') mediumUnits = Math.round(ratio * totalUnits)
      if (firmness === 'soft') softUnits = Math.round(ratio * totalUnits)
    }
  } else {
    // Distribute proportionally based on needs
    for (const firmness of eligibleFirmnesses) {
      const ratio = firmnessNeeds[firmness] / totalNeed
      const units = Math.round(ratio * totalUnits)

      if (firmness === 'firm') firmUnits = units
      if (firmness === 'medium') mediumUnits = units
      if (firmness === 'soft') softUnits = units
    }
  }

  // Ensure excluded firmnesses get 0
  if (!eligibleFirmnesses.includes('firm')) firmUnits = 0
  if (!eligibleFirmnesses.includes('medium')) mediumUnits = 0
  if (!eligibleFirmnesses.includes('soft')) softUnits = 0

  // Adjust for rounding errors to exactly match totalUnits
  let total = firmUnits + mediumUnits + softUnits
  if (total !== totalUnits) {
    const diff = totalUnits - total

    // Add/subtract from the firmness with highest need among eligible
    let adjustFirmness = eligibleFirmnesses[0]
    let highestNeed = 0
    for (const firmness of eligibleFirmnesses) {
      if (firmnessNeeds[firmness] > highestNeed) {
        highestNeed = firmnessNeeds[firmness]
        adjustFirmness = firmness
      }
    }

    if (adjustFirmness === 'firm') firmUnits += diff
    if (adjustFirmness === 'medium') mediumUnits += diff
    if (adjustFirmness === 'soft') softUnits += diff
  }

  const remaining = {}
  if (eligibleFirmnesses.includes('firm')) remaining.firm = firmUnits
  if (eligibleFirmnesses.includes('medium')) remaining.medium = mediumUnits
  if (eligibleFirmnesses.includes('soft')) remaining.soft = softUnits

  const pallets = []
  let palletId = palletIdStart

  // Step 4: Create pure pallets (most efficient)
  for (const firmness of eligibleFirmnesses) {
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
  }

  // Step 5: Create mixed pallets from remainders
  while (Object.values(remaining).reduce((a, b) => a + b, 0) >= SPRINGS_PER_PALLET) {
    const pallet = {
      id: palletId++,
      size,
      type: palletType === 'Critical' ? 'Critical' : 'Mixed',
      firmness_breakdown: {},
      total: 0
    }

    // Fill pallet with available firmnesses
    for (const firmness of eligibleFirmnesses) {
      if (remaining[firmness] > 0) {
        const toAdd = Math.min(remaining[firmness], SPRINGS_PER_PALLET - pallet.total)
        if (toAdd > 0) {
          pallet.firmness_breakdown[firmness] = toAdd
          remaining[firmness] -= toAdd
          pallet.total += toAdd
        }
      }
    }

    pallets.push(pallet)
  }

  // Step 6: Pad last pallet if needed (ensure exactly 30 springs)
  if (pallets.length > 0) {
    const lastPallet = pallets[pallets.length - 1]
    if (lastPallet.total < SPRINGS_PER_PALLET) {
      const needed = SPRINGS_PER_PALLET - lastPallet.total

      // Distribute padding proportionally among eligible firmnesses
      let paddingAllocated = 0
      for (let i = 0; i < eligibleFirmnesses.length; i++) {
        const firmness = eligibleFirmnesses[i]
        const isLast = i === eligibleFirmnesses.length - 1
        const ratio = totalEligibleDepletion > 0
          ? weeklyDepletion[firmness] / totalEligibleDepletion
          : 1 / eligibleFirmnesses.length

        const toAdd = isLast ? needed - paddingAllocated : Math.round(ratio * needed)
        lastPallet.firmness_breakdown[firmness] = (lastPallet.firmness_breakdown[firmness] || 0) + toAdd
        paddingAllocated += toAdd
      }
      lastPallet.total = SPRINGS_PER_PALLET
    }
  }

  return pallets
}
