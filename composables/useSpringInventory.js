/**
 * Composable for fetching spring inventory from Directus (READ ONLY)
 */

import { createEmptySpringInventory } from '~/lib/utils/index.js'

const SKU_MAP = {
  springsveryfirmking: { firmness: 'veryfirm', size: 'King' },
  springsveryfirmqueen: { firmness: 'veryfirm', size: 'Queen' },
  springsveryfirmdouble: { firmness: 'veryfirm', size: 'Double' },
  springsveryfirmkingsingle: { firmness: 'veryfirm', size: 'King Single' },
  springsveryfirmsingle: { firmness: 'veryfirm', size: 'Single' },
  springsfirmking: { firmness: 'firm', size: 'King' },
  springsfirmqueen: { firmness: 'firm', size: 'Queen' },
  springsfirmdouble: { firmness: 'firm', size: 'Double' },
  springsfirmkingsingle: { firmness: 'firm', size: 'King Single' },
  springsfirmsingle: { firmness: 'firm', size: 'Single' },
  springsmediumking: { firmness: 'medium', size: 'King' },
  springsmediumqueen: { firmness: 'medium', size: 'Queen' },
  springsmediumdouble: { firmness: 'medium', size: 'Double' },
  springsmediumkingsingle: { firmness: 'medium', size: 'King Single' },
  springsmediumsingle: { firmness: 'medium', size: 'Single' },
  springssoftking: { firmness: 'soft', size: 'King' },
  springssoftqueen: { firmness: 'soft', size: 'Queen' },
  springssoftdouble: { firmness: 'soft', size: 'Double' },
  springssoftkingsingle: { firmness: 'soft', size: 'King Single' },
  springssoftsingle: { firmness: 'soft', size: 'Single' }
}

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
      const skuNames = Object.keys(SKU_MAP)
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
        const mapping = SKU_MAP[item.sku]
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
