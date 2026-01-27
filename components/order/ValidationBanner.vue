<script setup>
const orderStore = useOrderStore()

const validation = computed(() => orderStore.validation)
</script>

<template>
  <div v-if="validation && !validation.allValid" class="space-y-4">
    <!-- Violations -->
    <div v-if="validation.violations.length > 0" class="p-4 bg-red-900/20 border border-red-800 rounded-lg">
      <h4 class="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
        <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
        Critical Violations
      </h4>
      <ul class="space-y-2">
        <li
          v-for="v in validation.violations"
          :key="`${v.size}-${v.componentId}`"
          class="text-sm text-zinc-300"
        >
          <span class="font-semibold">{{ v.size }} - {{ v.componentId }}:</span>
          {{ v.difference.toFixed(2) }} months difference
          <span class="text-zinc-500">
            (Springs: {{ v.springCoverage.toFixed(1) }}mo, Component: {{ v.componentCoverage.toFixed(1) }}mo)
          </span>
        </li>
      </ul>
    </div>

    <!-- Warnings -->
    <div v-if="validation.warnings.length > 0" class="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
      <h4 class="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4" />
        Warnings
      </h4>
      <ul class="space-y-2">
        <li
          v-for="w in validation.warnings"
          :key="`${w.size}-${w.componentId}`"
          class="text-sm text-zinc-300"
        >
          <span class="font-semibold">{{ w.size }} - {{ w.componentId }}:</span>
          {{ w.difference.toFixed(2) }} months difference
          <span class="text-zinc-500">
            (Springs: {{ w.springCoverage.toFixed(1) }}mo, Component: {{ w.componentCoverage.toFixed(1) }}mo)
          </span>
        </li>
      </ul>
    </div>
  </div>

  <!-- All Valid -->
  <div v-else class="p-4 bg-green-900/20 border border-green-800 rounded-lg">
    <div class="flex items-center gap-2 text-green-400">
      <Icon name="heroicons:check-circle" class="w-5 h-5" />
      <span class="font-semibold">Equal Runway Validated</span>
    </div>
    <p class="text-sm text-zinc-400 mt-1">
      All components will deplete at the same rate as springs.
    </p>
  </div>
</template>
