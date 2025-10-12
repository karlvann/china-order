# Testing Queen Medium Arrival Timing

This document explains how to validate that containers arrive when Queen Medium is in the optimal range (50-70 units).

## Quick Start

### Option 1: Unit Test (Fast, No Browser)
```bash
npm test queenMediumArrivalTiming
```

**Pros:**
- ✅ Fast (runs in < 1 second)
- ✅ No browser required
- ✅ Tests the algorithm directly
- ✅ Can run in CI/CD

**Cons:**
- ❌ Doesn't test the actual UI

### Option 2: Playwright E2E Test (Full Integration)
```bash
npx playwright test validateQueenMediumTiming --reporter=list
```

**Pros:**
- ✅ Tests the actual rendered UI
- ✅ Validates what users see
- ✅ Full end-to-end validation

**Cons:**
- ❌ Slower (requires browser)
- ❌ Requires dev server running

## Understanding the Tests

### What They Check

Both tests validate that containers are ordered so they arrive when Queen Medium inventory is between **50-70 units**.

**Why 50-70?**
- Queen Medium is 51% of your business (highest velocity item)
- Below 50: Risk of stockout before next container
- Above 70: Wasteful inventory (tied up capital)
- Target: 60 units (optimal buffer)

### Test Output

#### ✅ Good Result
```
✅ Container 2: QM at arrival = 57 (GOOD)
✅ Container 3: QM at arrival = 63 (GOOD)
✅ Container 4: QM at arrival = 55 (GOOD)

📊 SUMMARY
Total containers:     8
In target range:      6/8 (75%)
```

#### ❌ Bad Result
```
❌ Container 3: QM at arrival = 12 (TOO LOW - should be 50-70)
❌ Container 4: QM at arrival = 0 (TOO LOW - should be 50-70)

📊 SUMMARY
Total containers:     8
In target range:      1/8 (12.5%)
```

## Running the Tests

### Unit Test (Recommended for Quick Validation)

```bash
# Run just the timing test
npm test queenMediumArrivalTiming

# Run with watch mode (auto-reruns on changes)
npm test queenMediumArrivalTiming -- --watch

# Run all integration tests
npm test tests/integration
```

### Playwright Test

```bash
# Run the timing validation test
npx playwright test validateQueenMediumTiming --reporter=list

# Run with headed browser (see what's happening)
npx playwright test validateQueenMediumTiming --headed

# Run all e2e tests
npx playwright test --reporter=list
```

## Interpreting Results

### Starting with Zero Inventory

If you start with **zero inventory** (default for new app), the first few containers will naturally arrive when QM is low:

```
❌ Container 1: QM at arrival = 41 (TOO LOW)
✅ Container 2: QM at arrival = 57 (GOOD)      ← System catches up here!
❌ Container 3: QM at arrival = 0 (TOO LOW)
```

**This is expected!** The algorithm is "catching up" from having nothing.

### With Realistic Starting Inventory

Once you enter realistic inventory in the Order Builder, results improve:

```
✅ Container 1: QM at arrival = 62 (GOOD)
✅ Container 2: QM at arrival = 58 (GOOD)
✅ Container 3: QM at arrival = 65 (GOOD)

Success rate: 100%  ← Much better!
```

## What's Being Tested on the Frontend

The Playwright test reads data from the **Forecast V2** view:

### What It Checks

1. **Navigates to app** → `http://localhost:5174`
2. **Clicks "Forecast V2" tab**
3. **Finds Queen Medium row** (Row 7 in the timeline table)
4. **Extracts all cell values** (weeks 1-52)
5. **Identifies container arrivals** (cells with "+X" notation like "57+51")
6. **Validates QM at arrival** (checks if value is between 50-70)

### Visual Example

```
Queen Medium Timeline:
Week:  1    2    3   ... 10   11   12   ...
Value: 0   -8  -16  ... -79  41+126  39  ...
                           ↑
                    Container arrives
                    QM = 41 (TOO LOW)
```

### DOM Structure

The test reads from this HTML structure:
```html
<tr>
  <td>Queen</td>
  <!-- Week 1 -->
  <td>0</td>
  <!-- Week 2 -->
  <td>-8</td>
  <!-- ... -->
  <!-- Week 14: Container arrival -->
  <td>41+126</td>  ← Looks for this pattern
</tr>
```

## Success Criteria

### Unit Test
- ✅ At least 1 container in target range
- ✅ Success rate ≥ 60% (with healthy starting inventory)

### Playwright Test
- ✅ At least 1 container in target range
- ✅ Success rate ≥ 50% (lenient for zero inventory)

## Troubleshooting

### Test Fails: "Only 12.5% in target range"

**Solution:** Enter realistic starting inventory in the Order Builder view.

### Playwright Test Fails: "Queen Medium row not found"

**Solution:** Make sure dev server is running (`npm run dev`) and navigate to Forecast V2 view.

### Unit Test Fails: Module not found

**Solution:** Run `npm install` to ensure all dependencies are installed.

## Adding to CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run timing validation
  run: npm test queenMediumArrivalTiming
```

The unit test is fast and doesn't require a browser, making it ideal for CI/CD.
