import {
  calculateKingQueenFirstOrder,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from '~/lib/algorithms/index.js'

export const useOrderStore = defineStore('order', () => {

  // Computed getters
  const springOrder = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()

    if (inventoryStore.springsLoading) return null
    if (!settingsStore.liveSalesLoaded) return null

    // Pass live sales data to the algorithm
    const salesRates = {
      WEEKLY_SALES_RATE: settingsStore.liveSalesRates.WEEKLY_SALES_RATE,
      FIRMNESS_DISTRIBUTION: settingsStore.liveSalesRates.FIRMNESS_DISTRIBUTION
    }

    return calculateKingQueenFirstOrder(
      settingsStore.palletCount,
      inventoryStore.fullInventory,
      salesRates
    )
  })

  const componentOrder = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()

    if (!springOrder.value) return null
    if (!settingsStore.liveSalesLoaded) return null

    // Pass live sales data including micro coil/thin latex demand
    const salesRates = {
      WEEKLY_SALES_RATE: settingsStore.liveSalesRates.WEEKLY_SALES_RATE,
      MICRO_COIL_WEEKLY_DEMAND: settingsStore.liveSalesRates.MICRO_COIL_WEEKLY_DEMAND,
      THIN_LATEX_WEEKLY_DEMAND: settingsStore.liveSalesRates.THIN_LATEX_WEEKLY_DEMAND
    }

    return calculateComponentOrder(
      springOrder.value,
      inventoryStore.springs,
      inventoryStore.components,
      salesRates
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

  const coverageData = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()
    const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single']
    const coverage = {}

    const weeklyRates = settingsStore.liveSalesRates.WEEKLY_SALES_RATE

    MATTRESS_SIZES.forEach(size => {
      const totalStock = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
        sum + (inventoryStore.springs[firmness][size] || 0), 0
      )
      const weeklySales = weeklyRates[size] || 0
      coverage[size] = weeklySales > 0 ? totalStock / weeklySales : 0
    })

    return coverage
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
    coverageData,
    totalSprings,
    totalPallets
  }
})
