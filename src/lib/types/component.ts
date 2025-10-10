/**
 * Type definitions for component orders
 *
 * Components (micro coils, latex, felt, panels) are ordered based on
 * spring quantities with consolidation rules applied.
 */

import type { SizeInventoryRecord } from './inventory';

/**
 * Component order quantities organized by component type.
 * Each component type maps to quantities for each mattress size.
 *
 * Example:
 * ```
 * {
 *   'micro_coils': { King: 150, Queen: 200, Double: 0, ... },
 *   'felt': { King: 100, Queen: 140, Double: 60, ... }
 * }
 * ```
 */
export type ComponentOrder = Record<string, SizeInventoryRecord>;

/**
 * Export format options for TSV generation.
 *
 * - exact: Precise calculated quantities (for internal planning)
 * - optimized: Rounded to supplier lot sizes with buffers (for ordering)
 */
export type ExportFormat = 'exact' | 'optimized';

/**
 * Settings for save/load functionality.
 * Persisted alongside inventory data.
 */
export interface SaveSettings {
  palletCount: number;               // Container size (4-12 pallets)
  exportFormat: ExportFormat;        // Selected export format
}

/**
 * Complete save data structure.
 * Used by localStorage and Vercel KV storage adapters.
 */
export interface SaveData {
  inventory: {
    springs: import('./inventory').SpringInventory;
    components: import('./inventory').ComponentInventory;
  };
  settings: SaveSettings;
}

/**
 * Save slot metadata.
 * Tracks save name and timestamp for user-friendly display.
 */
export interface SaveSlot {
  name: string;                      // User-defined save name
  timestamp: string | null;          // ISO 8601 timestamp of last save
  data: SaveData | null;             // Actual save data (null if empty slot)
}
