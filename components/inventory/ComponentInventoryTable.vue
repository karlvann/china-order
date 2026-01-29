<script setup>
import { MATTRESS_SIZES, COMPONENT_TYPES } from '~/lib/constants/index.js'

const inventoryStore = useInventoryStore()

// Check if cell should be hidden (N/A for this component/size)
const shouldHideCell = (componentId, sizeId) => {
  // Micro coils and thin latex are only for King/Queen
  if (['micro_coils', 'thin_latex'].includes(componentId) &&
      ['Double', 'King Single', 'Single'].includes(sizeId)) {
    return true
  }

  // Side panel for Single and King Single (they use Double)
  if (componentId === 'side_panel' && ['Single', 'King Single'].includes(sizeId)) {
    return true
  }

  return false
}

// Get component value
const getComponentValue = (componentId, sizeId) => {
  return inventoryStore.components[componentId]?.[sizeId] || 0
}

// Get total for a component
const getComponentTotal = (componentId) => {
  return MATTRESS_SIZES.reduce((sum, size) => {
    if (shouldHideCell(componentId, size.id)) return sum
    return sum + getComponentValue(componentId, size.id)
  }, 0)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-surfaceHover">
          <th class="table-header">Component</th>
          <th
            v-for="size in MATTRESS_SIZES"
            :key="size.id"
            class="table-header text-center"
          >
            {{ size.name }}
          </th>
          <th class="table-header text-center">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="comp in COMPONENT_TYPES"
          :key="comp.id"
          class="border-b border-border"
        >
          <td class="table-cell font-semibold">{{ comp.name }}</td>
          <td
            v-for="size in MATTRESS_SIZES"
            :key="size.id"
            class="table-cell text-center"
          >
            <!-- Hidden cell (N/A) -->
            <div v-if="shouldHideCell(comp.id, size.id)" class="text-zinc-600">
              -
            </div>
            <!-- Read-only display -->
            <span v-else class="font-mono text-zinc-300 bg-background px-3 py-1.5 rounded">
              {{ getComponentValue(comp.id, size.id) }}
            </span>
          </td>
          <td class="table-cell text-center font-mono font-bold text-brand-light">
            {{ getComponentTotal(comp.id) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Read-only notice -->
    <p class="text-xs text-zinc-500 mt-3 italic">
      Component inventory is loaded from Directus and cannot be edited here.
    </p>
  </div>
</template>
