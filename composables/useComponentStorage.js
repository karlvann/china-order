/**
 * Composable for managing component inventory in localStorage
 */

const COMPONENTS_KEY = 'china_order_components'
const SETTINGS_KEY = 'china_order_settings'

export function useComponentStorage() {
  /**
   * Save component inventory to localStorage
   */
  const saveComponents = (components) => {
    try {
      localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components))
      return true
    } catch (e) {
      console.error('Failed to save components:', e)
      return false
    }
  }

  /**
   * Load component inventory from localStorage
   */
  const loadComponents = () => {
    try {
      const saved = localStorage.getItem(COMPONENTS_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.error('Failed to load components:', e)
      return null
    }
  }

  /**
   * Save settings to localStorage
   */
  const saveSettings = (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      return true
    } catch (e) {
      console.error('Failed to save settings:', e)
      return false
    }
  }

  /**
   * Load settings from localStorage
   */
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.error('Failed to load settings:', e)
      return null
    }
  }

  /**
   * Clear all saved data
   */
  const clearAll = () => {
    try {
      localStorage.removeItem(COMPONENTS_KEY)
      localStorage.removeItem(SETTINGS_KEY)
      return true
    } catch (e) {
      console.error('Failed to clear storage:', e)
      return false
    }
  }

  return {
    saveComponents,
    loadComponents,
    saveSettings,
    loadSettings,
    clearAll
  }
}
