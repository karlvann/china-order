/**
 * Type definitions for inventory management
 *
 * These types represent the core data structures used throughout
 * the China Order System for tracking mattress springs and components.
 */

/**
 * Mattress sizes sold by the business.
 * Based on actual sales data (960 units/year total).
 */
export type MattressSize = 'King' | 'Queen' | 'Double' | 'King Single' | 'Single';

/**
 * Firmness levels for mattress springs.
 * Distribution varies by mattress size (see FIRMNESS_DISTRIBUTION constant).
 */
export type FirmnessType = 'firm' | 'medium' | 'soft';

/**
 * Record of inventory quantities by mattress size.
 * Used for tracking stock levels across all sizes.
 */
export type SizeInventoryRecord = Record<MattressSize, number>;

/**
 * Spring inventory organized by firmness type.
 * Each firmness type contains quantities for all mattress sizes.
 *
 * Example:
 * ```
 * springs.firm.King = 50  // 50 King Firm springs in stock
 * springs.medium.Queen = 100  // 100 Queen Medium springs in stock
 * ```
 */
export interface SpringInventory {
  firm: SizeInventoryRecord;
  medium: SizeInventoryRecord;
  soft: SizeInventoryRecord;
}

/**
 * Component inventory organized by component type ID.
 * Each component type contains quantities for all mattress sizes.
 *
 * Component IDs: 'micro_coils', 'thin_latex', 'felt',
 *                'top_panel', 'bottom_panel', 'side_panel'
 */
export type ComponentInventory = Record<string, SizeInventoryRecord>;

/**
 * Complete inventory state for the warehouse.
 * Includes both springs (by firmness/size) and components (by type/size).
 */
export interface Inventory {
  springs: SpringInventory;
  components: ComponentInventory;
}

/**
 * Mattress size configuration with sales data.
 * Used for defining size ratios and monthly sales rates.
 */
export interface MattressSizeConfig {
  id: MattressSize;
  name: string;
  ratio: number;  // Percentage of total sales (0-1)
}

/**
 * Component type configuration with ordering details.
 * Defines how components are ordered relative to springs.
 */
export interface ComponentType {
  id: string;
  name: string;
  multiplier: number;  // Units per spring (e.g., 1.5 = 150% of spring quantity)
  lotSize: number;     // Supplier lot size (10 or 20 units)
}
