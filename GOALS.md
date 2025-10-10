# BUSINESS GOALS

**Last Updated**: 2025-10-10

## For Future AI Assistants

This file documents what the system is **actually optimizing for**. Read this before suggesting algorithm changes.

---

## Primary Goal: Prevent Stockouts

This system's #1 priority is **preventing stockouts** on high-velocity items (King and Queen).

### Why This Matters
- **King**: 30 units/month sales (36.88% of total business)
- **Queen**: 41 units/month sales (51.15% of total business)
- **Together**: 88% of sales volume
- **If they stockout**: Business loses money, customers go elsewhere

### Success Metric
✅ King and Queen maintain **minimum 2-3 months coverage** after container arrival

### Not Success Metric
❌ All sizes have equal coverage
❌ Variance is minimized
❌ Perfect balance across all firmnesses

---

## Secondary Goal: Capital Efficiency

Don't waste money on excess slow-moving inventory.

### The Problem
- Small sizes (Double, King Single, Single) sell 1-6 units/month
- If they already have 6-9 months coverage, they don't need more
- Giving them pallets wastes container capacity
- That capacity should go to King/Queen (critical items)

### Solution (Layer 1)
- Coverage threshold: Skip small sizes with >4 months
- Reallocate those pallets to King/Queen
- Result: No wasted inventory, better stockout prevention

### Success Metric
✅ No pallets allocated to sizes with >4 months coverage
✅ Container capacity used on critical items

---

## What Success Actually Looks Like

### ✅ GOOD (Success)
```
After container arrival:
- King Medium: 2.5 months (safe for now)
- Queen Medium: 2.9 months (safe for now)
- King Single: 4 months (healthy, not over-ordered)

No stockouts expected.
Container capacity used efficiently.
Capital not wasted on excess small size inventory.
```

### ❌ NOT THE GOAL (Don't optimize for this)
```
After container arrival:
- All sizes: Exactly 6.0 months (perfect balance)
- Variance: 0 months

This is THEORETICALLY NICE but:
- Impossible with fixed constraints
- Not what the business needs
- Wastes effort on wrong optimization
```

### ⚠️ ACCEPTABLE (Not perfect, but OK)
```
After container arrival:
- King Medium: 2.2 months (still low, but better than before)
- Queen Medium: 2.9 months (improved by 40%)
- King Single: 3.5 months (balanced)
- Variance: 8 months (not balanced, but OK!)

Why acceptable?
- No stockouts expected
- Queen improved (main seller)
- No wasted pallets
- This is the best we can do with 8 pallets
```

---

## For Future Algorithm Changes

### DO Optimize For:
1. **Stockout prevention** on King/Queen
2. **Efficient allocation** (don't waste pallets on healthy sizes)
3. **Capital efficiency** (don't over-order slow-moving items)
4. **Pragmatic improvements** within constraints

### DON'T Optimize For:
1. ❌ **Runway balance** (all sizes deplete at same time)
2. ❌ **Equal coverage** (all sizes at 6 months)
3. ❌ **Minimize variance** (spread between min/max coverage)
4. ❌ **Theoretical perfection** (impossible with constraints)

---

## Understanding the Trade-offs

### Why Not Perfect Balance?

**Math Reality**:
- With 8 pallets = 240 springs total
- King needs ~160 springs to reach 4 months
- Queen needs ~140 springs to reach 4 months
- Total needed: 300 springs
- **We only have 240 springs!**

**Conclusion**: Perfect balance is mathematically impossible with 8-pallet containers.

### What We Can Actually Achieve

**Within Constraints**:
- Prevent imminent stockouts (keep King/Queen above 2 months)
- Don't waste pallets on healthy sizes
- Improve coverage by 30-40% on critical items
- Use every pallet efficiently

**This is success!** Even if it's not perfect balance.

---

## How to Evaluate Algorithm Changes

### Good Change ✅
```
Change: Skip small sizes with >4 months coverage
Effect: Queen coverage improves from 2.07 → 2.90 months
Benefit: 40% reduction in Queen stockout risk
Cost: King Single coverage drops from 14.69 → 3.43 months (still healthy)

Verdict: GOOD - prevents stockouts, no waste
```

### Bad Change ❌
```
Change: Give equal pallets to all sizes
Effect: All sizes get ~1.6 pallets each (fractional - impossible!)
Benefit: "Perfect balance" in theory
Cost: King/Queen still critical, small sizes over-ordered

Verdict: BAD - doesn't prevent stockouts, ignores constraints
```

### Neutral Change ⚠️
```
Change: Optimize to minimize variance
Effect: Variance reduced from 15 → 10 months
Benefit: "Better balance" on paper
Cost: Doesn't improve King/Queen stockout risk

Verdict: NEUTRAL - Nice to have but not the goal
```

---

## Real-World Example

### Scenario: King and Queen both at 2 months coverage

**Option A: Focus on Balance**
- Give 2 pallets to King Single (low coverage among small sizes)
- Give 3 pallets each to King/Queen
- Result: Better balance, BUT King/Queen still at 2.5 months (risky!)

**Option B: Focus on Stockout Prevention (Current Algorithm + Layer 1)**
- Skip King Single (already at 7 months)
- Give 5 pallets to Queen, 3 to King
- Result: Queen at 2.9 months (safer!), King Single still healthy

**Which is better?**
→ **Option B** - prevents stockouts on the 51% of business (Queen)

---

## Summary for Future LLMs

**When someone asks you to "optimize the algorithm"**, remember:

1. **Primary goal**: Prevent King/Queen stockouts
2. **Secondary goal**: Don't waste inventory
3. **Constraints**: Work within them (see CONSTRAINTS.md)
4. **Success**: No stockouts + efficient allocation
5. **NOT success**: Perfect balance or equal coverage

**Good optimization**: Improves stockout prevention within constraints
**Bad optimization**: Chases theoretical perfection that violates constraints or doesn't prevent stockouts

---

## Questions Future LLMs Might Have

### Q: "Why not just order a bigger container?"
A: See CONSTRAINTS.md - container size is FIXED (max 12 pallets). Can't change.

### Q: "Why not give equal coverage to all sizes?"
A: Because they sell at different rates. Equal coverage = King/Queen stockout while small sizes have 20 months excess.

### Q: "Why is variance 15 months after optimization?"
A: Because we prioritize preventing stockouts over perfect balance. Variance is not the goal.

### Q: "Shouldn't all runways deplete at the same time?"
A: Nice in theory, impossible with constraints. Plus, not the business goal. Goal is: don't stockout.

### Q: "Can I make King/Queen reach 6 months coverage?"
A: Only if you have 12-pallet containers AND small sizes don't need anything. Usually not possible with 8 pallets.

---

**Bottom Line**: Optimize for business reality (prevent stockouts), not theoretical ideals (perfect balance).

**Read this file BEFORE suggesting algorithm changes.**
