# China Order - Test Reports

This directory contains comprehensive test documentation for the China Order (Spring Order) application.

---

## Test Reports Overview

### 1. orderbuilder-test.md (Primary Report)
**Size:** 840 lines | 25KB
**Test Date:** 2025-12-06
**Coverage:** Order Builder View

**Contents:**
- 70 detailed test cases across 12 categories
- Test objectives and expected results
- Code references and algorithm verification
- Sample test data and edge cases
- Accessibility and performance testing
- Test summary with pass/fail metrics

**Use this for:**
- Comprehensive test planning
- QA validation checklists
- Regression testing
- Feature verification
- Bug investigation

### 2. orderbuilder-quick-reference.md (Quick Guide)
**Size:** 270 lines | 7.2KB
**Purpose:** Rapid manual testing guide

**Contents:**
- 5-minute smoke test checklist
- Critical user paths
- Expected values reference tables
- Bug report template
- Common issues and solutions
- Performance benchmarks

**Use this for:**
- Quick smoke tests before deployment
- Manual testing sessions
- Developer quick checks
- Demo preparation
- Issue reproduction

### 3. calculation-accuracy.md (Math Verification)
**Size:** 360 lines | 11KB
**Purpose:** Verify calculation correctness

**Contents:**
- Revenue scaling formulas
- Pallet allocation math
- Coverage calculations
- Component order algorithms
- Sample calculations with verification

**Use this for:**
- Algorithm validation
- Mathematical correctness
- Formula documentation
- Debugging calculation issues

---

## Test Status Summary

### ✅ Verified by Code Review (53 tests)
- Weekly Sales Selector (6 tests)
- Pallet Slider (6 tests)
- Spring Order Table (6 tests)
- Spring Inventory Section (7 tests)
- Component Inventory Section (9 tests)
- Export Functions (6 tests)
- Health Alert (7 tests)
- Accordion Behavior (6 tests)

### ⚠️ Requires Manual Testing (17 tests)
- Integration Scenarios (5 tests)
- Performance Testing (4 tests)
- Cross-Browser Compatibility (5 tests)
- Accessibility (3 tests)

**Overall Progress:** 76% verified through static analysis

---

## Quick Start - How to Use These Reports

### For QA Engineers:
1. Start with `orderbuilder-quick-reference.md` for smoke testing
2. Use `orderbuilder-test.md` for comprehensive test execution
3. Reference `calculation-accuracy.md` when numbers don't match expectations

### For Developers:
1. Use `orderbuilder-quick-reference.md` for quick regression checks
2. Consult `orderbuilder-test.md` when implementing new features
3. Verify formulas against `calculation-accuracy.md`

### For Product Managers:
1. Review test coverage in `orderbuilder-test.md` (section headers)
2. Check expected values in `orderbuilder-quick-reference.md`
3. Understand business logic in `calculation-accuracy.md`

---

## Test Environment

**Application URL:** http://localhost:5178
**Default View:** Order Builder (tested view)
**Other Views:** Forecast 1, Forecast 2 (not covered in this report)

### Prerequisites:
- Node.js and npm installed
- Application running on port 5178
- Modern browser (Chrome, Firefox, Safari, or Edge)

### To Start Testing:
```bash
cd /Users/karl-claude/Desktop/repos/china-order
npm install
npm run dev
# Navigate to http://localhost:5178
```

---

## Key Features Tested

### 1. Weekly Sales Selector
- 5 revenue options ($3M to $4.5M annually)
- Real-time scaling of all calculations
- Accurate monthly/yearly projections

### 2. Pallet Slider
- Range: 4-12 pallets (480-1,440 springs)
- King/Queen First allocation algorithm
- Real-time order updates

### 3. Spring Order Table
- Displays quantities per size
- Shows pallet allocation
- Handles zero allocations gracefully

### 4. Spring Inventory
- 5 mattress sizes × 3 firmness levels
- Row totals auto-calculate
- Real-time order adjustment

### 5. Component Inventory
- 6 component types
- Size-specific restrictions (Micro Coils, Side Panels)
- Runway validation

### 6. Health Alert
- 3 status levels (Healthy/Warning/Critical)
- Coverage badges per size
- Lead time awareness (10 weeks)

### 7. Export Functions
- Copy TSV to clipboard
- Download TSV file
- Optimized component quantities

---

## Test Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Test Cases | 70 | - |
| Code Review Verified | 53 (76%) | ✅ |
| Manual Testing Required | 17 (24%) | ⚠️ |
| Lines of Test Documentation | 1,470 | - |
| Components Tested | 8 | ✅ |
| Algorithms Verified | 5 | ✅ |
| Edge Cases Documented | 15+ | ✅ |

---

## Known Limitations

### Not Tested in This Report:
- Save/Load modal functionality
- Forecast 1 view
- Forecast 2 view
- Calendar view
- Multi-container projections
- Backend API integration (if any)

### Recommended Additional Testing:
1. End-to-end browser automation (Playwright/Cypress)
2. Visual regression testing
3. Load/stress testing
4. Mobile responsiveness
5. Network failure scenarios

---

## Bug Tracking

### To Report a Bug:
1. Use the bug template in `orderbuilder-quick-reference.md`
2. Include reproduction steps
3. Attach screenshots if visual issue
4. Note environment details (browser, settings)

### Common Issues:
See "Common Issues & Solutions" section in `orderbuilder-quick-reference.md`

---

## Continuous Testing

### Before Each Release:
- [ ] Run 5-minute smoke test
- [ ] Verify critical paths (3 scenarios)
- [ ] Test export functions
- [ ] Check Health Alert with various inventory levels
- [ ] Validate calculations against reference values

### After Code Changes:
- [ ] Run regression tests (see quick reference)
- [ ] Verify affected components still work
- [ ] Check for console errors
- [ ] Test real-time updates still responsive

---

## Test Data Files

### Included in Reports:
- Sample Inventory Set 1 (Low Stock - Critical)
- Sample Inventory Set 2 (Healthy Stock)
- Expected allocation examples
- Revenue scaling calculations

### Location:
See "Appendix A: Test Data" in `orderbuilder-test.md`

---

## Contributing to Tests

### To Add New Test Cases:
1. Follow the format in `orderbuilder-test.md`
2. Include test objective, steps, and expected results
3. Reference code files and line numbers
4. Update test metrics table
5. Add to quick reference if critical path

### Test Case Format:
```markdown
#### TC-X.Y: Test Case Title
- **Action:** What to do
- **Expected:** What should happen
- **Verify:** Specific checks to make
```

---

## Related Documentation

### Application Documentation:
- `/README.md` - Project overview
- `/src/lib/algorithms/` - Algorithm implementations
- `/src/lib/constants/` - Business rules and configuration

### Other Test Reports:
- `forecast1-test.md` (if exists) - Forecast 1 view testing
- `forecast2-test.md` (if exists) - Forecast 2 view testing
- `integration-test.md` (if exists) - Full app integration tests

---

## Contact & Support

For questions about these test reports:
- Review the detailed test document first
- Check common issues in quick reference
- Consult calculation accuracy doc for math questions

---

**Last Updated:** 2025-12-06
**Test Suite Version:** 1.0
**Application Version:** As of commit `08637de`
