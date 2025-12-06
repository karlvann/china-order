# Order Builder - Quick Test Reference

**URL:** http://localhost:5178 (default view)

---

## Quick Smoke Test (5 minutes)

### 1. Initial Load
- [ ] App loads without errors
- [ ] Order Builder view is active (highlighted button)
- [ ] Weekly Sales shows: $58K/wk → 21 springs
- [ ] Health Alert displays (likely CRITICAL if inventory is empty)
- [ ] Pallet slider shows 8 pallets
- [ ] Spring order table shows King and Queen with quantities

### 2. Weekly Sales Selector
- [ ] Click dropdown → See 5 options ($58K to $87K)
- [ ] Select $87K/wk option
- [ ] Verify info updates: "= $4.5M/year | 135.5 springs/month"
- [ ] Spring order quantities increase

### 3. Pallet Slider
- [ ] Move slider to 4 pallets
- [ ] Verify: Total shows 480 springs
- [ ] Verify: Only King and Queen have allocations
- [ ] Verify: Double/King Single/Single show "—"
- [ ] Move slider to 12 pallets
- [ ] Verify: Total shows 1,440 springs
- [ ] Verify: All sizes now have allocations

### 4. Spring Inventory
- [ ] Click "Spring Inventory" to expand
- [ ] Enter "100" in King/Firm cell
- [ ] Verify: King total shows 100
- [ ] Verify: Spring order for King reduces
- [ ] Verify: Health Alert updates

### 5. Component Inventory
- [ ] Click "Component Inventory" (Spring Inventory auto-closes)
- [ ] Verify: Spring Inventory collapsed
- [ ] Verify: Micro Coils row has King/Queen only (others show "—")
- [ ] Verify: Felt row has all sizes
- [ ] Enter "50" in King Micro Coils
- [ ] Verify: Total column updates

### 6. Export Functions
- [ ] Click "Copy TSV" button
- [ ] Verify: Button changes to "✓ Copied!" briefly
- [ ] Paste in text editor → See tab-separated values
- [ ] Click "Download TSV" button
- [ ] Verify: File downloads as `china-order-YYYY-MM-DD.tsv`

### 7. Health Alert
- [ ] With empty inventory → See CRITICAL status (red)
- [ ] Add 300 to each King firmness → See WARNING (orange)
- [ ] Add 500+ to each firmness → See HEALTHY (green)

---

## Critical Paths to Test

### Path 1: New Order with Empty Inventory
1. Reset all inventory to 0
2. Set revenue to $3.0M/year
3. Set pallets to 8
4. **Verify:**
   - Health Alert: CRITICAL
   - King: ~354 springs
   - Queen: ~490 springs
   - Total: 960 springs
   - TSV includes both springs and components

### Path 2: Partial Inventory Scenario
1. Enter King inventory: Firm=100, Medium=150, Soft=50 (Total: 300)
2. Enter Queen inventory: Firm=150, Medium=200, Soft=75 (Total: 425)
3. Set pallets to 8
4. **Verify:**
   - Spring order adjusts (King gets ~54, Queen gets ~65)
   - Component order accounts for existing stock
   - Health Alert improves to WARNING or HEALTHY

### Path 3: High Revenue Scenario
1. Select $4.5M/year revenue
2. Set pallets to 4 (minimum)
3. **Verify:**
   - Monthly sales: 135.5 springs/month
   - Container covers ~3.5 months
   - Only King/Queen allocated
   - Health Alert shows stockout warnings

---

## Expected Values Reference

### Revenue Options
| Option | Weekly | Monthly | Annual |
|--------|--------|---------|--------|
| 1 | $58K | 90.3 springs | $3.0M |
| 2 | $65K | 113.5 springs | $3.375M |
| 3 | $72K | 113.1 springs | $3.75M |
| 4 | $79K | 124.6 springs | $4.125M |
| 5 | $87K | 135.5 springs | $4.5M |

### Pallet Configurations
| Pallets | Springs | Coverage @ $3M | Expected Allocation |
|---------|---------|----------------|---------------------|
| 4 | 480 | ~5.3 months | King + Queen only |
| 6 | 720 | ~8.0 months | King + Queen + some Double |
| 8 | 960 | ~10.6 months | All sizes |
| 10 | 1,200 | ~13.3 months | All sizes (generous) |
| 12 | 1,440 | ~15.9 months | All sizes (maximum) |

### Health Alert Thresholds
- **CRITICAL** (Red): Any size < 2.3 months (stockout before container)
- **WARNING** (Orange): Some sizes 2.3-3.0 months
- **HEALTHY** (Green): All sizes ≥ 3.0 months

### Sales Distribution (at $3M/year)
- King: 30/month (36.88%)
- Queen: 41/month (51.15%)
- Double: 6/month (6.88%)
- King Single: 3/month (3.85%)
- Single: 1/month (1.25%)

---

## Known Component Restrictions

### Micro Coils & Thin Latex
- ✅ King
- ✅ Queen
- ❌ Double (shows "—")
- ❌ King Single (shows "—")
- ❌ Single (shows "—")

### Side Panels
- ✅ King
- ✅ Queen
- ✅ Double
- ❌ King Single (uses Double panels, shows "—")
- ❌ Single (uses Double panels, shows "—")

### Felt, Top Panel, Bottom Panel
- ✅ All sizes (King through Single)

---

## Regression Tests

### After Code Changes, Verify:
1. **Calculations Still Accurate**
   - Set 8 pallets, empty inventory
   - Verify King gets ~354 springs (36.88% of 960)
   - Verify Queen gets ~490 springs (51.15% of 960)

2. **Real-time Updates**
   - Change slider → Order updates immediately
   - Change inventory → Coverage updates immediately
   - Change revenue → All calculations scale

3. **Accordion Behavior**
   - Only one section open at a time
   - Clicking same section closes it
   - Arrow icons animate correctly

4. **Export Integrity**
   - TSV includes all allocated sizes
   - Tab characters separate columns
   - No missing or duplicate rows
   - Component quantities match spring runway

---

## Bug Report Template

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Environment:**
- URL: http://localhost:5178
- Browser: [Chrome/Firefox/Safari/Edge + version]
- Date: [YYYY-MM-DD]

**Settings When Bug Occurred:**
- Revenue: [$XXK/wk]
- Pallets: [N]
- Inventory: [Empty / Partial / Full]

**Screenshots:**
[Attach if relevant]
```

---

## Performance Benchmarks

### Expected Response Times
- Slider movement → Update in < 100ms
- Inventory input → Update in < 100ms
- Revenue selection → Update in < 200ms
- Accordion expand/collapse → 200ms animation
- TSV copy → Instant
- TSV download → < 500ms

### If Performance Issues:
1. Check browser console for errors
2. Use React DevTools Profiler
3. Check for infinite render loops
4. Verify useMemo dependencies are correct

---

## Accessibility Quick Check

### Keyboard Navigation
- Tab through controls in logical order
- Slider adjustable with arrow keys
- Accordion toggles with Space/Enter
- No keyboard traps

### Color Contrast
- Health Alert red/orange/green text readable
- Input fields have visible borders
- Table text has sufficient contrast

### Screen Reader
- Buttons announce purpose
- Inputs have labels
- Table structure properly marked

---

## Common Issues & Solutions

### Issue: Health Alert always shows CRITICAL
**Cause:** Inventory is empty or very low
**Solution:** Enter realistic inventory values

### Issue: Slider doesn't update order
**Cause:** JavaScript error or state management issue
**Solution:** Check browser console for errors

### Issue: TSV copy doesn't work
**Cause:** Browser permission issue or clipboard API not available
**Solution:** Use Download TSV instead, or check browser settings

### Issue: Component table shows all "—"
**Cause:** No spring order calculated yet
**Solution:** Adjust pallet slider or check for errors

### Issue: Numbers don't add up
**Cause:** Rounding differences or algorithm change
**Solution:** Verify against expected formulas in main test report

---

**For detailed test cases, see:** `orderbuilder-test.md`
**For calculation verification, see:** `calculation-accuracy.md`
