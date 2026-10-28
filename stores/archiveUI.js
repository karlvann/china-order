export const useArchiveUIStore = defineStore('archiveUI', () => {
  const orderPanelOpen = ref(false)
  const editingOrderId = ref(null)

  const openOrderPanel = (orderId) => {
    editingOrderId.value = orderId
    orderPanelOpen.value = true
  }

  const closeOrderPanel = () => {
    orderPanelOpen.value = false
    editingOrderId.value = null
  }

  return {
    orderPanelOpen,
    editingOrderId,
    openOrderPanel,
    closeOrderPanel
  }
})
