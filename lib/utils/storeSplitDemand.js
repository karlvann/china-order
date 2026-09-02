import {
  FIRMNESS_TYPES,
  MATTRESS_SIZES,
  LATEX_FIRMNESSES,
  LATEX_SIZES
} from '../constants/index.js'
import { roundDemandRate } from './demandTrimming.js'

const clone = (value) => JSON.parse(JSON.stringify(value || {}))

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

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
  if (!hasSpringStoreSplitForSize(salesRates, size)) return null

  const sizeDemand = getSpringStoreSplitSizeDemand(salesRates, size)
  const split = toNumber(salesRates?.STORE_SKU_SPLIT?.[size]?.[firmness])
  return roundDemandRate(sizeDemand * (split / 100))
}

export const withSpringStoreSplitDemand = (salesRates) => {
  const next = clone(salesRates)
  next.WEEKLY_SALES_RATE = { ...(next.WEEKLY_SALES_RATE || {}) }
  next.FIRMNESS_DISTRIBUTION = { ...(next.FIRMNESS_DISTRIBUTION || {}) }
  next.RAW_SKU_WEEKLY_DEMAND = { ...(next.RAW_SKU_WEEKLY_DEMAND || {}) }

  for (const size of MATTRESS_SIZES.map(item => item.id)) {
    if (!hasSpringStoreSplitForSize(salesRates, size)) continue

    const sizeDemand = getSpringStoreSplitSizeDemand(salesRates, size)
    next.WEEKLY_SALES_RATE[size] = sizeDemand
    next.FIRMNESS_DISTRIBUTION[size] = {}
    next.RAW_SKU_WEEKLY_DEMAND[size] = {}

    for (const firmness of FIRMNESS_TYPES) {
      const split = toNumber(salesRates?.STORE_SKU_SPLIT?.[size]?.[firmness])
      next.FIRMNESS_DISTRIBUTION[size][firmness] = split / 100
      next.RAW_SKU_WEEKLY_DEMAND[size][firmness] = roundDemandRate(sizeDemand * (split / 100))
    }
  }

  return next
}

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
  if (!hasLatexStoreSplitForSize(salesRates, size)) return null

  const sizeDemand = getLatexStoreSplitSizeDemand(salesRates, size)
  const split = toNumber(salesRates?.STORE_SPLIT?.[firmness]?.[size])
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
    if (!hasLatexStoreSplitForSize(salesRates, size)) continue

    const sizeDemand = getLatexStoreSplitSizeDemand(salesRates, size)
    next.WEEKLY_TOTAL_BY_SIZE[size] = sizeDemand
    next.FIRMNESS_DISTRIBUTION[size] = {}

    for (const firmness of LATEX_FIRMNESSES) {
      const split = toNumber(salesRates?.STORE_SPLIT?.[firmness]?.[size])
      next.WEEKLY_RATES[firmness][size] = roundDemandRate(sizeDemand * (split / 100))
      next.FIRMNESS_DISTRIBUTION[size][firmness] = split / 100
    }
  }

  return next
}
