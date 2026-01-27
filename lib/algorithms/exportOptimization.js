/**
 * Algorithm 6: Export Optimization
 *
 * Rounds component orders to supplier lot sizes with smart buffer logic.
 * Used when generating optimized TSV exports for suppliers.
 */

import { COMPONENT_TYPES, MATTRESS_SIZES } from '../constants/index.js'

/**
 * Optimize component order for supplier lot sizes.
 *
 * Algorithm:
 * 1. If 'exact' format → return as-is (no rounding)
 * 2. If 'optimized' format:
 *    - Round up to nearest lot size (10 or 20)
 *    - If within buffer threshold → add extra lot as safety stock
 *
 * Buffer Logic:
 * - Lot-20 components: If within 10 of lot boundary → add 20 more
 * - Lot-10 components: If within 5 of lot boundary → add 20 more
 *
 * @param componentOrder - Raw component order (exact calculations)
 * @param format - Export format ('exact' or 'optimized')
 * @returns Optimized component order (rounded to lot sizes with buffers)
 */
export function optimizeComponentOrder(componentOrder, format) {
  // If exact format, return as-is (no optimization)
  if (format === 'exact') return componentOrder

  const optimized = {}

  COMPONENT_TYPES.forEach((comp) => {
    optimized[comp.id] = {}

    MATTRESS_SIZES.forEach((size) => {
      const quantity = componentOrder[comp.id][size.id]

      // If zero, keep as zero (no rounding needed)
      if (quantity === 0) {
        optimized[comp.id][size.id] = 0
        return
      }

      const lotSize = comp.lotSize
      const bufferThreshold = lotSize === 20 ? 10 : 5 // Lot-20: 10, Lot-10: 5
      const bufferAdd = 20 // Always add 20 as buffer

      // Round up to nearest lot size
      const rounded = Math.ceil(quantity / lotSize) * lotSize
      const difference = rounded - quantity

      // If within buffer threshold, add extra lot for safety stock
      if (difference <= bufferThreshold) {
        optimized[comp.id][size.id] = rounded + bufferAdd
      } else {
        optimized[comp.id][size.id] = rounded
      }
    })
  })

  return optimized
}
