import {
  createEmptySpringInventory,
  createEmptyComponentInventory
} from '~/lib/utils/inventory.js'

export const useInventoryStore = defineStore('inventory', () => {

  // State
  const springs = ref(createEmptySpringInventory())
  const components = ref(createEmptyComponentInventory())
  const springsLoading = ref(true)
  const springsError = ref(null)

  // Getters
  const fullInventory = computed(() => ({
    springs: springs.value,
    components: components.value
  }))

  const isLoaded = computed(() => !springsLoading.value)

  const hasError = computed(() => springsError.value !== null)

  // Actions
  const getTotalSpringsForSize = (size) => {
    return ['firm', 'medium', 'soft'].reduce(
      (sum, firmness) => sum + (springs.value[firmness][size] || 0),
      0
    )
  }

  const getTotalComponentsForType = (componentId) => {
    const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
    return sizes.reduce(
      (sum, size) => sum + (components.value[componentId]?.[size] || 0),
      0
    )
  }

  const setSprings = (springData) => {
    springs.value = springData
  }

  const setSpringsLoading = (loading) => {
    springsLoading.value = loading
  }

  const setSpringsError = (error) => {
    springsError.value = error
  }

  const saveComponentsToStorage = () => {
    try {
      localStorage.setItem('china_order_components', JSON.stringify(components.value))
    } catch (e) {
      console.error('Failed to save components:', e)
    }
  }

  const updateComponent = (componentId, size, value) => {
    if (components.value[componentId]) {
      components.value[componentId][size] = parseInt(value) || 0
      saveComponentsToStorage()
    }
  }

  const setComponents = (newComponents) => {
    components.value = newComponents
  }

  const loadComponentsFromStorage = () => {
    try {
      const saved = localStorage.getItem('china_order_components')
      if (saved) {
        components.value = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load components:', e)
    }
  }

  const resetComponents = () => {
    components.value = createEmptyComponentInventory()
    saveComponentsToStorage()
  }

  return {
    // State
    springs,
    components,
    springsLoading,
    springsError,
    // Getters
    fullInventory,
    isLoaded,
    hasError,
    // Actions
    getTotalSpringsForSize,
    getTotalComponentsForType,
    setSprings,
    setSpringsLoading,
    setSpringsError,
    updateComponent,
    setComponents,
    loadComponentsFromStorage,
    saveComponentsToStorage,
    resetComponents
  }
})
