/**
 * Pinia store for Sri Lanka UI state
 * Manages order panel state and draft orders
 * Completely separate from China UI state
 */

export const useSriLankaUIStore = defineStore('sriLankaUI', () => {

  // Order panel state
  const orderPanelOpen = ref(false)
  const editingOrderId = ref(null)
  const prefillFromNewOrder = ref(false)

  // Draft order state (for real-time forecast preview)
  const draftLatexOrder = ref(null)
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
    draftLatexOrder.value = null
    draftArrivalWeek.value = null
  }

  const setDraftOrder = (latexOrder, arrivalWeek = null) => {
    draftLatexOrder.value = latexOrder
    if (arrivalWeek !== null) {
      draftArrivalWeek.value = arrivalWeek
    }
  }

  const clearDraftOrder = () => {
    draftLatexOrder.value = null
    draftArrivalWeek.value = null
  }

  return {
    // State
    orderPanelOpen,
    editingOrderId,
    prefillFromNewOrder,
    draftLatexOrder,
    draftArrivalWeek,
    // Actions
    openOrderPanel,
    openOrderPanelWithNewOrder,
    closeOrderPanel,
    setDraftOrder,
    clearDraftOrder
  }
})
