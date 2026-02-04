# China Order System

> **Mattress Spring & Component Inventory Management System**

A React-based inventory management and order planning tool for mattress manufacturing. Intelligently allocates container pallets to prevent stockouts while maintaining capital efficiency.

## 🚀 Quick Start

```bash
yarn install
yarn dev             # Start development server
yarn build           # Build for production
```

## 📊 What It Does

The system helps you plan container orders by:
- Analyzing current inventory across 5 mattress sizes and 3 firmness levels
- Automatically detecting critical stockouts (sizes with <4 months coverage)
- Allocating 1-12 pallets intelligently using demand-based proportional algorithm
- Calculating component orders to match spring inventory (equal runway)
- Generating TSV export for suppliers

### Key Features

✅ **Demand-Based Allocation** - Distributes pallets proportionally based on sales demand
✅ **Equal Runway Enforcement** - Springs and components deplete at the same rate
✅ **Equal Depletion Firmness Allocation** - All firmnesses (Firm/Medium/Soft) deplete together
✅ **Component Consolidation** - Smart rules (micro coils King/Queen only, side panel merging)
✅ **Real-time Validation** - Ensures all business constraints are met
✅ **Export Optimization** - Rounds to supplier lot sizes (10 or 20 units)

## 🎯 Business Rules

### Fixed Constraints (Cannot Change)
- **Container capacity**: 1-12 pallets (user configurable)
- **Pallet size**: 30 springs per pallet (supplier fixed)
- **Lead time**: 10 weeks (shipping fixed)
- **No pallet mixing**: Each pallet is single mattress size (supplier requirement)

### Optimization Goals
1. **Prevent stockouts** on King/Queen (88% of sales volume)
2. **Capital efficiency** - Don't order for sizes already healthy (>4 months)
3. **Equal runway** - Components and springs deplete together

See `GOALS.md` and `CONSTRAINTS.md` for detailed documentation.

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
    │   ├── palletCreation.ts    # Equal depletion pallet allocation
    │   ├── demandBasedOrder.js   # Main demand-based allocation algorithm
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
        └── validation.ts        # Equal runway validation
```

## 🔧 Development

### Tech Stack
- **Nuxt 4** (Vue 3 with Composition API)
- **Pinia** for state management
- **Tailwind CSS** for styling
- **Directus** for data
- **Vercel** for deployment

### Key Algorithms

#### 1. Fill King/Queen First
Prioritizes high-volume sizes to prevent stockouts:
- Calculate how many pallets King/Queen need to reach 6 months coverage
- Allocate those pallets first
- Use remaining pallets for small sizes (up to 2 pallets each)
- **Crisis mode**: King/Queen get 100% when critical (<6 months)
- **Normal mode**: Fill King/Queen to target, remainder to small sizes

#### 2. Component Calculation
Ensures equal runway (springs and components deplete together):
```
targetComponentStock = (currentSprings + orderedSprings) × multiplier
componentOrder = targetComponentStock - currentComponentStock
```

#### 3. Equal Depletion Firmness Allocation
Ensures all firmnesses deplete at the same rate:
- Calculates target coverage that equalizes all firmnesses
- Applies 10% priority boost to Medium (not 84% dominance)
- Minimum 2 springs per firmness to prevent starvation
- Emergency allocation ensures survival until container arrives (2.5 months)

## 📚 Documentation

- **CLAUDE.md** - Project overview and AI assistant guidance
- **GOALS.md** - Business objectives and optimization priorities
- **CONSTRAINTS.md** - Fixed business constraints

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

## 📄 License

ISC

---

**Built with ❤️ for efficient mattress inventory management**
