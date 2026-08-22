/**
 * Stockout-robust weekly demand calculation.
 *
 * Buckets sales into 6 chunks of 2 weeks (12 weeks total). Each chunk's value
 * is the total demand observed in that 2-week window. To compute a weekly rate
 * resistant to both stockout-suppressed weeks and post-restock recovery spikes:
 *
 *   - For sparse demand, use the raw 12-week average. Trimming is not reliable
 *     when demand appears in only 1-2 chunks.
 *   - Otherwise, drop the lowest chunk.
 *   - ALSO drop the second-lowest chunk ONLY if its 2-week period is adjacent
 *     in time to the lowest chunk's period (a real ~3-week stockout spans two
 *     consecutive chunks). Scattered low chunks are normal weekly variance.
 *   - Always drop the single highest chunk (1-2 week post-restock spike).
 *
 * Then average the remaining 3 or 4 chunks and divide by weeks-per-chunk.
 *
 * Note: "adjacent" means consecutive in TIME (chunk indices differ by 1),
 * not consecutive in the sorted-by-value list.
 */

export const LOOKBACK_DAYS = 84 // 12 weeks
export const CHUNK_DAYS = 14 // 2-week chunks
export const NUM_CHUNKS = 6
export const WEEKS_PER_CHUNK = CHUNK_DAYS / 7
export const MIN_NON_ZERO_CHUNKS_FOR_TRIM = 3
export const LOW_SELLING_SKU_DEMAND_THRESHOLD = 1.75
export const DEMAND_RATE_DECIMAL_PLACES = 3
export const DEMAND_RATE_ROUNDING_FACTOR = 10 ** DEMAND_RATE_DECIMAL_PLACES

// Chunk index for a sale date: 0 = most recent 2 weeks, NUM_CHUNKS-1 = oldest.
// Returns -1 if the sale falls outside the lookback window.
export function getChunkIndex(saleDate, referenceTime) {
  const daysAgo = Math.floor((referenceTime - new Date(saleDate).getTime()) / 86400000)
  if (daysAgo < 0 || daysAgo >= LOOKBACK_DAYS) return -1
  return Math.floor(daysAgo / CHUNK_DAYS)
}

export function emptyChunks() {
  return Array.from({ length: NUM_CHUNKS }, () => 0)
}

export function roundDemandRate(rate) {
  return Math.round(rate * DEMAND_RATE_ROUNDING_FACTOR) / DEMAND_RATE_ROUNDING_FACTOR
}

export const calculateSkuWeeklyDemand = (sizeWeeklyRate, firmnessRatio, rawSkuWeeklyDemand = 0) => {
  const normalWeeklyDemand = (sizeWeeklyRate || 0) * (firmnessRatio || 0)

  if (normalWeeklyDemand < LOW_SELLING_SKU_DEMAND_THRESHOLD) {
    return Math.max(normalWeeklyDemand, rawSkuWeeklyDemand || 0)
  }

  return normalWeeklyDemand
}

export function trimmedWeeklyRate(chunkCounts) {
  const { lows, high, strategy } = getTrimAnnotations(chunkCounts)

  if (strategy === 'raw-average') {
    const total = chunkCounts.reduce((sum, value) => sum + value, 0)
    return total / (NUM_CHUNKS * WEEKS_PER_CHUNK)
  }

  const dropIndices = new Set([...lows, high])
  const kept = chunkCounts
    .map((value, index) => ({ value, index }))
    .filter(c => !dropIndices.has(c.index))
  if (kept.length === 0) return 0
  const avg = kept.reduce((s, c) => s + c.value, 0) / kept.length
  return avg / WEEKS_PER_CHUNK
}

// Returns which chunks trimmedWeeklyRate would drop, split by reason.
// `lows` is 1 or 2 chunk indices (1 if the two lowest chunks aren't time-adjacent).
// Sparse demand uses raw averaging because high/low trimming is not statistically useful.
export function getTrimAnnotations(chunkCounts) {
  const nonZeroChunks = chunkCounts.filter(value => value > 0).length

  if (nonZeroChunks > 0 && nonZeroChunks < MIN_NON_ZERO_CHUNKS_FOR_TRIM) {
    return {
      lows: [],
      high: null,
      strategy: 'raw-average',
      reason: 'sparse demand'
    }
  }

  const indexed = chunkCounts.map((value, index) => ({ value, index }))
  const byValueAsc = [...indexed].sort((a, b) => a.value - b.value)
  const lowestChunk = byValueAsc[0]
  const secondLowestChunk = byValueAsc[1]
  const highestChunk = byValueAsc[byValueAsc.length - 1]

  // Time-adjacent means the two lowest-by-value chunks are consecutive
  // 2-week periods (their original time indices differ by 1).
  const lowsAreTimeAdjacent =
    Math.abs(lowestChunk.index - secondLowestChunk.index) === 1

  const lows = lowsAreTimeAdjacent
    ? [lowestChunk.index, secondLowestChunk.index].sort((a, b) => a - b)
    : [lowestChunk.index]

  return {
    lows,
    high: highestChunk.index,
    strategy: 'trimmed-mean',
    reason: null
  }
}

// Human-readable label for a chunk index ("0-2w ago", "10-12w ago").
export function chunkLabel(index) {
  return `${index * 2}-${index * 2 + 2}w ago`
}
