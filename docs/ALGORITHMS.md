# Ordering Algorithms

This document describes the spring and component ordering algorithms used in the AusBeds China Order system.

---

## Spring Ordering Algorithm

**File:** `lib/algorithms/demandBasedOrder.js`

### Overview

The spring ordering algorithm allocates pallets to sizes based on coverage priority, then distributes springs across firmnesses within each size. The goal is to prevent stockouts while respecting business constraints.

### Constraints (Fixed)

- **Container capacity:** 1-12 pallets (user selects)
- **Pallet size:** Exactly 30 springs per pallet (supplier fixed)
- **Lead time:** 10 weeks default (configurable)
- **Single size per pallet:** Cannot mix sizes on one pallet

### Size-Specific Coverage Targets

Different sizes have different minimum coverage targets based on business priority:

| Size | Target Coverage | Weight |
|------|-----------------|--------|
| Queen | 9 weeks | 1.5× |
| King | 7 weeks | 1.3× |
| Double | 6 weeks | 1.0× |
| King Single | 6 weeks | 1.0× |
| Single | 6 weeks | 1.0× |

Queen and King get priority weighting because they represent 88% of sales.

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

1. Calculate springs needed per firmness to reach target coverage
2. Allocate springs to the lowest-coverage firmness first
3. Continue until all 30 springs per pallet are allocated
4. Never add springs to firmnesses that would exceed 30 weeks coverage

### Skip Conditions

- **Overstock threshold:** Don't allocate springs to firmnesses with >30 weeks projected coverage
- **Zero pallets:** If all firmnesses of a size are overstocked, that size gets 0 pallets

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

Skip if projected coverage at arrival > 12 weeks.

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
| Skip if coverage above | 12 weeks | Don't order if already well-stocked at arrival |
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

When enabled, applies monthly multipliers to demand projections:

- **Busy season (Apr-Aug):** +14% demand
- **Slow season (Sep-Mar):** -12% demand

This affects the timeline projections but uses the same base ordering algorithm.
