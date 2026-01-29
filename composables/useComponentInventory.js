/**
 * Composable for fetching component inventory from Directus (READ ONLY)
 */

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

export function useComponentInventory() {
  const { getItems } = useDirectusItems()

  const components = ref({
    micro_coils: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    thin_latex: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    felt: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    top_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    bottom_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    side_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  })

  const loading = ref(true)
  const error = ref(null)

  const fetchComponents = async () => {
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

      // Handle both direct array and { data: [] } response formats
      const items = Array.isArray(response) ? response : (response?.data || [])

      // Reset components to defaults first
      components.value = {
        micro_coils: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        thin_latex: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        felt: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        top_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        bottom_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        side_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      }

      // Map Directus data to components structure
      items.forEach(item => {
        const mapping = SKU_MAP[item.sku]
        if (mapping) {
          components.value[mapping.component][mapping.size] = Number(item.quantity) || 0
        }
      })
    } catch (e) {
      error.value = e.message
      console.error('Failed to fetch component inventory:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch on mount
  onMounted(fetchComponents)

  return {
    components: readonly(components),  // READ ONLY
    loading,
    error,
    refresh: fetchComponents
  }
}
