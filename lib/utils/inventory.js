/**
 * Utility functions for inventory management
 */

import {
  COMPONENT_TYPES,
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  PILLOW_LATEX_TYPES
} from '../constants/index.js'

/**
 * Create empty spring inventory structure.
 * All sizes and firmnesses initialized to 0.
 */
export function createEmptySpringInventory() {
  return {
    veryfirm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  }
}

/**
 * Create empty component inventory structure.
 * All component types and sizes initialized to 0.
 */
export function createEmptyComponentInventory() {
  const inv = {}

  COMPONENT_TYPES.forEach((comp) => {
    inv[comp.id] = { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  })

  return inv
}

/**
 * Create empty Sri Lanka latex inventory structure.
 * All latex and pillow latex SKUs initialized to 0.
 */
export const createEmptyLatexInventory = () => {
  const inventory = {}

  LATEX_FIRMNESSES.forEach(firmness => {
    inventory[firmness] = {}
    LATEX_SIZES.forEach(size => {
      inventory[firmness][size] = 0
    })
  })

  inventory.pillowLatex = {}
  PILLOW_LATEX_TYPES.forEach(type => {
    inventory.pillowLatex[type] = 0
  })

  return inventory
}
