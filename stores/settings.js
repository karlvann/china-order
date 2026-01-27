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
  const currentView = ref('builder') // 'builder', 'forecast', 'forecastv2'
  const liveSalesRates = ref({
    MONTHLY_SALES_RATE: {
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
    }
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

  const isForecastV2View = computed(() => currentView.value === 'forecastv2')

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

  const setLiveSalesRates = (monthlyRates, firmnessDistribution) => {
    liveSalesRates.value.MONTHLY_SALES_RATE = { ...monthlyRates }
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
    isForecastV2View,
    // Actions
    setPalletCount,
    incrementPallets,
    decrementPallets,
    setExportFormat,
    toggleExportFormat,
    setStartingMonth,
    setCurrentView,
    loadFromStorage,
    saveToStorage,
    setLiveSalesRates,
    resetToDefaults
  }
})
