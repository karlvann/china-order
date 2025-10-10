/**
 * Type definitions for order management
 *
 * These types represent pallets, spring orders, and order metadata
 * used in the N+1/N+2 optimization algorithm.
 */

import type { MattressSize, FirmnessType, SpringInventory } from './inventory';

/**
 * Pallet type classification.
 *
 * - Pure: Contains single firmness only (most efficient)
 * - Mixed: Contains multiple firmnesses (when quantities don't fill full pallets)
 * - Critical: Allocated to small sizes with low coverage (<4 months)
 */
export type PalletType = 'Pure' | 'Mixed' | 'Critical';

/**
 * Breakdown of springs by firmness within a single pallet.
 *
 * Example:
 * ```
 * { firm: 10, medium: 20 }  // Mixed pallet with 10 firm + 20 medium springs
 * { medium: 30 }             // Pure pallet with 30 medium springs
 * ```
 */
export type FirmnessBreakdown = Partial<Record<FirmnessType, number>>;

/**
 * A single pallet in a container order.
 * Each pallet contains exactly 30 springs (FIXED CONSTRAINT).
 *
 * Pallets can be "pure" (single firmness) or "mixed" (multiple firmnesses).
 */
export interface Pallet {
  id: number;                        // Unique pallet identifier (1-12)
  size: MattressSize;                // Mattress size (all springs in pallet are same size)
  type: PalletType;                  // Classification (Pure/Mixed/Critical)
  firmness_breakdown: FirmnessBreakdown;  // Distribution of firmnesses in this pallet
  total: number;                     // Total springs (must equal 30)
}

/**
 * Metadata about a container order.
 * Provides summary statistics and allocation details.
 */
export interface OrderMetadata {
  total_pallets: number;             // Number of pallets in container (4-12)
  total_springs: number;             // Total springs ordered (should be total_pallets * 30)
  pure_pallets: number;              // Count of pure pallets (efficiency metric)
  mixed_pallets: number;             // Count of mixed pallets
  critical_sizes: MattressSize[];    // Small sizes that received pallets (0-3)
  small_size_pallets: number;        // Number of pallets allocated to small sizes (0-3)
  king_pallets: number;              // Pallets allocated to King
  queen_pallets: number;             // Pallets allocated to Queen
}

/**
 * Complete spring order for a container.
 * Result of running the N+1/N+2 optimization algorithm.
 *
 * Contains:
 * - Spring quantities by firmness/size
 * - Pallet breakdown (individual pallet details)
 * - Metadata (summary statistics)
 */
export interface SpringOrder {
  springs: SpringInventory;          // Total spring quantities to order
  pallets: Pallet[];                 // Individual pallet breakdown
  metadata: OrderMetadata;           // Order summary and statistics
}

/**
 * Size with coverage information.
 * Used by critical size detection algorithm.
 */
export interface SizeCoverage {
  size: MattressSize;
  totalCoverage: number;             // Months of coverage for all firmnesses
  mediumCoverage: number;            // Months of coverage for medium firmness only
}
