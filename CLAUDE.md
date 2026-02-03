# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## FIXED CONSTRAINTS - DO NOT SUGGEST CHANGES

**CRITICAL**: The following constraints are FIXED by the business and CANNOT be changed. Do NOT suggest:
- Larger/smaller containers
- Different pallet sizes
- More frequent ordering
- Mixed pallets (multiple sizes per pallet)
- Different supplier lot sizes
- Changing lead times

**ALL algorithm improvements must work WITHIN these constraints. See CONSTRAINTS.md for full details.**

### Non-Negotiable Constraints

1. **Container capacity**: 4-12 pallets (user chooses within range)
2. **Pallet size**: EXACTLY 30 springs per pallet (supplier fixed)
3. **Lead time**: 10 weeks (shipping fixed)
4. **Small sizes**: Can only receive WHOLE pallets (1 or 2 maximum)
5. **Component lot sizes**: Fixed by supplier (20 or 10 units)
6. **No pallet mixing**: Each pallet must be single size (supplier requirement)

### What You CAN Change

- Allocation logic (which sizes get how many pallets)
- Coverage thresholds (when to skip/allocate)
- Priority rules (which items get preference)
- Dynamic targets (different coverage goals by velocity)
- UI improvements and visualizations

---

## Business Goals

### Primary Goal: Prevent Stockouts
- **King**: 30 units/month (36.88% of business)
- **Queen**: 41 units/month (51.15% of business)
- **Together**: 88% of sales volume
- **Priority**: Keep King/Queen above 2-3 months coverage minimum

### Secondary Goal: Capital Efficiency
- Don't waste inventory on small sizes that already have good coverage (>4 months)
- Free up pallets for critical items when possible

### NOT Goals:
- Perfect runway balance (all sizes deplete at same time)
- Equal coverage across all sizes
- Minimize variance between sizes

**See GOALS.md for complete documentation.**

---

## Critical Business Constraint: Equal Runway Requirement

Components and springs MUST ship together and deplete at the same rate.

**Formula** (`lib/algorithms/componentCalc.js`):
```javascript
targetComponentStock = (currentSprings + orderedSprings) * componentMultiplier
componentOrderNeeded = targetComponentStock - currentComponentStock
```

Each mattress requires **1 spring + multiple components**:
- 1 spring (firm/medium/soft)
- 1 felt, 1 top panel, 1 bottom panel, 1 side panel (1.0x multiplier)
- 1.5 micro coils, 1.5 thin latex - King/Queen only (1.5x multiplier)

---

## Project Overview

**Mattress Order System** - Nuxt 4 inventory management and order planning for mattress manufacturing. Plans container orders for springs and components using sales data and demand forecasting.

## Tech Stack

- **Nuxt 4** (Vue 3 with Composition API, `future.compatibilityVersion: 4`)
- **Pinia** for state management (with persisted state plugin)
- **Tailwind CSS** for styling
- **Directus** for spring inventory and sales data
- **JavaScript**
- **Yarn** as package manager

## Development Commands

```bash
yarn dev              # Start Nuxt dev server
yarn build            # Build production bundle
```

## Environment Variables

Set in `.env` for local development:
- `DIRECTUS_URL` - Directus API endpoint

---

## Nuxt Auto-Imports - Critical Conventions

**DO NOT manually import these** (auto-imported by Nuxt):

1. **Vue Composition API** - `ref`, `computed`, `watch`, `onMounted`, `readonly`, etc.
2. **Pinia** - `defineStore` (in stores)
3. **Store composables** - `useInventoryStore()`, `useOrderStore()`, `useSettingsStore()`, `useUIStore()`
4. **Custom composables** - All functions from `composables/` folder
5. **Directus composables** - `useDirectusItems()`, etc.

**MUST manually import** (from `lib/`):
```javascript
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'
import { calculateCoverage, calculateComponentOrder } from '~/lib/algorithms/index.js'
import { validateEqualRunway } from '~/lib/utils/validation.js'
```

### Component Naming Convention

Components auto-import with path-based names:
- `components/order/PalletCard.vue` -> `<OrderPalletCard />`
- `components/forecast/MonthSelector.vue` -> `<ForecastMonthSelector />`

**Exception**: When file starts with folder name, don't duplicate:
- `components/app/AppHeader.vue` -> `<AppHeader />` (NOT `AppAppHeader`)

### No Emit Pattern

**DO NOT use Vue emit patterns**. Instead:
- Use **stores** for shared state changes
- Use **composables** for error handling and UI interactions
- Call store actions directly from components

### UI Text: Sentence Case

Use **sentence case** for all UI text (headings, buttons, labels, section titles). Only capitalise the first word and proper nouns.

**Correct:**
- "Order week"
- "Spring timeline"
- "Save recommendation"
- "40-week inventory forecast"

**Incorrect:**
- "Order Week"
- "Spring Timeline"
- "Save Recommendation"
- "40-Week Inventory Forecast"

The styling (font size, weight, colour) already indicates that text is a title or button - title case is unnecessary.

---

## Core Architecture

### Directory Structure

```
lib/                         # Business logic (MUST manually import)
├── algorithms/              # Core ordering algorithms
│   ├── fillKingQueenFirst.js # Main ordering algorithm (King/Queen priority)
│   ├── componentCalc.js     # Derive component orders from springs
│   ├── coverage.js          # Calculate months of inventory remaining
│   ├── criticalSizes.js     # Detect critical small sizes
│   ├── exportOptimization.js # Round to supplier lot sizes
│   ├── palletCreation.js    # Allocate springs to pallets
│   ├── tsvGeneration.js     # Export format for suppliers
│   └── index.js             # Central exports
├── constants/               # Business constants
│   ├── business.js          # Lead time, pallet size, thresholds
│   ├── sales.js             # Mattress sizes, monthly rates
│   ├── firmness.js          # Firm/Medium/Soft distribution
│   ├── seasonality.js       # Busy/slow season multipliers
│   └── components.js        # Component types, lot sizes
└── utils/
    └── validation.js        # Equal runway validation

stores/                      # Pinia stores (auto-imported)
├── inventory.js             # Springs (Directus) + Components (localStorage)
├── order.js                 # Computed order data (getters only)
├── settings.js              # App settings (palletCount, startingMonth, etc.)
└── ui.js                    # UI state (accordion, modals)

pages/                       # Nuxt pages (file-based routing)
├── index.vue                # Home/login page
└── dashboard.vue            # Main dashboard

composables/                 # Auto-imported composables
├── useSpringInventory.js    # Fetch springs from Directus
├── useWeeklySales.js        # Fetch sales data from Directus
├── useComponentStorage.js   # localStorage for components
└── useErrorHandler.js       # Error handling

components/
├── app/                     # App-level (AppHeader)
├── order/                   # Order Builder (OrderHero, PalletCard, PalletList, etc.)
├── inventory/               # Tables (SpringInventoryTable, ComponentInventoryTable, WeeklySalesPanel)
├── forecast/                # Forecast views (SpringTimelineDetailed, MonthSelector, etc.)
├── views/                   # Main views (OrderBuilderView, ForecastView)
└── ui/                      # Reusable UI (AccordionSection)
```

### Data Flow

1. User enters current inventory (springs & components)
2. System calculates coverage for each size/firmness
3. Algorithm determines optimal pallet allocation
4. Component needs derived from spring order
5. Consolidation rules applied (micro coils only for King/Queen)
6. Export optimization rounds to supplier lot sizes
7. TSV generated for supplier

### State Management (4 Pinia Stores)

**`useInventoryStore()`** - Inventory data
- `springs`: From Directus (read-only)
- `components`: From localStorage (editable)

**`useOrderStore()`** - Computed order data (getters only)
- `springOrder`, `componentOrder`, `coverageData`, `validation`, `tsvContent`

**`useSettingsStore()`** - App settings
- `palletCount`, `exportFormat`, `currentView`, `startingMonth`, `useLiveSalesData`

**`useUIStore()`** - UI state
- `openSection`, `showSaveModal`, `copyFeedback`

---

## Business Rules

### Firmness Distribution
- King/Queen: ~83% Medium, ~13% Firm, ~3% Soft
- Smaller sizes: More balanced distribution

### Component Consolidation
- Micro Coils & Thin Latex: King/Queen only
- Side Panels: Single and King Single consolidated into Double size orders

### Seasonality
- Busy season (Apr-Aug): 14% above average
- Slow season (Sep-Mar): 12% below average

---

## Key Invariants

1. Each pallet MUST contain exactly 30 springs - **FIXED CONSTRAINT**
2. Container arrival at 10-week mark - **FIXED CONSTRAINT**
3. Component consolidation rules applied before optimization
4. Inventory subtraction happens AFTER component calculation
5. Critical size selection based on Medium firmness coverage (primary), total coverage (tiebreaker)

---

## Adding New Features

### New Algorithm
1. Create file in `lib/algorithms/` (e.g., `myAlgorithm.js`)
2. Export from `lib/algorithms/index.js`

### New Store
1. Create file in `stores/` (e.g., `myStore.js`)
2. Use `defineStore` (auto-imported)
3. Store auto-imports as `useMyStore()`

### New Composable
1. Create file in `composables/` (e.g., `useMyFeature.js`)
2. Export function - auto-imports everywhere

### Modifying Business Logic
1. Check CONSTRAINTS.md - ensure change doesn't violate fixed constraints
2. Check GOALS.md - ensure change aligns with business objectives
3. Update algorithm in `lib/algorithms/`

### Deployment
- Push to GitHub triggers automatic Vercel deployment
- Environment variables in Vercel: `DIRECTUS_URL`
