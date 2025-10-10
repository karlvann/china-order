/**
 * Algorithm 6: Export Optimization
 *
 * Rounds component orders to supplier lot sizes with smart buffer logic.
 * Used when generating optimized TSV exports for suppliers.
 */

import type { ComponentOrder, ExportFormat } from '../types';
import { COMPONENT_TYPES, MATTRESS_SIZES } from '../constants';

/**
 * Optimize component order for supplier lot sizes.
 *
 * **Algorithm**:
 * 1. If 'exact' format → return as-is (no rounding)
 * 2. If 'optimized' format:
 *    - Round up to nearest lot size (10 or 20)
 *    - If within buffer threshold → add extra lot as safety stock
 *
 * **Buffer Logic**:
 * - Lot-20 components: If within 10 of lot boundary → add 20 more
 * - Lot-10 components: If within 5 of lot boundary → add 20 more
 *
 * **Why buffers?**
 * Ordering 58 units rounds to 60 (lot-20). But you're only 2 units away
 * from the next lot. Add buffer (80 total) to avoid re-ordering soon.
 *
 * @param componentOrder - Raw component order (exact calculations)
 * @param format - Export format ('exact' or 'optimized')
 * @returns Optimized component order (rounded to lot sizes with buffers)
 *
 * @example
 * ```ts
 * const exact = { 'micro_coils': { 'King': 58, 'Queen': 95 } };
 *
 * // Exact format (no rounding)
 * optimizeComponentOrder(exact, 'exact')
 * // Returns: { 'micro_coils': { 'King': 58, 'Queen': 95 } }
 *
 * // Optimized format (lot-20, threshold=10, buffer=20)
 * optimizeComponentOrder(exact, 'optimized')
 * // King: 58 → 60 (rounded), 60-58=2 ≤ 10 → add buffer → 80
 * // Queen: 95 → 100 (rounded), 100-95=5 ≤ 10 → add buffer → 120
 * // Returns: { 'micro_coils': { 'King': 80, 'Queen': 120 } }
 * ```
 */
export function optimizeComponentOrder(componentOrder: ComponentOrder, format: ExportFormat): ComponentOrder {
  // If exact format, return as-is (no optimization)
  if (format === 'exact') return componentOrder;

  const optimized: ComponentOrder = {};

  COMPONENT_TYPES.forEach((comp) => {
    optimized[comp.id] = {};

    MATTRESS_SIZES.forEach((size) => {
      const quantity = componentOrder[comp.id][size.id];

      // If zero, keep as zero (no rounding needed)
      if (quantity === 0) {
        optimized[comp.id][size.id] = 0;
        return;
      }

      const lotSize = comp.lotSize;
      const bufferThreshold = lotSize === 20 ? 10 : 5; // Lot-20: 10, Lot-10: 5
      const bufferAdd = 20; // Always add 20 as buffer

      // Round up to nearest lot size
      const rounded = Math.ceil(quantity / lotSize) * lotSize;
      const difference = rounded - quantity;

      // If within buffer threshold, add extra lot for safety stock
      if (difference <= bufferThreshold) {
        optimized[comp.id][size.id] = rounded + bufferAdd;
      } else {
        optimized[comp.id][size.id] = rounded;
      }
    });
  });

  return optimized;
}
