/**
 * Stockout-robust weekly demand calculation.
 *
 * Buckets sales into 6 chunks of 2 weeks (12 weeks total). Each chunk's value
 * is the total demand observed in that 2-week window. To compute a weekly rate
 * resistant to both stockout-suppressed weeks and post-restock recovery spikes,
 * drop the single lowest chunk and the single highest chunk, then average the
 * remaining 4. The lowest typically captures a stockout dip; the highest typically
 * captures a 1-2 week post-restock recovery spike.
 */

export const LOOKBACK_DAYS = 84 // 12 weeks
export const CHUNK_DAYS = 14 // 2-week chunks
export const NUM_CHUNKS = 6
export const WEEKS_PER_CHUNK = CHUNK_DAYS / 7

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

export function trimmedWeeklyRate(chunkCounts) {
  const indexed = chunkCounts.map((value, index) => ({ value, index }))
  const byValueAsc = [...indexed].sort((a, b) => a.value - b.value)
  const lowest = byValueAsc[0]
  const highest = byValueAsc[byValueAsc.length - 1]

  const dropIndices = new Set([lowest.index, highest.index])
  const kept = indexed.filter(c => !dropIndices.has(c.index))
  if (kept.length === 0) return 0
  const avg = kept.reduce((s, c) => s + c.value, 0) / kept.length
  return avg / WEEKS_PER_CHUNK
}

// Returns which chunks trimmedWeeklyRate would drop, split by reason.
export function getTrimAnnotations(chunkCounts) {
  const indexed = chunkCounts.map((value, index) => ({ value, index }))
  const byValueAsc = [...indexed].sort((a, b) => a.value - b.value)
  return {
    low: byValueAsc[0].index,
    high: byValueAsc[byValueAsc.length - 1].index
  }
}

// Human-readable label for a chunk index ("0-2w ago", "10-12w ago").
export function chunkLabel(index) {
  return `${index * 2}-${index * 2 + 2}w ago`
}
