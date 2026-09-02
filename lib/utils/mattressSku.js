const RECIPES = {
  cloud: {
    2: ['sl', 'm', 'm', 'sss', 'f'],
    3: ['sl', 'm', 'm', 'f', 'sss'],
    4: ['sl', 'm', 'm', 'f', 'ssf'],
    5: ['sl', 'm', 'm', 'mss', 'f'],
    6: ['sl', 'm', 'm', 'f', 'mss'],
    7: ['sl', 'm', 'm', 'f', 'msf'],
    8: ['ml', 'm', 'm', 'mss', 'f'],
    9: ['ml', 'm', 'm', 'f', 'mss'],
    10: ['ml', 'm', 'm', 'f', 'msf'],
    11: ['ml', 'm', 'm', 'fss', 'f'],
    12: ['ml', 'm', 'm', 'f', 'fss'],
    13: ['ml', 'm', 'm', 'f', 'fsf'],
    14: ['ml', 'm', 'm', 'vss', 'f'],
    15: ['ml', 'm', 'm', 'f', 'vss'],
    16: ['ml', 'm', 'm', 'f', 'vsf'],
    '11s': ['sl', 'm', 'm', 'fss', 'f'],
    '12s': ['sl', 'm', 'm', 'f', 'fss'],
    '13s': ['sl', 'm', 'm', 'f', 'fsf'],
    '14s': ['sl', 'm', 'm', 'vss', 'f'],
    '15s': ['sl', 'm', 'm', 'f', 'vss'],
    '16s': ['sl', 'm', 'm', 'f', 'vsf'],
    17: ['fl', 'm', 'm', 'vss', 'f'],
    18: ['fl', 'm', 'm', 'f', 'vss'],
    19: ['fl', 'm', 'm', 'f', 'vsf']
  },
  aurora: {
    2: ['sl', 'm', 'sss', 'pf', 'f'],
    3: ['sl', 'm', 'f', 'sss', 'pf'],
    4: ['sl', 'm', 'f', 'ssf', 'pf'],
    5: ['sl', 'm', 'mss', 'pf', 'f'],
    6: ['sl', 'm', 'f', 'mss', 'pf'],
    7: ['sl', 'm', 'pf', 'f', 'msf'],
    8: ['ml', 'm', 'mss', 'pf', 'f'],
    9: ['ml', 'm', 'f', 'mss', 'pf'],
    10: ['ml', 'm', 'f', 'msf', 'pf'],
    11: ['ml', 'm', 'fss', 'pf', 'f'],
    12: ['ml', 'm', 'f', 'fss', 'pf'],
    13: ['ml', 'm', 'f', 'fsf', 'pf'],
    14: ['ml', 'm', 'vss', 'f', 'pf'],
    15: ['ml', 'm', 'f', 'vss', 'pf'],
    16: ['ml', 'm', 'f', 'vsf', 'pf'],
    '11s': ['sl', 'm', 'fss', 'pf', 'f'],
    '12s': ['sl', 'm', 'f', 'fss', 'pf'],
    '13s': ['sl', 'm', 'f', 'fsf', 'pf'],
    '14s': ['sl', 'm', 'vss', 'f', 'pf'],
    '15s': ['sl', 'm', 'f', 'vss', 'pf'],
    '16s': ['sl', 'm', 'f', 'vsf', 'pf'],
    17: ['fl', 'm', 'vss', 'f', 'pf'],
    18: ['fl', 'm', 'f', 'vss', 'pf'],
    19: ['fl', 'm', 'f', 'vsf', 'pf']
  },
  cooper: {
    8: ['ml', 'pf', 'mss', 'f', 'pf'],
    9: ['ml', 'pf', 'f', 'mss', 'pf'],
    10: ['ml', 'pf', 'f', 'msf', 'pf'],
    11: ['ml', 'pf', 'fss', 'pf', 'f'],
    12: ['ml', 'pf', 'f', 'fss', 'pf'],
    13: ['ml', 'pf', 'f', 'fsf', 'pf'],
    14: ['ml', 'pf', 'vss', 'pf', 'f'],
    15: ['ml', 'pf', 'f', 'vss', 'pf'],
    16: ['ml', 'pf', 'f', 'vsf', 'pf'],
    '11s': ['sl', 'pf', 'fss', 'pf', 'f'],
    '12s': ['sl', 'pf', 'f', 'fss', 'pf'],
    '13s': ['sl', 'pf', 'f', 'fsf', 'pf'],
    '14s': ['sl', 'pf', 'vss', 'pf', 'f'],
    '15s': ['sl', 'pf', 'f', 'vss', 'pf'],
    '16s': ['sl', 'pf', 'f', 'vsf', 'pf'],
    17: ['fl', 'pf', 'vss', 'pf', 'f'],
    18: ['fl', 'pf', 'f', 'vss', 'pf'],
    19: ['fl', 'pf', 'f', 'vsf', 'pf']
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
  sss: 'soft',
  ssf: 'soft',
  mss: 'medium',
  msf: 'medium',
  fss: 'firm',
  fsf: 'firm',
  vss: 'veryfirm',
  vsf: 'veryfirm'
}

const LATEX_TOKEN_FIRMNESS = {
  sl: 'soft',
  ml: 'medium',
  fl: 'firm'
}

export const getSpringFirmnessType = (level) => {
  const num = parseInt(level, 10)
  if (num >= 2 && num <= 4) return 'soft'
  if (num >= 5 && num <= 10) return 'medium'
  if (num >= 11 && num <= 13) return 'firm'
  if (num >= 14 && num <= 19) return 'veryfirm'
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
    latexFirmness,
    microLayers,
    thinLatexLayers: microLayers,
    recipe
  }
}

export { RECIPES }
