/**
 * Algorithm: Order Timing Calendar
 *
 * Predicts optimal order timing for the next 12 months based on:
 * - Current inventory levels
 * - Seasonal sales patterns
 * - 10-week lead time constraint
 * - Critical coverage thresholds
 *
 * This algorithm projects inventory depletion forward and identifies
 * when orders should be placed to prevent stockouts.
 */

import type { Inventory, MattressSize } from '../types';
import type { OrderTimingCalendar, OrderRecommendation, SizeProjection, OrderUrgency } from '../types/calendar';
import { MONTHLY_SALES_RATE, MATTRESS_SIZES } from '../constants/sales';
import { FIRMNESS_TYPES } from '../constants/firmness';
import { getSeasonalMultiplier, MONTH_NAMES_FULL } from '../constants/seasonality';
import { LEAD_TIME_WEEKS } from '../constants/business';

/**
 * Critical coverage threshold (in months).
 * Order should be placed when coverage drops below this after accounting for lead time.
 * 10 weeks = 2.5 months, so we add a 1-month safety buffer = 3.5 months threshold.
 */
const ORDER_TRIGGER_THRESHOLD = 3.5;

/**
 * Comfortable coverage threshold (in months).
 * Sizes above this don't need immediate attention.
 */
const COMFORTABLE_THRESHOLD = 6;

/**
 * Calculate the order timing calendar for the next 12 months.
 *
 * @param inventory - Current warehouse inventory
 * @param currentMonthIndex - Current month (0-11, default = 0 for January)
 * @returns Calendar with recommended order dates
 *
 * @example
 * ```ts
 * const calendar = calculateOrderTimingCalendar(inventory, 0);
 * if (calendar.nextOrder) {
 *   console.log(`Next order: ${calendar.nextOrder.monthName}`);
 *   console.log(`Critical sizes: ${calendar.nextOrder.criticalSizes.map(s => s.size).join(', ')}`);
 * }
 * ```
 */
export function calculateOrderTimingCalendar(
  inventory: Inventory,
  currentMonthIndex: number = 0
): OrderTimingCalendar {
  const recommendations: OrderRecommendation[] = [];

  // Project inventory for next 12 months
  for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
    const monthIndex = (currentMonthIndex + monthOffset) % 12;
    const projections = projectInventoryAtMonth(inventory, currentMonthIndex, monthOffset);

    // Check if any sizes are critical
    const criticalSizes = projections.filter(p => p.coverage < ORDER_TRIGGER_THRESHOLD);

    if (criticalSizes.length > 0) {
      const urgency = determineUrgency(criticalSizes, monthOffset);
      const reason = generateReason(criticalSizes, monthOffset);

      recommendations.push({
        monthIndex: monthOffset,
        monthName: MONTH_NAMES_FULL[monthIndex],
        urgency,
        criticalSizes,
        allSizes: projections,
        daysUntil: monthOffset * 30, // Approximate days
        reason
      });
    }
  }

  // Find the next order (first recommendation with monthOffset > 0, or null if comfortable for 12 months)
  const nextOrder = recommendations.find(r => r.monthIndex > 0) || recommendations[0] || null;

  return {
    recommendations,
    nextOrder,
    currentMonth: currentMonthIndex
  };
}

/**
 * Project inventory levels at a specific month in the future.
 *
 * @param inventory - Current inventory
 * @param currentMonth - Current month index (0-11)
 * @param monthOffset - Months from now (0 = current month)
 * @returns Projected stock levels for all sizes
 */
function projectInventoryAtMonth(
  inventory: Inventory,
  currentMonth: number,
  monthOffset: number
): SizeProjection[] {
  return MATTRESS_SIZES.map(sizeConfig => {
    const size = sizeConfig.id;

    // Calculate current total stock for this size
    const currentStock = FIRMNESS_TYPES.reduce(
      (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
      0
    );

    // Calculate depletion over the months
    let projectedStock = currentStock;
    for (let i = 0; i < monthOffset; i++) {
      const month = (currentMonth + i) % 12;
      const seasonalMultiplier = getSeasonalMultiplier(month);
      const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier;
      projectedStock -= monthlySales;
    }

    // Calculate coverage at this point
    const month = (currentMonth + monthOffset) % 12;
    const seasonalMultiplier = getSeasonalMultiplier(month);
    const adjustedSalesRate = MONTHLY_SALES_RATE[size] * seasonalMultiplier;
    const coverage = adjustedSalesRate > 0 ? projectedStock / adjustedSalesRate : Infinity;

    return {
      size,
      currentStock,
      projectedStock: Math.max(0, projectedStock), // Can't go negative
      coverage: Math.max(0, coverage),
      monthlySalesRate: adjustedSalesRate
    };
  });
}

/**
 * Determine urgency level based on critical sizes and timing.
 *
 * @param criticalSizes - Sizes with low coverage
 * @param monthOffset - How many months from now
 * @returns Urgency level
 */
function determineUrgency(criticalSizes: SizeProjection[], monthOffset: number): OrderUrgency {
  // Check if King or Queen are critical (88% of business)
  const highVelocityCritical = criticalSizes.some(s => s.size === 'King' || s.size === 'Queen');

  // Immediate urgency (order now or very soon)
  if (monthOffset <= 1 && highVelocityCritical) {
    return 'urgent';
  }

  // Plan soon (1-3 months out, or King/Queen affected)
  if (monthOffset <= 3 || highVelocityCritical) {
    return 'plan_soon';
  }

  // Comfortable (plenty of time to plan)
  return 'comfortable';
}

/**
 * Generate human-readable reason for order recommendation.
 *
 * @param criticalSizes - Sizes driving the recommendation
 * @param monthOffset - Months from now
 * @returns Explanation string
 */
function generateReason(criticalSizes: SizeProjection[], monthOffset: number): string {
  const sizeNames = criticalSizes
    .sort((a, b) => a.coverage - b.coverage) // Most critical first
    .slice(0, 3) // Top 3
    .map(s => s.size);

  const leadTimeMonths = LEAD_TIME_WEEKS / 4; // 2.5 months
  const stockoutMonth = monthOffset + leadTimeMonths;

  if (sizeNames.length === 1) {
    return `${sizeNames[0]} will reach critical levels in ~${Math.round(stockoutMonth)} months (after lead time)`;
  } else if (sizeNames.length === 2) {
    return `${sizeNames[0]} and ${sizeNames[1]} will reach critical levels in ~${Math.round(stockoutMonth)} months`;
  } else {
    return `${sizeNames[0]}, ${sizeNames[1]}, and ${sizeNames.length - 2} other size${sizeNames.length - 2 > 1 ? 's' : ''} will reach critical levels`;
  }
}
