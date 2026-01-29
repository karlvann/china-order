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
  const componentsLoading = ref(true)
  const componentsError = ref(null)

  // Getters
  const fullInventory = computed(() => ({
    springs: springs.value,
    components: components.value
  }))

  const isLoaded = computed(() => !springsLoading.value && !componentsLoading.value)

  const hasError = computed(() => springsError.value !== null || componentsError.value !== null)

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

  const setComponents = (componentData) => {
    components.value = componentData
  }

  const setComponentsLoading = (loading) => {
    componentsLoading.value = loading
  }

  const setComponentsError = (error) => {
    componentsError.value = error
  }

  const resetComponents = () => {
    components.value = createEmptyComponentInventory()
  }

  return {
    // State
    springs,
    components,
    springsLoading,
    springsError,
    componentsLoading,
    componentsError,
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
    setComponents,
    setComponentsLoading,
    setComponentsError,
    resetComponents
  }
})
