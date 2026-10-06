// Spring tokens are semantic: first letter is tension, middle `s` means
// spring, and the final letter is the side facing up (`s` soft, `f` firm).
const RECIPES = {
  cloud: {
    2: ['sl', 'm', 'm', 'vss', 'f'],
    3: ['sl', 'm', 'm', 'f', 'vss'],
    4: ['sl', 'm', 'm', 'f', 'vsf'],
    5: ['sl', 'm', 'm', 'sss', 'f'],
    6: ['sl', 'm', 'm', 'f', 'sss'],
    7: ['sl', 'm', 'm', 'f', 'ssf'],
    8: ['ml', 'm', 'm', 'sss', 'f'],
    9: ['ml', 'm', 'm', 'f', 'sss'],
    10: ['ml', 'm', 'm', 'f', 'ssf'],
    11: ['ml', 'm', 'm', 'mss', 'f'],
    12: ['ml', 'm', 'm', 'f', 'mss'],
    13: ['ml', 'm', 'm', 'f', 'msf'],
    14: ['ml', 'm', 'm', 'fss', 'f'],
    15: ['ml', 'm', 'm', 'f', 'fss'],
    16: ['ml', 'm', 'm', 'f', 'fsf'],
    '11s': ['sl', 'm', 'm', 'mss', 'f'],
    '12s': ['sl', 'm', 'm', 'f', 'mss'],
    '13s': ['sl', 'm', 'm', 'f', 'msf'],
    '14s': ['sl', 'm', 'm', 'fss', 'f'],
    '15s': ['sl', 'm', 'm', 'f', 'fss'],
    '16s': ['sl', 'm', 'm', 'f', 'fsf'],
    17: ['fl', 'm', 'm', 'fss', 'f'],
    18: ['fl', 'm', 'm', 'f', 'fss'],
    19: ['fl', 'm', 'm', 'f', 'fsf']
  },
  aurora: {
    2: ['sl', 'm', 'vss', 'pf', 'f'],
    3: ['sl', 'm', 'f', 'vss', 'pf'],
    4: ['sl', 'm', 'f', 'vsf', 'pf'],
    5: ['sl', 'm', 'sss', 'pf', 'f'],
    6: ['sl', 'm', 'f', 'sss', 'pf'],
    7: ['sl', 'm', 'pf', 'f', 'ssf'],
    8: ['ml', 'm', 'sss', 'pf', 'f'],
    9: ['ml', 'm', 'f', 'sss', 'pf'],
    10: ['ml', 'm', 'f', 'ssf', 'pf'],
    11: ['ml', 'm', 'mss', 'pf', 'f'],
    12: ['ml', 'm', 'f', 'mss', 'pf'],
    13: ['ml', 'm', 'f', 'msf', 'pf'],
    14: ['ml', 'm', 'fss', 'f', 'pf'],
    15: ['ml', 'm', 'f', 'fss', 'pf'],
    16: ['ml', 'm', 'f', 'fsf', 'pf'],
    '11s': ['sl', 'm', 'mss', 'pf', 'f'],
    '12s': ['sl', 'm', 'f', 'mss', 'pf'],
    '13s': ['sl', 'm', 'f', 'msf', 'pf'],
    '14s': ['sl', 'm', 'fss', 'f', 'pf'],
    '15s': ['sl', 'm', 'f', 'fss', 'pf'],
    '16s': ['sl', 'm', 'f', 'fsf', 'pf'],
    17: ['fl', 'm', 'fss', 'f', 'pf'],
    18: ['fl', 'm', 'f', 'fss', 'pf'],
    19: ['fl', 'm', 'f', 'fsf', 'pf']
  },
  cooper: {
    8: ['ml', 'pf', 'sss', 'f', 'pf'],
    9: ['ml', 'pf', 'f', 'sss', 'pf'],
    10: ['ml', 'pf', 'f', 'ssf', 'pf'],
    11: ['ml', 'pf', 'mss', 'pf', 'f'],
    12: ['ml', 'pf', 'f', 'mss', 'pf'],
    13: ['ml', 'pf', 'f', 'msf', 'pf'],
    14: ['ml', 'pf', 'fss', 'pf', 'f'],
    15: ['ml', 'pf', 'f', 'fss', 'pf'],
    16: ['ml', 'pf', 'f', 'fsf', 'pf'],
    '11s': ['sl', 'pf', 'mss', 'pf', 'f'],
    '12s': ['sl', 'pf', 'f', 'mss', 'pf'],
    '13s': ['sl', 'pf', 'f', 'msf', 'pf'],
    '14s': ['sl', 'pf', 'fss', 'pf', 'f'],
    '15s': ['sl', 'pf', 'f', 'fss', 'pf'],
    '16s': ['sl', 'pf', 'f', 'fsf', 'pf'],
    17: ['fl', 'pf', 'fss', 'pf', 'f'],
    18: ['fl', 'pf', 'f', 'fss', 'pf'],
    19: ['fl', 'pf', 'f', 'fsf', 'pf']
  }
}

const MATTRESS_RANGES = ['cooper', 'cloud', 'aurora']

const SIZE_MAP_ORDERED = [
  { key: 'kingsingle', value: 'King Single' },
  { key: 'single', value: 'Single' },
  { key: 'double', value: 'Double' },
  { key: 'queen', value: 'Queen' },
  { key: 'king', value: 'King' }
]

const SPRING_TOKEN_FIRMNESS = {
  vss: 'verysoft',
  vsf: 'verysoft',
  sss: 'soft',
  ssf: 'soft',
  mss: 'medium',
  msf: 'medium',
  fss: 'firm',
  fsf: 'firm'
}

const SPRING_TOKEN_ORIENTATION = {
  vss: 'soft_up',
  vsf: 'firm_up',
  sss: 'soft_up',
  ssf: 'firm_up',
  mss: 'soft_up',
  msf: 'firm_up',
  fss: 'soft_up',
  fsf: 'firm_up'
}

const LATEX_TOKEN_FIRMNESS = {
  sl: 'soft',
  ml: 'medium',
  fl: 'firm'
}

export const getSpringFirmnessType = (level) => {
  const num = parseInt(level, 10)
  if (num >= 2 && num <= 4) return 'verysoft'
  if (num >= 5 && num <= 10) return 'soft'
  if (num >= 11 && num <= 13) return 'medium'
  if (num >= 14 && num <= 19) return 'firm'
  return null
}

export const parseMattressSku = (sku) => {
  if (!sku || typeof sku !== 'string') return null

  const lowerSku = sku.toLowerCase()
  const range = MATTRESS_RANGES.find(r => lowerSku.startsWith(r))
  if (!range) return null

  const remainder = lowerSku.slice(range.length)

  let size = null
  let sizeKey = null
  for (const { key, value } of SIZE_MAP_ORDERED) {
    if (remainder.endsWith(key)) {
      size = value
      sizeKey = key
      break
    }
  }
  if (!size) return null

  const modelString = remainder.slice(0, remainder.length - sizeKey.length)
  const modelMatch = modelString.match(/^(\d+)(s?)$/)
  if (!modelMatch) return null

  const firmnessLevel = parseInt(modelMatch[1], 10)
  const softLatex = modelMatch[2] === 's'
  const modelKey = softLatex ? `${firmnessLevel}s` : firmnessLevel
  const recipe = RECIPES[range]?.[modelKey]
  if (!recipe) return null

  const springToken = recipe.find(token => SPRING_TOKEN_FIRMNESS[token])
  const latexToken = recipe.find(token => LATEX_TOKEN_FIRMNESS[token])
  const firmnessType = SPRING_TOKEN_FIRMNESS[springToken]
  const springOrientation = SPRING_TOKEN_ORIENTATION[springToken]
  const latexFirmness = LATEX_TOKEN_FIRMNESS[latexToken]
  const microLayers = recipe.filter(token => token === 'm').length

  if (!firmnessType || !latexFirmness) return null

  return {
    range,
    firmnessLevel,
    modelKey: `${modelKey}`,
    softLatex,
    size,
    mattressSize: size,
    firmnessType,
    springFirmness: firmnessType,
    springOrientation,
    latexFirmness,
    microLayers,
    thinLatexLayers: microLayers,
    recipe
  }
}

export { RECIPES }
