/**
 * Composable for fetching and analyzing weekly sales data from Directus
 *
 * Fetches orders from the last 42 days (6 weeks) and analyzes mattress sales
 * to determine spring demand by size and firmness.
 */

const MATTRESS_RANGES = ['cooper', 'cloud', 'aurora']
const LOOKBACK_DAYS = 42 // 6 weeks

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
// Format: range[cooper|cloud|aurora] + firmnessLevel[2-19] + size[single|kingsingle|double|queen|king]
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
  if (isNaN(firmnessLevel) || firmnessLevel < 2 || firmnessLevel > 19) return null

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
      // Calculate date range (last 42 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - LOOKBACK_DAYS)

      console.log(`Fetching orders from ${startDate.toISOString()} to ${endDate.toISOString()}`)

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

      // Reset demand counts
      const demand = {
        King: { firm: 0, medium: 0, soft: 0, total: 0 },
        Queen: { firm: 0, medium: 0, soft: 0, total: 0 },
        Double: { firm: 0, medium: 0, soft: 0, total: 0 },
        'King Single': { firm: 0, medium: 0, soft: 0, total: 0 },
        Single: { firm: 0, medium: 0, soft: 0, total: 0 }
      }

      // Track model counts by size
      const modelCounts = {
        King: { cloud: 0, aurora: 0, cooper: 0 },
        Queen: { cloud: 0, aurora: 0, cooper: 0 },
        Double: { cloud: 0, aurora: 0, cooper: 0 },
        'King Single': { cloud: 0, aurora: 0, cooper: 0 },
        Single: { cloud: 0, aurora: 0, cooper: 0 }
      }

      // Aggregate sales by size, firmness, and model
      for (const sale of sales) {
        if (demand[sale.size]) {
          demand[sale.size][sale.firmnessType]++
          demand[sale.size].total++

          // Track model distribution
          if (modelCounts[sale.size] && sale.range) {
            modelCounts[sale.size][sale.range]++
          }
        }
      }

      demandBySize.value = demand
      modelDistribution.value = modelCounts

      // Calculate direct micro coil/thin latex demand by inventory SKU
      // Business rules:
      // - Cloud = 2 micro spring layers, Aurora = 1 layer, Cooper = 0 layers
      // - 1 layer = 1 micro coil + 1 thin latex
      // - King mattress uses King inventory (1.0x)
      // - Single mattress uses King inventory (0.5x - half a King)
      // - Queen/Double/King Single all use Queen inventory (1.0x)
      let microKing = 0
      let microQueen = 0

      for (const sale of sales) {
        const layers = sale.range === 'cloud' ? 2 : sale.range === 'aurora' ? 1 : 0

        if (layers > 0) {
          if (sale.size === 'King') {
            microKing += layers * 1.0
          } else if (sale.size === 'Single') {
            microKing += layers * 0.5
          } else {
            // Queen, Double, King Single all use Queen inventory
            microQueen += layers * 1.0
          }
        }
      }

      // Calculate weekly rates (divide by 6 weeks)
      const weeks = LOOKBACK_DAYS / 7

      // Convert micro coil totals to weekly rates
      microCoilDemand.value = {
        King: Math.round((microKing / weeks) * 10) / 10,
        Queen: Math.round((microQueen / weeks) * 10) / 10
      }
      // Thin latex is always 1:1 with micro coils
      thinLatexDemand.value = { ...microCoilDemand.value }
      const weekly = {}
      for (const size of Object.keys(demand)) {
        weekly[size] = {
          firm: Math.round((demand[size].firm / weeks) * 10) / 10,
          medium: Math.round((demand[size].medium / weeks) * 10) / 10,
          soft: Math.round((demand[size].soft / weeks) * 10) / 10,
          total: Math.round((demand[size].total / weeks) * 10) / 10
        }
      }
      weeklyRates.value = weekly

      // Calculate firmness distribution percentages
      const distribution = {}
      for (const size of Object.keys(demand)) {
        const total = demand[size].total
        if (total > 0) {
          distribution[size] = {
            firm: Math.round((demand[size].firm / total) * 100),
            medium: Math.round((demand[size].medium / total) * 100),
            soft: Math.round((demand[size].soft / total) * 100)
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
