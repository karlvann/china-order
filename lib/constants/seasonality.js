/**
 * SEASONALITY DATA
 *
 * Monthly demand multipliers for 2026.
 * Index of 1.0 = average demand, >1.0 = above average, <1.0 = below average.
 */

/**
 * Monthly seasonal demand multipliers (0-indexed by month).
 * Based on 2026 forecast data.
 */
export const SEASONAL_DEMAND = [
  1.00, // January
  1.00, // February
  1.00, // March
  1.00, // April
  1.10, // May
  1.15, // June
  1.25, // July
  1.25, // August
  1.10, // September
  1.05, // October
  1.20, // November
  1.10  // December
]

/**
 * @deprecated Use SEASONAL_DEMAND instead
 */
export const BUSY_MONTHS = [4, 5, 6, 7, 10] // May-Aug, Nov
export const SEASONAL_MULTIPLIER_BUSY = 1.25
export const SEASONAL_MULTIPLIER_SLOW = 1.00

/**
 * Month names (short form).
 */
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Month names (full form).
 */
export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Get seasonal multiplier for a given month index (0-11).
 */
export function getSeasonalMultiplier(monthIndex) {
  return SEASONAL_DEMAND[monthIndex] || 1.0
}
