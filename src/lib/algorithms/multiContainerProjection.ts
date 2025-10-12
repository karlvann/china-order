/**
 * Algorithm: Multi-Container Annual Projection
 *
 * Simulates a full year of inventory management with multiple container orders
 * scheduled dynamically to prevent stockouts. This creates a realistic annual
 * ordering plan based on actual depletion rates and lead times.
 */

import type { Inventory, MattressSize, FirmnessType } from '../types';
import type { AnnualProjection, ContainerOrder, InventorySnapshot } from '../types/projection';
import type { SpringOrder, ComponentOrder } from '../types/order';
import type { OrderUrgency } from '../types/calendar';
import { MONTHLY_SALES_RATE, MATTRESS_SIZES, HIGH_VELOCITY_SIZES } from '../constants/sales';
import { FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION } from '../constants/firmness';
import { getSeasonalMultiplier, MONTH_NAMES_FULL } from '../constants/seasonality';
import { LEAD_TIME_WEEKS, MIN_PALLETS, MAX_PALLETS, SPRINGS_PER_PALLET } from '../constants/business';
import { COMPONENT_TYPES } from '../constants/components';
import { calculateKingQueenFirstOrder } from './fillKingQueenFirst';
import { calculateComponentOrder } from './componentCalc';

/**
 * Lead time in months (10 weeks = 2.5 months)
 * MUST BE DEFINED FIRST - used by other constants below
 */
const LEAD_TIME_MONTHS = LEAD_TIME_WEEKS / 4;

/**
 * PREDICTIVE ORDERING STRATEGY: Look-Ahead for Queen Medium
 *
 * Instead of reacting to current stock, we PREDICT when we'll need the container:
 *
 * Goal: Container arrives when Queen Medium = 50-70 units (target: 60)
 * Method:
 *   1. At each month, look ahead 2.5 months (lead time)
 *   2. Calculate: what will QM be in 2.5 months?
 *   3. If QM will be ~60 at that time → ORDER NOW
 *   4. Container arrives exactly when QM hits target!
 *
 * Math:
 *   - QM depletion during lead time = 34/month × 2.5 months = 85 units
 *   - Order trigger: QM between 135-155 (because 135-85=50, 155-85=70)
 *   - This ensures arrival when QM = 50-70 ✓
 */
const TARGET_QUEEN_MEDIUM_AT_ARRIVAL = 60; // Target units at arrival (midpoint of 50-70)
const QUEEN_MEDIUM_MONTHLY_SALES = MONTHLY_SALES_RATE['Queen'] * FIRMNESS_DISTRIBUTION['Queen']['medium'];

// Depletion during JUST the lead time (not including current month)
const QUEEN_MEDIUM_DEPLETION_DURING_LEAD = QUEEN_MEDIUM_MONTHLY_SALES * LEAD_TIME_MONTHS; // 34 × 2.5 = 85 units

// Order trigger range: we want QM to be 50-70 at arrival
// So order when QM is currently 50+85 to 70+85 = 135 to 155
const ORDER_TRIGGER_MIN = 50 + QUEEN_MEDIUM_DEPLETION_DURING_LEAD; // 135 units
const ORDER_TRIGGER_MAX = 70 + QUEEN_MEDIUM_DEPLETION_DURING_LEAD; // 155 units
const ORDER_TRIGGER_QUEEN_MEDIUM = TARGET_QUEEN_MEDIUM_AT_ARRIVAL + QUEEN_MEDIUM_DEPLETION_DURING_LEAD; // 145 units (midpoint)

/**
 * Once we order, bring other sizes to reasonable levels too
 */
const TARGET_COVERAGE_OTHER_SIZES = 2.0; // Months of coverage at arrival for other sizes

/**
 * Comfortable threshold: sizes above this are in good shape
 */
const COMFORTABLE_THRESHOLD = 8;

/**
 * Calculate annual projection with multiple container orders.
 *
 * @param startingInventory - Current inventory state
 * @param currentMonth - Starting month (0-11)
 * @param fixedSpringOrder - Optional: Use this order from Order Builder instead of calculating
 * @param fixedComponentOrder - Optional: Use this component order from Order Builder
 * @param fixedPalletCount - Optional: Use this pallet count from Order Builder
 * @returns Complete annual projection with all scheduled orders
 */
export function calculateAnnualProjection(
  startingInventory: Inventory,
  currentMonth: number = 0,
  fixedSpringOrder?: SpringOrder,
  fixedComponentOrder?: ComponentOrder,
  fixedPalletCount?: number
): AnnualProjection {
  // Validate inputs
  if (!startingInventory || !startingInventory.springs) {
    console.warn('Invalid inventory provided to calculateAnnualProjection');
    return {
      orders: [],
      snapshots: [],
      totalContainers: 0,
      totalPallets: 0,
      totalSprings: 0,
      hasStockout: false,
      stockoutMonths: []
    };
  }

  const orders: ContainerOrder[] = [];
  const snapshots: InventorySnapshot[] = [];

  // Clone starting inventory (we'll mutate it as we project forward)
  let inventory: Inventory = JSON.parse(JSON.stringify(startingInventory));

  // Track pending container arrivals
  const pendingArrivals: Array<{ arrivalMonth: number; order: ContainerOrder }> = [];

  let totalSprings = 0;
  let hasStockout = false;
  const stockoutMonths: number[] = [];

  // **LIMIT TO 2 CONTAINERS MAX** - only plan near-term, recalculate later as time progresses
  const MAX_CONTAINERS = 2;

  // Project forward 12 months
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const monthIndex = (currentMonth + monthOffset) % 12;
    const monthName = MONTH_NAMES_FULL[monthIndex];

    // 1. CHECK FOR ARRIVING CONTAINERS
    // Look for any orders that arrive this month (or earlier - catch up)
    // Use Math.floor to check if arrival is within this month's window
    // e.g., arrivalMonth=2.5 should arrive in month 2 (not wait until month 3)
    const arrivingOrders = pendingArrivals.filter(pa => Math.floor(pa.arrivalMonth) <= monthOffset);

    for (const { order } of arrivingOrders) {
      // Check Queen Medium before adding
      const qmBefore = inventory.springs['medium']['Queen'] || 0;

      // Add springs from arriving container
      inventory = addSpringInventory(inventory, order.springOrder);

      // Check Queen Medium after adding
      const qmAfter = inventory.springs['medium']['Queen'] || 0;
      console.log(`[ARRIVAL] Month ${monthOffset}: QM ${qmBefore} + container → ${qmAfter} (added ${qmAfter - qmBefore})`);

      // Add components from arriving container
      inventory = addComponentInventory(inventory, order.componentOrder);

      // Remove from pending
      const index = pendingArrivals.indexOf(pendingArrivals.find(pa => pa.order.id === order.id)!);
      if (index > -1) {
        pendingArrivals.splice(index, 1);
      }
    }

    // 2. CALCULATE CURRENT COVERAGE
    const coverage = calculateCoverageForAllSizes(inventory, monthIndex);
    const criticalSizes = findCriticalSizes(coverage, pendingArrivals, monthOffset);

    // 3. CHECK FOR STOCKOUTS
    const stockoutSizes = MATTRESS_SIZES.filter(s => getTotalStock(inventory, s.id) <= 0);
    if (stockoutSizes.length > 0) {
      hasStockout = true;
      stockoutMonths.push(monthOffset);
    }

    // 4. DECIDE IF WE NEED TO ORDER
    // Order if we have critical sizes AND haven't reached max containers
    const shouldOrder = criticalSizes.length > 0 && orders.length < MAX_CONTAINERS;

    if (shouldOrder) {
      // Use fixed order from Order Builder if provided, otherwise calculate dynamically
      let palletCount: number;
      let springOrder: SpringOrder;
      let componentOrder: ComponentOrder;

      if (fixedSpringOrder && fixedComponentOrder && fixedPalletCount) {
        // Use Order Builder order (clone it so we don't mutate the original)
        palletCount = fixedPalletCount;
        springOrder = JSON.parse(JSON.stringify(fixedSpringOrder));
        componentOrder = JSON.parse(JSON.stringify(fixedComponentOrder));
        console.log(`[ORDER] Using fixed Order Builder order: ${palletCount} pallets`);
      } else {
        // Calculate dynamically based on current needs
        palletCount = determineOptimalPalletCount(coverage, criticalSizes);
        springOrder = calculateKingQueenFirstOrder(
          palletCount,
          { springs: inventory.springs, components: inventory.components },
          pendingArrivals,
          monthOffset
        );
        componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components);
        console.log(`[ORDER] Calculated dynamic order: ${palletCount} pallets`);
      }

      // Count total springs
      const springsInOrder = springOrder.pallets.reduce((sum, p) => sum + p.total, 0);
      totalSprings += springsInOrder;

      // Create order record
      const order: ContainerOrder = {
        id: `order-${orders.length + 1}`,
        orderMonth: monthOffset,
        orderMonthName: monthName,
        arrivalMonth: monthOffset + LEAD_TIME_MONTHS,
        arrivalMonthName: MONTH_NAMES_FULL[Math.floor((currentMonth + monthOffset + LEAD_TIME_MONTHS) % 12)],
        palletCount,
        springOrder,
        componentOrder,
        reason: generateOrderReason(criticalSizes),
        urgency: determineUrgency(criticalSizes),
        drivingSizes: criticalSizes.map(s => s.size)
      };

      console.log(`[ORDER CREATED] Month ${monthOffset}, Arrives at month ${order.arrivalMonth}`);

      orders.push(order);
      pendingArrivals.push({ arrivalMonth: monthOffset + LEAD_TIME_MONTHS, order });
    }

    // 5. TAKE SNAPSHOT BEFORE DEPLETION
    snapshots.push({
      month: monthOffset,
      monthName,
      inventory: JSON.parse(JSON.stringify(inventory)),
      coverage,
      criticalSizes: criticalSizes.map(c => c.size)
    });

    // 6. DEPLETE INVENTORY (sales for this month)
    inventory = depleteInventory(inventory, monthIndex);
  }

  return {
    orders,
    snapshots,
    totalContainers: orders.length,
    totalPallets: orders.reduce((sum, o) => sum + o.palletCount, 0),
    totalSprings,
    hasStockout,
    stockoutMonths
  };
}

/**
 * Calculate coverage for all mattress size/firmness combinations
 */
function calculateCoverageForAllSizes(
  inventory: Inventory,
  monthIndex: number
): Record<string, number> {
  const coverage: Record<string, number> = {};
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex);

  // Calculate coverage for each size/firmness combination
  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id;
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier;

    FIRMNESS_TYPES.forEach(firmness => {
      const stock = inventory.springs[firmness][size] || 0;
      const firmnessSales = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness];
      const key = `${size}_${firmness}`;
      coverage[key] = firmnessSales > 0 ? stock / firmnessSales : Infinity;
    });

    // Also track total coverage per size (for backward compatibility)
    const totalStock = getTotalStock(inventory, size);
    coverage[size] = monthlySales > 0 ? totalStock / monthlySales : Infinity;
  });

  return coverage;
}

/**
 * Get total stock for a size across all firmnesses
 */
function getTotalStock(inventory: Inventory, size: MattressSize): number {
  return FIRMNESS_TYPES.reduce(
    (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
    0
  );
}

/**
 * Simulate Queen Medium inventory timeline from current month to target month.
 *
 * This properly accounts for:
 * - Monthly consumption
 * - Pending container arrivals at specific times
 * - Interleaving of arrivals and consumption
 *
 * @param startingQM - Current Queen Medium units
 * @param fromMonth - Current month offset
 * @param toMonth - Target month offset (when new order would arrive)
 * @param pendingArrivals - Containers already ordered but not yet arrived
 * @returns Projected QM units at target month
 */
function simulateQueenMediumTimeline(
  startingQM: number,
  fromMonth: number,
  toMonth: number,
  pendingArrivals: Array<{ arrivalMonth: number; order: ContainerOrder }>
): number {
  let qm = startingQM;

  // Create timeline events: arrivals and month boundaries
  interface TimelineEvent {
    time: number;
    type: 'arrival' | 'month_end';
    container?: { arrivalMonth: number; order: ContainerOrder };
  }

  const events: TimelineEvent[] = [];

  // Add arrival events
  for (const pa of pendingArrivals) {
    if (pa.arrivalMonth > fromMonth && pa.arrivalMonth <= toMonth) {
      events.push({ time: pa.arrivalMonth, type: 'arrival', container: pa });
    }
  }

  // Add month-end events
  for (let month = fromMonth; month < toMonth; month++) {
    events.push({ time: month + 1, type: 'month_end' });
  }

  // Sort events by time
  events.sort((a, b) => a.time - b.time);

  // Simulate timeline
  let currentTime = fromMonth;

  for (const event of events) {
    // Deplete from currentTime to event time
    const timeDelta = event.time - currentTime;
    const depletion = QUEEN_MEDIUM_MONTHLY_SALES * timeDelta;
    qm -= depletion;
    qm = Math.max(0, qm);

    // Process event
    if (event.type === 'arrival' && event.container) {
      const queenPallets = event.container.order.springOrder.pallets.filter(p => p.size === 'Queen').length;
      const qmInContainer = queenPallets * SPRINGS_PER_PALLET * FIRMNESS_DISTRIBUTION['Queen']['medium'];
      qm += qmInContainer;
    }

    currentTime = event.time;
  }

  return qm;
}

/**
 * STRATEGY 2: Predictive Look-Ahead
 *
 * Find when QM will hit target level (65), then order 2.5 months before that moment.
 * This prevents cascading by accounting for pending containers in the simulation.
 *
 * @param startingQM - Current Queen Medium units
 * @param startMonth - Current month offset
 * @param pendingArrivals - Containers already ordered but not yet arrived
 * @param targetQM - Target QM level at container arrival (default 65)
 * @returns Month when QM will hit target, or null if not in next 12 months
 */
function findWhenQMHitsTarget(
  startingQM: number,
  startMonth: number,
  pendingArrivals: Array<{ arrivalMonth: number; order: ContainerOrder }>,
  targetQM: number = 65
): number | null {
  let qm = startingQM;
  let currentTime = startMonth;
  const endTime = startMonth + 12; // Look ahead 12 months max
  const timeStep = 0.1; // Simulate in 0.1 month increments for precision

  // Create sorted list of pending arrival times
  const arrivalTimes = pendingArrivals
    .map(pa => ({ time: pa.arrivalMonth, container: pa }))
    .sort((a, b) => a.time - b.time);

  let nextArrivalIndex = 0;

  while (currentTime < endTime) {
    // Check if we've hit target
    if (qm <= targetQM) {
      return currentTime;
    }

    // Calculate next event time (either next arrival or next timestep)
    let nextTime = currentTime + timeStep;
    let hasArrival = false;

    // Check if there's a pending arrival before next timestep
    if (nextArrivalIndex < arrivalTimes.length) {
      const nextArrival = arrivalTimes[nextArrivalIndex];
      if (nextArrival.time >= currentTime && nextArrival.time <= nextTime) {
        nextTime = nextArrival.time;
        hasArrival = true;
      }
    }

    // Deplete to next time
    const timeDelta = nextTime - currentTime;
    qm -= QUEEN_MEDIUM_MONTHLY_SALES * timeDelta;
    qm = Math.max(0, qm);

    // Add arrival if present
    if (hasArrival) {
      const arrival = arrivalTimes[nextArrivalIndex];
      const queenPallets = arrival.container.order.springOrder.pallets.filter(p => p.size === 'Queen').length;
      const qmInContainer = queenPallets * SPRINGS_PER_PALLET * FIRMNESS_DISTRIBUTION['Queen']['medium'];
      qm += qmInContainer;
      nextArrivalIndex++;
    }

    currentTime = nextTime;
  }

  return null; // QM never hits target in next 12 months
}

/**
 * STRATEGY 2: Predictive Look-Ahead
 *
 * Find when QM will hit target (65), then order 2.5 months before that moment.
 * This prevents cascading by accounting for pending containers.
 */
function findCriticalSizes(
  coverage: Record<string, number>,
  pendingArrivals: Array<{ arrivalMonth: number; order: ContainerOrder }>,
  currentMonthOffset: number
): Array<{ size: MattressSize; coverage: number }> {
  // Get Queen Medium coverage (in months)
  const queenMediumCoverage = coverage['Queen_medium'] || 0;

  // Convert to units for comparison
  const queenMediumUnits = queenMediumCoverage * QUEEN_MEDIUM_MONTHLY_SALES;

  // Target QM at container arrival (at the moment of arrival)
  // User wants QM = 65-75 in the WEEK BEFORE arrival
  // Currently getting 61 when targeting 78 - need to go higher
  // Trying 85 to get week before closer to 70
  const TARGET_QM_AT_ARRIVAL = 85;

  // BOOTSTRAP: If QM is critically low (< 100) AND no pending container, order immediately
  if (queenMediumUnits < 100 && pendingArrivals.length === 0) {
    console.log(`[PREDICTIVE] Month ${currentMonthOffset.toFixed(1)}, QM now=${queenMediumUnits.toFixed(0)}, BOOTSTRAP: QM < 100 & no pending, willOrder=true`);

    // Return all sizes that need restocking
    const criticalItems: Array<{ size: MattressSize; coverage: number }> = [];
    MATTRESS_SIZES.forEach(sizeConfig => {
      const size = sizeConfig.id;
      const totalCoverage = coverage[size] || 0;
      const threshold = (size === 'King' || size === 'Queen') ? 4.0 : 3.0;
      if (totalCoverage < threshold) {
        criticalItems.push({ size, coverage: totalCoverage });
      }
    });

    if (!criticalItems.find(item => item.size === 'Queen')) {
      criticalItems.push({ size: 'Queen', coverage: coverage['Queen'] || 0 });
    }

    return criticalItems.sort((a, b) => a.coverage - b.coverage);
  }

  // STEP 1: Find when QM will hit target (accounting for pending containers)
  const targetMonth = findWhenQMHitsTarget(
    queenMediumUnits,
    currentMonthOffset,
    pendingArrivals,
    TARGET_QM_AT_ARRIVAL
  );

  if (targetMonth === null) {
    // QM never hits target in next 12 months - we have plenty of stock
    console.log(`[PREDICTIVE] Month ${currentMonthOffset}, QM now=${queenMediumUnits.toFixed(0)}, target never reached in 12mo, willOrder=false`);
    return [];
  }

  // STEP 2: Calculate ideal order time (2.5 months before target)
  const idealOrderMonth = targetMonth - LEAD_TIME_MONTHS;

  // STEP 3: Check if we're at the ideal order time (within ±0.8 months tolerance)
  // Wider window accounts for monthly discrete decisions (can't order at exact fractional month)
  const timeDiff = Math.abs(currentMonthOffset - idealOrderMonth);
  const isOrderTime = timeDiff <= 0.8;

  // STEP 4: Safety check - don't order if there's already a container arriving near target
  const alreadyCovered = pendingArrivals.some(pa => {
    const arrivalMonth = pa.arrivalMonth;
    return Math.abs(arrivalMonth - targetMonth) < 1.0; // Within 1 month
  });

  const willOrder = isOrderTime && !alreadyCovered;

  console.log(`[PREDICTIVE] Month ${currentMonthOffset.toFixed(1)}, QM now=${queenMediumUnits.toFixed(0)}, target @ ${targetMonth.toFixed(1)}, ideal order @ ${idealOrderMonth.toFixed(1)}, timeDiff=${timeDiff.toFixed(2)}, covered=${alreadyCovered}, willOrder=${willOrder}`);

  if (willOrder) {
    // Return all sizes that need restocking (for display purposes)
    const criticalItems: Array<{ size: MattressSize; coverage: number }> = [];

    MATTRESS_SIZES.forEach(sizeConfig => {
      const size = sizeConfig.id;
      const totalCoverage = coverage[size] || 0;

      // Mark King/Queen if below 4 months, small sizes if below 3 months
      const threshold = (size === 'King' || size === 'Queen') ? 4.0 : 3.0;

      if (totalCoverage < threshold) {
        criticalItems.push({ size, coverage: totalCoverage });
      }
    });

    // Always include Queen (it triggered the order)
    if (!criticalItems.find(item => item.size === 'Queen')) {
      criticalItems.push({ size: 'Queen', coverage: coverage['Queen'] || 0 });
    }

    return criticalItems.sort((a, b) => a.coverage - b.coverage);
  }

  return []; // No order needed
}

/**
 * SIMPLIFIED: Calculate pallet count based on Queen Medium + proportional King/small sizes
 *
 * Once Queen Medium triggers an order, calculate what's needed across all sizes
 */
function determineOptimalPalletCount(
  coverage: Record<MattressSize, number>,
  criticalSizes: Array<{ size: MattressSize; coverage: number }>
): number {
  let palletsNeeded = 0;

  // QUEEN: Work backwards from target of 50 Queen Medium at arrival
  const queenMediumStock = (coverage['Queen_medium'] || 0) * QUEEN_MEDIUM_MONTHLY_SALES;
  const queenMediumProjected = queenMediumStock - QUEEN_MEDIUM_DEPLETION_DURING_LEAD;
  const queenMediumNeed = Math.max(0, TARGET_QUEEN_MEDIUM_AT_ARRIVAL - queenMediumProjected);

  // Queen Medium is 83% of Queen, so total Queen pallets = Queen Medium need / 0.83 / 30
  const totalQueenNeed = queenMediumNeed / FIRMNESS_DISTRIBUTION['Queen']['medium'];
  const queenPallets = Math.ceil(totalQueenNeed / SPRINGS_PER_PALLET);
  palletsNeeded += queenPallets;

  // KING: Calculate similar to Queen, targeting 2 months at arrival
  const kingCoverage = coverage['King'] || Infinity;
  const kingCurrent = kingCoverage * MONTHLY_SALES_RATE['King'];
  const kingProjected = kingCurrent - (MONTHLY_SALES_RATE['King'] * LEAD_TIME_MONTHS);
  const kingTarget = MONTHLY_SALES_RATE['King'] * TARGET_COVERAGE_OTHER_SIZES;
  const kingNeed = Math.max(0, kingTarget - kingProjected);
  palletsNeeded += Math.ceil(kingNeed / SPRINGS_PER_PALLET);

  // SMALL SIZES: 1 pallet each if critical (below 3 months)
  const smallSizesCritical = criticalSizes.filter(s =>
    s.size !== 'King' && s.size !== 'Queen' && s.coverage < 3.0
  );

  palletsNeeded += smallSizesCritical.length;

  // Ensure within container limits (4-12 pallets)
  return Math.max(MIN_PALLETS, Math.min(MAX_PALLETS, palletsNeeded));
}

/**
 * Deplete inventory by one month of sales
 */
function depleteInventory(inventory: Inventory, monthIndex: number): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex);

  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id;
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier;

    // Deplete springs based on firmness distribution (NOT current ratios)
    // This ensures springs deplete according to actual sales patterns
    FIRMNESS_TYPES.forEach(firmness => {
      const currentStock = inventory.springs[firmness][size] || 0;
      const depletion = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness];
      newInventory.springs[firmness][size] = Math.max(0, currentStock - depletion);
    });

    // Deplete components based on mattress sales × component multiplier
    // Example: 30 King mattresses × 1.5 micro coils = 45 micro coils depleted
    Object.keys(inventory.components).forEach(componentId => {
      const currentComponentStock = inventory.components[componentId][size] || 0;

      // Find component multiplier (defaults to 1.0 if not found)
      const componentConfig = COMPONENT_TYPES.find(c => c.id === componentId);
      const multiplier = componentConfig?.multiplier || 1.0;

      // Deplete: mattress sales × multiplier
      const componentDepletion = monthlySales * multiplier;

      // Special case: Side Panel consolidation
      // Single and King Single side panels are ordered/stored as Double
      // So deplete their usage from Double inventory
      if (componentId === 'side_panel' && (size === 'Single' || size === 'King Single')) {
        // Deplete from Double inventory instead
        const doubleStock = newInventory.components[componentId]['Double'] || 0;
        newInventory.components[componentId]['Double'] = Math.max(0, doubleStock - componentDepletion);
        // Don't deplete from Single/King Single (they stay at 0)
        newInventory.components[componentId][size] = 0;
      } else {
        newInventory.components[componentId][size] = Math.max(0, currentComponentStock - componentDepletion);
      }
    });
  });

  return newInventory;
}

/**
 * Add springs from an order to inventory
 */
function addSpringInventory(inventory: Inventory, springOrder: SpringOrder): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));

  // Each pallet has a size and firmness_breakdown
  // Example: { size: 'King', firmness_breakdown: { firm: 10, medium: 20 } }
  springOrder.pallets.forEach(pallet => {
    const size = pallet.size;

    // Add each firmness quantity to inventory
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, quantity]) => {
      const currentStock = newInventory.springs[firmness as FirmnessType][size] || 0;
      newInventory.springs[firmness as FirmnessType][size] = currentStock + quantity;
    });
  });

  return newInventory;
}

/**
 * Add components from an order to inventory
 */
function addComponentInventory(inventory: Inventory, componentOrder: ComponentOrder): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));

  // Iterate through each component type (micro_coils, felt, etc.)
  Object.entries(componentOrder).forEach(([componentId, sizes]) => {
    // Iterate through each size for this component
    Object.entries(sizes).forEach(([size, quantity]) => {
      const currentStock = newInventory.components[componentId][size as MattressSize] || 0;
      newInventory.components[componentId][size as MattressSize] = currentStock + quantity;
    });
  });

  return newInventory;
}

/**
 * Generate human-readable reason for order
 */
function generateOrderReason(criticalSizes: Array<{ size: MattressSize; coverage: number }>): string {
  if (criticalSizes.length === 0) return 'Routine restocking';

  const names = criticalSizes.slice(0, 2).map(s => s.size);

  if (names.length === 1) {
    return `${names[0]} reaching critical levels`;
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} reaching critical levels`;
  } else {
    return `${names[0]}, ${names[1]}, and ${criticalSizes.length - 2} other sizes critical`;
  }
}

/**
 * Determine urgency level
 */
function determineUrgency(criticalSizes: Array<{ size: MattressSize; coverage: number }>): OrderUrgency {
  if (criticalSizes.length === 0) return 'comfortable';

  const highVelocityCritical = criticalSizes.some(s => s.size === 'King' || s.size === 'Queen');
  const minCoverage = Math.min(...criticalSizes.map(s => s.coverage));

  if (minCoverage < 2 || highVelocityCritical) return 'urgent';
  if (minCoverage < 3) return 'plan_soon';
  return 'comfortable';
}
