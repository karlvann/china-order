import {
  COMPONENT_TYPES,
  FIRMNESS_TYPES,
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  MATTRESS_SIZES,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'
import {
  createEmptyComponentInventory,
  createEmptyLatexInventory,
  createEmptySpringInventory
} from '~/lib/utils/index.js'

const TEST_INVENTORY_KEY = 'ausbeds_test_inventory'

const clone = (value) => JSON.parse(JSON.stringify(value))

const sanitizeQuantity = (value) => {
  return Math.max(0, parseInt(value, 10) || 0)
}

const mattressSizeIds = () => MATTRESS_SIZES.map(size => size.id)

const isComponentAvailable = (componentId, size) => {
  if (['micro_coils', 'thin_latex'].includes(componentId)) {
    return ['King', 'Queen'].includes(size)
  }

  if (componentId === 'side_panel') {
    return ['King', 'Queen', 'Double'].includes(size)
  }

  return true
}

const sanitizeSpringInventory = (source = {}) => {
  const inventory = createEmptySpringInventory()

  for (const firmness of FIRMNESS_TYPES) {
    for (const size of mattressSizeIds()) {
      inventory[firmness][size] = sanitizeQuantity(source?.[firmness]?.[size])
    }
  }

  return inventory
}

const sanitizeComponentInventory = (source = {}) => {
  const inventory = createEmptyComponentInventory()

  for (const component of COMPONENT_TYPES) {
    for (const size of mattressSizeIds()) {
      inventory[component.id][size] = isComponentAvailable(component.id, size)
        ? sanitizeQuantity(source?.[component.id]?.[size])
        : 0
    }
  }

  return inventory
}

const sanitizeLatexInventory = (source = {}) => {
  const inventory = createEmptyLatexInventory()

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      inventory[firmness][size] = sanitizeQuantity(source?.[firmness]?.[size])
    }
  }

  for (const type of PILLOW_LATEX_TYPES) {
    inventory.pillowLatex[type] = sanitizeQuantity(source?.pillowLatex?.[type])
  }

  return inventory
}

export const useTestInventoryStore = defineStore('testInventory', () => {
  const chinaSprings = ref(createEmptySpringInventory())
  const chinaComponents = ref(createEmptyComponentInventory())
  const sriLankaLatex = ref(createEmptyLatexInventory())
  const loaded = ref(false)

  const chinaInventory = computed(() => ({
    springs: chinaSprings.value,
    components: chinaComponents.value
  }))

  const sriLankaInventory = computed(() => sriLankaLatex.value)

  const saveToStorage = () => {
    if (!import.meta.client) return

    try {
      localStorage.setItem(TEST_INVENTORY_KEY, JSON.stringify({
        chinaSprings: chinaSprings.value,
        chinaComponents: chinaComponents.value,
        sriLankaLatex: sriLankaLatex.value
      }))
    } catch (e) {
      console.error('[Test inventory] Failed to save:', e)
    }
  }

  const loadFromStorage = () => {
    if (!import.meta.client) {
      loaded.value = true
      return
    }

    try {
      const saved = localStorage.getItem(TEST_INVENTORY_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        chinaSprings.value = sanitizeSpringInventory(data.chinaSprings)
        chinaComponents.value = sanitizeComponentInventory(data.chinaComponents)
        sriLankaLatex.value = sanitizeLatexInventory(data.sriLankaLatex)
      }
    } catch (e) {
      console.error('[Test inventory] Failed to load:', e)
    } finally {
      loaded.value = true
    }
  }

  const replaceInventory = (inventory) => {
    chinaSprings.value = sanitizeSpringInventory(inventory?.chinaSprings)
    chinaComponents.value = sanitizeComponentInventory(inventory?.chinaComponents)
    sriLankaLatex.value = sanitizeLatexInventory(inventory?.sriLankaLatex)
    loaded.value = true
    saveToStorage()
  }

  const setChinaSpringQuantity = (firmness, size, quantity) => {
    if (!chinaSprings.value[firmness] || chinaSprings.value[firmness][size] === undefined) return
    chinaSprings.value[firmness][size] = sanitizeQuantity(quantity)
    saveToStorage()
  }

  const setChinaComponentQuantity = (componentId, size, quantity) => {
    if (!chinaComponents.value[componentId] || chinaComponents.value[componentId][size] === undefined) return
    chinaComponents.value[componentId][size] = isComponentAvailable(componentId, size)
      ? sanitizeQuantity(quantity)
      : 0
    saveToStorage()
  }

  const setSriLankaLatexQuantity = (firmness, size, quantity) => {
    if (!sriLankaLatex.value[firmness] || sriLankaLatex.value[firmness][size] === undefined) return
    sriLankaLatex.value[firmness][size] = sanitizeQuantity(quantity)
    saveToStorage()
  }

  const setSriLankaPillowLatexQuantity = (type, quantity) => {
    if (sriLankaLatex.value.pillowLatex[type] === undefined) return
    sriLankaLatex.value.pillowLatex[type] = sanitizeQuantity(quantity)
    saveToStorage()
  }

  const resetInventory = () => {
    chinaSprings.value = createEmptySpringInventory()
    chinaComponents.value = createEmptyComponentInventory()
    sriLankaLatex.value = createEmptyLatexInventory()
    loaded.value = true
    saveToStorage()
  }

  const getDraftInventory = () => ({
    chinaSprings: clone(chinaSprings.value),
    chinaComponents: clone(chinaComponents.value),
    sriLankaLatex: clone(sriLankaLatex.value)
  })

  return {
    chinaSprings,
    chinaComponents,
    sriLankaLatex,
    loaded,
    chinaInventory,
    sriLankaInventory,
    setChinaSpringQuantity,
    setChinaComponentQuantity,
    setSriLankaLatexQuantity,
    setSriLankaPillowLatexQuantity,
    replaceInventory,
    resetInventory,
    getDraftInventory,
    loadFromStorage,
    saveToStorage
  }
})
