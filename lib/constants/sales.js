/**
 * SALES DATA
 *
 * Based on actual sales data: 960 units/year (81/month average).
 * These ratios and rates are derived from real business data.
 */

/**
 * Mattress sizes with sales distribution.
 * Based on actual sales data (960 units/year total).
 *
 * King + Queen = 88% of sales (critical items for stockout prevention)
 */
export const MATTRESS_SIZES = [
  { id: 'King', name: 'King', ratio: 0.3688 },       // 36.88% of sales
  { id: 'Queen', name: 'Queen', ratio: 0.5115 },     // 51.15% of sales
  { id: 'Double', name: 'Double', ratio: 0.0688 },   // 6.88% of sales
  { id: 'King Single', name: 'King Single', ratio: 0.0385 },  // 3.85% of sales
  { id: 'Single', name: 'Single', ratio: 0.0125 }    // 1.25% of sales
]

/**
 * Monthly sales rate by mattress size.
 * Derived from 960 units/year total sales.
 *
 * King: 30 units/month (36.88% of 81/month)
 * Queen: 41 units/month (51.15% of 81/month)
 * Together: 71 units/month (88% of business)
 */
export const MONTHLY_SALES_RATE = {
  'King': 30,
  'Queen': 41,
  'Double': 6,
  'King Single': 3,
  'Single': 1
}

/**
 * Small sizes that can receive critical allocation.
 * These are the low-volume sizes that may need 0-3 pallets.
 */
export const SMALL_SIZES = ['Double', 'King Single', 'Single']

/**
 * High-velocity sizes (King and Queen).
 * These represent 88% of sales and are prioritized for stockout prevention.
 */
export const HIGH_VELOCITY_SIZES = ['King', 'Queen']

