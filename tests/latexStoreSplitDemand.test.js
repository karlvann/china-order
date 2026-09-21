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
  assert.deepEqual(LATEX_PLANNING_SPLIT, {
    King: { soft: 68, medium: 28, firm: 4 },
    Queen: { soft: 58, medium: 38, firm: 4 }
  })
  for (const size of LATEX_SIZES) {
    assert.equal(Object.values(LATEX_PLANNING_SPLIT[size]).reduce((sum, value) => sum + value, 0), 100)
  }
})

test('uses each size spike total with the fixed mix instead of observed store percentages', () => {
  const rates = withLatexStoreSplitDemand(baseRates)

  assert.deepEqual(rates.WEEKLY_TOTAL_BY_SIZE, { King: 20, Queen: 10 })
  assert.deepEqual(rates.WEEKLY_RATES, {
    firm: { King: 0.8, Queen: 0.4 },
    medium: { King: 5.6, Queen: 3.8 },
    soft: { King: 13.6, Queen: 5.8 }
  })
  assert.deepEqual(rates.FIRMNESS_DISTRIBUTION.King, { firm: 0.04, medium: 0.28, soft: 0.68 })
  assert.deepEqual(rates.FIRMNESS_DISTRIBUTION.Queen, { firm: 0.04, medium: 0.38, soft: 0.58 })
  for (const size of LATEX_SIZES) {
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
    assert.equal(getLatexStoreSplitDemandRate(input, 'King', 'soft'), 13.6)
    assert.equal(getLatexStoreSplitDemandRate(input, 'Queen', 'firm'), 0.4)
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

  assert.deepEqual(rates.WEEKLY_RATES, {
    firm: { King: 0.005, Queen: 0.005 },
    medium: { King: 0.035, Queen: 0.048 },
    soft: { King: 0.085, Queen: 0.073 }
  })
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
