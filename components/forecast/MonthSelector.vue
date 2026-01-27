<script setup>
const settingsStore = useSettingsStore()

const { getMonthOptions } = useMonthNames()
const monthOptions = getMonthOptions()

const handleChange = (event) => {
  settingsStore.setStartingMonth(parseInt(event.target.value))
}
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">
      Starting Month:
    </label>
    <select
      :value="settingsStore.startingMonth"
      @change="handleChange"
      class="py-2.5 px-4 bg-surface border border-border rounded-lg text-zinc-50 text-sm font-semibold cursor-pointer min-w-[140px]"
    >
      <option
        v-for="option in monthOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
