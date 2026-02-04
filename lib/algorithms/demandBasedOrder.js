/**
 * DEMAND-BASED ORDER ALGORITHM (Per-SKU Allocation)
 *
 * Allocates pallets based on per-SKU (size/firmness) coverage needs.
 *
 * Key constraint: Each pallet = 30 springs of ONE size (firmness can be mixed)
 *
 * Algorithm:
 * 1. Calculate projected coverage for all 15 SKUs (5 sizes x 3 firmnesses)
 * 2. Allocate PALLETS to SIZES based on which size has lowest coverage
 * 3. For each size's pallets, distribute springs across firmnesses by coverage need
 */

import {
  SPRINGS_PER_PALLET,
  LEAD_TIME_WEEKS,
  OVERSTOCK_THRESHOLD,
  FIRMNESS_TYPES
} from '../constants/index.js'

// All mattress sizes
const ALL_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single']

// Size-specific minimum coverage targets (weeks)
const MIN_COVERAGE_BY_SIZE = {
  King: 6,
  Queen: 8,
  Double: 6,
  'King Single': 6,
  Single: 6
}

// SKU status classifications
const SKU_STATUS = {
  CRITICAL: 'CRITICAL',
  NORMAL: 'NORMAL',
  OVERSTOCKED: 'OVERSTOCKED'
}

/**
 * Calculate metrics for all 15 SKUs (5 sizes x 3 firmnesses)
 */
export function calculateSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset = 0) {
  const skus = []
  const newOrderArrivalWeek = orderWeekOffset + LEAD_TIME_WEEKS

  // Calculate pending springs per size/firmness
  const pendingSprings = {}
  for (const size of ALL_SIZES) {
    pendingSprings[size] = { firm: 0, medium: 0, soft: 0 }
  }

  if (pendingOrders && pendingOrders.length > 0) {
    for (const order of pendingOrders) {
      if (order.arrivalWeekIndex >= 0 && order.arrivalWeekIndex <= newOrderArrivalWeek) {
        if (order.springsByFirmness) {
          for (const firmness of FIRMNESS_TYPES) {
            if (order.springsByFirmness[firmness]) {
              for (const [size, qty] of Object.entries(order.springsByFirmness[firmness])) {
                if (pendingSprings[size] && pendingSprings[size][firmness] !== undefined) {
                  pendingSprings[size][firmness] += qty
                }
              }
            }
          }
        } else if (order.springs) {
          for (const [size, qty] of Object.entries(order.springs)) {
            if (pendingSprings[size]) {
              const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }
              for (const firmness of FIRMNESS_TYPES) {
                pendingSprings[size][firmness] += qty * (firmnessDistribution[firmness] || 0)
              }
            }
          }
        }
      }
    }
  }

  for (const size of ALL_SIZES) {
    const sizeWeeklyRate = salesRates.WEEKLY_SALES_RATE[size] || 0
    const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }

    for (const firmness of FIRMNESS_TYPES) {
      const firmnessRatio = firmnessDistribution[firmness] || 0
      const weeklyDemand = sizeWeeklyRate * firmnessRatio
      const currentStock = inventory.springs[firmness][size] || 0
      const pendingStock = pendingSprings[size][firmness] || 0

      const weeksUntilArrival = orderWeekOffset + LEAD_TIME_WEEKS
      const depletionUntilArrival = weeklyDemand * weeksUntilArrival
      const projectedStock = Math.max(0, currentStock - depletionUntilArrival + pendingStock)
      const projectedCoverage = weeklyDemand > 0 ? projectedStock / weeklyDemand : Infinity

      // Use size-specific minimum coverage target
      const minCoverageTarget = MIN_COVERAGE_BY_SIZE[size] || 6

      let status
      if (projectedCoverage < minCoverageTarget) {
        status = SKU_STATUS.CRITICAL
      } else if (projectedCoverage > OVERSTOCK_THRESHOLD) {
        status = SKU_STATUS.OVERSTOCKED
      } else {
        status = SKU_STATUS.NORMAL
      }

      const targetStock = weeklyDemand * minCoverageTarget
      const springsNeeded = Math.max(0, targetStock - projectedStock)

      skus.push({
        size,
        firmness,
        weeklyDemand,
        currentStock,
        pendingStock,
        projectedStock,
        projectedCoverage,
        status,
        targetStock,
        springsNeeded
      })
    }
  }

  return skus
}

/**
 * Main entry point: Demand-based order calculation
 */
export function calculateDemandBasedOrder(totalPallets, inventory, salesRates, pendingOrders, orderWeekOffset = 0) {
  // Step 1: Calculate per-SKU metrics
  const skuMetrics = calculateSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset)

  // Step 2: Allocate pallets to sizes, then distribute springs within each size
  const { palletsPerSize, springsPerSku } = allocatePalletsToSizes(totalPallets, skuMetrics)

  console.log('[DEMAND ORDER] Pallets per size:', palletsPerSize)
  console.log('[DEMAND ORDER] Springs per SKU:', springsPerSku)

  // Step 3: Create pallet objects
  const pallets = []
  let palletId = 1

  for (const size of ALL_SIZES) {
    const numPallets = palletsPerSize[size] || 0
    if (numPallets === 0) continue

    const firmAlloc = springsPerSku[`${size}|firm`] || 0
    const mediumAlloc = springsPerSku[`${size}|medium`] || 0
    const softAlloc = springsPerSku[`${size}|soft`] || 0

    const sizePallets = createPalletsForSize(size, numPallets, { firm: firmAlloc, medium: mediumAlloc, soft: softAlloc }, palletId)
    pallets.push(...sizePallets)
    palletId += sizePallets.length
  }

  // Step 4: Calculate spring quantities from pallets
  const springs = {
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  }

  for (const pallet of pallets) {
    for (const [firmness, quantity] of Object.entries(pallet.firmness_breakdown)) {
      springs[firmness][pallet.size] += quantity
    }
  }

  // Calculate metadata
  const palletsBySize = {}
  for (const size of ALL_SIZES) {
    palletsBySize[size] = pallets.filter(p => p.size === size).length
  }

  const smallSizesAllocated = []
  if (palletsBySize.Double > 0) smallSizesAllocated.push('Double')
  if (palletsBySize['King Single'] > 0) smallSizesAllocated.push('King Single')
  if (palletsBySize.Single > 0) smallSizesAllocated.push('Single')

  const criticalCount = skuMetrics.filter(s => s.status === SKU_STATUS.CRITICAL).length
  const overstockedCount = skuMetrics.filter(s => s.status === SKU_STATUS.OVERSTOCKED).length

  const metadata = {
    total_pallets: pallets.length,
    total_springs: pallets.reduce((sum, p) => sum + p.total, 0),
    king_pallets: palletsBySize.King || 0,
    queen_pallets: palletsBySize.Queen || 0,
    small_size_pallets: (palletsBySize.Double || 0) + (palletsBySize['King Single'] || 0) + (palletsBySize.Single || 0),
    small_sizes_allocated: smallSizesAllocated,
    critical_skus: criticalCount,
    overstocked_skus: overstockedCount,
    algorithm: 'sku-coverage-priority'
  }

  console.log('[DEMAND ORDER] Final:', metadata)

  return {
    springs,
    pallets,
    metadata,
    skuMetrics
  }
}

/**
 * Allocate pallets to sizes based on coverage, then distribute springs within each size
 */
function allocatePalletsToSizes(totalPallets, skuMetrics) {
  const palletsPerSize = { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  const springsPerSku = {}

  // Initialize springs allocation
  for (const sku of skuMetrics) {
    springsPerSku[`${sku.size}|${sku.firmness}`] = 0
  }

  // Create working copy for tracking coverage as we allocate
  const working = skuMetrics.map(sku => ({
    size: sku.size,
    firmness: sku.firmness,
    weeklyDemand: sku.weeklyDemand,
    projectedStock: sku.projectedStock,
    projectedCoverage: sku.projectedCoverage
  }))

  // Helper to get minimum coverage for a size (across its firmnesses with demand)
  const getSizeMinCoverage = (size) => {
    const firmnesses = working.filter(w => w.size === size && w.weeklyDemand > 0)
    if (firmnesses.length === 0) return Infinity
    return Math.min(...firmnesses.map(f => f.projectedCoverage))
  }

  // Helper to get total weekly demand for a size
  const getSizeDemand = (size) => {
    return working.filter(w => w.size === size).reduce((sum, w) => sum + w.weeklyDemand, 0)
  }

  // Allocate pallets one at a time to the size with most urgent need
  // Urgency = how far below the size-specific minimum coverage target
  let palletsRemaining = totalPallets

  while (palletsRemaining > 0) {
    // Find size with most urgent need (furthest below its minimum target)
    let bestSize = null
    let bestUrgency = -Infinity  // Higher = more urgent

    for (const size of ALL_SIZES) {
      const demand = getSizeDemand(size)
      if (demand === 0) continue

      const minCoverage = getSizeMinCoverage(size)
      const targetCoverage = MIN_COVERAGE_BY_SIZE[size] || 6

      // Urgency = target - current coverage (positive means below target)
      const urgency = targetCoverage - minCoverage

      if (urgency > bestUrgency) {
        bestUrgency = urgency
        bestSize = size
      }
    }

    if (!bestSize) {
      console.log(`[PALLET ALLOC] No sizes with demand, ${palletsRemaining} pallets unallocated`)
      break
    }

    // Allocate one pallet to this size
    palletsPerSize[bestSize]++
    palletsRemaining--

    // Update projected coverage for this size's firmnesses
    // Distribute the 30 springs proportionally by demand within the size
    const sizeFirmnesses = working.filter(w => w.size === bestSize && w.weeklyDemand > 0)
    const totalSizeDemand = sizeFirmnesses.reduce((sum, f) => sum + f.weeklyDemand, 0)

    if (totalSizeDemand > 0) {
      let springsDistributed = 0
      for (let i = 0; i < sizeFirmnesses.length; i++) {
        const f = sizeFirmnesses[i]
        let springs
        if (i === sizeFirmnesses.length - 1) {
          springs = SPRINGS_PER_PALLET - springsDistributed
        } else {
          springs = Math.round(SPRINGS_PER_PALLET * (f.weeklyDemand / totalSizeDemand))
        }
        f.projectedStock += springs
        f.projectedCoverage = f.projectedStock / f.weeklyDemand
        springsDistributed += springs
      }
    }

    const targetCoverage = MIN_COVERAGE_BY_SIZE[bestSize] || 6
    console.log(`[PALLET ALLOC] +1 pallet to ${bestSize} (coverage ${getSizeMinCoverage(bestSize).toFixed(1)}/${targetCoverage} weeks), ${palletsRemaining} remaining`)
  }

  // Now distribute springs within each size based on firmness coverage needs
  for (const size of ALL_SIZES) {
    const numPallets = palletsPerSize[size]
    if (numPallets === 0) continue

    const totalSprings = numPallets * SPRINGS_PER_PALLET
    const sizeFirmnesses = skuMetrics.filter(s => s.size === size)

    // Get firmnesses with demand
    const withDemand = sizeFirmnesses.filter(f => f.weeklyDemand > 0)

    if (withDemand.length === 0) {
      // No demand - shouldn't happen, but distribute evenly
      const perFirmness = Math.floor(totalSprings / 3)
      springsPerSku[`${size}|firm`] = perFirmness
      springsPerSku[`${size}|medium`] = perFirmness
      springsPerSku[`${size}|soft`] = totalSprings - 2 * perFirmness
      continue
    }

    // Distribute springs to firmnesses based on coverage priority
    // Always give to the firmness with lowest coverage first
    const targetCoverage = MIN_COVERAGE_BY_SIZE[size] || 6

    // Create working copy to track coverage as we allocate
    const firmnessWork = withDemand.map(f => ({
      firmness: f.firmness,
      weeklyDemand: f.weeklyDemand,
      projectedStock: f.projectedStock,
      projectedCoverage: f.projectedCoverage
    }))

    let springsRemaining = totalSprings
    const allocation = { firm: 0, medium: 0, soft: 0 }

    // Allocate springs one at a time to the firmness with lowest coverage
    while (springsRemaining > 0) {
      // Find firmness with lowest coverage
      firmnessWork.sort((a, b) => a.projectedCoverage - b.projectedCoverage)
      const target = firmnessWork[0]

      // Calculate how many springs to add to bring it up to next firmness's coverage
      let springsToAdd = 1
      if (firmnessWork.length > 1) {
        const nextCoverage = firmnessWork[1].projectedCoverage
        const coverageGap = nextCoverage - target.projectedCoverage
        if (coverageGap > 0 && target.weeklyDemand > 0) {
          springsToAdd = Math.ceil(coverageGap * target.weeklyDemand)
        }
      } else {
        // Only one firmness - give it all
        springsToAdd = springsRemaining
      }

      // Don't exceed remaining
      springsToAdd = Math.min(springsToAdd, springsRemaining)
      springsToAdd = Math.max(1, springsToAdd)

      // Allocate
      allocation[target.firmness] += springsToAdd
      target.projectedStock += springsToAdd
      target.projectedCoverage = target.weeklyDemand > 0 ? target.projectedStock / target.weeklyDemand : Infinity
      springsRemaining -= springsToAdd
    }

    // Assign to output
    springsPerSku[`${size}|firm`] = allocation.firm
    springsPerSku[`${size}|medium`] = allocation.medium
    springsPerSku[`${size}|soft`] = allocation.soft

    console.log(`[SPRING DIST] ${size}: firm=${allocation.firm}, medium=${allocation.medium}, soft=${allocation.soft}`)
  }

  return { palletsPerSize, springsPerSku }
}

/**
 * Create pallet objects for a size with given firmness allocation
 */
function createPalletsForSize(size, numPallets, firmnessAlloc, startId) {
  const pallets = []
  let palletId = startId
  const totalSprings = numPallets * SPRINGS_PER_PALLET

  // Copy allocation for modification
  const remaining = { ...firmnessAlloc }
  const total = remaining.firm + remaining.medium + remaining.soft

  // Adjust if allocation doesn't match expected total (rounding issues)
  if (total !== totalSprings) {
    const diff = totalSprings - total
    // Add/remove from the firmness with highest allocation
    const maxFirmness = Object.entries(remaining).sort((a, b) => b[1] - a[1])[0][0]
    remaining[maxFirmness] += diff
  }

  // Create pure pallets first (single firmness, 30 springs)
  for (const firmness of FIRMNESS_TYPES) {
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

  // Create mixed pallets from remainders
  while (Object.values(remaining).reduce((a, b) => a + b, 0) >= SPRINGS_PER_PALLET) {
    const pallet = {
      id: palletId++,
      size,
      type: 'Mixed',
      firmness_breakdown: {},
      total: 0
    }

    for (const firmness of FIRMNESS_TYPES) {
      if (remaining[firmness] > 0) {
        const toAdd = Math.min(remaining[firmness], SPRINGS_PER_PALLET - pallet.total)
        if (toAdd > 0) {
          pallet.firmness_breakdown[firmness] = toAdd
          remaining[firmness] -= toAdd
          pallet.total += toAdd
        }
      }
    }

    if (pallet.total > 0) {
      pallets.push(pallet)
    }
  }

  return pallets
}
