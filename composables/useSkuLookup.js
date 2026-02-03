/**
 * Composable for SKU lookup - maps between SKU strings and Directus IDs
 * Used for creating inventory orders with M2M relationships
 */

// Combined SKU mappings from springs and components
const SPRING_SKUS = [
  'springsfirmking', 'springsfirmqueen', 'springsfirmdouble', 'springsfirmkingsingle', 'springsfirmsingle',
  'springsmediumking', 'springsmediumqueen', 'springsmediumdouble', 'springsmediumkingsingle', 'springsmediumsingle',
  'springssoftking', 'springssoftqueen', 'springssoftdouble', 'springssoftkingsingle', 'springssoftsingle'
]

const COMPONENT_SKUS = [
  'microcoilsking', 'microcoilsqueen',
  'thinlatexking', 'thinlatexqueen',
  'feltking', 'feltqueen', 'feltdouble', 'feltkingsingle', 'feltsingle',
  'paneltopking', 'paneltopqueen', 'paneltopdouble', 'paneltopkingsingle', 'paneltopsingle',
  'panelbottomking', 'panelbottomqueen', 'panelbottomdouble', 'panelbottomkingsingle', 'panelbottomsingle',
  'panelsideking', 'panelsidequeen', 'panelsidedouble'
]

// Singleton state - fetched once and shared
let skuCache = null
let fetchPromise = null

export function useSkuLookup() {
  const { getItems } = useDirectusItems()

  const skuMap = ref(new Map())
  const loading = ref(false)
  const error = ref(null)

  const fetchSkus = async () => {
    // Return cached data if available
    if (skuCache) {
      skuMap.value = skuCache
      return
    }

    // If already fetching, wait for that promise
    if (fetchPromise) {
      await fetchPromise
      skuMap.value = skuCache
      return
    }

    loading.value = true
    error.value = null

    fetchPromise = (async () => {
      try {
        const allSkuNames = [...SPRING_SKUS, ...COMPONENT_SKUS]
        const response = await getItems({
          collection: 'skus',
          params: {
            filter: {
              sku: { _in: allSkuNames }
            },
            fields: ['id', 'sku', 'size', 'name', 'quantity']
          }
        })

        const items = Array.isArray(response) ? response : (response?.data || [])

        const map = new Map()
        items.forEach(item => {
          map.set(item.sku, {
            id: item.id,
            sku: item.sku,
            size: item.size,
            name: item.name,
            quantity: item.quantity,
            isSpring: SPRING_SKUS.includes(item.sku),
            isComponent: COMPONENT_SKUS.includes(item.sku)
          })
        })

        skuCache = map
        skuMap.value = map
      } catch (e) {
        error.value = e.message
        console.error('Failed to fetch SKU lookup:', e)
      } finally {
        loading.value = false
        fetchPromise = null
      }
    })()

    await fetchPromise
  }

  // Get Directus ID by SKU string
  const getSkuId = (skuString) => {
    const skuData = skuMap.value.get(skuString)
    return skuData?.id || null
  }

  // Get full SKU data by SKU string
  const getSkuData = (skuString) => {
    return skuMap.value.get(skuString) || null
  }

  // Get all spring SKUs
  const springSkus = computed(() => {
    return Array.from(skuMap.value.values()).filter(sku => sku.isSpring)
  })

  // Get all component SKUs
  const componentSkus = computed(() => {
    return Array.from(skuMap.value.values()).filter(sku => sku.isComponent)
  })

  // Get all SKUs as array
  const allSkus = computed(() => {
    return Array.from(skuMap.value.values())
  })

  // Fetch on first use
  onMounted(fetchSkus)

  return {
    skuMap: readonly(skuMap),
    loading,
    error,
    fetchSkus,
    getSkuId,
    getSkuData,
    springSkus,
    componentSkus,
    allSkus
  }
}
