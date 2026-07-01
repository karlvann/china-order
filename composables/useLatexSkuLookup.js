import { LATEX_SKUS } from '~/lib/constants/index.js'

let skuCache = null
let fetchPromise = null

export const useLatexSkuLookup = () => {
  const { getItems } = useDirectusItems()

  const skuMap = ref(new Map())
  const loading = ref(false)
  const error = ref(null)

  const fetchSkus = async () => {
    if (skuCache) {
      skuMap.value = skuCache
      return
    }

    if (fetchPromise) {
      await fetchPromise
      skuMap.value = skuCache || new Map()
      return
    }

    loading.value = true
    error.value = null

    fetchPromise = (async () => {
      try {
        const response = await getItems({
          collection: 'skus',
          params: {
            filter: {
              sku: { _in: LATEX_SKUS }
            },
            fields: ['id', 'sku', 'name', 'size']
          }
        })

        const items = Array.isArray(response) ? response : (response?.data || [])
        const map = new Map()

        items.forEach(item => {
          map.set(item.sku, {
            id: item.id,
            sku: item.sku,
            name: item.name,
            size: item.size
          })
        })

        skuCache = map
        skuMap.value = map
      } catch (e) {
        error.value = e.message
        console.error('[Latex SKU lookup] Failed to fetch:', e)
      } finally {
        loading.value = false
        fetchPromise = null
      }
    })()

    await fetchPromise
  }

  const getSkuId = (skuString) => {
    return skuMap.value.get(skuString)?.id || null
  }

  const getSkuData = (skuString) => {
    return skuMap.value.get(skuString) || null
  }

  const getSkuIdMap = () => {
    const map = {}
    skuMap.value.forEach((skuData, skuString) => {
      map[skuString] = skuData.id
    })
    return map
  }

  const allSkus = computed(() => Array.from(skuMap.value.values()))

  onMounted(fetchSkus)

  return {
    skuMap: readonly(skuMap),
    loading,
    error,
    fetchSkus,
    getSkuId,
    getSkuData,
    getSkuIdMap,
    allSkus
  }
}
