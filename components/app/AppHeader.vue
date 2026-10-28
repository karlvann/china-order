<script setup>
const route = useRoute()
const router = useRouter()
const { logout } = useDirectusAuth()
const { clearDirectusSession } = useDirectusSession()

const orderTypes = [
  { id: 'springs', label: 'Springs', to: '/springs', activeClass: 'bg-brand text-inverse' },
  { id: 'latex', label: 'Latex', to: '/latex', activeClass: 'bg-accent-latex text-inverse' },
  { id: 'archive', label: 'Archive', to: '/archive', activeClass: 'bg-accent-archive text-inverse' }
]

const activeOrderType = computed(() => route.path.split('/')[1] || 'springs')

const activeTheme = computed(() => {
  if (activeOrderType.value === 'latex') {
    return {
      label: 'LATEX',
      textClass: 'text-accent-latex',
      badgeClass: 'bg-accent-latex/20 border-accent-latex/40 text-accent-latex-light'
    }
  }

  if (activeOrderType.value === 'archive') {
    return {
      label: 'ARCHIVE',
      textClass: 'text-accent-archive',
      badgeClass: 'bg-accent-archive/20 border-accent-archive/40 text-accent-archive-light'
    }
  }

  return {
    label: 'SPRINGS',
    textClass: 'text-brand',
    badgeClass: 'bg-brand/20 border-brand/40 text-brand-light'
  }
})

const handleSignOut = async () => {
  try {
    await logout()
  } catch (e) {
    clearDirectusSession()
  }

  router.push('/')
}
</script>

<template>
  <header class="h-16 bg-background border-b border-border flex items-center justify-between px-6">
    <!-- Brand -->
    <div>
      <div class="flex items-center gap-2.5 mb-0.5">
        <span :class="['text-lg font-bold tracking-tight', activeTheme.textClass]">AusBeds</span>
        <span class="text-lg text-disabled font-light">|</span>
        <span
          :class="[
            'px-2.5 py-0.5 rounded border text-[10px] font-bold tracking-wider',
            activeTheme.badgeClass
          ]"
        >
          {{ activeTheme.label }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-4">
      <!-- View Toggle -->
      <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
        <NuxtLink
        v-for="orderType in orderTypes"
        :key="orderType.id"
        :to="orderType.to"
        :class="[
          'toggle-btn',
          activeOrderType === orderType.id
            ? orderType.activeClass
            : 'hover:bg-surface-hover'
        ]"
        >
          {{ orderType.label }}
        </NuxtLink>
      </div>

      <!-- Sign out button -->
      <button
        @click="handleSignOut"
        class="flex items-center gap-1.5 px-4 bg-surface border border-border rounded-md font-semibold text-muted hover:text-danger hover:bg-surface-hover transition-colors text-sm"
        style="height: -webkit-fill-available"
      >
        <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
        <span>Sign out</span>
      </button>
    </div>
  </header>
</template>
