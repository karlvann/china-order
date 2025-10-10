// Stockout Simulation - Node.js Version
// Tests all 6 scenarios to find stockouts

// Business constants
const SALES_RATES = {
  King: 30,
  Queen: 41,
  Double: 6,
  'King Single': 3,
  Single: 1
};

const FIRMNESS_DISTRIBUTION = {
  King: { firm: 0.1356, medium: 0.8446, soft: 0.0198 },
  Queen: { firm: 0.1344, medium: 0.8269, soft: 0.0387 },
  Double: { firm: 0.2121, medium: 0.6061, soft: 0.1818 },
  'King Single': { firm: 0.1622, medium: 0.6216, soft: 0.2162 },
  Single: { firm: 0.2500, medium: 0.5833, soft: 0.1667 }
};

const SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
const FIRMNESSES = ['firm', 'medium', 'soft'];

// Test scenarios
const scenarios = {
  A: {
    name: "Scenario A: Mid-Season Crisis",
    inventory: {
      firm: { King: 25, Queen: 30, Double: 18, 'King Single': 6, Single: 3 },
      medium: { King: 45, Queen: 60, Double: 28, 'King Single': 12, Single: 4 },
      soft: { King: 8, Queen: 12, Double: 8, 'King Single': 4, Single: 2 }
    },
    palletCount: 8,
    smallSizePallets: 1
  },
  B: {
    name: "Scenario B: Balanced Start",
    inventory: {
      firm: { King: 12, Queen: 16, Double: 4, 'King Single': 1, Single: 1 },
      medium: { King: 76, Queen: 102, Double: 11, 'King Single': 6, Single: 2 },
      soft: { King: 2, Queen: 5, Double: 3, 'King Single': 2, Single: 0 }
    },
    palletCount: 8,
    smallSizePallets: 1
  },
  C: {
    name: "Scenario C: Small Size Emergency (Double Medium = 0)",
    inventory: {
      firm: { King: 80, Queen: 110, Double: 8, 'King Single': 10, Single: 5 },
      medium: { King: 152, Queen: 203, Double: 0, 'King Single': 12, Single: 4 },
      soft: { King: 12, Queen: 24, Double: 7, 'King Single': 4, Single: 2 }
    },
    palletCount: 8,
    smallSizePallets: 1
  },
  D: {
    name: "Scenario D: Extreme Imbalance (King Firm = 0)",
    inventory: {
      firm: { King: 0, Queen: 22, Double: 8, 'King Single': 5, Single: 3 },
      medium: { King: 200, Queen: 203, Double: 22, 'King Single': 12, Single: 4 },
      soft: { King: 4, Queen: 10, Double: 7, 'King Single': 4, Single: 2 }
    },
    palletCount: 8,
    smallSizePallets: 1
  },
  E: {
    name: "Scenario E: N+2 Strategy (Two Small Sizes Critical)",
    inventory: {
      firm: { King: 80, Queen: 110, Double: 5, 'King Single': 10, Single: 1 },
      medium: { King: 152, Queen: 203, Double: 5, 'King Single': 12, Single: 0 },
      soft: { King: 12, Queen: 24, Double: 7, 'King Single': 4, Single: 2 }
    },
    palletCount: 8,
    smallSizePallets: 2
  },
  F: {
    name: "Scenario F: Everything Critical",
    inventory: {
      firm: { King: 8, Queen: 11, Double: 2, 'King Single': 1, Single: 0 },
      medium: { King: 38, Queen: 51, Double: 7, 'King Single': 3, Single: 1 },
      soft: { King: 1, Queen: 3, Double: 2, 'King Single': 1, Single: 0 }
    },
    palletCount: 8,
    smallSizePallets: 1
  }
};

function calculateCoverage(stock, size, firmness) {
  const monthlyDepletion = SALES_RATES[size] * FIRMNESS_DISTRIBUTION[size][firmness];
  return stock / monthlyDepletion;
}

function calculateOrder(scenario) {
  const { inventory, palletCount, smallSizePallets } = scenario;

  // Calculate coverage for small sizes (medium firmness only)
  const smallSizes = ['Double', 'King Single', 'Single'];
  const coverages = smallSizes.map(size => {
    const totalStock = inventory.firm[size] + inventory.medium[size] + inventory.soft[size];
    const totalCoverage = totalStock / SALES_RATES[size];
    const mediumCoverage = calculateCoverage(inventory.medium[size], size, 'medium');
    return { size, totalCoverage, mediumCoverage };
  });

  // Layer 1: Skip sizes with > 4 months coverage
  const CRITICAL_THRESHOLD = 4;
  const criticalSizes = coverages
    .filter(c => c.totalCoverage < CRITICAL_THRESHOLD)
    .sort((a, b) => a.mediumCoverage - b.mediumCoverage);

  const criticalCount = Math.min(criticalSizes.length, smallSizePallets);
  const smallSizeAllocation = criticalSizes.slice(0, criticalCount);

  const remainingPallets = palletCount - criticalCount;

  // King vs Queen coverage
  const kingCoverage = (inventory.firm.King + inventory.medium.King + inventory.soft.King) / SALES_RATES.King;
  const queenCoverage = (inventory.firm.Queen + inventory.medium.Queen + inventory.soft.Queen) / SALES_RATES.Queen;

  const queenPallets = queenCoverage <= kingCoverage
    ? Math.round(remainingPallets * 0.6)
    : Math.floor(remainingPallets * 0.4);
  const kingPallets = remainingPallets - queenPallets;

  // Allocate springs to each size
  const order = {};

  // Small sizes
  smallSizeAllocation.forEach(({ size }) => {
    order[size] = allocateSprings(size, 30, inventory);
  });

  // King
  if (kingPallets > 0) {
    order.King = allocateSprings('King', kingPallets * 30, inventory);
  }

  // Queen
  if (queenPallets > 0) {
    order.Queen = allocateSprings('Queen', queenPallets * 30, inventory);
  }

  return { order, allocation: { king: kingPallets, queen: queenPallets, small: criticalCount, skipped: smallSizes.length - criticalCount } };
}

function allocateSprings(size, totalSprings, inventory) {
  const TARGET_MONTHS = 8;
  const allocation = { firm: 0, medium: 0, soft: 0 };

  // Calculate needs
  const needs = {};
  let totalNeed = 0;

  FIRMNESSES.forEach(firmness => {
    const monthlyDepletion = SALES_RATES[size] * FIRMNESS_DISTRIBUTION[size][firmness];
    const target = TARGET_MONTHS * monthlyDepletion;
    const need = Math.max(0, target - inventory[firmness][size]);
    needs[firmness] = need;
    totalNeed += need;
  });

  // Allocate proportionally
  if (totalNeed > 0) {
    FIRMNESSES.forEach(firmness => {
      allocation[firmness] = Math.round((needs[firmness] / totalNeed) * totalSprings);
    });

    // Adjust for rounding errors
    const allocated = allocation.firm + allocation.medium + allocation.soft;
    if (allocated !== totalSprings) {
      const diff = totalSprings - allocated;
      const maxNeedFirmness = Object.keys(needs).reduce((a, b) => needs[a] > needs[b] ? a : b);
      allocation[maxNeedFirmness] += diff;
    }
  }

  return allocation;
}

function simulateMonths(scenario, months = 14) {
  const { inventory } = scenario;
  const { order, allocation } = calculateOrder(scenario);

  // Create inventory tracking
  const stock = {};
  SIZES.forEach(size => {
    stock[size] = {};
    FIRMNESSES.forEach(firmness => {
      stock[size][firmness] = inventory[firmness][size];
    });
  });

  // Track month by month
  const timeline = [];
  const stockouts = [];

  for (let month = 0; month <= months; month++) {
    const monthData = { month, stock: {}, stockouts: [] };

    // Add container at month 3 (10 weeks ≈ 2.5 months, round to 3)
    if (month === 3) {
      SIZES.forEach(size => {
        if (order[size]) {
          FIRMNESSES.forEach(firmness => {
            stock[size][firmness] += order[size][firmness] || 0;
          });
        }
      });
      monthData.containerArrived = true;
    }

    // Record current stock
    SIZES.forEach(size => {
      monthData.stock[size] = {};
      FIRMNESSES.forEach(firmness => {
        monthData.stock[size][firmness] = stock[size][firmness];

        // Check for stockout
        if (stock[size][firmness] < 0) {
          stockouts.push({
            month,
            size,
            firmness,
            deficit: -stock[size][firmness],
            salesRate: SALES_RATES[size]
          });
          monthData.stockouts.push({ size, firmness });
        }
      });
    });

    timeline.push(monthData);

    // Deplete for next month
    if (month < months) {
      SIZES.forEach(size => {
        FIRMNESSES.forEach(firmness => {
          const monthlyDepletion = SALES_RATES[size] * FIRMNESS_DISTRIBUTION[size][firmness];
          stock[size][firmness] -= monthlyDepletion;
        });
      });
    }
  }

  return { timeline, stockouts, order, allocation };
}

// Run all tests
console.log('═══════════════════════════════════════════════════════════════');
console.log('🚨 STOCKOUT SIMULATION - REAL WORLD TEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Testing 14 months of operation with container arrival at Month 3\n');

const allResults = [];

Object.keys(scenarios).forEach(id => {
  const scenario = scenarios[id];
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`📊 ${scenario.name}`);
  console.log('───────────────────────────────────────────────────────────────');

  const { timeline, stockouts, order, allocation } = simulateMonths(scenario);

  // Order summary
  const totalOrder = Object.values(order).reduce((sum, o) =>
    sum + (o.firm || 0) + (o.medium || 0) + (o.soft || 0), 0);

  console.log(`\n📦 Order: ${allocation.king} King + ${allocation.queen} Queen + ${allocation.small} Small (${allocation.skipped} skipped)`);
  console.log(`   Total: ${totalOrder} springs\n`);

  // Analyze stockouts
  if (stockouts.length > 0) {
    const firstStockout = stockouts[0];
    console.log(`🔴 STOCKOUT ALERT: ${stockouts.length} stockouts detected!\n`);
    console.log(`   First stockout: Month ${firstStockout.month}`);
    console.log(`   Item: ${firstStockout.size} ${firstStockout.firmness}`);
    console.log(`   Deficit: ${firstStockout.deficit.toFixed(1)} units (${(firstStockout.deficit / firstStockout.salesRate).toFixed(1)} months worth)\n`);

    // Show first 5 stockouts
    console.log('   Top stockouts:');
    stockouts.slice(0, 5).forEach(s => {
      console.log(`   • Month ${s.month}: ${s.size} ${s.firmness} (${s.deficit.toFixed(0)} units short)`);
    });
    if (stockouts.length > 5) {
      console.log(`   ... and ${stockouts.length - 5} more\n`);
    }

    allResults.push({ scenario: scenario.name, status: 'FAIL', stockouts: stockouts.length, firstMonth: firstStockout.month });
  } else {
    console.log('✅ NO STOCKOUTS - All items remain in stock!\n');

    // Find minimum coverages
    const minCoverages = [];
    SIZES.forEach(size => {
      FIRMNESSES.forEach(firmness => {
        let minCoverage = Infinity;
        let minMonth = 0;
        timeline.forEach(m => {
          const coverage = calculateCoverage(m.stock[size][firmness], size, firmness);
          if (coverage < minCoverage && coverage > 0) {
            minCoverage = coverage;
            minMonth = m.month;
          }
        });
        if (minCoverage < 10) {
          minCoverages.push({ size, firmness, minCoverage, minMonth });
        }
      });
    });

    // Show lowest coverages
    minCoverages.sort((a, b) => a.minCoverage - b.minCoverage);
    console.log('   Lowest coverage reached:');
    minCoverages.slice(0, 3).forEach(c => {
      const status = c.minCoverage < 1 ? '🔴' : c.minCoverage < 2 ? '🟡' : '🟢';
      console.log(`   ${status} ${c.size} ${c.firmness}: ${c.minCoverage.toFixed(2)} months (at Month ${c.minMonth})`);
    });
    console.log('');

    allResults.push({ scenario: scenario.name, status: 'PASS', minCoverage: minCoverages[0] });
  }

  // Timeline visualization
  console.log('   Timeline:');
  let timelineStr = '   ';
  for (let i = 0; i <= 14; i++) {
    const m = timeline[i];
    const hasStockout = m.stockouts.length > 0;
    const hasCritical = SIZES.some(size => {
      return FIRMNESSES.some(firmness => {
        const coverage = calculateCoverage(m.stock[size][firmness], size, firmness);
        return coverage < 2 && coverage > 0;
      });
    });

    if (m.containerArrived) {
      timelineStr += '📦 ';
    } else if (hasStockout) {
      timelineStr += '🔴 ';
    } else if (hasCritical) {
      timelineStr += '🟡 ';
    } else {
      timelineStr += '🟢 ';
    }
  }
  console.log(timelineStr);
  console.log('   M0  M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11 M12 M13 M14');
  console.log('');
});

// Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('📈 SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

const passed = allResults.filter(r => r.status === 'PASS').length;
const failed = allResults.filter(r => r.status === 'FAIL').length;

console.log(`Tests: ${passed} PASS, ${failed} FAIL\n`);

allResults.forEach(r => {
  if (r.status === 'PASS') {
    console.log(`✅ ${r.scenario}`);
    console.log(`   Minimum coverage: ${r.minCoverage.size} ${r.minCoverage.firmness} at ${r.minCoverage.minCoverage.toFixed(2)} months`);
  } else {
    console.log(`🔴 ${r.scenario}`);
    console.log(`   ${r.stockouts} stockouts starting at Month ${r.firstMonth}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Legend: 🟢 Safe (>2mo) | 🟡 Critical (<2mo) | 🔴 Stockout | 📦 Container');
console.log('═══════════════════════════════════════════════════════════════');
