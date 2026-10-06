<script setup>
const settingsStore = useSettingsStore()
const router = useRouter()
const { logout } = useDirectusAuth()
const { clearDirectusSession } = useDirectusSession()

const views = [
  { id: 'forecast', label: 'Springs' },
  { id: 'builder', label: 'Latex' }
]

const isLatex = computed(() => settingsStore.currentView === 'builder')

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
        <span :class="['text-lg font-bold tracking-tight', isLatex ? 'text-accent-latex' : 'text-brand']">AusBeds</span>
        <span class="text-lg text-disabled font-light">|</span>
        <span
          :class="[
            'px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider',
            isLatex
              ? 'bg-accent-latex/20 border border-accent-latex/40 text-accent-latex-light'
              : 'bg-brand/20 border border-brand/40 text-brand-light'
          ]"
        >
          {{ isLatex ? 'LATEX' : 'SPRINGS' }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-4">
      <!-- View Toggle -->
      <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
        <button
          v-for="view in views"
          :key="view.id"
          @click="settingsStore.setCurrentView(view.id)"
          :class="[
            'toggle-btn',
            settingsStore.currentView === view.id
              ? view.id === 'forecast'
                ? 'bg-brand text-inverse'
                : 'bg-accent-latex text-inverse'
              : 'hover:bg-surface-hover'
          ]"
        >
          {{ view.label }}
        </button>
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
