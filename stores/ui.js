export const useUIStore = defineStore('ui', () => {

  // Order panel state
  const orderPanelOpen = ref(false)
  const editingOrderId = ref(null)
  const prefillFromNewOrder = ref(false)

  // Draft order state (for real-time forecast preview)
  const draftSpringOrder = ref(null)
  const draftComponentOrder = ref(null)
  const draftArrivalWeek = ref(null)

  // Order panel actions
  const openOrderPanel = (orderId = null) => {
    editingOrderId.value = orderId
    prefillFromNewOrder.value = false
    orderPanelOpen.value = true
  }

  const openOrderPanelWithNewOrder = () => {
    editingOrderId.value = null
    prefillFromNewOrder.value = true
    orderPanelOpen.value = true
  }

  const closeOrderPanel = () => {
    orderPanelOpen.value = false
    editingOrderId.value = null
    prefillFromNewOrder.value = false
    draftSpringOrder.value = null
    draftComponentOrder.value = null
    draftArrivalWeek.value = null
  }

  const setDraftOrders = (springOrder, componentOrder, arrivalWeek = null) => {
    draftSpringOrder.value = springOrder
    draftComponentOrder.value = componentOrder
    if (arrivalWeek !== null) {
      draftArrivalWeek.value = arrivalWeek
    }
  }

  return {
    // State
    orderPanelOpen,
    editingOrderId,
    prefillFromNewOrder,
    draftSpringOrder,
    draftComponentOrder,
    draftArrivalWeek,
    // Actions
    openOrderPanel,
    openOrderPanelWithNewOrder,
    closeOrderPanel,
    setDraftOrders
  }
})
