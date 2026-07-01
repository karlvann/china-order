/**
 * Composable for fetching component inventory from Directus (READ ONLY)
 */

import { createEmptyComponentInventory } from '~/lib/utils/index.js'

const SKU_MAP = {
  // Micro Coils (King/Queen only)
  microcoilsking: { component: 'micro_coils', size: 'King' },
  microcoilsqueen: { component: 'micro_coils', size: 'Queen' },

  // Thin Latex (King/Queen only)
  thinlatexking: { component: 'thin_latex', size: 'King' },
  thinlatexqueen: { component: 'thin_latex', size: 'Queen' },

  // Felt (all sizes)
  feltking: { component: 'felt', size: 'King' },
  feltqueen: { component: 'felt', size: 'Queen' },
  feltdouble: { component: 'felt', size: 'Double' },
  feltkingsingle: { component: 'felt', size: 'King Single' },
  feltsingle: { component: 'felt', size: 'Single' },

  // Top Panel (all sizes)
  paneltopking: { component: 'top_panel', size: 'King' },
  paneltopqueen: { component: 'top_panel', size: 'Queen' },
  paneltopdouble: { component: 'top_panel', size: 'Double' },
  paneltopkingsingle: { component: 'top_panel', size: 'King Single' },
  paneltopsingle: { component: 'top_panel', size: 'Single' },

  // Bottom Panel (all sizes)
  panelbottomking: { component: 'bottom_panel', size: 'King' },
  panelbottomqueen: { component: 'bottom_panel', size: 'Queen' },
  panelbottomdouble: { component: 'bottom_panel', size: 'Double' },
  panelbottomkingsingle: { component: 'bottom_panel', size: 'King Single' },
  panelbottomsingle: { component: 'bottom_panel', size: 'Single' },

  // Side Panel (King, Queen, Double only - Single/King Single use Double)
  panelsideking: { component: 'side_panel', size: 'King' },
  panelsidequeen: { component: 'side_panel', size: 'Queen' },
  panelsidedouble: { component: 'side_panel', size: 'Double' }
}

export const useComponentInventory = (options = {}) => {
  const { getItems } = useDirectusItems()

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
      const nextComponents = createEmptyComponentInventory()

      items.forEach(item => {
        const mapping = SKU_MAP[item.sku]
        if (mapping) {
          nextComponents[mapping.component][mapping.size] = Number(item.quantity) || 0
        }
      })

      components.value = nextComponents
    } catch (e) {
      error.value = e.message
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
