<script setup>
const props = defineProps({
  sectionId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  badge: {
    type: String,
    default: null
  },
  badgeType: {
    type: String,
    default: 'info', // 'info', 'success', 'warning', 'error'
    validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
  }
})

const uiStore = useUIStore()

const isOpen = computed(() => uiStore.isSectionOpen(props.sectionId))

const toggle = () => {
  uiStore.toggleSection(props.sectionId)
}

const badgeClasses = computed(() => {
  const base = 'badge'
  const typeClass = `badge-${props.badgeType}`
  return [base, typeClass]
})
</script>

<template>
  <div class="border-b border-border">
    <!-- Header -->
    <button
      @click="toggle"
      class="accordion-header w-full"
    >
      <span class="accordion-icon" :class="{ 'rotate-90': isOpen }">
        <Icon name="heroicons:chevron-right" class="w-3.5 h-3.5" />
      </span>
      <span class="flex-1 text-zinc-50 text-[15px] font-semibold">{{ title }}</span>
      <span v-if="badge" :class="badgeClasses">{{ badge }}</span>
    </button>

    <!-- Content -->
    <div
      v-show="isOpen"
      class="py-3 animate-fadeIn"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
