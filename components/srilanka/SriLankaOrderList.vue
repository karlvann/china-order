<script setup>
const sriLankaUIStore = useSriLankaUIStore()
const sriLankaOrdersStore = useSriLankaOrdersStore()

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Calculate weeks until arrival
const weeksUntilArrival = (arrivalDate) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const arrival = new Date(arrivalDate)
  const diffMs = arrival - today
  const diffWeeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks
}

// Get total items in order
const getTotalItems = (order) => {
  if (!order.skus) return 0
  return order.skus.reduce((sum, item) => sum + (item.quantity || 0), 0)
}

// Confirm delete (only if not ordered)
const confirmDelete = async (order) => {
  if (order.ordered) return
  if (confirm(`Delete order from ${formatDate(order.order_date)}?`)) {
    await sriLankaOrdersStore.deleteOrder(order.id)
  }
}

// Generate TSV from order SKUs
const generateOrderTSV = (order) => {
  const lines = []
  const orderLetter = sriLankaOrdersStore.getOrderLetter(order.id)

  lines.push(`Sri Lanka Order ${orderLetter} - ${formatDate(order.expected_arrival)}`)
  if (order.notes) lines.push(`Notes: ${order.notes}`)
  lines.push('')
  lines.push('SKU\tName\tQuantity')

  if (order.skus) {
    const sortedSkus = [...order.skus].sort((a, b) => {
      const skuA = a.skus_id?.sku || ''
      const skuB = b.skus_id?.sku || ''
      return skuA.localeCompare(skuB)
    })

    for (const item of sortedSkus) {
      if (item.quantity > 0) {
        lines.push(`${item.skus_id?.sku || ''}\t${item.skus_id?.name || ''}\t${item.quantity}`)
      }
    }
  }

  lines.push('')
  lines.push(`Total items: ${getTotalItems(order)}`)

  return lines.join('\n')
}

// Export order as TSV
const exportOrderTSV = (order) => {
  if (order.ordered) return
  const tsv = generateOrderTSV(order)
  const filename = `Ausbeds_SriLankaOrder_${order.order_date}.tsv`

  const blob = new Blob([tsv], { type: 'text/tab-separated-values' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="mb-10">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-zinc-50">Pending orders</h2>
    </div>

    <!-- Loading State -->
    <div v-if="sriLankaOrdersStore.loading" class="text-zinc-400 text-sm py-4">
      Loading orders...
    </div>

    <!-- Empty State -->
    <div v-else-if="sriLankaOrdersStore.pendingOrders.length === 0" class="bg-surface border border-border rounded-lg p-6 text-center">
      <p class="text-zinc-400 text-sm">No pending orders. Create one to track incoming latex inventory.</p>
    </div>

    <!-- Order List -->
    <div v-else class="space-y-3">
      <div
        v-for="order in sriLankaOrdersStore.pendingOrders"
        :key="order.id"
        class="bg-surface border border-border rounded-lg p-4"
      >
        <div class="flex items-start justify-between gap-4">
          <!-- Order Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <!-- Order Letter Badge -->
              <span class="w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-green-500/20 text-green-400">
                {{ sriLankaOrdersStore.getOrderLetter(order.id) }}
              </span>

              <!-- Arrival Info -->
              <span class="text-zinc-50 font-medium">
                Arrives {{ formatDate(order.expected_arrival) }}
              </span>
              <span class="text-zinc-400 text-sm">
                ({{ weeksUntilArrival(order.expected_arrival) }} weeks)
              </span>
              <span v-if="order.ordered" class="px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400">
                Ordered
              </span>
              <span v-else class="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400">
                Pending
              </span>
            </div>

            <!-- Total Items -->
            <div class="text-sm text-zinc-400">
              {{ getTotalItems(order) }} latex items
            </div>

            <!-- Notes -->
            <p v-if="order.notes" class="text-sm text-zinc-500 mt-1 truncate">
              {{ order.notes }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="exportOrderTSV(order)"
              :disabled="order.ordered"
              :class="[
                'px-3 py-1.5 text-sm rounded transition-colors',
                order.ordered
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700'
              ]"
              :title="order.ordered ? 'Order already placed' : 'Export as TSV'"
            >
              Export
            </button>
            <button
              @click="sriLankaUIStore.openOrderPanel(order.id)"
              class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 rounded transition-colors"
            >
              Edit
            </button>
            <button
              @click="confirmDelete(order)"
              :disabled="order.ordered"
              :class="[
                'px-3 py-1.5 text-sm rounded transition-colors',
                order.ordered
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              ]"
              :title="order.ordered ? 'Cannot delete an order that has been placed' : 'Delete order'"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
