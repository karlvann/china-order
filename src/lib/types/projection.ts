/**
 * Type definitions for multi-container annual projection
 *
 * These types represent a year-long simulation of inventory depletion
 * with multiple container orders scheduled to prevent stockouts.
 */

import type { Inventory, MattressSize } from './inventory';
import type { SpringOrder, ComponentOrder } from './order';
import type { OrderUrgency } from './calendar';

/**
 * A snapshot of inventory at a specific point in time.
 */
export interface InventorySnapshot {
  month: number;              // Month index (0-11)
  monthName: string;          // Human-readable month name
  inventory: Inventory;       // Full inventory state at this point
  coverage: Record<MattressSize, number>; // Coverage in months for each size
  criticalSizes: MattressSize[]; // Sizes below critical threshold
}

/**
 * A container order scheduled in the annual plan.
 */
export interface ContainerOrder {
  id: string;                 // Unique identifier (e.g., "order-1")
  orderMonth: number;         // When to place order (0-11)
  orderMonthName: string;     // Human-readable order month
  arrivalMonth: number;       // When container arrives (decimal: 2.5 = mid-month)
  arrivalMonthName: string;   // Human-readable arrival month
  palletCount: number;        // Number of pallets (4-12)
  springOrder: SpringOrder;   // What springs are in this container
  componentOrder: ComponentOrder; // What components are in this container
  reason: string;             // Why this order is needed
  urgency: OrderUrgency;      // Urgency level at time of order
  drivingSizes: MattressSize[]; // Sizes that triggered this order
}

/**
 * Complete annual projection with multiple container orders.
 */
export interface AnnualProjection {
  orders: ContainerOrder[];           // All scheduled container orders
  snapshots: InventorySnapshot[];     // Monthly inventory snapshots (0-11)
  totalContainers: number;            // Total number of containers in year
  totalPallets: number;               // Total pallets ordered
  totalSprings: number;               // Total springs ordered
  hasStockout: boolean;               // True if any size hits zero at any point
  stockoutMonths: number[];           // Months where stockouts occur
}
