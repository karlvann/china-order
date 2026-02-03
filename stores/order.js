import {
  calculateDemandBasedOrder,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from '~/lib/algorithms/index.js'

/**
 * Get the Monday of the current week (for calculating week indices)
 */
function getCurrentMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.setDate(diff))
}

/**
 * Convert database orders to algorithm format
 * Returns [{ arrivalWeekIndex, springsByFirmness: { firmness: { size: qty } } }]
 */
function convertOrdersForAlgorithm(dbOrders) {
  const monday = getCurrentMonday()

  return dbOrders.map(order => {
    // Calculate week index for arrival
    const arrivalDate = new Date(order.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    // Sum springs by firmness AND size from the order's SKUs
    const springsByFirmness = {
      firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    }

    if (order.skus) {
      for (const item of order.skus) {
        const sku = item.skus_id?.sku || ''
        const qty = item.quantity || 0

        // Parse spring SKUs: springs{firmness}{size}
        if (sku.startsWith('springs')) {
          // Extract firmness
          let firmness = null
          if (sku.includes('firm')) firmness = 'firm'
          else if (sku.includes('medium')) firmness = 'medium'
          else if (sku.includes('soft')) firmness = 'soft'

          if (!firmness) continue

          // Extract size from SKU
          if (sku.includes('king') && !sku.includes('kingsingle')) {
            springsByFirmness[firmness].King += qty
          } else if (sku.includes('queen')) {
            springsByFirmness[firmness].Queen += qty
          } else if (sku.includes('double')) {
            springsByFirmness[firmness].Double += qty
          } else if (sku.includes('kingsingle')) {
            springsByFirmness[firmness]['King Single'] += qty
          } else if (sku.includes('single')) {
            springsByFirmness[firmness].Single += qty
          }
        }
      }
    }

    return { arrivalWeekIndex, springsByFirmness }
  })
}

/**
 * Convert database orders to component algorithm format
 * Returns [{ arrivalWeekIndex, components: { type: { size: qty } } }]
 */
function convertOrdersForComponentAlgorithm(dbOrders) {
  const monday = getCurrentMonday()

  // Component SKU prefixes mapping
  const componentPrefixes = {
    microcoils: 'micro_coils',
    thinlatex: 'thin_latex',
    felt: 'felt',
    paneltop: 'top_panel',
    panelbottom: 'bottom_panel',
    panelside: 'side_panel'
  }

  return dbOrders.map(order => {
    const arrivalDate = new Date(order.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    // Initialize components structure
    const components = {
      micro_coils: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      thin_latex: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      felt: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      top_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      bottom_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      side_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    }

    if (order.skus) {
      for (const item of order.skus) {
        const sku = item.skus_id?.sku || ''
        const qty = item.quantity || 0

        // Skip springs
        if (sku.startsWith('springs')) continue

        // Find matching component type
        let compType = null
        for (const [prefix, type] of Object.entries(componentPrefixes)) {
          if (sku.startsWith(prefix)) {
            compType = type
            break
          }
        }

        if (!compType) continue

        // Extract size from SKU
        if (sku.includes('king') && !sku.includes('kingsingle')) {
          components[compType].King += qty
        } else if (sku.includes('queen')) {
          components[compType].Queen += qty
        } else if (sku.includes('double')) {
          components[compType].Double += qty
        } else if (sku.includes('kingsingle')) {
          components[compType]['King Single'] += qty
        } else if (sku.includes('single')) {
          components[compType].Single += qty
        }
      }
    }

    return { arrivalWeekIndex, components }
  })
}

export const useOrderStore = defineStore('order', () => {

  // Computed getters
  const springOrder = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()
    const inventoryOrdersStore = useInventoryOrdersStore()

    // Access reactive deps upfront to ensure Vue tracks them
    const pallets = settingsStore.palletCount
    const orderOffset = settingsStore.orderWeekOffset
    const salesLoaded = settingsStore.liveSalesLoaded

    if (inventoryStore.springsLoading) return null
    if (!salesLoaded) return null

    // Pass live sales data to the algorithm
    const salesRates = {
      WEEKLY_SALES_RATE: settingsStore.liveSalesRates.WEEKLY_SALES_RATE,
      FIRMNESS_DISTRIBUTION: settingsStore.liveSalesRates.FIRMNESS_DISTRIBUTION
    }

    // Convert pending orders to algorithm format
    const pendingOrders = convertOrdersForAlgorithm(inventoryOrdersStore.pendingOrders)

    return calculateDemandBasedOrder(
      pallets,
      inventoryStore.fullInventory,
      salesRates,
      pendingOrders,
      orderOffset
    )
  })

  const componentOrder = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()
    const inventoryOrdersStore = useInventoryOrdersStore()

    // Access reactive deps upfront
    const orderOffset = settingsStore.orderWeekOffset
    const salesLoaded = settingsStore.liveSalesLoaded

    if (!springOrder.value) return null
    if (!salesLoaded) return null

    // Pass live sales data including micro coil/thin latex demand
    const salesRates = {
      WEEKLY_SALES_RATE: settingsStore.liveSalesRates.WEEKLY_SALES_RATE,
      MICRO_COIL_WEEKLY_DEMAND: settingsStore.liveSalesRates.MICRO_COIL_WEEKLY_DEMAND,
      THIN_LATEX_WEEKLY_DEMAND: settingsStore.liveSalesRates.THIN_LATEX_WEEKLY_DEMAND
    }

    // Convert pending orders to component format
    const pendingComponentOrders = convertOrdersForComponentAlgorithm(inventoryOrdersStore.pendingOrders)

    return calculateComponentOrder(
      springOrder.value,
      inventoryStore.springs,
      inventoryStore.components,
      salesRates,
      pendingComponentOrders,
      orderOffset
    )
  })

  const optimizedComponentOrder = computed(() => {
    const settingsStore = useSettingsStore()

    if (!componentOrder.value) return null

    return optimizeComponentOrder(
      componentOrder.value,
      settingsStore.exportFormat
    )
  })

  const tsvContent = computed(() => {
    const settingsStore = useSettingsStore()

    if (!springOrder.value || !optimizedComponentOrder.value) return ''

    return generateTSV(
      springOrder.value,
      optimizedComponentOrder.value,
      settingsStore.exportFormat
    )
  })

  const totalSprings = computed(() => {
    if (!springOrder.value) return 0
    return springOrder.value.metadata.total_springs
  })

  const totalPallets = computed(() => {
    if (!springOrder.value) return 0
    return springOrder.value.metadata.total_pallets
  })

  return {
    springOrder,
    componentOrder,
    optimizedComponentOrder,
    tsvContent,
    totalSprings,
    totalPallets
  }
})
