/**
 * Composable for error handling
 */

export function useErrorHandler() {
  const errors = ref([])

  const addError = (message, type = 'error') => {
    const id = Date.now()
    errors.value.push({ id, message, type })

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeError(id)
    }, 5000)

    return id
  }

  const removeError = (id) => {
    const index = errors.value.findIndex(e => e.id === id)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const hasErrors = computed(() => errors.value.length > 0)

  return {
    errors,
    hasErrors,
    addError,
    removeError,
    clearErrors
  }
}
