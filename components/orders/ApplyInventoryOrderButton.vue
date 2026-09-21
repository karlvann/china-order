<script setup>
const props = defineProps({
  orderId: {
    type: [String, Number],
    required: true
  },
  ordered: {
    type: Boolean,
    required: true
  },
  panelContext: {
    type: String,
    required: true
  }
})

const receivingStore = useInventoryOrderReceivingStore()
const { error } = storeToRefs(receivingStore)

const confirmationOpen = ref(false)
const modalRef = ref(null)
const isApplying = computed(() => receivingStore.isApplyingOrder(props.orderId))
const isSriLanka = computed(() => props.panelContext === 'sri_lanka')

const openConfirmation = () => {
  error.value = null
  confirmationOpen.value = true
  nextTick(() => modalRef.value?.focus())
}

const closeConfirmation = () => {
  if (isApplying.value) return
  confirmationOpen.value = false
}

const applyOrder = async () => {
  const result = await receivingStore.applyOrderToInventory(props.orderId)
  if (!result.success) return

  confirmationOpen.value = false
  if (isSriLanka.value) {
    useSriLankaUIStore().closeOrderPanel()
  } else {
    useUIStore().closeOrderPanel()
  }
}
</script>

<template>
  <template v-if="ordered">
    <button
      type="button"
      :disabled="isApplying"
      :class="[
        'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
        isApplying
          ? 'bg-control-surface text-subtle cursor-not-allowed'
          : isSriLanka
            ? 'bg-accent-sri-lanka hover:bg-accent-sri-lanka-hover text-inverse'
            : 'bg-success hover:opacity-90 text-inverse'
      ]"
      @click="openConfirmation"
    >
      {{ isApplying ? 'Applying...' : 'Apply to inventory' }}
    </button>

    <Teleport to="body">
      <div
        v-if="confirmationOpen"
        ref="modalRef"
        tabindex="-1"
        class="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 px-4 outline-none"
        @click.self="closeConfirmation"
        @keydown.esc.stop.prevent="closeConfirmation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-inventory-title"
          aria-describedby="apply-inventory-description"
          class="w-full max-w-lg bg-modal-surface border border-danger rounded-xl"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-danger/30 bg-danger/10">
            <h2 id="apply-inventory-title" class="text-lg font-semibold text-danger">
              DANGER: Apply order to inventory?
            </h2>
            <button
              type="button"
              :disabled="isApplying"
              class="text-muted hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
              @click="closeConfirmation"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-4">
            <p id="apply-inventory-description" class="text-sm text-muted">
              Do you wish to apply the items in this order to inventory and delete the order? Click yes ONLY if you have received and checked the order.
            </p>
            <p v-if="error" class="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              {{ error }}
            </p>
          </div>

          <div class="flex justify-end gap-3 px-5 py-4 border-t border-danger/30 bg-danger/10">
            <button
              type="button"
              :disabled="isApplying"
              class="px-3 py-1.5 text-sm font-medium text-muted hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              @click="closeConfirmation"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isApplying"
              :class="[
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                isApplying
                  ? 'bg-control-surface text-subtle cursor-not-allowed'
                  : 'bg-danger hover:bg-danger-hover text-inverse'
              ]"
              @click="applyOrder"
            >
              {{ isApplying ? 'Applying...' : 'Yes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </template>
</template>
