import assert from 'node:assert/strict'
import test from 'node:test'
import { LATEX_FIRMNESSES, LATEX_PLANNING_SPLIT, LATEX_SIZES } from '../lib/constants/index.js'
import { getLatexStoreSplitDemandRate, withLatexStoreSplitDemand } from '../lib/utils/storeSplitDemand.js'

const baseRates = {
  WEEKLY_TOTAL_BY_SIZE: { King: 10, Queen: 5 },
  WEEKLY_RATES: {
    firm: { King: 4, Queen: 2 },
    medium: { King: 5, Queen: 2 },
    soft: { King: 1, Queen: 1 }
  },
  WEEKLY_SPIKES: {
    firm: { King: 2, Queen: 3 },
    medium: { King: 6, Queen: 4 },
    soft: { King: 12, Queen: 3 }
  },
  STORE_SPLIT: {
    firm: { King: 100, Queen: 100 },
    medium: { King: 0, Queen: 0 },
    soft: { King: 0, Queen: 0 }
  },
  FIRMNESS_DISTRIBUTION: {
    King: { firm: 0.4, medium: 0.5, soft: 0.1 },
    Queen: { firm: 0.4, medium: 0.4, soft: 0.2 }
  },
  PILLOW_LATEX_WEEKLY_RATES: { thin: 0.25, thick: 0.5 },
  PILLOW_LATEX_WEEKLY_SPIKES: { thin: 1, thick: 2 }
}

test('shares the specified latex percentages with the timeline summary', () => {
  assert.deepEqual(LATEX_PLANNING_SPLIT, { soft: 52, medium: 45, firm: 3 })
  assert.equal(Object.values(LATEX_PLANNING_SPLIT).reduce((sum, value) => sum + value, 0), 100)
})

test('uses each size spike total with the fixed mix instead of observed store percentages', () => {
  const rates = withLatexStoreSplitDemand(baseRates)

  assert.deepEqual(rates.WEEKLY_TOTAL_BY_SIZE, { King: 20, Queen: 10 })
  assert.deepEqual(rates.WEEKLY_RATES, {
    firm: { King: 0.6, Queen: 0.3 },
    medium: { King: 9, Queen: 4.5 },
    soft: { King: 10.4, Queen: 5.2 }
  })
  for (const size of LATEX_SIZES) {
    assert.deepEqual(rates.FIRMNESS_DISTRIBUTION[size], { firm: 0.03, medium: 0.45, soft: 0.52 })
    for (const firmness of LATEX_FIRMNESSES) {
      assert.equal(getLatexStoreSplitDemandRate(baseRates, size, firmness), rates.WEEKLY_RATES[firmness][size])
    }
  }
})

test('fixed latex demand does not require any recent store orders', () => {
  for (const storeSplit of [undefined, {}, { firm: { King: 0, Queen: 0 } }]) {
    const input = structuredClone(baseRates)
    input.STORE_SPLIT = storeSplit
    const rates = withLatexStoreSplitDemand(input)

    assert.deepEqual(rates.WEEKLY_RATES, withLatexStoreSplitDemand(baseRates).WEEKLY_RATES)
    assert.equal(getLatexStoreSplitDemandRate(input, 'King', 'soft'), 10.4)
    assert.equal(getLatexStoreSplitDemandRate(input, 'Queen', 'firm'), 0.3)
  }
})

test('zero or missing spike demand stays zero despite positive historical demand', () => {
  const input = structuredClone(baseRates)
  input.WEEKLY_SPIKES = { soft: { Queen: 10 } }
  const rates = withLatexStoreSplitDemand(input)

  assert.equal(rates.WEEKLY_TOTAL_BY_SIZE.King, 0)
  assert.equal(rates.WEEKLY_TOTAL_BY_SIZE.Queen, 10)
  for (const firmness of LATEX_FIRMNESSES) {
    assert.equal(rates.WEEKLY_RATES[firmness].King, 0)
  }

  delete input.WEEKLY_SPIKES
  const emptyRates = withLatexStoreSplitDemand(input)
  for (const size of LATEX_SIZES) {
    for (const firmness of LATEX_FIRMNESSES) {
      assert.equal(emptyRates.WEEKLY_RATES[firmness][size], 0)
    }
  }
})

test('rounds the fixed latex planning rates to three decimal places', () => {
  const input = structuredClone(baseRates)
  input.WEEKLY_SPIKES = { soft: { King: 0.125, Queen: 0.125 } }
  const rates = withLatexStoreSplitDemand(input)

  for (const size of LATEX_SIZES) {
    assert.equal(rates.WEEKLY_RATES.soft[size], 0.065)
    assert.equal(rates.WEEKLY_RATES.medium[size], 0.056)
    assert.equal(rates.WEEKLY_RATES.firm[size], 0.004)
  }
})

test('preserves measured spikes, pillow demand and the original baseline data', () => {
  const input = structuredClone(baseRates)
  const original = structuredClone(input)
  const rates = withLatexStoreSplitDemand(input)

  assert.deepEqual(input, original)
  assert.deepEqual(rates.WEEKLY_SPIKES, original.WEEKLY_SPIKES)
  assert.deepEqual(rates.PILLOW_LATEX_WEEKLY_SPIKES, original.PILLOW_LATEX_WEEKLY_SPIKES)
  assert.deepEqual(rates.PILLOW_LATEX_WEEKLY_RATES, original.PILLOW_LATEX_WEEKLY_RATES)
  assert.deepEqual(rates.STORE_SPLIT, original.STORE_SPLIT)
})
