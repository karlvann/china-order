const APP_SETTINGS_KEY = 'ausbeds_order_app'
const LEGACY_SPRING_SETTINGS_KEY = 'china_order_settings'

export const useAppStore = defineStore('app', () => {
  const activeOrderType = ref('springs')

  const isSpringOrderType = computed(() => activeOrderType.value === 'springs')
  const isLatexOrderType = computed(() => activeOrderType.value === 'latex')

  const saveToStorage = () => {
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({
        activeOrderType: activeOrderType.value
      }))
    } catch (error) {
      console.error('Failed to save app settings:', error)
    }
  }

  const setActiveOrderType = (orderType) => {
    if (!['springs', 'latex'].includes(orderType)) return
    activeOrderType.value = orderType
    saveToStorage()
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(APP_SETTINGS_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (['springs', 'latex'].includes(data.activeOrderType)) {
          activeOrderType.value = data.activeOrderType
          return
        }
      }

      const legacySettings = localStorage.getItem(LEGACY_SPRING_SETTINGS_KEY)
      if (legacySettings) {
        const data = JSON.parse(legacySettings)
        activeOrderType.value = data.currentView === 'builder' ? 'latex' : 'springs'
        saveToStorage()
      }
    } catch (error) {
      console.error('Failed to load app settings:', error)
    }
  }

  return {
    activeOrderType,
    isSpringOrderType,
    isLatexOrderType,
    setActiveOrderType,
    loadFromStorage
  }
})
