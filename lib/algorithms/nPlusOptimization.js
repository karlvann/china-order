/**
 * Algorithm 4: AUTOMATIC Pallet Optimization (N+0, N+1, N+2, or N+3)
 *
 * Main ordering strategy that prevents stockouts on King/Queen (88% of sales)
 * by intelligently allocating pallets based on inventory coverage.
 *
 * GOAL: Prevent stockouts on King/Queen, not balance runways.
 * See GOALS.md for detailed explanation of optimization objectives.
 */

import { findCriticalSmallSizes } from './criticalSizes.js'
import { createPalletsForSize } from './palletCreation.js'
import { calculateCoverage } from './coverage.js'

/**
 * Calculate optimal spring order using N+ strategy.
 *
 * Algorithm:
 * 1. Detect critical small sizes (coverage < 4 months) → allocate 0-3 pallets
 * 2. Remaining pallets go to King/Queen (60/40 split favoring lower coverage)
 * 3. Each size's pallets distributed across firmnesses based on coverage gaps
 *
 * @param totalPallets - Container size (4-12 pallets)
 * @param inventory - Current warehouse inventory
 * @returns Complete spring order with pallets and metadata
 */
export function calculateNPlus1Order(totalPallets, inventory) {
  // Step 1: Detect critical small sizes (0-3 sizes with coverage < 4 months)
  const criticalSizes = findCriticalSmallSizes(inventory)
  const smallSizePallets = criticalSizes.length // 0, 1, 2, or 3

  let pallets = []
  let palletIdCounter = 1

  // Step 2: Allocate 1 pallet to each critical small size
  criticalSizes.forEach((criticalSize) => {
    const criticalPallets = createPalletsForSize(criticalSize, 1, palletIdCounter, 'Critical', inventory)
    pallets = [...pallets, ...criticalPallets]
    palletIdCounter += criticalPallets.length
  })

  // Step 3: Calculate King/Queen coverage for allocation decision
  const kingCoverage = calculateCoverage(inventory, 'King')
  const queenCoverage = calculateCoverage(inventory, 'Queen')

  // Step 4: Allocate remaining pallets to King/Queen (60/40 split favoring lower coverage)
  const remainingPallets = totalPallets - smallSizePallets
  let queenPallets, kingPallets

  if (queenCoverage <= kingCoverage) {
    // Queen has lower coverage → gets 60%
    queenPallets = Math.round(remainingPallets * 0.6)
    kingPallets = remainingPallets - queenPallets
  } else {
    // King has lower coverage → gets 60%
    kingPallets = Math.round(remainingPallets * 0.6)
    queenPallets = remainingPallets - kingPallets
  }

  // Step 5: Create pallets for Queen
  const queenPalletList = createPalletsForSize('Queen', queenPallets, palletIdCounter, 'Mixed', inventory)
  pallets = [...pallets, ...queenPalletList]
  palletIdCounter += queenPalletList.length

  // Step 6: Create pallets for King
  const kingPalletList = createPalletsForSize('King', kingPallets, palletIdCounter, 'Mixed', inventory)
  pallets = [...pallets, ...kingPalletList]

  // Step 7: Calculate total spring quantities by firmness/size
  const springs = {
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  }

  pallets.forEach((pallet) => {
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, count]) => {
      springs[firmness][pallet.size] += count
    })
  })

  // Step 8: Calculate metadata (summary statistics)
  const purePallets = pallets.filter((p) => p.type === 'Pure').length
  const mixedPallets = pallets.filter((p) => p.type !== 'Pure').length
  const totalSprings = pallets.reduce((sum, p) => sum + p.total, 0)

  return {
    springs,
    metadata: {
      total_pallets: totalPallets,
      total_springs: totalSprings,
      pure_pallets: purePallets,
      mixed_pallets: mixedPallets,
      critical_sizes: criticalSizes,
      small_size_pallets: smallSizePallets,
      king_pallets: kingPallets,
      queen_pallets: queenPallets
    },
    pallets
  }
}
