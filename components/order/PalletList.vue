<script setup>
const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

const orderStore = useOrderStore()

const pallets = computed(() => {
  return orderStore.springOrder?.pallets || []
})

// Group pallets by size
const palletsBySize = computed(() => {
  const groups = {}
  pallets.value.forEach(pallet => {
    if (!groups[pallet.size]) {
      groups[pallet.size] = []
    }
    groups[pallet.size].push(pallet)
  })
  return groups
})

// Get color for size
const getSizeColor = (size) => {
  const colors = {
    'King': 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    'Queen': 'bg-purple-500/20 border-purple-500/40 text-purple-400',
    'Double': 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    'King Single': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    'Single': 'bg-pink-500/20 border-pink-500/40 text-pink-400'
  }
  return colors[size] || 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400'
}

// Get type badge color
const getTypeBadge = (type) => {
  const badges = {
    'Pure': 'bg-green-500/20 text-green-400',
    'Mixed': 'bg-blue-500/20 text-blue-400',
    'Critical': 'bg-amber-500/20 text-amber-400'
  }
  return badges[type] || 'bg-zinc-500/20 text-zinc-400'
}
</script>

<template>
  <div v-if="pallets.length === 0" class="text-center py-8 text-zinc-500">
    No pallets in order
  </div>

  <div v-else>
    <!-- Compact view: Table -->
    <div v-if="compact" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header">ID</th>
            <th class="table-header">Size</th>
            <th class="table-header">Type</th>
            <th class="table-header text-center">Firm</th>
            <th class="table-header text-center">Medium</th>
            <th class="table-header text-center">Soft</th>
            <th class="table-header text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="pallet in pallets"
            :key="pallet.id"
            class="border-b border-border hover:bg-surfaceHover/50"
          >
            <td class="table-cell font-mono">{{ pallet.id }}</td>
            <td class="table-cell font-semibold">{{ pallet.size }}</td>
            <td class="table-cell">
              <span :class="['px-2 py-0.5 rounded text-xs font-medium', getTypeBadge(pallet.type)]">
                {{ pallet.type }}
              </span>
            </td>
            <td class="table-cell text-center font-mono">{{ pallet.firmness_breakdown.firm || '-' }}</td>
            <td class="table-cell text-center font-mono">{{ pallet.firmness_breakdown.medium || '-' }}</td>
            <td class="table-cell text-center font-mono">{{ pallet.firmness_breakdown.soft || '-' }}</td>
            <td class="table-cell text-center font-mono font-bold text-brand-light">{{ pallet.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Full view: Cards grouped by size -->
    <div v-else class="space-y-6">
      <div v-for="(sizePallets, size) in palletsBySize" :key="size">
        <h4 class="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          {{ size }} ({{ sizePallets.length }} {{ sizePallets.length === 1 ? 'pallet' : 'pallets' }})
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <OrderPalletCard
            v-for="pallet in sizePallets"
            :key="pallet.id"
            :pallet="pallet"
          />
        </div>
      </div>
    </div>
  </div>
</template>
