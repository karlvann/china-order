import assert from 'node:assert/strict'
import test from 'node:test'
import { getSpringStoreSplitDemandRate, withSpringStoreSplitDemand } from '../lib/utils/storeSplitDemand.js'
import { FIRMNESS_TYPES, MATTRESS_SIZES, SPRING_PLANNING_SPLITS } from '../lib/constants/index.js'
import { calculateDemandBasedOrder, calculateSkuMetrics } from '../lib/algorithms/demandBasedOrder.js'
import { createEmptySpringInventory } from '../lib/utils/inventory.js'

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
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.medium, 0.8)
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.firm, 7.6)
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.veryfirm, 11.6)
  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.soft, 0)
})

test('does not confuse spring firmness with model-layer mix or use the observed component spike', () => {
  const input = structuredClone(baseRates)
  input.STORE_SKU_SPLIT.King = { soft: 100 }
  const rates = withSpringStoreSplitDemand(input)

  assert.equal(rates.RAW_SKU_WEEKLY_DEMAND.King.soft, 0)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.King, 34)
  assert.equal(rates.MICRO_COIL_WEEKLY_SPIKE.King, 40)
})

test('uses historical component mix at the active spike volume for a size with no store sample', () => {
  const input = structuredClone(baseRates)
  delete input.STORE_SKU_SPLIT.Double
  input.STORE_MODEL_LAYER_TOTALS.Double = { mattresses: 0, microLayers: 0, thinLatexLayers: 0 }
  const rates = withSpringStoreSplitDemand(input)

  // Double uses its 3/w spike, with the historical 1.5 layers per mattress (not zero).
  assert.equal(rates.WEEKLY_SALES_RATE.Double, 3)
  assert.equal(rates.MICRO_COIL_WEEKLY_DEMAND.Queen, 20.9)
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
  input.SKU_WEEKLY_DEMAND_SPIKE.Single = { medium: 0 }
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
  assert.deepEqual(rates.SKU_WEEKLY_DEMAND_SPIKE, original.SKU_WEEKLY_DEMAND_SPIKE)
  assert.deepEqual(rates.MICRO_COIL_WEEKLY_SPIKE, original.MICRO_COIL_WEEKLY_SPIKE)
  assert.deepEqual(rates.THIN_LATEX_WEEKLY_SPIKE, original.THIN_LATEX_WEEKLY_SPIKE)
  assert.deepEqual(rates.STORE_MODEL_LAYER_TOTALS, original.STORE_MODEL_LAYER_TOTALS)
})

test('shares the specified percentages between planning and the timeline display', () => {
  assert.deepEqual(SPRING_PLANNING_SPLITS, {
    kingAndKingSingle: { soft: 0, medium: 4, firm: 38, veryfirm: 58 },
    otherSizes: { soft: 0, medium: 6, firm: 40, veryfirm: 54 }
  })
  for (const split of Object.values(SPRING_PLANNING_SPLITS)) {
    assert.equal(Object.values(split).reduce((sum, value) => sum + value, 0), 100)
  }
})

test('applies fixed spring splits to every size without requiring observed store orders', () => {
  const input = structuredClone(baseRates)
  delete input.STORE_SKU_SPLIT
  delete input.SKU_WEEKLY_DEMAND_SPIKE
  input.WEEKLY_SALES_SPIKE = { King: 100, Queen: 100, Double: 100, 'King Single': 100, Single: 100 }
  const rates = withSpringStoreSplitDemand(input)

  for (const { id: size } of MATTRESS_SIZES) {
    const expected = size === 'King' || size === 'King Single'
      ? { soft: 0, medium: 4, firm: 38, veryfirm: 58 }
      : { soft: 0, medium: 6, firm: 40, veryfirm: 54 }

    assert.equal(rates.WEEKLY_SALES_RATE[size], 100)
    assert.deepEqual(rates.RAW_SKU_WEEKLY_DEMAND[size], expected)
    for (const firmness of FIRMNESS_TYPES) {
      assert.equal(rates.FIRMNESS_DISTRIBUTION[size][firmness], expected[firmness] / 100)
      assert.equal(getSpringStoreSplitDemandRate(input, size, firmness), expected[firmness])
    }
  }
  assert.deepEqual(rates.WEEKLY_SALES_SPIKE, input.WEEKLY_SALES_SPIKE)
})

test('historical SKU floors cannot revive soft demand or override the fixed percentages', () => {
  const input = structuredClone(baseRates)
  for (const { id: size } of MATTRESS_SIZES) {
    input.RAW_SKU_WEEKLY_DEMAND[size] = { soft: 50, medium: 50, firm: 50, veryfirm: 50 }
    input.FIRMNESS_DISTRIBUTION[size] = { soft: 1, medium: 0, firm: 0, veryfirm: 0 }
  }
  const rates = withSpringStoreSplitDemand(input)
  const metrics = calculateSkuMetrics({ springs: createEmptySpringInventory() }, rates, [])

  for (const sku of metrics) {
    const expected = getSpringStoreSplitDemandRate(input, sku.size, sku.firmness)
    assert.ok(Math.abs(sku.weeklyDemand - expected) < 0.000001)
    if (sku.firmness === 'soft') assert.equal(sku.weeklyDemand, 0)
  }
})

test('allocates valid whole pallets with no soft springs under the fixed demand assumptions', (t) => {
  t.mock.method(console, 'log', () => {})
  const rates = withSpringStoreSplitDemand(baseRates)
  const order = calculateDemandBasedOrder(12, { springs: createEmptySpringInventory() }, rates, [])

  assert.equal(order.pallets.length, 12)
  assert.equal(order.metadata.total_springs, 360)
  for (const pallet of order.pallets) {
    assert.equal(pallet.total, 30)
    assert.ok(MATTRESS_SIZES.some(size => size.id === pallet.size))
    assert.equal(Object.values(pallet.firmness_breakdown).reduce((sum, quantity) => sum + quantity, 0), 30)
    assert.equal(pallet.firmness_breakdown.soft || 0, 0)
  }
})

test('zero spike volume stays zero rather than falling back to historical spring demand', () => {
  const input = structuredClone(baseRates)
  input.SKU_WEEKLY_DEMAND_SPIKE = {}
  delete input.STORE_SKU_SPLIT
  const rates = withSpringStoreSplitDemand(input)

  for (const { id: size } of MATTRESS_SIZES) {
    assert.equal(rates.WEEKLY_SALES_RATE[size], 0)
    for (const firmness of FIRMNESS_TYPES) {
      assert.equal(rates.RAW_SKU_WEEKLY_DEMAND[size][firmness], 0)
    }
  }
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
