import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test, { after } from 'node:test'
import { computed, readonly, ref } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { calculateComponentOrder } from '../lib/algorithms/componentCalc.js'
import { optimizeComponentOrder } from '../lib/algorithms/exportOptimization.js'
import { createEmptyComponentInventory, createEmptySpringInventory } from '../lib/utils/inventory.js'
import { getCurrentMonday } from '../lib/utils/dates.js'

// Run the real composable/store in Node with Nuxt auto-imports and Directus mocked.
// No network requests or authenticated sessions are used.
const autoImports = {
  computed,
  readonly,
  ref,
  defineStore,
  onMounted: () => {},
  useDirectusItems: () => {},
  useDirectusSession: () => ({
    handleDirectusAuthError: async () => false,
    getDirectusErrorMessage: error => error.message
  }),
  useSettingsStore: undefined
}
const originalGlobals = Object.fromEntries(Object.keys(autoImports).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
Object.assign(globalThis, autoImports)

const root = new URL('../', import.meta.url)
const hooks = registerHooks({
  resolve: (specifier, context, nextResolve) => nextResolve(
    specifier.startsWith('~/') ? new URL(specifier.slice(2), root).href : specifier,
    context
  )
})
const { useSettingsStore } = await import('../stores/settings.js')
const { useWeeklySales } = await import('../composables/useWeeklySales.js')
globalThis.useSettingsStore = useSettingsStore

after(() => {
  hooks.deregister()
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

test('recipe collection, store toggle and component ordering work together and restore the baseline', async (t) => {
  t.mock.method(console, 'log', () => {})
  setActivePinia(createPinia())
  const monday = getCurrentMonday()
  const paidOrders = []

  for (let week = 1; week <= 12; week++) {
    const date = new Date(monday)
    date.setDate(date.getDate() - week * 7)
    paidOrders.push({
      id: week,
      date_created: date.toISOString(),
      sale_source: 'website',
      skus: [
        { skus_id: { sku: 'cloud8king' }, quantity: 2 },
        { skus_id: { sku: 'aurora8king' }, quantity: 2 },
        { skus_id: { sku: 'cooper8king' }, quantity: 2 },
        { skus_id: { sku: 'aurora8queen' }, quantity: 4 },
        { skus_id: { sku: 'cooper8single' }, quantity: 2 },
        { skus_id: { sku: 'cloud8double' }, quantity: 1 },
        { skus_id: { sku: 'aurora8kingsingle' }, quantity: 1 }
      ]
    })
  }
  // A recent volume increase is trimmed out of the baseline, but included in Spike.
  paidOrders[0].skus.push({ skus_id: { sku: 'cloud8king' }, quantity: 12 })

  const storeOrders = [
    {
      sale_source: 'store',
      skus: [
        { skus_id: { sku: 'cloud8king' }, quantity: '6' },
        { skus_id: { sku: 'aurora11king' }, quantity: 2 },
        { skus_id: { sku: 'cooper14king' }, quantity: 2 },
        { skus_id: { sku: 'cooper8single' }, quantity: 2 },
        { skus_id: { sku: 'cloud8single' }, quantity: 0 },
        { skus_id: { sku: 'not-a-mattress' }, quantity: 100 },
        { skus_id: null, quantity: 100 }
      ]
    },
    { sale_source: null, skus: [{ skus_id: { sku: 'cloud15squeen' }, quantity: 2 }] },
    { sale_source: ' Website ', skus: [{ skus_id: { sku: 'cooper8king' }, quantity: 100 }] }
  ]
  const requests = []
  t.mock.method(globalThis, 'useDirectusItems', () => ({
    getItems: async request => {
      requests.push(request)
      return requests.length === 1 ? paidOrders : { data: storeOrders }
    }
  }))

  const sales = useWeeklySales()
  await sales.refresh()
  assert.equal(sales.error.value, null)
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0].params.filter.payment_status, { _eq: 'paid' })
  assert.equal(requests[1].params.filter.payment_status, undefined)

  const settings = useSettingsStore()
  assert.equal(settings.liveSalesLoaded, true)
  assert.deepEqual(settings.liveSalesRates.STORE_MODEL_LAYER_TOTALS.King, {
    mattresses: 10, microLayers: 14, thinLatexLayers: 14
  })
  assert.deepEqual(settings.liveSalesRates.MODEL_LAYER_TOTALS.King, {
    mattresses: 84, microLayers: 96, thinLatexLayers: 96
  })
  assert.deepEqual(settings.liveSalesRates.STORE_MODEL_LAYER_TOTALS.Single, {
    mattresses: 2, microLayers: 0, thinLatexLayers: 0
  })
  assert.equal(settings.liveSalesRates.STORE_MODEL_LAYER_TOTALS.Double.mattresses, 0)

  const baseline = JSON.parse(JSON.stringify(settings.liveSalesRates))
  assert.equal(settings.planningSalesRates, settings.liveSalesRates)
  assert.deepEqual(baseline.MICRO_COIL_WEEKLY_DEMAND, { King: 6, Queen: 7 })

  settings.toggleStoreSplitDemand()
  const planning = settings.planningSalesRates
  assert.equal(planning.WEEKLY_SALES_RATE.King, 12)
  assert.deepEqual(planning.MICRO_COIL_WEEKLY_DEMAND, { King: 16.8, Queen: 11 })
  assert.deepEqual(planning.THIN_LATEX_WEEKLY_DEMAND, { King: 16.8, Queen: 11 })
  assert.equal(planning.MICRO_COIL_WEEKLY_SPIKE.King, 18)
  assert.deepEqual(JSON.parse(JSON.stringify(settings.liveSalesRates)), baseline)

  const springs = createEmptySpringInventory()
  Object.assign(springs.medium, { King: 120, Queen: 180, Single: 30, Double: 30 })
  const inventory = createEmptyComponentInventory()
  const baselineOrder = calculateComponentOrder({ springs }, {}, inventory, baseline)
  const storeOrder = calculateComponentOrder({ springs }, {}, inventory, planning)
  const optimized = optimizeComponentOrder(storeOrder, 'optimized')

  for (const size of ['King', 'Queen']) {
    assert.ok(storeOrder.micro_coils[size] > baselineOrder.micro_coils[size])
    assert.equal(storeOrder.thin_latex[size], storeOrder.micro_coils[size])
    assert.equal(optimized.micro_coils[size] % 20, 0)
    assert.equal(optimized.thin_latex[size] % 10, 0)
  }
  for (const size of ['Double', 'King Single', 'Single']) {
    assert.equal(storeOrder.micro_coils[size], 0)
    assert.equal(storeOrder.thin_latex[size], 0)
  }

  settings.toggleStoreSplitDemand()
  assert.equal(settings.planningSalesRates, settings.liveSalesRates)
  assert.deepEqual(JSON.parse(JSON.stringify(settings.planningSalesRates)), baseline)
})
