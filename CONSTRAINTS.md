# FIXED BUSINESS CONSTRAINTS

**Last Updated**: 2025-10-10

## For Future LLMs/Developers

This file documents the **UNCHANGEABLE** constraints of this mattress ordering system. These are driven by:
- Supplier requirements
- Shipping/logistics limitations
- Business cash flow constraints
- Physical warehouse limitations

**DO NOT suggest changing these.** All improvements must work within these bounds.

---

## Physical Constraints (Cannot Change)

### Pallet Size
- **Value**: 30 springs per pallet
- **Why Fixed**: Supplier standard, warehouse equipment sized for this
- **Cannot**: Use 20, 40, or variable pallet sizes

### Container Capacity
- **Value**: 4-12 pallets per container
- **Why Fixed**: Shipping container standard sizes
- **Cannot**: Order 3 pallets or 15 pallets

### Pallet Composition
- **Value**: Each pallet = single size only (no mixing)
- **Why Fixed**: Supplier packing requirement
- **Cannot**: Mix Double + Single on one pallet

---

## Time Constraints (Cannot Change)

### Lead Time
- **Value**: 10 weeks from order to arrival
- **Why Fixed**: International shipping time
- **Cannot**: Rush order or change supplier location

### Order Frequency
- **Value**: Driven by lead time and cash flow
- **Why Fixed**: Can't afford to order more frequently
- **Cannot**: Order every 2 weeks instead of every 10 weeks

---

## Supplier Constraints (Cannot Change)

### Component Lot Sizes
- **Micro Coils, Bottom/Side Panels**: Lot of 20
- **Thin Latex, Felt, Top Panels**: Lot of 10
- **Why Fixed**: Supplier minimum order quantities
- **Cannot**: Negotiate different lot sizes or order 15 units

### Size Consolidation Rules
- **Micro Coils/Thin Latex**: King/Queen only (supplier doesn't make for small sizes)
- **Side Panels**: Single/King Single use Double size (supplier consolidation)
- **Cannot**: Order micro coils for Single size

---

## Algorithm Constraints (Must Respect)

### Whole Pallet Allocation
- **Small sizes can only get**: 0, 1, or 2 whole pallets
- **Why**: Cannot split pallets between sizes
- **Cannot**: Give 0.5 pallets or 15 springs to a size

### Total Capacity
- **With 8 pallets**: 240 total springs available
- **If King needs 160 + Queen needs 140**: Cannot satisfy both (only 240 total)
- **This is reality**: Sometimes perfect balance is mathematically impossible

---

## What You CAN Change

✅ **Allocation Logic**
- Which sizes get pallets
- Coverage thresholds (e.g., skip if >4 months)
- Priority rules (emergency allocation)

✅ **Calculation Methods**
- Dynamic targets (different goals per size)
- Need-based vs ratio-based distribution
- Optimization algorithms

✅ **UI/UX**
- Warnings and indicators
- Visualization of runways
- Export formats

❌ **What You CANNOT Change**
- Pallet size (30)
- Container capacity (4-12)
- Lead time (10 weeks)
- Lot sizes (10 or 20)
- Pallet mixing (not allowed)
- Order frequency (driven by cash flow)

---

## Common Suggestions to AVOID

Future LLMs often suggest these. **DO NOT**:

1. ❌ "Use larger containers (15 pallets)"
   - Container is maxed at 12 pallets (shipping constraint)

2. ❌ "Mix small sizes on one pallet (15 Double + 15 Single)"
   - Supplier requires single-size pallets only

3. ❌ "Order more frequently"
   - 10-week lead time is fixed, cash flow won't support more frequent orders

4. ❌ "Negotiate different lot sizes with supplier"
   - Lot sizes are supplier standard, non-negotiable

5. ❌ "Use fractional pallets (give 15 springs to King Single)"
   - Must be whole pallets of 30

6. ❌ "Rush the container or use air freight"
   - Not economically viable, 10 weeks is the reality

---

## The Bottom Line

**Work smarter with what we have, not by changing what we have.**

Constraints are constraints. Good algorithms work within them, not around them.
