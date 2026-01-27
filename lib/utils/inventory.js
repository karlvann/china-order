/**
 * Utility functions for inventory management
 */

import { COMPONENT_TYPES } from '../constants/index.js'

/**
 * Create empty spring inventory structure.
 * All sizes and firmnesses initialized to 0.
 */
export function createEmptySpringInventory() {
  return {
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
