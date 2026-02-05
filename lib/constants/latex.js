/**
 * LATEX PRODUCT DEFINITIONS (Sri Lanka)
 *
 * Latex comfort layers ordered from Sri Lanka supplier.
 * Only 6 SKUs - 3 firmnesses × 2 sizes (King and Queen only).
 *
 * Size mapping for inventory deduction:
 * - King mattress → King latex (1.0x)
 * - Single mattress → King latex (0.5x - one King makes two Singles)
 * - Queen/Double/King Single → Queen latex (1.0x - all cut from Queen)
 */

/**
 * All latex SKUs available for ordering
 */
export const LATEX_SKUS = [
  'latexfirmking',
  'latexfirmqueen',
  'latexmediumking',
  'latexmediumqueen',
  'latexsoftking',
  'latexsoftqueen'
]

/**
 * Latex firmness types
 */
export const LATEX_FIRMNESSES = ['firm', 'medium', 'soft']

/**
 * Latex sizes (only King and Queen - smaller sizes are cut from these)
 */
export const LATEX_SIZES = ['King', 'Queen']

/**
 * Container capacity limits
 */
export const CONTAINER_40FT = 340
export const CONTAINER_20FT = 170

/**
 * Default container size for new orders
 */
export const DEFAULT_CONTAINER_SIZE = '40ft'

/**
 * Lead time from Sri Lanka (weeks)
 */
export const LATEX_LEAD_TIME_WEEKS = 10

/**
 * Map container size string to capacity
 */
export const CONTAINER_CAPACITY = {
  '40ft': CONTAINER_40FT,
  '20ft': CONTAINER_20FT
}

/**
 * Priority weights for allocation (Queen sells more)
 */
export const SIZE_PRIORITY_WEIGHT = {
  Queen: 1.5,
  King: 1.3
}

/**
 * Minimum coverage targets (weeks of stock)
 */
export const MIN_COVERAGE_TARGETS = {
  Queen: 8,
  King: 8
}

/**
 * Mattress size to latex size mapping
 * Single deducts 0.5 from King (one King sheet makes two Singles)
 */
export const MATTRESS_TO_LATEX_MAP = {
  King: { latexSize: 'King', deduction: 1.0 },
  Queen: { latexSize: 'Queen', deduction: 1.0 },
  Double: { latexSize: 'Queen', deduction: 1.0 },
  'King Single': { latexSize: 'Queen', deduction: 1.0 },
  Single: { latexSize: 'King', deduction: 0.5 }
}

/**
 * Firmness level ranges for latex mapping
 * Different from spring firmness mapping
 */
export const FIRMNESS_LEVEL_RANGES = {
  soft: { min: 2, max: 7 },
  medium: { min: 8, max: 12 },
  firm: { min: 13, max: 19 }
}
