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
    King: { soft: 61, medium: 37, firm: 2 },
    Queen: { soft: 54, medium: 44, firm: 2 },
    Double: { soft: 54, medium: 44, firm: 2 },
    'King Single': { soft: 54, medium: 44, firm: 2 },
    Single: { soft: 61, medium: 37, firm: 2 }
  })
  for (const size of Object.keys(LATEX_PLANNING_SPLIT)) {
    assert.equal(Object.values(LATEX_PLANNING_SPLIT[size]).reduce((sum, value) => sum + value, 0), 100)
  }
})

test('preserves each 12-week sheet total while applying the fixed mix', () => {
  const rates = withLatexStoreSplitDemand(baseRates)

  assert.deepEqual(rates.WEEKLY_TOTAL_BY_SIZE, { King: 10, Queen: 5 })
  assert.deepEqual(rates.WEEKLY_RATES, {
    firm: { King: 0.2, Queen: 0.1 },
    medium: { King: 3.7, Queen: 2.2 },
    soft: { King: 6.1, Queen: 2.7 }
  })
  assert.deepEqual(rates.FIRMNESS_DISTRIBUTION.King, { firm: 0.02, medium: 0.37, soft: 0.61 })
  assert.deepEqual(rates.FIRMNESS_DISTRIBUTION.Queen, { firm: 0.02, medium: 0.44, soft: 0.54 })
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
    assert.equal(getLatexStoreSplitDemandRate(input, 'King', 'soft'), 6.1)
    assert.equal(getLatexStoreSplitDemandRate(input, 'Queen', 'firm'), 0.1)
  }
})

test('recent spikes do not change the 12-week sheet totals', () => {
  const input = structuredClone(baseRates)
  input.WEEKLY_SPIKES = { soft: { Queen: 10 } }
  const rates = withLatexStoreSplitDemand(input)

  assert.deepEqual(rates.WEEKLY_TOTAL_BY_SIZE, input.WEEKLY_TOTAL_BY_SIZE)

  delete input.WEEKLY_SPIKES
  const ratesWithoutSpikes = withLatexStoreSplitDemand(input)
  assert.deepEqual(ratesWithoutSpikes.WEEKLY_RATES, rates.WEEKLY_RATES)
})

test('rounds the fixed latex planning rates to three decimal places', () => {
  const input = structuredClone(baseRates)
  input.WEEKLY_TOTAL_BY_SIZE = { King: 0.125, Queen: 0.125 }
  const rates = withLatexStoreSplitDemand(input)

  assert.deepEqual(rates.WEEKLY_RATES, {
    firm: { King: 0.003, Queen: 0.003 },
    medium: { King: 0.046, Queen: 0.055 },
    soft: { King: 0.076, Queen: 0.068 }
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
