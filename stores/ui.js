export const useUIStore = defineStore('ui', () => {

  // State
  const openSection = ref('springInventory')
  const copyFeedback = ref(false)
  const downloadFeedback = ref(false)
  const isExporting = ref(false)

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

  return {
    // State
    openSection,
    copyFeedback,
    downloadFeedback,
    isExporting,
    // Actions
    isSectionOpen,
    toggleSection,
    openSectionByName,
    closeAllSections,
    showCopyFeedback,
    showDownloadFeedback,
    setExporting
  }
})
