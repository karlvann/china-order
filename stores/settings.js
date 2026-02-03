import {
  DEFAULT_PALLETS,
  MIN_PALLETS,
  MAX_PALLETS
} from '~/lib/constants/index.js'

const SETTINGS_KEY = 'china_order_settings'

export const useSettingsStore = defineStore('settings', () => {

  // State
  const palletCount = ref(DEFAULT_PALLETS)
  const exportFormat = ref('optimized') // 'exact' or 'optimized'
  const startingMonth = ref(new Date().getMonth()) // 0-11
  const orderWeekOffset = ref(0) // 0-20 weeks from current week
  const currentView = ref('builder') // 'builder', 'forecast'
  const liveSalesRates = ref({
    WEEKLY_SALES_RATE: {
      King: 0,
      Queen: 0,
      Double: 0,
      'King Single': 0,
      Single: 0
    },
    FIRMNESS_DISTRIBUTION: {
      King: { firm: 0.13, medium: 0.84, soft: 0.03 },
      Queen: { firm: 0.13, medium: 0.84, soft: 0.03 },
      Double: { firm: 0.2, medium: 0.6, soft: 0.2 },
      'King Single': { firm: 0.2, medium: 0.6, soft: 0.2 },
      Single: { firm: 0.2, medium: 0.6, soft: 0.2 }
    },
    MICRO_COIL_WEEKLY_DEMAND: { King: 0, Queen: 0 },
    THIN_LATEX_WEEKLY_DEMAND: { King: 0, Queen: 0 }
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

  const isBuilderView = computed(() => currentView.value === 'builder')

  const isForecastView = computed(() => currentView.value === 'forecast')

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

  const setCurrentView = (view) => {
    currentView.value = view
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

  const setLiveSalesRates = (weeklyRates, firmnessDistribution, microCoilDemand, thinLatexDemand) => {
    liveSalesRates.value.WEEKLY_SALES_RATE = { ...weeklyRates }
    if (firmnessDistribution) {
      // Convert percentage (0-100) to decimal (0-1)
      for (const size of Object.keys(firmnessDistribution)) {
        liveSalesRates.value.FIRMNESS_DISTRIBUTION[size] = {
          firm: (firmnessDistribution[size]?.firm || 0) / 100,
          medium: (firmnessDistribution[size]?.medium || 0) / 100,
          soft: (firmnessDistribution[size]?.soft || 0) / 100
        }
      }
    }
    if (microCoilDemand) {
      liveSalesRates.value.MICRO_COIL_WEEKLY_DEMAND = { ...microCoilDemand }
    }
    if (thinLatexDemand) {
      liveSalesRates.value.THIN_LATEX_WEEKLY_DEMAND = { ...thinLatexDemand }
    }
    liveSalesLoaded.value = true
  }

  const resetToDefaults = () => {
    palletCount.value = DEFAULT_PALLETS
    exportFormat.value = 'optimized'
    startingMonth.value = new Date().getMonth()
    currentView.value = 'builder'
    saveToStorage()
  }

  return {
    // State
    palletCount,
    exportFormat,
    startingMonth,
    orderWeekOffset,
    currentView,
    liveSalesRates,
    liveSalesLoaded,
    // Getters
    isMinPallets,
    isMaxPallets,
    palletConstraints,
    isExactFormat,
    isBuilderView,
    isForecastView,
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
    setCurrentView,
    loadFromStorage,
    saveToStorage,
    setLiveSalesRates,
    resetToDefaults
  }
})
