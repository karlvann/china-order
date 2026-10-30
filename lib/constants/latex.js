/**
 * LATEX PRODUCT DEFINITIONS (Latex)
 *
 * Latex comfort layers ordered from Latex supplier.
 * Mattress latex uses 6 SKUs - 3 firmnesses × 2 sizes (King and Queen only).
 * Pillow latex uses 2 additional SKUs: thin and thick.
 * King and Queen thin latex for micro coils are also ordered from Sri Lanka.
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
 * Thin latex sheets paired with micro coils and ordered from Sri Lanka.
 */
export const THIN_LATEX_SKUS = [
  'thinlatexking',
  'thinlatexqueen'
]

/**
 * All latex SKUs available for ordering
 */
export const LATEX_SKUS = [
  ...MATTRESS_LATEX_SKUS,
  ...PILLOW_LATEX_SKUS,
  ...THIN_LATEX_SKUS
]

/**
 * Latex firmness types
 */
export const LATEX_FIRMNESSES = ['firm', 'medium', 'soft']

// Fixed demand percentages for the two stocked latex sheet sizes.
export const LATEX_PLANNING_SPLIT = {
  King: { soft: 69, medium: 30, firm: 1 },
  Queen: { soft: 49, medium: 49, firm: 2 }
}

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

export const PILLOW_LATEX_PLANNING_SPLIT = {
  thin: 60,
  thick: 40
}

/**
 * Default item capacity for new Latex orders
 */
export const DEFAULT_LATEX_CAPACITY = 410

/**
 * Capacity step for Latex order controls
 */
export const LATEX_CAPACITY_STEP = 5

/**
 * Minimum item capacity for Latex orders
 */
export const MIN_LATEX_CAPACITY = 5

/** Supplier packing quantities for Sri Lanka latex orders. */
export const LATEX_PACK_SIZE = 3
export const THIN_LATEX_PACK_SIZE = 15

/**
 * Lead time from Latex (weeks)
 */
export const LATEX_LEAD_TIME_WEEKS = 13

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
