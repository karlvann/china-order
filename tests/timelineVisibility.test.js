import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test, { after } from 'node:test'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { computed, createSSRApp, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createEmptySpringInventory, createEmptyComponentInventory, createEmptyLatexInventory } from '../lib/utils/inventory.js'

// Compile the real Vue components in Node; no browser, API or Nuxt build required.
const root = new URL('../', import.meta.url)
const hooks = registerHooks({
  resolve: (specifier, context, nextResolve) => nextResolve(
    specifier.startsWith('~/') ? new URL(specifier.slice(2), root).href : specifier,
    context
  ),
  load: (url, context, nextLoad) => {
    if (!url.endsWith('.vue')) return nextLoad(url, context)
    const { descriptor, errors } = parse(readFileSync(new URL(url), 'utf8'), { filename: url })
    assert.deepEqual(errors, [])
    const script = compileScript(descriptor, { id: url })
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: url,
      id: url,
      compilerOptions: { bindingMetadata: script.bindings }
    })
    assert.deepEqual(template.errors, [])
    return { format: 'module', source: `${script.content}\n${template.code}`, shortCircuit: true }
  }
})
const autoImports = {
  computed,
  ref,
  useInventoryOrdersStore: () => ({}),
  useSriLankaOrdersStore: () => ({})
}
const originalGlobals = Object.fromEntries(Object.keys(autoImports).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
Object.assign(globalThis, autoImports)

after(() => {
  hooks.deregister()
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

const scenarios = [
  {
    path: 'components/forecast/SpringTimelineDetailed.vue',
    inventory: { springs: createEmptySpringInventory() },
    usageRates: {
      WEEKLY_SALES_RATE: { King: 1 },
      FIRMNESS_DISTRIBUTION: { King: { soft: 0, veryfirm: 0.049, firm: 0.05, medium: 0.051 } }
    },
    totalRows: 20,
    visibleRows: 2
  },
  {
    path: 'components/forecast/ComponentTimelineDetailed.vue',
    inventory: { components: createEmptyComponentInventory() },
    usageRates: {
      WEEKLY_SALES_RATE: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      MICRO_COIL_WEEKLY_DEMAND: { King: 0, Queen: 0.049 },
      THIN_LATEX_WEEKLY_DEMAND: { King: 0.05, Queen: 0.051 }
    },
    totalRows: 22,
    visibleRows: 2
  },
  {
    path: 'components/srilanka/LatexTimeline.vue',
    inventory: createEmptyLatexInventory(),
    usageRates: {
      WEEKLY_RATES: { firm: { King: 0, Queen: 0.049 }, medium: { King: 0.05, Queen: 0.051 } },
      PILLOW_LATEX_WEEKLY_RATES: { thin: 0, thick: 0.05 }
    },
    totalRows: 8,
    visibleRows: 3
  }
]

for (const scenario of scenarios) {
  test(`${scenario.path}: defaults on, keeps 0.05/w, and restores hidden rows without changing demand`, async () => {
    const { default: component } = await import(new URL(scenario.path, root).href)
    const defaults = Object.fromEntries(Object.entries(component.props).map(([key, definition]) => [
      key,
      typeof definition.default === 'function' ? definition.default() : definition.default
    ]))
    const props = reactive({ ...defaults, inventory: scenario.inventory, usageRates: scenario.usageRates })
    const originalRates = JSON.stringify(props.usageRates)
    const { rows } = component.setup(props, { expose: () => {}, emit: () => {} })

    assert.equal(props.hideZeroDemandItems, true)
    assert.equal(rows.value.length, scenario.visibleRows)
    assert.ok(rows.value.every(row => row.weeklyRate >= 0.05))
    assert.ok(rows.value.some(row => row.weeklyRate === 0.05))

    props.hideZeroDemandItems = false
    const allRows = rows.value
    assert.equal(allRows.length, scenario.totalRows)
    assert.ok(allRows.some(row => row.weeklyRate === 0))
    assert.ok(allRows.some(row => row.weeklyRate === 0.049))

    props.hideZeroDemandItems = true
    assert.deepEqual(rows.value, allRows.filter(row => row.weeklyRate >= 0.05))
    assert.equal(JSON.stringify(props.usageRates), originalRates)

    // Switching planning modes can replace the demand data while the filter is on.
    props.usageRates = JSON.parse(originalRates, (_key, value) => typeof value === 'number' ? 0 : value)
    assert.equal(rows.value.length, 0)
    props.usageRates = JSON.parse(originalRates)
    assert.equal(rows.value.length, scenario.visibleRows)
  })
}

for (const scenario of scenarios.filter(item => item.path !== 'components/forecast/ComponentTimelineDetailed.vue')) {
  test(`${scenario.path}: renders Spike without a store split column and closes the sticky-column gap`, async () => {
    const { default: component, render } = await import(new URL(scenario.path, root).href)
    const html = await renderToString(createSSRApp({ ...component, render }, {
      inventory: scenario.inventory,
      usageRates: scenario.usageRates
    }))

    assert.match(html, />Spike<\/th>/)
    assert.doesNotMatch(html, />Store split<\/th>/)
    const isSpringTimeline = scenario.path.includes('SpringTimeline')
    assert.ok(html.includes(`sticky left-[${isSpringTimeline ? 320 : 280}px] bg-table-current`))

    if (isSpringTimeline) {
      const summary = html.split('</table>')[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
      assert.ok(summary.includes('King and King Single 4% 38% 58%'))
      assert.ok(summary.includes('Queen, Double and Single 6% 40% 54%'))
      assert.doesNotMatch(summary, /\bSoft\b/)
      assert.ok(html.indexOf('Fixed spring demand splits') < html.indexOf('Spring timeline'))
    } else {
      const summary = html.split('</table>')[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
      assert.ok(summary.includes('Size Soft Medium Firm'))
      assert.ok(summary.includes('King 68% 28% 4%'))
      assert.ok(summary.includes('Queen 58% 38% 4%'))
      assert.ok(html.indexOf('Fixed latex demand split') < html.indexOf('Latex timeline'))
    }
  })
}

for (const path of ['components/views/ForecastView.vue', 'components/views/OrderBuilderView.vue']) {
  test(`${path}: control and timeline bindings compile`, async () => {
    await import(new URL(path, root).href)
  })
}
