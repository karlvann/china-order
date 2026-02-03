<script setup>
import { MIN_PALLETS, MAX_PALLETS } from '~/lib/constants/index.js'

const orderStore = useOrderStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()

const { copied, copy } = useClipboard()
const { downloadTSV } = useDownload()

// Handle copy action
const handleCopy = async () => {
  await copy(orderStore.tsvContent)
  if (copied.value) {
    uiStore.showCopyFeedback()
  }
}

// Handle download action
const handleDownload = () => {
  downloadTSV(orderStore.tsvContent)
  uiStore.showDownloadFeedback()
}

// Get size breakdown for display
const sizeBreakdown = computed(() => {
  if (!orderStore.springOrder) return []

  const order = orderStore.springOrder
  const sizes = [
    { name: 'King', pallets: order.metadata.king_pallets, color: 'text-blue-400' },
    { name: 'Queen', pallets: order.metadata.queen_pallets, color: 'text-purple-400' }
  ]

  // Add small sizes if allocated
  if (order.metadata.small_size_pallets > 0) {
    const smallSizes = order.metadata.small_sizes_allocated || []
    smallSizes.forEach(size => {
      const pallets = order.pallets.filter(p => p.size === size).length
      if (pallets > 0) {
        sizes.push({ name: size, pallets, color: 'text-amber-400' })
      }
    })
  }

  return sizes
})
</script>

<template>
  <div class="bg-surface border border-border rounded-xl p-6 mb-6">
    <!-- Header Row -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-zinc-50 mb-1">Your order</h2>
        <p class="text-sm text-zinc-500">
          {{ orderStore.totalSprings }} springs across {{ orderStore.totalPallets }} pallets
        </p>
      </div>

      <!-- Export Buttons -->
      <div class="flex gap-2">
        <button
          @click="handleCopy"
          class="btn-primary flex items-center gap-2"
        >
          <Icon v-if="uiStore.copyFeedback" name="heroicons:check" class="w-4 h-4" />
          <Icon v-else name="heroicons:clipboard-document" class="w-4 h-4" />
          <span>{{ uiStore.copyFeedback ? 'Copied!' : 'Copy TSV' }}</span>
        </button>
        <button
          @click="handleDownload"
          class="btn-secondary flex items-center gap-2"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>
    </div>

    <!-- Pallet Count Slider -->
    <div class="mb-6">
      <div class="flex items-center gap-5">
        <input
          type="range"
          :min="MIN_PALLETS"
          :max="MAX_PALLETS"
          :value="settingsStore.palletCount"
          @input="settingsStore.setPalletCount(parseInt($event.target.value))"
          class="flex-1 h-1.5 rounded-full bg-zinc-700 appearance-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none
                 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand
                 [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div class="text-center min-w-[70px]">
          <div class="text-3xl font-bold leading-none">{{ settingsStore.palletCount }}</div>
          <div class="text-xs text-zinc-500">pallets</div>
        </div>
      </div>
    </div>

    <!-- Size Breakdown -->
    <div class="flex flex-wrap gap-3">
      <div
        v-for="item in sizeBreakdown"
        :key="item.name"
        class="flex items-center gap-2 px-3 py-2 bg-background rounded-lg"
      >
        <span class="text-sm font-semibold text-zinc-300">{{ item.name }}</span>
        <span :class="['text-lg font-bold', item.color]">{{ item.pallets }}</span>
      </div>
    </div>
  </div>
</template>
