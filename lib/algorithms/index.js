/**
 * Central export point for all algorithms
 */

export { calculateCoverage } from './coverage.js'
export { findCriticalSmallSizes, findCriticalSmallSize } from './criticalSizes.js'
export { createPalletsForSize } from './palletCreation.js'
export { calculateNPlus1Order } from './nPlusOptimization.js' // OLD algorithm (kept for compatibility)
export { calculateDemandBasedOrder, demandBasedAllocation, calculateSkuMetrics } from './demandBasedOrder.js' // DEMAND-BASED algorithm with per-SKU allocation
export { calculateComponentOrder } from './componentCalc.js'
export { optimizeComponentOrder } from './exportOptimization.js'
export { generateTSV } from './tsvGeneration.js'
