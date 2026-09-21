# Ordering Algorithms

This document describes the spring and component ordering algorithms used in the AusBeds China Order system.

---

## Weekly Demand Rate Calculation

**Files:** `composables/useWeeklySales.js`, `composables/useLatexSales.js`, `lib/utils/demandTrimming.js`

### Overview

Both spring and component ordering depend on a **weekly demand rate** per size/firmness. This rate is computed from paid mattress orders in Directus, but raw sales data is distorted by two effects:

- **Stockouts suppress observed sales** — when a SKU is out of stock, customers buy less (or wait), so the recorded sales rate underestimates true demand.
- **Post-restock recovery spikes inflate sales** — pent-up demand clears in a 1-2 week burst that overestimates baseline demand.

To produce a rate robust to both, we use a **chunked trimmed mean**.

### Method

1. Fetch all paid mattress sales from the last **12 complete Mon-Sun weeks**. The current partial week is excluded.
   - The 12-week window is chosen because the mattress recommendation algorithm changed in late February 2026; older data reflects a different product mix.
2. Bucket each sale into one of **6 chunks of 2 weeks** based on its date, where chunk 0 = most recent 2 weeks, chunk 5 = oldest.
3. For each metric (per size, per firmness, micro coils, etc.), sum the values per chunk.
4. If demand appears in only **1-2 non-zero chunks**, use the raw 12-week average instead of trimming. Sparse demand is too thin to classify a high chunk as a restock spike.
5. Otherwise, always drop the **single lowest chunk** and the **single highest chunk**.
6. ALSO drop the **second-lowest chunk** if (and only if) its 2-week period is *time-adjacent* to the lowest chunk's period — i.e., their chunk indices differ by 1. A real ~3-week stockout produces two consecutive low chunks; scattered low chunks are normal weekly variance and should not both be trimmed.
7. Average the remaining 3 or 4 chunks and divide by 2 (weeks per chunk) to get the weekly rate.
8. Round the internal algorithm rate to **3 decimal places**. UI demand labels display 2 decimal places for readability.

> ⚠️ "Adjacent" means **consecutive in time** (e.g., the `0-2w ago` chunk and the `2-4w ago` chunk). It is NOT about the sorted-by-value order — that would be trivially always-adjacent.

### Why this rule

| Distortion | Pattern in chunks | How the rule handles it |
|------------|-------------------|-------------------------|
| Sparse demand | Demand appears in only 1-2 chunks | Use raw 12-week average |
| ~3-week stockout | 2 time-adjacent low chunks | Both dropped |
| One-off slow week | 1 low chunk (or 2 non-adjacent lows) | Only the lowest dropped |
| 1-2 week recovery spike | 1 high chunk | Highest dropped |
| Sustained baseline | Chunks roughly equal | Trim has little effect; result ≈ mean |

### Firmness and model distribution

The **firmness distribution** (% firm/medium/soft) and **model distribution** (% Cooper/Aurora/Cloud) per size are calculated separately from the **full 12-week totals** (untrimmed), because percentages are more stable with a larger sample and aren't affected by stockout-driven volume changes in the same way absolute rates are.

The timeline **Spike** column is a short-window average: total demand from the last **2 complete Mon-Sun weeks** divided by 2. It remains unchanged when planning modes change. The former **Store split** percentage columns have been removed from the spring and Sri Lanka latex timelines.

### Fixed spring demand splits

The China **Store split demand** toggle now uses **fixed spring firmness percentages**, rather than observed store firmness preferences. With the toggle on, the app sums the two-week spike demand across all firmnesses of each mattress size and redistributes that volume as follows:

| Mattress sizes | Soft | Medium | Firm | Very firm |
|----------------|------|--------|------|-----------|
| King and King Single | 0% | 4% | 38% | 58% |
| Queen, Double and Single | 0% | 6% | 40% | 54% |

```javascript
springSkuDemand = sizeWeeklySpikeTotal * fixedFirmnessPercentage / 100
```

These percentages apply even when there are no recent store orders for a size. A size with zero spike volume has zero planning demand. The historical raw-SKU floor is replaced with the fixed-split rate in this mode, so historical soft sales cannot revive the 0% soft demand. With the toggle off, the original 12-week baseline and SKU floors remain unchanged.

`SPRING_PLANNING_SPLITS` in `lib/constants/firmness.js` is shared by the calculation and the summary above the spring timeline. The summary displays Medium, Firm and Very firm only; Soft remains 0% in the algorithm. These are demand assumptions for upcoming recommendation changes, not required percentages in each order: inventory coverage and whole-pallet allocation still determine actual order quantities.

### Fixed latex demand split

The Sri Lanka **Store split demand** toggle uses fixed mattress latex percentages for each inventory size:

| Size | Soft | Medium | Firm |
|------|------|--------|------|
| King | 68% | 28% | 4% |
| Queen | 58% | 38% | 4% |

For each inventory size, sum the observed two-week **Spike** rates across all three latex firmnesses, then multiply that total by the size's fixed percentages. Existing smaller-mattress cutting rules are already included in the observed King/Queen latex demand; they are not applied again. For example, 20 King sheets/week gives 13.6 soft, 5.6 medium and 0.8 firm sheets/week.

These percentages apply regardless of recent store orders or their observed firmness split. Zero or missing spike volume gives zero mattress latex planning demand for that size. Rates are rounded to three decimal places and feed both the timeline and order calculations. Turning the toggle off restores the original 12-week baseline.

`LATEX_PLANNING_SPLIT` in `lib/constants/latex.js` supplies both the calculation and the summary above the latex timeline. The **Spike** values, pillow latex demand/spikes, China spring splits and China micro coil/thin latex rules are unchanged. These are demand percentages, not guaranteed order percentages; stock, pending arrivals and the existing capacity/allocation rules still determine the order.

Mattress SKUs can include a soft-latex suffix (`s`) after the model number for models 11-16, e.g. `cloud15squeen`. This keeps the normal spring firmness for the model but overrides the Sri Lanka top latex demand to soft latex. Cooper uses foam instead of micro layers, but still consumes top latex.

### Store split demand for micro coils and thin latex

**Files:** `composables/useWeeklySales.js`, `stores/settings.js`, `lib/utils/storeSplitDemand.js`

The China toggle also recalculates micro coil and thin latex demand from the **store model mix**, not the spring firmness percentages. For each mattress size:

```javascript
storeLayersPerMattress = storeRecipeLayerTotal / storeMattressQuantity
componentDemand = planningMattressesPerWeek * storeLayersPerMattress
```

- The volume is the same active size demand used by springs: the last **2 complete weeks** of paid sales across all channels.
- The mix still comes from the existing **2-week non-website order sample**, separately from the fixed spring firmness assumptions. Quantities weight each recipe; Cloud contributes 2 micro/thin layers, Aurora 1, Cooper 0. Layer totals are read from parsed recipes rather than inferred from firmness.
- Calculate each mattress size separately, then consolidate: **King + 0.5 × Single** into King stock; **Queen + Double + King Single** into Queen stock. Round the combined demand to 3 decimal places.
- If a size has no recent store sample, use its **12-week paid-sales recipe mix** at its active two-week spike mattress volume. A nonempty all-Cooper sample is genuinely zero layer demand, not missing data.
- If none of an inventory group's sizes has a store sample, retain that group's original trimmed component demand. Also retain it if a positive-demand size lacks both recent and historical layer data.
- With the toggle **off**, the original trimmed component rates remain unchanged. The **Spike** columns always show observed two-week layer demand, not the store-model estimate.
- Both forecast depletion and order coverage/spring-matching calculations receive these planning rates. Existing inventory, pending orders, balancing and supplier lot rules still affect the final order quantities.

Example: King volume of **20 mattresses/week**, with a store mix of **60% Cloud, 30% Aurora, 10% Cooper**, gives `20 × (0.6 × 2 + 0.3 × 1) = 30` King micro coils and 30 thin latex sheets/week, **plus** the half-sheet contribution from Singles.

#### Accuracy limitations

This makes components consistent with the selected recent-demand scenario; it does not prove that the scenario forecasts better than the 12-week baseline.

- Two weeks reacts quickly to a genuine change, but promotions, bulk orders, stockouts and restock bursts can distort it. Small sizes have especially sparse samples; a single store mattress can dominate their mix.
- Applying store model mix to all-channel volume assumes website customers will follow the store mix. That is a planning assumption, not an observed fact.
- The existing store query excludes only `sale_source = website` (case/whitespace normalised). Unlike the volume query, it does **not** filter to paid sale orders, and blank sources count as store. Unpaid, non-sale or misclassified orders may bias the mix. This change preserves those existing filters.
- Seasonal multipliers still apply separately to timeline projections. Recent volume already reflects current seasonal conditions, so using both can compound that effect.
- Judge accuracy with rolling historical forecasts against subsequent actual recipe consumption, especially over the planned lead time. Automated regression tests verify the calculation, not real-world forecast accuracy.

Run the focused regression tests with `yarn test` (Node 24). They cover the fixed spring percentages (including King Single), size-specific King/Queen latex percentages with unchanged pillow demand, zero soft spring demand despite historical SKU floors, missing store samples, recipe quantity weighting, size consolidation, fallback/zero samples, toggle restoration and valid downstream orders/lot sizes. Timeline tests also verify the displayed split summary, retained Spike columns and 0.05/week row filtering. Tests use mocked sales without accessing Directus.

### Low-selling spring SKU floor

For spring ordering, the normal per-SKU demand starts as:

```javascript
normalSkuDemand = sizeTrimmedWeeklyRate × firmnessRatio12Weeks
```

If that normal per-SKU demand is below **1.75 units/week**, the algorithm applies a raw 12-week SKU floor:

```javascript
skuDemand = max(normalSkuDemand, rawSkuUnitsSoldLast12Weeks / 12)
```

This lets lumpy low-selling SKUs, such as Soft Double, count their real sales bursts without allowing stockout-suppressed raw sales to lower demand.

---

## Spring Ordering Algorithm

**File:** `lib/algorithms/demandBasedOrder.js`

### Overview

The spring ordering algorithm allocates pallets to sizes based on coverage priority, then distributes springs across firmnesses within each size. The goal is to prevent stockouts while respecting business constraints.

### Constraints and planning assumptions

- **Container capacity:** 1-12 pallets (user selects)
- **Pallet size:** Exactly 30 springs per pallet (supplier fixed)
- **Lead time:** Defaults to 10 weeks for China orders, but is user-adjustable because real lead times vary by order, season, supplier timing, and shipping conditions
- **Single size per pallet:** Cannot mix sizes on one pallet

### Size-Specific Coverage Targets

Different sizes have different minimum coverage targets based on business priority:

| Size | Target Coverage | Weight |
|------|-----------------|--------|
| Queen | 9 weeks | 1.5× |
| King | 8 weeks | 1.4× |
| Double | 6 weeks | 1.0× |
| King Single | 6 weeks | 1.0× |
| Single | 6 weeks | 1.0× |

Queen and King get priority weighting because they represent approximately 78% of sales.

### Algorithm Steps

#### Step 1: Calculate Per-SKU Metrics

For each of the 15 SKUs (5 sizes × 3 firmnesses):

```javascript
normalWeeklyDemand = sizeWeeklyRate × firmnessRatio
weeklyDemand = normalWeeklyDemand < 1.75 ? max(normalWeeklyDemand, rawSkuWeeklyDemand) : normalWeeklyDemand
projectedStock = currentStock - (weeklyDemand × weeksUntilArrival) + pendingArrivals
projectedCoverage = projectedStock / weeklyDemand
```

#### Step 2: Allocate Pallets to Sizes

1. Calculate each size's "urgency" based on its lowest firmness coverage:
   ```javascript
   baseUrgency = targetCoverage - minCoverage
   urgency = baseUrgency × priorityWeight
   ```

2. Sort sizes by urgency (highest first = most critical)

3. Allocate pallets one at a time to the most urgent size, recalculating urgency after each allocation

#### Step 3: Distribute Springs Within Each Size

For each size that received pallets:

1. Use the size's total allocated springs (`pallets × 30`).
2. Allocate springs to the lowest-coverage firmness first.
3. Continue allocating to the lowest-coverage firmnesses until all springs assigned to that size have been used.

### Skip Conditions

- **Overstock threshold:** SKUs above 30 weeks projected coverage are classified as overstocked for reporting/priority purposes
- **Demand-based allocation:** Sizes with healthier coverage naturally become less urgent, but the selected pallet count is still allocated by demand/coverage urgency

### Output

```javascript
{
  springs: {
    firm: { King: 0, Queen: 30, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 30, Queen: 60, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  },
  pallets: [...],
  metadata: { total_pallets: 4, total_springs: 120, ... }
}
```

---

## Component Ordering Algorithm

**File:** `lib/algorithms/componentCalc.js`

### Overview

The component ordering algorithm ensures components are ordered to match spring orders while maintaining balanced coverage across runout-managed component types. Felt is handled separately as a fixed spring-ratio top-up.

### Component Types

| Component | Sizes | Demand Rule |
|-----------|-------|-------------|
| Felt | All 5 | 1:3 spring top-up; coverage/runout rules do not apply |
| Top Panel | All 5 | 1:1 with mattress sales |
| Bottom Panel | All 5 | 1:1 with mattress sales |
| Side Panel | King, Queen, Double* | *Double covers Double + KS + Single |
| Micro Coils | King, Queen** | **Special demand ratio |
| Thin Latex | King, Queen** | **Special demand ratio |

### Micro Coils & Thin Latex Special Rules

- **Always equal:** Micro coils and thin latex must be ordered in equal quantities (they're glued together)
- **King inventory:** Used for King mattresses (1:1) + Single mattresses (0.5:1, cut in half)
- **Queen inventory:** Used for Queen, Double, King Single mattresses (1:1, cut from Queen)
- **Demand ratio:** Cloud mattresses use 2 layers, Aurora uses 1, Cooper uses 0. The algorithm uses actual weekly demand from sales data.

### Algorithm Phases

#### Phase 1: Calculate Initial Orders

Felt is calculated first from the spring order only:

```javascript
feltOrder = ceil(springsOrdered[size] / 3)
```

This is because springs arrive packaged in usable felt, but the business needs approximately 33% extra felt beyond what arrives with the springs. Felt is not skipped for high coverage, lifted for low coverage, balanced, or scaled by the component scale slider.

For each runout-managed component/size combination:

```javascript
springMatched = springsOrdered[size]  // or scaled for micro/latex
minForCoverage = calculateMinimumFor6WeeksAtArrival()
initialOrder = max(springMatched, minForCoverage)
```

Skip if projected coverage at arrival is above `SKIP_IF_COVERAGE_ABOVE` (currently 10 weeks).

#### Phase 2: Calculate Coverage

Calculate projected coverage at arrival for each component with the initial order.

#### Phase 3: Balance Coverage

1. Find the minimum coverage across all runout-managed components being ordered
2. Set target max = min coverage + 4 weeks
3. For components exceeding target max, reduce order to target max
4. Never reduce below the 6-week minimum floor

This prevents scenarios like:
- Bottom Panel Queen: 9 weeks coverage
- Bottom Panel King: 15 weeks coverage

After balancing, both would be closer to 9-13 weeks.

#### Phase 4: Micro Coils & Thin Latex

Same balancing logic, with additional steps:
- Scale spring-matched by demand ratio (Cloud/Aurora factor)
- Equalize micro coils and thin latex quantities
- Adjust orders to make final stock equal between micro and latex

#### Phase 5: Apply Scaling

```javascript
combinedScale = containerScale × componentScaleOverride

// containerScale = palletCount / 12 (e.g., 6 pallets = 0.5)
// componentScaleOverride = user slider (0.3 to 2.0, default 1.0)
```

For each runout-managed component:
- Scale the order by combined factor
- If scaling down, ensure 6-week minimum is still met
- If scaling up, just apply the scale

Felt is excluded from scaling so it stays at the 1:3 felt-to-spring ratio.

### Thresholds

| Threshold | Value | Purpose |
|-----------|-------|---------|
| `SKIP_IF_COVERAGE_ABOVE` | 10 weeks | Don't order if already well-stocked at arrival |
| Minimum coverage at arrival | 6 weeks (default) | Floor for runout-managed components |
| Max coverage spread | 4 weeks | Balance range (min to min+4) |
| Full container | 12 pallets | Base for container scaling |

### Dynamic Minimum Coverage

The minimum coverage floor adjusts based on the component scale slider:

| Component Scale | Minimum Coverage |
|-----------------|------------------|
| ≥ 1.0 | 6 weeks |
| 0.8 - 0.99 | 5 weeks |
| < 0.8 | 4 weeks |

This allows smaller orders to fit in smaller containers while still maintaining reasonable coverage.

### User Controls

- **Pallet count:** Affects container scale factor (5 pallets = 42% scale)
- **Component scale slider:** 0.3× to 2.0× manual override (also affects minimum coverage)
- **Order week:** When the order is placed
- **Delivery weeks:** Lead time to arrival

### Output

```javascript
{
  micro_coils: { King: 45, Queen: 80, Double: 0, 'King Single': 0, Single: 0 },
  thin_latex: { King: 45, Queen: 80, Double: 0, 'King Single': 0, Single: 0 },
  felt: { King: 10, Queen: 20, Double: 0, 'King Single': 0, Single: 0 },
  top_panel: { ... },
  bottom_panel: { ... },
  side_panel: { King: 30, Queen: 60, Double: 20, 'King Single': 0, Single: 0 }
}
```

---

## Timeline Projections

Both the Spring Timeline and Component Timeline display 40-week projections showing:

- **Current stock** (Now column)
- **Weekly demand** per row
- **Projected stock** at start of each week
- **Order arrivals** highlighted with (+X) notation
- **Color coding:**
  - Red: Depleted (stock ≤ 0)
  - Yellow: Low stock (≤4 weeks) - optional toggle
  - Blue: Overstock (>30 weeks)

The timelines scroll horizontally in sync.

---

## Seasonal Demand (Optional)

When enabled, applies calendar-month seasonality multipliers to demand projections:

- **Busy season (Apr-Aug):** +14% demand
- **Slow season (Sep-Mar):** -12% demand

This affects the timeline projections but uses the same base ordering algorithm.
