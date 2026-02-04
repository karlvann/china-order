<script setup>
const settingsStore = useSettingsStore()
const router = useRouter()
const { logout } = useDirectusAuth()

const views = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'builder', label: 'Order builder' }
]

const handleSignOut = async () => {
  await logout()
  router.push('/')
}
</script>

<template>
  <header class="sticky top-0 h-16 bg-[rgba(17,17,19,0.95)] backdrop-blur-sm border-b border-border flex items-center justify-between px-6 z-50">
    <!-- Brand -->
    <div>
      <div class="flex items-center gap-2.5 mb-0.5">
        <span class="text-lg font-bold text-brand tracking-tight">AusBeds</span>
        <span class="text-lg text-zinc-700 font-light">|</span>
        <span class="px-2.5 py-0.5 bg-brand/20 border border-brand/40 rounded text-[10px] font-bold tracking-wider text-brand-light">CHINA</span>
      </div>
      <div class="text-[11px] text-zinc-500">
        Coverage-equalized ordering
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

      <!-- Sign out button -->
      <button
        @click="handleSignOut"
        class="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded-lg font-semibold text-zinc-400 hover:text-red-400 hover:bg-surfaceHover transition-colors text-sm"
      >
        <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
        <span>Sign out</span>
      </button>
    </div>
  </header>
</template>
