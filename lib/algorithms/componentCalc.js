/**
 * Algorithm: Component Calculation (Spring-Matched)
 *
 * Components are ordered to MATCH spring quantities exactly.
 * No coverage floor - we order only what's needed for the springs being ordered.
 *
 * Rules:
 * - Basic components (felt, top/bottom panels): 1:1 with springs per size
 * - Side Panels: King and Queen 1:1, Double covers Double+KS+Single (consolidated)
 * - Micro Coils & Thin Latex (King/Queen only, always equal quantities):
 *   - King: King springs + (Single springs × 0.5) - Singles use half a King sheet
 *   - Queen: Queen + Double + King Single springs - these sizes cut down from Queen
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS } from '../constants/index.js'

/**
 * Calculate component order based on spring order quantities.
 * Components are matched exactly to the spring order - no coverage floor.
 *
 * @param springOrder - Complete spring order with quantities by size
 * @param springInventory - Current spring inventory (not used, kept for API compatibility)
 * @param componentInventory - Current component inventory (used for micro/latex equalization)
 * @param salesRates - Not used in spring-matched mode (kept for API compatibility)
 * @param pendingComponentOrders - Not used in spring-matched mode (kept for API compatibility)
 * @param orderWeekOffset - Not used in spring-matched mode (kept for API compatibility)
 * @param deliveryWeeks - Not used in spring-matched mode (kept for API compatibility)
 * @returns Component order quantities by type and size
 */
export function calculateComponentOrder(springOrder, springInventory, componentInventory, salesRates, pendingComponentOrders = [], orderWeekOffset = 0, deliveryWeeks = 10) {
  const componentOrder = {}

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

  // Get total springs ordered per size (sum of all firmnesses)
  const springsPerSize = {}
  MATTRESS_SIZES.forEach((size) => {
    springsPerSize[size.id] =
      (springOrder.springs.firm?.[size.id] || 0) +
      (springOrder.springs.medium?.[size.id] || 0) +
      (springOrder.springs.soft?.[size.id] || 0)
  })

  // Basic 1:1 components (felt, top_panel, bottom_panel)
  const basicComponents = ['felt', 'top_panel', 'bottom_panel']
  basicComponents.forEach((compId) => {
    MATTRESS_SIZES.forEach((size) => {
      componentOrder[compId][size.id] = springsPerSize[size.id]
    })
  })

  // Side panels - King and Queen 1:1, Double covers Double+KS+Single
  componentOrder['side_panel']['King'] = springsPerSize['King']
  componentOrder['side_panel']['Queen'] = springsPerSize['Queen']
  componentOrder['side_panel']['Double'] = springsPerSize['Double'] + springsPerSize['King Single'] + springsPerSize['Single']
  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // Micro coils and thin latex
  // - King size: used for King mattresses (1:1) + Single mattresses (0.5:1, cut in half)
  // - Queen size: used for Queen, Double, King Single mattresses (1:1, cut down from Queen)
  // - These are always glued together, so micro coils must equal thin latex

  // Calculate base order from spring quantities
  // King: full sheets for King springs + half sheets for Single springs
  const kingNeeded = springsPerSize['King'] + Math.ceil(springsPerSize['Single'] * 0.5)
  // Queen: Queen + Double + King Single all use Queen-sized sheets
  const queenNeeded = springsPerSize['Queen'] + springsPerSize['Double'] + springsPerSize['King Single']

  // For equalization: micro coils must equal thin latex
  // Check current stock and adjust orders so final stock is equal
  const currentMicroKing = componentInventory?.['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory?.['thin_latex']?.['King'] || 0
  const currentMicroQueen = componentInventory?.['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory?.['thin_latex']?.['Queen'] || 0

  // King: equalize final stock (current + order)
  // Start with what we need for springs, then adjust to equalize
  let kingMicroOrder = kingNeeded
  let kingLatexOrder = kingNeeded

  const kingMicroFinal = currentMicroKing + kingMicroOrder
  const kingLatexFinal = currentLatexKing + kingLatexOrder
  const kingTarget = Math.max(kingMicroFinal, kingLatexFinal)
  kingMicroOrder = Math.max(0, kingTarget - currentMicroKing)
  kingLatexOrder = Math.max(0, kingTarget - currentLatexKing)

  // Queen: equalize final stock (current + order)
  let queenMicroOrder = queenNeeded
  let queenLatexOrder = queenNeeded

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
