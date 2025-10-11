# Sample Inventory Data

Three realistic inventory scenarios for testing and demonstration purposes.

## Files

### 1. `sample-data-low-stock.json`
**Scenario:** Critical inventory levels (1-2 months coverage)

**Coverage:**
- King: ~2 months (60 total springs)
- Queen: ~2 months (78 total springs)
- Double: ~2 months (12 total springs)
- King Single: ~2 months (6 total springs)
- Single: ~2 months (2 total springs)

**Expected Behavior:**
- System will prioritize King/Queen (critical stockout risk)
- Most pallets allocated to high-velocity sizes
- Urgent reordering recommended

---

### 2. `sample-data-medium-stock.json`
**Scenario:** Healthy inventory levels (4-5 months coverage)

**Coverage:**
- King: ~5 months (150 total springs)
- Queen: ~5 months (205 total springs)
- Double: ~5.5 months (33 total springs)
- King Single: ~5.3 months (16 total springs)
- Single: ~6 months (6 total springs)

**Expected Behavior:**
- System will balance coverage across sizes
- Normal pallet allocation strategy
- Good time for routine reordering

---

### 3. `sample-data-high-stock.json`
**Scenario:** Well-stocked inventory (7-8 months coverage)

**Coverage:**
- King: ~8 months (240 total springs)
- Queen: ~8 months (328 total springs)
- Double: ~8.7 months (52 total springs)
- King Single: ~8.7 months (26 total springs)
- Single: ~9 months (9 total springs)

**Expected Behavior:**
- Some small sizes may not need reordering (N+0 strategy)
- Conservative pallet allocation
- Focus on maintaining King/Queen stock only

---

## How to Use

### Option 1: Manual Copy-Paste
1. Open one of the sample JSON files
2. Copy the `springs` and `components` data
3. Paste values into the inventory tables in the app

### Option 2: Via Save/Load Feature
1. Click "Save/Load" in the app header
2. Choose a save slot
3. Paste the entire JSON content
4. Click "Load"

---

## Data Notes

### Firmness Distribution
- **King/Queen**: 83% Medium, 13% Firm, 4% Soft (reflects actual sales)
- **Small sizes**: More balanced distribution

### Component Calculations
- **Micro Coils & Thin Latex**: King/Queen only, 1.5× spring quantity
- **Felt & Panels**: All sizes, 1.0× spring quantity
- **Side Panels**: Single/King Single consolidated into Double orders

### Monthly Sales Rates (for reference)
- King: 30 units/month (36.88% of sales)
- Queen: 41 units/month (51.15% of sales)
- Double: 6 units/month (6.88% of sales)
- King Single: 3 units/month (3.85% of sales)
- Single: 1 unit/month (1.25% of sales)

---

## Testing Scenarios

### Low Stock Sample → Test:
- Critical size detection works correctly
- System prioritizes King/Queen allocation
- Warning alerts display for low coverage
- N+1 or N+2 strategy triggers appropriately

### Medium Stock Sample → Test:
- Balanced pallet allocation across sizes
- Coverage calculations are accurate
- Normal ordering workflow

### High Stock Sample → Test:
- N+0 strategy (skipping well-stocked sizes)
- System doesn't waste pallets on healthy inventory
- King/Queen still get pallets despite good coverage
