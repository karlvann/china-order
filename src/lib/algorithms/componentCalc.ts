/**
 * Algorithm 5: Component Calculation
 *
 * Derives component orders from spring orders with consolidation rules:
 * - Micro Coils & Thin Latex: King/Queen only (not ordered for small sizes)
 * - Side Panels: Single and King Single consolidated into Double size orders
 * - Inventory subtraction: Only order what's needed (after current stock)
 */

import type { SpringOrder, ComponentOrder, ComponentInventory } from '../types';
import { COMPONENT_TYPES, MATTRESS_SIZES, FIRMNESS_TYPES, KING_QUEEN_ONLY_COMPONENTS } from '../constants';

/**
 * Calculate component order from spring order.
 *
 * **Algorithm**:
 * 1. Calculate raw component needs (springs * multiplier)
 * 2. Apply consolidation rules:
 *    - Micro Coils/Thin Latex → 0 for small sizes
 *    - Side Panels → Single/King Single added to Double
 * 3. Subtract current inventory
 * 4. Return final order quantities (never negative)
 *
 * **Why consolidation?**
 * - Cost savings: Don't order expensive components for low-volume sizes
 * - Simplicity: Reuse Double side panels for Single/King Single
 *
 * @param springOrder - Complete spring order from N+ optimization
 * @param componentInventory - Current component inventory
 * @returns Component order quantities by type and size
 *
 * @example
 * ```ts
 * const componentOrder = calculateComponentOrder(springOrder, componentInventory);
 * // componentOrder['micro_coils']['Double'] = 0  (not ordered for small sizes)
 * // componentOrder['side_panel']['Double'] = 90  (includes Single + King Single)
 * ```
 */
export function calculateComponentOrder(
  springOrder: SpringOrder,
  componentInventory: ComponentInventory
): ComponentOrder {
  const componentOrder: ComponentOrder = {};

  // Step 1: Calculate raw component needs (springs * multiplier)
  COMPONENT_TYPES.forEach((comp) => {
    componentOrder[comp.id] = {};

    MATTRESS_SIZES.forEach((size) => {
      // Sum all firmnesses for this size
      const totalSprings = FIRMNESS_TYPES.reduce(
        (sum, firmness) => sum + (springOrder.springs[firmness][size.id] || 0),
        0
      );

      const rawNeed = Math.ceil(totalSprings * comp.multiplier);
      componentOrder[comp.id][size.id] = rawNeed;
    });
  });

  // Step 2: Apply consolidation rules

  // Rule 1: Micro Coils & Thin Latex - Don't order for small sizes
  KING_QUEEN_ONLY_COMPONENTS.forEach((compId) => {
    componentOrder[compId]['Double'] = 0;
    componentOrder[compId]['King Single'] = 0;
    componentOrder[compId]['Single'] = 0;
  });

  // Rule 2: Side Panels - Consolidate Single/King Single into Double
  componentOrder['side_panel']['Double'] += componentOrder['side_panel']['Single'];
  componentOrder['side_panel']['Double'] += componentOrder['side_panel']['King Single'];
  componentOrder['side_panel']['Single'] = 0;
  componentOrder['side_panel']['King Single'] = 0;

  // Step 3: Subtract current inventory (only order what's needed)
  COMPONENT_TYPES.forEach((comp) => {
    MATTRESS_SIZES.forEach((size) => {
      const currentStock = componentInventory[comp.id][size.id] || 0;
      componentOrder[comp.id][size.id] = Math.max(0, componentOrder[comp.id][size.id] - currentStock);
    });
  });

  return componentOrder;
}
