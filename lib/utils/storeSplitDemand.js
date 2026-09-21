import {
  FIRMNESS_TYPES,
  SPRING_PLANNING_SPLITS,
  MATTRESS_SIZES,
  LATEX_FIRMNESSES,
  LATEX_PLANNING_SPLIT,
  LATEX_SIZES
} from '../constants/index.js'
import { roundDemandRate } from './demandTrimming.js'

const COMPONENT_SIZE_FACTORS = {
  King: { King: 1, Single: 0.5 },
  Queen: { Queen: 1, Double: 1, 'King Single': 1 }
}

const clone = (value) => JSON.parse(JSON.stringify(value || {}))

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// Observed store sample availability for component model-mix fallbacks only.
// Spring firmness planning uses fixed percentages regardless of this sample.
export const hasSpringStoreSplitForSize = (salesRates, size) => {
  const split = salesRates?.STORE_SKU_SPLIT?.[size]
  if (!split) return false
  return FIRMNESS_TYPES.some(firmness => toNumber(split[firmness]) > 0)
}

export const getSpringStoreSplitSizeDemand = (salesRates, size) => {
  const skuSpikes = salesRates?.SKU_WEEKLY_DEMAND_SPIKE?.[size]
  const skuSpikeTotal = skuSpikes
    ? FIRMNESS_TYPES.reduce((sum, firmness) => sum + toNumber(skuSpikes[firmness]), 0)
    : 0

  if (skuSpikeTotal > 0) return roundDemandRate(skuSpikeTotal)

  return roundDemandRate(toNumber(salesRates?.WEEKLY_SALES_SPIKE?.[size]))
}

export const getSpringStoreSplitDemandRate = (salesRates, size, firmness) => {
  const sizeDemand = getSpringStoreSplitSizeDemand(salesRates, size)
  const splits = size === 'King' || size === 'King Single'
    ? SPRING_PLANNING_SPLITS.kingAndKingSingle
    : SPRING_PLANNING_SPLITS.otherSizes
  const split = splits[firmness] || 0
  return roundDemandRate(sizeDemand * (split / 100))
}

export const withSpringStoreSplitDemand = (salesRates) => {
  const next = clone(salesRates)
  next.WEEKLY_SALES_RATE = { ...(next.WEEKLY_SALES_RATE || {}) }
  next.FIRMNESS_DISTRIBUTION = { ...(next.FIRMNESS_DISTRIBUTION || {}) }
  next.RAW_SKU_WEEKLY_DEMAND = { ...(next.RAW_SKU_WEEKLY_DEMAND || {}) }

  for (const size of MATTRESS_SIZES.map(item => item.id)) {
    const sizeDemand = getSpringStoreSplitSizeDemand(salesRates, size)
    const splits = size === 'King' || size === 'King Single'
      ? SPRING_PLANNING_SPLITS.kingAndKingSingle
      : SPRING_PLANNING_SPLITS.otherSizes
    next.WEEKLY_SALES_RATE[size] = sizeDemand
    next.FIRMNESS_DISTRIBUTION[size] = {}
    next.RAW_SKU_WEEKLY_DEMAND[size] = {}

    for (const firmness of FIRMNESS_TYPES) {
      const split = splits[firmness]
      next.FIRMNESS_DISTRIBUTION[size][firmness] = split / 100
      next.RAW_SKU_WEEKLY_DEMAND[size][firmness] = roundDemandRate(sizeDemand * (split / 100))
    }
  }

  // Layer demand follows model mix, not spring firmness. Calculate by mattress size
  // first so Single's half-sheet usage and smaller Queen-cut sizes stay accurate.
  for (const [inventorySize, sizeFactors] of Object.entries(COMPONENT_SIZE_FACTORS)) {
    const hasStoreMix = Object.keys(sizeFactors).some(size => (
      hasSpringStoreSplitForSize(salesRates, size) &&
      toNumber(salesRates?.STORE_MODEL_LAYER_TOTALS?.[size]?.mattresses) > 0
    ))
    if (!hasStoreMix) continue

    let microDemand = 0
    let thinLatexDemand = 0
    let hasLayerData = true

    for (const [size, factor] of Object.entries(sizeFactors)) {
      const sizeDemand = toNumber(next.WEEKLY_SALES_RATE[size])
      if (sizeDemand <= 0) continue

      const storeTotals = salesRates?.STORE_MODEL_LAYER_TOTALS?.[size]
      const useStoreMix = hasSpringStoreSplitForSize(salesRates, size) && toNumber(storeTotals?.mattresses) > 0
      const totals = useStoreMix ? storeTotals : salesRates?.MODEL_LAYER_TOTALS?.[size]
      const mattressCount = toNumber(totals?.mattresses)

      // No recent store sample: use the historical recipe mix at that size's
      // planning volume. Missing history too: retain the original group demand.
      if (mattressCount <= 0) {
        hasLayerData = false
        break
      }

      microDemand += sizeDemand * (toNumber(totals.microLayers) / mattressCount) * factor
      thinLatexDemand += sizeDemand * (toNumber(totals.thinLatexLayers) / mattressCount) * factor
    }

    if (!hasLayerData) continue

    next.MICRO_COIL_WEEKLY_DEMAND = { ...(next.MICRO_COIL_WEEKLY_DEMAND || {}), [inventorySize]: roundDemandRate(microDemand) }
    next.THIN_LATEX_WEEKLY_DEMAND = { ...(next.THIN_LATEX_WEEKLY_DEMAND || {}), [inventorySize]: roundDemandRate(thinLatexDemand) }
  }

  return next
}

// Historical sample availability; fixed latex planning no longer depends on it.
export const hasLatexStoreSplitForSize = (salesRates, size) => {
  return LATEX_FIRMNESSES.some(firmness => toNumber(salesRates?.STORE_SPLIT?.[firmness]?.[size]) > 0)
}

export const getLatexStoreSplitSizeDemand = (salesRates, size) => {
  const spikeTotal = LATEX_FIRMNESSES.reduce((sum, firmness) => {
    return sum + toNumber(salesRates?.WEEKLY_SPIKES?.[firmness]?.[size])
  }, 0)

  return roundDemandRate(spikeTotal)
}

export const getLatexStoreSplitDemandRate = (salesRates, size, firmness) => {
  const sizeDemand = getLatexStoreSplitSizeDemand(salesRates, size)
  const split = LATEX_PLANNING_SPLIT[size]?.[firmness] || 0
  return roundDemandRate(sizeDemand * (split / 100))
}

export const withLatexStoreSplitDemand = (salesRates) => {
  const next = clone(salesRates)
  next.WEEKLY_TOTAL_BY_SIZE = { ...(next.WEEKLY_TOTAL_BY_SIZE || {}) }
  next.WEEKLY_RATES = { ...(next.WEEKLY_RATES || {}) }
  next.FIRMNESS_DISTRIBUTION = { ...(next.FIRMNESS_DISTRIBUTION || {}) }

  for (const firmness of LATEX_FIRMNESSES) {
    next.WEEKLY_RATES[firmness] = { ...(next.WEEKLY_RATES[firmness] || {}) }
  }

  for (const size of LATEX_SIZES) {
    const sizeDemand = getLatexStoreSplitSizeDemand(salesRates, size)
    next.WEEKLY_TOTAL_BY_SIZE[size] = sizeDemand
    next.FIRMNESS_DISTRIBUTION[size] = {}

    for (const firmness of LATEX_FIRMNESSES) {
      const split = LATEX_PLANNING_SPLIT[size][firmness]
      next.WEEKLY_RATES[firmness][size] = roundDemandRate(sizeDemand * (split / 100))
      next.FIRMNESS_DISTRIBUTION[size][firmness] = split / 100
    }
  }

  return next
}
