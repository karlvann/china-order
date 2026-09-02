/**
 * Composable for fetching and analyzing latex demand from sales data.
 * Uses chunked trimmed-mean rate calculation — see lib/utils/demandTrimming.js.
 *
 * Key business rules:
 * - Cloud, Aurora, and Cooper mattresses use top latex
 * - Cooper uses foam instead of micro layers, but still consumes top latex
 * - 11s-16s variants override top latex to soft latex
 * - Size mapping: King/Single → King latex, Queen/Double/King Single → Queen latex
 * - Single deducts 0.5 from King inventory (one King sheet makes two Singles)
 * - Pillow latex demand comes from exact pillowlatexthin/pillowlatexthick SKU sales
 */

import {
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  MATTRESS_TO_LATEX_MAP,
  PILLOW_LATEX_SKUS,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'
import {
  LOOKBACK_DAYS,
  NUM_WEEKS,
  STORE_SPLIT_WEEKS,
  getChunkIndex,
  getCompletedWeekIndex,
  emptyChunks,
  emptyWeeks,
  recentWeeklyDemandSpike,
  trimmedWeeklyRate,
  roundDemandRate,
  getTrimAnnotations,
  chunkLabel
} from '~/lib/utils/demandTrimming.js'
import { getCurrentMonday } from '~/lib/utils/dates.js'
import { parseMattressSku as parseMattressRecipeSku } from '~/lib/utils/mattressSku.js'

const PILLOW_LATEX_SKU_MAP = {
  pillowlatexthin: 'thin',
  pillowlatexthick: 'thick'
}

/**
 * Parse mattress SKU to get top latex requirements from the full mattress recipe.
 */
function parseLatexSku(sku) {
  const parsed = parseMattressRecipeSku(sku)
  if (!parsed?.latexFirmness) return null

  const mapping = MATTRESS_TO_LATEX_MAP[parsed.mattressSize]
  if (!mapping) return null

  return {
    range: parsed.range,
    firmnessLevel: parsed.firmnessLevel,
    modelKey: parsed.modelKey,
    mattressSize: parsed.mattressSize,
    latexFirmness: parsed.latexFirmness,
    softLatex: parsed.softLatex,
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

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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

  // Average weekly demand from the last 2 complete weeks
  const weeklySpikes = ref(createEmptyDemand())

  // Total weekly demand per size (all firmnesses combined)
  const weeklyTotalBySize = ref({ King: 0, Queen: 0 })

  // Pillow latex weekly demand
  const pillowLatexWeeklyRates = ref(createEmptyPillowLatexDemand())
  const pillowLatexWeeklySpikes = ref(createEmptyPillowLatexDemand())
  const storeLatexSplit = ref(createEmptyDemand())

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
      const endDate = getCurrentMonday()
      const referenceTime = endDate.getTime()
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - LOOKBACK_DAYS)
      const displayEndDate = new Date(endDate)
      displayEndDate.setDate(displayEndDate.getDate() - 1)
      const storeSplitStartDate = new Date(endDate)
      storeSplitStartDate.setDate(storeSplitStartDate.getDate() - (STORE_SPLIT_WEEKS * 7))

      dateRange.value = {
        start: startDate.toISOString().split('T')[0],
        end: displayEndDate.toISOString().split('T')[0]
      }

      // Fetch orders with SKUs from Directus
      const response = await getItems({
        collection: 'orders',
        params: {
          filter: {
            date_created: {
              _gte: startDate.toISOString(),
              _lt: endDate.toISOString()
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
            'sale_source',
            'skus.quantity',
            'skus.skus_id.sku'
          ],
          limit: -1
        }
      })

      // Handle both direct array and { data: [] } response formats
      const orders = Array.isArray(response) ? response : (response?.data || [])

      const storeSplitResponse = await getItems({
        collection: 'orders',
        params: {
          filter: {
            date_created: {
              _gte: storeSplitStartDate.toISOString(),
              _lt: endDate.toISOString()
            }
          },
          fields: [
            'id',
            'date_created',
            'sale_source',
            'skus.quantity',
            'skus.skus_id.sku'
          ],
          limit: -1
        }
      })
      const storeSplitOrders = Array.isArray(storeSplitResponse) ? storeSplitResponse : (storeSplitResponse?.data || [])

      // Process orders to extract latex demand
      const sales = []

      for (const order of orders) {
        if (!order.skus) continue

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const parsedQuantity = parseInt(skuRelation.quantity, 10)
          const quantity = Math.max(0, Number.isFinite(parsedQuantity) ? parsedQuantity : 1)
          const parsed = parseLatexSku(sku)
          if (parsed) {
            sales.push({
              type: 'mattress_latex',
              orderId: order.id,
              dateCreated: order.date_created,
              sku,
              quantity,
              saleSource: order.sale_source,
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
              saleSource: order.sale_source,
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

      const weeklyBuckets = {}
      for (const firmness of LATEX_FIRMNESSES) {
        weeklyBuckets[firmness] = {}
        for (const size of LATEX_SIZES) {
          weeklyBuckets[firmness][size] = emptyWeeks()
        }
      }
      const weeklyPillow = {}
      for (const type of PILLOW_LATEX_TYPES) {
        weeklyPillow[type] = emptyWeeks()
      }

      const storeSplitCounts = createEmptyDemand()

      const lookbackWeeks = Array.from({ length: NUM_WEEKS }, (_, index) => {
        const weekStart = new Date(endDate)
        weekStart.setDate(endDate.getDate() - ((index + 1) * 7))

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        return {
          index,
          start: formatLocalDate(weekStart),
          end: formatLocalDate(weekEnd),
          latex: createEmptyDemand(),
          pillowLatex: createEmptyPillowLatexDemand(),
          orders: []
        }
      })

      for (const sale of sales) {
        const idx = getChunkIndex(sale.dateCreated, referenceTime)
        if (idx < 0) continue

        const weekIdx = getCompletedWeekIndex(sale.dateCreated, endDate)
        const amount = sale.deduction * sale.quantity

        if (weekIdx >= 0) {
          lookbackWeeks[weekIdx].orders.push({
            orderId: sale.orderId,
            dateCreated: sale.dateCreated,
            sku: sale.sku,
            type: sale.type,
            quantity: sale.quantity,
            saleSource: sale.saleSource,
            amount,
            modelKey: sale.modelKey,
            latexFirmness: sale.latexFirmness,
            latexSize: sale.latexSize,
            softLatex: sale.softLatex,
            pillowLatexType: sale.pillowLatexType
          })
        }

        if (sale.type === 'pillow_latex') {
          pillowDemandTotal[sale.pillowLatexType] += amount
          chunkedPillow[sale.pillowLatexType][idx] += amount
          if (weekIdx >= 0) {
            weeklyPillow[sale.pillowLatexType][weekIdx] += amount
            lookbackWeeks[weekIdx].pillowLatex[sale.pillowLatexType] += amount
          }
        } else {
          demandTotal[sale.latexFirmness][sale.latexSize] += amount
          chunked[sale.latexFirmness][sale.latexSize][idx] += amount
          if (weekIdx >= 0) {
            weeklyBuckets[sale.latexFirmness][sale.latexSize][weekIdx] += amount
            lookbackWeeks[weekIdx].latex[sale.latexFirmness][sale.latexSize] += amount
          }
        }
      }

      const storeSplitDebugOrders = []

      for (const order of storeSplitOrders) {
        const saleSource = `${order.sale_source || ''}`.trim().toLowerCase()
        const includeOrder = saleSource !== 'website'

        if (!includeOrder || !order.skus) {
          storeSplitDebugOrders.push({
            orderId: order.id,
            dateCreated: order.date_created,
            saleSource: order.sale_source,
            included: includeOrder,
            items: []
          })
          continue
        }

        const items = []

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const parsed = parseLatexSku(sku)
          if (!parsed) continue

          const parsedQuantity = parseInt(skuRelation.quantity, 10)
          const quantity = Math.max(0, Number.isFinite(parsedQuantity) ? parsedQuantity : 1)
          const amount = parsed.deduction * quantity

          storeSplitCounts[parsed.latexFirmness][parsed.latexSize] += amount
          items.push({
            sku,
            quantity,
            amount,
            modelKey: parsed.modelKey,
            mattressSize: parsed.mattressSize,
            latexFirmness: parsed.latexFirmness,
            latexSize: parsed.latexSize,
            softLatex: parsed.softLatex
          })
        }

        storeSplitDebugOrders.push({
          orderId: order.id,
          dateCreated: order.date_created,
          saleSource: order.sale_source,
          included: true,
          items
        })
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

      const spikes = createEmptyDemand()
      for (const firmness of LATEX_FIRMNESSES) {
        for (const size of LATEX_SIZES) {
          spikes[firmness][size] = roundDemandRate(recentWeeklyDemandSpike(weeklyBuckets[firmness][size]))
        }
      }

      const pillowSpikes = createEmptyPillowLatexDemand()
      for (const type of PILLOW_LATEX_TYPES) {
        pillowSpikes[type] = roundDemandRate(recentWeeklyDemandSpike(weeklyPillow[type]))
      }

      const storeSplit = createEmptyDemand()
      for (const size of LATEX_SIZES) {
        const total = LATEX_FIRMNESSES.reduce((sum, firmness) => sum + storeSplitCounts[firmness][size], 0)
        for (const firmness of LATEX_FIRMNESSES) {
          storeSplit[firmness][size] = total > 0
            ? Math.round((storeSplitCounts[firmness][size] / total) * 1000) / 10
            : 0
        }
      }

      weeklyRates.value = weekly
      weeklyTotalBySize.value = {
        King: roundDemandRate(totals.King),
        Queen: roundDemandRate(totals.Queen)
      }
      pillowLatexWeeklyRates.value = pillowWeekly
      weeklySpikes.value = spikes
      pillowLatexWeeklySpikes.value = pillowSpikes
      storeLatexSplit.value = storeSplit

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
      console.log('[Latex] 12-week lookback', {
        range: dateRange.value,
        weeks: lookbackWeeks
      })
      console.log('[Latex] store split lookback', {
        range: {
          start: formatLocalDate(storeSplitStartDate),
          end: formatLocalDate(displayEndDate)
        },
        counts: storeSplitCounts,
        split: storeLatexSplit.value,
        orders: storeSplitDebugOrders
      })
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
        pillowWeekly,
        {
          weekly: weeklySpikes.value,
          pillowLatex: pillowLatexWeeklySpikes.value
        },
        storeLatexSplit.value
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
    weeklySpikes: readonly(weeklySpikes),
    weeklyTotalBySize: readonly(weeklyTotalBySize),
    pillowLatexWeeklyRates: readonly(pillowLatexWeeklyRates),
    pillowLatexWeeklySpikes: readonly(pillowLatexWeeklySpikes),
    storeLatexSplit: readonly(storeLatexSplit),
    firmnessDistribution: readonly(firmnessDistribution),
    totalSales: readonly(totalSales),
    dateRange: readonly(dateRange),
    refresh: fetchSalesData
  }
}

// Export parser for testing
export { parseLatexSku, parsePillowLatexSku }
