const PROFORMA_FOLDER_ID = '8fcd6db1-6974-4a13-af09-c58df9f2903d'

export const useInventoryOrderProformaStore = defineStore('inventoryOrderProforma', () => {
  const directus = useDirectus()
  const { updateItem } = useDirectusItems()
  const { handleDirectusAuthError, getDirectusErrorMessage } = useDirectusSession()

  const proformas = ref({})

  const normalizeProforma = (file) => {
    if (!file) return null
    if (typeof file === 'string') return { id: file, filename_download: 'Proforma' }
    return file
  }

  const seedProforma = (orderId, file) => {
    const key = String(orderId)
    if (!orderId || proformas.value[key]) return

    const normalizedFile = normalizeProforma(file)
    if (normalizedFile) proformas.value[key] = normalizedFile
  }

  const getProforma = (orderId) => {
    return proformas.value[String(orderId)] || null
  }

  const uploadProforma = async (orderId, file) => {
    let uploadedFile = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', PROFORMA_FOLDER_ID)

      const response = await directus('/files', {
        method: 'POST',
        body: formData
      })

      uploadedFile = response.data

      await updateItem({
        collection: 'inventory_orders',
        id: orderId,
        item: {
          proforma: uploadedFile.id
        }
      })

      proformas.value[String(orderId)] = uploadedFile

      return {
        success: true,
        file: uploadedFile
      }
    } catch (error) {
      await handleDirectusAuthError(error)

      if (uploadedFile?.id) {
        try {
          await directus(`/files/${uploadedFile.id}`, { method: 'DELETE' })
        } catch {
          // Leave cleanup to Directus if the uploaded file cannot be removed.
        }
      }

      return {
        success: false,
        error: new Error(getDirectusErrorMessage(error, 'Failed to upload proforma'))
      }
    }
  }

  const downloadProforma = async (file) => {
    const normalizedFile = normalizeProforma(file)

    if (!normalizedFile?.id) {
      return {
        success: false,
        error: new Error('No proforma file is available')
      }
    }

    try {
      const blob = await directus(`/assets/${normalizedFile.id}`, {
        method: 'GET',
        responseType: 'blob'
      })

      return {
        success: true,
        blob,
        filename: normalizedFile.filename_download || 'proforma'
      }
    } catch (error) {
      await handleDirectusAuthError(error)

      return {
        success: false,
        error: new Error(getDirectusErrorMessage(error, 'Failed to download proforma'))
      }
    }
  }

  return {
    proformas,
    seedProforma,
    getProforma,
    uploadProforma,
    downloadProforma
  }
})
