/**
 * Composable for fetching and analyzing weekly sales data from Directus.
 * Uses chunked trimmed-mean rate calculation — see lib/utils/demandTrimming.js.
 */

import {
  LOOKBACK_DAYS,
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
import { parseMattressSku, getSpringFirmnessType } from '~/lib/utils/mattressSku.js'

export function useWeeklySales() {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()
  const settingsStore = useSettingsStore()

  const loading = ref(true)
  const error = ref(null)

  // Raw sales data
  const salesData = ref([])

  // Aggregated demand by size and firmness
  const demandBySize = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 }
  })

  // Weekly averages
  const weeklyRates = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 }
  })

  // Raw 12-week SKU averages used as a floor for low-selling spring SKUs
  const rawSkuWeeklyDemand = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0 }
  })

  // Average weekly demand from the last 2 complete weeks
  const weeklySalesSpike = ref({
    King: 0,
    Queen: 0,
    Double: 0,
    'King Single': 0,
    Single: 0
  })

  const skuWeeklyDemandSpike = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0 }
  })

  const microCoilDemandSpike = ref({ King: 0, Queen: 0 })
  const thinLatexDemandSpike = ref({ King: 0, Queen: 0 })
  const sidePanelDemandSpike = ref({ King: 0, Queen: 0, Double: 0 })

  const storeSkuSplit = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0 }
  })

  // Firmness distribution percentages by size
  const firmnessDistribution = ref({
    King: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0 },
    Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0 }
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
          limit: -1 // Get all matching orders
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

      // Process orders to extract mattress sales
      const sales = []

      for (const order of orders) {
        if (!order.skus) continue

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const parsed = parseMattressSku(sku)
          if (parsed) {
            const parsedQuantity = parseInt(skuRelation.quantity, 10)
            const quantity = Math.max(0, Number.isFinite(parsedQuantity) ? parsedQuantity : 1)

            sales.push({
              orderId: order.id,
              dateCreated: order.date_created,
              sku,
              quantity,
              saleSource: order.sale_source,
              ...parsed
            })
          }
        }
      }

      salesData.value = sales
      totalSales.value = sales.reduce((sum, sale) => sum + sale.quantity, 0)

      const emptyDemand = () => ({
        King: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
        Queen: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
        Double: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
        'King Single': { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 },
        Single: { veryfirm: 0, firm: 0, medium: 0, soft: 0, total: 0 }
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
          veryfirm: emptyChunks(),
          firm: emptyChunks(),
          medium: emptyChunks(),
          soft: emptyChunks(),
          total: emptyChunks()
        }
      }
      const chunkedMicroKing = emptyChunks()
      const chunkedMicroQueen = emptyChunks()
      const chunkedThinLatexKing = emptyChunks()
      const chunkedThinLatexQueen = emptyChunks()

      const weeklyBuckets = {}
      for (const size of Object.keys(demandTotal)) {
        weeklyBuckets[size] = {
          veryfirm: emptyWeeks(),
          firm: emptyWeeks(),
          medium: emptyWeeks(),
          soft: emptyWeeks(),
          total: emptyWeeks()
        }
      }
      const weeklyMicroKing = emptyWeeks()
      const weeklyMicroQueen = emptyWeeks()
      const weeklyThinLatexKing = emptyWeeks()
      const weeklyThinLatexQueen = emptyWeeks()
      const storeSplitCounts = emptyDemand()

      for (const sale of sales) {
        const idx = getChunkIndex(sale.dateCreated, referenceTime)
        if (idx < 0) continue

        const weekIdx = getCompletedWeekIndex(sale.dateCreated, endDate)

        if (demandTotal[sale.size]) {
          demandTotal[sale.size][sale.firmnessType] += sale.quantity
          demandTotal[sale.size].total += sale.quantity
          if (modelCountsTotal[sale.size] && sale.range) {
            modelCountsTotal[sale.size][sale.range] += sale.quantity
          }
        }

        if (chunked[sale.size]) {
          chunked[sale.size][sale.firmnessType][idx] += sale.quantity
          chunked[sale.size].total[idx] += sale.quantity
        }

        if (weeklyBuckets[sale.size] && weekIdx >= 0) {
          weeklyBuckets[sale.size][sale.firmnessType][weekIdx] += sale.quantity
          weeklyBuckets[sale.size].total[weekIdx] += sale.quantity
        }

        // Each `m` in the recipe expands to thinlatex + microcoils.
        const microLayerDemand = sale.microLayers * sale.quantity
        if (microLayerDemand > 0) {
          if (sale.size === 'King') {
            chunkedMicroKing[idx] += microLayerDemand
            if (weekIdx >= 0) weeklyMicroKing[weekIdx] += microLayerDemand
          } else if (sale.size === 'Single') {
            chunkedMicroKing[idx] += microLayerDemand * 0.5
            if (weekIdx >= 0) weeklyMicroKing[weekIdx] += microLayerDemand * 0.5
          } else {
            chunkedMicroQueen[idx] += microLayerDemand
            if (weekIdx >= 0) weeklyMicroQueen[weekIdx] += microLayerDemand
          }
        }

        const thinLatexLayerDemand = sale.thinLatexLayers * sale.quantity
        if (thinLatexLayerDemand > 0) {
          if (sale.size === 'King') {
            chunkedThinLatexKing[idx] += thinLatexLayerDemand
            if (weekIdx >= 0) weeklyThinLatexKing[weekIdx] += thinLatexLayerDemand
          } else if (sale.size === 'Single') {
            chunkedThinLatexKing[idx] += thinLatexLayerDemand * 0.5
            if (weekIdx >= 0) weeklyThinLatexKing[weekIdx] += thinLatexLayerDemand * 0.5
          } else {
            chunkedThinLatexQueen[idx] += thinLatexLayerDemand
            if (weekIdx >= 0) weeklyThinLatexQueen[weekIdx] += thinLatexLayerDemand
          }
        }
      }

      for (const order of storeSplitOrders) {
        if (`${order.sale_source || ''}`.trim().toLowerCase() === 'website') continue
        if (!order.skus) continue

        for (const skuRelation of order.skus) {
          const sku = skuRelation?.skus_id?.sku
          if (!sku) continue

          const parsed = parseMattressSku(sku)
          if (!parsed || !storeSplitCounts[parsed.size]) continue

          const parsedQuantity = parseInt(skuRelation.quantity, 10)
          const quantity = Math.max(0, Number.isFinite(parsedQuantity) ? parsedQuantity : 1)

          storeSplitCounts[parsed.size][parsed.firmnessType] += quantity
          storeSplitCounts[parsed.size].total += quantity
        }
      }

      demandBySize.value = demandTotal
      modelDistribution.value = modelCountsTotal

      microCoilDemand.value = {
        King: roundDemandRate(trimmedWeeklyRate(chunkedMicroKing)),
        Queen: roundDemandRate(trimmedWeeklyRate(chunkedMicroQueen))
      }
      thinLatexDemand.value = {
        King: roundDemandRate(trimmedWeeklyRate(chunkedThinLatexKing)),
        Queen: roundDemandRate(trimmedWeeklyRate(chunkedThinLatexQueen))
      }

      const weekly = {}
      for (const size of Object.keys(demandTotal)) {
        weekly[size] = {}
        for (const key of ['veryfirm', 'firm', 'medium', 'soft', 'total']) {
          weekly[size][key] = roundDemandRate(trimmedWeeklyRate(chunked[size][key]))
        }
      }
      weeklyRates.value = weekly

      const rawSkuWeekly = {}
      for (const size of Object.keys(demandTotal)) {
        rawSkuWeekly[size] = {}
        for (const firmness of ['veryfirm', 'firm', 'medium', 'soft']) {
          rawSkuWeekly[size][firmness] = roundDemandRate(demandTotal[size][firmness] / (LOOKBACK_DAYS / 7))
        }
      }
      rawSkuWeeklyDemand.value = rawSkuWeekly

      const sizeSpikes = {}
      const skuSpikes = {}
      for (const size of Object.keys(demandTotal)) {
        sizeSpikes[size] = roundDemandRate(recentWeeklyDemandSpike(weeklyBuckets[size].total))
        skuSpikes[size] = {}
        for (const firmness of ['veryfirm', 'firm', 'medium', 'soft']) {
          skuSpikes[size][firmness] = roundDemandRate(recentWeeklyDemandSpike(weeklyBuckets[size][firmness]))
        }
      }

      const combinedSmallSizeWeeks = weeklyBuckets.Double.total.map((value, index) => (
        value + weeklyBuckets['King Single'].total[index] + weeklyBuckets.Single.total[index]
      ))

      weeklySalesSpike.value = sizeSpikes
      skuWeeklyDemandSpike.value = skuSpikes
      microCoilDemandSpike.value = {
        King: roundDemandRate(recentWeeklyDemandSpike(weeklyMicroKing)),
        Queen: roundDemandRate(recentWeeklyDemandSpike(weeklyMicroQueen))
      }
      thinLatexDemandSpike.value = {
        King: roundDemandRate(recentWeeklyDemandSpike(weeklyThinLatexKing)),
        Queen: roundDemandRate(recentWeeklyDemandSpike(weeklyThinLatexQueen))
      }
      sidePanelDemandSpike.value = {
        King: sizeSpikes.King || 0,
        Queen: sizeSpikes.Queen || 0,
        Double: roundDemandRate(recentWeeklyDemandSpike(combinedSmallSizeWeeks))
      }

      const split = {}
      for (const size of Object.keys(storeSplitCounts)) {
        split[size] = {}
        for (const firmness of ['veryfirm', 'firm', 'medium', 'soft']) {
          split[size][firmness] = storeSplitCounts[size].total > 0
            ? Math.round((storeSplitCounts[size][firmness] / storeSplitCounts[size].total) * 1000) / 10
            : 0
        }
      }
      storeSkuSplit.value = split

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
      logTrim('Thin latex King', chunkedThinLatexKing, thinLatexDemand.value.King)
      logTrim('Thin latex Queen', chunkedThinLatexQueen, thinLatexDemand.value.Queen)

      // Firmness distribution from 12-week window (larger sample = more stable)
      const distribution = {}
      for (const size of Object.keys(demandTotal)) {
        const total = demandTotal[size].total
        if (total > 0) {
          distribution[size] = {
            veryfirm: Math.round((demandTotal[size].veryfirm / total) * 100),
            firm: Math.round((demandTotal[size].firm / total) * 100),
            medium: Math.round((demandTotal[size].medium / total) * 100),
            soft: Math.round((demandTotal[size].soft / total) * 100)
          }
        } else {
          distribution[size] = { veryfirm: 0, firm: 0, medium: 0, soft: 0 }
        }
      }
      firmnessDistribution.value = distribution

      // Build weekly totals for the store
      const weeklyTotals = {}
      for (const size of Object.keys(weekly)) {
        weeklyTotals[size] = weekly[size].total
      }

      // Update settings store with live data
      settingsStore.setLiveSalesRates(
        weeklyTotals,
        distribution,
        microCoilDemand.value,
        thinLatexDemand.value,
        rawSkuWeeklyDemand.value,
        {
          weeklySales: weeklySalesSpike.value,
          skuWeeklyDemand: skuWeeklyDemandSpike.value,
          microCoil: microCoilDemandSpike.value,
          thinLatex: thinLatexDemandSpike.value,
          sidePanel: sidePanelDemandSpike.value
        },
        storeSkuSplit.value
      )

    } catch (e) {
      if (await handleDirectusAuthError(e)) return

      error.value = getDirectusErrorMessage(e, 'Failed to fetch sales data')
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
    rawSkuWeeklyDemand: readonly(rawSkuWeeklyDemand),
    weeklySalesSpike: readonly(weeklySalesSpike),
    skuWeeklyDemandSpike: readonly(skuWeeklyDemandSpike),
    microCoilDemandSpike: readonly(microCoilDemandSpike),
    thinLatexDemandSpike: readonly(thinLatexDemandSpike),
    sidePanelDemandSpike: readonly(sidePanelDemandSpike),
    storeSkuSplit: readonly(storeSkuSplit),
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
export { parseMattressSku, getSpringFirmnessType as getFirmnessType }
