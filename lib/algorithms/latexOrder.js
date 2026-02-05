/**
 * LATEX ORDER ALGORITHM (Sri Lanka)
 *
 * Allocates container capacity based on per-SKU coverage needs.
 *
 * Key differences from spring algorithm:
 * - Only 6 SKUs (3 firmnesses × 2 sizes: King and Queen)
 * - No pallet constraint - items can be allocated individually
 * - Container capacity: 340 (40ft) or 170 (20ft)
 *
 * Algorithm:
 * 1. Calculate projected coverage for all 6 SKUs
 * 2. Allocate items to lowest-coverage SKUs first
 * 3. Priority: Queen > King (Queen sells more)
 */

import {
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  LATEX_LEAD_TIME_WEEKS,
  LATEX_SIZE_PRIORITY_WEIGHT,
  LATEX_MIN_COVERAGE_TARGETS,
  OVERSTOCK_THRESHOLD
} from '../constants/index.js'

// SKU status classifications
const SKU_STATUS = {
  CRITICAL: 'CRITICAL',
  NORMAL: 'NORMAL',
  OVERSTOCKED: 'OVERSTOCKED'
}

/**
 * Calculate metrics for all 6 latex SKUs
 */
export function calculateLatexSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset = 0, deliveryWeeks = LATEX_LEAD_TIME_WEEKS) {
  const skus = []
  const newOrderArrivalWeek = orderWeekOffset + deliveryWeeks

  // Calculate pending latex per firmness/size from existing orders
  const pendingLatex = {}
  for (const firmness of LATEX_FIRMNESSES) {
    pendingLatex[firmness] = { King: 0, Queen: 0 }
  }

  if (pendingOrders && pendingOrders.length > 0) {
    for (const order of pendingOrders) {
      if (order.arrivalWeekIndex >= 0 && order.arrivalWeekIndex <= newOrderArrivalWeek) {
        if (order.latexByFirmness) {
          for (const firmness of LATEX_FIRMNESSES) {
            if (order.latexByFirmness[firmness]) {
              for (const size of LATEX_SIZES) {
                const qty = order.latexByFirmness[firmness][size] || 0
                pendingLatex[firmness][size] += qty
              }
            }
          }
        }
      }
    }
  }

  // Get weekly demand rates - either detailed or simple format
  const weeklyRates = salesRates.WEEKLY_RATES || {}
  const weeklyTotals = salesRates.WEEKLY_TOTAL_BY_SIZE || {}

  for (const size of LATEX_SIZES) {
    // Get total weekly demand for this size
    const sizeWeeklyTotal = weeklyTotals[size] || 0

    // Get firmness distribution for this size
    const firmnessDist = salesRates.FIRMNESS_DISTRIBUTION?.[size] || { firm: 0.33, medium: 0.34, soft: 0.33 }

    for (const firmness of LATEX_FIRMNESSES) {
      // Calculate weekly demand for this firmness/size
      let weeklyDemand
      if (weeklyRates[firmness] && weeklyRates[firmness][size] !== undefined) {
        // Use detailed rates if available
        weeklyDemand = weeklyRates[firmness][size]
      } else {
        // Fall back to distribution calculation
        const firmnessRatio = firmnessDist[firmness] || 0.33
        weeklyDemand = sizeWeeklyTotal * firmnessRatio
      }

      // Get current inventory
      const currentStock = inventory[firmness]?.[size] || 0
      const pendingStock = pendingLatex[firmness][size]

      // Calculate projection at arrival
      const weeksUntilArrival = orderWeekOffset + deliveryWeeks
      const depletionUntilArrival = weeklyDemand * weeksUntilArrival
      const projectedStock = Math.max(0, currentStock - depletionUntilArrival + pendingStock)
      const projectedCoverage = weeklyDemand > 0 ? projectedStock / weeklyDemand : Infinity

      // Determine status
      const minCoverageTarget = LATEX_MIN_COVERAGE_TARGETS[size] || 8
      let status
      if (projectedCoverage < minCoverageTarget) {
        status = SKU_STATUS.CRITICAL
      } else if (projectedCoverage > OVERSTOCK_THRESHOLD) {
        status = SKU_STATUS.OVERSTOCKED
      } else {
        status = SKU_STATUS.NORMAL
      }

      // Calculate how many items needed to reach target
      const targetStock = weeklyDemand * minCoverageTarget
      const itemsNeeded = Math.max(0, Math.ceil(targetStock - projectedStock))

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
        itemsNeeded
      })
    }
  }

  return skus
}

/**
 * Main entry point: Calculate latex order
 */
export function calculateLatexOrder(containerCapacity, inventory, salesRates, pendingOrders, orderWeekOffset = 0, deliveryWeeks = LATEX_LEAD_TIME_WEEKS) {
  // Step 1: Calculate per-SKU metrics
  const skuMetrics = calculateLatexSkuMetrics(inventory, salesRates, pendingOrders, orderWeekOffset, deliveryWeeks)

  // Step 2: Allocate items to SKUs based on coverage priority
  const allocation = allocateLatexItems(containerCapacity, skuMetrics)

  console.log('[LATEX ORDER] Allocation:', allocation)

  // Step 3: Build latex order structure
  const latex = {
    firm: { King: 0, Queen: 0 },
    medium: { King: 0, Queen: 0 },
    soft: { King: 0, Queen: 0 }
  }

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      latex[firmness][size] = allocation[`${firmness}|${size}`] || 0
    }
  }

  // Calculate totals
  let totalItems = 0
  const totalBySize = { King: 0, Queen: 0 }
  const totalByFirmness = { firm: 0, medium: 0, soft: 0 }

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      const qty = latex[firmness][size]
      totalItems += qty
      totalBySize[size] += qty
      totalByFirmness[firmness] += qty
    }
  }

  const criticalCount = skuMetrics.filter(s => s.status === SKU_STATUS.CRITICAL).length
  const overstockedCount = skuMetrics.filter(s => s.status === SKU_STATUS.OVERSTOCKED).length

  const metadata = {
    total_items: totalItems,
    container_capacity: containerCapacity,
    capacity_used_percent: Math.round((totalItems / containerCapacity) * 100),
    king_total: totalBySize.King,
    queen_total: totalBySize.Queen,
    firm_total: totalByFirmness.firm,
    medium_total: totalByFirmness.medium,
    soft_total: totalByFirmness.soft,
    critical_skus: criticalCount,
    overstocked_skus: overstockedCount,
    algorithm: 'coverage-priority'
  }

  console.log('[LATEX ORDER] Final:', metadata)

  return {
    latex,
    metadata,
    skuMetrics
  }
}

/**
 * Allocate container capacity to latex SKUs for equal runout
 * Allocates in increments of 5 for cleaner order quantities
 *
 * Goal: All items should run out at approximately the same time
 *
 * Math:
 * - Target runout week T = (container_capacity + total_current_stock) / total_weekly_demand
 * - For each SKU: order_qty = (T * weekly_demand) - current_stock
 */
function allocateLatexItems(containerCapacity, skuMetrics) {
  const BATCH_INCREMENT = 5
  const allocation = {}

  // Initialize allocation
  for (const sku of skuMetrics) {
    allocation[`${sku.firmness}|${sku.size}`] = 0
  }

  // Filter SKUs with demand
  const skusWithDemand = skuMetrics.filter(sku => sku.weeklyDemand > 0)

  if (skusWithDemand.length === 0) {
    console.log('[LATEX ALLOC] No SKUs with demand')
    return allocation
  }

  // Calculate totals
  const totalWeeklyDemand = skusWithDemand.reduce((sum, sku) => sum + sku.weeklyDemand, 0)
  const totalCurrentStock = skusWithDemand.reduce((sum, sku) => sum + sku.projectedStock, 0)

  // Calculate target runout week (when all items should deplete)
  // T = (container + current_stock) / weekly_demand
  const targetRunoutWeek = (containerCapacity + totalCurrentStock) / totalWeeklyDemand

  console.log(`[LATEX ALLOC] Target runout: ${targetRunoutWeek.toFixed(1)} weeks`)
  console.log(`[LATEX ALLOC] Total weekly demand: ${totalWeeklyDemand.toFixed(1)}, Total current stock: ${totalCurrentStock}`)

  // Calculate ideal allocation for each SKU to achieve equal runout
  let totalAllocated = 0
  const idealAllocation = {}

  for (const sku of skusWithDemand) {
    const key = `${sku.firmness}|${sku.size}`
    // order_qty = (T * weekly_demand) - current_stock
    const idealQty = (targetRunoutWeek * sku.weeklyDemand) - sku.projectedStock
    // Round to nearest 5, minimum 0
    const roundedQty = Math.max(0, Math.round(idealQty / BATCH_INCREMENT) * BATCH_INCREMENT)
    idealAllocation[key] = roundedQty
    totalAllocated += roundedQty

    const newCoverage = (sku.projectedStock + roundedQty) / sku.weeklyDemand
    console.log(`[LATEX ALLOC] ${sku.firmness} ${sku.size}: ${roundedQty} items (coverage ${newCoverage.toFixed(1)} weeks)`)
  }

  // Adjust if total doesn't match container capacity (due to rounding)
  let difference = containerCapacity - totalAllocated

  // If we have leftover capacity, distribute to items with lowest coverage
  // If we over-allocated, reduce from items with highest coverage
  while (Math.abs(difference) >= BATCH_INCREMENT) {
    if (difference > 0) {
      // Add 5 to the SKU with lowest coverage after allocation
      let lowestCoverage = Infinity
      let lowestKey = null

      for (const sku of skusWithDemand) {
        const key = `${sku.firmness}|${sku.size}`
        const newCoverage = (sku.projectedStock + idealAllocation[key]) / sku.weeklyDemand
        if (newCoverage < lowestCoverage) {
          lowestCoverage = newCoverage
          lowestKey = key
        }
      }

      if (lowestKey) {
        idealAllocation[lowestKey] += BATCH_INCREMENT
        difference -= BATCH_INCREMENT
      } else {
        break
      }
    } else {
      // Remove 5 from the SKU with highest coverage after allocation
      let highestCoverage = -Infinity
      let highestKey = null

      for (const sku of skusWithDemand) {
        const key = `${sku.firmness}|${sku.size}`
        if (idealAllocation[key] < BATCH_INCREMENT) continue // Can't reduce below 0

        const newCoverage = (sku.projectedStock + idealAllocation[key]) / sku.weeklyDemand
        if (newCoverage > highestCoverage) {
          highestCoverage = newCoverage
          highestKey = key
        }
      }

      if (highestKey) {
        idealAllocation[highestKey] -= BATCH_INCREMENT
        difference += BATCH_INCREMENT
      } else {
        break
      }
    }
  }

  // Copy to final allocation
  for (const key of Object.keys(allocation)) {
    allocation[key] = idealAllocation[key] || 0
  }

  return allocation
}

/**
 * Convert database orders to algorithm format
 * Returns [{ arrivalWeekIndex, latexByFirmness: { firmness: { size: qty } } }]
 */
export function convertOrdersForLatexAlgorithm(dbOrders) {
  const monday = getCurrentMonday()

  return dbOrders.map(order => {
    const arrivalDate = new Date(order.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    const latexByFirmness = {
      firm: { King: 0, Queen: 0 },
      medium: { King: 0, Queen: 0 },
      soft: { King: 0, Queen: 0 }
    }

    if (order.skus) {
      for (const item of order.skus) {
        const sku = item.skus_id?.sku || ''
        const qty = item.quantity || 0

        // Parse latex SKUs: latex{firmness}{size}
        if (sku.startsWith('latex')) {
          for (const firmness of LATEX_FIRMNESSES) {
            if (sku.includes(firmness)) {
              for (const size of LATEX_SIZES) {
                if (sku.includes(size.toLowerCase())) {
                  latexByFirmness[firmness][size] += qty
                }
              }
            }
          }
        }
      }
    }

    return { arrivalWeekIndex, latexByFirmness }
  })
}

/**
 * Get the Monday of the current week
 */
function getCurrentMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.setDate(diff))
}
