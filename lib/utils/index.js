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
  LOOKBACK_DAYS,
  CHUNK_DAYS,
  NUM_CHUNKS,
  WEEKS_PER_CHUNK,
  DEMAND_RATE_DECIMAL_PLACES,
  getChunkIndex,
  emptyChunks,
  trimmedWeeklyRate,
  roundDemandRate,
  getTrimAnnotations,
  chunkLabel
} from './demandTrimming.js'
