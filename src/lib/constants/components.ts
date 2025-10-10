/**
 * COMPONENT TYPE DEFINITIONS
 *
 * Components are ordered based on spring quantities with:
 * - Multipliers (how many units per spring)
 * - Lot sizes (supplier minimum order quantities)
 * - Consolidation rules (see component algorithm)
 */

import type { ComponentType } from '../types';

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
export const COMPONENT_TYPES: ComponentType[] = [
  { id: 'micro_coils', name: 'Micro Coils', multiplier: 1.5, lotSize: 20 },
  { id: 'thin_latex', name: 'Thin Latex', multiplier: 1.5, lotSize: 10 },
  { id: 'felt', name: 'Felt', multiplier: 1.0, lotSize: 10 },
  { id: 'top_panel', name: 'Top Panel', multiplier: 1.0, lotSize: 10 },
  { id: 'bottom_panel', name: 'Bottom Panel', multiplier: 1.0, lotSize: 20 },
  { id: 'side_panel', name: 'Side Panel', multiplier: 1.0, lotSize: 20 }
] as const;

/**
 * Components that are NOT ordered for small sizes.
 * Micro Coils and Thin Latex are only ordered for King and Queen.
 */
export const KING_QUEEN_ONLY_COMPONENTS = ['micro_coils', 'thin_latex'] as const;

/**
 * Number of save slots available.
 * Used by localStorage and Vercel KV storage adapters.
 */
export const NUM_SAVE_SLOTS = 5 as const;
