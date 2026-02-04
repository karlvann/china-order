/**
 * DEMAND-BASED ORDER ALGORITHM (Per-SKU Allocation)
 *
 * Allocates pallets based on per-SKU (size/firmness) coverage needs:
 * 1. Calculate projected coverage for all 15 SKUs (5 sizes x 3 firmnesses)
 * 2. Classify each SKU as CRITICAL, NORMAL, or OVERSTOCKED
 * 3. Allocate pallets to sizes based on their non-overstocked firmness needs
 * 4. Build pallets that skip overstocked firmnesses entirely
 *
 * Key thresholds:
 * - CRITICAL: projectedCoverage < MIN_COVERAGE_TARGET (10 weeks) - must order
 * - OVERSTOCKED: projectedCoverage > OVERSTOCK_THRESHOLD (30 weeks) - must not order
 * - NORMAL: between thresholds - can receive springs if space available
 */

import {
  SPRINGS_PER_PALLET,
  LEAD_TIME_WEEKS,
  MIN_COVERAGE_TARGET,
  OVERSTOCK_THRESHOLD,
  FIRMNESS_TYPES
} from '../constants/index.js'

// All mattress sizes
const ALL_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single']

// SKU status classifications
const SKU_STATUS = {
  CRITICAL: 'CRITICAL',
  NORMAL: 'NORMAL',
  OVERSTOCKED: 'OVERSTOCKED'
}

/**
 * Calculate metrics for all 15 SKUs (5 sizes x 3 firmnesses)
 *
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 * @param pendingOrders - Pending orders [{ arrivalWeekIndex, springs: { size: qty } }]
 * @param orderWeekOffset - Week offset for order placement
 * @returns Array of SKU metrics objects
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
      // Only count orders that arrive before the new order
      if (order.arrivalWeekIndex >= 0 && order.arrivalWeekIndex <= newOrderArrivalWeek) {
        // Handle firmness-level data (springsByFirmness: { firmness: { size: qty } })
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
        }
        // Legacy: handle springs by size only (distribute by sales ratio) - fallback
        else if (order.springs) {
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

  console.log('[SKU METRICS] Pending springs by firmness:', JSON.stringify(pendingSprings))

  for (const size of ALL_SIZES) {
    const sizeWeeklyRate = salesRates.WEEKLY_SALES_RATE[size] || 0
    const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }

    for (const firmness of FIRMNESS_TYPES) {
      const firmnessRatio = firmnessDistribution[firmness] || 0
      const weeklyDemand = sizeWeeklyRate * firmnessRatio
      const currentStock = inventory.springs[firmness][size] || 0
      const pendingStock = pendingSprings[size][firmness] || 0

      // Depletion from now until order arrives (orderWeekOffset + lead time)
      const weeksUntilArrival = orderWeekOffset + LEAD_TIME_WEEKS
      const depletionUntilArrival = weeklyDemand * weeksUntilArrival

      // Projected stock at arrival
      const projectedStock = Math.max(0, currentStock - depletionUntilArrival + pendingStock)

      // Projected coverage at arrival (in weeks)
      const projectedCoverage = weeklyDemand > 0 ? projectedStock / weeklyDemand : Infinity

      // Classify SKU status
      let status
      if (projectedCoverage < MIN_COVERAGE_TARGET) {
        status = SKU_STATUS.CRITICAL
      } else if (projectedCoverage > OVERSTOCK_THRESHOLD) {
        status = SKU_STATUS.OVERSTOCKED
      } else {
        status = SKU_STATUS.NORMAL
      }

      // Target stock to reach MIN_COVERAGE_TARGET
      const targetStock = weeklyDemand * MIN_COVERAGE_TARGET
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
 * Allocate pallets across sizes based on SKU metrics
 *
 * Distributes pallets PROPORTIONALLY based on each size's demand needs,
 * rather than giving everything to the most critical size first.
 *
 * @param totalPallets - Number of pallets in container
 * @param skuMetrics - Array of SKU metrics from calculateSkuMetrics
 * @returns Object mapping size to number of pallets allocated
 */
function allocatePalletsBySku(totalPallets, skuMetrics) {
  // Group by size and calculate size-level needs
  const sizeNeeds = ALL_SIZES.map(size => {
    // Get non-overstocked firmnesses for this size
    const firmnesses = skuMetrics.filter(s => s.size === size && s.status !== SKU_STATUS.OVERSTOCKED)

    // Calculate total springs needed for this size (only non-overstocked firmnesses)
    const springsNeeded = firmnesses.reduce((sum, f) => sum + f.springsNeeded, 0)

    // Total weekly demand for non-overstocked firmnesses (used for proportional allocation)
    const weeklyDemand = firmnesses.reduce((sum, f) => sum + f.weeklyDemand, 0)

    // Minimum coverage among non-overstocked firmnesses (used for priority)
    const minCoverage = firmnesses.length > 0
      ? Math.min(...firmnesses.map(f => f.projectedCoverage))
      : Infinity

    // Check if any firmness is critical
    const hasCritical = firmnesses.some(f => f.status === SKU_STATUS.CRITICAL)

    return {
      size,
      firmnesses,
      springsNeeded,
      weeklyDemand,
      palletsNeeded: springsNeeded > 0 ? Math.ceil(springsNeeded / SPRINGS_PER_PALLET) : 0,
      minCoverage,
      hasCritical
    }
  })

  // Initialize allocation
  const allocation = {}
  for (const size of ALL_SIZES) {
    allocation[size] = 0
  }

  // Calculate total springs needed and total demand across all sizes
  const totalSpringsNeeded = sizeNeeds.reduce((sum, sn) => sum + sn.springsNeeded, 0)
  const totalWeeklyDemand = sizeNeeds.reduce((sum, sn) => sum + sn.weeklyDemand, 0)
  const totalSpringsAvailable = totalPallets * SPRINGS_PER_PALLET

  console.log(`[SKU ALLOC] Total springs needed: ${totalSpringsNeeded}, available: ${totalSpringsAvailable}`)

  // Distribute pallets proportionally based on demand
  if (totalWeeklyDemand > 0) {
    let remaining = totalPallets
    const proportionalAllocations = []

    // Calculate proportional allocation for each size
    for (const sn of sizeNeeds) {
      if (sn.weeklyDemand === 0 || sn.firmnesses.length === 0) {
        proportionalAllocations.push({ size: sn.size, proportion: 0, pallets: 0 })
        continue
      }

      const proportion = sn.weeklyDemand / totalWeeklyDemand
      const idealPallets = proportion * totalPallets
      const floorPallets = Math.floor(idealPallets)

      proportionalAllocations.push({
        size: sn.size,
        proportion,
        idealPallets,
        pallets: floorPallets,
        remainder: idealPallets - floorPallets,
        sizeNeed: sn
      })

      allocation[sn.size] = floorPallets
      remaining -= floorPallets

      console.log(`[SKU ALLOC] ${sn.size}: ${floorPallets} pallets (${(proportion * 100).toFixed(1)}% demand, ideal=${idealPallets.toFixed(2)}, minCov=${sn.minCoverage.toFixed(1)}wks)`)
    }

    // Distribute remaining pallets by largest remainder (ensures fair rounding)
    // But prioritize sizes with critical firmnesses
    proportionalAllocations.sort((a, b) => {
      // Critical sizes get priority for remainder allocation
      const aCritical = a.sizeNeed?.hasCritical || false
      const bCritical = b.sizeNeed?.hasCritical || false
      if (aCritical && !bCritical) return -1
      if (!aCritical && bCritical) return 1

      // Then by remainder (largest first)
      return b.remainder - a.remainder
    })

    for (const pa of proportionalAllocations) {
      if (remaining === 0) break
      if (pa.sizeNeed?.firmnesses?.length === 0) continue

      allocation[pa.size]++
      remaining--
      console.log(`[SKU ALLOC] Remainder pallet to ${pa.size} (remainder=${pa.remainder.toFixed(2)}, critical=${pa.sizeNeed?.hasCritical})`)
    }

    // If still remaining (shouldn't happen), give to lowest coverage
    while (remaining > 0) {
      const bestSize = findLowestCoverageSize(sizeNeeds, allocation, skuMetrics)
      if (!bestSize) {
        console.log(`[SKU ALLOC] ${remaining} pallets remaining but no sizes can accept more`)
        break
      }
      allocation[bestSize]++
      remaining--
      console.log(`[SKU ALLOC] Extra pallet to ${bestSize}`)
    }
  }

  return allocation
}

/**
 * Find the size with lowest coverage after current allocation that can still accept springs
 * (i.e., has at least one non-overstocked firmness that wouldn't become overstocked)
 */
function findLowestCoverageSize(sizeNeeds, allocation, skuMetrics) {
  let bestSize = null
  let lowestCoverage = Infinity

  for (const sn of sizeNeeds) {
    // Skip if no non-overstocked firmnesses
    if (sn.firmnesses.length === 0) continue

    // Calculate coverage after adding another pallet
    const currentAllocation = allocation[sn.size]
    const totalSpringsAllocated = currentAllocation * SPRINGS_PER_PALLET

    // Would adding another pallet push all firmnesses over threshold?
    const wouldOverstock = sn.firmnesses.every(f => {
      const extraSprings = (currentAllocation + 1) * SPRINGS_PER_PALLET * (f.weeklyDemand / sn.firmnesses.reduce((sum, x) => sum + x.weeklyDemand, 0) || 0)
      const newStock = f.projectedStock + extraSprings
      const newCoverage = f.weeklyDemand > 0 ? newStock / f.weeklyDemand : Infinity
      return newCoverage > OVERSTOCK_THRESHOLD
    })

    if (wouldOverstock) continue

    // Calculate coverage after current allocation
    let coverageAfterAllocation = Infinity
    for (const f of sn.firmnesses) {
      const shareRatio = f.weeklyDemand / sn.firmnesses.reduce((sum, x) => sum + x.weeklyDemand, 0) || 0
      const springsForFirmness = totalSpringsAllocated * shareRatio
      const stockAfter = f.projectedStock + springsForFirmness
      const coverage = f.weeklyDemand > 0 ? stockAfter / f.weeklyDemand : Infinity
      coverageAfterAllocation = Math.min(coverageAfterAllocation, coverage)
    }

    if (coverageAfterAllocation < lowestCoverage) {
      lowestCoverage = coverageAfterAllocation
      bestSize = sn.size
    }
  }

  return bestSize
}

/**
 * Build pallets for a size, distributing springs only to non-overstocked firmnesses
 *
 * @param size - Mattress size
 * @param numPallets - Number of pallets allocated to this size
 * @param skuMetrics - Full SKU metrics array
 * @param palletIdStart - Starting pallet ID
 * @returns Array of pallet objects
 */
function buildPalletsForSize(size, numPallets, skuMetrics, palletIdStart) {
  if (numPallets === 0) return []

  const totalSprings = numPallets * SPRINGS_PER_PALLET

  // Get non-overstocked firmnesses for this size
  const eligibleFirmnesses = skuMetrics.filter(
    s => s.size === size && s.status !== SKU_STATUS.OVERSTOCKED
  )

  if (eligibleFirmnesses.length === 0) {
    console.warn(`[BUILD PALLETS] ${size}: No eligible firmnesses (all overstocked), skipping`)
    return []
  }

  // Calculate springs needed for each eligible firmness
  const allocation = {}
  let totalNeeded = 0

  for (const f of eligibleFirmnesses) {
    allocation[f.firmness] = f.springsNeeded
    totalNeeded += f.springsNeeded
  }

  // Scale allocation to match available springs
  if (totalNeeded > 0) {
    const scaleFactor = totalSprings / totalNeeded

    for (const f of eligibleFirmnesses) {
      allocation[f.firmness] = Math.round(allocation[f.firmness] * scaleFactor)
    }
  } else {
    // If no firmness needs springs, distribute proportionally by demand
    const totalDemand = eligibleFirmnesses.reduce((sum, f) => sum + f.weeklyDemand, 0)
    if (totalDemand > 0) {
      for (const f of eligibleFirmnesses) {
        allocation[f.firmness] = Math.round((f.weeklyDemand / totalDemand) * totalSprings)
      }
    } else {
      // Fallback: distribute evenly
      const perFirmness = Math.floor(totalSprings / eligibleFirmnesses.length)
      for (const f of eligibleFirmnesses) {
        allocation[f.firmness] = perFirmness
      }
    }
  }

  // Adjust for rounding to exactly totalSprings
  let sum = Object.values(allocation).reduce((a, b) => a + b, 0)
  const diff = totalSprings - sum

  if (diff !== 0) {
    // Add/remove from the firmness with highest need (or highest demand if tied)
    const sortedFirmnesses = [...eligibleFirmnesses].sort((a, b) => {
      if (a.springsNeeded !== b.springsNeeded) return b.springsNeeded - a.springsNeeded
      return b.weeklyDemand - a.weeklyDemand
    })
    allocation[sortedFirmnesses[0].firmness] += diff
  }

  console.log(`[BUILD PALLETS] ${size}: ${numPallets} pallets, allocation:`, allocation)

  // Create pallets from allocation
  return createPalletsFromAllocation(size, allocation, palletIdStart)
}

/**
 * Create pallet objects from a firmness allocation
 *
 * @param size - Mattress size
 * @param allocation - Object mapping firmness to spring count
 * @param palletIdStart - Starting pallet ID
 * @returns Array of pallet objects (each exactly 30 springs)
 */
function createPalletsFromAllocation(size, allocation, palletIdStart) {
  const pallets = []
  let palletId = palletIdStart

  // Create a copy of remaining springs to allocate
  const remaining = { ...allocation }
  const eligibleFirmnesses = FIRMNESS_TYPES.filter(f => remaining[f] > 0)

  // First, create pure pallets (single firmness)
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

  // Then, create mixed pallets from remainders
  while (Object.values(remaining).reduce((a, b) => a + b, 0) >= SPRINGS_PER_PALLET) {
    const pallet = {
      id: palletId++,
      size,
      type: 'Mixed',
      firmness_breakdown: {},
      total: 0
    }

    // Fill pallet with available firmnesses
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

  // Handle any final remainder (should be < 30 springs)
  const totalRemaining = Object.values(remaining).reduce((a, b) => a + b, 0)
  if (totalRemaining > 0) {
    // Add to the last pallet by padding with proportional firmness
    // This shouldn't happen if allocation was calculated correctly
    console.warn(`[BUILD PALLETS] ${size}: ${totalRemaining} springs remaining after pallet creation`)
  }

  return pallets
}

/**
 * Main entry point: Demand-based order calculation with per-SKU allocation
 *
 * @param totalPallets - Number of pallets in container
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 * @param pendingOrders - Pending orders [{ arrivalWeekIndex, springs: { size: qty } }]
 * @param orderWeekOffset - Week offset for order placement (default 0)
 * @returns { springs, pallets, metadata, skuMetrics }
 */
export function calculateDemandBasedOrder(totalPallets, inventory, salesRates, pendingOrders, orderWeekOffset = 0) {
  // Step 1: Calculate per-SKU metrics
  const skuMetrics = calculateSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset)

  // Log SKU status summary
  console.log('[DEMAND ORDER] SKU metrics:')
  for (const sku of skuMetrics) {
    console.log(`  ${sku.size} ${sku.firmness}: stock=${sku.currentStock}, projected=${sku.projectedStock.toFixed(0)}, coverage=${sku.projectedCoverage.toFixed(1)}wks, status=${sku.status}`)
  }

  // Step 2: Allocate pallets across sizes
  const allocation = allocatePalletsBySku(totalPallets, skuMetrics)

  console.log('[DEMAND ORDER] Size allocation:', allocation)

  // Step 3: Build pallets for each size
  const pallets = []
  let palletId = 1

  for (const size of ALL_SIZES) {
    const numPallets = allocation[size]
    if (numPallets === 0) continue

    const sizePallets = buildPalletsForSize(size, numPallets, skuMetrics, palletId)
    pallets.push(...sizePallets)
    palletId += sizePallets.length
  }

  // Step 4: Calculate total spring quantities by firmness/size
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

  // Determine which small sizes got pallets
  const smallSizesAllocated = []
  if (allocation.Double > 0) smallSizesAllocated.push('Double')
  if (allocation['King Single'] > 0) smallSizesAllocated.push('King Single')
  if (allocation.Single > 0) smallSizesAllocated.push('Single')

  // Count SKUs by status
  const criticalCount = skuMetrics.filter(s => s.status === SKU_STATUS.CRITICAL).length
  const overstockedCount = skuMetrics.filter(s => s.status === SKU_STATUS.OVERSTOCKED).length

  // Calculate metadata
  const metadata = {
    total_pallets: totalPallets,
    total_springs: pallets.reduce((sum, p) => sum + p.total, 0),
    king_pallets: allocation.King,
    queen_pallets: allocation.Queen,
    small_size_pallets: allocation.Double + allocation['King Single'] + allocation.Single,
    small_sizes_allocated: smallSizesAllocated,
    critical_skus: criticalCount,
    overstocked_skus: overstockedCount,
    algorithm: 'demand-based-sku'
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
 * Legacy export for compatibility - wraps the new allocation logic
 */
export function demandBasedAllocation(totalPallets, inventory, salesRates, pendingOrders, orderWeekOffset = 0) {
  const skuMetrics = calculateSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset)
  return allocatePalletsBySku(totalPallets, skuMetrics)
}
