/**
 * Algorithm 6: Export Optimization
 *
 * Rounds component orders to supplier lot sizes with smart buffer logic.
 * Used when generating optimized TSV exports for suppliers.
 *
 * IMPORTANT: Micro coils and thin latex are re-equalized AFTER rounding
 * to ensure they end up with the same quantity (they're used as pairs).
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
 *    - Re-equalize micro coils and thin latex to the HIGHER value
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

  // ============================================
  // Re-equalize micro coils and thin latex
  // ============================================
  // After rounding to different lot sizes (20 vs 10), they may no longer be equal.
  // Since micro coils have lot 20 and thin latex has lot 10, they can only be equal
  // at multiples of 20 (the LCM). Round BOTH to the higher multiple of 20.

  const sizes = ['King', 'Queen']
  sizes.forEach(size => {
    const microQty = optimized['micro_coils'][size]
    const latexQty = optimized['thin_latex'][size]

    // Take the max and round UP to nearest 20 (so both can match)
    const maxQty = Math.max(microQty, latexQty)
    const equalizedQty = Math.ceil(maxQty / 20) * 20

    optimized['micro_coils'][size] = equalizedQty
    optimized['thin_latex'][size] = equalizedQty
  })

  return optimized
}
