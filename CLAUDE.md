# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Mattress Order System** - a React-based inventory management and order planning tool for a mattress manufacturing business. The application helps plan container orders for mattress springs and components using sales data, inventory tracking, and demand forecasting.

## Tech Stack

- **React** with hooks (useState, useEffect, useMemo)
- **JSX** single-file component architecture
- Inline CSS-in-JS styling (no external CSS framework)
- No build system currently configured (vanilla React)

## Running the Application

Since this is a standalone JSX file without a build configuration:
- The application needs to be integrated into a React project with a bundler (Vite, Create React App, etc.)
- No package.json or build commands currently exist
- To develop: Set up a React environment and import `MattressOrderSystem` component

## Core Architecture

### Business Constants & Data Models

All business logic is driven by real sales data (960 units/year):

- **Lead time**: 10 weeks for container delivery
- **Pallet capacity**: 30 springs per pallet
- **Container capacity**: 4-12 pallets (configurable)
- **Mattress sizes**: King, Queen, Double, King Single, Single
- **Firmness types**: Firm, Medium, Soft
- **Component types**: Micro Coils, Thin Latex, Felt, Top Panel, Bottom Panel, Side Panel

### Key Algorithms (Lines 65-436)

The system implements 7 core algorithms:

1. **Coverage Calculation** (line 66): Calculates months of inventory remaining for a size
2. **Critical Small Size Detection** (line 79): Identifies small sizes (Double, King Single, Single) with lowest Medium firmness coverage
3. **Pallet Creation** (line 119): Dynamically allocates springs to pallets based on inventory gaps and firmness distribution
4. **N+1 or N+2 Optimization** (line 235): Main ordering strategy - allocates 1-2 pallets to critical small sizes, distributes remaining pallets 60/40 between King/Queen based on coverage
5. **Component Calculation** (line 297): Derives component orders from spring orders with consolidation rules
6. **Export Optimization** (line 338): Rounds component orders to supplier lot sizes with smart buffers
7. **TSV Generation** (line 373): Creates tab-separated export format for suppliers

### Component Structure

Main app component: `MattressOrderSystem` (line 439)
- Manages state for inventory, pallet configuration, and export settings
- Uses `useMemo` extensively to recalculate orders when inputs change

Tab components:
- `GoalTab` (line 620): Business context and strategy explanation
- `OrderBuilderTab` (line 758): Spring inventory input and order generation
- `ComponentsTab` (line 982): Component inventory and order calculation
- `RunwayTab` (line 1181): Inventory runway projection with seasonality
- `ExportTab` (line 1478): TSV export with optimization options

Helper components:
- `Card`, `InfoCard`, `StatCard`, `PalletCard` (lines 1632-1725)

### State Management

All state is local (no Redux/Context):
- `inventory`: Current spring and component stock levels
- `palletCount`: Number of pallets in container (4-12)
- `smallSizePallets`: N+1 (1 pallet) or N+2 (2 pallets) strategy
- `exportFormat`: 'exact' or 'optimized' export mode

### Data Flow

1. User enters current inventory (springs & components)
2. System calculates coverage for each size/firmness
3. N+1/N+2 algorithm determines optimal pallet allocation
4. Component needs are derived from spring order
5. Consolidation rules applied (e.g., micro coils only for King/Queen)
6. Export optimization rounds to supplier lot sizes
7. TSV generated for supplier/Google Sheets

## Business Rules & Constraints

### Seasonality (lines 36-39)
- Busy season (Apr-Aug): 14% above average sales
- Slow season (Sep-Mar): 12% below average sales
- Used in Inventory Runway projections

### Firmness Distribution (lines 20-26)
- King/Queen: ~83% Medium, ~13% Firm, ~3% Soft
- Smaller sizes: More balanced distribution
- Critical size detection prioritizes Medium firmness coverage

### Component Consolidation (lines 313-325)
- Micro Coils & Thin Latex: King/Queen only (not ordered for small sizes)
- Side Panels: Single and King Single consolidated into Double size orders
- Component multipliers vary by type (1.0x to 1.5x per spring)

### Pallet Logic (lines 167-229)
- Pure pallets preferred (single firmness)
- Mixed pallets created when firmness quantities < 30
- Critical pallets padded to exactly 30 springs

## Key Design Patterns

### Dynamic Firmness Allocation
Unlike fixed ratio distribution, springs are allocated based on individual firmness coverage gaps (lines 124-154). Firmnesses with lower coverage receive proportionally more springs.

### N+1 Strategy Intelligence
The 60/40 split between King/Queen automatically favors whichever has lower coverage, naturally handling Queen's 37% faster sales rate (lines 249-261).

### Runway Projection
Two scenarios supported:
- Average depletion (flat monthly rate)
- Seasonal depletion (varies by month)
Projects 14 months forward with container arrival at month 3 (lines 1219-1262)

## Styling Approach

All styles are inline CSS-in-JS objects:
- Dark theme (#000000 background, #fafafa text)
- Design system colors defined inline (no CSS variables)
- Sticky navigation bar with tab switching
- Monospace font for numerical data
- Color coding: Green (success), Blue (info), Yellow (warning), Red (error)

## Important Invariants

1. Each pallet MUST contain exactly 30 springs (enforced by padding logic)
2. Container arrival is always at 10-week mark in projections
3. Component consolidation rules must be applied before optimization
4. Inventory subtraction happens AFTER component calculation
5. N+1/N+2 critical size selection based on Medium firmness coverage (primary), total coverage (tiebreaker)
