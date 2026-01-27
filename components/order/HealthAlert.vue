<script setup>
const orderStore = useOrderStore()

// Determine health status
const healthStatus = computed(() => {
  const coverage = orderStore.coverageData
  if (!coverage) return null

  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const criticalSizes = []
  const warningSizes = []
  const healthySizes = []

  sizes.forEach(size => {
    const months = coverage[size] || 0
    if (months < 2) {
      criticalSizes.push({ size, months })
    } else if (months < 3) {
      warningSizes.push({ size, months })
    } else {
      healthySizes.push({ size, months })
    }
  })

  if (criticalSizes.length > 0) {
    return {
      level: 'critical',
      message: `Critical: ${criticalSizes.map(s => `${s.size} (${s.months.toFixed(1)}mo)`).join(', ')}`,
      icon: 'heroicons:exclamation-triangle',
      bgClass: 'bg-red-900/20 border-red-800',
      textClass: 'text-red-400'
    }
  }

  if (warningSizes.length > 0) {
    return {
      level: 'warning',
      message: `Low Stock: ${warningSizes.map(s => `${s.size} (${s.months.toFixed(1)}mo)`).join(', ')}`,
      icon: 'heroicons:exclamation-circle',
      bgClass: 'bg-yellow-900/20 border-yellow-800',
      textClass: 'text-yellow-400'
    }
  }

  return {
    level: 'healthy',
    message: 'All sizes have adequate coverage',
    icon: 'heroicons:check-circle',
    bgClass: 'bg-green-900/20 border-green-800',
    textClass: 'text-green-400'
  }
})
</script>

<template>
  <div
    v-if="healthStatus"
    :class="[
      'flex items-center gap-3 p-4 rounded-lg border mb-6',
      healthStatus.bgClass
    ]"
  >
    <Icon :name="healthStatus.icon" :class="['w-5 h-5', healthStatus.textClass]" />
    <span :class="['text-sm font-medium', healthStatus.textClass]">
      {{ healthStatus.message }}
    </span>
  </div>
</template>
