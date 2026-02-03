<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  skuLookup: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Tab state
const activeTab = ref('springs')

// Sizes in display order
const SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single']
const FIRMNESS_TYPES = ['firm', 'medium', 'soft']
const COMPONENT_TYPES = [
  { key: 'micro_coils', label: 'Micro Coils', sizesOnly: ['King', 'Queen'] },
  { key: 'thin_latex', label: 'Thin Latex', sizesOnly: ['King', 'Queen'] },
  { key: 'felt', label: 'Felt', sizesOnly: null },
  { key: 'top_panel', label: 'Top Panel', sizesOnly: null },
  { key: 'bottom_panel', label: 'Bottom Panel', sizesOnly: null },
  { key: 'side_panel', label: 'Side Panel', sizesOnly: ['King', 'Queen', 'Double'] }
]

// Get SKU string for spring
const getSpringSkuString = (firmness, size) => {
  return `springs${firmness}${size.toLowerCase().replace(' ', '')}`
}

// Get SKU string for component
const getComponentSkuString = (componentType, size) => {
  const prefixes = {
    micro_coils: 'microcoils',
    thin_latex: 'thinlatex',
    felt: 'felt',
    top_panel: 'paneltop',
    bottom_panel: 'panelbottom',
    side_panel: 'panelside'
  }
  return `${prefixes[componentType]}${size.toLowerCase().replace(' ', '')}`
}

// Get quantity for a SKU
const getQuantity = (skuString) => {
  const skuData = props.skuLookup.getSkuData(skuString)
  if (!skuData) return 0
  return props.modelValue[skuData.id] || 0
}

// Set quantity for a SKU
const setQuantity = (skuString, quantity) => {
  const skuData = props.skuLookup.getSkuData(skuString)
  if (!skuData) return

  const newValue = { ...props.modelValue }
  const qty = parseInt(quantity) || 0

  if (qty <= 0) {
    delete newValue[skuData.id]
  } else {
    newValue[skuData.id] = qty
  }

  emit('update:modelValue', newValue)
}

// Increment/decrement quantity
const adjustQuantity = (skuString, delta) => {
  const current = getQuantity(skuString)
  const newQty = Math.max(0, current + delta)
  setQuantity(skuString, newQty)
}

// Get total for springs
const springTotal = computed(() => {
  let total = 0
  for (const firmness of FIRMNESS_TYPES) {
    for (const size of SIZES) {
      total += getQuantity(getSpringSkuString(firmness, size))
    }
  }
  return total
})

// Get total for components
const componentTotal = computed(() => {
  let total = 0
  for (const comp of COMPONENT_TYPES) {
    const sizes = comp.sizesOnly || SIZES
    for (const size of sizes) {
      total += getQuantity(getComponentSkuString(comp.key, size))
    }
  }
  return total
})

// Clear all springs
const clearSprings = () => {
  const newValue = { ...props.modelValue }
  for (const firmness of FIRMNESS_TYPES) {
    for (const size of SIZES) {
      const skuString = getSpringSkuString(firmness, size)
      const skuData = props.skuLookup.getSkuData(skuString)
      if (skuData) {
        delete newValue[skuData.id]
      }
    }
  }
  emit('update:modelValue', newValue)
}

// Clear all components
const clearComponents = () => {
  const newValue = { ...props.modelValue }
  for (const comp of COMPONENT_TYPES) {
    const sizes = comp.sizesOnly || SIZES
    for (const size of sizes) {
      const skuString = getComponentSkuString(comp.key, size)
      const skuData = props.skuLookup.getSkuData(skuString)
      if (skuData) {
        delete newValue[skuData.id]
      }
    }
  }
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div>
    <!-- Tabs -->
    <div class="flex border-b border-border mb-4">
      <button
        @click="activeTab = 'springs'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === 'springs'
            ? 'border-brand text-brand-light'
            : 'border-transparent text-zinc-400 hover:text-zinc-50'
        ]"
      >
        Springs ({{ springTotal }})
      </button>
      <button
        @click="activeTab = 'components'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeTab === 'components'
            ? 'border-brand text-brand-light'
            : 'border-transparent text-zinc-400 hover:text-zinc-50'
        ]"
      >
        Components ({{ componentTotal }})
      </button>
    </div>

    <!-- Springs Tab -->
    <div v-if="activeTab === 'springs'">
      <div class="flex justify-end mb-2">
        <button
          v-if="springTotal > 0"
          @click="clearSprings"
          class="text-xs text-zinc-400 hover:text-zinc-50"
        >
          Clear all
        </button>
      </div>

      <!-- Springs Grid -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-zinc-400 text-left">
              <th class="py-2 pr-4 font-medium">Size</th>
              <th class="py-2 px-2 font-medium text-center">Firm</th>
              <th class="py-2 px-2 font-medium text-center">Medium</th>
              <th class="py-2 px-2 font-medium text-center">Soft</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="size in SIZES" :key="size" class="border-t border-border">
              <td class="py-2 pr-4 text-zinc-50 font-medium">{{ size }}</td>
              <td v-for="firmness in FIRMNESS_TYPES" :key="firmness" class="py-2 px-2">
                <div class="flex items-center justify-center gap-1">
                  <button
                    @click="adjustQuantity(getSpringSkuString(firmness, size), -10)"
                    class="w-6 h-6 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 rounded text-xs"
                  >
                    -10
                  </button>
                  <input
                    type="number"
                    :value="getQuantity(getSpringSkuString(firmness, size))"
                    @input="setQuantity(getSpringSkuString(firmness, size), $event.target.value)"
                    class="w-16 px-2 py-1 bg-zinc-800 border border-border rounded text-center text-zinc-50 text-sm"
                    min="0"
                  />
                  <button
                    @click="adjustQuantity(getSpringSkuString(firmness, size), 10)"
                    class="w-6 h-6 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 rounded text-xs"
                  >
                    +10
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Components Tab -->
    <div v-if="activeTab === 'components'">
      <div class="flex justify-end mb-2">
        <button
          v-if="componentTotal > 0"
          @click="clearComponents"
          class="text-xs text-zinc-400 hover:text-zinc-50"
        >
          Clear all
        </button>
      </div>

      <!-- Components by Type -->
      <div class="space-y-6">
        <div v-for="comp in COMPONENT_TYPES" :key="comp.key">
          <h4 class="text-sm font-medium text-zinc-300 mb-2">{{ comp.label }}</h4>
          <div class="grid grid-cols-5 gap-2">
            <div
              v-for="size in SIZES"
              :key="size"
              class="text-center"
            >
              <div class="text-xs text-zinc-500 mb-1">{{ size }}</div>
              <template v-if="!comp.sizesOnly || comp.sizesOnly.includes(size)">
                <div class="flex items-center justify-center gap-1">
                  <button
                    @click="adjustQuantity(getComponentSkuString(comp.key, size), -10)"
                    class="w-5 h-5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 rounded text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    :value="getQuantity(getComponentSkuString(comp.key, size))"
                    @input="setQuantity(getComponentSkuString(comp.key, size), $event.target.value)"
                    class="w-14 px-1 py-1 bg-zinc-800 border border-border rounded text-center text-zinc-50 text-xs"
                    min="0"
                  />
                  <button
                    @click="adjustQuantity(getComponentSkuString(comp.key, size), 10)"
                    class="w-5 h-5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 rounded text-xs"
                  >
                    +
                  </button>
                </div>
              </template>
              <template v-else>
                <span class="text-zinc-600 text-xs">N/A</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
