/**
 * Spring and component ordering constants.
 *
 * These values capture supplier constraints, planning assumptions and product
 * definitions for spring orders and the components that ship with them.
 */

/**
 * Default lead time for container delivery in weeks.
 * Actual lead time can vary by order, season, supplier timing and shipping.
 */
export const LEAD_TIME_WEEKS = 10

/** Each supplier pallet contains exactly 30 springs. */
export const SPRINGS_PER_PALLET = 30

/** Container pallet limits. */
export const MIN_PALLETS = 1
export const MAX_PALLETS = 12
export const DEFAULT_PALLETS = 8

/** Legacy week-based coverage thresholds retained for spring planning compatibility. */
export const CRITICAL_THRESHOLD = 17
export const TARGET_COVERAGE = 35

/** Spring SKU coverage limits at arrival. */
export const MIN_COVERAGE_TARGET = 10
export const OVERSTOCK_THRESHOLD = 30

/** Mattress sizes and their historical sales distribution. */
export const MATTRESS_SIZES = [
  { id: 'King', name: 'King', ratio: 0.30 },
  { id: 'Queen', name: 'Queen', ratio: 0.48 },
  { id: 'Double', name: 'Double', ratio: 0.13 },
  { id: 'King Single', name: 'King Single', ratio: 0.05 },
  { id: 'Single', name: 'Single', ratio: 0.03 }
]

/** Spring tensions, firmest to softest. */
export const FIRMNESS_TYPES = ['firm', 'medium', 'soft', 'verysoft']

/** Fixed spring planning splits for upcoming recommendation changes. */
export const SPRING_PLANNING_SPLITS = {
  kingAndKingSingle: { verysoft: 0, soft: 4, medium: 38, firm: 58 },
  otherSizes: { verysoft: 0, soft: 6, medium: 40, firm: 54 }
}

export const FIRMNESS_LABELS = {
  firm: 'Firm',
  medium: 'Medium',
  soft: 'Soft',
  verysoft: 'Very soft'
}

/**
 * Springs arrive packaged in usable felt, so only one felt is ordered for
 * approximately every three springs.
 */
export const FELT_TO_SPRING_RATIO = 1 / 3

/** Component definitions and supplier lot sizes. */
export const COMPONENT_TYPES = [
  { id: 'micro_coils', name: 'Micro Coils', multiplier: 1.5, lotSize: 20 },
  { id: 'thin_latex', name: 'Thin Latex', multiplier: 1.5, lotSize: 10 },
  { id: 'felt', name: 'Felt', multiplier: FELT_TO_SPRING_RATIO, lotSize: 10 },
  { id: 'top_panel', name: 'Top Panel', multiplier: 1.0, lotSize: 10 },
  { id: 'bottom_panel', name: 'Bottom Panel', multiplier: 1.0, lotSize: 20 },
  { id: 'side_panel', name: 'Side Panel', multiplier: 1.0, lotSize: 20 }
]

/** Micro coils and thin latex are only ordered as King and Queen inventory. */
export const KING_QUEEN_ONLY_COMPONENTS = ['micro_coils', 'thin_latex']

/** Single and King Single side panels are consolidated into Double inventory. */
export const SIDE_PANEL_CONSOLIDATED_SIZES = ['Single', 'King Single']

/** Number of legacy local-storage save slots. */
export const NUM_SAVE_SLOTS = 5
