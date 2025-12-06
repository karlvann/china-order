/**
 * SALES DATA
 *
 * Based on actual sales data: 960 units/year (81/month average).
 * These ratios and rates are derived from real business data.
 */

import type { MattressSize, MattressSizeConfig } from '../types';

/**
 * Mattress sizes with sales distribution.
 * Based on actual sales data (960 units/year total).
 *
 * King + Queen = 88% of sales (critical items for stockout prevention)
 */
export const MATTRESS_SIZES: MattressSizeConfig[] = [
  { id: 'King', name: 'King', ratio: 0.3688 },       // 36.88% of sales
  { id: 'Queen', name: 'Queen', ratio: 0.5115 },     // 51.15% of sales
  { id: 'Double', name: 'Double', ratio: 0.0688 },   // 6.88% of sales
  { id: 'King Single', name: 'King Single', ratio: 0.0385 },  // 3.85% of sales
  { id: 'Single', name: 'Single', ratio: 0.0125 }    // 1.25% of sales
] as const;

/**
 * Monthly sales rate by mattress size.
 * Derived from 960 units/year total sales.
 *
 * King: 30 units/month (36.88% of 81/month)
 * Queen: 41 units/month (51.15% of 81/month)
 * Together: 71 units/month (88% of business)
 */
export const MONTHLY_SALES_RATE: Record<MattressSize, number> = {
  'King': 30,
  'Queen': 41,
  'Double': 6,
  'King Single': 3,
  'Single': 1
} as const;

/**
 * Small sizes that can receive critical allocation.
 * These are the low-volume sizes that may need 0-3 pallets.
 */
export const SMALL_SIZES: MattressSize[] = ['Double', 'King Single', 'Single'] as const;

/**
 * High-velocity sizes (King and Queen).
 * These represent 88% of sales and are prioritized for stockout prevention.
 */
export const HIGH_VELOCITY_SIZES: MattressSize[] = ['King', 'Queen'] as const;

/**
 * REVENUE-BASED SCALING
 *
 * Same system as Latex Order - scales all rates based on annual revenue target.
 * Base: 960 units/year at ~$2.688M (80 units/month × 12 × $2,800 avg)
 */
export const MATTRESS_AVERAGE_PRICE = 2800;
export const WEEKS_PER_YEAR = 52;
export const BASELINE_ANNUAL_REVENUE = 2688000; // 80 units/month × 12 × $2,800
export const BASE_TOTAL_MONTHLY_SALES = 81; // Actual from 960/year

/**
 * Annual revenue options for the dropdown.
 * Range from $3M to $4.5M in $375K increments.
 */
export const ANNUAL_REVENUE_OPTIONS = [
  3000000,   // $3.0M
  3375000,   // $3.375M
  3750000,   // $3.75M
  4125000,   // $4.125M
  4500000    // $4.5M
] as const;

export const DEFAULT_ANNUAL_REVENUE = 3000000;

/**
 * Get scaled usage rates based on selected annual revenue.
 * Scales all sales rates proportionally.
 */
export function getScaledUsageRates(annualRevenue: number) {
  const scaleFactor = annualRevenue / BASELINE_ANNUAL_REVENUE;
  const weeklyRevenue = Math.round(annualRevenue / WEEKS_PER_YEAR);
  const weeklyMattresses = Math.round(weeklyRevenue / MATTRESS_AVERAGE_PRICE * 10) / 10;

  // Scale monthly sales rates
  const scaledMonthlySalesRate: Record<MattressSize, number> = {
    'King': Math.round(30 * scaleFactor * 10) / 10,
    'Queen': Math.round(41 * scaleFactor * 10) / 10,
    'Double': Math.round(6 * scaleFactor * 10) / 10,
    'King Single': Math.round(3 * scaleFactor * 10) / 10,
    'Single': Math.round(1 * scaleFactor * 10) / 10
  };

  const totalMonthlySales = Math.round(BASE_TOTAL_MONTHLY_SALES * scaleFactor * 10) / 10;

  return {
    MONTHLY_SALES_RATE: scaledMonthlySalesRate,
    TOTAL_MONTHLY_SALES: totalMonthlySales,
    weeklyRevenue,
    weeklyMattresses,
    annualRevenue,
    scaleFactor
  };
}
