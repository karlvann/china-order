import { createEmptyLatexInventory } from '~/lib/utils/index.js'

const clone = (value) => JSON.parse(JSON.stringify(value))

export const useSriLankaInventoryStore = defineStore('sriLankaInventory', () => {
  const inventory = ref(createEmptyLatexInventory())
  const loading = ref(false)
  const error = ref(null)

  const setInventory = (value) => {
    inventory.value = clone(value || createEmptyLatexInventory())
  }

  const setLoading = (value) => {
    loading.value = value
  }

  const setError = (value) => {
    error.value = value
  }

  const resetInventory = () => {
    inventory.value = createEmptyLatexInventory()
  }

  return {
    inventory,
    loading,
    error,
    setInventory,
    setLoading,
    setError,
    resetInventory
  }
})
