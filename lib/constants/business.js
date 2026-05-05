/**
 * FIXED BUSINESS CONSTRAINTS
 *
 * DO NOT MODIFY
 *
 * These constants capture business requirements, supplier limitations, and defaults.
 * Future AI assistants: DO NOT suggest working around supplier constraints.
 * Lead-time defaults may be overridden by order-specific planning settings where supported.
 *
 * See docs/CONSTRAINTS.md for full documentation.
 */

/**
 * Default lead time for container delivery (in weeks).
 * Actual lead time can vary by order, season, supplier timing, and shipping conditions.
 */
export const LEAD_TIME_WEEKS = 10

/**
 * Number of springs per pallet.
 * FIXED: Supplier requirement - cannot change.
 * Each pallet must contain exactly 30 springs.
 */
export const SPRINGS_PER_PALLET = 30

/**
 * Minimum number of pallets per order.
 */
export const MIN_PALLETS = 1

/**
 * Maximum number of pallets per container/order.
 * FIXED: Container/shipping limitation.
 */
export const MAX_PALLETS = 12

/**
 * Default number of pallets for new orders.
 * Can be adjusted by user within MIN_PALLETS to MAX_PALLETS range.
 */
export const DEFAULT_PALLETS = 8

/**
 * Legacy critical coverage threshold (in weeks).
 * Current spring allocation is demand/coverage based in demandBasedOrder.js.
 * Keep week-based if reused in future logic.
 */
export const CRITICAL_THRESHOLD = 17

/**
 * Legacy target coverage for pallet allocation (in weeks).
 * Current spring allocation uses size-specific targets in demandBasedOrder.js.
 * Keep week-based if reused in future logic.
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
