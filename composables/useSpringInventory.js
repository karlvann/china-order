/**
 * Composable for fetching spring inventory from Directus (READ ONLY)
 */

import {
  SPRING_INVENTORY_SKU_MAP,
  createEmptySpringInventory
} from '~/lib/utils/index.js'

export const useSpringInventory = (options = {}) => {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const enabled = computed(() => {
    if (options.enabled === undefined) return true
    if (typeof options.enabled === 'boolean') return options.enabled
    return !!options.enabled.value
  })

  const springs = ref(createEmptySpringInventory())
  const loading = ref(false)
  const error = ref(null)

  const fetchSprings = async () => {
    if (!enabled.value) {
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const skuNames = Object.keys(SPRING_INVENTORY_SKU_MAP)
      const response = await getItems({
        collection: 'skus',
        params: {
          filter: {
            sku: { _in: skuNames }
          },
          fields: ['sku', 'quantity']
        }
      })

      const items = Array.isArray(response) ? response : (response?.data || [])
      const nextSprings = createEmptySpringInventory()

      items.forEach(item => {
        const mapping = SPRING_INVENTORY_SKU_MAP[item.sku]
        if (mapping) {
          nextSprings[mapping.firmness][mapping.size] = Number(item.quantity) || 0
        }
      })

      springs.value = nextSprings
    } catch (e) {
      if (await handleDirectusAuthError(e)) return

      error.value = getDirectusErrorMessage(e, 'Failed to fetch spring inventory')
      console.error('Failed to fetch spring inventory:', e)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (enabled.value) {
      fetchSprings()
    }
  })

  watch(enabled, (isEnabled) => {
    if (isEnabled) {
      fetchSprings()
      return
    }

    loading.value = false
    error.value = null
  })

  return {
    springs: readonly(springs),
    loading,
    error,
    refresh: fetchSprings
  }
}
