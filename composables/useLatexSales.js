/**
 * Composable for fetching and analyzing latex demand from sales data
 *
 * Fetches orders from the last 42 days (6 weeks) and analyzes mattress sales
 * to determine latex demand by firmness and size.
 *
 * Key business rules:
 * - Cooper mattresses use polyfoam, NOT latex (excluded from calculations)
 * - Cloud and Aurora mattresses use latex
 * - Size mapping: King/Single → King latex, Queen/Double/King Single → Queen latex
 * - Single deducts 0.5 from King inventory (one King sheet makes two Singles)
 */

import {
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  MATTRESS_TO_LATEX_MAP,
  LATEX_FIRMNESS_LEVEL_RANGES
} from '~/lib/constants/index.js'

const LOOKBACK_DAYS = 42 // 6 weeks

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

export function useLatexSales() {
  const { getItems } = useDirectusItems()
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
      // Calculate date range (last 42 days)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - LOOKBACK_DAYS)

      console.log(`[Latex] Fetching orders from last ${LOOKBACK_DAYS} days: ${startDate.toISOString()} to ${endDate.toISOString()}`)

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

          const parsed = parseLatexSku(sku)
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

      // Aggregate demand by firmness and latex size
      const demand = createEmptyDemand()

      for (const sale of sales) {
        demand[sale.latexFirmness][sale.latexSize] += sale.deduction
      }

      demandByFirmnessSize.value = demand

      // Calculate weekly rates (divide by 6 weeks)
      const weeks = LOOKBACK_DAYS / 7
      const weekly = createEmptyDemand()
      const totals = { King: 0, Queen: 0 }

      for (const firmness of LATEX_FIRMNESSES) {
        for (const size of LATEX_SIZES) {
          const rate = Math.round((demand[firmness][size] / weeks) * 10) / 10
          weekly[firmness][size] = rate
          totals[size] += rate
        }
      }

      weeklyRates.value = weekly
      weeklyTotalBySize.value = {
        King: Math.round(totals.King * 10) / 10,
        Queen: Math.round(totals.Queen * 10) / 10
      }

      // Calculate firmness distribution percentages per size
      const distribution = {
        King: { firm: 0, medium: 0, soft: 0 },
        Queen: { firm: 0, medium: 0, soft: 0 }
      }

      for (const size of LATEX_SIZES) {
        const total = totals[size]
        if (total > 0) {
          for (const firmness of LATEX_FIRMNESSES) {
            distribution[size][firmness] = Math.round((weekly[firmness][size] / total) * 100)
          }
        }
      }

      firmnessDistribution.value = distribution

      // Update settings store with live data
      sriLankaSettingsStore.setLatexSalesRates(
        weeklyTotalBySize.value,
        weekly,
        distribution
      )

      console.log(`[Latex] Processed ${sales.length} latex-relevant sales from ${orders.length} orders`)
      console.log('[Latex] Weekly rates:', weekly)
      console.log('[Latex] Totals by size:', weeklyTotalBySize.value)

    } catch (e) {
      error.value = e.message
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
    firmnessDistribution: readonly(firmnessDistribution),
    totalSales: readonly(totalSales),
    dateRange: readonly(dateRange),
    refresh: fetchSalesData
  }
}

// Export parser for testing
export { parseLatexSku }
