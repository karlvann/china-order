<script setup>
const props = defineProps({
  orderId: {
    type: [String, Number],
    required: true
  },
  proforma: {
    type: [String, Object],
    default: null
  }
})

const fileInput = ref(null)
const isDragging = ref(false)
const { proforma, uploading, downloading, error, uploadProforma, downloadProforma } = useOrderProforma(
  toRef(props, 'orderId'),
  toRef(props, 'proforma')
)

const handleFile = async (file) => {
  isDragging.value = false
  await uploadProforma(file)
  if (fileInput.value) fileInput.value.value = ''
}

const handleFileInput = (event) => {
  handleFile(event.target.files?.[0])
}

const handleDrop = (event) => {
  handleFile(event.dataTransfer?.files?.[0])
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-muted">Proforma</label>
    <button
    type="button"
    :disabled="uploading"
    :class="[
      'w-full min-h-24 px-4 py-3 border-2 border-dashed rounded-lg text-center transition-colors',
      isDragging ? 'border-brand bg-brand/20' : 'border-border-strong bg-input-surface hover:border-brand/40',
      uploading ? 'cursor-wait opacity-60' : 'cursor-pointer'
    ]"
    @click="fileInput?.click()"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    >
      <input
      ref="fileInput"
      type="file"
      accept=".csv,.pdf,text/csv,application/pdf"
      class="hidden"
      @change="handleFileInput"
      />
      <span class="block text-sm font-medium text-primary">
        {{ uploading ? 'Uploading...' : (proforma ? 'Drop a replacement CSV or PDF here' : 'Drop a CSV or PDF here') }}
      </span>
      <span class="block mt-1 text-xs text-subtle">
        {{ proforma?.filename_download || 'or click to choose a file' }}
      </span>
    </button>

    <p v-if="error" class="text-xs text-danger">
      {{ error }}
    </p>

    <button
    v-if="proforma"
    type="button"
    :disabled="downloading || uploading"
    class="w-full px-3 py-2 bg-control-surface hover:bg-control-hover border border-border rounded-lg text-sm font-medium text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    @click="downloadProforma"
    >
      {{ downloading ? 'Downloading...' : 'Download proforma' }}
    </button>
  </div>
</template>
