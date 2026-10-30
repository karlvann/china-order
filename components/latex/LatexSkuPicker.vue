<script setup>
import { LATEX_FIRMNESSES, LATEX_SIZES, PILLOW_LATEX_TYPES, PILLOW_LATEX_LABELS, LATEX_PACK_SIZE, THIN_LATEX_PACK_SIZE } from '~/lib/constants/index.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  skuIdMap: {
    type: Object,
    default: () => ({})
  },
  currentInventory: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

// Get quantity for a specific SKU
const getSkuQuantity = (skuString) => {
  const skuId = props.skuIdMap[skuString]
  return skuId ? (props.modelValue[skuId] || 0) : 0
}

// Set quantity for a specific SKU
const setSkuQuantity = (skuString, value) => {
  const skuId = props.skuIdMap[skuString]
  if (!skuId) return

  const newValue = { ...props.modelValue }
  newValue[skuId] = Math.max(0, parseInt(value) || 0)
  emit('update:modelValue', newValue)
}

const getQuantity = (firmness, size) => {
  return getSkuQuantity(`latex${firmness}${size.toLowerCase()}`)
}

const setQuantity = (firmness, size, value) => {
  setSkuQuantity(`latex${firmness}${size.toLowerCase()}`, value)
}

const getPillowLatexQuantity = (type) => {
  return getSkuQuantity(`pillowlatex${type}`)
}

const setPillowLatexQuantity = (type, value) => {
  setSkuQuantity(`pillowlatex${type}`, value)
}

const getThinLatexQuantity = (size) => {
  return getSkuQuantity(`thinlatex${size.toLowerCase()}`)
}

const setThinLatexQuantity = (size, value) => {
  setSkuQuantity(`thinlatex${size.toLowerCase()}`, value)
}

// Increment quantity
const increment = (firmness, size) => {
  setQuantity(firmness, size, getQuantity(firmness, size) + LATEX_PACK_SIZE)
}

// Decrement quantity
const decrement = (firmness, size) => {
  setQuantity(firmness, size, getQuantity(firmness, size) - LATEX_PACK_SIZE)
}

// Get current inventory for a SKU (rounded to integer)
const getInventory = (firmness, size) => {
  return Math.round(props.currentInventory[firmness]?.[size] || 0)
}

// Capitalize firmness for display
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

// Calculate totals
const totalBySize = computed(() => {
  const totals = { King: 0, Queen: 0 }
  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      totals[size] += getQuantity(firmness, size)
    }
  }
  return totals
})

const totalPillowLatex = computed(() => {
  let total = 0
  for (const type of PILLOW_LATEX_TYPES) {
    total += getPillowLatexQuantity(type)
  }
  return total
})

const totalThinLatex = computed(() => LATEX_SIZES.reduce((total, size) => total + getThinLatexQuantity(size), 0))

const grandTotal = computed(() => {
  return totalBySize.value.King + totalBySize.value.Queen + totalPillowLatex.value + totalThinLatex.value
})
</script>

<template>
  <div class="space-y-4">
    <!-- Size columns -->
    <div class="grid grid-cols-2 gap-4">
      <div v-for="size in LATEX_SIZES" :key="size" class="space-y-2">
        <div class="text-sm font-medium text-muted mb-3">
          {{ size }} Latex
          <span class="text-subtle font-normal">({{ totalBySize[size] }} total)</span>
        </div>

        <!-- Firmness rows for this size -->
        <div
          v-for="firmness in LATEX_FIRMNESSES"
          :key="`${firmness}-${size}`"
          class="flex flex-col items-center bg-surface border border-border rounded-lg p-3"
        >
          <div class="text-sm text-primary">{{ capitalize(firmness) }}</div>
          <div class="text-xs text-subtle mb-2">Stock: {{ getInventory(firmness, size) }}</div>

          <div class="flex items-center gap-2">
            <button
              @click="decrement(firmness, size)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
              :disabled="getQuantity(firmness, size) <= 0"
            >
              -
            </button>
            <input
              type="number"
              :value="getQuantity(firmness, size)"
              @input="setQuantity(firmness, size, $event.target.value)"
              class="w-16 h-8 text-center bg-input-surface border border-border rounded text-primary text-sm"
              min="0"
              :step="LATEX_PACK_SIZE"
            >
            <button
              @click="increment(firmness, size)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Thin latex rows -->
    <div class="space-y-2">
      <div class="text-sm font-medium text-muted mb-3">
        Thin latex for micro coils
        <span class="text-subtle font-normal">({{ totalThinLatex }} total)</span>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="size in LATEX_SIZES"
          :key="`thin-latex-${size}`"
          class="flex flex-col items-center bg-surface border border-border rounded-lg p-3"
        >
          <div class="text-sm text-primary">{{ size }}</div>
          <div class="text-xs text-subtle mb-2">Stock: {{ Math.round(currentInventory.thinLatex?.[size] || 0) }}</div>

          <div class="flex items-center gap-2">
            <button
              @click="setThinLatexQuantity(size, getThinLatexQuantity(size) - THIN_LATEX_PACK_SIZE)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
              :disabled="getThinLatexQuantity(size) <= 0"
            >
              -
            </button>
            <input
              type="number"
              :value="getThinLatexQuantity(size)"
              @input="setThinLatexQuantity(size, $event.target.value)"
              class="w-16 h-8 text-center bg-input-surface border border-border rounded text-primary text-sm"
              min="0"
              :step="THIN_LATEX_PACK_SIZE"
            >
            <button
              @click="setThinLatexQuantity(size, getThinLatexQuantity(size) + THIN_LATEX_PACK_SIZE)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <p class="text-xs text-subtle">Suggested quantities match projected micro-coil stock when this order arrives.</p>
    </div>

    <!-- Pillow latex rows -->
    <div class="space-y-2">
      <div class="text-sm font-medium text-muted mb-3">
        Pillow latex
        <span class="text-subtle font-normal">({{ totalPillowLatex }} total)</span>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="type in PILLOW_LATEX_TYPES"
          :key="type"
          class="flex flex-col items-center bg-surface border border-border rounded-lg p-3"
        >
          <div class="text-sm text-primary">{{ PILLOW_LATEX_LABELS[type] }}</div>
          <div class="text-xs text-subtle mb-2">Stock: {{ Math.round(currentInventory.pillowLatex?.[type] || 0) }}</div>

          <div class="flex items-center gap-2">
            <button
              @click="setPillowLatexQuantity(type, getPillowLatexQuantity(type) - LATEX_PACK_SIZE)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
              :disabled="getPillowLatexQuantity(type) <= 0"
            >
              -
            </button>
            <input
              type="number"
              :value="getPillowLatexQuantity(type)"
              @input="setPillowLatexQuantity(type, $event.target.value)"
              class="w-16 h-8 text-center bg-input-surface border border-border rounded text-primary text-sm"
              min="0"
              :step="LATEX_PACK_SIZE"
            >
            <button
              @click="setPillowLatexQuantity(type, getPillowLatexQuantity(type) + LATEX_PACK_SIZE)"
              class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Grand Total -->
    <div class="pt-3 border-t border-border">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted">Total latex items</span>
        <span class="text-lg font-bold text-accent-latex-light">{{ grandTotal }}</span>
      </div>
    </div>
  </div>
</template>
