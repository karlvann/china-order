/**
 * Algorithm 5: Component Calculation
 *
 * Derives component orders from spring orders with consolidation rules:
 * - Micro Coils & Thin Latex: King/Queen only (not ordered for small sizes)
 * - Side Panels: Single and King Single consolidated into Double size orders
 * - Inventory subtraction: Only order what's needed (after current stock)
 */

import type { SpringOrder, ComponentOrder, ComponentInventory, SpringInventory } from '../types';
import { COMPONENT_TYPES, MATTRESS_SIZES, FIRMNESS_TYPES, KING_QUEEN_ONLY_COMPONENTS, MONTHLY_SALES_RATE } from '../constants';

/**
 * Calculate component order from spring order.
 *
 * **Algorithm**:
 * 1. Calculate target total component stock to match spring runway:
 *    targetComponentStock = (currentSpringStock + orderedSprings) × multiplier
 * 2. Calculate order needed: targetComponentStock - currentComponentStock
 * 3. Apply consolidation rules:
 *    - Micro Coils/Thin Latex → 0 for small sizes
 *    - Side Panels → Single/King Single added to Double
 * 4. Return final order quantities (never negative)
 *
 * **Why this ensures equal runway:**
 * - Components are ordered proportionally to total spring stock AFTER order
 * - This guarantees springs and components deplete at the same rate
 * - Example: 400 springs total → 600 micro coils (1.5×) → same months coverage
 *
 * @param springOrder - Complete spring order from N+ optimization
 * @param springInventory - Current spring inventory
 * @param componentInventory - Current component inventory
 * @returns Component order quantities by type and size
 *
 * @example
 * ```ts
 * const componentOrder = calculateComponentOrder(springOrder, springInventory, componentInventory);
 * // componentOrder['micro_coils']['Double'] = 0  (not ordered for small sizes)
 * // componentOrder['side_panel']['Double'] = 90  (includes Single + King Single)
 * ```
 */
export function calculateComponentOrder(
  springOrder: SpringOrder,
  springInventory: SpringInventory,
  componentInventory: ComponentInventory
): ComponentOrder {
  const componentOrder: ComponentOrder = {};

  // Step 1: Calculate component orders to match spring runway
  COMPONENT_TYPES.forEach((comp) => {
    componentOrder[comp.id] = {};

    MATTRESS_SIZES.forEach((size) => {
      // Get current spring inventory for this size (all firmnesses)
      const currentSpringStock = FIRMNESS_TYPES.reduce(
        (sum, firmness) => sum + (springInventory[firmness][size.id] || 0),
        0
      );

      // Get ordered springs for this size (all firmnesses)
      const orderedSprings = FIRMNESS_TYPES.reduce(
        (sum, firmness) => sum + (springOrder.springs[firmness][size.id] || 0),
        0
      );

      // Calculate target total component stock to match spring runway
      // targetStock = (currentSprings + orderedSprings) × multiplier
      const targetComponentStock = Math.ceil((currentSpringStock + orderedSprings) * comp.multiplier);

      // Get current component inventory
      const currentComponentStock = componentInventory[comp.id][size.id] || 0;

      // Calculate how many components to order
      const orderNeeded = Math.max(0, targetComponentStock - currentComponentStock);

      componentOrder[comp.id][size.id] = orderNeeded;
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

  return componentOrder;
}
