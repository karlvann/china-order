import {
  calculateKingQueenFirstOrder,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV,
  calculateAnnualProjection
} from '~/lib/algorithms/index.js'

import { validateEqualRunway } from '~/lib/utils/validation.js'
import { MONTHLY_SALES_RATE } from '~/lib/constants/index.js'

export const useOrderStore = defineStore('order', () => {

  // Computed getters
  const springOrder = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()

    if (inventoryStore.springsLoading) return null

    return calculateKingQueenFirstOrder(
      settingsStore.palletCount,
      inventoryStore.fullInventory
    )
  })

  const componentOrder = computed(() => {
    const inventoryStore = useInventoryStore()

    if (!springOrder.value) return null

    return calculateComponentOrder(
      springOrder.value,
      inventoryStore.springs,
      inventoryStore.components
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

  const validation = computed(() => {
    const inventoryStore = useInventoryStore()

    if (!springOrder.value || !componentOrder.value) return null

    return validateEqualRunway(
      springOrder.value,
      componentOrder.value,
      inventoryStore.fullInventory
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
    const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single']
    const coverage = {}

    MATTRESS_SIZES.forEach(size => {
      const totalStock = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
        sum + (inventoryStore.springs[firmness][size] || 0), 0
      )
      const monthlySales = MONTHLY_SALES_RATE[size]
      coverage[size] = monthlySales > 0 ? totalStock / monthlySales : 0
    })

    return coverage
  })

  const annualProjection = computed(() => {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()

    if (!springOrder.value || !componentOrder.value) return null

    try {
      return calculateAnnualProjection(
        inventoryStore.fullInventory,
        settingsStore.startingMonth,
        springOrder.value,
        componentOrder.value,
        settingsStore.palletCount
      )
    } catch (error) {
      console.error('Error calculating annual projection:', error)
      return null
    }
  })

  const hasValidationIssues = computed(() => {
    return validation.value && !validation.value.allValid
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
    validation,
    tsvContent,
    coverageData,
    annualProjection,
    hasValidationIssues,
    totalSprings,
    totalPallets
  }
})
