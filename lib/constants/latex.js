/**
 * LATEX PRODUCT DEFINITIONS (Sri Lanka)
 *
 * Latex comfort layers ordered from Sri Lanka supplier.
 * Mattress latex uses 6 SKUs - 3 firmnesses × 2 sizes (King and Queen only).
 * Pillow latex uses 2 additional SKUs: thin and thick.
 *
 * Size mapping for inventory deduction:
 * - King mattress → King latex (1.0x)
 * - Single mattress → King latex (0.5x - one King makes two Singles)
 * - Queen/Double/King Single → Queen latex (1.0x - all cut from Queen)
 */

/**
 * Mattress latex SKUs available for ordering
 */
export const MATTRESS_LATEX_SKUS = [
  'latexfirmking',
  'latexfirmqueen',
  'latexmediumking',
  'latexmediumqueen',
  'latexsoftking',
  'latexsoftqueen'
]

/**
 * Pillow latex SKUs available for ordering
 */
export const PILLOW_LATEX_SKUS = [
  'pillowlatexthin',
  'pillowlatexthick'
]

/**
 * All latex SKUs available for ordering
 */
export const LATEX_SKUS = [
  ...MATTRESS_LATEX_SKUS,
  ...PILLOW_LATEX_SKUS
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
 * Pillow latex types
 */
export const PILLOW_LATEX_TYPES = ['thin', 'thick']

/**
 * Pillow latex display labels
 */
export const PILLOW_LATEX_LABELS = {
  thin: 'Pillow latex thin',
  thick: 'Pillow latex thick'
}

/**
 * Default item capacity for new Sri Lanka orders
 */
export const DEFAULT_LATEX_CAPACITY = 410

/**
 * Capacity step for Sri Lanka order controls
 */
export const LATEX_CAPACITY_STEP = 5

/**
 * Minimum item capacity for Sri Lanka orders
 */
export const MIN_LATEX_CAPACITY = 5

/**
 * Lead time from Sri Lanka (weeks)
 */
export const LATEX_LEAD_TIME_WEEKS = 12

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
 * Firmness level ranges for normal latex mapping.
 * Soft-latex SKUs (`11s`-`16s`) override this to soft latex.
 */
export const FIRMNESS_LEVEL_RANGES = {
  soft: { min: 2, max: 7 },
  medium: { min: 8, max: 16 },
  firm: { min: 17, max: 19 }
}
