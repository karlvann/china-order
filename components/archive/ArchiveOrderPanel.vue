<script setup>
const archiveOrdersStore = useArchiveOrdersStore()
const archiveUIStore = useArchiveUIStore()
const { downloading, downloadProforma } = useOrderProforma()

const order = computed(() => archiveOrdersStore.getOrderById(archiveUIStore.editingOrderId))
const orderType = computed(() => order.value?.order_location === 'sri_lanka' ? 'Latex' : 'Springs')
const sortedItems = computed(() => {
  if (!order.value?.skus) return []

  return [...order.value.skus].sort((a, b) => {
    const skuA = a.skus_id?.sku || ''
    const skuB = b.skus_id?.sku || ''
    return skuA.localeCompare(skuB)
  })
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const handlePanelKeydown = (event) => {
  if (event.key === 'Escape' && archiveUIStore.orderPanelOpen) {
    archiveUIStore.closeOrderPanel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handlePanelKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handlePanelKeydown)
})
</script>

<template>
  <Transition name="slide">
    <aside
    v-if="archiveUIStore.orderPanelOpen && order"
    class="fixed right-0 top-0 h-screen w-[30rem] bg-modal-surface border-l border-border z-40 flex flex-col"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-modal-header/50 shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-accent-archive-light">Edit archived order</h2>
          <span class="px-2 py-0.5 text-xs font-medium rounded bg-accent-archive/20 text-accent-archive-light">
            Read only
          </span>
        </div>
        <button
        class="text-muted hover:text-primary transition-colors"
        @click="archiveUIStore.closeOrderPanel()"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div class="space-y-4 mb-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-muted mb-1">Order type</label>
              <div class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
                {{ orderType }}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-muted mb-1">Status</label>
              <div class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
                Archived
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-1">Order date</label>
            <div class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
              {{ formatDate(order.order_date) }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-1">Expected arrival</label>
            <div class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
              {{ formatDate(order.expected_arrival) }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-1">Archived</label>
            <div class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
              {{ formatDate(order.date_updated) }}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-1">Notes</label>
            <div class="min-h-10 w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm">
              {{ order.notes || 'No notes' }}
            </div>
          </div>

          <button
          v-if="order.proforma"
          type="button"
          :disabled="downloading"
          class="w-full px-3 py-2 bg-control-surface hover:bg-control-hover border border-border rounded-lg text-sm font-medium text-accent-archive transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          @click="downloadProforma(order.proforma)"
          >
            {{ downloading ? 'Downloading...' : 'Download proforma' }}
          </button>
        </div>

        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-medium text-muted mb-3">Order items</h3>
          <div class="space-y-2">
            <div
            v-for="item in sortedItems"
            :key="item.id"
            class="flex items-center justify-between gap-4 px-3 py-2 bg-surface border border-border rounded-lg"
            >
              <div class="min-w-0">
                <div class="text-sm text-primary truncate">
                  {{ item.skus_id?.name || item.skus_id?.sku || 'Unknown item' }}
                </div>
                <div class="text-xs text-subtle font-mono">
                  {{ item.skus_id?.sku }}
                </div>
              </div>
              <div class="text-sm font-mono text-accent-archive-light shrink-0">
                {{ item.quantity || 0 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end px-4 py-3 border-t border-border bg-modal-header/50 shrink-0">
        <button
        class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-accent-archive hover:bg-accent-archive-hover text-inverse transition-colors"
        @click="archiveUIStore.closeOrderPanel()"
        >
          Close
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
