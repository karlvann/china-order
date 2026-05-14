/**
 * Composable for fetching and analyzing weekly sales data from Directus.
 * Uses chunked trimmed-mean rate calculation — see lib/utils/demandTrimming.js.
 */

import {
  LOOKBACK_DAYS,
  getChunkIndex,
  emptyChunks,
  trimmedWeeklyRate,
  getTrimAnnotations,
  chunkLabel
} from '~/lib/utils/demandTrimming.js'

const MATTRESS_RANGES = ['cooper', 'cloud', 'aurora']

// Size mapping from SKU suffix to standard size names
// Order matters! Check longer matches first (kingsingle before single, king before checking others)
const SIZE_MAP_ORDERED = [
  { key: 'kingsingle', value: 'King Single' },
  { key: 'single', value: 'Single' },
  { key: 'double', value: 'Double' },
  { key: 'queen', value: 'Queen' },
  { key: 'king', value: 'King' }
]

// Firmness level to spring type mapping
// 2-4 = Soft, 5-10 = Medium, 11+ = Firm
function getFirmnessType(level) {
  const num = parseInt(level, 10)
  if (num >= 2 && num <= 4) return 'soft'
  if (num >= 5 && num <= 10) return 'medium'
  if (num >= 11) return 'firm'
  return null
}

// Parse a mattress SKU to extract range, firmness level, and size
// Format: range[cooper|cloud|aurora] + firmnessLevel[2-16] + size[single|kingsingle|double|queen|king]
function parseMattressSku(sku) {
  if (!sku || typeof sku !== 'string') return null

  const lowerSku = sku.toLowerCase()

  // Check if it's a mattress SKU (starts with a valid range)
  const range = MATTRESS_RANGES.find(r => lowerSku.startsWith(r))
  if (!range) return null

  // Remove the range prefix
  const remainder = lowerSku.slice(range.length)

  // Find the size suffix (check longer matches first due to ordered array)
  let size = null
  let sizeKey = null
  for (const { key, value } of SIZE_MAP_ORDERED) {
    if (remainder.endsWith(key)) {
      size = value
      sizeKey = key
      break
    }
  }
  if (!size) return null

  // Extract firmness level (what's between range and size)
  const firmnessStr = remainder.slice(0, remainder.length - sizeKey.length)
  const firmnessLevel = parseInt(firmnessStr, 10)
  if (isNaN(firmnessLevel) || firmnessLevel < 2 || firmnessLevel > 16) return null

  const firmnessType = getFirmnessType(firmnessLevel)
  if (!firmnessType) return null

  return {
    range,
    firmnessLevel,
    firmnessType,
    size
  }
}

export function useWeeklySales() {
  const { getItems } = useDirectusItems()
  const settingsStore = useSettingsStore()

  const loading = ref(true)
  const error = ref(null)

  // Raw sales data
  const salesData = ref([])

  // Aggregated demand by size and firmness
  const demandBySize = ref({
    King: { firm: 0, medium: 0, soft: 0, total: 0 },
    Queen: { firm: 0, medium: 0, soft: 0, total: 0 },
    Double: { firm: 0, medium: 0, soft: 0, total: 0 },
    'King Single': { firm: 0, medium: 0, soft: 0, total: 0 },
    Single: { firm: 0, medium: 0, soft: 0, total: 0 }
  })

  // Weekly averages
  const weeklyRates = ref({
    King: { firm: 0, medium: 0, soft: 0, total: 0 },
    Queen: { firm: 0, medium: 0, soft: 0, total: 0 },
    Double: { firm: 0, medium: 0, soft: 0, total: 0 },
    'King Single': { firm: 0, medium: 0, soft: 0, total: 0 },
    Single: { firm: 0, medium: 0, soft: 0, total: 0 }
  })


  // Firmness distribution percentages by size
  const firmnessDistribution = ref({
    King: { firm: 0, medium: 0, soft: 0 },
    Queen: { firm: 0, medium: 0, soft: 0 },
    Double: { firm: 0, medium: 0, soft: 0 },
    'King Single': { firm: 0, medium: 0, soft: 0 },
    Single: { firm: 0, medium: 0, soft: 0 }
  })

  // Model (range) distribution by size - needed for accurate component demand
  // Cloud uses 2 micros, Aurora uses 1, Cooper uses 0
  const modelDistribution = ref({
    King: { cloud: 0, aurora: 0, cooper: 0 },
    Queen: { cloud: 0, aurora: 0, cooper: 0 },
    Double: { cloud: 0, aurora: 0, cooper: 0 },
    'King Single': { cloud: 0, aurora: 0, cooper: 0 },
    Single: { cloud: 0, aurora: 0, cooper: 0 }
  })

  // Direct micro coil demand by inventory SKU (King or Queen)
  // Calculated from actual Cloud/Aurora/Cooper sales
  const microCoilDemand = ref({ King: 0, Queen: 0 })
  const thinLatexDemand = ref({ King: 0, Queen: 0 })

  const totalSales = ref(0)
  const dateRange = ref({ start: null, end: null })

  async function fetchSalesData() {
    loading.value = true
    error.value = null

    try {
      const endDate = new Date()
      const referenceTime = endDate.getTime()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - LOOKBACK_DAYS)

      dateRange.value = {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }

      // Fetch orders with SKUs from Directus
      const response = await getItems({
        collection: 'orders',
        params: {
          filter: {
            date_created: {
              _gte: startDate.toISOString()
            },
            payment_status: {
              _eq: 'paid'
            },
            order_type: {
              _eq: 'sale'
            }
          },
          fields: [
            'id',
            'date_created',
            'skus.skus_id.sku'
          ],
          limit: -1 // Get all matching orders
        }
      })

      // Handle both direct array and { data: [] } response formats
      const orders = Array.isArray(response) ? response : (response?.data || [])

      // Process orders to extract mattress sales
      const sales = []

      for (const order of orders) {
        if (!order.skus) continue

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const parsed = parseMattressSku(sku)
          if (parsed) {
            sales.push({
              orderId: order.id,
              dateCreated: order.date_created,
              sku,
              ...parsed
            })
          }
        }
      }

      salesData.value = sales
      totalSales.value = sales.length

      const emptyDemand = () => ({
        King: { firm: 0, medium: 0, soft: 0, total: 0 },
        Queen: { firm: 0, medium: 0, soft: 0, total: 0 },
        Double: { firm: 0, medium: 0, soft: 0, total: 0 },
        'King Single': { firm: 0, medium: 0, soft: 0, total: 0 },
        Single: { firm: 0, medium: 0, soft: 0, total: 0 }
      })

      const emptyModelCounts = () => ({
        King: { cloud: 0, aurora: 0, cooper: 0 },
        Queen: { cloud: 0, aurora: 0, cooper: 0 },
        Double: { cloud: 0, aurora: 0, cooper: 0 },
        'King Single': { cloud: 0, aurora: 0, cooper: 0 },
        Single: { cloud: 0, aurora: 0, cooper: 0 }
      })

      // Full-window totals (used for firmness + model distribution percentages)
      const demandTotal = emptyDemand()
      const modelCountsTotal = emptyModelCounts()

      // Per-chunk counts drive the trimmed weekly rate calculation
      const chunked = {}
      for (const size of Object.keys(demandTotal)) {
        chunked[size] = {
          firm: emptyChunks(),
          medium: emptyChunks(),
          soft: emptyChunks(),
          total: emptyChunks()
        }
      }
      const chunkedMicroKing = emptyChunks()
      const chunkedMicroQueen = emptyChunks()

      for (const sale of sales) {
        const idx = getChunkIndex(sale.dateCreated, referenceTime)
        if (idx < 0) continue

        if (demandTotal[sale.size]) {
          demandTotal[sale.size][sale.firmnessType]++
          demandTotal[sale.size].total++
          if (modelCountsTotal[sale.size] && sale.range) {
            modelCountsTotal[sale.size][sale.range]++
          }
        }

        if (chunked[sale.size]) {
          chunked[sale.size][sale.firmnessType][idx]++
          chunked[sale.size].total[idx]++
        }

        // Micro coil / thin latex layers: Cloud=2, Aurora=1, Cooper=0
        const layers = sale.range === 'cloud' ? 2 : sale.range === 'aurora' ? 1 : 0
        if (layers > 0) {
          if (sale.size === 'King') {
            chunkedMicroKing[idx] += layers
          } else if (sale.size === 'Single') {
            chunkedMicroKing[idx] += layers * 0.5
          } else {
            chunkedMicroQueen[idx] += layers
          }
        }
      }

      demandBySize.value = demandTotal
      modelDistribution.value = modelCountsTotal

      microCoilDemand.value = {
        King: Math.round(trimmedWeeklyRate(chunkedMicroKing) * 10) / 10,
        Queen: Math.round(trimmedWeeklyRate(chunkedMicroQueen) * 10) / 10
      }
      thinLatexDemand.value = { ...microCoilDemand.value }

      const weekly = {}
      for (const size of Object.keys(demandTotal)) {
        weekly[size] = {}
        for (const key of ['firm', 'medium', 'soft', 'total']) {
          weekly[size][key] = Math.round(trimmedWeeklyRate(chunked[size][key]) * 10) / 10
        }
      }
      weeklyRates.value = weekly

      // Per-metric trim summary so the rate can be audited.
      const logTrim = (label, counts, rate) => {
        const { lows, high, strategy, reason } = getTrimAnnotations(counts)
        const lowSet = new Set(lows)
        const suffix = strategy === 'raw-average' ? ` (${reason})` : ''
        console.log(`[Sales] ${label} → ${rate}/w${suffix}`)
        counts.forEach((v, i) => {
          let marker = ''
          if (lowSet.has(i)) marker = ' (low ✗)'
          else if (high !== null && i === high) marker = ' (high ✗)'
          console.log(`  ${chunkLabel(i)}: ${v}${marker}`)
        })
        console.log('')
      }
      for (const size of Object.keys(demandTotal)) {
        logTrim(size, chunked[size].total, weekly[size].total)
      }
      logTrim('Micro King', chunkedMicroKing, microCoilDemand.value.King)
      logTrim('Micro Queen', chunkedMicroQueen, microCoilDemand.value.Queen)

      // Firmness distribution from 12-week window (larger sample = more stable)
      const distribution = {}
      for (const size of Object.keys(demandTotal)) {
        const total = demandTotal[size].total
        if (total > 0) {
          distribution[size] = {
            firm: Math.round((demandTotal[size].firm / total) * 100),
            medium: Math.round((demandTotal[size].medium / total) * 100),
            soft: Math.round((demandTotal[size].soft / total) * 100)
          }
        } else {
          distribution[size] = { firm: 0, medium: 0, soft: 0 }
        }
      }
      firmnessDistribution.value = distribution

      // Build weekly totals for the store
      const weeklyTotals = {}
      for (const size of Object.keys(weekly)) {
        weeklyTotals[size] = weekly[size].total
      }

      // Update settings store with live data
      settingsStore.setLiveSalesRates(weeklyTotals, distribution, microCoilDemand.value, thinLatexDemand.value)

    } catch (e) {
      error.value = e.message
      console.error('Failed to fetch sales data:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch on mount
  onMounted(fetchSalesData)

  return {
    loading: readonly(loading),
    error: readonly(error),
    salesData: readonly(salesData),
    demandBySize: readonly(demandBySize),
    weeklyRates: readonly(weeklyRates),
    firmnessDistribution: readonly(firmnessDistribution),
    modelDistribution: readonly(modelDistribution),
    microCoilDemand: readonly(microCoilDemand),
    thinLatexDemand: readonly(thinLatexDemand),
    totalSales: readonly(totalSales),
    dateRange: readonly(dateRange),
    refresh: fetchSalesData
  }
}

// Export parser for testing
export { parseMattressSku, getFirmnessType }
