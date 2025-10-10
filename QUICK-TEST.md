# ⚡ QUICK TEST - Layer 1 Coverage Threshold

**Takes 2 minutes** - Follow these steps to verify Layer 1 is working!

---

## Step 1: Load Test Scenario (30 seconds)

1. **Open**: http://localhost:5176/test-scenarios.html
2. **Click**: "Scenario A: Mid-Season Crisis" card
3. **See**: Success message "Scenario A loaded into Slot 1"

---

## Step 2: Load into App (30 seconds)

1. **Open**: http://localhost:5176
2. **Click**: "💾 Save/Load" button (top right)
3. **Click**: "Load" button on Slot 1
4. **Close** the modal

---

## Step 3: Check Order Builder Tab (30 seconds)

**Go to**: "Order Builder" tab

### ✅ What You Should See:

**Green Success Card** (NEW!):
```
✅ Healthy Small Size - Skipped

King Single has healthy coverage (>4 months) -
reallocated 1 pallet to King/Queen instead

Prevents wasting pallets on sizes that don't need
immediate restocking
```

**Pallet Breakdown Section**:
- Should show **0 pallets** to King Single
- Should show **5 pallets** to Queen (not 4!)
- Should show **3 pallets** to King

**Summary Statistics**:
- Total Springs: 240 ✅
- Total Pallets: 8 ✅

### ❌ What You Should NOT See:

- ❌ Red "Critical Small Size" card for King Single
- ❌ Any pallets allocated to King Single
- ❌ Only 4 pallets to Queen

---

## Step 4: Check Inventory Runway Tab (30 seconds)

**Go to**: "Inventory Runway" tab

Look at the **Month 3** column (blue - when container arrives):

### Queen Medium Row:

**BEFORE Layer 1**: ~2.07 months (red/critical)
**AFTER Layer 1**: ~**2.9 months** (still yellow but improved!)

**Look for**: Number should be higher than 2.07

### King Single Medium Row:

**BEFORE Layer 1**: ~14.69 months (way over-supplied)
**AFTER Layer 1**: ~**3.4 months** (balanced!)

**Look for**: Number should be much lower (not 14+)

---

## ✅ PASS/FAIL Criteria

### ✅ PASS if you see:

1. Green card: "Healthy Small Size - Skipped: King Single"
2. 0 pallets to King Single in pallet breakdown
3. 5 pallets to Queen (gained 1 from King Single)
4. Queen Medium coverage improved (higher than 2.07)
5. King Single Medium coverage reduced (lower than 14.69)

### ❌ FAIL if you see:

1. Red card: "Critical Small Size: King Single"
2. 1 pallet allocated to King Single
3. Only 4 pallets to Queen (no improvement)
4. Queen Medium still at ~2.07 months
5. King Single Medium still at ~14.69 months

---

## 📊 Expected Numbers (Approximate)

| Item | Before Layer 1 | After Layer 1 | Change |
|------|---------------|---------------|--------|
| **Queen Pallets** | 4 | **5** | +1 ⬆️ |
| **King Single Pallets** | 1 | **0** | -1 ⬇️ |
| **Queen Medium Coverage** | 2.07 mo | **~2.9 mo** | +40% ⬆️ |
| **King Single Medium** | 14.69 mo | **~3.4 mo** | -77% ⬇️ |
| **Stockout Risk (Queen)** | HIGH | MEDIUM | ✅ |

---

## 🎯 What This Proves

If you see the green card and improved Queen coverage:

✅ **Layer 1 is working!**
- Skips healthy small sizes (>4 months)
- Reallocates pallets to King/Queen
- Reduces stockout risk on high-velocity items
- Improves capital efficiency (no wasted inventory)

---

## 🚀 Quick Browser Test NOW

```
1. http://localhost:5176/test-scenarios.html
2. Click "Scenario A"
3. http://localhost:5176
4. Load Slot 1
5. Order Builder tab → Look for green card ✅
6. Runway tab → Check Month 3 for Queen Medium
```

**Total time**: 2 minutes

**Result**: You'll see the stockout prevention in action! 🎉

---

## 🐛 Troubleshooting

**Problem**: Still see red "Critical" card for King Single

**Solution**:
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Reload the page
- Make sure Scenario A is loaded (King Single = 7.33 months)

**Problem**: Don't see green "Skipped" card

**Solution**:
- Check that Layer 1 code is deployed (check BashOutput for HMR update)
- Reload the app page
- Try loading Scenario A again

---

## 💬 What to Report

After testing, report:

1. **Did you see the green card?** Yes/No
2. **How many pallets to Queen?** (Should be 5)
3. **How many pallets to King Single?** (Should be 0)
4. **Queen Medium coverage at Month 3?** (Should be ~2.9)
5. **Did stockout risk improve?** Yes/No

---

**Ready? Test now! Takes only 2 minutes!** ⚡
