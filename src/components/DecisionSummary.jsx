import React from 'react';

// Constants
const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
const FIRMNESS_TYPES = ['firm', 'medium', 'soft'];
const CRITICAL_THRESHOLD_MONTHS = 3;

// Firmness distribution for calculating SKU-level usage
const FIRMNESS_DISTRIBUTION = {
  'King': { firm: 0.1356, medium: 0.8446, soft: 0.0198 },
  'Queen': { firm: 0.1344, medium: 0.8269, soft: 0.0387 },
  'Double': { firm: 0.2121, medium: 0.6061, soft: 0.1818 },
  'King Single': { firm: 0.1622, medium: 0.6216, soft: 0.2162 },
  'Single': { firm: 0.2500, medium: 0.5833, soft: 0.1667 }
};

// Default monthly sales rates
const DEFAULT_MONTHLY_SALES = {
  'King': 30,
  'Queen': 41,
  'Double': 6,
  'King Single': 3,
  'Single': 1
};

// Get all SKU coverages (size_firmness -> months)
function getAllSKUCoverages(springs, usageRates = null) {
  const coverages = {};
  const monthlySalesRate = usageRates?.MONTHLY_SALES_RATE || DEFAULT_MONTHLY_SALES;

  for (const size of MATTRESS_SIZES) {
    for (const firmness of FIRMNESS_TYPES) {
      const stock = springs[firmness]?.[size] || 0;
      const monthlyUsage = monthlySalesRate[size] * FIRMNESS_DISTRIBUTION[size][firmness];
      const coverage = monthlyUsage > 0 ? stock / monthlyUsage : (stock > 0 ? Infinity : 0);
      coverages[`${size}_${firmness}`] = coverage;
    }
  }

  return coverages;
}

// Get total springs ordered
function getTotalOrdered(springOrder) {
  if (!springOrder?.springs) return 0;
  let total = 0;
  for (const firmness of FIRMNESS_TYPES) {
    for (const size of MATTRESS_SIZES) {
      total += springOrder.springs[firmness]?.[size] || 0;
    }
  }
  return total;
}

// Decision Summary - Shows WHY this order makes sense with before/after coverage
export default function DecisionSummary({ inventory, springOrder, usageRates = null }) {
  if (!springOrder?.springs) {
    return null;
  }

  const coveragesBefore = getAllSKUCoverages(inventory.springs, usageRates);
  const totalOrdered = getTotalOrdered(springOrder);

  // Calculate after coverage (inventory + order)
  const springsAfter = {};
  for (const firmness of FIRMNESS_TYPES) {
    springsAfter[firmness] = {};
    for (const size of MATTRESS_SIZES) {
      springsAfter[firmness][size] =
        (inventory.springs[firmness]?.[size] || 0) +
        (springOrder.springs[firmness]?.[size] || 0);
    }
  }
  const coveragesAfter = getAllSKUCoverages(springsAfter, usageRates);

  // Find critical SKUs (before order)
  const criticalBefore = Object.entries(coveragesBefore)
    .filter(([_, cov]) => cov < CRITICAL_THRESHOLD_MONTHS)
    .sort((a, b) => a[1] - b[1]);

  // Find lowest coverage after order
  const lowestAfter = Object.entries(coveragesAfter)
    .filter(([_, cov]) => cov !== Infinity)
    .sort((a, b) => a[1] - b[1])[0];

  // Calculate container breakdown by SIZE
  const sizeBreakdown = {};
  for (const size of MATTRESS_SIZES) {
    sizeBreakdown[size] = FIRMNESS_TYPES.reduce(
      (sum, f) => sum + (springOrder.springs[f]?.[size] || 0), 0
    );
  }

  // Calculate container breakdown by FIRMNESS
  const firmTotal = MATTRESS_SIZES.reduce((sum, s) => sum + (springOrder.springs.firm?.[s] || 0), 0);
  const mediumTotal = MATTRESS_SIZES.reduce((sum, s) => sum + (springOrder.springs.medium?.[s] || 0), 0);
  const softTotal = MATTRESS_SIZES.reduce((sum, s) => sum + (springOrder.springs.soft?.[s] || 0), 0);

  // Calculate percentages
  const sizePcts = {};
  for (const size of MATTRESS_SIZES) {
    sizePcts[size] = totalOrdered > 0 ? Math.round((sizeBreakdown[size] / totalOrdered) * 100) : 0;
  }
  const firmPct = totalOrdered > 0 ? Math.round((firmTotal / totalOrdered) * 100) : 0;
  const mediumPct = totalOrdered > 0 ? Math.round((mediumTotal / totalOrdered) * 100) : 0;
  const softPct = totalOrdered > 0 ? Math.round((softTotal / totalOrdered) * 100) : 0;

  // Colors for sizes
  const sizeColors = {
    'King': '#8b5cf6',
    'Queen': '#3b82f6',
    'Double': '#10b981',
    'King Single': '#f59e0b',
    'Single': '#ef4444'
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>📋</span>
        <span style={styles.headerTitle}>Order Summary</span>
        <span style={styles.headerTotal}>{totalOrdered} springs</span>
      </div>

      {/* Before/After Coverage */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Coverage Change</div>
        <div style={styles.coverageGrid}>
          {criticalBefore.length > 0 ? (
            // Show critical SKUs that get fixed
            criticalBefore.slice(0, 4).map(([key, covBefore]) => {
              const [size, firmness] = key.split('_');
              const covAfter = coveragesAfter[key];
              const isFixed = covAfter >= CRITICAL_THRESHOLD_MONTHS;
              return (
                <div key={key} style={styles.coverageRow}>
                  <span style={styles.skuName}>{size} {firmness}</span>
                  <span style={styles.coverageChange}>
                    <span style={{ color: '#ef4444' }}>{covBefore.toFixed(1)}mo</span>
                    <span style={styles.arrow}> → </span>
                    <span style={{ color: isFixed ? '#22c55e' : '#eab308' }}>{covAfter.toFixed(1)}mo</span>
                  </span>
                </div>
              );
            })
          ) : (
            // All healthy - show general improvement
            <div style={styles.healthyMessage}>
              All SKUs already healthy. This order increases buffer stock.
            </div>
          )}
        </div>

        {/* Result summary */}
        {criticalBefore.length > 0 && (
          <div style={styles.resultBox}>
            <span style={styles.resultIcon}>✓</span>
            <span style={styles.resultText}>
              After order: All SKUs at {lowestAfter ? lowestAfter[1].toFixed(1) : '4+'}+ months coverage
            </span>
          </div>
        )}
      </div>

      {/* Container Breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Container Breakdown</div>

        {/* Size split */}
        <div style={styles.breakdownRow}>
          <span style={styles.breakdownLabel}>Size:</span>
          <div style={styles.barContainer}>
            {MATTRESS_SIZES.filter(s => sizePcts[s] > 0).map(size => (
              <div key={size} style={{
                ...styles.barSegment,
                width: `${sizePcts[size]}%`,
                background: sizeColors[size]
              }}>
                {sizePcts[size] > 12 && <span>{size.split(' ')[0]} {sizePcts[size]}%</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Firmness split */}
        <div style={styles.breakdownRow}>
          <span style={styles.breakdownLabel}>Firmness:</span>
          <div style={styles.barContainer}>
            {firmPct > 0 && (
              <div style={{ ...styles.barSegment, width: `${firmPct}%`, background: '#64748b' }}>
                {firmPct > 10 && <span>F {firmPct}%</span>}
              </div>
            )}
            {mediumPct > 0 && (
              <div style={{ ...styles.barSegment, width: `${mediumPct}%`, background: '#22c55e' }}>
                {mediumPct > 15 && <span>Med {mediumPct}%</span>}
              </div>
            )}
            {softPct > 0 && (
              <div style={{ ...styles.barSegment, width: `${softPct}%`, background: '#eab308' }}>
                {softPct > 10 && <span>Soft {softPct}%</span>}
              </div>
            )}
          </div>
        </div>

        {/* Legend - Size */}
        <div style={styles.legend}>
          {MATTRESS_SIZES.filter(s => sizeBreakdown[s] > 0).map(size => (
            <span key={size} style={styles.legendItem}>
              <span style={{...styles.legendDot, background: sizeColors[size]}}></span>
              {size}: {sizeBreakdown[size]}
            </span>
          ))}
        </div>

        {/* Legend - Firmness */}
        <div style={styles.legend}>
          <span style={styles.legendItem}><span style={{...styles.legendDot, background: '#64748b'}}></span>Firm: {firmTotal}</span>
          <span style={styles.legendItem}><span style={{...styles.legendDot, background: '#22c55e'}}></span>Medium: {mediumTotal}</span>
          <span style={styles.legendItem}><span style={{...styles.legendDot, background: '#eab308'}}></span>Soft: {softTotal}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px'
  },
  headerIcon: {
    fontSize: '20px'
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fafafa',
    flex: 1
  },
  headerTotal: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0ea5e9',
    padding: '4px 10px',
    background: 'rgba(14, 165, 233, 0.15)',
    borderRadius: '6px'
  },
  section: {
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px'
  },
  coverageGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  coverageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#0a0a0a',
    borderRadius: '6px'
  },
  skuName: {
    fontSize: '13px',
    color: '#d4d4d8',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  coverageChange: {
    fontSize: '13px',
    fontFamily: 'monospace'
  },
  arrow: {
    color: '#71717a'
  },
  healthyMessage: {
    padding: '12px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '6px',
    color: '#86efac',
    fontSize: '13px'
  },
  resultBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '10px 12px',
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '6px'
  },
  resultIcon: {
    color: '#22c55e',
    fontSize: '16px'
  },
  resultText: {
    color: '#86efac',
    fontSize: '13px',
    fontWeight: '500'
  },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px'
  },
  breakdownLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    width: '70px',
    flexShrink: 0
  },
  barContainer: {
    flex: 1,
    display: 'flex',
    height: '24px',
    borderRadius: '4px',
    overflow: 'hidden',
    background: '#0a0a0a'
  },
  barSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
    transition: 'width 0.3s'
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '8px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#a1a1aa'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  }
};
