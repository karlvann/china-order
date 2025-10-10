# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ FIXED CONSTRAINTS - DO NOT SUGGEST CHANGES

**CRITICAL FOR AI ASSISTANTS**: The following constraints are FIXED by the business and CANNOT be changed. Do NOT suggest:
- Larger/smaller containers
- Different pallet sizes
- More frequent ordering
- Mixed pallets (multiple sizes per pallet)
- Different supplier lot sizes
- Changing lead times
- Any workarounds to these constraints

**ALL algorithm improvements must work WITHIN these constraints. See CONSTRAINTS.md for full details.**

### Non-Negotiable Constraints

1. **Container capacity**: 4-12 pallets (user chooses within this range)
2. **Pallet size**: EXACTLY 30 springs per pallet (supplier fixed)
3. **Lead time**: 10 weeks (shipping fixed)
4. **Small sizes**: Can only receive WHOLE pallets (1 or 2 maximum)
5. **Component lot sizes**: Fixed by supplier (20 or 10 units)
6. **No pallet mixing**: Each pallet must be single size (supplier requirement)
7. **Order frequency**: Cannot change (driven by lead time and cash flow)

### What You CAN Change

✅ Allocation logic (which sizes get how many pallets)
✅ Coverage thresholds (when to skip/allocate)
✅ Priority rules (which items get preference)
✅ Dynamic targets (different coverage goals by velocity)
✅ UI improvements and visualizations

### What You CANNOT Change

❌ Physical constraints (pallet size, container size)
❌ Supplier requirements (lot sizes, single-size pallets)
❌ Business constraints (lead time, order frequency)

---

## Business Goals (What to Optimize For)

**IMPORTANT**: Before suggesting algorithm changes, understand what this system is actually optimizing for.

### Primary Goal: Prevent Stockouts
- **King**: 30 units/month (36.88% of business)
- **Queen**: 41 units/month (51.15% of business)
- **Together**: 88% of sales volume
- **Priority**: Keep King/Queen above 2-3 months coverage minimum

### Secondary Goal: Capital Efficiency
- Don't waste inventory on small sizes that already have good coverage (>4 months)
- Don't tie up capital in excess slow-moving inventory
- Free up pallets for critical items when possible

### NOT Goals (Don't Optimize For These):
- ❌ Perfect runway balance (all sizes deplete at same time)
- ❌ Equal coverage across all sizes
- ❌ Minimize variance between sizes
- ❌ Theoretical perfection

### Success Criteria:
✅ No stockouts on King/Queen (>2 months coverage after container)
✅ No wasted pallets on healthy sizes (coverage >4 months)
✅ Efficient use of limited container capacity

**See GOALS.md for complete documentation of business objectives.**

---

## 🎯 CRITICAL BUSINESS CONSTRAINT: Equal Runway Requirement

**THIS IS THE MOST IMPORTANT ALGORITHMIC REQUIREMENT**: Components and springs MUST ship together in the same container and deplete at the same rate.

### Why This Matters

This is not a nice-to-have optimization—it's a fundamental business constraint:

1. **Physical Reality**: Components and springs arrive together in the same shipping container
2. **Manufacturing Dependency**: Can't build mattresses without both springs AND components
3. **Stockout Risk**: Running out of components before springs = production stops despite having springs in stock
4. **Capital Efficiency**: Ordering excess components = wasted money tied up in inventory

### The Math

Each mattress requires **1 spring + multiple components**:
- 1 spring (firm/medium/soft)
- 1 felt piece
- 1 top panel
- 1 bottom panel
- 1 side panel
- 1.5 micro coils (King/Queen only)
- 1.5 thin latex (King/Queen only)

**Example**: If we order 180 King Medium springs (6 months supply at 30/month), we MUST order:
- 180 King felt pieces (6 months supply)
- 180 King top panels (6 months supply)
- 180 King bottom panels (6 months supply)
- 180 King side panels (6 months supply)
- 270 King micro coils (6 months supply at 1.5× multiplier)
- 270 King thin latex (6 months supply at 1.5× multiplier)

### Algorithm Implementation

**File**: `src/lib/algorithms/componentCalc.ts`

**Formula**:
```typescript
targetComponentStock = (currentSprings + orderedSprings) × componentMultiplier
componentOrderNeeded = targetComponentStock - currentComponentStock
```

**Key Points**:
- Current spring inventory MUST be included in the calculation
- Component orders are derived from spring totals (current + ordered)
- Multipliers vary by component type (1.0× for panels/felt, 1.5× for coils/latex)

### Validation

The **Forecast view** provides visual validation that this constraint is being enforced:

1. **Spring Timeline Detailed**: Shows 15 rows (5 sizes × 3 firmnesses)
2. **Component Timeline Detailed**: Shows 22 rows (components × applicable sizes)
3. **Equal Depletion**: All items for a given size should:
   - Show the same depletion rate (same slope on timeline)
   - Run out at approximately the same time (same month)
   - Receive proportional additions when container arrives

**Visual Indicators**:
- Info banner in Order Builder explains the constraint
- Green "✓ Equal Runway Validated" badge in Forecast view
- Footer notes in both timelines mention equal runway requirement

### Debugging

If components and springs are NOT depleting at the same rate:

1. Check `componentCalc.ts` - ensure formula includes `springInventory` parameter
2. Verify multipliers in `src/lib/constants/components.ts` are correct
3. Check consolidation rules (e.g., Side Panel Double includes Single + King Single)
4. Use Forecast view to identify which size/component is misaligned
5. Compare timeline slopes—they should be parallel

**This constraint is non-negotiable. If the algorithm doesn't enforce equal runway, it's broken and must be fixed.**

---

## Project Overview

This is a **Mattress Order System** - a React-based inventory management and order planning tool for a mattress manufacturing business. The application helps plan container orders for mattress springs and components using sales data, inventory tracking, and demand forecasting.

## Tech Stack

- **React 19** with hooks (useState, useEffect, useMemo)
- **Vite** for development and build tooling
- **Vitest** for unit testing with jsdom environment
- **TypeScript** for type definitions (mixed JS/TS codebase)
- Inline CSS-in-JS styling (no external CSS framework)
- **Vercel** deployment with KV storage for save/load functionality

## Development Commands

```bash
npm run dev          # Start Vite dev server (default: http://localhost:5173)
npm run build        # Build production bundle
npm run preview      # Preview production build locally
npm test             # Run tests in watch mode
npm run test:ui      # Run tests with Vitest UI
npm run test:coverage # Generate test coverage report
```

## Running Tests

- Test files: `tests/**/*.test.ts`
- Use `vitest` for running specific test files
- Tests cover core algorithms: coverage, critical sizes, N+ optimization
- Setup file: `tests/setup.ts` (configures jsdom, React Testing Library)

## Core Architecture

### Directory Structure

```
src/
├── App.jsx                      # Main app component with tab navigation
├── SaveLoadModal.jsx            # Save/load UI for inventory snapshots
├── main.jsx                     # React entry point
├── storage.js                   # Storage adapter (localStorage + Vercel KV)
└── lib/
    ├── algorithms/              # Core business logic algorithms
    │   ├── coverage.ts          # Coverage calculation (months remaining)
    │   ├── criticalSizes.ts     # Identifies small sizes needing pallets
    │   ├── palletCreation.ts    # Dynamic pallet allocation by firmness
    │   ├── nPlusOptimization.ts # Main N+0/N+1/N+2 ordering strategy
    │   ├── componentCalc.ts     # Derive component orders from springs
    │   ├── exportOptimization.ts # Round to supplier lot sizes
    │   └── tsvGeneration.ts     # Generate tab-separated export
    ├── constants/               # Business constants
    │   ├── business.ts          # Pallet size, lead time, container limits
    │   ├── sales.ts             # Monthly sales rates per size
    │   ├── firmness.ts          # Firmness distribution ratios
    │   ├── seasonality.ts       # Busy/slow season multipliers
    │   └── components.ts        # Component types and multipliers
    ├── types/                   # TypeScript type definitions
    │   ├── inventory.ts         # Spring and component inventory types
    │   ├── order.ts             # Order and pallet structure types
    │   └── component.ts         # Component-related types
    └── utils/
        ├── inventory.ts         # Helper functions for inventory creation
        └── validation.ts        # Equal runway validation (with memoization)

api/
└── saves.js                     # Vercel serverless function for KV storage

tests/
├── algorithms/                  # Algorithm unit tests (48 tests)
│   ├── coverage.test.ts
│   ├── criticalSizes.test.ts
│   ├── nPlusOptimization.test.ts
│   ├── componentCalc.test.ts
│   ├── equalRunway.test.ts
│   └── executionOrder.test.ts
├── integration/                 # Integration tests (29 tests)
│   ├── fullOrderScenarios.test.ts
│   └── extremeEdgeCases.test.ts
└── performance/                 # Performance tests (11 tests)
    └── stressTests.test.ts
```

### Business Constants & Data Models

All business logic is driven by real sales data (960 units/year):

- **Lead time**: 10 weeks for container delivery
- **Pallet capacity**: 30 springs per pallet
- **Container capacity**: 4-12 pallets (configurable)
- **Mattress sizes**: King, Queen, Double, King Single, Single
- **Firmness types**: Firm, Medium, Soft
- **Component types**: Micro Coils, Thin Latex, Felt, Top Panel, Bottom Panel, Side Panel

### Core Algorithms

The system implements 7 core algorithms (all in `src/lib/algorithms/`):

1. **Coverage Calculation** (`coverage.ts`): Calculates months of inventory remaining for a size
2. **Critical Small Size Detection** (`criticalSizes.ts`): Identifies small sizes (Double, King Single, Single) with lowest Medium firmness coverage
3. **Pallet Creation** (`palletCreation.ts`): Dynamically allocates springs to pallets based on inventory gaps and firmness distribution
4. **N+1 or N+2 Optimization** (`nPlusOptimization.ts`): Main ordering strategy - allocates 0-2 pallets to critical small sizes, distributes remaining pallets 60/40 between King/Queen based on coverage
5. **Component Calculation** (`componentCalc.ts`): Derives component orders from spring orders with consolidation rules
6. **Export Optimization** (`exportOptimization.ts`): Rounds component orders to supplier lot sizes with smart buffers
7. **TSV Generation** (`tsvGeneration.ts`): Creates tab-separated export format for suppliers

### Testing & Validation

**99 tests across 7 test files** validate every aspect of the ordering system.

#### Test Categories

1. **Algorithm Tests** (`tests/algorithms/`): 48 tests
   - Coverage calculation, critical size detection
   - N+ optimization, pallet creation
   - **Component calculation** (13 tests) - validates formula correctness
   - **Equal runway validation** (13 tests) - CRITICAL business requirement
   - **Execution order** (11 tests) - validates dependency chain

2. **Integration Tests** (`tests/integration/`): 29 tests
   - **Full scenarios** (13 tests) - 10 real-world ordering scenarios
   - **Extreme edge cases** (16 tests) - boundary conditions, unusual distributions

3. **Performance Tests** (`tests/performance/`): 11 tests
   - Stress testing with 100-1000 iterations
   - Performance benchmarking (< 5ms full pipeline)
   - Random inventory variations

#### Key Validation Function

**File**: `src/lib/utils/validation.ts`

```typescript
import { validateEqualRunway } from '@/lib/utils/validation';

const validation = validateEqualRunway(springOrder, componentOrder, inventory);

if (!validation.allValid) {
  // Violations detected - components won't deplete at same rate as springs
  console.warn(validation.violations);
}
```

**Why validation matters:**
- Springs and components arrive together
- Must deplete at same rate to avoid production stops
- Validation ensures formula correctness: `targetStock = (current + ordered) × multiplier`

#### Running Tests

```bash
npm test                    # Run all 99 tests
npm run test:ui            # Interactive UI
npm run test:coverage      # Coverage report
```

See `TEST_AND_OPTIMIZATION_SUMMARY.md` for complete test documentation.

### Component Structure

**Main App** (`src/App.jsx`):
- Two-view architecture: Order Builder (card grid) and Forecast (detailed timelines)
- View toggle in header allows switching between builder and forecast modes
- Manages state for inventory, pallet configuration, export settings, and UI collapsible states
- Uses `useMemo` extensively to recalculate orders when inputs change
- Imports all algorithms from `src/lib/algorithms`
- Imports all constants from `src/lib/constants`

**Order Builder View** (Responsive Card Grid):
All cards are collapsible with smart defaults (▼ = open, ▶ = closed by default):

1. ▼ **Container Size** - Slider for pallet count (4-12)
2. ▼ **Spring Inventory** - Primary data entry table
3. ▶ **Component Inventory** - Optional input (labeled "Optional")
4. ▼ **Current Status** - Coverage cards with priority alerts
5. ▼ **Your Order** - Pallet preview
6. ▼ **Coverage After Order** - Runway visualization
7. ▶ **Component Coverage** - Validation metrics (labeled "Validation")
8. ▼ **Export Order** - Format toggle and export buttons

**Forecast View** (Full-Width Detailed Timelines):
- Month selector dropdown for choosing starting month
- `SpringTimelineDetailed.jsx`: 15 rows (5 sizes × 3 firmnesses) with container arrival at Week 10
- `ComponentTimelineDetailed.jsx`: 22 rows (components × applicable sizes)
- Visual indicators: Info banner explaining equal runway, green "✓ Equal Runway Validated" badge
- Container arrival positioned between Month 2 and Month 3 as special column

**UI Components**:
- `InventoryTable.jsx`: Editable tables for spring/component input
- `CoverageGrid.jsx`: Status cards showing coverage by size
- `PalletList.jsx`: Visual pallet breakdown
- `RunwayMini.jsx`: Compact runway visualization
- `ComponentRunway.jsx`: Component coverage display
- `SpringTimelineDetailed.jsx`: 12-month forecast (size × firmness detail)
- `ComponentTimelineDetailed.jsx`: 12-month forecast (component × size detail)

**Save/Load System**:
- `SaveLoadModal.jsx`: UI for managing 5 save slots
- `storage.js`: Adapter pattern - localStorage (dev) or Vercel KV (production)
- `api/saves.js`: Serverless function handling KV operations

### State Management

All state is local (no Redux/Context):
- `inventory`: Current spring and component stock levels
- `palletCount`: Number of pallets in container (4-12)
- `exportFormat`: 'exact' or 'optimized' export mode
- `currentView`: 'builder' or 'forecast' (view toggle)
- `startingMonth`: Month offset for forecast view (0-11)
- `showSaveModal`: Controls save/load modal visibility
- Collapsible states: `showContainerSettings`, `showSpringInventory`, `showComponentsInput`, `showCurrentStatus`, `showYourOrder`, `showCoverageAfter`, `showComponentCoverage`, `showExport`

### Data Flow

1. User enters current inventory (springs & components)
2. System calculates coverage for each size/firmness
3. N+0/N+1/N+2 algorithm determines optimal pallet allocation automatically
4. Component needs are derived from spring order
5. Consolidation rules applied (e.g., micro coils only for King/Queen)
6. Export optimization rounds to supplier lot sizes
7. TSV generated for supplier/Google Sheets

## Business Rules & Constraints

### Seasonality (`src/lib/constants/seasonality.ts`)
- Busy season (Apr-Aug): 14% above average sales
- Slow season (Sep-Mar): 12% below average sales
- Used in Inventory Runway projections

### Firmness Distribution (`src/lib/constants/firmness.ts`)
- King/Queen: ~83% Medium, ~13% Firm, ~3% Soft
- Smaller sizes: More balanced distribution
- Critical size detection prioritizes Medium firmness coverage

### Component Consolidation (`src/lib/algorithms/componentCalc.ts`)
- Micro Coils & Thin Latex: King/Queen only (not ordered for small sizes)
- Side Panels: Single and King Single consolidated into Double size orders
- Component multipliers vary by type (1.0x to 1.5x per spring)

### Pallet Logic (`src/lib/algorithms/palletCreation.ts`)
- Pure pallets preferred (single firmness)
- Mixed pallets created when firmness quantities < 30
- Critical pallets padded to exactly 30 springs

## Key Design Patterns

### Dynamic Firmness Allocation
Unlike fixed ratio distribution, springs are allocated based on individual firmness coverage gaps (`src/lib/algorithms/palletCreation.ts`). Firmnesses with lower coverage receive proportionally more springs.

### Automatic N+0/N+1/N+2 Selection
The algorithm automatically determines whether to allocate 0, 1, or 2 pallets to small sizes based on coverage thresholds (`src/lib/algorithms/nPlusOptimization.ts`):
- **N+0**: Skip small sizes with >4 months coverage (capital efficiency)
- **N+1**: Allocate 1 pallet to critical small size (<4 months)
- **N+2**: Allocate 2 pallets if multiple small sizes are critical
- Remaining pallets distributed 60/40 between King/Queen based on coverage
- This naturally handles Queen's 37% faster sales rate

### Modular Algorithm Architecture
Core algorithms are separated into individual TypeScript modules in `src/lib/algorithms/`:
- Each algorithm is independently testable
- Pure functions with clear inputs/outputs
- Type-safe interfaces defined in `src/lib/types/`
- Centralized export from `index.ts` for clean imports

### Storage Adapter Pattern
`src/storage.js` implements environment-aware storage:
- Development: Uses browser localStorage
- Production: Uses Vercel KV via serverless API
- Same interface for both environments
- Automatically detects environment based on hostname

### Runway Projection
Two scenarios supported in the Runway tab:
- Average depletion (flat monthly rate)
- Seasonal depletion (varies by month using `BUSY_MONTHS` and multipliers)
- Projects 14 months forward with container arrival at month 3

## Styling Approach

All styles are inline CSS-in-JS objects:
- Dark theme (#000000 background, #fafafa text)
- Design system colors defined inline (no CSS variables)
- Sticky navigation bar with tab switching
- Monospace font for numerical data
- Color coding: Green (success), Blue (info), Yellow (warning), Red (error)

## Important Invariants

**NOTE**: Invariants 1-2 are FIXED CONSTRAINTS (cannot change). Invariants 3-5 are algorithm requirements.

1. Each pallet MUST contain exactly 30 springs (enforced by padding logic) - **FIXED CONSTRAINT**
2. Container arrival is always at 10-week mark in projections - **FIXED CONSTRAINT**
3. Component consolidation rules must be applied before optimization
4. Inventory subtraction happens AFTER component calculation
5. Critical size selection based on Medium firmness coverage (primary), total coverage (tiebreaker)

**Reminder**: See the "FIXED CONSTRAINTS" section at the top of this file for all unchangeable business constraints.

---

## Adding New Features

### Adding a New Algorithm
1. Create new file in `src/lib/algorithms/` (e.g., `myAlgorithm.ts`)
2. Define TypeScript types in `src/lib/types/` if needed
3. Export function from `src/lib/algorithms/index.ts`
4. Import in `src/App.jsx` and use in `useMemo` hooks
5. Write tests in `tests/algorithms/myAlgorithm.test.ts`

### Adding New Constants
1. Add to appropriate file in `src/lib/constants/`
2. Export from `src/lib/constants/index.ts`
3. Import where needed

### Modifying Business Logic
1. Check CONSTRAINTS.md - ensure change doesn't violate fixed constraints
2. Check GOALS.md - ensure change aligns with business objectives
3. Update algorithm in `src/lib/algorithms/`
4. Update or add tests
5. Run `npm test` to verify no regressions

### Deployment
- Push to GitHub triggers automatic Vercel deployment
- Environment variables: Set `KV_REST_API_URL` and `KV_REST_API_TOKEN` in Vercel dashboard
- Production uses Vercel KV for save/load functionality
- No additional configuration needed (vercel.json handles API routes)
