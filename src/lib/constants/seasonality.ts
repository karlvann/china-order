/**
 * SEASONALITY DATA
 *
 * Sales show clear seasonal patterns:
 * - Busy season (Apr-Aug): 14% above average
 * - Slow season (Sep-Mar): 12% below average
 */

/**
 * Busy months (0-indexed): April=3, May=4, June=5, July=6, August=7
 * Sales are 14% above average during these months.
 */
export const BUSY_MONTHS = [3, 4, 5, 6, 7] as const;

/**
 * Seasonal multiplier for busy months.
 * Sales are 14% above average (92 units/month vs 81 avg).
 */
export const SEASONAL_MULTIPLIER_BUSY = 1.14 as const;

/**
 * Seasonal multiplier for slow months.
 * Sales are 12% below average (71 units/month vs 81 avg).
 */
export const SEASONAL_MULTIPLIER_SLOW = 0.88 as const;

/**
 * Month names (short form).
 */
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * Month names (full form).
 */
export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/**
 * Get seasonal multiplier for a given month index (0-11).
 */
export function getSeasonalMultiplier(monthIndex: number): number {
  return BUSY_MONTHS.includes(monthIndex as typeof BUSY_MONTHS[number])
    ? SEASONAL_MULTIPLIER_BUSY
    : SEASONAL_MULTIPLIER_SLOW;
}
