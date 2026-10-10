# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## FIXED CONSTRAINTS - DO NOT SUGGEST CHANGES

**CRITICAL**: The following constraints are fixed by the business/suppliers. Do NOT suggest:
- Containers/orders larger than 12 spring pallets
- Different pallet sizes
- Unrealistic order frequency changes
- Mixed mattress sizes on one pallet
- Different supplier lot sizes
- Rush freight or unrealistic logistics assumptions

**ALL algorithm improvements must work WITHIN these constraints. See docs/CONSTRAINTS.md for full details.**

### Non-Negotiable Constraints

1. **Container capacity**: 1-12 pallets (user chooses within range)
2. **Pallet size**: EXACTLY 30 springs per pallet (supplier fixed)
3. **Lead time**: Variable by order/season; 10 weeks is the default spring-planning assumption
4. **Pallet allocation**: Whole pallets by size, allocated by demand/coverage urgency
5. **Component lot sizes**: Fixed by supplier (20 or 10 units)
6. **No size mixing**: Each spring pallet must be a single mattress size; firmness can be mixed within that size

### What You CAN Change

- Allocation logic (which sizes get how many pallets)
- Coverage thresholds (when to skip/allocate)
- Priority rules (which items get preference)
- Dynamic targets (different coverage goals by velocity)
- UI improvements and visualizations

---

## Business Goals

### Primary Goal: Prevent Stockouts
- **King**: Approximately 30% of sales
- **Queen**: Approximately 48% of sales
- **Together**: Approximately 78% of sales volume
- **Priority**: Keep King/Queen above their week-based coverage targets where capacity allows

### Secondary Goal: Capital Efficiency
- Don't waste inventory on sizes that already have healthy projected coverage
- Free up pallets for critical items when possible

### NOT Goals:
- Perfect runway balance (all sizes deplete at same time)
- Equal coverage across all sizes
- Minimize variance between sizes

**See docs/GOALS.md for complete documentation.**

---

## Critical Business Constraint: Components Match Springs

Components and springs MUST ship together. The component algorithm ensures balanced coverage across runout-managed component types; felt is a fixed 1:3 spring top-up.

**See `docs/ALGORITHMS.md` for detailed algorithm documentation.**

Each mattress requires **1 spring + multiple components**:

Spring recipe tokens are semantic: the first letter is tension (`v` very soft, `s` soft, `m` medium, `f` firm), the middle `s` means spring, and the final letter is the side facing up (`s` soft, `f` firm).
- 1 spring (very soft/soft/medium/firm)
- 1 top panel, 1 bottom panel, 1 side panel (1:1 with springs)
- Felt top-up: order approximately 1 felt per 3 springs; springs arrive packaged in usable felt, so felt runout rules do not apply
- Micro coils & thin latex (King/Queen only):
  - King inventory: King springs + 0.5× Single springs (Singles cut King in half)
  - Queen inventory: Queen + Double + King Single springs (cut from Queen)
  - Demand ratio from sales data (Cloud=2 layers, Aurora=1, Cooper=0)

---

## Project Overview

**Mattress Order System** - Nuxt 4 inventory management and order planning for mattress manufacturing. Plans container orders for springs, components and latex comfort layers using sales data and demand forecasting.

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
3. **Store composables** - `useAppStore()`, `useSpringInventoryStore()`, `useSpringOrdersStore()`, `useSpringSettingsStore()`, `useSpringUIStore()`, `useLatexInventoryStore()`, `useLatexOrdersStore()`, `useLatexSettingsStore()`, `useLatexUIStore()`, `useInventoryOrderReceivingStore()`
4. **Custom composables** - All functions from `composables/` folder
5. **Directus composables** - `useDirectusItems()`, etc.

**MUST manually import** (from `lib/`):
```javascript
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'
import { calculateSpringOrder, calculateComponentOrder } from '~/lib/algorithms/index.js'
import { createEmptySpringInventory } from '~/lib/utils/index.js'
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
- "New order"
- "40-week inventory forecast"

**Incorrect:**
- "Order Week"
- "Spring Timeline"
- "New Order"
- "40-Week Inventory Forecast"

The styling (font size, weight, colour) already indicates that text is a title or button - title case is unnecessary.

---

## Core Architecture

### Directory Structure

```
docs/                        # Documentation
└── ALGORITHMS.md            # Detailed spring & component algorithm documentation

lib/                         # Business logic (MUST manually import)
├── algorithms/              # Core ordering algorithms
│   ├── springOrder.js       # Spring ordering (coverage-priority allocation)
│   ├── componentCalc.js     # Component ordering (balanced coverage)
│   ├── componentOrderOptimization.js # Round to supplier lot sizes
│   ├── latexOrder.js        # Latex order allocation
│   └── index.js             # Central exports
├── constants/               # Business constants
│   ├── auth.js              # Authentication and access constants
│   ├── springs.js           # Spring, component and pallet planning constants
│   ├── latex.js             # Latex SKUs, container sizes and lead time
│   ├── shared.js            # Seasonality and month constants
│   └── index.js             # Central exports
└── utils/
    ├── inventory.js         # Empty inventory structure builders
    └── dates.js             # Date utilities (getCurrentMonday)

stores/                      # Pinia stores (auto-imported)
├── app.js                   # Shared springs/latex navigation state
├── springInventory.js       # Spring and component inventory
├── springOrders.js          # Spring/component orders from Directus
├── springSettings.js        # Spring planning settings
├── springUI.js              # Spring order UI state
├── latexInventory.js        # Latex inventory
├── latexOrders.js           # Latex orders from Directus
├── latexSettings.js         # Latex planning settings
├── latexUI.js               # Latex order UI state
└── inventoryOrderReceiving.js # Shared order receiving

pages/                       # Nuxt pages (file-based routing)
├── index.vue                # Home/login page
└── dashboard.vue            # Main dashboard

composables/                 # Auto-imported composables
├── useComponentInventory.js # Fetch component inventory from Directus
├── useLatexInventory.js     # Fetch latex inventory from Directus
├── useLatexSales.js         # Fetch latex sales data from Directus
├── useLatexSkuLookup.js     # Resolve latex SKU IDs
├── useMonthNames.js         # Month name utilities
├── useSpringInventory.js    # Fetch spring inventory from Directus
├── useSpringSales.js        # Fetch spring/component sales data
└── useSpringSkuLookup.js    # Resolve spring/component SKU IDs

components/
├── app/                     # App-level components
├── spring/                  # Spring order management
├── latex/                   # Latex order management
├── forecast/                # Spring, component and latex timelines
├── shared/                  # Components shared by both order types
└── views/                   # SpringView and LatexView
```

### Data Flow

1. User enters current inventory (springs & components)
2. System calculates coverage for each size/firmness
3. Algorithm determines optimal pallet allocation
4. Component needs derived from spring order
5. Consolidation rules applied (micro coils only for King/Queen)
6. Export optimization rounds to supplier lot sizes
7. TSV generated for supplier

### State management

**Shared:**

- `useAppStore()` — active order type (`springs` or `latex`)
- `useInventoryOrderReceivingStore()` — receives either order type into inventory

**Springs and components:**

- `useSpringInventoryStore()` — spring and component inventory
- `useSpringOrdersStore()` — spring/component orders from Directus
- `useSpringSettingsStore()` — pallet, forecast and demand settings
- `useSpringUIStore()` — spring order panel and draft state

**Latex:**

- `useLatexInventoryStore()` — mattress and pillow latex inventory
- `useLatexOrdersStore()` — latex orders from Directus
- `useLatexSettingsStore()` — latex capacity, forecast and demand settings
- `useLatexUIStore()` — latex order panel and draft state

---

## Two Ordering Systems

The app manages two independent supply chains:

### Springs and components
- Pallet-based ordering (30 springs per pallet, 1-12 pallets per container)
- 5 mattress sizes × 4 spring tensions
- Components must match springs while maintaining balanced coverage
- Constants in `lib/constants/springs.js`

### Latex comfort layers
- Unit-based ordering with editable item capacity (default: 410 units, adjusted in steps of 5)
- Mattress latex: King and Queen sheets only (smaller sizes cut from these)
- Pillow latex: thin and thick pillow latex SKUs tracked alongside mattress latex
- 8 SKUs total: 3 firmnesses × 2 mattress sheet sizes, plus pillow latex thin/thick
- Mattress-to-latex mapping: King→King (1.0x), Single→King (0.5x), Queen/Double/King Single→Queen (1.0x)
- Pillow latex demand comes from exact `pillowlatexthin` and `pillowlatexthick` SKU sales
- Constants in `lib/constants/latex.js`, algorithm in `lib/algorithms/latexOrder.js`
- Lead time: configurable; default from `LATEX_LEAD_TIME_WEEKS`

---

## Business Rules

### Spring tension distribution
- Live tension ratios are calculated from the full 12-week paid-sales sample.
- Store split demand uses fixed physical splits: King/Double 10% soft, 35% medium and 55% firm; Queen 10% soft, 50% medium and 40% firm; King Single 25% soft, 30% medium and 45% firm; Single 45% soft, 30% medium and 25% firm. Very soft is 0% for every size.
- Low-selling spring SKUs use a demand floor: if normal SKU demand (`size weekly rate × tension ratio`) is below 1.75/wk, use the higher of normal demand and the raw 12-week SKU average.

### Component Consolidation
- Micro Coils & Thin Latex: King/Queen only
- Side Panels: Single and King Single consolidated into Double size orders

### Seasonality
- Busy season (Apr-Aug): 14% above average
- Slow season (Sep-Mar): 12% below average

---

## Key Invariants

1. Each pallet MUST contain exactly 30 springs - **FIXED CONSTRAINT**
2. Lead time is an order/forecast assumption, not a fixed business constraint
3. Component consolidation rules applied before optimization
4. Inventory subtraction happens AFTER component calculation
5. Spring pallet allocation is demand/coverage based, using the lowest-coverage firmness per size plus King/Queen priority weighting

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
1. Check docs/CONSTRAINTS.md - ensure change doesn't violate fixed constraints
2. Check docs/GOALS.md - ensure change aligns with business objectives
3. Update algorithm in `lib/algorithms/`

### Deployment
- Push to GitHub triggers automatic Vercel deployment
- Environment variables in Vercel: `DIRECTUS_URL`
