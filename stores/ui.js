export const useUIStore = defineStore('ui', () => {

  // State
  const openSection = ref('springInventory')
  const copyFeedback = ref(false)
  const downloadFeedback = ref(false)
  const isExporting = ref(false)

  // Order panel state
  const orderPanelOpen = ref(false)
  const editingOrderId = ref(null)
  const prefillFromNewOrder = ref(false)

  // Draft order state (for real-time forecast preview)
  const draftSpringOrder = ref(null)
  const draftComponentOrder = ref(null)
  const draftArrivalWeek = ref(null)

  // Actions
  const isSectionOpen = (sectionName) => {
    return openSection.value === sectionName
  }

  const toggleSection = (sectionName) => {
    openSection.value = openSection.value === sectionName ? null : sectionName
  }

  const openSectionByName = (sectionName) => {
    openSection.value = sectionName
  }

  const closeAllSections = () => {
    openSection.value = null
  }

  const showCopyFeedback = () => {
    copyFeedback.value = true
    setTimeout(() => {
      copyFeedback.value = false
    }, 2000)
  }

  const showDownloadFeedback = () => {
    downloadFeedback.value = true
    setTimeout(() => {
      downloadFeedback.value = false
    }, 2000)
  }

  const setExporting = (exporting) => {
    isExporting.value = exporting
  }

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
    openSection,
    copyFeedback,
    downloadFeedback,
    isExporting,
    orderPanelOpen,
    editingOrderId,
    prefillFromNewOrder,
    draftSpringOrder,
    draftComponentOrder,
    draftArrivalWeek,
    // Actions
    isSectionOpen,
    toggleSection,
    openSectionByName,
    closeAllSections,
    showCopyFeedback,
    showDownloadFeedback,
    setExporting,
    openOrderPanel,
    openOrderPanelWithNewOrder,
    closeOrderPanel,
    setDraftOrders
  }
})
