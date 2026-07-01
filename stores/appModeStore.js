const APP_MODE_KEY = 'ausbeds_app_mode'
const APP_MODES = ['live', 'test']

export const useAppModeStore = defineStore('appMode', () => {
  const mode = ref('live')
  const loaded = ref(false)
  const testInventoryModalOpen = ref(false)

  const isLiveMode = computed(() => mode.value === 'live')
  const isTestMode = computed(() => mode.value === 'test')

  const saveToStorage = () => {
    if (!import.meta.client) return

    try {
      localStorage.setItem(APP_MODE_KEY, mode.value)
    } catch (e) {
      console.error('[App mode] Failed to save:', e)
    }
  }

  const loadFromStorage = () => {
    if (!import.meta.client) {
      loaded.value = true
      return
    }

    try {
      const saved = localStorage.getItem(APP_MODE_KEY)
      if (APP_MODES.includes(saved)) {
        mode.value = saved
      }
    } catch (e) {
      console.error('[App mode] Failed to load:', e)
    } finally {
      loaded.value = true
    }
  }

  const setMode = (value) => {
    if (!APP_MODES.includes(value)) return
    mode.value = value
    loaded.value = true
    if (value === 'live') {
      testInventoryModalOpen.value = false
    }
    saveToStorage()
  }

  const openTestInventoryModal = () => {
    testInventoryModalOpen.value = true
  }

  const closeTestInventoryModal = () => {
    testInventoryModalOpen.value = false
  }

  return {
    mode,
    loaded,
    testInventoryModalOpen,
    isLiveMode,
    isTestMode,
    setMode,
    loadFromStorage,
    saveToStorage,
    openTestInventoryModal,
    closeTestInventoryModal
  }
})
