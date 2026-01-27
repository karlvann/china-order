/**
 * COMPONENT TYPE DEFINITIONS
 *
 * Components are ordered based on spring quantities with:
 * - Multipliers (how many units per spring)
 * - Lot sizes (supplier minimum order quantities)
 * - Consolidation rules (see component algorithm)
 */

/**
 * Component types with ordering specifications.
 *
 * Multipliers:
 * - 1.5x: Micro Coils, Thin Latex (150% of spring quantity)
 * - 1.0x: Felt, Panels (100% of spring quantity)
 *
 * Lot sizes (supplier fixed):
 * - 20: Micro Coils, Bottom Panel, Side Panel
 * - 10: Thin Latex, Felt, Top Panel
 */
export const COMPONENT_TYPES = [
  { id: 'micro_coils', name: 'Micro Coils', multiplier: 1.5, lotSize: 20 },
  { id: 'thin_latex', name: 'Thin Latex', multiplier: 1.5, lotSize: 10 },
  { id: 'felt', name: 'Felt', multiplier: 1.0, lotSize: 10 },
  { id: 'top_panel', name: 'Top Panel', multiplier: 1.0, lotSize: 10 },
  { id: 'bottom_panel', name: 'Bottom Panel', multiplier: 1.0, lotSize: 20 },
  { id: 'side_panel', name: 'Side Panel', multiplier: 1.0, lotSize: 20 }
]

/**
 * Components that are NOT ordered for small sizes.
 * Micro Coils and Thin Latex are only ordered for King and Queen.
 */
export const KING_QUEEN_ONLY_COMPONENTS = ['micro_coils', 'thin_latex']

/**
 * Side Panel consolidation: Single and King Single use Double side panels.
 * These sizes don't have separate side panel SKUs - they're physically identical to Double.
 * The algorithm consolidates Single + King Single quantities into Double orders.
 */
export const SIDE_PANEL_CONSOLIDATED_SIZES = ['Single', 'King Single']

/**
 * Number of save slots available.
 * Used by localStorage and Vercel KV storage adapters.
 */
export const NUM_SAVE_SLOTS = 5
