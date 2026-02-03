<script setup>
</script>

<template>
  <div class="section-container py-6">
    <!-- Order hero -->
    <OrderHero />

    <!-- Accordion sections -->
    <div class="mt-6">
      <!-- Detailed order breakdown -->
      <UiAccordionSection
        section-id="yourOrder"
        title="Detailed order breakdown"
      >
        <OrderPalletList :compact="true" />
      </UiAccordionSection>

      <!-- Spring inventory -->
      <UiAccordionSection
        section-id="springInventory"
        title="Spring inventory"
      >
        <p class="text-sm text-zinc-400 mb-3">
          In brackets is the calculated monthly depletion based on weekly sales data.
        </p>
        <InventorySpringInventoryTable />
      </UiAccordionSection>

      <!-- Component inventory -->
      <UiAccordionSection
        section-id="componentInventory"
        title="Component inventory"
      >
        <p class="text-sm text-zinc-400 mb-3">
          Enter current component stock. Micro coils & thin latex only for King/Queen.
        </p>
        <InventoryComponentInventoryTable />
      </UiAccordionSection>

      <!-- Weekly sales data -->
      <UiAccordionSection
        section-id="weeklySales"
        title="Weekly sales (demand)"
        badge="Live"
        badge-type="success"
      >
        <InventoryWeeklySalesPanel />
      </UiAccordionSection>

    </div>
  </div>
</template>
