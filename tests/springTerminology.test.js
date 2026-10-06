import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMattressSku } from '../lib/utils/mattressSku.js'
import { SPRING_INVENTORY_SKU_MAP, createEmptySpringInventory } from '../lib/utils/inventory.js'

const tensions = { soft: 'verysoft', medium: 'soft', firm: 'medium', veryfirm: 'firm' }
const sizes = { single: 'Single', kingsingle: 'King Single', double: 'Double', queen: 'Queen', king: 'King' }
const tokenTensions = { v: 'verysoft', s: 'soft', m: 'medium', f: 'firm' }

test('20 renamed component records still point to the same physical inventory quantities', () => {
  const inventory = createEmptySpringInventory()
  let id = 0
  for (const [before, after] of Object.entries(tensions)) {
    for (const [sizeKey, size] of Object.entries(sizes)) {
      const record = { id: ++id, before: `springs${before}${sizeKey}`, sku: `springs${after}${sizeKey}`, quantity: id * 13 }
      const mapping = SPRING_INVENTORY_SKU_MAP[record.sku]
      assert.deepEqual(mapping, { firmness: after, size })
      inventory[mapping.firmness][mapping.size] = record.quantity
      assert.equal(inventory[after][size], id * 13)
    }
  }
  assert.equal(Object.keys(SPRING_INVENTORY_SKU_MAP).length, 20)
  assert.equal(SPRING_INVENTORY_SKU_MAP.springsveryfirmqueen, undefined)
})

test('all 330 historical mattress SKUs retain model, recipe and latex with the renamed spring bucket', () => {
  let count = 0
  for (const model of ['cloud', 'aurora', 'cooper']) {
    for (let level = model === 'cooper' ? 8 : 2; level <= 19; level++) {
      for (const suffix of level >= 11 && level <= 16 ? ['', 's'] : ['']) {
        for (const size of Object.keys(sizes)) {
          const sku = `${model}${level}${suffix}${size}`
          const parsed = parseMattressSku(sku)
          assert.equal(parsed.firmnessType, level <= 4 ? 'verysoft' : level <= 10 ? 'soft' : level <= 13 ? 'medium' : 'firm', sku)
          const springToken = parsed.recipe.find(token => /^[vsmf]s[sf]$/.test(token))
          assert.ok(springToken, sku)
          assert.equal(tokenTensions[springToken[0]], parsed.springFirmness, sku)
          assert.equal(parsed.springOrientation, springToken[2] === 'f' ? 'firm_up' : 'soft_up', sku)
          assert.equal(parsed.latexFirmness, suffix || level <= 7 ? 'soft' : level <= 16 ? 'medium' : 'firm', sku)
          assert.equal(parsed.microLayers, model === 'cloud' ? 2 : model === 'aurora' ? 1 : 0)
          assert.equal(parsed.thinLatexLayers, parsed.microLayers)
          assert.equal(parsed.modelKey, `${level}${suffix}`)
          assert.equal(parsed.size, sizes[size])
          count++
        }
      }
    }
  }
  assert.equal(count, 330)
})
