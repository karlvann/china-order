/**
 * Algorithm: Component Calculation (Balanced Coverage)
 *
 * Components are ordered to achieve balanced coverage across all items.
 *
 * Logic:
 * 1. First pass: Calculate initial orders (spring-matched + 6-week minimum)
 * 2. Second pass: Calculate projected coverage for each component
 * 3. Third pass: Balance coverage - reduce over-ordered items to match lowest coverage
 * 4. Scale by container size (pallet count)
 *
 * Rules:
 * - Basic components (felt, top/bottom panels): 1:1 with springs per size
 * - Side Panels: King and Queen 1:1, Double covers Double+KS+Single (consolidated)
 * - Micro Coils & Thin Latex (King/Queen only, always equal quantities):
 *   - King: King springs + (Single springs × 0.5) - Singles use half a King sheet
 *   - Queen: Queen + Double + King Single springs - these sizes cut down from Queen
 *   - Demand scaled by Cloud/Aurora ratio (Cloud=2, Aurora=1, Cooper=0)
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS } from '../constants/index.js'

// Don't order components if projected stock at arrival has more than this many weeks of coverage
const SKIP_IF_COVERAGE_ABOVE = 12

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
 * @param pendingComponentOrders - Not used (kept for API compatibility)
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

  // Helper: calculate projected stock and coverage at arrival
  const getProjectedCoverage = (currentStock, weeklyDemand, orderQty = 0) => {
    if (weeklyDemand <= 0) return { projectedStock: currentStock, coverage: Infinity }
    const depletionUntilArrival = weeklyDemand * weeksUntilArrival
    const projectedStock = Math.max(0, currentStock - depletionUntilArrival) + orderQty
    const coverage = projectedStock / weeklyDemand
    return { projectedStock, coverage }
  }

  // Helper: check if PROJECTED coverage at arrival exceeds skip threshold
  const shouldSkip = (currentStock, weeklyDemand) => {
    if (weeklyDemand <= 0) return true // No demand = skip
    const { coverage } = getProjectedCoverage(currentStock, weeklyDemand)
    return coverage > SKIP_IF_COVERAGE_ABOVE
  }

  // Helper: calculate minimum needed for target weeks coverage at arrival
  const calcMinForCoverage = (currentStock, weeklyDemand, targetWeeks = effectiveMinCoverage) => {
    if (weeklyDemand <= 0) return 0
    const { projectedStock } = getProjectedCoverage(currentStock, weeklyDemand)
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
      const weeklyDemand = weeklyRates[size.id] || 0

      if (shouldSkip(currentStock, weeklyDemand)) {
        componentOrder[compId][size.id] = 0
      } else {
        const springMatched = springsPerSize[size.id]
        const minForCoverage = calcMinForCoverage(currentStock, weeklyDemand)
        const initialOrder = Math.max(springMatched, minForCoverage)
        componentOrder[compId][size.id] = initialOrder

        // Track for balancing
        componentTracking.push({
          compId,
          size: size.id,
          currentStock,
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

  const kingSideDemand = weeklyRates['King'] || 0
  const queenSideDemand = weeklyRates['Queen'] || 0
  const doubleSideDemand = (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) + (weeklyRates['Single'] || 0)

  // King side panel
  if (!shouldSkip(kingSideStock, kingSideDemand)) {
    const springMatched = springsPerSize['King']
    const minForCoverage = calcMinForCoverage(kingSideStock, kingSideDemand)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['King'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'King',
      currentStock: kingSideStock,
      weeklyDemand: kingSideDemand,
      initialOrder
    })
  }

  // Queen side panel
  if (!shouldSkip(queenSideStock, queenSideDemand)) {
    const springMatched = springsPerSize['Queen']
    const minForCoverage = calcMinForCoverage(queenSideStock, queenSideDemand)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['Queen'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'Queen',
      currentStock: queenSideStock,
      weeklyDemand: queenSideDemand,
      initialOrder
    })
  }

  // Double side panel (covers Double + KS + Single)
  if (!shouldSkip(doubleSideStock, doubleSideDemand)) {
    const springMatched = springsPerSize['Double'] + springsPerSize['King Single'] + springsPerSize['Single']
    const minForCoverage = calcMinForCoverage(doubleSideStock, doubleSideDemand)
    const initialOrder = Math.max(springMatched, minForCoverage)
    componentOrder['side_panel']['Double'] = initialOrder
    componentTracking.push({
      compId: 'side_panel',
      size: 'Double',
      currentStock: doubleSideStock,
      weeklyDemand: doubleSideDemand,
      initialOrder
    })
  }

  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // ============================================
  // PHASE 2: Calculate coverage with initial orders
  // ============================================

  // Calculate projected coverage for each tracked component
  componentTracking.forEach(comp => {
    const { projectedStock, coverage } = getProjectedCoverage(
      comp.currentStock,
      comp.weeklyDemand,
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
      const stockAtArrivalWithoutOrder = Math.max(0, comp.currentStock - depletionUntilArrival)
      const reducedOrder = Math.max(0, Math.ceil(targetStock - stockAtArrivalWithoutOrder))

      // Don't reduce below minimum coverage threshold
      const minNeeded = calcMinForCoverage(comp.currentStock, comp.weeklyDemand)
      const balancedOrder = Math.max(reducedOrder, minNeeded)

      componentOrder[comp.compId][comp.size] = balancedOrder
    }
  })

  // ============================================
  // PHASE 4: Micro coils and thin latex (special handling)
  // ============================================

  // Use actual micro coil/latex demand from sales data (accounts for Cloud=2, Aurora=1, Cooper=0)
  const microDemand = salesRates?.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const kingMicroLatexDemand = microDemand.King || 0
  const queenMicroLatexDemand = microDemand.Queen || 0

  // Get current stock
  const currentMicroKing = componentInventory?.['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory?.['thin_latex']?.['King'] || 0
  const currentMicroQueen = componentInventory?.['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory?.['thin_latex']?.['Queen'] || 0

  // For skip check, use the lower of micro/latex stock (they deplete together)
  const kingMicroLatexStock = Math.min(currentMicroKing, currentLatexKing)
  const queenMicroLatexStock = Math.min(currentMicroQueen, currentLatexQueen)

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

  // Calculate minimum for coverage
  const kingMinForCoverage = calcMinForCoverage(kingMicroLatexStock, kingMicroLatexDemand)
  const queenMinForCoverage = calcMinForCoverage(queenMicroLatexStock, queenMicroLatexDemand)

  // Check if we should skip
  const skipKingMicroLatex = shouldSkip(kingMicroLatexStock, kingMicroLatexDemand)
  const skipQueenMicroLatex = shouldSkip(queenMicroLatexStock, queenMicroLatexDemand)

  let kingMicroOrder = 0
  let kingLatexOrder = 0
  let queenMicroOrder = 0
  let queenLatexOrder = 0

  if (!skipKingMicroLatex) {
    const kingNeeded = Math.max(kingSpringMatched, kingMinForCoverage)

    // Apply balancing - check if this would exceed target max coverage
    const { coverage: projectedKingCoverage } = getProjectedCoverage(kingMicroLatexStock, kingMicroLatexDemand, kingNeeded)
    let balancedKingNeeded = kingNeeded

    if (projectedKingCoverage > targetMaxCoverage && kingMicroLatexDemand > 0) {
      const targetStock = kingMicroLatexDemand * targetMaxCoverage
      const depletionUntilArrival = kingMicroLatexDemand * weeksUntilArrival
      const stockAtArrivalWithoutOrder = Math.max(0, kingMicroLatexStock - depletionUntilArrival)
      balancedKingNeeded = Math.max(kingMinForCoverage, Math.ceil(targetStock - stockAtArrivalWithoutOrder))
    }

    // Equalize micro and latex
    kingMicroOrder = balancedKingNeeded
    kingLatexOrder = balancedKingNeeded

    const kingMicroFinal = currentMicroKing + kingMicroOrder
    const kingLatexFinal = currentLatexKing + kingLatexOrder
    const kingTarget = Math.max(kingMicroFinal, kingLatexFinal)
    kingMicroOrder = Math.max(0, kingTarget - currentMicroKing)
    kingLatexOrder = Math.max(0, kingTarget - currentLatexKing)
  }

  if (!skipQueenMicroLatex) {
    const queenNeeded = Math.max(queenSpringMatched, queenMinForCoverage)

    // Apply balancing
    const { coverage: projectedQueenCoverage } = getProjectedCoverage(queenMicroLatexStock, queenMicroLatexDemand, queenNeeded)
    let balancedQueenNeeded = queenNeeded

    if (projectedQueenCoverage > targetMaxCoverage && queenMicroLatexDemand > 0) {
      const targetStock = queenMicroLatexDemand * targetMaxCoverage
      const depletionUntilArrival = queenMicroLatexDemand * weeksUntilArrival
      const stockAtArrivalWithoutOrder = Math.max(0, queenMicroLatexStock - depletionUntilArrival)
      balancedQueenNeeded = Math.max(queenMinForCoverage, Math.ceil(targetStock - stockAtArrivalWithoutOrder))
    }

    // Equalize micro and latex
    queenMicroOrder = balancedQueenNeeded
    queenLatexOrder = balancedQueenNeeded

    const queenMicroFinal = currentMicroQueen + queenMicroOrder
    const queenLatexFinal = currentLatexQueen + queenLatexOrder
    const queenTarget = Math.max(queenMicroFinal, queenLatexFinal)
    queenMicroOrder = Math.max(0, queenTarget - currentMicroQueen)
    queenLatexOrder = Math.max(0, queenTarget - currentLatexQueen)
  }

  componentOrder['micro_coils']['King'] = kingMicroOrder
  componentOrder['thin_latex']['King'] = kingLatexOrder
  componentOrder['micro_coils']['Queen'] = queenMicroOrder
  componentOrder['thin_latex']['Queen'] = queenLatexOrder

  // Zero out small size orders for King/Queen-only components
  KING_QUEEN_ONLY_COMPONENTS.forEach((compId) => {
    componentOrder[compId]['Double'] = 0
    componentOrder[compId]['King Single'] = 0
    componentOrder[compId]['Single'] = 0
  })

  // ============================================
  // PHASE 5: Apply scaling (container + manual override)
  // ============================================

  // Combined scale factor: container scaling × manual override
  const combinedScale = containerScale * componentScaleOverride

  // Scale all non-zero orders by combined factor
  // But ensure minimum coverage is still met (unless scale < 1, then allow going below)
  if (combinedScale !== 1) {
    COMPONENT_TYPES.forEach((comp) => {
      MATTRESS_SIZES.forEach((size) => {
        const currentOrder = componentOrder[comp.id][size.id]
        if (currentOrder > 0) {
          const currentStock = componentInventory?.[comp.id]?.[size.id] || 0
          let weeklyDemand = weeklyRates[size.id] || 0

          // Special handling for consolidated components
          if (comp.id === 'side_panel' && size.id === 'Double') {
            weeklyDemand = (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) + (weeklyRates['Single'] || 0)
          }
          if ((comp.id === 'micro_coils' || comp.id === 'thin_latex') && size.id === 'King') {
            weeklyDemand = kingMicroLatexDemand
          }
          if ((comp.id === 'micro_coils' || comp.id === 'thin_latex') && size.id === 'Queen') {
            weeklyDemand = queenMicroLatexDemand
          }

          // Scale the order
          const scaledOrder = Math.ceil(currentOrder * combinedScale)

          // If scaling down, still ensure minimum coverage is met
          // If scaling up, just use the scaled value
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

  return componentOrder
}
