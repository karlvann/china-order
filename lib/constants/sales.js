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
 * King + Queen = approximately 78% of sales (critical items for stockout prevention)
 */
export const MATTRESS_SIZES = [
  { id: 'King', name: 'King', ratio: 0.30 },      // 30% of sales
  { id: 'Queen', name: 'Queen', ratio: 0.48 },     // 48% of sales
  { id: 'Double', name: 'Double', ratio: 0.13 },   // 13% of sales
  { id: 'King Single', name: 'King Single', ratio: 0.05 },  // 5% of sales
  { id: 'Single', name: 'Single', ratio: 0.03 }    // 3% of sales
]


