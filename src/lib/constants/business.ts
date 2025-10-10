/**
 * FIXED BUSINESS CONSTRAINTS
 *
 * ⚠️ DO NOT MODIFY ⚠️
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
export const LEAD_TIME_WEEKS = 10 as const;

/**
 * Number of springs per pallet.
 * FIXED: Supplier requirement - cannot change.
 * Each pallet must contain exactly 30 springs.
 */
export const SPRINGS_PER_PALLET = 30 as const;

/**
 * Minimum number of pallets per container.
 * FIXED: Container/shipping limitation.
 */
export const MIN_PALLETS = 4 as const;

/**
 * Maximum number of pallets per container.
 * FIXED: Container/shipping limitation.
 */
export const MAX_PALLETS = 12 as const;

/**
 * Default number of pallets for new orders.
 * Can be adjusted by user within MIN_PALLETS to MAX_PALLETS range.
 */
export const DEFAULT_PALLETS = 8 as const;

/**
 * Critical coverage threshold (in months).
 * Small sizes with coverage below this threshold receive pallets.
 * This is tunable - adjust based on stockout risk tolerance.
 */
export const CRITICAL_THRESHOLD = 4 as const;

/**
 * Target coverage for pallet allocation (in months).
 * Used to calculate optimal firmness distribution within pallets.
 * This is tunable - adjust based on desired inventory levels.
 */
export const TARGET_COVERAGE = 8 as const;
