export const useInventoryOrderDeletion = (orderType) => {
  const ordersStore = orderType === 'latex' ? useLatexOrdersStore() : useSpringOrdersStore()
  const deletingOrderId = ref(null)
  const deleteError = ref(null)

  const isOrderPlaced = (order) => order.ordered === true || order.ordered === 1 || order.ordered === 'true'

  const deletePendingOrder = async (order) => {
    if (isOrderPlaced(order)) return false
    if (!window.confirm('Delete this pending order? This cannot be undone.')) return false

    deletingOrderId.value = order.id
    deleteError.value = null

    const deleted = await ordersStore.deleteOrder(order.id)
    if (!deleted) {
      deleteError.value = ordersStore.error || 'Failed to delete order'
    }

    deletingOrderId.value = null
    return deleted
  }

  const isDeletingOrder = (orderId) => String(deletingOrderId.value) === String(orderId)

  return {
    deleteError,
    deletePendingOrder,
    isDeletingOrder,
    isOrderPlaced
  }
}
