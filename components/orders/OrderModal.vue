<script setup>
const uiStore = useUIStore()
const inventoryOrdersStore = useInventoryOrdersStore()
const orderStore = useOrderStore()
const skuLookup = useSkuLookup()

// Form state
const orderDate = ref('')
const orderType = ref('ship')
const expectedArrival = ref('')
const notes = ref('')
const ordered = ref(false)
const skuQuantities = ref({})
const saving = ref(false)
const error = ref(null)

// Is editing existing order
const isEditing = computed(() => !!uiStore.editingOrderId)

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Convert component ID to SKU prefix
const componentIdToSkuPrefix = (compId) => {
  const mapping = {
    'micro_coils': 'microcoils',
    'thin_latex': 'thinlatex',
    'felt': 'felt',
    'top_panel': 'paneltop',
    'bottom_panel': 'panelbottom',
    'side_panel': 'panelside'
  }
  return mapping[compId] || compId
}

// Convert spring order to SKU quantities map
const convertSpringOrderToSkuQuantities = (springOrder) => {
  const quantities = {}
  if (!springOrder?.springs) return quantities

  const firmnesses = ['firm', 'medium', 'soft']
  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']

  for (const firmness of firmnesses) {
    for (const size of sizes) {
      const qty = springOrder.springs[firmness]?.[size] || 0
      if (qty > 0) {
        const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
        const skuData = skuLookup.getSkuData(skuString)
        if (skuData?.id) {
          quantities[skuData.id] = qty
        }
      }
    }
  }

  return quantities
}

// Convert component order to SKU quantities map
const convertComponentOrderToSkuQuantities = (componentOrder) => {
  const quantities = {}
  if (!componentOrder) return quantities

  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const componentIds = ['micro_coils', 'thin_latex', 'felt', 'top_panel', 'bottom_panel', 'side_panel']

  for (const compId of componentIds) {
    for (const size of sizes) {
      const qty = componentOrder[compId]?.[size] || 0
      if (qty > 0) {
        const skuPrefix = componentIdToSkuPrefix(compId)
        const skuString = `${skuPrefix}${size.toLowerCase().replace(' ', '')}`
        const skuData = skuLookup.getSkuData(skuString)
        if (skuData?.id) {
          quantities[skuData.id] = qty
        }
      }
    }
  }

  return quantities
}

// Wait for SKU data and then prefill from recommendation
const prefillFromRecommendationWhenReady = async () => {
  // Ensure SKUs are loaded
  await skuLookup.fetchSkus()

  const quantities = {}

  // Add spring quantities
  if (orderStore.springOrder) {
    Object.assign(quantities, convertSpringOrderToSkuQuantities(orderStore.springOrder))
  }

  // Add component quantities
  if (orderStore.componentOrder) {
    Object.assign(quantities, convertComponentOrderToSkuQuantities(orderStore.componentOrder))
  }

  skuQuantities.value = quantities
}

// Initialize form with order data or defaults
const initForm = () => {
  if (uiStore.editingOrderId) {
    // Editing existing order
    const order = inventoryOrdersStore.getOrderById(uiStore.editingOrderId)
    if (order) {
      orderDate.value = order.order_date
      orderType.value = order.order_type || 'ship'
      expectedArrival.value = order.expected_arrival
      notes.value = order.notes || ''
      ordered.value = order.ordered || false

      // Convert order SKUs to quantity map
      const quantities = {}
      if (order.skus) {
        order.skus.forEach(item => {
          if (item.skus_id?.id && item.quantity > 0) {
            quantities[item.skus_id.id] = item.quantity
          }
        })
      }
      skuQuantities.value = quantities
    }
  } else if (uiStore.prefillFromRecommendation && orderStore.springOrder) {
    // Pre-fill from algorithm recommendation
    orderDate.value = getTodayString()
    orderType.value = 'ship'
    expectedArrival.value = inventoryOrdersStore.calculateExpectedArrival(getTodayString(), 'ship')
    notes.value = 'From recommendation'
    ordered.value = false
    // SKUs need to be loaded first - do this async
    prefillFromRecommendationWhenReady()
  } else {
    // Defaults for new order
    orderDate.value = getTodayString()
    orderType.value = 'ship'
    expectedArrival.value = inventoryOrdersStore.calculateExpectedArrival(getTodayString(), 'ship')
    notes.value = ''
    ordered.value = false
    skuQuantities.value = {}
  }
}

// Watch for order type changes to recalculate arrival
watch(orderType, (newType) => {
  if (orderDate.value) {
    expectedArrival.value = inventoryOrdersStore.calculateExpectedArrival(orderDate.value, newType)
  }
})

// Watch for order date changes to recalculate arrival
watch(orderDate, (newDate) => {
  if (newDate) {
    expectedArrival.value = inventoryOrdersStore.calculateExpectedArrival(newDate, orderType.value)
  }
})

// Total items count
const totalItems = computed(() => {
  return Object.values(skuQuantities.value).reduce((sum, qty) => sum + (qty || 0), 0)
})

// Convert quantities map to API format
const getSkuItemsForApi = () => {
  return Object.entries(skuQuantities.value)
    .filter(([id, qty]) => qty > 0)
    .map(([id, qty]) => ({
      skus_id: parseInt(id),
      quantity: qty
    }))
}

// Save order
const handleSave = async () => {
  saving.value = true
  error.value = null

  try {
    const orderData = {
      order_date: orderDate.value,
      expected_arrival: expectedArrival.value,
      order_type: orderType.value,
      notes: notes.value,
      ordered: ordered.value
    }

    const skuItems = getSkuItemsForApi()

    let result
    if (isEditing.value) {
      result = await inventoryOrdersStore.updateOrder(uiStore.editingOrderId, orderData, skuItems)
    } else {
      result = await inventoryOrdersStore.createOrder(orderData, skuItems)
    }

    if (result) {
      uiStore.closeOrderModal()
    } else {
      error.value = 'Failed to save order'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// Close modal
const handleClose = () => {
  uiStore.closeOrderModal()
}

// Initialize on mount
onMounted(() => {
  initForm()
})

// Re-initialize if editingOrderId changes
watch(() => uiStore.editingOrderId, () => {
  initForm()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60"
        @click="handleClose"
      />

      <!-- Modal -->
      <div class="relative bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 class="text-lg font-semibold text-zinc-50">
            {{ isEditing ? 'Edit Order' : 'Create Order' }}
          </h2>
          <button
            @click="handleClose"
            class="text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Error -->
          <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {{ error }}
          </div>

          <!-- Form Fields -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Order Date -->
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Order Date</label>
              <input
                v-model="orderDate"
                type="date"
                class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm"
              />
            </div>

            <!-- Order Type -->
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Shipping Type</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="orderType"
                    type="radio"
                    value="ship"
                    class="text-brand"
                  />
                  <span class="text-sm text-zinc-50">Ship (10 weeks)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="orderType"
                    type="radio"
                    value="air"
                    class="text-brand"
                  />
                  <span class="text-sm text-zinc-50">Air (3 weeks)</span>
                </label>
              </div>
            </div>

            <!-- Expected Arrival -->
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Expected Arrival</label>
              <input
                v-model="expectedArrival"
                type="date"
                class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm"
              />
              <p class="text-xs text-zinc-500 mt-1">Auto-calculated, can be adjusted</p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
              <input
                v-model="notes"
                type="text"
                placeholder="e.g., Emergency King order"
                class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm placeholder-zinc-500"
              />
            </div>

            <!-- Ordered Checkbox -->
            <div class="flex items-center col-span-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="ordered"
                  type="checkbox"
                  class="w-4 h-4 rounded border-border bg-zinc-800 text-brand focus:ring-brand focus:ring-offset-0"
                />
                <span class="text-sm text-zinc-300">Order placed with supplier</span>
              </label>
            </div>
          </div>

          <!-- SKU Picker -->
          <div class="border-t border-border pt-6">
            <h3 class="text-sm font-medium text-zinc-300 mb-4">Order Items</h3>
            <OrdersOrderSkuPicker
              v-model="skuQuantities"
              :sku-lookup="skuLookup"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-border bg-zinc-900/50 shrink-0">
          <div class="text-sm text-zinc-400">
            Total: <span class="font-medium text-zinc-50">{{ totalItems }}</span> items
          </div>
          <div class="flex gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleSave"
              :disabled="saving || totalItems === 0"
              :class="[
                'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                saving || totalItems === 0
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white'
              ]"
            >
              {{ saving ? 'Saving...' : (isEditing ? 'Update Order' : 'Create Order') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
