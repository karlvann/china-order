/**
 * Composable for fetching and analyzing weekly sales data from Directus
 *
 * Fetches orders from the last 84 days (12 weeks) and analyzes mattress sales
 * to determine spring demand by size and firmness.
 * Uses blended 6/12 week lookback — takes the higher weekly rate from either window.
 */

const MATTRESS_RANGES = ['cooper', 'cloud', 'aurora']
const LOOKBACK_DAYS_SHORT = 42 // 6 weeks
const LOOKBACK_DAYS_LONG = 84 // 12 weeks

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
      // Calculate date ranges (6-week and 12-week windows)
      const endDate = new Date()
      const startDateLong = new Date()
      startDateLong.setDate(startDateLong.getDate() - LOOKBACK_DAYS_LONG)
      const startDateShort = new Date()
      startDateShort.setDate(startDateShort.getDate() - LOOKBACK_DAYS_SHORT)

      console.log(`Fetching orders from last ${LOOKBACK_DAYS_LONG} days (blended 6/12 week lookback)`)

      dateRange.value = {
        start: startDateLong.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }

      // Fetch orders with SKUs from Directus
      const response = await getItems({
        collection: 'orders',
        params: {
          filter: {
            date_created: {
              _gte: startDateLong.toISOString()
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

      // Split sales into 12-week (all) and 6-week (recent) windows
      const shortCutoff = startDateShort.getTime()
      const salesShort = sales.filter(s => new Date(s.dateCreated).getTime() >= shortCutoff)

      // Helper to create empty demand structure
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

      // Aggregate both windows
      const demandLong = emptyDemand()
      const demandShort = emptyDemand()
      const modelCountsLong = emptyModelCounts()

      for (const sale of sales) {
        if (demandLong[sale.size]) {
          demandLong[sale.size][sale.firmnessType]++
          demandLong[sale.size].total++
          if (modelCountsLong[sale.size] && sale.range) {
            modelCountsLong[sale.size][sale.range]++
          }
        }
      }

      for (const sale of salesShort) {
        if (demandShort[sale.size]) {
          demandShort[sale.size][sale.firmnessType]++
          demandShort[sale.size].total++
        }
      }

      demandBySize.value = demandLong
      modelDistribution.value = modelCountsLong

      // Calculate micro coil/thin latex demand for both windows
      function addMicroDemand(sale, mkRef, mqRef) {
        const layers = sale.range === 'cloud' ? 2 : sale.range === 'aurora' ? 1 : 0
        if (layers > 0) {
          if (sale.size === 'King') {
            mkRef.value += layers * 1.0
          } else if (sale.size === 'Single') {
            mkRef.value += layers * 0.5
          } else {
            mqRef.value += layers * 1.0
          }
        }
      }

      // Use wrapper objects for pass-by-reference
      const mkL = { value: 0 }, mqL = { value: 0 }, mkS = { value: 0 }, mqS = { value: 0 }
      for (const sale of sales) addMicroDemand(sale, mkL, mqL)
      for (const sale of salesShort) addMicroDemand(sale, mkS, mqS)

      // Calculate weekly rates for both windows, take the max
      const weeksShort = LOOKBACK_DAYS_SHORT / 7
      const weeksLong = LOOKBACK_DAYS_LONG / 7

      const microKingRateShort = mkS.value / weeksShort
      const microKingRateLong = mkL.value / weeksLong
      const microQueenRateShort = mqS.value / weeksShort
      const microQueenRateLong = mqL.value / weeksLong

      microCoilDemand.value = {
        King: Math.round(Math.max(microKingRateShort, microKingRateLong) * 10) / 10,
        Queen: Math.round(Math.max(microQueenRateShort, microQueenRateLong) * 10) / 10
      }
      thinLatexDemand.value = { ...microCoilDemand.value }

      // Blended weekly rates: max of 6-week and 12-week rate for each metric
      const weekly = {}
      for (const size of Object.keys(demandLong)) {
        weekly[size] = {}
        for (const key of ['firm', 'medium', 'soft', 'total']) {
          const rateShort = demandShort[size][key] / weeksShort
          const rateLong = demandLong[size][key] / weeksLong
          weekly[size][key] = Math.round(Math.max(rateShort, rateLong) * 10) / 10
        }
      }
      weeklyRates.value = weekly

      console.log('[Sales] Blended 6/12 week rates (higher of two windows):', weekly)

      // Firmness distribution from 12-week window (larger sample = more stable)
      const distribution = {}
      for (const size of Object.keys(demandLong)) {
        const total = demandLong[size].total
        if (total > 0) {
          distribution[size] = {
            firm: Math.round((demandLong[size].firm / total) * 100),
            medium: Math.round((demandLong[size].medium / total) * 100),
            soft: Math.round((demandLong[size].soft / total) * 100)
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
