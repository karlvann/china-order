/**
 * Type definitions for order timing calendar
 *
 * These types represent the data structures for predicting optimal order timing
 * based on inventory depletion and lead time constraints.
 */

import type { MattressSize } from './inventory';

/**
 * Urgency level for an order recommendation.
 * Determines visual styling and priority in the calendar view.
 */
export type OrderUrgency = 'comfortable' | 'plan_soon' | 'urgent';

/**
 * Inventory projection for a specific size at a point in time.
 */
export interface SizeProjection {
  size: MattressSize;
  currentStock: number;        // Total stock across all firmnesses
  projectedStock: number;       // Stock after depletion
  coverage: number;             // Months of coverage remaining
  monthlySalesRate: number;     // Sales rate (adjusted for seasonality)
}

/**
 * A recommended order date with context about why it's needed.
 */
export interface OrderRecommendation {
  monthIndex: number;           // 0-11 (0=now, 1=next month, etc)
  monthName: string;            // Human-readable month name
  urgency: OrderUrgency;        // How urgent is this order
  criticalSizes: SizeProjection[]; // Sizes driving this order recommendation
  allSizes: SizeProjection[];   // Projections for all sizes at this point
  daysUntil: number;            // Days from now until this order should be placed
  reason: string;               // Human-readable explanation
}

/**
 * Complete calendar of order recommendations for the next 12 months.
 */
export interface OrderTimingCalendar {
  recommendations: OrderRecommendation[];  // All recommended order dates
  nextOrder: OrderRecommendation | null;   // Most urgent/next order to place
  currentMonth: number;                     // Current month index (0-11)
}
