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

1. Fetch all paid mattress sales from the last **84 days (12 weeks)**.
   - The 12-week window is chosen because the mattress recommendation algorithm changed in late February 2026; older data reflects a different product mix.
2. Bucket each sale into one of **6 chunks of 2 weeks** based on its date, where chunk 0 = most recent 2 weeks, chunk 5 = oldest.
3. For each metric (per size, per firmness, micro coils, etc.), sum the values per chunk.
4. Drop the **single lowest chunk** (stockout-suppressed weeks) and the **single highest chunk** (post-restock recovery spike).
5. Average the remaining 4 chunks and divide by 2 (weeks per chunk) to get the weekly rate.

### Why this rule

| Distortion | Pattern in chunks | How the rule handles it |
|------------|-------------------|-------------------------|
| Stockout dip | 1+ low chunks | Lowest dropped |
| 1-2 week recovery spike | 1 high chunk | Highest dropped |
| Sustained baseline | Chunks roughly equal | Trim has little effect; result ≈ mean |

### Firmness and model distribution

The **firmness distribution** (% firm/medium/soft) and **model distribution** (% Cooper/Aurora/Cloud) per size are calculated separately from the **full 12-week totals** (untrimmed), because percentages are more stable with a larger sample and aren't affected by stockout-driven volume changes in the same way absolute rates are.

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
| King | 8 weeks | 1.3× |
| Double | 6 weeks | 1.0× |
| King Single | 6 weeks | 1.0× |
| Single | 6 weeks | 1.0× |

Queen and King get priority weighting because they represent approximately 78% of sales.

### Algorithm Steps

#### Step 1: Calculate Per-SKU Metrics

For each of the 15 SKUs (5 sizes × 3 firmnesses):

```javascript
weeklyDemand = sizeWeeklyRate × firmnessRatio
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

The component ordering algorithm ensures components are ordered to match spring orders while maintaining balanced coverage across all component types. It accounts for container size and allows manual scaling.

### Component Types

| Component | Sizes | Demand Rule |
|-----------|-------|-------------|
| Felt | All 5 | 1:1 with mattress sales |
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

For each component/size combination:

```javascript
springMatched = springsOrdered[size]  // or scaled for micro/latex
minForCoverage = calculateMinimumFor6WeeksAtArrival()
initialOrder = max(springMatched, minForCoverage)
```

Skip if projected coverage at arrival is above `SKIP_IF_COVERAGE_ABOVE` (currently 10 weeks).

#### Phase 2: Calculate Coverage

Calculate projected coverage at arrival for each component with the initial order.

#### Phase 3: Balance Coverage

1. Find the minimum coverage across all components being ordered
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

For each component:
- Scale the order by combined factor
- If scaling down, ensure 6-week minimum is still met
- If scaling up, just apply the scale

### Thresholds

| Threshold | Value | Purpose |
|-----------|-------|---------|
| `SKIP_IF_COVERAGE_ABOVE` | 10 weeks | Don't order if already well-stocked at arrival |
| Minimum coverage at arrival | 6 weeks (default) | Floor for all components |
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
  felt: { King: 30, Queen: 60, Double: 10, 'King Single': 5, Single: 5 },
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
