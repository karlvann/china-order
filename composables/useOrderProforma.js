const ALLOWED_PROFORMA_EXTENSIONS = ['csv', 'pdf']

export const useOrderProforma = (orderId, initialProforma) => {
  const proformaStore = useInventoryOrderProformaStore()

  const uploading = ref(false)
  const downloading = ref(false)
  const error = ref(null)

  const currentOrderId = computed(() => unref(orderId))
  const proforma = computed(() => proformaStore.getProforma(currentOrderId.value))

  watch([currentOrderId, () => unref(initialProforma)], ([id, file]) => {
    proformaStore.seedProforma(id, file)
  }, { immediate: true })

  const uploadProforma = async (file) => {
    error.value = null

    const extension = file?.name?.split('.').pop()?.toLowerCase()
    if (!file || !ALLOWED_PROFORMA_EXTENSIONS.includes(extension)) {
      error.value = 'Choose a CSV or PDF file'
      return false
    }

    uploading.value = true
    const result = await proformaStore.uploadProforma(currentOrderId.value, file)
    uploading.value = false

    if (!result.success) {
      error.value = result.error?.message || 'Failed to upload proforma'
      return false
    }

    return true
  }

  const downloadProforma = async (file = proforma.value) => {
    error.value = null
    downloading.value = true

    const result = await proformaStore.downloadProforma(file)
    downloading.value = false

    if (!result.success) {
      error.value = result.error?.message || 'Failed to download proforma'
      return false
    }

    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    return true
  }

  return {
    proforma,
    uploading,
    downloading,
    error,
    uploadProforma,
    downloadProforma
  }
}
