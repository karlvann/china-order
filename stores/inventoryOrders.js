/**
 * Pinia store for inventory orders
 * Stores orders in shared state so all components can access them
 */

export const useInventoryOrdersStore = defineStore('inventoryOrders', () => {
  const { getItems, createItems, updateItem, deleteItems } = useDirectusItems()

  // State
  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get week index for a date relative to a reference Monday
   */
  const getWeekIndex = (dateString, referenceMonday) => {
    const date = new Date(dateString)
    const diffMs = date - referenceMonday
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  }

  /**
   * Fetch all china orders with M2M SKU data expanded
   */
  const fetchOrders = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await getItems({
        collection: 'inventory_orders',
        params: {
          filter: {
            order_location: { _eq: 'china' }
          },
          fields: ['id', 'order_date', 'expected_arrival', 'order_location', 'notes', 'ordered', 'date_updated', 'skus.id', 'skus.skus_id.id', 'skus.skus_id.sku', 'skus.skus_id.size', 'skus.skus_id.name', 'skus.quantity'],
          sort: ['-expected_arrival']
        }
      })

      const items = Array.isArray(response) ? response : (response?.data || [])
      orders.value = items
    } catch (e) {
      error.value = e.message
      console.error('Failed to fetch inventory orders:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new inventory order
   */
  const createOrder = async (orderData, skuItems) => {
    loading.value = true
    error.value = null

    try {
      const orderPayload = {
        order_date: orderData.order_date,
        expected_arrival: orderData.expected_arrival,
        order_location: 'china',
        notes: orderData.notes || '',
        ordered: orderData.ordered || false,
        skus: skuItems.filter(item => item.quantity > 0).map(item => ({
          skus_id: item.skus_id,
          quantity: item.quantity
        }))
      }

      const response = await createItems({
        collection: 'inventory_orders',
        items: [orderPayload]
      })

      const created = Array.isArray(response) ? response[0] : response
      await fetchOrders()
      return created
    } catch (e) {
      error.value = e.message
      console.error('Failed to create inventory order:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing inventory order
   */
  const updateOrder = async (id, orderData, skuItems) => {
    loading.value = true
    error.value = null

    try {
      const orderPayload = {
        order_date: orderData.order_date,
        expected_arrival: orderData.expected_arrival,
        notes: orderData.notes || '',
        ordered: orderData.ordered || false,
        skus: skuItems.filter(item => item.quantity > 0).map(item => ({
          skus_id: item.skus_id,
          quantity: item.quantity
        }))
      }

      const response = await updateItem({
        collection: 'inventory_orders',
        id,
        item: orderPayload
      })

      await fetchOrders()
      return response
    } catch (e) {
      error.value = e.message
      console.error('Failed to update inventory order:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete an inventory order
   */
  const deleteOrder = async (id) => {
    loading.value = true
    error.value = null

    try {
      await deleteItems({
        collection: 'inventory_orders',
        items: [String(id)]
      })

      await fetchOrders()
      return true
    } catch (e) {
      error.value = e.message
      console.error('Failed to delete inventory order:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get order by ID from cached orders
   */
  const getOrderById = (id) => {
    return orders.value.find(order => String(order.id) === String(id)) || null
  }

  /**
   * Get orders arriving within a specific week index
   */
  const getOrdersArrivingInWeek = (weekIndex, referenceMonday) => {
    return orders.value.filter(order => {
      const orderWeekIndex = getWeekIndex(order.expected_arrival, referenceMonday)
      return orderWeekIndex === weekIndex
    })
  }

  /**
   * Get quantity of a specific SKU from an order
   */
  const getOrderSkuQuantity = (order, skuString) => {
    if (!order.skus) return 0
    const skuItem = order.skus.find(item => item.skus_id?.sku === skuString)
    return skuItem?.quantity || 0
  }

  /**
   * Get total quantity of all SKUs in an order
   */
  const getOrderTotalQuantity = (order) => {
    if (!order.skus) return 0
    return order.skus.reduce((sum, item) => sum + (item.quantity || 0), 0)
  }

  /**
   * Get spring quantity from an order for a specific firmness/size
   */
  const getOrderSpringQuantity = (order, firmness, size) => {
    const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
    return getOrderSkuQuantity(order, skuString)
  }

  /**
   * Get component quantity from an order for a specific component/size
   */
  const getOrderComponentQuantity = (order, component, size) => {
    const componentToSku = {
      micro_coils: 'microcoils',
      thin_latex: 'thinlatex',
      felt: 'felt',
      top_panel: 'paneltop',
      bottom_panel: 'panelbottom',
      side_panel: 'panelside'
    }
    const prefix = componentToSku[component] || component
    const skuString = `${prefix}${size.toLowerCase().replace(' ', '')}`
    return getOrderSkuQuantity(order, skuString)
  }

  // Computed: pending orders (expected arrival in future), sorted by expected_arrival
  const pendingOrders = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.value
      .filter(order => new Date(order.expected_arrival) >= today)
      .sort((a, b) => new Date(a.expected_arrival) - new Date(b.expected_arrival))
  })

  /**
   * Get the letter label for an order (A, B, C, etc.) based on expected_arrival (earliest = A)
   */
  const getOrderLetter = (orderId) => {
    const index = pendingOrders.value.findIndex(o => String(o.id) === String(orderId))
    if (index === -1) return '?'
    return String.fromCharCode(65 + index) // 65 = 'A'
  }

  // Computed: past orders (already arrived)
  const pastOrders = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.value.filter(order => new Date(order.expected_arrival) < today)
  })

  return {
    // State
    orders,
    loading,
    error,
    // Computed
    pendingOrders,
    pastOrders,
    // Actions
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    getOrderLetter,
    getOrdersArrivingInWeek,
    getOrderSkuQuantity,
    getOrderTotalQuantity,
    getOrderSpringQuantity,
    getOrderComponentQuantity,
    getWeekIndex
  }
})
