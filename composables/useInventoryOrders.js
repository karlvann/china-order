/**
 * Composable for CRUD operations on inventory_orders collection
 * Only fetches/creates orders with order_location = 'china'
 */

export function useInventoryOrders() {
  const { getItems, createItems, updateItem, deleteItems } = useDirectusItems()

  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Get the week index for a date relative to a reference Monday
   * @param {string} dateString - ISO date string
   * @param {Date} referenceMonday - The Monday to calculate from
   * @returns {number} Week index (0 = reference week, negative = past, positive = future)
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
          fields: ['id', 'order_date', 'expected_arrival', 'order_location', 'notes', 'date_updated', 'skus.id', 'skus.skus_id.id', 'skus.skus_id.sku', 'skus.skus_id.size', 'skus.skus_id.name', 'skus.quantity'],
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
   * @param {Object} orderData - Order fields (order_date, expected_arrival, notes)
   * @param {Array} skuItems - Array of { skus_id: number, quantity: number }
   * @returns {Object|null} Created order or null on error
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
      await fetchOrders() // Refresh the list
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
   * @param {number|string} id - Order ID
   * @param {Object} orderData - Order fields to update
   * @param {Array} skuItems - Array of { skus_id: number, quantity: number }
   * @returns {Object|null} Updated order or null on error
   */
  const updateOrder = async (id, orderData, skuItems) => {
    loading.value = true
    error.value = null

    try {
      const orderPayload = {
        order_date: orderData.order_date,
        expected_arrival: orderData.expected_arrival,
        notes: orderData.notes || '',
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

      await fetchOrders() // Refresh the list
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
   * @param {number|string} id - Order ID
   * @returns {boolean} Success status
   */
  const deleteOrder = async (id) => {
    loading.value = true
    error.value = null

    try {
      await deleteItems({
        collection: 'inventory_orders',
        items: [String(id)]
      })

      await fetchOrders() // Refresh the list
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
   * @param {number|string} id - Order ID
   * @returns {Object|null} Order or null if not found
   */
  const getOrderById = (id) => {
    return orders.value.find(order => String(order.id) === String(id)) || null
  }

  /**
   * Get orders arriving within a specific week index
   * @param {number} weekIndex - Week index relative to reference Monday
   * @param {Date} referenceMonday - The Monday to calculate from
   * @returns {Array} Orders arriving in that week
   */
  const getOrdersArrivingInWeek = (weekIndex, referenceMonday) => {
    return orders.value.filter(order => {
      const orderWeekIndex = getWeekIndex(order.expected_arrival, referenceMonday)
      return orderWeekIndex === weekIndex
    })
  }

  /**
   * Get quantity of a specific SKU from an order
   * @param {Object} order - Order object with expanded skus
   * @param {string} skuString - SKU string to look up
   * @returns {number} Quantity or 0 if not found
   */
  const getOrderSkuQuantity = (order, skuString) => {
    if (!order.skus) return 0
    const skuItem = order.skus.find(item => item.skus_id?.sku === skuString)
    return skuItem?.quantity || 0
  }

  /**
   * Get total quantity of all SKUs in an order
   * @param {Object} order - Order object with expanded skus
   * @returns {number} Total quantity
   */
  const getOrderTotalQuantity = (order) => {
    if (!order.skus) return 0
    return order.skus.reduce((sum, item) => sum + (item.quantity || 0), 0)
  }

  /**
   * Get spring quantity from an order for a specific firmness/size
   * @param {Object} order - Order object with expanded skus
   * @param {string} firmness - 'firm', 'medium', or 'soft'
   * @param {string} size - 'King', 'Queen', 'Double', 'King Single', 'Single'
   * @returns {number} Quantity or 0
   */
  const getOrderSpringQuantity = (order, firmness, size) => {
    const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
    return getOrderSkuQuantity(order, skuString)
  }

  /**
   * Get component quantity from an order for a specific component/size
   * @param {Object} order - Order object with expanded skus
   * @param {string} component - Component type (e.g., 'felt', 'micro_coils')
   * @param {string} size - Size
   * @returns {number} Quantity or 0
   */
  const getOrderComponentQuantity = (order, component, size) => {
    // Map component types to SKU prefixes
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

  // Computed: pending orders (expected arrival in future)
  const pendingOrders = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.value.filter(order => new Date(order.expected_arrival) >= today)
  })

  // Computed: past orders (already arrived)
  const pastOrders = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.value.filter(order => new Date(order.expected_arrival) < today)
  })

  // Fetch on mount
  onMounted(fetchOrders)

  return {
    orders: readonly(orders),
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    getOrdersArrivingInWeek,
    getOrderSkuQuantity,
    getOrderTotalQuantity,
    getOrderSpringQuantity,
    getOrderComponentQuantity,
    getWeekIndex,
    pendingOrders,
    pastOrders
  }
}
