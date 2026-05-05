# FIXED BUSINESS CONSTRAINTS

**Last updated**: 2026-05-05

This file documents the constraints the ordering logic must work within. These are driven by supplier requirements, logistics, cash flow, and warehouse realities.

---

## Physical constraints

### Pallet size
- **Value**: Exactly 30 springs per pallet
- **Why fixed**: Supplier packing standard and warehouse handling
- **Cannot**: Use 20, 40, or variable spring pallet sizes

### Container capacity
- **Value**: 1-12 pallets per container/order
- **Range rule**: User chooses the order size within this range
- **Cannot**: Allocate more pallets than the selected container/order size
- **Important**: If the user selects 8 pallets, the spring algorithm should allocate all 8 pallets unless there is genuinely no demand

### Pallet composition
- **Value**: Each spring pallet must be a single mattress size
- **Allowed**: Firmnesses can be mixed within that size pallet
- **Cannot**: Mix mattress sizes on one pallet, e.g. 15 Double + 15 Single

---

## Timing constraints

### Lead time
- **Default**: 10 weeks for China springs/components
- **User-adjustable**: Yes, because real lead times vary by order, season, supplier timing, and shipping conditions
- **Applies to**: Both spring and component coverage calculations
- **Cannot**: Assume rush freight or a different logistics model unless the business explicitly requests it

### Order frequency
- **Value**: Business/cash-flow driven
- **Cannot**: Solve allocation problems by assuming much more frequent ordering unless explicitly requested

---

## Supplier constraints

### Component lot sizes
- **Micro Coils, Bottom Panels, Side Panels**: Lot size 20
- **Thin Latex, Felt, Top Panels**: Lot size 10
- **Why fixed**: Supplier minimum/order multiple requirements
- **Cannot**: Order arbitrary export quantities like 15 units in optimized supplier exports

### Size consolidation rules
- **Micro Coils / Thin Latex**: King and Queen only
- **Side Panels**: Single and King Single are consolidated into Double side panel orders
- **Cannot**: Order separate micro coils/thin latex for small sizes

---

## Algorithm constraints

### Whole pallet allocation by size
- Pallets are allocated as whole 30-spring units to a single size.
- Any size can receive 0 or more whole pallets depending on demand/coverage urgency.
- There is no fixed cap of 1 or 2 pallets for small sizes; allocation is demand-based.

### Total capacity
- With 8 pallets, only 240 springs are available.
- If projected demand/coverage gaps require more than 240 springs, the algorithm must prioritise rather than chase perfect balance.

---

## What you can change

✅ **Allocation logic**
- Which sizes get pallets
- Priority rules
- Coverage targets
- Urgency calculations
- Firmness distribution within each size pallet

✅ **Calculation methods**
- Demand-based allocation improvements
- Dynamic targets
- Pending order handling
- Forecasting assumptions

✅ **UI/UX**
- Warnings and indicators
- Timeline/coverage visualisation
- Export formats

---

## What you cannot change without business approval

❌ Pallet size of 30 springs  
❌ Single-size spring pallets  
❌ Supplier component lot sizes  
❌ Component consolidation rules  
❌ Maximum 12 spring pallets per order/container  
❌ Solving problems by assuming rush freight or unrealistic ordering frequency

---

## Common suggestions to avoid

1. ❌ "Use larger containers, e.g. 15 pallets"
   - Maximum is 12 pallets.

2. ❌ "Mix small sizes on one pallet"
   - Spring pallets must be single-size.

3. ❌ "Use fractional pallets"
   - Spring allocation is in whole 30-spring pallets by size.

4. ❌ "Negotiate different component lot sizes"
   - Lot sizes are supplier requirements.

5. ❌ "Rush every order or use air freight"
   - Lead time can vary, but the algorithm should not rely on unrealistic logistics.

---

## Bottom line

Work smarter within the real supplier/logistics constraints. The ordering logic should prioritise demand and stockout risk, not theoretical perfect balance.
