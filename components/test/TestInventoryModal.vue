<script setup>
import {
  COMPONENT_TYPES,
  FIRMNESS_LABELS,
  FIRMNESS_TYPES,
  LATEX_FIRMNESSES,
  LATEX_SIZES,
  MATTRESS_SIZES,
  PILLOW_LATEX_LABELS,
  PILLOW_LATEX_TYPES
} from '~/lib/constants/index.js'
import {
  createEmptyComponentInventory,
  createEmptyLatexInventory,
  createEmptySpringInventory
} from '~/lib/utils/index.js'

const appModeStore = useAppModeStore()
const testInventoryStore = useTestInventoryStore()

const sections = [
  { id: 'china-springs', label: 'China springs' },
  { id: 'china-components', label: 'China components' },
  { id: 'sri-lanka-latex', label: 'Sri Lanka latex' }
]

const activeSection = ref('china-springs')
const draftInventory = ref({
  chinaSprings: createEmptySpringInventory(),
  chinaComponents: createEmptyComponentInventory(),
  sriLankaLatex: createEmptyLatexInventory()
})

const mattressSizes = computed(() => MATTRESS_SIZES.map(size => size.id))
const sizeAbbreviations = {
  King: 'K',
  Queen: 'Q',
  Double: 'D',
  'King Single': 'KS',
  Single: 'S'
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const sanitizeQuantity = (value) => {
  return Math.max(0, parseInt(value, 10) || 0)
}

const sentenceLabel = (value) => {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const firmnessLabel = (firmness) => {
  return sentenceLabel(FIRMNESS_LABELS[firmness] || firmness)
}

const latexFirmnessLabel = (firmness) => {
  return sentenceLabel(firmness)
}

const componentLabel = (component) => {
  return sentenceLabel(component.name)
}

const isComponentAvailable = (componentId, size) => {
  if (['micro_coils', 'thin_latex'].includes(componentId)) {
    return ['King', 'Queen'].includes(size)
  }

  if (componentId === 'side_panel') {
    return ['King', 'Queen', 'Double'].includes(size)
  }

  return true
}

const loadDraftFromStore = () => {
  if (!testInventoryStore.loaded) {
    testInventoryStore.loadFromStorage()
  }
  draftInventory.value = testInventoryStore.getDraftInventory()
}

const resetDraft = () => {
  draftInventory.value = {
    chinaSprings: createEmptySpringInventory(),
    chinaComponents: createEmptyComponentInventory(),
    sriLankaLatex: createEmptyLatexInventory()
  }
}

const setChinaSpringQuantity = (firmness, size, value) => {
  draftInventory.value.chinaSprings[firmness][size] = sanitizeQuantity(value)
}

const setChinaComponentQuantity = (componentId, size, value) => {
  if (!isComponentAvailable(componentId, size)) return
  draftInventory.value.chinaComponents[componentId][size] = sanitizeQuantity(value)
}

const setSriLankaLatexQuantity = (firmness, size, value) => {
  draftInventory.value.sriLankaLatex[firmness][size] = sanitizeQuantity(value)
}

const setSriLankaPillowLatexQuantity = (type, value) => {
  draftInventory.value.sriLankaLatex.pillowLatex[type] = sanitizeQuantity(value)
}

const handleSave = () => {
  testInventoryStore.replaceInventory(clone(draftInventory.value))
  appModeStore.closeTestInventoryModal()
}

const handleClose = () => {
  appModeStore.closeTestInventoryModal()
}

watch(() => appModeStore.testInventoryModalOpen, (isOpen) => {
  if (isOpen) {
    loadDraftFromStore()
  }
})

onMounted(() => {
  testInventoryStore.loadFromStorage()
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="appModeStore.testInventoryModalOpen && appModeStore.isTestMode"
      class="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 px-4 py-6"
      @click.self="handleClose"
    >
      <div class="w-full max-w-5xl max-h-[90vh] bg-modal-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border bg-modal-header/50">
          <div>
            <h2 class="text-lg font-semibold text-primary">Test inventory</h2>
            <p class="text-xs text-muted mt-1">Local stock counts for the Now column.</p>
          </div>
          <button
            @click="handleClose"
            class="text-muted hover:text-primary transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-border px-5 pt-4 bg-background">
          <button
            v-for="section in sections"
            :key="section.id"
            @click="activeSection = section.id"
            :class="[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeSection === section.id
                ? 'border-brand text-brand-light'
                : 'border-transparent text-muted hover:text-primary'
            ]"
          >
            {{ section.label }}
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5">
          <!-- China springs -->
          <div v-if="activeSection === 'china-springs'" class="space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-primary">China springs</h3>
              <p class="text-xs text-subtle mt-1">Enter local spring stock by firmness and size.</p>
            </div>

            <div class="overflow-x-auto border border-border rounded-lg">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-table-header text-muted text-left">
                    <th class="px-3 py-2 font-medium">Size</th>
                    <th
                      v-for="firmness in FIRMNESS_TYPES"
                      :key="firmness"
                      class="px-3 py-2 font-medium text-center"
                    >
                      {{ firmnessLabel(firmness) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="size in mattressSizes" :key="size" class="border-t border-border">
                    <td class="px-3 py-2 text-primary font-medium">{{ size }}</td>
                    <td v-for="firmness in FIRMNESS_TYPES" :key="firmness" class="px-3 py-2">
                      <input
                        type="number"
                        :value="draftInventory.chinaSprings[firmness][size]"
                        @input="setChinaSpringQuantity(firmness, size, $event.target.value)"
                        class="w-full min-w-[80px] px-2 py-1.5 bg-input-surface border border-border rounded text-center text-primary text-sm"
                        min="0"
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- China components -->
          <div v-else-if="activeSection === 'china-components'" class="space-y-5">
            <div>
              <h3 class="text-sm font-semibold text-primary">China components</h3>
              <p class="text-xs text-subtle mt-1">Enter local component stock by SKU.</p>
            </div>

            <div
              v-for="component in COMPONENT_TYPES"
              :key="component.id"
              class="border border-border rounded-lg p-4 bg-surface/40"
            >
              <h4 class="text-sm font-medium text-muted mb-3">{{ componentLabel(component) }}</h4>
              <div class="grid grid-cols-5 gap-3">
                <div
                  v-for="size in mattressSizes"
                  :key="`${component.id}-${size}`"
                  class="text-center"
                >
                  <div class="text-xs text-subtle mb-1">{{ sizeAbbreviations[size] }}</div>
                  <input
                    v-if="isComponentAvailable(component.id, size)"
                    type="number"
                    :value="draftInventory.chinaComponents[component.id][size]"
                    @input="setChinaComponentQuantity(component.id, size, $event.target.value)"
                    class="w-full px-2 py-1.5 bg-input-surface border border-border rounded text-center text-primary text-sm"
                    min="0"
                  >
                  <div v-else class="py-1.5 text-xs text-disabled">N/A</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sri Lanka latex -->
          <div v-else class="space-y-5">
            <div>
              <h3 class="text-sm font-semibold text-primary">Sri Lanka latex</h3>
              <p class="text-xs text-subtle mt-1">Enter local latex and pillow latex stock.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div v-for="size in LATEX_SIZES" :key="size" class="border border-border rounded-lg p-4 bg-surface/40">
                <h4 class="text-sm font-medium text-muted mb-3">{{ size }} latex</h4>
                <div class="space-y-3">
                  <div
                    v-for="firmness in LATEX_FIRMNESSES"
                    :key="`${firmness}-${size}`"
                    class="flex items-center justify-between gap-3"
                  >
                    <label class="text-sm text-muted">{{ latexFirmnessLabel(firmness) }}</label>
                    <input
                      type="number"
                      :value="draftInventory.sriLankaLatex[firmness][size]"
                      @input="setSriLankaLatexQuantity(firmness, size, $event.target.value)"
                      class="w-24 px-2 py-1.5 bg-input-surface border border-border rounded text-center text-primary text-sm"
                      min="0"
                    >
                  </div>
                </div>
              </div>
            </div>

            <div class="border border-border rounded-lg p-4 bg-surface/40">
              <h4 class="text-sm font-medium text-muted mb-3">Pillow latex</h4>
              <div class="grid grid-cols-2 gap-4">
                <div
                  v-for="type in PILLOW_LATEX_TYPES"
                  :key="type"
                  class="flex items-center justify-between gap-3"
                >
                  <label class="text-sm text-muted">{{ PILLOW_LATEX_LABELS[type] }}</label>
                  <input
                    type="number"
                    :value="draftInventory.sriLankaLatex.pillowLatex[type]"
                    @input="setSriLankaPillowLatexQuantity(type, $event.target.value)"
                    class="w-24 px-2 py-1.5 bg-input-surface border border-border rounded text-center text-primary text-sm"
                    min="0"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-modal-header/50">
          <button
            @click="resetDraft"
            class="px-4 py-2 text-sm font-medium text-muted hover:text-danger transition-colors"
          >
            Reset
          </button>
          <div class="flex items-center gap-3">
            <button
              @click="handleClose"
              class="px-4 py-2 bg-input-surface hover:bg-control-surface text-primary text-sm font-medium rounded transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleSave"
              class="px-4 py-2 bg-brand hover:bg-brand-hover text-inverse text-sm font-medium rounded transition-colors"
            >
              Save inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
