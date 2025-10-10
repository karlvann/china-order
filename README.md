# China Order System

> **Mattress Spring & Component Inventory Management System**

A React-based inventory management and order planning tool for mattress manufacturing. Intelligently allocates container pallets to prevent stockouts while maintaining capital efficiency.

## 🚀 Quick Start

```bash
npm install
npm run dev          # Start development server (http://localhost:5173)
npm test             # Run test suite (99 tests)
npm run build        # Build for production
```

## 📊 What It Does

The system helps you plan container orders by:
- Analyzing current inventory across 5 mattress sizes and 3 firmness levels
- Automatically detecting critical stockouts (sizes with <4 months coverage)
- Allocating 4-12 pallets intelligently (N+0, N+1, N+2, or N+3 strategy)
- Calculating component orders to match spring inventory (equal runway)
- Generating TSV export for suppliers

### Key Features

✅ **Automatic N+ Strategy** - Allocates 0-3 pallets to critical small sizes, rest to King/Queen
✅ **Equal Runway Enforcement** - Springs and components deplete at the same rate
✅ **Dynamic Firmness Allocation** - Distributes springs based on coverage gaps, not fixed ratios
✅ **Component Consolidation** - Smart rules (micro coils King/Queen only, side panel merging)
✅ **Real-time Validation** - Ensures all business constraints are met
✅ **Export Optimization** - Rounds to supplier lot sizes (10 or 20 units)

## 🎯 Business Rules

### Fixed Constraints (Cannot Change)
- **Container capacity**: 4-12 pallets (user configurable)
- **Pallet size**: 30 springs per pallet (supplier fixed)
- **Lead time**: 10 weeks (shipping fixed)
- **No pallet mixing**: Each pallet is single mattress size (supplier requirement)

### Optimization Goals
1. **Prevent stockouts** on King/Queen (88% of sales volume)
2. **Capital efficiency** - Don't order for sizes already healthy (>4 months)
3. **Equal runway** - Components and springs deplete together

See `GOALS.md` and `CONSTRAINTS.md` for detailed documentation.

## 🧪 Testing

### Test Suite Overview

**99 tests across 7 test files:**
- ✅ Algorithm tests (48 tests)
- ✅ Integration tests (29 tests)
- ✅ Performance tests (11 tests)
- ✅ Edge case tests (11 tests)

### Run Tests

```bash
npm test                    # Run all tests
npm run test:ui            # Interactive UI
npm run test:coverage      # Coverage report

# Run specific test file
npm test tests/algorithms/componentCalc.test.ts
```

### Test Categories

#### 1. Algorithm Tests
- `coverage.test.ts` - Coverage calculation validation
- `criticalSizes.test.ts` - Critical size detection
- `nPlusOptimization.test.ts` - N+ pallet allocation
- `componentCalc.test.ts` - Component order calculation
- `equalRunway.test.ts` - Equal runway validation (CRITICAL)
- `executionOrder.test.ts` - Dependency chain validation

#### 2. Integration Tests
- `fullOrderScenarios.test.ts` - 10 real-world scenarios
- `extremeEdgeCases.test.ts` - Extreme edge cases

#### 3. Performance Tests
- `stressTests.test.ts` - Performance benchmarks

### Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Full pipeline | 0.048ms | Springs → Components → TSV |
| Spring order | 0.033ms | N+ optimization |
| Component order | 0.022ms | Formula + consolidation |
| Validation | 0.017ms | Equal runway check |
| TSV export | 0.027ms | Ready to copy |

## 📁 Project Structure

```
src/
├── App.jsx                      # Main UI component
├── SaveLoadModal.jsx            # Save/load functionality
├── main.jsx                     # React entry point
├── storage.js                   # Storage adapter (localStorage/Vercel KV)
└── lib/
    ├── algorithms/              # Core business logic
    │   ├── coverage.ts          # Coverage calculation
    │   ├── criticalSizes.ts     # Critical size detection
    │   ├── palletCreation.ts    # Dynamic pallet allocation
    │   ├── nPlusOptimization.ts # Main N+ strategy
    │   ├── componentCalc.ts     # Component calculation
    │   ├── exportOptimization.ts # Lot size rounding
    │   └── tsvGeneration.ts     # TSV export
    ├── constants/               # Business constants
    │   ├── business.ts          # Pallet size, lead time
    │   ├── sales.ts             # Monthly sales rates
    │   ├── firmness.ts          # Firmness distributions
    │   ├── seasonality.ts       # Seasonal multipliers
    │   └── components.ts        # Component types
    ├── types/                   # TypeScript types
    │   ├── inventory.ts         # Inventory types
    │   ├── order.ts             # Order types
    │   └── component.ts         # Component types
    └── utils/
        ├── inventory.ts         # Inventory helpers
        └── validation.ts        # Equal runway validation

tests/
├── algorithms/                  # Algorithm unit tests (48 tests)
├── integration/                 # Integration tests (29 tests)
└── performance/                 # Performance tests (11 tests)

api/
└── saves.js                     # Vercel serverless function (KV storage)
```

## 🔧 Development

### Tech Stack
- **React 19** with hooks
- **Vite** for build tooling
- **Vitest** for testing (99 tests)
- **TypeScript** for types (mixed JS/TS)
- **Vercel** for deployment + KV storage

### Key Algorithms

#### 1. N+ Pallet Optimization
Automatically determines optimal pallet allocation:
- **N+0**: All small sizes healthy → all pallets to King/Queen
- **N+1**: 1 critical small size → 1 pallet to it, rest to King/Queen
- **N+2**: 2 critical small sizes → 1 pallet each, rest to King/Queen
- **N+3**: 3 critical small sizes → 1 pallet each, rest to King/Queen

#### 2. Component Calculation
Ensures equal runway (springs and components deplete together):
```
targetComponentStock = (currentSprings + orderedSprings) × multiplier
componentOrder = targetComponentStock - currentComponentStock
```

#### 3. Dynamic Firmness Allocation
Allocates springs based on coverage gaps, not fixed ratios:
- Calculates need for each firmness: `targetStock - currentStock`
- Distributes springs proportionally to needs
- Falls back to default ratios if all firmnesses healthy

## 📚 Documentation

- **CLAUDE.md** - Project overview and AI assistant guidance
- **GOALS.md** - Business objectives and optimization priorities
- **CONSTRAINTS.md** - Fixed business constraints
- **OPTIMIZATION_ANALYSIS.md** - Performance analysis and bottlenecks
- **TEST_AND_OPTIMIZATION_SUMMARY.md** - Complete test suite documentation

## 🚢 Deployment

### Vercel Deployment
1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables:
   - `KV_REST_API_URL` - Vercel KV URL
   - `KV_REST_API_TOKEN` - Vercel KV token
4. Deploy automatically on push

### Environment Detection
- **Development**: Uses `localStorage` for save/load
- **Production**: Uses Vercel KV for save/load

## 🧮 Business Metrics

### Sales Volume (960 units/year)
- **King**: 30 units/month (36.88%)
- **Queen**: 41 units/month (51.15%)
- **Double**: 6 units/month (7.35%)
- **King Single**: 3 units/month (3.68%)
- **Single**: 1 unit/month (1.23%)

### Firmness Distribution
- **King/Queen**: 83% Medium, 13% Firm, 3% Soft
- **Small sizes**: More balanced (67% Medium, 25% Firm, 8% Soft)

### Component Multipliers
- **1.0×**: Felt, Top Panel, Bottom Panel, Side Panel
- **1.5×**: Micro Coils, Thin Latex

## ⚠️ Important Notes

### Equal Runway Constraint
**This is the most critical business requirement:**
- Springs and components arrive in the same container
- They must deplete at the same rate
- Running out of components before springs = production stops
- Formula enforces this mathematically

### Fixed Constraints
Never suggest changes to:
- Pallet size (30 springs)
- Container size range (4-12 pallets)
- Supplier lot sizes (10 or 20 units)
- Lead time (10 weeks)

## 📞 Support

For issues or questions:
- See documentation in `CLAUDE.md`
- Review `GOALS.md` for business context
- Check `TEST_AND_OPTIMIZATION_SUMMARY.md` for test details

## 📄 License

ISC

---

**Built with ❤️ for efficient mattress inventory management**
