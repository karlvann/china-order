# AusBeds order system

Mattress spring, component, and latex inventory management and order planning system. Built with Nuxt 4, Pinia, Tailwind CSS, and Directus.

## Quick start

```bash
yarn install
yarn dev             # Start development server
yarn build           # Build for production
```

Set `DIRECTUS_URL` in `.env` for local development.

## What it does

Plans container orders across two supply chains:

**China (springs + components)** - Allocates 1-12 pallets (30 springs each) using demand-based coverage priority. Calculates matching component orders with balanced coverage.

**Sri Lanka (latex comfort layers)** - Allocates latex units across King/Queen in 20ft (170 units) or 40ft (340 units) containers.

Both systems pull live sales data (6-week lookback) from Directus to calculate weekly demand rates.

## Documentation

See **[AGENTS.md](AGENTS.md)** for full project documentation including architecture, business rules, constraints, algorithms, and conventions.

Additional docs:
- **[docs/CONSTRAINTS.md](docs/CONSTRAINTS.md)** - Fixed business constraints
- **[docs/GOALS.md](docs/GOALS.md)** - Business objectives and optimisation priorities
- **[docs/ALGORITHMS.md](docs/ALGORITHMS.md)** - Detailed algorithm documentation

## Deployment

Push to GitHub triggers automatic Vercel deployment. Set `DIRECTUS_URL` in Vercel environment variables.

## Licence

ISC
