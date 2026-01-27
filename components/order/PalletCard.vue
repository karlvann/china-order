<script setup>
const props = defineProps({
  pallet: {
    type: Object,
    required: true
  }
})

// Get type badge styling
const typeBadge = computed(() => {
  const badges = {
    'Pure': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
    'Mixed': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
    'Critical': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' }
  }
  return badges[props.pallet.type] || badges['Mixed']
})

// Get firmness values
const firmnesses = computed(() => {
  return [
    { name: 'Firm', value: props.pallet.firmness_breakdown.firm || 0 },
    { name: 'Medium', value: props.pallet.firmness_breakdown.medium || 0 },
    { name: 'Soft', value: props.pallet.firmness_breakdown.soft || 0 }
  ].filter(f => f.value > 0)
})
</script>

<template>
  <div
    :class="[
      'p-4 rounded-lg border',
      typeBadge.bg,
      typeBadge.border
    ]"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-zinc-500 text-sm">Pallet</span>
        <span class="font-mono font-bold text-zinc-200">#{{ pallet.id }}</span>
      </div>
      <span :class="['px-2 py-0.5 rounded text-xs font-semibold', typeBadge.bg, typeBadge.text]">
        {{ pallet.type }}
      </span>
    </div>

    <!-- Firmness Breakdown -->
    <div class="space-y-2">
      <div
        v-for="firmness in firmnesses"
        :key="firmness.name"
        class="flex items-center justify-between"
      >
        <span class="text-sm text-zinc-400">{{ firmness.name }}</span>
        <span class="font-mono font-semibold text-zinc-200">{{ firmness.value }}</span>
      </div>
    </div>

    <!-- Total -->
    <div class="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
      <span class="text-sm font-medium text-zinc-300">Total</span>
      <span class="font-mono font-bold text-lg text-brand-light">{{ pallet.total }}</span>
    </div>
  </div>
</template>
