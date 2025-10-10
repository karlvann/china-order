/**
 * Algorithm 2: Find Critical Small Size(s)
 *
 * Identifies small sizes (Double, King Single, Single) that need pallets.
 * Returns 0-3 sizes based on coverage threshold (currently 4 months).
 *
 * This enables automatic N+0, N+1, N+2, or N+3 allocation.
 */

import type { Inventory, MattressSize, SizeCoverage } from '../types';
import { SMALL_SIZES, MONTHLY_SALES_RATE, FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION, CRITICAL_THRESHOLD } from '../constants';

/**
 * Find all critical small sizes (coverage < 4 months).
 *
 * **Algorithm**:
 * 1. Calculate total and medium coverage for each small size
 * 2. Filter to sizes with total coverage < 4 months
 * 3. Sort by medium coverage (lowest first), then total coverage
 * 4. Return array of critical size names (0-3)
 *
 * **Why medium coverage for sorting?**
 * Medium is the dominant firmness (58-84% of sales), so it's the best
 * indicator of which size is most critical.
 *
 * @param inventory - Current warehouse inventory
 * @returns Array of critical size names (0-3 sizes)
 *
 * @example
 * ```ts
 * // All small sizes healthy (>4 months coverage)
 * findCriticalSmallSizes(inventory)  // Returns []
 *
 * // Double is critical (1.5 months), others healthy
 * findCriticalSmallSizes(inventory)  // Returns ['Double']
 *
 * // Double (1.5 mo) and King Single (2.0 mo) both critical
 * findCriticalSmallSizes(inventory)  // Returns ['Double', 'King Single']
 * ```
 */
export function findCriticalSmallSizes(inventory: Inventory): MattressSize[] {
  // Calculate coverage for each small size
  const sizesWithCoverage: SizeCoverage[] = SMALL_SIZES.map((size) => {
    const totalStock = FIRMNESS_TYPES.reduce(
      (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
      0
    );

    const mediumStock = inventory.springs['medium'][size] || 0;
    const monthlySales = MONTHLY_SALES_RATE[size] || 0;
    const mediumRatio = FIRMNESS_DISTRIBUTION[size]['medium'];
    const mediumMonthlySales = monthlySales * mediumRatio;

    // Calculate coverage for total and medium separately
    const totalCoverage =
      monthlySales === 0 ? (totalStock > 0 ? Infinity : 0) : totalStock / monthlySales;
    const mediumCoverage =
      mediumMonthlySales === 0 ? (mediumStock > 0 ? Infinity : 0) : mediumStock / mediumMonthlySales;

    return {
      size,
      totalCoverage,
      mediumCoverage
    };
  });

  // Filter to only critical sizes (coverage < 4 months)
  const criticalSizes = sizesWithCoverage.filter(
    (item) => item.totalCoverage < CRITICAL_THRESHOLD
  );

  // Sort by medium coverage (lowest = most critical), then total coverage
  criticalSizes.sort((a, b) => {
    if (a.mediumCoverage !== b.mediumCoverage) {
      return a.mediumCoverage - b.mediumCoverage;
    }
    return a.totalCoverage - b.totalCoverage;
  });

  // Return array of critical size names (0-3 sizes)
  return criticalSizes.map((item) => item.size);
}

/**
 * Find the single most critical small size (backward compatibility).
 *
 * @deprecated Use findCriticalSmallSizes() instead (supports 0-3 sizes).
 * @param inventory - Current warehouse inventory
 * @returns Most critical size name, or undefined if all sizes healthy
 */
export function findCriticalSmallSize(inventory: Inventory): MattressSize | undefined {
  return findCriticalSmallSizes(inventory)[0];
}
