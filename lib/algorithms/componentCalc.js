/**
 * Algorithm: Component Calculation (Demand-Based)
 *
 * Derives component orders from weekly demand, accounting for:
 * - When the order will arrive (orderWeekOffset + lead time)
 * - Pending component orders already on the way
 * - Depletion until arrival
 *
 * Rules:
 * - Micro Coils & Thin Latex: Always ordered in equal quantities (they're glued together)
 * - Micro Coils/Thin Latex: King/Queen only (small sizes don't use them)
 * - Side Panels: Single and King Single consolidated into Double size orders
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS, LEAD_TIME_WEEKS, MIN_COVERAGE_TARGET } from '../constants/index.js'

/**
 * Calculate component order based on demand, with look-ahead.
 *
 * @param springOrder - Complete spring order (used to determine arrival timing)
 * @param springInventory - Current spring inventory (not used, kept for API compatibility)
 * @param componentInventory - Current component inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, MICRO_COIL_WEEKLY_DEMAND, THIN_LATEX_WEEKLY_DEMAND }
 * @param pendingComponentOrders - Pending component orders [{ arrivalWeekIndex, components: { type: { size: qty } } }]
 * @param orderWeekOffset - Week offset for order placement (default 0)
 * @returns Component order quantities by type and size
 */
export function calculateComponentOrder(springOrder, springInventory, componentInventory, salesRates, pendingComponentOrders = [], orderWeekOffset = 0) {
  const componentOrder = {}

  // Calculate when the new order will arrive
  const weeksUntilArrival = orderWeekOffset + LEAD_TIME_WEEKS

  // Get demand data
  const weeklyRates = salesRates?.WEEKLY_SALES_RATE || {}
  const microDemand = salesRates?.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const latexDemand = salesRates?.THIN_LATEX_WEEKLY_DEMAND || { King: 0, Queen: 0 }

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

  // Initialize component order structure
  COMPONENT_TYPES.forEach((comp) => {
    componentOrder[comp.id] = {}
    MATTRESS_SIZES.forEach((size) => {
      componentOrder[comp.id][size.id] = 0
    })
  })

  // Calculate 1:1 components (felt, panels) - based on mattress demand
  const basicComponents = ['felt', 'top_panel', 'bottom_panel']

  basicComponents.forEach((compId) => {
    MATTRESS_SIZES.forEach((size) => {
      const weeklyDemand = weeklyRates[size.id] || 0
      const currentStock = componentInventory[compId]?.[size.id] || 0
      const pending = pendingComponents[compId]?.[size.id] || 0

      // Depletion until arrival
      const depletionUntilArrival = weeklyDemand * weeksUntilArrival

      // Projected stock at arrival
      const projectedStock = Math.max(0, currentStock - depletionUntilArrival + pending)

      // Target: MIN_COVERAGE_TARGET weeks of coverage at arrival
      const targetStock = weeklyDemand * MIN_COVERAGE_TARGET
      const orderNeeded = Math.max(0, Math.ceil(targetStock - projectedStock))

      componentOrder[compId][size.id] = orderNeeded
    })
  })

  // Calculate side panels with consolidation
  // King and Queen have their own side panels
  const sidePanelSizes = ['King', 'Queen']
  sidePanelSizes.forEach((size) => {
    const weeklyDemand = weeklyRates[size] || 0
    const currentStock = componentInventory['side_panel']?.[size] || 0
    const pending = pendingComponents['side_panel']?.[size] || 0

    const depletionUntilArrival = weeklyDemand * weeksUntilArrival
    const projectedStock = Math.max(0, currentStock - depletionUntilArrival + pending)
    const targetStock = weeklyDemand * MIN_COVERAGE_TARGET
    const orderNeeded = Math.max(0, Math.ceil(targetStock - projectedStock))

    componentOrder['side_panel'][size] = orderNeeded
  })

  // Double side panel demand = Double + King Single + Single
  const doubleSidePanelDemand =
    (weeklyRates['Double'] || 0) +
    (weeklyRates['King Single'] || 0) +
    (weeklyRates['Single'] || 0)
  const currentDoubleStock = componentInventory['side_panel']?.['Double'] || 0
  const pendingDouble = pendingComponents['side_panel']?.['Double'] || 0

  const doubleDepletionUntilArrival = doubleSidePanelDemand * weeksUntilArrival
  const projectedDoubleStock = Math.max(0, currentDoubleStock - doubleDepletionUntilArrival + pendingDouble)
  const targetDoubleStock = doubleSidePanelDemand * MIN_COVERAGE_TARGET

  componentOrder['side_panel']['Double'] = Math.max(0, Math.ceil(targetDoubleStock - projectedDoubleStock))
  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // Calculate micro coils and thin latex (demand-based, from live sales data)
  // These use King and Queen inventory SKUs only
  // Micro coils and thin latex MUST be equal (they're glued together)

  // King inventory: serves King demand
  const microKingDemand = microDemand.King || 0
  const latexKingDemand = latexDemand.King || 0
  const kingLayerDemand = Math.max(microKingDemand, latexKingDemand)

  const currentMicroKing = componentInventory['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory['thin_latex']?.['King'] || 0
  const pendingMicroKing = pendingComponents['micro_coils']?.['King'] || 0
  const pendingLatexKing = pendingComponents['thin_latex']?.['King'] || 0

  const kingDepletionUntilArrival = kingLayerDemand * weeksUntilArrival

  const projectedMicroKing = Math.max(0, currentMicroKing - kingDepletionUntilArrival + pendingMicroKing)
  const projectedLatexKing = Math.max(0, currentLatexKing - kingDepletionUntilArrival + pendingLatexKing)

  const targetKingLayer = kingLayerDemand * MIN_COVERAGE_TARGET
  const microKingNeeded = Math.max(0, Math.ceil(targetKingLayer - projectedMicroKing))
  const latexKingNeeded = Math.max(0, Math.ceil(targetKingLayer - projectedLatexKing))
  const kingOrderQty = Math.max(microKingNeeded, latexKingNeeded)

  componentOrder['micro_coils']['King'] = kingOrderQty
  componentOrder['thin_latex']['King'] = kingOrderQty

  // Queen inventory: serves Queen + Double + King Single demand
  const microQueenDemand = microDemand.Queen || 0
  const latexQueenDemand = latexDemand.Queen || 0
  const queenLayerDemand = Math.max(microQueenDemand, latexQueenDemand)

  const currentMicroQueen = componentInventory['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory['thin_latex']?.['Queen'] || 0
  const pendingMicroQueen = pendingComponents['micro_coils']?.['Queen'] || 0
  const pendingLatexQueen = pendingComponents['thin_latex']?.['Queen'] || 0

  const queenDepletionUntilArrival = queenLayerDemand * weeksUntilArrival

  const projectedMicroQueen = Math.max(0, currentMicroQueen - queenDepletionUntilArrival + pendingMicroQueen)
  const projectedLatexQueen = Math.max(0, currentLatexQueen - queenDepletionUntilArrival + pendingLatexQueen)

  const targetQueenLayer = queenLayerDemand * MIN_COVERAGE_TARGET
  const microQueenNeeded = Math.max(0, Math.ceil(targetQueenLayer - projectedMicroQueen))
  const latexQueenNeeded = Math.max(0, Math.ceil(targetQueenLayer - projectedLatexQueen))
  const queenOrderQty = Math.max(microQueenNeeded, latexQueenNeeded)

  componentOrder['micro_coils']['Queen'] = queenOrderQty
  componentOrder['thin_latex']['Queen'] = queenOrderQty

  // Zero out small size orders for King/Queen-only components
  KING_QUEEN_ONLY_COMPONENTS.forEach((compId) => {
    componentOrder[compId]['Double'] = 0
    componentOrder[compId]['King Single'] = 0
    componentOrder[compId]['Single'] = 0
  })

  return componentOrder
}
