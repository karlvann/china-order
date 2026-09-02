/**
 * Central export point for utility functions
 */

export {
  createEmptySpringInventory,
  createEmptyComponentInventory,
  createEmptyLatexInventory
} from './inventory.js'

export {
  getCurrentMonday
} from './dates.js'

export {
  RECIPES,
  parseMattressSku,
  getSpringFirmnessType
} from './mattressSku.js'

export {
  hasSpringStoreSplitForSize,
  getSpringStoreSplitSizeDemand,
  getSpringStoreSplitDemandRate,
  withSpringStoreSplitDemand,
  hasLatexStoreSplitForSize,
  getLatexStoreSplitSizeDemand,
  getLatexStoreSplitDemandRate,
  withLatexStoreSplitDemand
} from './storeSplitDemand.js'

export {
  LOOKBACK_DAYS,
  CHUNK_DAYS,
  WEEK_DAYS,
  NUM_CHUNKS,
  NUM_WEEKS,
  RECENT_SPIKE_WEEKS,
  STORE_SPLIT_WEEKS,
  WEEKS_PER_CHUNK,
  LOW_SELLING_SKU_DEMAND_THRESHOLD,
  DEMAND_RATE_DECIMAL_PLACES,
  getChunkIndex,
  getCompletedWeekIndex,
  emptyChunks,
  emptyWeeks,
  recentWeeklyDemandSpike,
  trimmedWeeklyRate,
  roundDemandRate,
  calculateSkuWeeklyDemand,
  getTrimAnnotations,
  chunkLabel
} from './demandTrimming.js'
