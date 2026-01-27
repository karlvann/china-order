/**
 * Composable for file download operations
 */

export function useDownload() {
  const downloading = ref(false)

  const downloadTSV = (content, filename) => {
    downloading.value = true

    try {
      const blob = new Blob([content], { type: 'text/tab-separated-values' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `china-order-${new Date().toISOString().split('T')[0]}.tsv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      console.error('Failed to download file:', e)
      return false
    } finally {
      downloading.value = false
    }
  }

  const downloadJSON = (data, filename) => {
    downloading.value = true

    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `china-order-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (e) {
      console.error('Failed to download file:', e)
      return false
    } finally {
      downloading.value = false
    }
  }

  return {
    downloading,
    downloadTSV,
    downloadJSON
  }
}
