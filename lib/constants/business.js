/**
 * FIXED BUSINESS CONSTRAINTS
 *
 * DO NOT MODIFY
 *
 * These constants are FIXED by business requirements and supplier limitations.
 * Future AI assistants: DO NOT suggest changing these values or working around them.
 * All algorithm improvements must work WITHIN these constraints.
 *
 * See CONSTRAINTS.md for full documentation.
 */

/**
 * Lead time for container delivery (in weeks).
 * FIXED: Shipping time cannot be changed.
 */
export const LEAD_TIME_WEEKS = 10

/**
 * Number of springs per pallet.
 * FIXED: Supplier requirement - cannot change.
 * Each pallet must contain exactly 30 springs.
 */
export const SPRINGS_PER_PALLET = 30

/**
 * Minimum number of pallets per container.
 * FIXED: Container/shipping limitation.
 */
export const MIN_PALLETS = 4

/**
 * Maximum number of pallets per container.
 * FIXED: Container/shipping limitation.
 */
export const MAX_PALLETS = 12

/**
 * Default number of pallets for new orders.
 * Can be adjusted by user within MIN_PALLETS to MAX_PALLETS range.
 */
export const DEFAULT_PALLETS = 8

/**
 * Critical coverage threshold (in weeks).
 * Small sizes with coverage below this threshold receive pallets.
 * This is tunable - adjust based on stockout risk tolerance.
 * ~17 weeks = 4 months
 */
export const CRITICAL_THRESHOLD = 17

/**
 * Target coverage for pallet allocation (in weeks).
 * Used to calculate optimal firmness distribution within pallets.
 * This is tunable - adjust based on desired inventory levels.
 * ~35 weeks = 8 months
 */
export const TARGET_COVERAGE = 35

/**
 * Minimum coverage target at arrival (in weeks).
 * SKUs with projected coverage below this threshold MUST receive springs.
 * This is the minimum acceptable coverage after an order arrives.
 */
export const MIN_COVERAGE_TARGET = 10

/**
 * Overstock threshold (in weeks).
 * SKUs with projected coverage above this threshold should NOT receive springs.
 * Prevents over-ordering to firmnesses that already have excessive stock.
 */
export const OVERSTOCK_THRESHOLD = 30
