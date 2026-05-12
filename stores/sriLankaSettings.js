/**
 * Pinia store for Sri Lanka ordering settings
 * Completely separate from China settings to avoid conflicts
 */

import {
  DEFAULT_LATEX_CAPACITY,
  LATEX_CAPACITY_STEP,
  MIN_LATEX_CAPACITY,
  LATEX_LEAD_TIME_WEEKS,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'

const SETTINGS_KEY = 'sri_lanka_order_settings'

export const useSriLankaSettingsStore = defineStore('sriLankaSettings', () => {

  // State
  const capacity = ref(DEFAULT_LATEX_CAPACITY)
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
    PILLOW_LATEX_WEEKLY_RATES: {
      thin: 0,
      thick: 0
    },
    FIRMNESS_DISTRIBUTION: {
      King: { firm: 0.33, medium: 0.34, soft: 0.33 },
      Queen: { firm: 0.33, medium: 0.34, soft: 0.33 }
    }
  })
  const latexSalesLoaded = ref(false)

  // Getters
  const containerCapacity = computed(() => capacity.value)

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
        capacity: capacity.value,
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
        if (data.capacity !== undefined) capacity.value = Math.max(MIN_LATEX_CAPACITY, parseInt(data.capacity, 10) || DEFAULT_LATEX_CAPACITY)
        if (data.deliveryWeeks !== undefined) deliveryWeeks.value = data.deliveryWeeks
        if (data.useSeasonalDemand !== undefined) useSeasonalDemand.value = data.useSeasonalDemand
      }
    } catch (e) {
      console.error('[Sri Lanka Settings] Failed to load:', e)
    }
  }

  const setCapacity = (value) => {
    capacity.value = Math.max(MIN_LATEX_CAPACITY, parseInt(value, 10) || DEFAULT_LATEX_CAPACITY)
    saveToStorage()
  }

  const incrementCapacity = () => {
    setCapacity(capacity.value + LATEX_CAPACITY_STEP)
  }

  const decrementCapacity = () => {
    setCapacity(capacity.value - LATEX_CAPACITY_STEP)
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

  const setLatexSalesRates = (weeklyTotals, weeklyRates, firmnessDistribution, pillowLatexWeeklyRates) => {
    latexSalesRates.value.WEEKLY_TOTAL_BY_SIZE = { ...weeklyTotals }

    if (weeklyRates) {
      latexSalesRates.value.WEEKLY_RATES = JSON.parse(JSON.stringify(weeklyRates))
    }

    if (pillowLatexWeeklyRates) {
      for (const type of PILLOW_LATEX_TYPES) {
        latexSalesRates.value.PILLOW_LATEX_WEEKLY_RATES[type] = pillowLatexWeeklyRates[type] || 0
      }
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
    capacity.value = DEFAULT_LATEX_CAPACITY
    orderWeekOffset.value = 0
    deliveryWeeks.value = LATEX_LEAD_TIME_WEEKS
    useSeasonalDemand.value = true
    saveToStorage()
  }

  return {
    // State
    capacity,
    orderWeekOffset,
    deliveryWeeks,
    useSeasonalDemand,
    latexSalesRates,
    latexSalesLoaded,
    // Getters
    containerCapacity,
    currentWeekNumber,
    orderWeekNumber,
    // Actions
    setCapacity,
    incrementCapacity,
    decrementCapacity,
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
