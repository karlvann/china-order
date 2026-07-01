<script setup>
const settingsStore = useSettingsStore()
const appModeStore = useAppModeStore()
const router = useRouter()
const { logout } = useDirectusAuth()

const views = [
  { id: 'forecast', label: 'China' },
  { id: 'builder', label: 'Sri Lanka' }
]

const modes = [
  { id: 'live', label: 'Live' },
  { id: 'test', label: 'Test' }
]

// Determine if current view is Sri Lanka (builder)
const isSriLanka = computed(() => settingsStore.currentView === 'builder')

const handleSignOut = async () => {
  await logout()
  router.push('/')
}
</script>

<template>
  <header class="h-16 bg-background border-b border-border flex items-center justify-between px-6">
    <!-- Brand -->
    <div>
      <div class="flex items-center gap-2.5 mb-0.5">
        <span :class="['text-lg font-bold tracking-tight', isSriLanka ? 'text-accent-sri-lanka' : 'text-brand']">AusBeds</span>
        <span class="text-lg text-disabled font-light">|</span>
        <span
          :class="[
            'px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider',
            isSriLanka
              ? 'bg-accent-sri-lanka/20 border border-accent-sri-lanka/40 text-accent-sri-lanka-light'
              : 'bg-brand/20 border border-brand/40 text-brand-light'
          ]"
        >
          {{ isSriLanka ? 'SRI LANKA' : 'CHINA' }}
        </span>
      </div>
      <div class="text-[11px] text-subtle">
        Demand-based ordering tool
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
            settingsStore.currentView === view.id ? 'toggle-btn-active' : ''
          ]"
        >
          {{ view.label }}
        </button>
      </div>

      <!-- Mode toggle -->
      <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
        <button
          v-for="modeOption in modes"
          :key="modeOption.id"
          @click="appModeStore.setMode(modeOption.id)"
          :class="[
            'toggle-btn',
            appModeStore.mode === modeOption.id ? 'toggle-btn-active' : ''
          ]"
        >
          {{ modeOption.label }}
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
