/**
 * Algorithm 7: TSV Export Generation
 *
 * Generates tab-separated value (TSV) export format for suppliers.
 * Can be pasted directly into Google Sheets or Excel.
 */

import { FIRMNESS_TYPES, MATTRESS_SIZES, COMPONENT_TYPES } from '../constants/index.js'

/**
 * Generate TSV (tab-separated values) export.
 *
 * Format includes:
 * - Header (date, format, totals, critical sizes)
 * - Pallet breakdown (individual pallet details)
 * - Springs order (by firmness and size)
 * - Components order (by type and size)
 * - Summary statistics
 *
 * @param springOrder - Complete spring order from N+ optimization
 * @param componentOrder - Component order (exact or optimized)
 * @param format - Export format type ('exact' or 'optimized')
 * @returns TSV string ready for clipboard/download
 */
export function generateTSV(springOrder, componentOrder, format) {
  const date = new Date().toISOString().split('T')[0]
  const lines = []

  // Header section
  lines.push(`ULTRA ORDER - Container Order - ${date}`)
  lines.push(`Format: ${format === 'exact' ? 'Exact Calculations' : 'Optimized for Supplier'}`)
  lines.push(`Total Pallets: ${springOrder.metadata.total_pallets}`)
  lines.push(`Total Springs: ${springOrder.metadata.total_springs}`)

  // Small sizes allocated
  const smallSizes = springOrder.metadata.small_sizes_allocated || []
  const smallSizesLabel = smallSizes.length > 1 ? 'Small Sizes' : 'Small Size'
  const smallSizesValue = smallSizes.length > 0 ? smallSizes.join(', ') : 'None'
  lines.push(`${smallSizesLabel}: ${smallSizesValue}`)
  lines.push('')

  // Pallet breakdown section
  lines.push('PALLET BREAKDOWN')
  lines.push('Pallet ID\tSize\tType\tFirm\tMedium\tSoft\tTotal')

  springOrder.pallets.forEach((pallet) => {
    lines.push(
      [
        pallet.id,
        pallet.size,
        pallet.type,
        pallet.firmness_breakdown.firm || '',
        pallet.firmness_breakdown.medium || '',
        pallet.firmness_breakdown.soft || '',
        pallet.total
      ].join('\t')
    )
  })
  lines.push('')

  // Springs order section
  lines.push('SPRINGS ORDER')
  lines.push('Firmness\tKing\tQueen\tDouble\tKing Single\tSingle\tTotal')

  FIRMNESS_TYPES.forEach((firmness) => {
    const row = [firmness.charAt(0).toUpperCase() + firmness.slice(1)] // Capitalize
    let total = 0

    MATTRESS_SIZES.forEach((size) => {
      const val = springOrder.springs[firmness][size.id]
      row.push(String(val))
      total += val
    })

    row.push(String(total))
    lines.push(row.join('\t'))
  })
  lines.push('')

  // Components order section
  lines.push('COMPONENTS ORDER')
  lines.push('Component\tKing\tQueen\tDouble\tKing Single\tSingle\tTotal')

  COMPONENT_TYPES.forEach((comp) => {
    const row = [comp.name]
    let total = 0

    MATTRESS_SIZES.forEach((size) => {
      const val = componentOrder[comp.id][size.id]
      row.push(String(val))
      total += val
    })

    row.push(String(total))
    lines.push(row.join('\t'))
  })
  lines.push('')

  // Summary section
  lines.push('SUMMARY')
  lines.push(`Pure Pallets: ${springOrder.metadata.pure_pallets}`)
  lines.push(`Mixed Pallets: ${springOrder.metadata.mixed_pallets}`)

  const efficiency = Math.round(
    (springOrder.metadata.pure_pallets / springOrder.metadata.total_pallets) * 100
  )
  lines.push(`Pure Pallet Efficiency: ${efficiency}%`)

  return lines.join('\n')
}
