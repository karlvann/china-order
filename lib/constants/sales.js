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


