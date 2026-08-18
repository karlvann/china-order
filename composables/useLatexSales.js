/**
 * Composable for fetching and analyzing latex demand from sales data.
 * Uses chunked trimmed-mean rate calculation — see lib/utils/demandTrimming.js.
 *
 * Key business rules:
 * - Cooper mattresses use polyfoam, NOT latex (excluded from calculations)
 * - Cloud and Aurora mattresses use latex
 * - Size mapping: King/Single → King latex, Queen/Double/King Single → Queen latex
 * - Single deducts 0.5 from King inventory (one King sheet makes two Singles)
 * - Pillow latex demand comes from exact pillowlatexthin/pillowlatexthick SKU sales
 */

import {
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  MATTRESS_TO_LATEX_MAP,
  LATEX_FIRMNESS_LEVEL_RANGES,
  PILLOW_LATEX_SKUS,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'
import {
  LOOKBACK_DAYS,
  getChunkIndex,
  emptyChunks,
  trimmedWeeklyRate,
  roundDemandRate,
  getTrimAnnotations,
  chunkLabel
} from '~/lib/utils/demandTrimming.js'

const PILLOW_LATEX_SKU_MAP = {
  pillowlatexthin: 'thin',
  pillowlatexthick: 'thick'
}

// Size mapping from SKU suffix - order matters (check longer matches first)
const SIZE_MAP_ORDERED = [
  { key: 'kingsingle', value: 'King Single' },
  { key: 'single', value: 'Single' },
  { key: 'double', value: 'Double' },
  { key: 'queen', value: 'Queen' },
  { key: 'king', value: 'King' }
]

/**
 * Parse mattress SKU to get latex requirements
 * Returns null for Cooper (uses polyfoam) or invalid SKUs
 */
function parseLatexSku(sku) {
  if (!sku || typeof sku !== 'string') return null

  const lowerSku = sku.toLowerCase()

  // Check if it's a mattress SKU (Cloud or Aurora only - Cooper uses polyfoam)
  const rangeMatch = lowerSku.match(/^(cloud|aurora|cooper)/)
  if (!rangeMatch) return null

  const range = rangeMatch[1]

  // Cooper uses polyfoam, not latex - exclude from calculations
  if (range === 'cooper') return null

  // Extract firmness level
  const firmnessMatch = lowerSku.match(/^(?:cloud|aurora)(\d+)/)
  if (!firmnessMatch) return null
  const firmnessLevel = parseInt(firmnessMatch[1], 10)

  // Find the size suffix (check longer matches first)
  let mattressSize = null
  for (const { key, value } of SIZE_MAP_ORDERED) {
    if (lowerSku.endsWith(key)) {
      mattressSize = value
      break
    }
  }
  if (!mattressSize) return null

  // Map firmness level to latex firmness
  let latexFirmness = null
  for (const [firmness, range] of Object.entries(LATEX_FIRMNESS_LEVEL_RANGES)) {
    if (firmnessLevel >= range.min && firmnessLevel <= range.max) {
      latexFirmness = firmness
      break
    }
  }
  if (!latexFirmness) return null

  // Map mattress size to latex size and get deduction
  const mapping = MATTRESS_TO_LATEX_MAP[mattressSize]
  if (!mapping) return null

  return {
    range,
    firmnessLevel,
    mattressSize,
    latexFirmness,
    latexSize: mapping.latexSize,
    deduction: mapping.deduction
  }
}

/**
 * Parse pillow latex SKU to get pillow latex type
 */
function parsePillowLatexSku(sku) {
  if (!sku || typeof sku !== 'string') return null

  const lowerSku = sku.toLowerCase()
  if (!PILLOW_LATEX_SKUS.includes(lowerSku)) return null

  return {
    pillowLatexType: PILLOW_LATEX_SKU_MAP[lowerSku],
    deduction: 1
  }
}

/**
 * Create empty demand structure
 */
function createEmptyDemand() {
  const demand = {}
  for (const firmness of LATEX_FIRMNESSES) {
    demand[firmness] = {}
    for (const size of LATEX_SIZES) {
      demand[firmness][size] = 0
    }
  }
  return demand
}

function createEmptyPillowLatexDemand() {
  const demand = {}
  for (const type of PILLOW_LATEX_TYPES) {
    demand[type] = 0
  }
  return demand
}

export function useLatexSales() {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()
  const sriLankaSettingsStore = useSriLankaSettingsStore()

  const loading = ref(true)
  const error = ref(null)

  // Raw sales data
  const salesData = ref([])

  // Aggregated demand by firmness and latex size
  const demandByFirmnessSize = ref(createEmptyDemand())

  // Weekly averages by firmness and size
  const weeklyRates = ref(createEmptyDemand())

  // Total weekly demand per size (all firmnesses combined)
  const weeklyTotalBySize = ref({ King: 0, Queen: 0 })

  // Pillow latex weekly demand
  const pillowLatexWeeklyRates = ref(createEmptyPillowLatexDemand())

  // Firmness distribution percentages per size
  const firmnessDistribution = ref({
    King: { firm: 0, medium: 0, soft: 0 },
    Queen: { firm: 0, medium: 0, soft: 0 }
  })

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
            'skus.quantity',
            'skus.skus_id.sku'
          ],
          limit: -1
        }
      })

      // Handle both direct array and { data: [] } response formats
      const orders = Array.isArray(response) ? response : (response?.data || [])

      // Process orders to extract latex demand
      const sales = []

      for (const order of orders) {
        if (!order.skus) continue

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const quantity = parseInt(skuRelation.quantity, 10) || 1
          const parsed = parseLatexSku(sku)
          if (parsed) {
            sales.push({
              type: 'mattress_latex',
              orderId: order.id,
              dateCreated: order.date_created,
              sku,
              quantity,
              ...parsed
            })
            continue
          }

          const parsedPillowLatex = parsePillowLatexSku(sku)
          if (parsedPillowLatex) {
            sales.push({
              type: 'pillow_latex',
              orderId: order.id,
              dateCreated: order.date_created,
              sku,
              quantity,
              ...parsedPillowLatex
            })
          }
        }
      }

      salesData.value = sales
      totalSales.value = sales.reduce((sum, sale) => sum + sale.quantity, 0)

      // Full-window totals drive the firmness distribution percentages
      const demandTotal = createEmptyDemand()
      const pillowDemandTotal = createEmptyPillowLatexDemand()

      // Per-chunk amounts drive the trimmed weekly rate
      const chunked = {}
      for (const firmness of LATEX_FIRMNESSES) {
        chunked[firmness] = {}
        for (const size of LATEX_SIZES) {
          chunked[firmness][size] = emptyChunks()
        }
      }
      const chunkedPillow = {}
      for (const type of PILLOW_LATEX_TYPES) {
        chunkedPillow[type] = emptyChunks()
      }

      for (const sale of sales) {
        const idx = getChunkIndex(sale.dateCreated, referenceTime)
        if (idx < 0) continue

        const amount = sale.deduction * sale.quantity
        if (sale.type === 'pillow_latex') {
          pillowDemandTotal[sale.pillowLatexType] += amount
          chunkedPillow[sale.pillowLatexType][idx] += amount
        } else {
          demandTotal[sale.latexFirmness][sale.latexSize] += amount
          chunked[sale.latexFirmness][sale.latexSize][idx] += amount
        }
      }

      demandByFirmnessSize.value = demandTotal

      const weekly = createEmptyDemand()
      const totals = { King: 0, Queen: 0 }

      for (const firmness of LATEX_FIRMNESSES) {
        for (const size of LATEX_SIZES) {
          const rate = roundDemandRate(trimmedWeeklyRate(chunked[firmness][size]))
          weekly[firmness][size] = rate
          totals[size] += rate
        }
      }

      const pillowWeekly = createEmptyPillowLatexDemand()
      for (const type of PILLOW_LATEX_TYPES) {
        pillowWeekly[type] = roundDemandRate(trimmedWeeklyRate(chunkedPillow[type]))
      }

      weeklyRates.value = weekly
      weeklyTotalBySize.value = {
        King: roundDemandRate(totals.King),
        Queen: roundDemandRate(totals.Queen)
      }
      pillowLatexWeeklyRates.value = pillowWeekly

      // Firmness distribution from 12-week window (larger sample = more stable)
      const distribution = {
        King: { firm: 0, medium: 0, soft: 0 },
        Queen: { firm: 0, medium: 0, soft: 0 }
      }

      for (const size of LATEX_SIZES) {
        let sizeTotal = 0
        for (const firmness of LATEX_FIRMNESSES) {
          sizeTotal += demandTotal[firmness][size]
        }
        if (sizeTotal > 0) {
          for (const firmness of LATEX_FIRMNESSES) {
            distribution[size][firmness] = Math.round((demandTotal[firmness][size] / sizeTotal) * 100)
          }
        }
      }

      firmnessDistribution.value = distribution

      // Per-metric trim summary so the rate can be audited.
      const logTrim = (label, counts, rate) => {
        const { lows, high, strategy, reason } = getTrimAnnotations(counts)
        const lowSet = new Set(lows)
        const suffix = strategy === 'raw-average' ? ` (${reason})` : ''
        console.log(`[Latex] ${label} → ${rate}/w${suffix}`)
        counts.forEach((v, i) => {
          let marker = ''
          if (lowSet.has(i)) marker = ' (low ✗)'
          else if (high !== null && i === high) marker = ' (high ✗)'
          console.log(`  ${chunkLabel(i)}: ${v}${marker}`)
        })
        console.log('')
      }
      console.log(`[Latex] ${sales.length} sales from ${orders.length} orders`)
      for (const firmness of LATEX_FIRMNESSES) {
        for (const size of LATEX_SIZES) {
          logTrim(`${firmness} ${size}`, chunked[firmness][size], weekly[firmness][size])
        }
      }
      for (const type of PILLOW_LATEX_TYPES) {
        logTrim(`Pillow ${type}`, chunkedPillow[type], pillowWeekly[type])
      }

      // Update settings store with live data
      sriLankaSettingsStore.setLatexSalesRates(
        weeklyTotalBySize.value,
        weekly,
        distribution,
        pillowWeekly
      )

    } catch (e) {
      if (await handleDirectusAuthError(e)) return

      error.value = getDirectusErrorMessage(e, 'Failed to fetch latex sales data')
      console.error('[Latex] Failed to fetch sales data:', e)
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
    demandByFirmnessSize: readonly(demandByFirmnessSize),
    weeklyRates: readonly(weeklyRates),
    weeklyTotalBySize: readonly(weeklyTotalBySize),
    pillowLatexWeeklyRates: readonly(pillowLatexWeeklyRates),
    firmnessDistribution: readonly(firmnessDistribution),
    totalSales: readonly(totalSales),
    dateRange: readonly(dateRange),
    refresh: fetchSalesData
  }
}

// Export parser for testing
export { parseLatexSku, parsePillowLatexSku }
