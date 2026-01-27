/**
 * Composable for fetching spring inventory from Directus (READ ONLY)
 */

const SKU_MAP = {
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

export function useSpringInventory() {
  const { getItems } = useDirectusItems()

  const springs = ref({
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  })

  const loading = ref(true)
  const error = ref(null)

  const fetchSprings = async () => {
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

      // Reset springs to defaults first
      springs.value = {
        firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
        soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
      }

      // Map Directus data to springs structure
      items.forEach(item => {
        const mapping = SKU_MAP[item.sku]
        if (mapping) {
          springs.value[mapping.firmness][mapping.size] = Number(item.quantity) || 0
        }
      })
    } catch (e) {
      error.value = e.message
      console.error('Failed to fetch spring inventory:', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch on mount
  onMounted(fetchSprings)

  return {
    springs: readonly(springs),  // READ ONLY
    loading,
    error,
    refresh: fetchSprings
  }
}
