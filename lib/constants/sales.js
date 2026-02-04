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
 * @deprecated Use live data from settingsStore.liveSalesRates.WEEKLY_SALES_RATE instead.
 *
 * This hardcoded fallback is only used by legacy algorithm files.
 * The main algorithm (demandBasedOrder.js) uses live Directus data.
 */
export const WEEKLY_SALES_RATE = {
  'King': 7,
  'Queen': 9.5,
  'Double': 1.4,
  'King Single': 0.7,
  'Single': 0.2
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

