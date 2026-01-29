<script setup>
const orderStore = useOrderStore()
</script>

<template>
  <div class="section-container py-6">
    <!-- Health Alert -->
    <OrderHealthAlert />

    <!-- Order Hero -->
    <OrderHero />

    <!-- Accordion Sections -->
    <div class="mt-6">
      <!-- Validation Warnings -->
      <UiAccordionSection
        v-if="orderStore.hasValidationIssues"
        section-id="validationWarnings"
        title="Validation Warnings"
        badge="Alert"
        badge-type="warning"
      >
        <OrderValidationBanner />
      </UiAccordionSection>

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

      <!-- How It Works -->
      <UiAccordionSection
        section-id="howItWorks"
        title="How Component Orders Work"
        badge="Info"
        badge-type="info"
      >
        <p class="text-sm text-zinc-300 leading-relaxed mb-3">
          Components and springs ship together in the same container and <strong>must deplete at the same rate</strong>.
        </p>
        <p class="text-sm text-zinc-300 leading-relaxed mb-3">
          The system automatically calculates component quantities to ensure equal runway coverage.
        </p>
        <div class="p-3 bg-info/10 border border-info/30 rounded-md text-sm text-info">
          <strong>Example:</strong> If you order enough springs for 6 months, the system orders enough components for 6 months.
        </div>
      </UiAccordionSection>
    </div>
  </div>
</template>
