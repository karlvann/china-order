# BUSINESS GOALS

**Last updated**: 2026-05-05

This file documents what the ordering system is actually optimising for. Coverage/runway is described in **weeks** throughout the app and docs.

---

## Primary goal: Prevent stockouts

The top priority is preventing stockouts on high-velocity sizes, especially King and Queen.

### Why this matters
- **King**: Approximately 30% of sales
- **Queen**: Approximately 48% of sales
- **Together**: Approximately 78% of sales volume
- A King or Queen stockout has the highest business impact

### Current spring allocation targets
The demand-based spring algorithm uses size-specific minimum coverage targets at arrival:

| Size | Minimum coverage target |
|------|--------------------------|
| Queen | 9 weeks |
| King | 8 weeks |
| Double | 6 weeks |
| King Single | 6 weeks |
| Single | 6 weeks |

Queen and King also receive priority weighting because they account for most sales volume.

### Success metric
✅ High-velocity items are kept above their minimum coverage targets where capacity allows.  
✅ If capacity is limited, pallets are allocated to the sizes with the highest demand/coverage urgency.

### Not success metrics
❌ Equal coverage across every size  
❌ Minimum variance between all sizes  
❌ Perfect runway balance  
❌ Allocating pallets evenly regardless of demand

---

## Secondary goal: Capital efficiency

Avoid wasting pallet capacity and cash on inventory that is already healthy relative to demand.

### The problem
- Smaller sizes sell more slowly than King and Queen.
- A slow-moving size with high projected coverage is usually less urgent than a high-volume size with low projected coverage.
- Giving pallets to low-urgency items can increase stockout risk on King/Queen.

### Current approach
The spring algorithm is demand-based:

1. Project coverage at arrival for every size/firmness SKU.
2. Calculate size urgency from the lowest-coverage firmness in each size.
3. Weight Queen and King urgency higher.
4. Allocate pallets one at a time to the most urgent size.
5. Recalculate coverage/urgency after each pallet.
6. Distribute springs within that size toward the lowest-coverage firmnesses first.

There is no hard rule that says “small sizes can only get 1-2 pallets” or “skip all small sizes above X weeks”. If a small size is genuinely urgent, it can receive pallets. If it has healthy coverage, the demand-based urgency calculation naturally deprioritises it.

---

## What success looks like

### ✅ Good outcome
```text
After arrival:
- Queen Medium: 9.5 weeks
- King Medium: 8.2 weeks
- Double Medium: 6.3 weeks
- King Single: high enough to not be urgent

No likely stockouts.
Pallets went to the highest urgency sizes.
Slow-moving items were not over-prioritised.
```

### ⚠️ Acceptable outcome
```text
After arrival:
- Queen Medium: 8.5 weeks
- King Medium: 7.8 weeks
- A small size has much higher coverage

Not perfectly balanced, but acceptable because capacity was limited and the allocation improved high-priority stockout risk.
```

### ❌ Bad outcome
```text
After arrival:
- Every size receives an equal number of pallets
- Queen/King remain below target
- Slow-moving sizes receive pallets despite lower urgency

This looks balanced on paper but does not match the business goal.
```

---

## For future algorithm changes

### Do optimise for
1. Stockout prevention on high-volume sizes
2. Demand/coverage urgency
3. Efficient use of the selected pallet count
4. Realistic improvements within supplier/logistics constraints
5. Clear handling of pending orders and variable lead times

### Do not optimise for
1. Equal coverage across all sizes
2. Equal pallet counts per size
3. Lowest variance as the main objective
4. Theoretical perfection that ignores fixed pallet/container constraints

---

## How to evaluate changes

### Good change ✅
```text
Change: Improve urgency calculation using projected coverage at arrival.
Effect: Queen/King below target receive pallets before healthy slow-moving sizes.
Verdict: Good, because it reduces stockout risk where demand is highest.
```

### Bad change ❌
```text
Change: Allocate pallets evenly to all sizes.
Effect: Small sizes get capacity even when Queen/King are more urgent.
Verdict: Bad, because it ignores demand weighting and stockout impact.
```

### Neutral change ⚠️
```text
Change: Reduce coverage variance without improving urgent SKUs.
Effect: Forecast looks smoother, but stockout risk is unchanged.
Verdict: Nice-to-have only; not the main goal.
```

---

## Summary for future agents

When changing ordering logic:

1. Read `docs/CONSTRAINTS.md`.
2. Preserve demand-based allocation.
3. Prioritise King/Queen stockout prevention.
4. Use weeks for coverage/runway language.
5. Do not chase perfect balance for its own sake.

Bottom line: optimise for business reality and stockout prevention, not equal-looking runways.
