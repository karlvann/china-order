/**
 * Simple Repeat Order Projection
 *
 * Takes the Order Builder order and repeats it at fixed intervals.
 * This gives the user full control over WHAT gets ordered while
 * showing the long-term impact of repeating that same order.
 */

import type { Inventory, MattressSize, FirmnessType } from '../types';
import type { SpringOrder, ComponentOrder } from '../types/order';
import type { AnnualProjection, ContainerOrder, InventorySnapshot } from '../types/projection';
import { MONTHLY_SALES_RATE, MATTRESS_SIZES } from '../constants/sales';
import { FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION } from '../constants/firmness';
import { getSeasonalMultiplier, MONTH_NAMES_FULL } from '../constants/seasonality';
import { LEAD_TIME_WEEKS } from '../constants/business';
import { COMPONENT_TYPES } from '../constants/components';

const LEAD_TIME_MONTHS = LEAD_TIME_WEEKS / 4; // 10 weeks = 2.5 months

/**
 * Create projection by repeating the same order at fixed intervals
 */
export function createRepeatOrderProjection(
  startingInventory: Inventory,
  springOrder: SpringOrder,
  componentOrder: ComponentOrder,
  palletCount: number,
  currentMonth: number = 0,
  numOrders: number = 2
): AnnualProjection {
  const orders: ContainerOrder[] = [];
  const snapshots: InventorySnapshot[] = [];

  let inventory: Inventory = JSON.parse(JSON.stringify(startingInventory));
  const pendingArrivals: Array<{ arrivalMonth: number; order: ContainerOrder }> = [];

  let totalSprings = 0;
  let hasStockout = false;
  const stockoutMonths: number[] = [];

  // Calculate spacing between orders (spread evenly across 12 months)
  const spacing = 12 / (numOrders + 1);

  // Create orders at fixed intervals
  for (let i = 0; i < numOrders; i++) {
    const orderMonth = Math.round((i + 1) * spacing);
    const arrivalMonth = orderMonth + LEAD_TIME_MONTHS;

    const order: ContainerOrder = {
      id: `order-${i + 1}`,
      orderMonth,
      orderMonthName: MONTH_NAMES_FULL[orderMonth % 12],
      arrivalMonth,
      arrivalMonthName: MONTH_NAMES_FULL[Math.floor(arrivalMonth) % 12],
      palletCount,
      springOrder: JSON.parse(JSON.stringify(springOrder)),
      componentOrder: JSON.parse(JSON.stringify(componentOrder)),
      reason: 'Scheduled order from Order Builder',
      urgency: 'comfortable',
      drivingSizes: []
    };

    orders.push(order);
    pendingArrivals.push({ arrivalMonth, order });
    totalSprings += springOrder.pallets.reduce((sum, p) => sum + p.total, 0);
  }

  // Project forward 12 months
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const monthIndex = (currentMonth + monthOffset) % 12;
    const monthName = MONTH_NAMES_FULL[monthIndex];

    // Check for arriving containers
    const arrivingOrders = pendingArrivals.filter(pa => Math.floor(pa.arrivalMonth) <= monthOffset);

    for (const { order } of arrivingOrders) {
      inventory = addSpringInventory(inventory, order.springOrder);
      inventory = addComponentInventory(inventory, order.componentOrder);

      const index = pendingArrivals.findIndex(pa => pa.order.id === order.id);
      if (index > -1) {
        pendingArrivals.splice(index, 1);
      }
    }

    // Calculate coverage
    const coverage = calculateCoverageForAllSizes(inventory, monthIndex);

    // Check for stockouts
    const stockoutSizes = MATTRESS_SIZES.filter(s => getTotalStock(inventory, s.id) <= 0);
    if (stockoutSizes.length > 0) {
      hasStockout = true;
      stockoutMonths.push(monthOffset);
    }

    // Take snapshot
    snapshots.push({
      month: monthOffset,
      monthName,
      inventory: JSON.parse(JSON.stringify(inventory)),
      coverage,
      criticalSizes: []
    });

    // Deplete inventory
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

function calculateCoverageForAllSizes(inventory: Inventory, monthIndex: number): Record<string, number> {
  const coverage: Record<string, number> = {};
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex);

  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id;
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier;

    FIRMNESS_TYPES.forEach(firmness => {
      const stock = inventory.springs[firmness][size] || 0;
      const firmnessSales = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness];
      const key = `${size}_${firmness}`;
      coverage[key] = firmnessSales > 0 ? stock / firmnessSales : Infinity;
    });

    const totalStock = getTotalStock(inventory, size);
    coverage[size] = monthlySales > 0 ? totalStock / monthlySales : Infinity;
  });

  return coverage;
}

function getTotalStock(inventory: Inventory, size: MattressSize): number {
  return FIRMNESS_TYPES.reduce(
    (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
    0
  );
}

function depleteInventory(inventory: Inventory, monthIndex: number): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex);

  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id;
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier;

    FIRMNESS_TYPES.forEach(firmness => {
      const currentStock = inventory.springs[firmness][size] || 0;
      const depletion = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness];
      newInventory.springs[firmness][size] = Math.max(0, currentStock - depletion);
    });

    Object.keys(inventory.components).forEach(componentId => {
      const currentComponentStock = inventory.components[componentId][size] || 0;
      const componentConfig = COMPONENT_TYPES.find(c => c.id === componentId);
      const multiplier = componentConfig?.multiplier || 1.0;
      const componentDepletion = monthlySales * multiplier;

      if (componentId === 'side_panel' && (size === 'Single' || size === 'King Single')) {
        const doubleStock = newInventory.components[componentId]['Double'] || 0;
        newInventory.components[componentId]['Double'] = Math.max(0, doubleStock - componentDepletion);
        newInventory.components[componentId][size] = 0;
      } else {
        newInventory.components[componentId][size] = Math.max(0, currentComponentStock - componentDepletion);
      }
    });
  });

  return newInventory;
}

function addSpringInventory(inventory: Inventory, springOrder: SpringOrder): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));

  springOrder.pallets.forEach(pallet => {
    const size = pallet.size;
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, quantity]) => {
      const currentStock = newInventory.springs[firmness as FirmnessType][size] || 0;
      newInventory.springs[firmness as FirmnessType][size] = currentStock + quantity;
    });
  });

  return newInventory;
}

function addComponentInventory(inventory: Inventory, componentOrder: ComponentOrder): Inventory {
  const newInventory: Inventory = JSON.parse(JSON.stringify(inventory));

  Object.entries(componentOrder).forEach(([componentId, sizes]) => {
    Object.entries(sizes).forEach(([size, quantity]) => {
      const currentStock = newInventory.components[componentId][size as MattressSize] || 0;
      newInventory.components[componentId][size as MattressSize] = currentStock + quantity;
    });
  });

  return newInventory;
}
