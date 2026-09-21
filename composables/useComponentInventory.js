/**
 * Composable for fetching component inventory from Directus (READ ONLY)
 */

import {
  COMPONENT_INVENTORY_SKU_MAP,
  createEmptyComponentInventory
} from '~/lib/utils/index.js'

export const useComponentInventory = (options = {}) => {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const enabled = computed(() => {
    if (options.enabled === undefined) return true
    if (typeof options.enabled === 'boolean') return options.enabled
    return !!options.enabled.value
  })

  const components = ref(createEmptyComponentInventory())
  const loading = ref(false)
  const error = ref(null)

  const fetchComponents = async () => {
    if (!enabled.value) {
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const skuNames = Object.keys(COMPONENT_INVENTORY_SKU_MAP)
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
      const nextComponents = createEmptyComponentInventory()

      items.forEach(item => {
        const mapping = COMPONENT_INVENTORY_SKU_MAP[item.sku]
        if (mapping) {
          nextComponents[mapping.component][mapping.size] = Number(item.quantity) || 0
        }
      })

      components.value = nextComponents
    } catch (e) {
      if (await handleDirectusAuthError(e)) return

      error.value = getDirectusErrorMessage(e, 'Failed to fetch component inventory')
      console.error('Failed to fetch component inventory:', e)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (enabled.value) {
      fetchComponents()
    }
  })

  watch(enabled, (isEnabled) => {
    if (isEnabled) {
      fetchComponents()
      return
    }

    loading.value = false
    error.value = null
  })

  return {
    components: readonly(components),
    loading,
    error,
    refresh: fetchComponents
  }
}
