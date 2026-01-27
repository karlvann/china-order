/**
 * Algorithm: Multi-Container Annual Projection
 *
 * Simulates a full year of inventory management with multiple container orders
 * scheduled dynamically to prevent stockouts.
 */

import { MONTHLY_SALES_RATE, MATTRESS_SIZES, HIGH_VELOCITY_SIZES } from '../constants/sales.js'
import { FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION } from '../constants/firmness.js'
import { getSeasonalMultiplier, MONTH_NAMES_FULL } from '../constants/seasonality.js'
import { LEAD_TIME_WEEKS, MIN_PALLETS, MAX_PALLETS, SPRINGS_PER_PALLET } from '../constants/business.js'
import { COMPONENT_TYPES } from '../constants/components.js'
import { calculateKingQueenFirstOrder } from './fillKingQueenFirst.js'
import { calculateComponentOrder } from './componentCalc.js'

const LEAD_TIME_MONTHS = LEAD_TIME_WEEKS / 4
const TARGET_QUEEN_MEDIUM_AT_ARRIVAL = 60
const QUEEN_MEDIUM_MONTHLY_SALES = MONTHLY_SALES_RATE['Queen'] * FIRMNESS_DISTRIBUTION['Queen']['medium']
const QUEEN_MEDIUM_DEPLETION_DURING_LEAD = QUEEN_MEDIUM_MONTHLY_SALES * LEAD_TIME_MONTHS
const TARGET_COVERAGE_OTHER_SIZES = 2.0
const COMFORTABLE_THRESHOLD = 8

/**
 * Calculate annual projection with multiple container orders.
 */
export function calculateAnnualProjection(
  startingInventory,
  currentMonth = 0,
  fixedSpringOrder,
  fixedComponentOrder,
  fixedPalletCount
) {
  if (!startingInventory || !startingInventory.springs) {
    console.warn('Invalid inventory provided to calculateAnnualProjection')
    return {
      orders: [],
      snapshots: [],
      totalContainers: 0,
      totalPallets: 0,
      totalSprings: 0,
      hasStockout: false,
      stockoutMonths: []
    }
  }

  const orders = []
  const snapshots = []
  let inventory = JSON.parse(JSON.stringify(startingInventory))
  const pendingArrivals = []
  let totalSprings = 0
  let hasStockout = false
  const stockoutMonths = []
  const MAX_CONTAINERS = 2

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const monthIndex = (currentMonth + monthOffset) % 12
    const monthName = MONTH_NAMES_FULL[monthIndex]

    // Check for arriving containers
    const arrivingOrders = pendingArrivals.filter(pa => Math.floor(pa.arrivalMonth) <= monthOffset)

    for (const { order } of arrivingOrders) {
      const qmBefore = inventory.springs['medium']['Queen'] || 0
      inventory = addSpringInventory(inventory, order.springOrder)
      const qmAfter = inventory.springs['medium']['Queen'] || 0
      console.log(`[ARRIVAL] Month ${monthOffset}: QM ${qmBefore} + container → ${qmAfter} (added ${qmAfter - qmBefore})`)

      inventory = addComponentInventory(inventory, order.componentOrder)

      const index = pendingArrivals.indexOf(pendingArrivals.find(pa => pa.order.id === order.id))
      if (index > -1) {
        pendingArrivals.splice(index, 1)
      }
    }

    const coverage = calculateCoverageForAllSizes(inventory, monthIndex)
    const criticalSizes = findCriticalSizes(coverage, pendingArrivals, monthOffset)

    const stockoutSizes = MATTRESS_SIZES.filter(s => getTotalStock(inventory, s.id) <= 0)
    if (stockoutSizes.length > 0) {
      hasStockout = true
      stockoutMonths.push(monthOffset)
    }

    const shouldOrder = criticalSizes.length > 0 && orders.length < MAX_CONTAINERS

    if (shouldOrder) {
      let palletCount
      let springOrder
      let componentOrder

      if (fixedSpringOrder && fixedComponentOrder && fixedPalletCount) {
        palletCount = fixedPalletCount
        springOrder = JSON.parse(JSON.stringify(fixedSpringOrder))
        componentOrder = JSON.parse(JSON.stringify(fixedComponentOrder))
        console.log(`[ORDER] Using fixed Order Builder order: ${palletCount} pallets`)
      } else {
        palletCount = determineOptimalPalletCount(coverage, criticalSizes)
        springOrder = calculateKingQueenFirstOrder(
          palletCount,
          { springs: inventory.springs, components: inventory.components },
          pendingArrivals,
          monthOffset
        )
        componentOrder = calculateComponentOrder(springOrder, inventory.springs, inventory.components)
        console.log(`[ORDER] Calculated dynamic order: ${palletCount} pallets`)
      }

      const springsInOrder = springOrder.pallets.reduce((sum, p) => sum + p.total, 0)
      totalSprings += springsInOrder

      const order = {
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
      }

      console.log(`[ORDER CREATED] Month ${monthOffset}, Arrives at month ${order.arrivalMonth}`)

      orders.push(order)
      pendingArrivals.push({ arrivalMonth: monthOffset + LEAD_TIME_MONTHS, order })
    }

    snapshots.push({
      month: monthOffset,
      monthName,
      inventory: JSON.parse(JSON.stringify(inventory)),
      coverage,
      criticalSizes: criticalSizes.map(c => c.size)
    })

    inventory = depleteInventory(inventory, monthIndex)
  }

  return {
    orders,
    snapshots,
    totalContainers: orders.length,
    totalPallets: orders.reduce((sum, o) => sum + o.palletCount, 0),
    totalSprings,
    hasStockout,
    stockoutMonths
  }
}

function calculateCoverageForAllSizes(inventory, monthIndex) {
  const coverage = {}
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex)

  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier

    FIRMNESS_TYPES.forEach(firmness => {
      const stock = inventory.springs[firmness][size] || 0
      const firmnessSales = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness]
      const key = `${size}_${firmness}`
      coverage[key] = firmnessSales > 0 ? stock / firmnessSales : Infinity
    })

    const totalStock = getTotalStock(inventory, size)
    coverage[size] = monthlySales > 0 ? totalStock / monthlySales : Infinity
  })

  return coverage
}

function getTotalStock(inventory, size) {
  return FIRMNESS_TYPES.reduce(
    (sum, firmness) => sum + (inventory.springs[firmness][size] || 0),
    0
  )
}

function findWhenQMHitsTarget(startingQM, startMonth, pendingArrivals, targetQM = 65) {
  let qm = startingQM
  let currentTime = startMonth
  const endTime = startMonth + 12
  const timeStep = 0.1

  const arrivalTimes = pendingArrivals
    .map(pa => ({ time: pa.arrivalMonth, container: pa }))
    .sort((a, b) => a.time - b.time)

  let nextArrivalIndex = 0

  while (currentTime < endTime) {
    if (qm <= targetQM) {
      return currentTime
    }

    let nextTime = currentTime + timeStep
    let hasArrival = false

    if (nextArrivalIndex < arrivalTimes.length) {
      const nextArrival = arrivalTimes[nextArrivalIndex]
      if (nextArrival.time >= currentTime && nextArrival.time <= nextTime) {
        nextTime = nextArrival.time
        hasArrival = true
      }
    }

    const timeDelta = nextTime - currentTime
    qm -= QUEEN_MEDIUM_MONTHLY_SALES * timeDelta
    qm = Math.max(0, qm)

    if (hasArrival) {
      const arrival = arrivalTimes[nextArrivalIndex]
      const queenPallets = arrival.container.order.springOrder.pallets.filter(p => p.size === 'Queen').length
      const qmInContainer = queenPallets * SPRINGS_PER_PALLET * FIRMNESS_DISTRIBUTION['Queen']['medium']
      qm += qmInContainer
      nextArrivalIndex++
    }

    currentTime = nextTime
  }

  return null
}

function findCriticalSizes(coverage, pendingArrivals, currentMonthOffset) {
  const queenMediumCoverage = coverage['Queen_medium'] || 0
  const queenMediumUnits = queenMediumCoverage * QUEEN_MEDIUM_MONTHLY_SALES
  const TARGET_QM_AT_ARRIVAL = 85

  if (queenMediumUnits < 100 && pendingArrivals.length === 0) {
    console.log(`[PREDICTIVE] Month ${currentMonthOffset.toFixed(1)}, QM now=${queenMediumUnits.toFixed(0)}, BOOTSTRAP: QM < 100 & no pending, willOrder=true`)

    const criticalItems = []
    MATTRESS_SIZES.forEach(sizeConfig => {
      const size = sizeConfig.id
      const totalCoverage = coverage[size] || 0
      const threshold = (size === 'King' || size === 'Queen') ? 4.0 : 3.0
      if (totalCoverage < threshold) {
        criticalItems.push({ size, coverage: totalCoverage })
      }
    })

    if (!criticalItems.find(item => item.size === 'Queen')) {
      criticalItems.push({ size: 'Queen', coverage: coverage['Queen'] || 0 })
    }

    return criticalItems.sort((a, b) => a.coverage - b.coverage)
  }

  const targetMonth = findWhenQMHitsTarget(
    queenMediumUnits,
    currentMonthOffset,
    pendingArrivals,
    TARGET_QM_AT_ARRIVAL
  )

  if (targetMonth === null) {
    console.log(`[PREDICTIVE] Month ${currentMonthOffset}, QM now=${queenMediumUnits.toFixed(0)}, target never reached in 12mo, willOrder=false`)
    return []
  }

  const idealOrderMonth = targetMonth - LEAD_TIME_MONTHS
  const timeDiff = Math.abs(currentMonthOffset - idealOrderMonth)
  const isOrderTime = timeDiff <= 0.8

  const alreadyCovered = pendingArrivals.some(pa => {
    const arrivalMonth = pa.arrivalMonth
    return Math.abs(arrivalMonth - targetMonth) < 1.0
  })

  const willOrder = isOrderTime && !alreadyCovered

  console.log(`[PREDICTIVE] Month ${currentMonthOffset.toFixed(1)}, QM now=${queenMediumUnits.toFixed(0)}, target @ ${targetMonth.toFixed(1)}, ideal order @ ${idealOrderMonth.toFixed(1)}, timeDiff=${timeDiff.toFixed(2)}, covered=${alreadyCovered}, willOrder=${willOrder}`)

  if (willOrder) {
    const criticalItems = []

    MATTRESS_SIZES.forEach(sizeConfig => {
      const size = sizeConfig.id
      const totalCoverage = coverage[size] || 0
      const threshold = (size === 'King' || size === 'Queen') ? 4.0 : 3.0

      if (totalCoverage < threshold) {
        criticalItems.push({ size, coverage: totalCoverage })
      }
    })

    if (!criticalItems.find(item => item.size === 'Queen')) {
      criticalItems.push({ size: 'Queen', coverage: coverage['Queen'] || 0 })
    }

    return criticalItems.sort((a, b) => a.coverage - b.coverage)
  }

  return []
}

function determineOptimalPalletCount(coverage, criticalSizes) {
  let palletsNeeded = 0

  const queenMediumStock = (coverage['Queen_medium'] || 0) * QUEEN_MEDIUM_MONTHLY_SALES
  const queenMediumProjected = queenMediumStock - QUEEN_MEDIUM_DEPLETION_DURING_LEAD
  const queenMediumNeed = Math.max(0, TARGET_QUEEN_MEDIUM_AT_ARRIVAL - queenMediumProjected)

  const totalQueenNeed = queenMediumNeed / FIRMNESS_DISTRIBUTION['Queen']['medium']
  const queenPallets = Math.ceil(totalQueenNeed / SPRINGS_PER_PALLET)
  palletsNeeded += queenPallets

  const kingCoverage = coverage['King'] || Infinity
  const kingCurrent = kingCoverage * MONTHLY_SALES_RATE['King']
  const kingProjected = kingCurrent - (MONTHLY_SALES_RATE['King'] * LEAD_TIME_MONTHS)
  const kingTarget = MONTHLY_SALES_RATE['King'] * TARGET_COVERAGE_OTHER_SIZES
  const kingNeed = Math.max(0, kingTarget - kingProjected)
  palletsNeeded += Math.ceil(kingNeed / SPRINGS_PER_PALLET)

  const smallSizesCritical = criticalSizes.filter(s =>
    s.size !== 'King' && s.size !== 'Queen' && s.coverage < 3.0
  )

  palletsNeeded += smallSizesCritical.length

  return Math.max(MIN_PALLETS, Math.min(MAX_PALLETS, palletsNeeded))
}

function depleteInventory(inventory, monthIndex) {
  const newInventory = JSON.parse(JSON.stringify(inventory))
  const seasonalMultiplier = getSeasonalMultiplier(monthIndex)

  MATTRESS_SIZES.forEach(sizeConfig => {
    const size = sizeConfig.id
    const monthlySales = MONTHLY_SALES_RATE[size] * seasonalMultiplier

    FIRMNESS_TYPES.forEach(firmness => {
      const currentStock = inventory.springs[firmness][size] || 0
      const depletion = monthlySales * FIRMNESS_DISTRIBUTION[size][firmness]
      newInventory.springs[firmness][size] = Math.max(0, currentStock - depletion)
    })

    Object.keys(inventory.components).forEach(componentId => {
      const currentComponentStock = inventory.components[componentId][size] || 0
      const componentConfig = COMPONENT_TYPES.find(c => c.id === componentId)
      const multiplier = componentConfig?.multiplier || 1.0
      const componentDepletion = monthlySales * multiplier

      if (componentId === 'side_panel' && (size === 'Single' || size === 'King Single')) {
        const doubleStock = newInventory.components[componentId]['Double'] || 0
        newInventory.components[componentId]['Double'] = Math.max(0, doubleStock - componentDepletion)
        newInventory.components[componentId][size] = 0
      } else {
        newInventory.components[componentId][size] = Math.max(0, currentComponentStock - componentDepletion)
      }
    })
  })

  return newInventory
}

function addSpringInventory(inventory, springOrder) {
  const newInventory = JSON.parse(JSON.stringify(inventory))

  springOrder.pallets.forEach(pallet => {
    const size = pallet.size

    Object.entries(pallet.firmness_breakdown).forEach(([firmness, quantity]) => {
      const currentStock = newInventory.springs[firmness][size] || 0
      newInventory.springs[firmness][size] = currentStock + quantity
    })
  })

  return newInventory
}

function addComponentInventory(inventory, componentOrder) {
  const newInventory = JSON.parse(JSON.stringify(inventory))

  Object.entries(componentOrder).forEach(([componentId, sizes]) => {
    Object.entries(sizes).forEach(([size, quantity]) => {
      const currentStock = newInventory.components[componentId][size] || 0
      newInventory.components[componentId][size] = currentStock + quantity
    })
  })

  return newInventory
}

function generateOrderReason(criticalSizes) {
  if (criticalSizes.length === 0) return 'Routine restocking'

  const names = criticalSizes.slice(0, 2).map(s => s.size)

  if (names.length === 1) {
    return `${names[0]} reaching critical levels`
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} reaching critical levels`
  } else {
    return `${names[0]}, ${names[1]}, and ${criticalSizes.length - 2} other sizes critical`
  }
}

function determineUrgency(criticalSizes) {
  if (criticalSizes.length === 0) return 'comfortable'

  const highVelocityCritical = criticalSizes.some(s => s.size === 'King' || s.size === 'Queen')
  const minCoverage = Math.min(...criticalSizes.map(s => s.coverage))

  if (minCoverage < 2 || highVelocityCritical) return 'urgent'
  if (minCoverage < 3) return 'plan_soon'
  return 'comfortable'
}
