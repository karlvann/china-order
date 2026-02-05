/**
 * Composable for fetching latex inventory from Directus
 *
 * Fetches current stock levels for all 6 latex SKUs and structures
 * the data by firmness and size for use in the ordering algorithm.
 */

import {
  LATEX_SKUS,
  LATEX_FIRMNESSES,
  LATEX_SIZES
} from '~/lib/constants/index.js'

/**
 * SKU string to firmness/size mapping
 */
const SKU_MAP = {
  latexfirmking: { firmness: 'firm', size: 'King' },
  latexfirmqueen: { firmness: 'firm', size: 'Queen' },
  latexmediumking: { firmness: 'medium', size: 'King' },
  latexmediumqueen: { firmness: 'medium', size: 'Queen' },
  latexsoftking: { firmness: 'soft', size: 'King' },
  latexsoftqueen: { firmness: 'soft', size: 'Queen' }
}

/**
 * Create empty inventory structure
 */
function createEmptyInventory() {
  const inventory = {}
  for (const firmness of LATEX_FIRMNESSES) {
    inventory[firmness] = {}
    for (const size of LATEX_SIZES) {
      inventory[firmness][size] = 0
    }
  }
  return inventory
}

export function useLatexInventory() {
  const { getItems } = useDirectusItems()

  const loading = ref(true)
  const error = ref(null)

  // Structured inventory by firmness and size
  const inventory = ref(createEmptyInventory())

  // Raw SKU data from Directus
  const rawSkuData = ref([])

  // Total inventory count
  const totalInventory = ref(0)

  async function fetchInventory() {
    loading.value = true
    error.value = null

    try {
      // Fetch latex SKUs from Directus
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

      // Build structured inventory
      const inv = createEmptyInventory()
      let total = 0

      for (const sku of skus) {
        const mapping = SKU_MAP[sku.sku]
        if (mapping) {
          const qty = sku.quantity || 0
          inv[mapping.firmness][mapping.size] = qty
          total += qty
        }
      }

      inventory.value = inv
      totalInventory.value = total

      console.log('[Latex Inventory] Loaded:', inv)
      console.log('[Latex Inventory] Total:', total)

    } catch (e) {
      error.value = e.message
      console.error('[Latex Inventory] Failed to fetch:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Get quantity for a specific firmness and size
   */
  function getQuantity(firmness, size) {
    return inventory.value[firmness]?.[size] || 0
  }

  /**
   * Get total quantity for a size (all firmnesses)
   */
  function getTotalForSize(size) {
    let total = 0
    for (const firmness of LATEX_FIRMNESSES) {
      total += inventory.value[firmness]?.[size] || 0
    }
    return total
  }

  /**
   * Get total quantity for a firmness (all sizes)
   */
  function getTotalForFirmness(firmness) {
    let total = 0
    for (const size of LATEX_SIZES) {
      total += inventory.value[firmness]?.[size] || 0
    }
    return total
  }

  /**
   * Get SKU ID by sku string
   */
  function getSkuId(skuString) {
    const found = rawSkuData.value.find(s => s.sku === skuString)
    return found?.id || null
  }

  /**
   * Get all SKU IDs mapped to their sku strings
   */
  function getSkuIdMap() {
    const map = {}
    for (const sku of rawSkuData.value) {
      map[sku.sku] = sku.id
    }
    return map
  }

  // Fetch on mount
  onMounted(fetchInventory)

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
