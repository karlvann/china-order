/**
 * Composable for fetching latex inventory from Directus
 *
 * Fetches current stock levels for mattress and pillow latex SKUs and structures
 * the data for use in the ordering algorithm.
 */

import {
  LATEX_SKUS,
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'
import {
  LATEX_INVENTORY_SKU_MAP,
  createEmptyLatexInventory
} from '~/lib/utils/index.js'

export const useLatexInventory = (options = {}) => {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const enabled = computed(() => {
    if (options.enabled === undefined) return true
    if (typeof options.enabled === 'boolean') return options.enabled
    return !!options.enabled.value
  })

  const loading = ref(false)
  const error = ref(null)

  // Structured inventory by firmness and size
  const inventory = ref(createEmptyLatexInventory())

  // Raw SKU data from Directus
  const rawSkuData = ref([])

  // Total inventory count
  const totalInventory = ref(0)

  const fetchInventory = async () => {
    if (!enabled.value) {
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await getItems({
        collection: 'skus',
        params: {
          filter: {
            sku: {
              _in: LATEX_SKUS
            }
          },
          fields: ['id', 'sku', 'name', 'size', 'quantity']
        }
      })

      const skus = Array.isArray(response) ? response : (response?.data || [])
      rawSkuData.value = skus

      const inv = createEmptyLatexInventory()
      let total = 0

      for (const sku of skus) {
        const mapping = LATEX_INVENTORY_SKU_MAP[sku.sku]
        if (mapping) {
          const qty = sku.quantity || 0
          if (mapping.pillowLatexType) {
            inv.pillowLatex[mapping.pillowLatexType] = qty
          } else {
            inv[mapping.firmness][mapping.size] = qty
          }
          total += qty
        }
      }

      inventory.value = inv
      totalInventory.value = total

      console.log('[Latex Inventory] Loaded:', inv)
      console.log('[Latex Inventory] Total:', total)
    } catch (e) {
      if (await handleDirectusAuthError(e)) return

      error.value = getDirectusErrorMessage(e, 'Failed to fetch latex inventory')
      console.error('[Latex Inventory] Failed to fetch:', e)
    } finally {
      loading.value = false
    }
  }

  const getQuantity = (firmness, size) => {
    return inventory.value[firmness]?.[size] || 0
  }

  const getTotalForSize = (size) => {
    let total = 0
    for (const firmness of LATEX_FIRMNESSES) {
      total += inventory.value[firmness]?.[size] || 0
    }
    return total
  }

  const getTotalForFirmness = (firmness) => {
    let total = 0
    for (const size of LATEX_SIZES) {
      total += inventory.value[firmness]?.[size] || 0
    }
    return total
  }

  const getSkuId = (skuString) => {
    const found = rawSkuData.value.find(s => s.sku === skuString)
    return found?.id || null
  }

  const getSkuIdMap = () => {
    const map = {}
    for (const sku of rawSkuData.value) {
      map[sku.sku] = sku.id
    }
    return map
  }

  onMounted(() => {
    if (enabled.value) {
      fetchInventory()
    }
  })

  watch(enabled, (isEnabled) => {
    if (isEnabled) {
      fetchInventory()
      return
    }

    loading.value = false
    error.value = null
  })

  return {
    loading: readonly(loading),
    error: readonly(error),
    inventory: readonly(inventory),
    rawSkuData: readonly(rawSkuData),
    totalInventory: readonly(totalInventory),
    getQuantity,
    getTotalForSize,
    getTotalForFirmness,
    getSkuId,
    getSkuIdMap,
    refresh: fetchInventory
  }
}
