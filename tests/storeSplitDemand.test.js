import assert from 'node:assert/strict'
import test from 'node:test'
import { withSpringStoreSplitDemand } from '../lib/utils/storeSplitDemand.js'

const baseRates = {
  WEEKLY_SALES_RATE: { King: 8, Queen: 10, Double: 2, 'King Single': 1, Single: 2 },
  FIRMNESS_DISTRIBUTION: {},
  RAW_SKU_WEEKLY_DEMAND: {},
  SKU_WEEKLY_DEMAND_SPIKE: {
    King: { medium: 20 },
    Queen: { medium: 12 },
    Double: { medium: 3 },
    'King Single': { medium: 2 },
    Single: { medium: 4 }
  },
  STORE_SKU_SPLIT: {
    King: { medium: 75, firm: 25 },
    Queen: { medium: 100 },
    Double: { medium: 100 },
    'King Single': { medium: 100 },
    Single: { medium: 100 }
  },
  MICRO_COIL_WEEKLY_DEMAND: { King: 9, Queen: 14 },
  THIN_LATEX_WEEKLY_DEMAND: { King: 9, Queen: 14 },
  MICRO_COIL_WEEKLY_SPIKE: { King: 40, Queen: 30 },
  THIN_LATEX_WEEKLY_SPIKE: { King: 40, Queen: 30 },
  MODEL_LAYER_TOTALS: {
    King: { mattresses: 80, microLayers: 80, thinLatexLayers: 80 },
    Queen: { mattresses: 100, microLayers: 100, thinLatexLayers: 100 },
    Double: { mattresses: 20, microLayers: 30, thinLatexLayers: 30 },
    'King Single': { mattresses: 10, microLayers: 10, thinLatexLayers: 10 },
    Single: { mattresses: 20, microLayers: 20, thinLatexLayers: 20 }
  },
  STORE_MODEL_LAYER_TOTALS: {
    King: { mattresses: 10, microLayers: 15, thinLatexLayers: 15 },
    Queen: { mattresses: 10, microLayers: 12, thinLatexLayers: 12 },
    Double: { mattresses: 2, microLayers: 4, thinLatexLayers: 4 },
    'King Single': { mattresses: 2, microLayers: 2, thinLatexLayers: 2 },
    Single: { mattresses: 2, microLayers: 4, thinLatexLayers: 4 }
  }
}

test('uses recent size volume and store recipe mix, then consolidates component sizes', () => {
  const rates = withSpringStoreSplitDemand(baseRates)

  // King: 20 × 1.5 + 4 × 2 × 0.5. Queen: 12 × 1.2 + 3 × 2 + 2 × 1.
  assert.deepEqual(rates.MICRO_COIL_WEEKLY_DEMAND, { King: 34, Queen: 22.4 })
  assert.deepEqual(rates.THIN_LATEX_WEEKLY_DEMAND, { King: 34, Queen: 22.4 })
  assert.equal(rates.WEEKLY_SALES_RATE.King, 20)
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.medium, 15)
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.firm, 5)
})

test('does not confuse spring firmness with model-layer mix or use the observed component spike', () => {
  const input = structuredClone(baseRates)
  input.STORE_SKU_SPLIT.King = { soft: 100 }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.soft, 20)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 34)
  assert.equal(rates.MICRO_COIL_WEEKLY_SPIKE.King, 40)
})

test('uses historical mix and unchanged size volume for a size with no store sample', () => {
  const input = structuredClone(baseRates)
  delete input.STORE_SKU_SPLIT.Double
  input.STORE_MODEL_LAYER_TOTALS.Double = { mattresses: 0, microLayers: 0, thinLatexLayers: 0 }
  const rates = withSpringStoreSplitDemand(input)

  // Double retains 2/w, with the historical 1.5 layers per mattress (not zero).
  assert.equal(rates.WEEKLY_SALES_RATE.Double, 2)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.Queen, 12 * 1.2 + 2 * 1.5 + 2)
})

test('treats a real all-Cooper sample as zero layer demand, not missing data', () => {
  const input = structuredClone(baseRates)
  for (const size of ['King', 'Single']) {
    input.STORE_MODEL_LAYER_TOTALS[size] = { mattresses: 10, microLayers: 0, thinLatexLayers: 0 }
  }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.WEEKLY_SALES_RATE.King, 20)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 0)
  assert.equal(rates.THIN_LATEX_WEEKLY_DEMAND.King, 0)
})

test('zero recent volume produces zero layers even when the store sample has Cloud mattresses', () => {
  const input = structuredClone(baseRates)
  input.SKU_WEEKLY_DEMAND_SPIKE.King = { medium: 0 }
  input.SKU_WEEKLY_DEMAND_SPIKE.Single = { medium: 0 }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 0)
  assert.equal(rates.THIN_LATEX_WEEKLY_DEMAND.King, 0)
})

test('preserves baseline component demand when an entire inventory group lacks a store sample', () => {
  const input = structuredClone(baseRates)
  for (const size of ['King', 'Single']) {
    delete input.STORE_SKU_SPLIT[size]
    delete input.STORE_MODEL_LAYER_TOTALS[size]
  }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 9)
  assert.equal(rates.THIN_LATEX_WEEKLY_DEMAND.King, 9)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.Queen, 22.4)
})

test('retains group baseline if a positive-demand size has neither recent nor historical layer data', () => {
  const input = structuredClone(baseRates)
  delete input.STORE_SKU_SPLIT.Single
  delete input.STORE_MODEL_LAYER_TOTALS.Single
  delete input.MODEL_LAYER_TOTALS.Single
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 9)
  assert.equal(rates.THIN_LATEX_WEEKLY_DEMAND.King, 9)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.Queen, 22.4)
})

test('does not require historical data for a size with no planning demand', () => {
  const input = structuredClone(baseRates)
  delete input.STORE_SKU_SPLIT.Single
  delete input.STORE_MODEL_LAYER_TOTALS.Single
  delete input.MODEL_LAYER_TOTALS.Single
  input.WEEKLY_SALES_RATE.Single = 0
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 30)
})

test('rounds component rates only after summing size contributions', () => {
  const input = structuredClone(baseRates)
  for (const size of ['Queen', 'Double', 'King Single']) {
    input.SKU_WEEKLY_DEMAND_SPIKE[size] = { medium: 1 }
    input.STORE_MODEL_LAYER_TOTALS[size] = { mattresses: 3, microLayers: 1, thinLatexLayers: 1 }
  }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.Queen, 1)
  assert.equal(rates.THIN_LATEX_WEEKLY_DEMAND.Queen, 1)
})

test('leaves raw rates, spikes and input layer totals unchanged', () => {
  const input = structuredClone(baseRates)
  const original = structuredClone(input)
  const rates = withSpringStoreSplitDemand(input)

  assert.deepEqual(input, original)
  assert.deepEqual(rates.MICRO_COIL_WEEKLY_SPIKE, original.MICRO_COIL_WEEKLY_SPIKE)
  assert.deepEqual(rates.THIN_LATEX_WEEKLY_SPIKE, original.THIN_LATEX_WEEKLY_SPIKE)
  assert.deepEqual(rates.STORE_MODEL_LAYER_TOTALS, original.STORE_MODEL_LAYER_TOTALS)
})

test('remains backwards compatible with rates that have no layer totals', () => {
  const input = structuredClone(baseRates)
  delete input.MODEL_LAYER_TOTALS
  delete input.STORE_MODEL_LAYER_TOTALS
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.WEEKLY_SALES_RATE.King, 20)
  assert.deepEqual(rates.MICRO_COIL_WEEKLY_DEMAND, input.MICRO_COIL_WEEKLY_DEMAND)
  assert.deepEqual(rates.THIN_LATEX_WEEKLY_DEMAND, input.THIN_LATEX_WEEKLY_DEMAND)
})
