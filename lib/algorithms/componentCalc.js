/**
 * Algorithm: Component Calculation (Balanced Coverage)
 *
 * Components are ordered to achieve balanced coverage across all items.
 * PENDING ORDERS ARE CONSIDERED - components from orders arriving before the new order
 * are added to projected stock for coverage calculations.
 *
 * Logic:
 * 1. Sum pending component orders arriving before new order's arrival
 * 2. Phase 1-3: Calculate basic component orders (spring-matched + coverage minimum, then balance)
 * 3. Phase 4: Calculate micro/latex TARGET final inventory (they're treated as pairs)
 * 4. Phase 5: Scale basic components (micro/latex excluded)
 * 5. Phase 6: Scale and finalize micro/latex orders (ensures they end up EQUAL)
 *
 * Rules:
 * - Basic components (felt, top/bottom panels): 1:1 with springs per size
 * - Side Panels: King and Queen 1:1, Double covers Double+KS+Single (consolidated)
 * - Micro Coils & Thin Latex (King/Queen only):
 *   - ALWAYS ordered to result in EQUAL final inventory (they're used as pairs)
 *   - King: covers King + Single (Singles use half a King sheet)
 *   - Queen: covers Queen + Double + King Single (cut down from Queen)
 *   - Demand scaled by Cloud/Aurora ratio (Cloud=2, Aurora=1, Cooper=0)
 *   - If imbalanced: order more of the lesser item to equalize, even when skipping coverage orders
 *   - Pending orders for both are considered when calculating what's needed
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS } from '../constants/index.js'

// Don't order components if projected stock at arrival has more than this many weeks of coverage
const SKIP_IF_COVERAGE_ABOVE = 10

// Minimum weeks of coverage to have at arrival
const MIN_COVERAGE_AT_ARRIVAL = 6

// Maximum difference in coverage allowed between components (for balancing)
const MAX_COVERAGE_SPREAD = 4

// Full container = 12 pallets
const FULL_CONTAINER_PALLETS = 12

/**
 * Calculate component order with balanced coverage.
 *
 * @param springOrder - Complete spring order with quantities by size
 * @param springInventory - Current spring inventory (not used, kept for API compatibility)
 * @param componentInventory - Current component inventory
 * @param salesRates - Weekly sales rates for coverage calculation
 * @param pendingComponentOrders - Pending component orders [{arrivalWeekIndex, components: {type: {size: qty}}}]
 * @param orderWeekOffset - Week offset for order placement
 * @param deliveryWeeks - Weeks until delivery
 * @param palletCount - Number of pallets being ordered (for container scaling)
 * @param componentScaleOverride - Manual scale factor for component orders (0.3 to 2.0, default 1.0)
 * @returns Component order quantities by type and size
 */
export function calculateComponentOrder(springOrder, springInventory, componentInventory, salesRates, pendingComponentOrders = [], orderWeekOffset = 0, deliveryWeeks = 10, palletCount = 12, componentScaleOverride = 1.0) {
  const componentOrder = {}
  const weeklyRates = salesRates?.WEEKLY_SALES_RATE || {}

  // Calculate when the order will arrive
  const weeksUntilArrival = orderWeekOffset + deliveryWeeks
  const newOrderArrivalWeek = orderWeekOffset + deliveryWeeks

  // Container scale factor (1.0 for 12 pallets, 0.5 for 6 pallets)
  const containerScale = Math.min(1, palletCount / FULL_CONTAINER_PALLETS)

  // Adjust minimum coverage based on component scale override
  // Lower scale = accept lower coverage to fit in smaller container
  let effectiveMinCoverage = MIN_COVERAGE_AT_ARRIVAL
  if (componentScaleOverride < 0.8) {
    effectiveMinCoverage = 4
  } else if (componentScaleOverride < 1.0) {
    effectiveMinCoverage = 5
  }

  // ============================================
  // Calculate pending components from existing orders
  // ============================================
  // Sum up components from orders arriving before or at our new order's arrival
  const pendingComponents = {}
  COMPONENT_TYPES.forEach((comp) => {
    pendingComponents[comp.id] = {}
    MATTRESS_SIZES.forEach((size) => {
      pendingComponents[comp.id][size.id] = 0
    })
  })

  if (pendingComponentOrders && pendingComponentOrders.length > 0) {
    for (const order of pendingComponentOrders) {
      // Only count orders arriving before or at the same time as our new order
      if (order.arrivalWeekIndex >= 0 && order.arrivalWeekIndex <= newOrderArrivalWeek) {
        if (order.components) {
          for (const [compType, sizes] of Object.entries(order.components)) {
            if (pendingComponents[compType]) {
              for (const [size, qty] of Object.entries(sizes)) {
                if (pendingComponents[compType][size] !== undefined) {
                  pendingComponents[compType][size] += qty
                }
              }
            }
          }
        }
      }
    }
  }

  // console.log('PENDING COMPONENTS:', pendingComponents)

  // Initialize component order structure
  COMPONENT_TYPES.forEach((comp) => {
    componentOrder[comp.id] = {}
    MATTRESS_SIZES.forEach((size) => {
      componentOrder[comp.id][size.id] = 0
    })
  })

  if (!springOrder?.springs) {
    return componentOrder
  }

  // Helper: calculate projected stock and coverage at arrival (INCLUDING pending orders)
  const getProjectedCoverage = (currentStock, weeklyDemand, pendingStock = 0, orderQty = 0) => {
    if (weeklyDemand <= 0) return { projectedStock: currentStock + pendingStock, coverage: Infinity }
    const depletionUntilArrival = weeklyDemand * weeksUntilArrival
    const projectedStock = Math.max(0, currentStock - depletionUntilArrival) + pendingStock + orderQty
    const coverage = projectedStock / weeklyDemand
    return { projectedStock, coverage }
  }

  // Helper: check if PROJECTED coverage at arrival exceeds skip threshold
  const shouldSkip = (currentStock, weeklyDemand, pendingStock = 0) => {
    if (weeklyDemand <= 0) return true // No demand = skip
    const { coverage } = getProjectedCoverage(currentStock, weeklyDemand, pendingStock)
    return coverage > SKIP_IF_COVERAGE_ABOVE
  }

  // Helper: calculate minimum needed for target weeks coverage at arrival
  const calcMinForCoverage = (currentStock, weeklyDemand, pendingStock = 0, targetWeeks = effectiveMinCoverage) => {
    if (weeklyDemand <= 0) return 0
    const { projectedStock } = getProjectedCoverage(currentStock, weeklyDemand, pendingStock)
    const targetStock = weeklyDemand * targetWeeks
    return Math.max(0, Math.ceil(targetStock - projectedStock))
  }

  // Get total springs ordered per size (sum of all firmnesses)
  const springsPerSize = {}
  MATTRESS_SIZES.forEach((size) => {
    springsPerSize[size.id] =
      (springOrder.springs.firm?.[size.id] || 0) +
      (springOrder.springs.medium?.[size.id] || 0) +
      (springOrder.springs.soft?.[size.id] || 0)
  })

  // ============================================
  // PHASE 1: Calculate initial orders
  // ============================================

  // Track all components for balancing pass
  const componentTracking = []

  // Basic 1:1 components (felt, top_panel, bottom_panel)
  const basicComponents = ['felt', 'top_panel', 'bottom_panel']
  basicComponents.forEach((compId) => {
    MATTRESS_SIZES.forEach((size) => {
      const currentStock = componentInventory?.[compId]?.[size.id] || 0
      const pendingStock = pendingComponents[compId]?.[size.id] || 0
      const weeklyDemand = weeklyRates[size.id] || 0

      if (shouldSkip(currentStock, weeklyDemand, pendingStock)) {
        componentOrder[compId][size.id] = 0
      } else {
        const springMatched = springsPerSize[size.id]
        const minForCoverage = calcMinForCoverage(currentStock, weeklyDemand, pendingStock)
        const initialOrder = Math.max(springMatched, minForCoverage)
        componentOrder[compId][size.id] = initialOrder

        // Track for balancing
        componentTracking.push({
          compId,
          size: size.id,
          currentStock,
          pendingStock,
          weeklyDemand,
          initialOrder
        })
      }
    })
  })

  // Side panels - King and Queen 1:1, Double covers Double+KS+Single
  const kingSideStock = componentInventory?.['side_panel']?.['King'] || 0
  const queenSideStock = componentInventory?.['side_panel']?.['Queen'] || 0
  const doubleSideStock = componentInventory?.['side_panel']?.['Double'] || 0

  const kingSidePending = pendingComponents['side_panel']?.['King'] || 0
  const queenSidePending = pendingComponents['side_panel']?.['Queen'] || 0
  const doubleSidePending = pendingComponents['side_panel']?.['Double'] || 0

  const kingSideDemand = weeklyRates['King'] || 0
  const queenSideDemand = weeklyRates['Queen'] || 0
  const doubleSideDemand = (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) + (weeklyRates['Single'] || 0)

  // King side panel
  if (!shouldSkip(kingSideStock, kingSideDemand, kingSidePending)) {
    const springMatched = springsPerSize['King']
    const minForCoverage = calcMinForCoverage(kingSideStock, kingSideDemand, kingSidePending)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['King'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'King',
      currentStock: kingSideStock,
      pendingStock: kingSidePending,
      weeklyDemand: kingSideDemand,
      initialOrder
    })
  }

  // Queen side panel
  if (!shouldSkip(queenSideStock, queenSideDemand, queenSidePending)) {
    const springMatched = springsPerSize['Queen']
    const minForCoverage = calcMinForCoverage(queenSideStock, queenSideDemand, queenSidePending)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['Queen'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'Queen',
      currentStock: queenSideStock,
      pendingStock: queenSidePending,
      weeklyDemand: queenSideDemand,
      initialOrder
    })
  }

  // Double side panel (covers Double + KS + Single)
  if (!shouldSkip(doubleSideStock, doubleSideDemand, doubleSidePending)) {
    const springMatched = springsPerSize['Double'] + springsPerSize['King Single'] + springsPerSize['Single']
    const minForCoverage = calcMinForCoverage(doubleSideStock, doubleSideDemand, doubleSidePending)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['Double'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'Double',
      currentStock: doubleSideStock,
      pendingStock: doubleSidePending,
      weeklyDemand: doubleSideDemand,
      initialOrder
    })
  }

  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // ============================================
  // PHASE 2: Calculate coverage with initial orders
  // ============================================

  // Calculate projected coverage for each tracked component (including pending)
  componentTracking.forEach(comp => {
    const { projectedStock, coverage } = getProjectedCoverage(
      comp.currentStock,
      comp.weeklyDemand,
      comp.pendingStock || 0,
      comp.initialOrder
    )
    comp.projectedCoverage = coverage
  })

  // Find minimum coverage (among components being ordered)
  const coverages = componentTracking
    .filter(c => c.initialOrder > 0)
    .map(c => c.projectedCoverage)
    .filter(c => c < Infinity)

  const minCoverage = coverages.length > 0 ? Math.min(...coverages) : effectiveMinCoverage
  const targetMaxCoverage = Math.max(minCoverage + MAX_COVERAGE_SPREAD, effectiveMinCoverage)

  // ============================================
  // PHASE 3: Balance coverage (reduce over-ordered items)
  // ============================================

  componentTracking.forEach(comp => {
    if (comp.projectedCoverage > targetMaxCoverage && comp.weeklyDemand > 0) {
      // This component has too much coverage - reduce it
      const targetStock = comp.weeklyDemand * targetMaxCoverage
      const depletionUntilArrival = comp.weeklyDemand * weeksUntilArrival
      const pendingStock = comp.pendingStock || 0
      const stockAtArrivalWithoutOrder = Math.max(0, comp.currentStock - depletionUntilArrival) + pendingStock
      const reducedOrder = Math.max(0, Math.ceil(targetStock - stockAtArrivalWithoutOrder))

      // Don't reduce below minimum coverage threshold
      const minNeeded = calcMinForCoverage(comp.currentStock, comp.weeklyDemand, pendingStock)
      const balancedOrder = Math.max(reducedOrder, minNeeded)

      componentOrder[comp.compId][comp.size] = balancedOrder
    }
  })

  // ============================================
  // PHASE 4: Micro coils and thin latex (special handling)
  // ============================================
  // These are ALWAYS ordered as pairs - every mattress needs exactly 1 of each.
  // We calculate a TARGET final inventory (must be equal for both), then derive orders.

  // Use actual micro coil/latex demand from sales data (accounts for Cloud=2, Aurora=1, Cooper=0)
  const microDemand = salesRates?.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const kingMicroLatexDemand = microDemand.King || 0
  const queenMicroLatexDemand = microDemand.Queen || 0

  // Get current stock
  const currentMicroKing = componentInventory?.['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory?.['thin_latex']?.['King'] || 0
  const currentMicroQueen = componentInventory?.['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory?.['thin_latex']?.['Queen'] || 0

  // Get pending stock from existing orders
  const pendingMicroKing = pendingComponents['micro_coils']?.['King'] || 0
  const pendingLatexKing = pendingComponents['thin_latex']?.['King'] || 0
  const pendingMicroQueen = pendingComponents['micro_coils']?.['Queen'] || 0
  const pendingLatexQueen = pendingComponents['thin_latex']?.['Queen'] || 0

  // Total available = current + pending
  const totalMicroKing = currentMicroKing + pendingMicroKing
  const totalLatexKing = currentLatexKing + pendingLatexKing
  const totalMicroQueen = currentMicroQueen + pendingMicroQueen
  const totalLatexQueen = currentLatexQueen + pendingLatexQueen

  // For coverage calculations, use the LOWER of micro/latex TOTAL stock (they deplete together as pairs)
  const kingEffectiveStock = Math.min(totalMicroKing, totalLatexKing)
  const queenEffectiveStock = Math.min(totalMicroQueen, totalLatexQueen)

  // console.log('MICRO/LATEX STOCK:', {
  //   king: { currentMicro: currentMicroKing, currentLatex: currentLatexKing, pendingMicro: pendingMicroKing, pendingLatex: pendingLatexKing, effective: kingEffectiveStock },
  //   queen: { currentMicro: currentMicroQueen, currentLatex: currentLatexQueen, pendingMicro: pendingMicroQueen, pendingLatex: pendingLatexQueen, effective: queenEffectiveStock }
  // })

  // Calculate spring-matched quantities scaled by micro coil demand ratio
  const kingSpringRate = weeklyRates['King'] || 1
  const queenSpringRate = (weeklyRates['Queen'] || 0) + (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) || 1

  const kingMicroRatio = kingMicroLatexDemand / kingSpringRate
  const queenMicroRatio = queenMicroLatexDemand / queenSpringRate

  const kingSpringsOrdered = springsPerSize['King']
  const singleSpringsOrdered = springsPerSize['Single']
  const kingSpringMatched = Math.ceil((kingSpringsOrdered * kingMicroRatio) + (singleSpringsOrdered * 0.5 * kingMicroRatio))

  const queenSpringsOrdered = springsPerSize['Queen'] + springsPerSize['Double'] + springsPerSize['King Single']
  const queenSpringMatched = Math.ceil(queenSpringsOrdered * queenMicroRatio)

  // Calculate minimum pairs needed for coverage (based on effective/lower stock)
  // Note: pending is already included in kingEffectiveStock, so pass 0 for pending param
  const kingMinPairsForCoverage = calcMinForCoverage(kingEffectiveStock, kingMicroLatexDemand, 0)
  const queenMinPairsForCoverage = calcMinForCoverage(queenEffectiveStock, queenMicroLatexDemand, 0)

  // Check if we should skip (both have enough coverage)
  const skipKingMicroLatex = shouldSkip(kingEffectiveStock, kingMicroLatexDemand, 0)
  const skipQueenMicroLatex = shouldSkip(queenEffectiveStock, queenMicroLatexDemand, 0)

  // Calculate target final inventory for King micro/latex (they must end up EQUAL)
  let kingTargetFinal = 0
  if (!skipKingMicroLatex) {
    const kingPairsNeeded = Math.max(kingSpringMatched, kingMinPairsForCoverage)

    // Apply coverage balancing (pending already in kingEffectiveStock, so 0 for pending param)
    const { coverage: projectedKingCoverage } = getProjectedCoverage(kingEffectiveStock, kingMicroLatexDemand, 0, kingPairsNeeded)
    let balancedKingPairs = kingPairsNeeded

    if (projectedKingCoverage > targetMaxCoverage && kingMicroLatexDemand > 0) {
      const targetStock = kingMicroLatexDemand * targetMaxCoverage
      const depletionUntilArrival = kingMicroLatexDemand * weeksUntilArrival
      const stockAtArrivalWithoutOrder = Math.max(0, kingEffectiveStock - depletionUntilArrival)
      balancedKingPairs = Math.max(kingMinPairsForCoverage, Math.ceil(targetStock - stockAtArrivalWithoutOrder))
    }

    // Target final = effective stock + pairs ordered
    // Both micro and latex will reach this target
    kingTargetFinal = kingEffectiveStock + balancedKingPairs
  } else {
    // Even when skipping coverage-based ordering, equalize any existing imbalance
    // Target = the higher of the two TOTAL stocks (current + pending) so the lower one catches up
    kingTargetFinal = Math.max(totalMicroKing, totalLatexKing)
  }

  // Calculate target final inventory for Queen micro/latex
  let queenTargetFinal = 0
  if (!skipQueenMicroLatex) {
    const queenPairsNeeded = Math.max(queenSpringMatched, queenMinPairsForCoverage)

    const { coverage: projectedQueenCoverage } = getProjectedCoverage(queenEffectiveStock, queenMicroLatexDemand, 0, queenPairsNeeded)
    let balancedQueenPairs = queenPairsNeeded

    if (projectedQueenCoverage > targetMaxCoverage && queenMicroLatexDemand > 0) {
      const targetStock = queenMicroLatexDemand * targetMaxCoverage
      const depletionUntilArrival = queenMicroLatexDemand * weeksUntilArrival
      const stockAtArrivalWithoutOrder = Math.max(0, queenEffectiveStock - depletionUntilArrival)
      balancedQueenPairs = Math.max(queenMinPairsForCoverage, Math.ceil(targetStock - stockAtArrivalWithoutOrder))
    }

    queenTargetFinal = queenEffectiveStock + balancedQueenPairs
  } else {
    queenTargetFinal = Math.max(totalMicroQueen, totalLatexQueen)
  }

  // Store targets for use after scaling (Phase 5 will be skipped for micro/latex)
  const microLatexTargets = {
    King: kingTargetFinal,
    Queen: queenTargetFinal
  }

  // Temporarily set orders to 0 - we'll calculate final orders in Phase 6
  componentOrder['micro_coils']['King'] = 0
  componentOrder['thin_latex']['King'] = 0
  componentOrder['micro_coils']['Queen'] = 0
  componentOrder['thin_latex']['Queen'] = 0

  // Zero out small size orders for King/Queen-only components
  KING_QUEEN_ONLY_COMPONENTS.forEach((compId) => {
    componentOrder[compId]['Double'] = 0
    componentOrder[compId]['King Single'] = 0
    componentOrder[compId]['Single'] = 0
  })

  // ============================================
  // PHASE 5: Apply scaling (container + manual override)
  // ============================================
  // NOTE: Micro coils and thin latex are EXCLUDED from scaling here.
  // They are handled separately in Phase 6 to ensure they stay equal.

  // Combined scale factor: container scaling × manual override
  const combinedScale = containerScale * componentScaleOverride

  // Scale all non-zero orders by combined factor (except micro/latex)
  if (combinedScale !== 1) {
    COMPONENT_TYPES.forEach((comp) => {
      // Skip micro coils and thin latex - handled in Phase 6
      if (comp.id === 'micro_coils' || comp.id === 'thin_latex') return

      MATTRESS_SIZES.forEach((size) => {
        const currentOrder = componentOrder[comp.id][size.id]
        if (currentOrder > 0) {
          const currentStock = componentInventory?.[comp.id]?.[size.id] || 0
          let weeklyDemand = weeklyRates[size.id] || 0

          // Special handling for consolidated side panels
          if (comp.id === 'side_panel' && size.id === 'Double') {
            weeklyDemand = (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) + (weeklyRates['Single'] || 0)
          }

          // Scale the order
          const scaledOrder = Math.ceil(currentOrder * combinedScale)

          // If scaling down, still ensure minimum coverage is met
          if (combinedScale < 1) {
            const minNeeded = calcMinForCoverage(currentStock, weeklyDemand)
            componentOrder[comp.id][size.id] = Math.max(scaledOrder, minNeeded)
          } else {
            componentOrder[comp.id][size.id] = scaledOrder
          }
        }
      })
    })
  }

  // ============================================
  // PHASE 6: Calculate micro coils and thin latex orders
  // ============================================
  // These MUST end up equal. We calculated target final inventory in Phase 4.
  // Now apply scaling to targets, then derive individual orders.

  // Apply scaling to targets (scale the TARGET, not individual orders)
  let scaledKingTarget = microLatexTargets.King
  let scaledQueenTarget = microLatexTargets.Queen

  if (combinedScale !== 1) {
    // Scale the number of PAIRS we're adding, not the total target
    const kingPairsToAdd = microLatexTargets.King - kingEffectiveStock
    const queenPairsToAdd = microLatexTargets.Queen - queenEffectiveStock

    const scaledKingPairs = Math.ceil(kingPairsToAdd * combinedScale)
    const scaledQueenPairs = Math.ceil(queenPairsToAdd * combinedScale)

    // If scaling down, ensure minimum coverage is still met
    if (combinedScale < 1) {
      const kingMinPairs = calcMinForCoverage(kingEffectiveStock, kingMicroLatexDemand, 0)
      const queenMinPairs = calcMinForCoverage(queenEffectiveStock, queenMicroLatexDemand, 0)
      scaledKingTarget = kingEffectiveStock + Math.max(scaledKingPairs, kingMinPairs)
      scaledQueenTarget = queenEffectiveStock + Math.max(scaledQueenPairs, queenMinPairs)
    } else {
      scaledKingTarget = kingEffectiveStock + scaledKingPairs
      scaledQueenTarget = queenEffectiveStock + scaledQueenPairs
    }
  }

  // Now calculate individual orders to reach the scaled target
  // Order = target - (current + pending), so final inventory (current + pending + order) = target
  const kingMicroOrder = Math.max(0, scaledKingTarget - totalMicroKing)
  const kingLatexOrder = Math.max(0, scaledKingTarget - totalLatexKing)
  const queenMicroOrder = Math.max(0, scaledQueenTarget - totalMicroQueen)
  const queenLatexOrder = Math.max(0, scaledQueenTarget - totalLatexQueen)

  // Debug: verify final inventories are equal
  // console.log('MICRO/LATEX EQUALIZATION DEBUG:', {
  //   king: {
  //     currentMicro: currentMicroKing,
  //     pendingMicro: pendingMicroKing,
  //     totalMicro: totalMicroKing,
  //     currentLatex: currentLatexKing,
  //     pendingLatex: pendingLatexKing,
  //     totalLatex: totalLatexKing,
  //     target: scaledKingTarget,
  //     microOrder: kingMicroOrder,
  //     latexOrder: kingLatexOrder,
  //     finalMicro: totalMicroKing + kingMicroOrder,
  //     finalLatex: totalLatexKing + kingLatexOrder
  //   },
  //   queen: {
  //     currentMicro: currentMicroQueen,
  //     pendingMicro: pendingMicroQueen,
  //     totalMicro: totalMicroQueen,
  //     currentLatex: currentLatexQueen,
  //     pendingLatex: pendingLatexQueen,
  //     totalLatex: totalLatexQueen,
  //     target: scaledQueenTarget,
  //     microOrder: queenMicroOrder,
  //     latexOrder: queenLatexOrder,
  //     finalMicro: totalMicroQueen + queenMicroOrder,
  //     finalLatex: totalLatexQueen + queenLatexOrder
  //   }
  // })

  componentOrder['micro_coils']['King'] = kingMicroOrder
  componentOrder['thin_latex']['King'] = kingLatexOrder
  componentOrder['micro_coils']['Queen'] = queenMicroOrder
  componentOrder['thin_latex']['Queen'] = queenLatexOrder

  return componentOrder
}
