<script setup>
import { LATEX_FIRMNESSES, LATEX_SIZES } from '~/lib/constants/index.js'

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
const getQuantity = (firmness, size) => {
  const skuString = `latex${firmness}${size.toLowerCase()}`
  const skuId = props.skuIdMap[skuString]
  return skuId ? (props.modelValue[skuId] || 0) : 0
}

// Set quantity for a specific SKU
const setQuantity = (firmness, size, value) => {
  const skuString = `latex${firmness}${size.toLowerCase()}`
  const skuId = props.skuIdMap[skuString]
  if (!skuId) return

  const newValue = { ...props.modelValue }
  newValue[skuId] = Math.max(0, parseInt(value) || 0)
  emit('update:modelValue', newValue)
}

// Increment quantity
const increment = (firmness, size) => {
  setQuantity(firmness, size, getQuantity(firmness, size) + 1)
}

// Decrement quantity
const decrement = (firmness, size) => {
  setQuantity(firmness, size, getQuantity(firmness, size) - 1)
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

const grandTotal = computed(() => {
  return totalBySize.value.King + totalBySize.value.Queen
})
</script>

<template>
  <div class="space-y-4">
    <!-- Size columns -->
    <div class="grid grid-cols-2 gap-4">
      <div v-for="size in LATEX_SIZES" :key="size" class="space-y-2">
        <div class="text-sm font-medium text-zinc-300 mb-3">
          {{ size }} Latex
          <span class="text-zinc-500 font-normal">({{ totalBySize[size] }} total)</span>
        </div>

        <!-- Firmness rows for this size -->
        <div
          v-for="firmness in LATEX_FIRMNESSES"
          :key="`${firmness}-${size}`"
          class="flex flex-col items-center bg-surface border border-border rounded-lg p-3"
        >
          <div class="text-sm text-zinc-50">{{ capitalize(firmness) }}</div>
          <div class="text-xs text-zinc-500 mb-2">Stock: {{ getInventory(firmness, size) }}</div>

          <div class="flex items-center gap-2">
            <button
              @click="decrement(firmness, size)"
              class="w-8 h-8 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
              :disabled="getQuantity(firmness, size) <= 0"
            >
              -
            </button>
            <input
              type="number"
              :value="getQuantity(firmness, size)"
              @input="setQuantity(firmness, size, $event.target.value)"
              class="w-16 h-8 text-center bg-zinc-800 border border-border rounded text-zinc-50 text-sm"
              min="0"
            >
            <button
              @click="increment(firmness, size)"
              class="w-8 h-8 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
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
        <span class="text-sm font-medium text-zinc-300">Total latex items</span>
        <span class="text-lg font-bold text-orange-400">{{ grandTotal }}</span>
      </div>
    </div>
  </div>
</template>
