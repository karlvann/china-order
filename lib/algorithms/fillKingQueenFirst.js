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
 * All sales rates come from live Directus data, passed in as salesRates parameter.
 */

import { SPRINGS_PER_PALLET, LEAD_TIME_WEEKS } from '../constants/index.js'
import { createPalletsForSize } from './palletCreation.js'

/**
 * PREDICTIVE STRATEGY: Queen Medium-Driven Ordering
 *
 * Target: 60 Queen Medium units at arrival (midpoint of 50-70 range)
 */
const TARGET_QUEEN_MEDIUM_AT_ARRIVAL = 60

// Derive target coverage for each size based on Queen Medium target
const TARGET_COVERAGE_AT_ARRIVAL = 8 // Weeks of coverage at arrival (~2 months)

/**
 * Calculate coverage (weeks of inventory remaining) for a size using live rates
 */
function calculateCoverageWithRates(inventory, size, weeklyRates) {
  const totalStock =
    (inventory.springs.firm[size] || 0) +
    (inventory.springs.medium[size] || 0) +
    (inventory.springs.soft[size] || 0)

  const weeklySales = weeklyRates[size] || 0
  if (weeklySales === 0) {
    return totalStock > 0 ? Infinity : 0
  }
  return totalStock / weeklySales
}

/**
 * Calculate how many pallets a size needs to reach target coverage AT ARRIVAL
 */
function calculatePalletsNeeded(size, inventory, weeklyRates) {
  const weeklySales = weeklyRates[size] || 0

  // Current stock
  const currentTotalSprings =
    (inventory.springs.firm[size] || 0) +
    (inventory.springs.medium[size] || 0) +
    (inventory.springs.soft[size] || 0)

  // Stock depletion from when we ORDER to when container ARRIVES (10 weeks)
  const depletionDuringLeadTime = weeklySales * LEAD_TIME_WEEKS

  // Projected stock when container arrives
  const projectedStockAtArrival = currentTotalSprings - depletionDuringLeadTime

  // Target stock at arrival (e.g., 8 weeks coverage)
  const targetStockAtArrival = weeklySales * TARGET_COVERAGE_AT_ARRIVAL

  // How many springs do we need to order?
  const springsNeeded = targetStockAtArrival - projectedStockAtArrival

  if (springsNeeded <= 0) {
    return 0 // Already at or above target (even after depletion)
  }

  // Round up to full pallets
  return Math.ceil(springsNeeded / SPRINGS_PER_PALLET)
}

/**
 * SIMPLIFIED: Queen Medium-Driven Allocation
 *
 * @param totalPallets - Number of pallets in container
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 * @param pendingArrivals - Optional pending container arrivals
 * @param currentWeekOffset - Optional current week offset
 */
export function fillKingQueenFirst(totalPallets, inventory, salesRates, pendingArrivals, currentWeekOffset) {
  const weeklyRates = salesRates.WEEKLY_SALES_RATE
  const firmnessDistribution = salesRates.FIRMNESS_DISTRIBUTION

  // Step 1: Calculate ONLY Queen Medium needs (the driver of all ordering)
  const qmCurrent = Number(inventory.springs?.medium?.['Queen']) || 0

  // Calculate how much QM is coming from pending containers
  let pendingQM = 0
  let actualWeeksOfDepletion = LEAD_TIME_WEEKS // Default 10 weeks

  if (pendingArrivals && currentWeekOffset !== undefined) {
    const newOrderArrivalWeek = currentWeekOffset + LEAD_TIME_WEEKS

    for (const pa of pendingArrivals) {
      const paActualArrival = pa.arrivalWeek
      if (paActualArrival > currentWeekOffset && paActualArrival <= newOrderArrivalWeek) {
        const queenPallets = pa.order.springOrder.pallets.filter((p) => p.size === 'Queen').length
        const qmInContainer = queenPallets * SPRINGS_PER_PALLET * (firmnessDistribution['Queen']?.medium || 0.83)
        pendingQM += qmInContainer
      }
    }
  }

  // Project QM at arrival INCLUDING pending containers
  const queenWeeklyRate = weeklyRates['Queen'] || 0
  const queenMediumRatio = firmnessDistribution['Queen']?.medium || 0.83
  const actualDepletion = queenWeeklyRate * queenMediumRatio * actualWeeksOfDepletion
  const qmAtArrival = qmCurrent - actualDepletion + pendingQM
  const qmNeeded = Math.max(0, TARGET_QUEEN_MEDIUM_AT_ARRIVAL - qmAtArrival)

  // Convert QM needed to Queen pallets
  const queenPalletsNeeded = Math.ceil(qmNeeded / (SPRINGS_PER_PALLET * queenMediumRatio))

  // King gets proportional allocation based on sales velocity
  const kingWeeklyRate = weeklyRates['King'] || 0
  const kingPalletsNeeded = queenWeeklyRate > 0
    ? Math.round(queenPalletsNeeded * (kingWeeklyRate / queenWeeklyRate))
    : 0

  console.log(`[ORDER CALC] Total pallets=${totalPallets}, QM current=${qmCurrent.toFixed(0)}, pending QM=${pendingQM.toFixed(0)}, QM at arrival=${qmAtArrival.toFixed(0)}, Queen needs ${queenPalletsNeeded} pallets, King needs ${kingPalletsNeeded} pallets`)

  let allocation = {
    King: 0,
    Queen: 0,
    Double: 0,
    'King Single': 0,
    Single: 0
  }

  const kingQueenTotal = kingPalletsNeeded + queenPalletsNeeded
  console.log(`[ORDER CALC] King+Queen need ${kingQueenTotal} pallets total (King: ${kingPalletsNeeded}, Queen: ${queenPalletsNeeded})`)

  // Step 2: Allocate King/Queen pallets
  if (kingQueenTotal >= totalPallets) {
    // CRISIS MODE: Need more than available, give everything to King/Queen
    const kingRatio = kingQueenTotal > 0 ? kingPalletsNeeded / kingQueenTotal : 0.5
    allocation.King = Math.round(totalPallets * kingRatio)
    allocation.Queen = totalPallets - allocation.King
    return allocation
  }

  // NORMAL MODE: King/Queen need less than total
  allocation.King = kingPalletsNeeded
  allocation.Queen = queenPalletsNeeded

  // MINIMUM ALLOCATION: Queen is 51% of business
  if (allocation.Queen === 0 && totalPallets >= 3) {
    allocation.Queen = 1
  }

  const remainingPallets = totalPallets - (allocation.King + allocation.Queen)

  if (remainingPallets === 0) {
    return allocation
  }

  // Step 4: Distribute remaining pallets to small sizes based on coverage
  const smallSizes = ['Double', 'King Single', 'Single']

  const smallSizeNeeds = smallSizes.map(size => ({
    size,
    need: calculatePalletsNeeded(size, inventory, weeklyRates),
    coverage: calculateCoverageWithRates(inventory, size, weeklyRates)
  }))

  // Sort by coverage (lowest first - most critical)
  smallSizeNeeds.sort((a, b) => a.coverage - b.coverage)

  // Allocate remaining pallets to small sizes
  let palletsLeft = remainingPallets

  for (const { size, need } of smallSizeNeeds) {
    if (palletsLeft === 0) break

    const toAllocate = Math.min(need, 2, palletsLeft)

    if (toAllocate > 0) {
      allocation[size] = toAllocate
      palletsLeft -= toAllocate
    }
  }

  // Step 5: If still pallets left, give to small sizes that need them
  if (palletsLeft > 0) {
    for (const { size, need } of smallSizeNeeds) {
      if (palletsLeft === 0) break

      const currentAllocation = allocation[size]
      const stillNeeds = need - currentAllocation

      if (stillNeeds > 0) {
        const toAdd = Math.min(stillNeeds, palletsLeft)
        allocation[size] += toAdd
        palletsLeft -= toAdd
      }
    }
  }

  // Step 6: Container MUST be completely filled
  if (palletsLeft > 0) {
    const kingRate = weeklyRates['King'] || 1
    const queenRate = weeklyRates['Queen'] || 1

    let kingCoverageAfter = calculateCoverageWithRates(inventory, 'King', weeklyRates) + (allocation.King * SPRINGS_PER_PALLET / kingRate)
    let queenCoverageAfter = calculateCoverageWithRates(inventory, 'Queen', weeklyRates) + (allocation.Queen * SPRINGS_PER_PALLET / queenRate)

    while (palletsLeft > 0) {
      if (queenCoverageAfter <= kingCoverageAfter) {
        const toQueen = Math.min(palletsLeft, Math.max(1, Math.ceil(palletsLeft * 0.6)))
        allocation.Queen += toQueen
        palletsLeft -= toQueen
        queenCoverageAfter += (toQueen * SPRINGS_PER_PALLET / queenRate)
      } else {
        const toKing = Math.min(palletsLeft, Math.max(1, Math.ceil(palletsLeft * 0.6)))
        allocation.King += toKing
        palletsLeft -= toKing
        kingCoverageAfter += (toKing * SPRINGS_PER_PALLET / kingRate)
      }
    }
  }

  const totalAllocated = allocation.King + allocation.Queen + allocation.Double + allocation['King Single'] + allocation.Single
  console.log(`[ORDER CALC] FINAL ALLOCATION: King=${allocation.King}, Queen=${allocation.Queen}, Double=${allocation.Double}, KS=${allocation['King Single']}, Single=${allocation.Single} | Total=${totalAllocated}/${totalPallets}`)

  if (totalAllocated !== totalPallets) {
    console.error(`[ORDER CALC] ERROR: Allocated ${totalAllocated} pallets but container size is ${totalPallets}!`)
  }

  return allocation
}

/**
 * Convert allocation plan to actual pallets
 */
export function createPalletsFromAllocation(allocation, inventory, salesRates) {
  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const pallets = []
  let palletId = 1

  for (const size of sizes) {
    const numPallets = allocation[size]
    if (numPallets === 0) continue

    const palletType = numPallets === 1 ? 'Critical' : 'Mixed'

    const sizePallets = createPalletsForSize(
      size,
      numPallets,
      palletId,
      palletType,
      inventory,
      salesRates
    )

    pallets.push(...sizePallets)
    palletId += sizePallets.length
  }

  return pallets
}

/**
 * Main entry point: replaces calculateNPlus1Order
 * Returns SpringOrder type to match existing app interface
 *
 * @param totalPallets - Number of pallets in container
 * @param inventory - Current warehouse inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, FIRMNESS_DISTRIBUTION }
 */
export function calculateKingQueenFirstOrder(totalPallets, inventory, salesRates) {
  // Calculate allocation plan
  const allocation = fillKingQueenFirst(totalPallets, inventory, salesRates)

  // Create actual pallets with firmness breakdown
  const pallets = createPalletsFromAllocation(allocation, inventory, salesRates)

  // Calculate total spring quantities by firmness/size
  const springs = {
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  }

  pallets.forEach(pallet => {
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, quantity]) => {
      springs[firmness][pallet.size] += quantity
    })
  })

  // Calculate metadata
  const purePallets = pallets.filter(p => p.type === 'Pure').length
  const mixedPallets = pallets.filter(p => p.type !== 'Pure').length
  const criticalSizes = []
  if (allocation.Double > 0) criticalSizes.push('Double')
  if (allocation['King Single'] > 0) criticalSizes.push('King Single')
  if (allocation.Single > 0) criticalSizes.push('Single')

  const metadata = {
    total_pallets: totalPallets,
    total_springs: pallets.reduce((sum, p) => sum + p.total, 0),
    pure_pallets: purePallets,
    mixed_pallets: mixedPallets,
    critical_sizes: criticalSizes,
    small_size_pallets: allocation.Double + allocation['King Single'] + allocation.Single,
    king_pallets: allocation.King,
    queen_pallets: allocation.Queen
  }

  return {
    springs,
    pallets,
    metadata
  }
}
