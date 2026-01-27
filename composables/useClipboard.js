/**
 * Composable for clipboard operations
 */

export function useClipboard() {
  const copied = ref(false)
  const error = ref(null)

  const copy = async (text) => {
    error.value = null
    copied.value = false

    try {
      await navigator.clipboard.writeText(text)
      copied.value = true

      // Reset after 2 seconds
      setTimeout(() => {
        copied.value = false
      }, 2000)

      return true
    } catch (e) {
      error.value = e.message
      console.error('Failed to copy to clipboard:', e)
      return false
    }
  }

  return {
    copied,
    error,
    copy
  }
}
