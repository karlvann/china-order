<script setup>
import { calculateLatexOrder, convertOrdersForLatexAlgorithm } from '~/lib/algorithms/latexOrder.js'
import { LATEX_FIRMNESSES, LATEX_SIZES, PILLOW_LATEX_TYPES, DEFAULT_LATEX_CAPACITY, LATEX_CAPACITY_STEP, MIN_LATEX_CAPACITY, LATEX_LEAD_TIME_WEEKS } from '~/lib/constants/index.js'
import { getCurrentMonday } from '~/lib/utils/index.js'

const sriLankaUIStore = useSriLankaUIStore()
const sriLankaOrdersStore = useSriLankaOrdersStore()
const sriLankaSettingsStore = useSriLankaSettingsStore()
const sriLankaInventoryStore = useSriLankaInventoryStore()
const latexSkuLookup = useLatexSkuLookup()

// Usage rates from settings store
const usageRates = computed(() => sriLankaSettingsStore.planningLatexSalesRates)

// Local order settings (independent of global settings)
const localCapacity = ref(DEFAULT_LATEX_CAPACITY)
const localOrderWeekOffset = ref(0)
const localDeliveryWeeks = ref(LATEX_LEAD_TIME_WEEKS)

// Form state
const orderDate = ref('')
const expectedArrival = ref('')
const notes = ref('')
const ordered = ref(false)
const skuQuantities = ref({})
const saving = ref(false)
const error = ref(null)
const isInitializing = ref(false)

// Is editing existing order
const isEditing = computed(() => !!sriLankaUIStore.editingOrderId)

// Order capacity
const containerCapacity = computed(() => localCapacity.value)

const incrementCapacity = () => {
  localCapacity.value += LATEX_CAPACITY_STEP
}

const decrementCapacity = () => {
  localCapacity.value = Math.max(MIN_LATEX_CAPACITY, localCapacity.value - LATEX_CAPACITY_STEP)
}

// Computed arrival week index from expected arrival date (for timeline display)
const arrivalWeekIndex = computed(() => {
  if (!expectedArrival.value) return localOrderWeekOffset.value + localDeliveryWeeks.value
  const monday = getCurrentMonday()
  const arrivalDate = new Date(expectedArrival.value)
  const diffMs = arrivalDate - monday
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
})


// Format date as "d Mon" (e.g., "2 Feb")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Generate order week options with dates (-10 to +20 weeks)
const orderWeekOptions = computed(() => {
  const monday = getCurrentMonday()
  const options = []

  for (let i = -10; i <= 20; i++) {
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))
    const dateStr = formatShortDate(weekMonday)

    const startOfYear = new Date(weekMonday.getFullYear(), 0, 1)
    const days = Math.floor((weekMonday - startOfYear) / (24 * 60 * 60 * 1000))
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    let label
    if (i === 0) {
      label = `Now - ${dateStr}`
    } else if (i < 0) {
      label = `${i} weeks - ${dateStr}`
    } else {
      label = `W${weekNum} - ${dateStr}`
    }

    options.push({
      value: i,
      label
    })
  }

  return options
})

// Format date as YYYY-MM-DD in local timezone
const formatDateYMD = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get Monday date for a given week offset
const getMondayForWeekOffset = (offset) => {
  const monday = getCurrentMonday()
  const targetMonday = new Date(monday)
  targetMonday.setDate(monday.getDate() + (offset * 7))
  return formatDateYMD(targetMonday)
}

// Calculate expected arrival from order date and delivery weeks
const calculateExpectedArrivalFromWeeks = (orderDateStr, deliveryWeeks) => {
  const orderDateObj = new Date(orderDateStr)
  const arrival = new Date(orderDateObj)
  arrival.setDate(orderDateObj.getDate() + (deliveryWeeks * 7))
  return formatDateYMD(arrival)
}

const getWeekOffsetForDate = (dateString) => {
  if (!dateString) return 0
  const monday = getCurrentMonday()
  const date = new Date(dateString)
  const diffMs = date - monday
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

const getDeliveryWeeksBetweenDates = (orderDateStr, expectedArrivalStr) => {
  if (!orderDateStr || !expectedArrivalStr) return LATEX_LEAD_TIME_WEEKS
  const orderDateObj = new Date(orderDateStr)
  const arrivalDateObj = new Date(expectedArrivalStr)
  const diffMs = arrivalDateObj - orderDateObj
  return Math.max(1, Math.min(15, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))))
}

// Convert pending orders to algorithm format (exclude the one we're editing)
const convertPendingOrdersForAlgorithm = () => {
  const orders = sriLankaOrdersStore.pendingOrders || []
  const filteredOrders = sriLankaUIStore.editingOrderId
    ? orders.filter(o => o.id !== sriLankaUIStore.editingOrderId)
    : orders

  return convertOrdersForLatexAlgorithm(filteredOrders)
}

// Convert latex order to SKU quantities map
const convertLatexOrderToSkuQuantities = (latexOrder) => {
  const quantities = {}
  if (!latexOrder?.latex) return quantities

  const skuIdMap = latexSkuLookup.getSkuIdMap()

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      const qty = latexOrder.latex?.[firmness]?.[size] || 0
      if (qty > 0) {
        const skuString = `latex${firmness}${size.toLowerCase()}`
        const skuId = skuIdMap[skuString]
        if (skuId) {
          quantities[skuId] = qty
        }
      }
    }
  }

  for (const type of PILLOW_LATEX_TYPES) {
    const qty = latexOrder.pillowLatex?.[type] || 0
    if (qty > 0) {
      const skuString = `pillowlatex${type}`
      const skuId = skuIdMap[skuString]
      if (skuId) {
        quantities[skuId] = qty
      }
    }
  }

  return quantities
}

// Convert SKU quantities back to latex order format (for draft preview)
const convertSkuQuantitiesToLatexOrder = () => {
  const latex = {
    firm: { King: 0, Queen: 0 },
    medium: { King: 0, Queen: 0 },
    soft: { King: 0, Queen: 0 }
  }
  const pillowLatex = {
    thin: 0,
    thick: 0
  }

  const skuIdMap = latexSkuLookup.getSkuIdMap()

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      const skuString = `latex${firmness}${size.toLowerCase()}`
      const skuId = skuIdMap[skuString]
      if (skuId && skuQuantities.value[skuId]) {
        latex[firmness][size] = skuQuantities.value[skuId]
      }
    }
  }

  for (const type of PILLOW_LATEX_TYPES) {
    const skuString = `pillowlatex${type}`
    const skuId = skuIdMap[skuString]
    if (skuId && skuQuantities.value[skuId]) {
      pillowLatex[type] = skuQuantities.value[skuId]
    }
  }

  // Calculate total
  let total = 0
  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      total += latex[firmness][size]
    }
  }
  for (const type of PILLOW_LATEX_TYPES) {
    total += pillowLatex[type]
  }

  return {
    latex,
    pillowLatex,
    metadata: {
      total_items: total,
      container_capacity: containerCapacity.value
    }
  }
}

// Compute order from local settings using algorithm
const computeOrderFromSettings = () => {
  if (!usageRates.value?.WEEKLY_TOTAL_BY_SIZE) return null

  const pendingOrders = convertPendingOrdersForAlgorithm()

  return calculateLatexOrder(
    containerCapacity.value,
    sriLankaInventoryStore.inventory,
    usageRates.value,
    pendingOrders,
    localOrderWeekOffset.value,
    localDeliveryWeeks.value
  )
}

// Update draft orders and SKU quantities from algorithm when settings change
const updateFromAlgorithm = async () => {
  if (isInitializing.value) return

  await latexSkuLookup.fetchSkus()

  const latexOrder = computeOrderFromSettings()
  if (!latexOrder) return

  // Convert to SKU quantities
  skuQuantities.value = convertLatexOrderToSkuQuantities(latexOrder)

  // Update draft order for forecast preview
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}

// Watch local settings and update draft orders
watch(localCapacity, () => {
  updateFromAlgorithm()
})

watch(usageRates, () => {
  if (!sriLankaUIStore.orderPanelOpen || isInitializing.value || isEditing.value) return
  updateFromAlgorithm()
}, { deep: true })

// Watch order week offset - update order date and recalculate
watch(localOrderWeekOffset, (offset) => {
  if (isInitializing.value || isEditing.value) return
  orderDate.value = getMondayForWeekOffset(offset)
  expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, localDeliveryWeeks.value)
  updateFromAlgorithm()
})

// Watch delivery weeks - update expected arrival and recalculate
watch(localDeliveryWeeks, (weeks) => {
  if (isInitializing.value) return
  expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, weeks)
  updateFromAlgorithm()
})

// Update draft orders in store whenever SKU quantities change (manual edits)
watch(skuQuantities, () => {
  if (!sriLankaUIStore.orderPanelOpen || isInitializing.value) return

  const latexOrder = convertSkuQuantitiesToLatexOrder()
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}, { deep: true })

// Initialize with algorithm when creating new order
const initializeNewOrder = async () => {
  await latexSkuLookup.fetchSkus()

  const latexOrder = computeOrderFromSettings()
  if (!latexOrder) return

  skuQuantities.value = convertLatexOrderToSkuQuantities(latexOrder)
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}

// Initialize form with order data or defaults
const initForm = () => {
  isInitializing.value = true

  if (sriLankaUIStore.editingOrderId) {
    // Editing existing order
    const order = sriLankaOrdersStore.getOrderById(sriLankaUIStore.editingOrderId)
    if (order) {
      orderDate.value = order.order_date
      expectedArrival.value = order.expected_arrival
      notes.value = order.notes || ''
      ordered.value = order.ordered || false

      // Calculate arrival week from expected arrival date
      const arrivalDate = new Date(order.expected_arrival)
      const now = new Date()
      const monday = new Date(now)
      monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
      const diffMs = arrivalDate - monday
      const arrivalWeek = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))

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
      localCapacity.value = Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0) || DEFAULT_LATEX_CAPACITY
      localDeliveryWeeks.value = getDeliveryWeeksBetweenDates(order.order_date, order.expected_arrival)
      localOrderWeekOffset.value = getWeekOffsetForDate(order.order_date)

      // Set draft order for real-time preview
      latexSkuLookup.fetchSkus().then(() => {
        const latexOrder = convertSkuQuantitiesToLatexOrder()
        sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeek)
      })

      nextTick(() => {
        isInitializing.value = false
      })
    }
  } else {
    // Creating new order - use algorithm
    localCapacity.value = DEFAULT_LATEX_CAPACITY
    localOrderWeekOffset.value = 0
    localDeliveryWeeks.value = LATEX_LEAD_TIME_WEEKS

    orderDate.value = getMondayForWeekOffset(0)
    expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, localDeliveryWeeks.value)
    notes.value = ''
    ordered.value = false

    nextTick(() => {
      isInitializing.value = false
      initializeNewOrder()
    })
  }
}

// Watch for order date changes to recalculate arrival
watch(orderDate, (newDate) => {
  if (isInitializing.value) return
  if (!newDate) return
  localOrderWeekOffset.value = getWeekOffsetForDate(newDate)
  expectedArrival.value = calculateExpectedArrivalFromWeeks(newDate, localDeliveryWeeks.value)
  updateFromAlgorithm()
})

// Watch for expected arrival changes to update draft order (when user edits date directly)
watch(expectedArrival, () => {
  if (isInitializing.value || !sriLankaUIStore.orderPanelOpen) return
  const latexOrder = convertSkuQuantitiesToLatexOrder()
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
})

// Total items count
const totalItems = computed(() => {
  return Object.values(skuQuantities.value).reduce((sum, qty) => sum + (qty || 0), 0)
})

const overCapacityAmount = computed(() => {
  return Math.max(0, totalItems.value - containerCapacity.value)
})

const isOverCapacity = computed(() => overCapacityAmount.value > 0)

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
      notes: notes.value,
      ordered: ordered.value
    }

    const skuItems = getSkuItemsForApi()

    let result
    if (isEditing.value) {
      result = await sriLankaOrdersStore.updateOrder(sriLankaUIStore.editingOrderId, orderData, skuItems)
    } else {
      result = await sriLankaOrdersStore.createOrder(orderData, skuItems)
    }

    if (result) {
      sriLankaUIStore.closeOrderPanel()
    } else {
      error.value = sriLankaOrdersStore.error || 'Failed to save order'
    }
  } catch (e) {
    error.value = e.message || 'Failed to save order'
  } finally {
    saving.value = false
  }
}

// Close panel
const handleClose = () => {
  sriLankaUIStore.closeOrderPanel()
}

// Initialize on mount
onMounted(() => {
  initForm()
})

// Re-initialize when panel opens or editingOrderId changes
watch(() => sriLankaUIStore.orderPanelOpen, (isOpen) => {
  if (isOpen) {
    initForm()
  }
})

watch(() => sriLankaUIStore.editingOrderId, () => {
  if (sriLankaUIStore.orderPanelOpen) {
    initForm()
  }
})

// Get SKU ID map from latex SKU lookup
const skuIdMap = computed(() => latexSkuLookup.getSkuIdMap())
const currentInventory = computed(() => sriLankaInventoryStore.inventory)
</script>

<template>
  <Transition name="slide">
    <aside
      v-if="sriLankaUIStore.orderPanelOpen"
      class="fixed right-0 top-0 h-screen w-[30rem] bg-modal-surface border-l border-border shadow-panel z-40 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-modal-header/50 shrink-0">
        <h2 class="text-lg font-semibold text-accent-sri-lanka-light">
          {{ isEditing ? 'Edit latex order' : 'New latex order' }}
        </h2>
        <button
          @click="handleClose"
          class="text-muted hover:text-primary transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <!-- Error -->
        <div v-if="error" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {{ error }}
        </div>

        <div v-if="isOverCapacity" class="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm">
          Over capacity by {{ overCapacityAmount }} items. Saving is still allowed.
        </div>

        <!-- Order Settings -->
        <div class="mb-6 p-3 bg-surface-muted/50 rounded-lg space-y-4">
          <h3 class="text-sm font-medium text-muted">Order settings</h3>

          <!-- Capacity -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-muted">Capacity</label>
            <div class="flex items-center gap-2">
              <button
                @click="decrementCapacity"
                class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
                :disabled="localCapacity <= MIN_LATEX_CAPACITY"
              >
                -
              </button>
              <div class="w-20 h-8 flex items-center justify-center bg-input-surface border border-border rounded text-primary text-sm font-mono">
                {{ localCapacity }}
              </div>
              <button
                @click="incrementCapacity"
                class="w-8 h-8 flex items-center justify-center rounded bg-control-surface hover:bg-control-hover text-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <!-- Order Week -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-muted">Order week</label>
            <select
              v-model="localOrderWeekOffset"
              class="py-1.5 px-2 bg-control-surface border border-border-strong rounded text-primary text-sm"
            >
              <option v-for="opt in orderWeekOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Delivery Weeks -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-muted">Delivery weeks</label>
            <select
              v-model="localDeliveryWeeks"
              class="py-1.5 px-2 bg-control-surface border border-border-strong rounded text-primary text-sm"
            >
              <option v-for="n in 15" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4 mb-6">
          <!-- Order Date -->
          <div>
            <label class="block text-sm font-medium text-muted mb-1">Order date</label>
            <input
              v-model="orderDate"
              type="date"
              class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm"
            />
          </div>

          <!-- Expected Arrival -->
          <div>
            <label class="block text-sm font-medium text-muted mb-1">Expected arrival</label>
            <input
              v-model="expectedArrival"
              type="date"
              class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm"
            />
            <p class="text-xs text-subtle mt-1">Auto-calculated, can be adjusted</p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-muted mb-1">Notes</label>
            <input
              v-model="notes"
              type="text"
              placeholder="e.g., Soft latex priority"
              class="w-full px-3 py-2 bg-input-surface border border-border rounded-lg text-primary text-sm placeholder:text-subtle"
            />
          </div>

          <!-- Ordered Checkbox -->
          <div class="flex items-center">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="ordered"
                type="checkbox"
                class="w-4 h-4 rounded border-border bg-input-surface text-accent-sri-lanka focus:ring-accent-sri-lanka focus:ring-offset-0"
              />
              <span class="text-sm text-muted">Order placed with supplier</span>
            </label>
          </div>
        </div>

        <!-- SKU Picker -->
        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-medium text-muted mb-4">Latex items</h3>
          <SrilankaLatexSkuPicker
            v-model="skuQuantities"
            :sku-id-map="skuIdMap"
            :current-inventory="currentInventory"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-modal-header/50 shrink-0">
        <div
          :class="[
            'text-sm',
            isOverCapacity ? 'text-warning' : 'text-muted'
          ]"
        >
          Total: <span class="font-medium text-accent-sri-lanka-light">{{ totalItems }}</span> / {{ containerCapacity }} items
        </div>
        <div class="flex gap-3">
          <button
            @click="handleClose"
            class="px-3 py-1.5 text-sm font-medium text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="saving || totalItems === 0"
            :class="[
              'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
              saving || totalItems === 0
                ? 'bg-control-surface text-subtle cursor-not-allowed'
                : 'bg-accent-sri-lanka hover:bg-accent-sri-lanka-hover text-inverse'
            ]"
          >
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
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
