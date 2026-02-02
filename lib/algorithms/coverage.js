/**
 * Algorithm 1: Coverage Calculation
 *
 * Calculates weeks of inventory remaining for a mattress size.
 * Used to determine which sizes need replenishment.
 */

import { WEEKLY_SALES_RATE, FIRMNESS_TYPES } from '../constants/index.js'

/**
 * Calculate coverage (weeks of inventory remaining) for a size.
 *
 * Formula: Total Stock / Weekly Sales Rate = Weeks of Coverage
 *
 * @param inventory - Current warehouse inventory
 * @param size - Mattress size to calculate coverage for
 * @returns Weeks of coverage (Infinity if no sales, 0 if no stock)
 */
export function calculateCoverage(inventory, size) {
  // Sum all firmnesses for this size
  const totalStock = FIRMNESS_TYPES.reduce(
    (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
    0
  )

  const weeklySales = WEEKLY_SALES_RATE[size] || 0

  // Handle edge cases
  if (weeklySales === 0) {
    // No sales = infinite coverage (or no coverage if no stock)
    return totalStock > 0 ? Infinity : 0
  }

  return totalStock / weeklySales
}
