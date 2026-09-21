/**
 * Utility functions for inventory management
 */

import {
  COMPONENT_TYPES,
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  PILLOW_LATEX_TYPES
} from '../constants/index.js'

export const SPRING_INVENTORY_SKU_MAP = {
  springsveryfirmking: { firmness: 'veryfirm', size: 'King' },
  springsveryfirmqueen: { firmness: 'veryfirm', size: 'Queen' },
  springsveryfirmdouble: { firmness: 'veryfirm', size: 'Double' },
  springsveryfirmkingsingle: { firmness: 'veryfirm', size: 'King Single' },
  springsveryfirmsingle: { firmness: 'veryfirm', size: 'Single' },
  springsfirmking: { firmness: 'firm', size: 'King' },
  springsfirmqueen: { firmness: 'firm', size: 'Queen' },
  springsfirmdouble: { firmness: 'firm', size: 'Double' },
  springsfirmkingsingle: { firmness: 'firm', size: 'King Single' },
  springsfirmsingle: { firmness: 'firm', size: 'Single' },
  springsmediumking: { firmness: 'medium', size: 'King' },
  springsmediumqueen: { firmness: 'medium', size: 'Queen' },
  springsmediumdouble: { firmness: 'medium', size: 'Double' },
  springsmediumkingsingle: { firmness: 'medium', size: 'King Single' },
  springsmediumsingle: { firmness: 'medium', size: 'Single' },
  springssoftking: { firmness: 'soft', size: 'King' },
  springssoftqueen: { firmness: 'soft', size: 'Queen' },
  springssoftdouble: { firmness: 'soft', size: 'Double' },
  springssoftkingsingle: { firmness: 'soft', size: 'King Single' },
  springssoftsingle: { firmness: 'soft', size: 'Single' }
}

export const COMPONENT_INVENTORY_SKU_MAP = {
  microcoilsking: { component: 'micro_coils', size: 'King' },
  microcoilsqueen: { component: 'micro_coils', size: 'Queen' },
  thinlatexking: { component: 'thin_latex', size: 'King' },
  thinlatexqueen: { component: 'thin_latex', size: 'Queen' },
  feltking: { component: 'felt', size: 'King' },
  feltqueen: { component: 'felt', size: 'Queen' },
  feltdouble: { component: 'felt', size: 'Double' },
  feltkingsingle: { component: 'felt', size: 'King Single' },
  feltsingle: { component: 'felt', size: 'Single' },
  paneltopking: { component: 'top_panel', size: 'King' },
  paneltopqueen: { component: 'top_panel', size: 'Queen' },
  paneltopdouble: { component: 'top_panel', size: 'Double' },
  paneltopkingsingle: { component: 'top_panel', size: 'King Single' },
  paneltopsingle: { component: 'top_panel', size: 'Single' },
  panelbottomking: { component: 'bottom_panel', size: 'King' },
  panelbottomqueen: { component: 'bottom_panel', size: 'Queen' },
  panelbottomdouble: { component: 'bottom_panel', size: 'Double' },
  panelbottomkingsingle: { component: 'bottom_panel', size: 'King Single' },
  panelbottomsingle: { component: 'bottom_panel', size: 'Single' },
  panelsideking: { component: 'side_panel', size: 'King' },
  panelsidequeen: { component: 'side_panel', size: 'Queen' },
  panelsidedouble: { component: 'side_panel', size: 'Double' }
}

export const LATEX_INVENTORY_SKU_MAP = {
  latexfirmking: { firmness: 'firm', size: 'King' },
  latexfirmqueen: { firmness: 'firm', size: 'Queen' },
  latexmediumking: { firmness: 'medium', size: 'King' },
  latexmediumqueen: { firmness: 'medium', size: 'Queen' },
  latexsoftking: { firmness: 'soft', size: 'King' },
  latexsoftqueen: { firmness: 'soft', size: 'Queen' },
  pillowlatexthin: { pillowLatexType: 'thin' },
  pillowlatexthick: { pillowLatexType: 'thick' }
}

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
