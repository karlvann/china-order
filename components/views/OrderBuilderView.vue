<script setup>
</script>

<template>
  <div class="section-container py-6">
    <!-- Order Hero -->
    <OrderHero />

    <!-- Accordion Sections -->
    <div class="mt-6">
      <!-- Detailed Order Breakdown -->
      <UiAccordionSection
        section-id="yourOrder"
        title="Detailed Order Breakdown"
      >
        <OrderPalletList :compact="true" />
      </UiAccordionSection>

      <!-- Spring Inventory -->
      <UiAccordionSection
        section-id="springInventory"
        title="Spring Inventory"
      >
        <p class="text-sm text-zinc-400 mb-3">
          In brackets is the calculated monthly depletion based on weekly sales data.
        </p>
        <InventorySpringInventoryTable />
      </UiAccordionSection>

      <!-- Component Inventory -->
      <UiAccordionSection
        section-id="componentInventory"
        title="Component Inventory"
      >
        <p class="text-sm text-zinc-400 mb-3">
          Enter current component stock. Micro coils & thin latex only for King/Queen.
        </p>
        <InventoryComponentInventoryTable />
      </UiAccordionSection>

      <!-- Weekly Sales Data -->
      <UiAccordionSection
        section-id="weeklySales"
        title="Weekly Sales (Demand)"
        badge="Live"
        badge-type="success"
      >
        <InventoryWeeklySalesPanel />
      </UiAccordionSection>

    </div>
  </div>
</template>
