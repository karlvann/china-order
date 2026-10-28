export const useArchiveOrdersStore = defineStore('archiveOrders', () => {
  const { getItems } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchOrders = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await getItems({
        collection: 'inventory_orders',
        params: {
          filter: {
            applied_to_stock: { _eq: true }
          },
          fields: [
            'id',
            'order_date',
            'expected_arrival',
            'order_location',
            'notes',
            'ordered',
            'applied_to_stock',
            'date_updated',
            'proforma.id',
            'proforma.filename_download',
            'proforma.type',
            'proforma.filesize',
            'skus.id',
            'skus.skus_id.id',
            'skus.skus_id.sku',
            'skus.skus_id.name',
            'skus.skus_id.size',
            'skus.quantity'
          ],
          sort: ['-date_updated'],
          limit: -1
        }
      })

      orders.value = Array.isArray(response) ? response : (response?.data || [])
      return { success: true }
    } catch (fetchError) {
      if (await handleDirectusAuthError(fetchError)) {
        return { success: false, error: fetchError }
      }

      error.value = getDirectusErrorMessage(fetchError, 'Failed to fetch archived orders')
      return { success: false, error: fetchError }
    } finally {
      loading.value = false
    }
  }

  const getOrderById = (id) => {
    return orders.value.find(order => String(order.id) === String(id)) || null
  }

  const getOrderTotalQuantity = (order) => {
    if (!order?.skus) return 0
    return order.skus.reduce((sum, item) => sum + (item.quantity || 0), 0)
  }

  return {
    orders,
    loading,
    error,
    fetchOrders,
    getOrderById,
    getOrderTotalQuantity
  }
})
