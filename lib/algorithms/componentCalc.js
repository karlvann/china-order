/**
 * Algorithm: Component Calculation (Spring-Matched with Minimum Coverage)
 *
 * Components are ordered to MATCH spring quantities, with a floor ensuring
 * at least 6 weeks of coverage at arrival.
 *
 * Rules:
 * - 1:1 components (felt, panels): MAX of spring quantity OR enough for 6 weeks at arrival
 * - Micro Coils & Thin Latex: Scaled based on spring order, equalized between the two
 * - Side Panels: Single and King Single consolidated into Double size orders
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS } from '../constants/index.js'

// Minimum weeks of coverage to have at arrival
const MIN_COVERAGE_AT_ARRIVAL = 6

/**
 * Calculate component order based on spring order quantities with minimum coverage floor.
 *
 * @param springOrder - Complete spring order with quantities by size
 * @param springInventory - Current spring inventory (not used, kept for API compatibility)
 * @param componentInventory - Current component inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, MICRO_COIL_WEEKLY_DEMAND, THIN_LATEX_WEEKLY_DEMAND }
 * @param pendingComponentOrders - Pending component orders [{ arrivalWeekIndex, components }]
 * @param orderWeekOffset - Week offset for order placement
 * @param deliveryWeeks - Weeks until delivery
 * @returns Component order quantities by type and size
 */
export function calculateComponentOrder(springOrder, springInventory, componentInventory, salesRates, pendingComponentOrders = [], orderWeekOffset = 0, deliveryWeeks = 10) {
  const componentOrder = {}
  const weeklyRates = salesRates?.WEEKLY_SALES_RATE || {}

  // Calculate when the new order will arrive
  const weeksUntilArrival = orderWeekOffset + deliveryWeeks

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

  // Calculate pending component quantities (orders arriving before our new order)
  const pendingComponents = {}
  COMPONENT_TYPES.forEach((comp) => {
    pendingComponents[comp.id] = {}
    MATTRESS_SIZES.forEach((size) => {
      pendingComponents[comp.id][size.id] = 0
    })
  })

  if (pendingComponentOrders && pendingComponentOrders.length > 0) {
    for (const order of pendingComponentOrders) {
      if (order.arrivalWeekIndex >= 0 && order.arrivalWeekIndex <= weeksUntilArrival) {
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

  // Get total springs ordered per size (sum of all firmnesses)
  const springsPerSize = {}
  MATTRESS_SIZES.forEach((size) => {
    springsPerSize[size.id] =
      (springOrder.springs.firm?.[size.id] || 0) +
      (springOrder.springs.medium?.[size.id] || 0) +
      (springOrder.springs.soft?.[size.id] || 0)
  })

  // Helper: calculate minimum needed to reach 6 weeks coverage at arrival
  const calcMinimumForCoverage = (compId, size, weeklyDemand) => {
    const currentStock = componentInventory[compId]?.[size] || 0
    const pending = pendingComponents[compId]?.[size] || 0
    const depletionUntilArrival = weeklyDemand * weeksUntilArrival
    const projectedStock = currentStock - depletionUntilArrival + pending
    const targetStock = weeklyDemand * MIN_COVERAGE_AT_ARRIVAL
    return Math.max(0, Math.ceil(targetStock - projectedStock))
  }

  // 1:1 components (felt, top_panel, bottom_panel)
  // Order = MAX(spring quantity, minimum for 6 weeks coverage)
  const basicComponents = ['felt', 'top_panel', 'bottom_panel']
  basicComponents.forEach((compId) => {
    MATTRESS_SIZES.forEach((size) => {
      const springMatched = springsPerSize[size.id]
      const minForCoverage = calcMinimumForCoverage(compId, size.id, weeklyRates[size.id] || 0)
      componentOrder[compId][size.id] = Math.max(springMatched, minForCoverage)
    })
  })

  // Side panels - King and Queen match springs, Double covers Double+KS+Single
  const kingMinSide = calcMinimumForCoverage('side_panel', 'King', weeklyRates['King'] || 0)
  const queenMinSide = calcMinimumForCoverage('side_panel', 'Queen', weeklyRates['Queen'] || 0)
  const doubleSideDemand = (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) + (weeklyRates['Single'] || 0)
  const doubleMinSide = calcMinimumForCoverage('side_panel', 'Double', doubleSideDemand)

  componentOrder['side_panel']['King'] = Math.max(springsPerSize['King'], kingMinSide)
  componentOrder['side_panel']['Queen'] = Math.max(springsPerSize['Queen'], queenMinSide)
  componentOrder['side_panel']['Double'] = Math.max(
    springsPerSize['Double'] + springsPerSize['King Single'] + springsPerSize['Single'],
    doubleMinSide
  )
  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // Micro coils and thin latex - scaled based on springs, then equalized
  // These components are used by Cloud (2 layers) and Aurora (1 layer) models
  // The demand ratio relative to springs comes from live sales data
  const microDemand = salesRates?.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const latexDemand = salesRates?.THIN_LATEX_WEEKLY_DEMAND || { King: 0, Queen: 0 }

  // Calculate micro/latex per spring ratio from demand data
  // King inventory: King springs
  const kingSpringRate = weeklyRates['King'] || 1
  const kingMicroRatio = (microDemand.King || 0) / kingSpringRate
  const kingLatexRatio = (latexDemand.King || 0) / kingSpringRate

  // Queen inventory: Queen + Double + KS springs (these sizes use Queen-sized micro/latex)
  const queenSpringRate = (weeklyRates['Queen'] || 0) + (weeklyRates['Double'] || 0) + (weeklyRates['King Single'] || 0) || 1
  const queenMicroRatio = (microDemand.Queen || 0) / queenSpringRate
  const queenLatexRatio = (latexDemand.Queen || 0) / queenSpringRate

  // Calculate base order from spring quantities
  const kingSpringsOrdered = springsPerSize['King']
  const queenSpringsOrdered = springsPerSize['Queen'] + springsPerSize['Double'] + springsPerSize['King Single']

  let kingMicroOrder = Math.ceil(kingSpringsOrdered * kingMicroRatio)
  let kingLatexOrder = Math.ceil(kingSpringsOrdered * kingLatexRatio)
  let queenMicroOrder = Math.ceil(queenSpringsOrdered * queenMicroRatio)
  let queenLatexOrder = Math.ceil(queenSpringsOrdered * queenLatexRatio)

  // Calculate minimum for 6 weeks coverage
  const kingMicroMin = calcMinimumForCoverage('micro_coils', 'King', microDemand.King || 0)
  const kingLatexMin = calcMinimumForCoverage('thin_latex', 'King', latexDemand.King || 0)
  const queenMicroMin = calcMinimumForCoverage('micro_coils', 'Queen', microDemand.Queen || 0)
  const queenLatexMin = calcMinimumForCoverage('thin_latex', 'Queen', latexDemand.Queen || 0)

  // Apply minimum coverage floor
  kingMicroOrder = Math.max(kingMicroOrder, kingMicroMin)
  kingLatexOrder = Math.max(kingLatexOrder, kingLatexMin)
  queenMicroOrder = Math.max(queenMicroOrder, queenMicroMin)
  queenLatexOrder = Math.max(queenLatexOrder, queenLatexMin)

  // Equalize micro and latex (they're glued together, must be equal)
  // Check current stock levels and adjust orders to equalize final stock
  const currentMicroKing = componentInventory['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory['thin_latex']?.['King'] || 0
  const currentMicroQueen = componentInventory['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory['thin_latex']?.['Queen'] || 0

  // King: equalize final stock (current + order)
  const kingMicroFinal = currentMicroKing + kingMicroOrder
  const kingLatexFinal = currentLatexKing + kingLatexOrder
  const kingTarget = Math.max(kingMicroFinal, kingLatexFinal)
  kingMicroOrder = Math.max(0, kingTarget - currentMicroKing)
  kingLatexOrder = Math.max(0, kingTarget - currentLatexKing)

  // Queen: equalize final stock (current + order)
  const queenMicroFinal = currentMicroQueen + queenMicroOrder
  const queenLatexFinal = currentLatexQueen + queenLatexOrder
  const queenTarget = Math.max(queenMicroFinal, queenLatexFinal)
  queenMicroOrder = Math.max(0, queenTarget - currentMicroQueen)
  queenLatexOrder = Math.max(0, queenTarget - currentLatexQueen)

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

  return componentOrder
}
