import {
  DEFAULT_PALLETS,
  MIN_PALLETS,
  MAX_PALLETS,
  MATTRESS_SIZES,
  FIRMNESS_TYPES
} from '~/lib/constants/index.js'
import { withSpringStoreSplitDemand } from '~/lib/utils/index.js'

const SETTINGS_KEY = 'china_order_settings'
const emptySpringDemand = () => Object.fromEntries(MATTRESS_SIZES.map(size => [size.id,
  Object.fromEntries(FIRMNESS_TYPES.map(tension => [tension, 0]))
]))

export const useSpringSettingsStore = defineStore('springSettings', () => {

  // State
  const palletCount = ref(DEFAULT_PALLETS)
  const exportFormat = ref('optimized') // 'exact' or 'optimized'
  const startingMonth = ref(new Date().getMonth()) // 0-11
  const orderWeekOffset = ref(0) // 0-20 weeks from current week
  const deliveryWeeks = ref(10) // 1-15 weeks (shipping lead time)
  const useSeasonalDemand = ref(true) // Apply seasonal multipliers to forecast
  const useStoreSplitDemand = ref(false) // Keep 12-week size demand and apply fixed spring splits plus recent component model mix
  const componentScale = ref(1.0) // 0.3 to 2.0, multiplier for component orders
  const liveSalesRates = ref({
    WEEKLY_SALES_RATE: {
      King: 0,
      Queen: 0,
      Double: 0,
      'King Single': 0,
      Single: 0
    },
    FIRMNESS_DISTRIBUTION: emptySpringDemand(),
    MICRO_COIL_WEEKLY_DEMAND: { King: 0, Queen: 0 },
    THIN_LATEX_WEEKLY_DEMAND: { King: 0, Queen: 0 },
    MODEL_LAYER_TOTALS: {}, // Quantity-weighted recipe totals from 12-week paid sales
    STORE_MODEL_LAYER_TOTALS: {}, // Same totals from the two-week store split sample
    RAW_SKU_WEEKLY_DEMAND: emptySpringDemand(),
    WEEKLY_SALES_SPIKE: {
      King: 0,
      Queen: 0,
      Double: 0,
      'King Single': 0,
      Single: 0
    },
    SKU_WEEKLY_DEMAND_SPIKE: emptySpringDemand(),
    MICRO_COIL_WEEKLY_SPIKE: { King: 0, Queen: 0 },
    THIN_LATEX_WEEKLY_SPIKE: { King: 0, Queen: 0 },
    SIDE_PANEL_WEEKLY_SPIKE: { King: 0, Queen: 0, Double: 0 },
    STORE_SKU_SPLIT: emptySpringDemand()
  })
  const liveSalesLoaded = ref(false)

  // Getters
  const isMinPallets = computed(() => palletCount.value <= MIN_PALLETS)

  const isMaxPallets = computed(() => palletCount.value >= MAX_PALLETS)

  const palletConstraints = computed(() => ({
    min: MIN_PALLETS,
    max: MAX_PALLETS,
    default: DEFAULT_PALLETS
  }))

  const isExactFormat = computed(() => exportFormat.value === 'exact')

  const planningSalesRates = computed(() => {
    if (!useStoreSplitDemand.value) return liveSalesRates.value
    return withSpringStoreSplitDemand(liveSalesRates.value)
  })

  // Get current ISO week number (1-52)
  const currentWeekNumber = computed(() => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  })

  // Get the order week number (current + offset, wraps at 52)
  const orderWeekNumber = computed(() => {
    const week = currentWeekNumber.value + orderWeekOffset.value
    return week > 52 ? week - 52 : week
  })

  // Actions
  const saveToStorage = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        palletCount: palletCount.value,
        exportFormat: exportFormat.value
      }))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  const setPalletCount = (count) => {
    palletCount.value = Math.max(MIN_PALLETS, Math.min(MAX_PALLETS, count))
    saveToStorage()
  }

  const incrementPallets = () => {
    if (palletCount.value < MAX_PALLETS) {
      palletCount.value++
      saveToStorage()
    }
  }

  const decrementPallets = () => {
    if (palletCount.value > MIN_PALLETS) {
      palletCount.value--
      saveToStorage()
    }
  }

  const setExportFormat = (format) => {
    exportFormat.value = format
    saveToStorage()
  }

  const toggleExportFormat = () => {
    exportFormat.value = exportFormat.value === 'exact' ? 'optimized' : 'exact'
    saveToStorage()
  }

  const setStartingMonth = (month) => {
    startingMonth.value = month
  }

  const setOrderWeekOffset = (offset) => {
    orderWeekOffset.value = Math.max(0, Math.min(20, offset))
  }

  const setDeliveryWeeks = (weeks) => {
    deliveryWeeks.value = Math.max(1, Math.min(15, weeks))
  }

  const setUseSeasonalDemand = (value) => {
    useSeasonalDemand.value = value
  }

  const toggleSeasonalDemand = () => {
    useSeasonalDemand.value = !useSeasonalDemand.value
  }

  const setUseStoreSplitDemand = (value) => {
    useStoreSplitDemand.value = value
  }

  const toggleStoreSplitDemand = () => {
    useStoreSplitDemand.value = !useStoreSplitDemand.value
  }

  const setComponentScale = (scale) => {
    componentScale.value = Math.max(0.3, Math.min(2.0, Math.round(scale * 10) / 10))
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.palletCount !== undefined) {
          palletCount.value = data.palletCount
        }
        if (data.exportFormat !== undefined) {
          exportFormat.value = data.exportFormat
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  const setLiveSalesRates = (weeklyRates, firmnessDistribution, microCoilDemand, thinLatexDemand, rawSkuWeeklyDemand, demandSpikes, storeSplit, modelLayerTotals) => {
    liveSalesRates.value.WEEKLY_SALES_RATE = { ...weeklyRates }
    // Rebuild every size from the latest response so missing data cannot retain
    // stale startup or previous-refresh percentages.
    const nextFirmnessDistribution = emptySpringDemand()
    for (const size of MATTRESS_SIZES) {
      const distribution = firmnessDistribution?.[size.id]
      nextFirmnessDistribution[size.id] = {
        verysoft: (distribution?.verysoft || 0) / 100,
        soft: (distribution?.soft || 0) / 100,
        medium: (distribution?.medium || 0) / 100,
        firm: (distribution?.firm || 0) / 100
      }
    }
    liveSalesRates.value.FIRMNESS_DISTRIBUTION = nextFirmnessDistribution
    if (microCoilDemand) {
      liveSalesRates.value.MICRO_COIL_WEEKLY_DEMAND = { ...microCoilDemand }
    }
    if (thinLatexDemand) {
      liveSalesRates.value.THIN_LATEX_WEEKLY_DEMAND = { ...thinLatexDemand }
    }
    if (rawSkuWeeklyDemand) {
      liveSalesRates.value.RAW_SKU_WEEKLY_DEMAND = JSON.parse(JSON.stringify(rawSkuWeeklyDemand))
    }
    if (demandSpikes?.weeklySales) {
      liveSalesRates.value.WEEKLY_SALES_SPIKE = { ...demandSpikes.weeklySales }
    }
    if (demandSpikes?.skuWeeklyDemand) {
      liveSalesRates.value.SKU_WEEKLY_DEMAND_SPIKE = JSON.parse(JSON.stringify(demandSpikes.skuWeeklyDemand))
    }
    if (demandSpikes?.microCoil) {
      liveSalesRates.value.MICRO_COIL_WEEKLY_SPIKE = { ...demandSpikes.microCoil }
    }
    if (demandSpikes?.thinLatex) {
      liveSalesRates.value.THIN_LATEX_WEEKLY_SPIKE = { ...demandSpikes.thinLatex }
    }
    if (demandSpikes?.sidePanel) {
      liveSalesRates.value.SIDE_PANEL_WEEKLY_SPIKE = { ...demandSpikes.sidePanel }
    }
    if (storeSplit) {
      liveSalesRates.value.STORE_SKU_SPLIT = JSON.parse(JSON.stringify(storeSplit))
    }
    liveSalesRates.value.MODEL_LAYER_TOTALS = JSON.parse(JSON.stringify(modelLayerTotals?.allSales || {}))
    liveSalesRates.value.STORE_MODEL_LAYER_TOTALS = JSON.parse(JSON.stringify(modelLayerTotals?.storeSales || {}))
    liveSalesLoaded.value = true
  }

  const resetToDefaults = () => {
    palletCount.value = DEFAULT_PALLETS
    exportFormat.value = 'optimized'
    startingMonth.value = new Date().getMonth()
    useStoreSplitDemand.value = false
    saveToStorage()
  }

  return {
    // State
    palletCount,
    exportFormat,
    startingMonth,
    orderWeekOffset,
    deliveryWeeks,
    liveSalesRates,
    liveSalesLoaded,
    useSeasonalDemand,
    useStoreSplitDemand,
    componentScale,
    // Getters
    isMinPallets,
    isMaxPallets,
    palletConstraints,
    isExactFormat,
    planningSalesRates,
    currentWeekNumber,
    orderWeekNumber,
    // Actions
    setPalletCount,
    incrementPallets,
    decrementPallets,
    setExportFormat,
    toggleExportFormat,
    setStartingMonth,
    setOrderWeekOffset,
    setDeliveryWeeks,
    setUseSeasonalDemand,
    toggleSeasonalDemand,
    setUseStoreSplitDemand,
    toggleStoreSplitDemand,
    setComponentScale,
    loadFromStorage,
    saveToStorage,
    setLiveSalesRates,
    resetToDefaults
  }
})
