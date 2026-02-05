/**
 * Pinia store for Sri Lanka ordering settings
 * Completely separate from China settings to avoid conflicts
 */

import {
  CONTAINER_40FT,
  CONTAINER_20FT,
  DEFAULT_CONTAINER_SIZE,
  LATEX_LEAD_TIME_WEEKS,
  CONTAINER_CAPACITY
} from '~/lib/constants/index.js'

const SETTINGS_KEY = 'sri_lanka_order_settings'

export const useSriLankaSettingsStore = defineStore('sriLankaSettings', () => {

  // State
  const containerSize = ref(DEFAULT_CONTAINER_SIZE) // '40ft' or '20ft'
  const orderWeekOffset = ref(0) // 0-20 weeks from current week
  const deliveryWeeks = ref(LATEX_LEAD_TIME_WEEKS) // Default 10 weeks
  const useSeasonalDemand = ref(true) // Apply seasonal multipliers to forecast

  // Live sales data (populated by useLatexSales)
  const latexSalesRates = ref({
    WEEKLY_TOTAL_BY_SIZE: { King: 0, Queen: 0 },
    WEEKLY_RATES: {
      firm: { King: 0, Queen: 0 },
      medium: { King: 0, Queen: 0 },
      soft: { King: 0, Queen: 0 }
    },
    FIRMNESS_DISTRIBUTION: {
      King: { firm: 0.33, medium: 0.34, soft: 0.33 },
      Queen: { firm: 0.33, medium: 0.34, soft: 0.33 }
    }
  })
  const latexSalesLoaded = ref(false)

  // Getters
  const containerCapacity = computed(() => CONTAINER_CAPACITY[containerSize.value] || CONTAINER_40FT)

  const is40ft = computed(() => containerSize.value === '40ft')

  const is20ft = computed(() => containerSize.value === '20ft')

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
        containerSize: containerSize.value,
        deliveryWeeks: deliveryWeeks.value,
        useSeasonalDemand: useSeasonalDemand.value
      }))
    } catch (e) {
      console.error('[Sri Lanka Settings] Failed to save:', e)
    }
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.containerSize) containerSize.value = data.containerSize
        if (data.deliveryWeeks !== undefined) deliveryWeeks.value = data.deliveryWeeks
        if (data.useSeasonalDemand !== undefined) useSeasonalDemand.value = data.useSeasonalDemand
      }
    } catch (e) {
      console.error('[Sri Lanka Settings] Failed to load:', e)
    }
  }

  const setContainerSize = (size) => {
    if (size === '40ft' || size === '20ft') {
      containerSize.value = size
      saveToStorage()
    }
  }

  const toggleContainerSize = () => {
    containerSize.value = containerSize.value === '40ft' ? '20ft' : '40ft'
    saveToStorage()
  }

  const setOrderWeekOffset = (offset) => {
    orderWeekOffset.value = Math.max(-10, Math.min(20, offset))
  }

  const setDeliveryWeeks = (weeks) => {
    deliveryWeeks.value = Math.max(1, Math.min(15, weeks))
    saveToStorage()
  }

  const setUseSeasonalDemand = (value) => {
    useSeasonalDemand.value = value
    saveToStorage()
  }

  const toggleSeasonalDemand = () => {
    useSeasonalDemand.value = !useSeasonalDemand.value
    saveToStorage()
  }

  const setLatexSalesRates = (weeklyTotals, weeklyRates, firmnessDistribution) => {
    latexSalesRates.value.WEEKLY_TOTAL_BY_SIZE = { ...weeklyTotals }

    if (weeklyRates) {
      latexSalesRates.value.WEEKLY_RATES = JSON.parse(JSON.stringify(weeklyRates))
    }

    if (firmnessDistribution) {
      // Convert percentage (0-100) to decimal (0-1)
      for (const size of ['King', 'Queen']) {
        latexSalesRates.value.FIRMNESS_DISTRIBUTION[size] = {
          firm: (firmnessDistribution[size]?.firm || 0) / 100,
          medium: (firmnessDistribution[size]?.medium || 0) / 100,
          soft: (firmnessDistribution[size]?.soft || 0) / 100
        }
      }
    }

    latexSalesLoaded.value = true
  }

  const resetToDefaults = () => {
    containerSize.value = DEFAULT_CONTAINER_SIZE
    orderWeekOffset.value = 0
    deliveryWeeks.value = LATEX_LEAD_TIME_WEEKS
    useSeasonalDemand.value = true
    saveToStorage()
  }

  return {
    // State
    containerSize,
    orderWeekOffset,
    deliveryWeeks,
    useSeasonalDemand,
    latexSalesRates,
    latexSalesLoaded,
    // Getters
    containerCapacity,
    is40ft,
    is20ft,
    currentWeekNumber,
    orderWeekNumber,
    // Actions
    setContainerSize,
    toggleContainerSize,
    setOrderWeekOffset,
    setDeliveryWeeks,
    setUseSeasonalDemand,
    toggleSeasonalDemand,
    setLatexSalesRates,
    loadFromStorage,
    saveToStorage,
    resetToDefaults
  }
})
