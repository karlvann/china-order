# Mattress Order System - Algorithm Verification & Testing

**Date**: 2025-10-10
**Purpose**: Verify all algorithms work correctly and inventory runways are balanced after ordering

---

## 1. Test Data Analysis

### Test Scenario: "January 2025 - Mid Season"
**Situation**: 6 months since last container. King/Queen Medium critically low (<2 months). Small sizes have good coverage.

### Starting Spring Inventory

| Size | Firm | Medium | Soft | **Total** |
|------|------|--------|------|-----------|
| King | 25 | 45 | 8 | **78** |
| Queen | 30 | 60 | 12 | **102** |
| Double | 18 | 28 | 8 | **54** |
| King Single | 6 | 12 | 4 | **22** |
| Single | 3 | 4 | 2 | **9** |

### Business Constants

**Monthly Sales Rates** (based on 960 units/year actual sales data):
- King: 30/month (36.88% of total)
- Queen: 41/month (51.15% of total)
- Double: 6/month (6.88% of total)
- King Single: 3/month (3.85% of total)
- Single: 1/month (1.25% of total)

**Firmness Distribution** (actual sales patterns):

| Size | Firm | Medium | Soft |
|------|------|--------|------|
| King | 13.56% | **84.46%** | 1.98% |
| Queen | 13.44% | **82.69%** | 3.87% |
| Double | 21.21% | 60.61% | 18.18% |
| King Single | 16.22% | 62.16% | 21.62% |
| Single | 25.00% | 58.33% | 16.67% |

---

## 2. Algorithm 1: Coverage Calculation

**Formula**: `Coverage (months) = Total Stock / Monthly Sales Rate`

### Total Coverage by Size

| Size | Current Stock | Monthly Sales | Coverage (months) | Status |
|------|--------------|---------------|-------------------|--------|
| King | 78 | 30 | **2.60** | 🔴 Critical |
| Queen | 102 | 41 | **2.49** | 🔴 Critical |
| Double | 54 | 6 | **9.00** | 🟢 Healthy |
| King Single | 22 | 3 | **7.33** | 🟢 Healthy |
| Single | 9 | 1 | **9.00** | 🟢 Healthy |

**Analysis**: King and Queen are critically low (under 3 months). Small sizes have plenty of coverage.

### Medium Firmness Coverage (for critical size detection)

**Formula**: `Medium Coverage = Medium Stock / (Monthly Sales × Medium %)`

| Size | Medium Stock | Medium Monthly Depletion | Medium Coverage | Rank |
|------|-------------|-------------------------|-----------------|------|
| King | 45 | 30 × 0.8446 = 25.338 | **1.78 months** | 🔴 Lowest overall |
| Queen | 60 | 41 × 0.8269 = 33.903 | **1.77 months** | 🔴 Lowest overall |
| **Double** | 28 | 6 × 0.6061 = 3.637 | **7.70 months** | 🟢 (small size) |
| **King Single** | 12 | 3 × 0.6216 = 1.865 | **6.43 months** | ⚠️ **Critical small size** |
| **Single** | 4 | 1 × 0.5833 = 0.583 | **6.86 months** | 🟢 (small size) |

**Critical Small Size**: King Single (6.43 months medium coverage - lowest among small sizes)

---

## 3. Algorithm 2: N+1 Strategy (8 Pallets)

**Container Configuration**: 8 pallets × 30 springs = **240 total springs**

### Step 1: Allocate to Critical Small Size
- **Critical small size**: King Single (6.43 months medium coverage)
- **Allocation**: 1 pallet (30 springs) to King Single
- **Remaining**: 7 pallets (210 springs) for King/Queen

### Step 2: King vs Queen Split
- King coverage: 2.60 months
- Queen coverage: 2.49 months
- **Queen is lower** → Queen gets 60%, King gets 40%

**Allocation**:
- Queen: 60% of 7 pallets = 4.2 → **4 pallets** (120 springs)
- King: 40% of 7 pallets = 2.8 → **3 pallets** (90 springs)

### Pallet Summary
| Size | Pallets | Springs | Percentage |
|------|---------|---------|------------|
| King Single | 1 | 30 | 12.5% |
| Queen | 4 | 120 | 50.0% |
| King | 3 | 90 | 37.5% |
| **TOTAL** | **8** | **240** | **100%** |

---

## 4. Algorithm 3: Dynamic Firmness Allocation

**Key Innovation**: Springs are distributed based on **individual firmness needs**, not fixed ratios.

**Formula**:
```
Target Stock = 8 months × Monthly Depletion for firmness
Need = max(0, Target Stock - Current Stock)
Allocation = (Need / Total Need) × Total Springs for size
```

### King Single (30 springs)

**Monthly Depletion by Firmness**:
- Firm: 3 × 0.1622 = 0.487/month
- Medium: 3 × 0.6216 = 1.865/month
- Soft: 3 × 0.2162 = 0.649/month

**Calculation**:
| Firmness | Current Stock | Target (8mo) | Need | Proportion | Allocation |
|----------|--------------|--------------|------|------------|------------|
| Firm | 6 | 0.487 × 8 = 3.90 | max(0, 3.90 - 6) = **0** | 0 / 4.11 | **0** |
| Medium | 12 | 1.865 × 8 = 14.92 | 14.92 - 12 = **2.92** | 2.92 / 4.11 | **21** |
| Soft | 4 | 0.649 × 8 = 5.19 | 5.19 - 4 = **1.19** | 1.19 / 4.11 | **9** |
| **Total** | **22** | - | **4.11** | - | **30** ✓ |

**After Container Arrival**:
- Firm: 6 + 0 = **6 springs** (12.3 months coverage)
- Medium: 12 + 21 = **33 springs** (17.7 months coverage)
- Soft: 4 + 9 = **13 springs** (20.0 months coverage)

### King (90 springs)

**Monthly Depletion by Firmness**:
- Firm: 30 × 0.1356 = 4.068/month
- Medium: 30 × 0.8446 = 25.338/month
- Soft: 30 × 0.0198 = 0.594/month

**Calculation**:
| Firmness | Current Stock | Target (8mo) | Need | Proportion | Allocation |
|----------|--------------|--------------|------|------------|------------|
| Firm | 25 | 4.068 × 8 = 32.54 | 32.54 - 25 = **7.54** | 7.54 / 165.24 | **4** |
| Medium | 45 | 25.338 × 8 = 202.70 | 202.70 - 45 = **157.70** | 157.70 / 165.24 | **86** |
| Soft | 8 | 0.594 × 8 = 4.75 | max(0, 4.75 - 8) = **0** | 0 / 165.24 | **0** |
| **Total** | **78** | - | **165.24** | - | **90** ✓ |

**After Container Arrival**:
- Firm: 25 + 4 = **29 springs** (7.13 months coverage)
- Medium: 45 + 86 = **131 springs** (5.17 months coverage)
- Soft: 8 + 0 = **8 springs** (13.47 months coverage)

### Queen (120 springs)

**Monthly Depletion by Firmness**:
- Firm: 41 × 0.1344 = 5.510/month
- Medium: 41 × 0.8269 = 33.903/month
- Soft: 41 × 0.0387 = 1.587/month

**Calculation**:
| Firmness | Current Stock | Target (8mo) | Need | Proportion | Allocation |
|----------|--------------|--------------|------|------------|------------|
| Firm | 30 | 5.510 × 8 = 44.08 | 44.08 - 30 = **14.08** | 14.08 / 226.00 | **7** |
| Medium | 60 | 33.903 × 8 = 271.22 | 271.22 - 60 = **211.22** | 211.22 / 226.00 | **112** |
| Soft | 12 | 1.587 × 8 = 12.70 | 12.70 - 12 = **0.70** | 0.70 / 226.00 | **1** |
| **Total** | **102** | - | **226.00** | - | **120** ✓ |

**After Container Arrival**:
- Firm: 30 + 7 = **37 springs** (6.71 months coverage)
- Medium: 60 + 112 = **172 springs** (5.07 months coverage)
- Soft: 12 + 1 = **13 springs** (8.19 months coverage)

---

## 5. Runway Balance Analysis

### Coverage Before Container (Month 0)

| Size / Firmness | Current Stock | Coverage (months) | Status |
|----------------|---------------|-------------------|--------|
| King Firm | 25 | 6.15 | 🟡 |
| King Medium | 45 | 1.78 | 🔴 CRITICAL |
| King Soft | 8 | 13.47 | 🟢 |
| Queen Firm | 30 | 5.45 | 🟡 |
| Queen Medium | 60 | 1.77 | 🔴 CRITICAL |
| Queen Soft | 12 | 7.56 | 🟡 |
| Double Firm | 18 | 14.14 | 🟢 |
| Double Medium | 28 | 7.70 | 🟢 |
| Double Soft | 8 | 7.33 | 🟢 |
| King Single Firm | 6 | 12.33 | 🟢 |
| King Single Medium | 12 | 6.43 | 🟡 |
| King Single Soft | 4 | 6.16 | 🟡 |
| Single Firm | 3 | 12.00 | 🟢 |
| Single Medium | 4 | 6.86 | 🟡 |
| Single Soft | 2 | 12.00 | 🟢 |

**Variance**: 1.77 months (Queen Medium) to 14.14 months (Double Firm) = **12.37 months spread** 🔴

### Coverage After Container Arrival (Month 3)

**Note**: After 3 months of depletion at average rates, then container arrives.

| Size / Firmness | Stock After 3mo | + Container | Final Stock | Coverage (months) | Status |
|----------------|-----------------|-------------|-------------|-------------------|--------|
| King Firm | 12.8 | 4 | 16.8 | 4.13 | 🟡 |
| King Medium | -31.0 | 86 | 55.0 | 2.17 | 🔴 |
| King Soft | 6.2 | 0 | 6.2 | 10.44 | 🟢 |
| Queen Firm | 13.5 | 7 | 20.5 | 3.72 | 🟡 |
| Queen Medium | -41.7 | 112 | 70.3 | 2.07 | 🔴 |
| Queen Soft | 7.2 | 1 | 8.2 | 5.17 | 🟡 |
| Double Firm | 14.2 | 0 | 14.2 | 11.14 | 🟢 |
| Double Medium | 17.1 | 0 | 17.1 | 4.70 | 🟡 |
| Double Soft | 4.7 | 0 | 4.7 | 4.30 | 🟡 |
| King Single Firm | 4.5 | 0 | 4.5 | 9.24 | 🟢 |
| King Single Medium | 6.4 | 21 | 27.4 | 14.69 | 🟢 |
| King Single Soft | 2.1 | 9 | 11.1 | 17.09 | 🟢 |
| Single Firm | 2.3 | 0 | 2.3 | 9.00 | 🟢 |
| Single Medium | 2.3 | 0 | 2.3 | 3.86 | 🟡 |
| Single Soft | 1.5 | 0 | 1.5 | 9.00 | 🟢 |

**Variance**: 2.07 months (Queen Medium) to 17.09 months (King Single Soft) = **15.02 months spread** 🔴

---

## 6. Key Findings

### ✅ Algorithms Working Correctly
1. **Coverage Calculation**: Correctly identifies critical sizes (King/Queen at ~2.5 months)
2. **Critical Size Detection**: Correctly identifies King Single as critical small size (6.43 months medium coverage)
3. **N+1 Allocation**: Correctly allocates 1 pallet to critical, splits remaining 60/40 based on coverage
4. **Dynamic Firmness**: Allocates springs based on individual need, not fixed ratios

### ⚠️ Runway Balance Issues Identified

**PROBLEM**: The runway is **NOT balanced** after container arrival. Variance actually **increases** from 12.37 to 15.02 months!

**Root Causes**:
1. **Constraint-driven imbalance**: Small sizes (Double/Single) get 0 pallets, so their low-coverage firmnesses don't improve
2. **Medium-centric allocation**: King/Queen get massive medium allocations (86 and 112 springs), but their coverage is still only ~2 months
3. **Soft firmness neglected**: King Soft gets 0 springs despite being at 13.47 months already (algorithm correctly skips it due to no need)
4. **King Single over-ordered**: Gets 30 springs but only needs 4.11 total need - results in 17+ months coverage for soft

### 💡 Observations

**The algorithm is working AS DESIGNED, but the design goal conflicts with reality**:
- The "8 months target coverage" is being used for need calculation
- But King/Queen have such high sales (30 and 41/month) that even 86-112 springs only provides ~2-5 months
- Small sizes have low sales (1-6/month) so 30 springs provides 15-20 months
- **The algorithm prioritizes addressing the largest needs**, not balancing final coverage

**Is this correct behavior?**
- ✅ **YES** if the goal is: "Give more inventory to sizes that are critically low"
- ❌ **NO** if the goal is: "Balance all runways to deplete at the same time"

---

## 7. Next Steps

1. ✅ Verify calculations in live app
2. ⚠️ Test additional scenarios to confirm pattern
3. 💡 Consider algorithm modifications if true balance is desired
4. 📊 Document whether current behavior matches business requirements
