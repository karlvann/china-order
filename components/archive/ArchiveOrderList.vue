<script setup>
const archiveOrdersStore = useArchiveOrdersStore()
const archiveUIStore = useArchiveUIStore()
const { downloadProforma } = useOrderProforma()

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getOrderType = (order) => {
  return order.order_location === 'sri_lanka' ? 'Latex' : 'Springs'
}
</script>

<template>
  <div>
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-primary">Archived orders</h2>
    </div>

    <div v-if="archiveOrdersStore.loading" class="text-muted text-sm py-4">
      Loading archived orders...
    </div>

    <div
    v-else-if="archiveOrdersStore.error"
    class="bg-danger/10 border border-danger/20 rounded-lg p-4 text-danger text-sm"
    >
      {{ archiveOrdersStore.error }}
    </div>

    <div
    v-else-if="archiveOrdersStore.orders.length === 0"
    class="bg-surface border border-border rounded-lg p-6 text-center"
    >
      <p class="text-muted text-sm">No archived orders.</p>
    </div>

    <div v-else class="space-y-3">
      <div
      v-for="order in archiveOrdersStore.orders"
      :key="order.id"
      :class="[
        'bg-surface border rounded-lg p-4',
        order.order_location === 'sri_lanka' ? 'border-accent-latex/40' : 'border-brand/40'
      ]"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <span
              :class="[
                'px-2 py-0.5 text-xs font-medium rounded',
                order.order_location === 'sri_lanka'
                  ? 'bg-accent-latex/20 text-accent-latex-light'
                  : 'bg-brand/20 text-brand-light'
              ]"
              >
                {{ getOrderType(order) }}
              </span>
              <span class="text-primary font-medium">
                Arrived {{ formatDate(order.expected_arrival) }}
              </span>
            </div>

            <div class="text-sm text-muted">
              {{ archiveOrdersStore.getOrderTotalQuantity(order) }} items
            </div>

            <p v-if="order.notes" class="text-sm text-subtle mt-1 truncate">
              {{ order.notes }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
            v-if="order.proforma"
            :class="[
              'px-3 py-1.5 text-sm hover:bg-control-surface rounded transition-colors',
              order.order_location === 'sri_lanka'
                ? 'text-accent-latex hover:text-accent-latex-light'
                : 'text-brand hover:text-brand-light'
            ]"
            @click="downloadProforma(order.proforma)"
            >
              Download proforma
            </button>
            <button
            class="px-3 py-1.5 text-sm text-muted hover:text-primary hover:bg-control-surface rounded transition-colors"
            @click="archiveUIStore.openOrderPanel(order.id)"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
