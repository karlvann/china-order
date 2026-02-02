/**
 * Algorithm: Component Calculation (Demand-Based)
 *
 * Derives component orders from weekly demand, not spring orders.
 * Components are ordered to maintain coverage based on actual sales velocity.
 *
 * Rules:
 * - Micro Coils & Thin Latex: Always ordered in equal quantities (they're glued together)
 * - Micro Coils/Thin Latex: King/Queen only (small sizes don't use them)
 * - Side Panels: Single and King Single consolidated into Double size orders
 *
 * Inventory SKU mapping:
 * - King micro/latex inventory: Used by King (1.0x) + Single (0.5x)
 * - Queen micro/latex inventory: Used by Queen (1.0x) + Double (1.0x) + King Single (1.0x)
 */

import { COMPONENT_TYPES, MATTRESS_SIZES, KING_QUEEN_ONLY_COMPONENTS } from '../constants/index.js'

// Target weeks of coverage for components (should match spring order coverage)
const TARGET_COMPONENT_COVERAGE_WEEKS = 18 // ~10 weeks lead time + 8 weeks buffer

/**
 * Calculate component order based on demand.
 *
 * @param springOrder - Complete spring order (used to determine arrival timing)
 * @param componentInventory - Current component inventory
 * @param salesRates - Live sales data { WEEKLY_SALES_RATE, MICRO_COIL_WEEKLY_DEMAND, THIN_LATEX_WEEKLY_DEMAND }
 * @returns Component order quantities by type and size
 */
export function calculateComponentOrder(springOrder, springInventory, componentInventory, salesRates) {
  const componentOrder = {}

  // Get demand data
  const weeklyRates = salesRates?.WEEKLY_SALES_RATE || {}
  const microDemand = salesRates?.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const latexDemand = salesRates?.THIN_LATEX_WEEKLY_DEMAND || { King: 0, Queen: 0 }

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
      const targetStock = weeklyDemand * TARGET_COMPONENT_COVERAGE_WEEKS
      const currentStock = componentInventory[compId]?.[size.id] || 0
      const orderNeeded = Math.max(0, Math.ceil(targetStock - currentStock))
      componentOrder[compId][size.id] = orderNeeded
    })
  })

  // Calculate side panels with consolidation
  // King and Queen have their own side panels
  // Double side panels are used for Double + King Single + Single
  const sidePanelSizes = ['King', 'Queen']
  sidePanelSizes.forEach((size) => {
    const weeklyDemand = weeklyRates[size] || 0
    const targetStock = weeklyDemand * TARGET_COMPONENT_COVERAGE_WEEKS
    const currentStock = componentInventory['side_panel']?.[size] || 0
    const orderNeeded = Math.max(0, Math.ceil(targetStock - currentStock))
    componentOrder['side_panel'][size] = orderNeeded
  })

  // Double side panel demand = Double + King Single + Single
  const doubleSidePanelDemand =
    (weeklyRates['Double'] || 0) +
    (weeklyRates['King Single'] || 0) +
    (weeklyRates['Single'] || 0)
  const targetDoubleStock = doubleSidePanelDemand * TARGET_COMPONENT_COVERAGE_WEEKS
  const currentDoubleStock = componentInventory['side_panel']?.['Double'] || 0
  componentOrder['side_panel']['Double'] = Math.max(0, Math.ceil(targetDoubleStock - currentDoubleStock))
  componentOrder['side_panel']['King Single'] = 0
  componentOrder['side_panel']['Single'] = 0

  // Calculate micro coils and thin latex (demand-based, from live sales data)
  // These use King and Queen inventory SKUs only
  // Micro coils and thin latex MUST be equal (they're glued together)

  // King inventory: serves King + 0.5×Single demand
  const microKingDemand = microDemand.King || 0
  const latexKingDemand = latexDemand.King || 0
  // Use the higher of the two to ensure we have enough of both
  const kingLayerDemand = Math.max(microKingDemand, latexKingDemand)

  const targetMicroKing = kingLayerDemand * TARGET_COMPONENT_COVERAGE_WEEKS
  const currentMicroKing = componentInventory['micro_coils']?.['King'] || 0
  const currentLatexKing = componentInventory['thin_latex']?.['King'] || 0

  // Order enough to cover both - use max current stock deficit
  const microKingNeeded = Math.max(0, Math.ceil(targetMicroKing - currentMicroKing))
  const latexKingNeeded = Math.max(0, Math.ceil(targetMicroKing - currentLatexKing))
  const kingOrderQty = Math.max(microKingNeeded, latexKingNeeded)

  componentOrder['micro_coils']['King'] = kingOrderQty
  componentOrder['thin_latex']['King'] = kingOrderQty

  // Queen inventory: serves Queen + Double + King Single demand
  const microQueenDemand = microDemand.Queen || 0
  const latexQueenDemand = latexDemand.Queen || 0
  // Use the higher of the two to ensure we have enough of both
  const queenLayerDemand = Math.max(microQueenDemand, latexQueenDemand)

  const targetMicroQueen = queenLayerDemand * TARGET_COMPONENT_COVERAGE_WEEKS
  const currentMicroQueen = componentInventory['micro_coils']?.['Queen'] || 0
  const currentLatexQueen = componentInventory['thin_latex']?.['Queen'] || 0

  // Order enough to cover both - use max current stock deficit
  const microQueenNeeded = Math.max(0, Math.ceil(targetMicroQueen - currentMicroQueen))
  const latexQueenNeeded = Math.max(0, Math.ceil(targetMicroQueen - currentLatexQueen))
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
