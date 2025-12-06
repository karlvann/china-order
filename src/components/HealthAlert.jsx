import React from 'react';
import { MONTHLY_SALES_RATE, LEAD_TIME_WEEKS, CRITICAL_THRESHOLD } from '../lib/constants';

// Calculate coverage in months for each size
function calculateCoverage(inventory) {
  const SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const FIRMNESSES = ['firm', 'medium', 'soft'];
  const coverages = {};

  SIZES.forEach(size => {
    const totalStock = FIRMNESSES.reduce((sum, f) =>
      sum + (inventory[f]?.[size] || 0), 0
    );
    const monthlySales = MONTHLY_SALES_RATE[size] || 1;
    coverages[size] = totalStock / monthlySales;
  });

  return coverages;
}

// Convert months to weeks for urgency messaging
function formatTimeUrgent(months) {
  const weeks = Math.round(months * 4.3);
  if (weeks <= 4) return `${weeks} weeks`;
  if (weeks <= 8) return `${weeks} weeks (~${months.toFixed(1)} mo)`;
  return `${months.toFixed(1)} months`;
}

export default function HealthAlert({ inventory }) {
  const coverages = calculateCoverage(inventory);
  const leadTimeMonths = LEAD_TIME_WEEKS / 4.3; // ~2.3 months

  // Find critical sizes (< CRITICAL_THRESHOLD months coverage)
  const criticalSizes = Object.entries(coverages)
    .filter(([_, cov]) => cov < CRITICAL_THRESHOLD)
    .sort((a, b) => a[1] - b[1]);

  // Find sizes that will run out before container arrives
  const urgentSizes = Object.entries(coverages)
    .filter(([_, cov]) => cov < leadTimeMonths)
    .sort((a, b) => a[1] - b[1]);

  // Determine overall status
  let status, statusColor, statusBg, message, icon;

  if (urgentSizes.length > 0) {
    // Stockout before container arrives - CRITICAL
    const [worstSize, worstCov] = urgentSizes[0];
    status = 'CRITICAL';
    statusColor = '#ef4444';
    statusBg = 'rgba(239, 68, 68, 0.1)';
    icon = '🚨';
    message = `${worstSize} runs out in ~${formatTimeUrgent(worstCov)} — BEFORE container arrives (${LEAD_TIME_WEEKS} weeks)! Order immediately.`;
  } else if (criticalSizes.length > 0) {
    // Some sizes critically low
    const [worstSize, worstCov] = criticalSizes[0];
    status = 'WARNING';
    statusColor = '#f97316';
    statusBg = 'rgba(249, 115, 22, 0.1)';
    icon = '⚠️';
    message = `${criticalSizes.length} size${criticalSizes.length > 1 ? 's' : ''} below ${CRITICAL_THRESHOLD} months coverage. ${worstSize} has only ${formatTimeUrgent(worstCov)} of stock.`;
  } else {
    // All healthy
    status = 'HEALTHY';
    statusColor = '#22c55e';
    statusBg = 'rgba(34, 197, 94, 0.1)';
    icon = '✓';
    message = `All sizes have ${CRITICAL_THRESHOLD}+ months coverage. Inventory is healthy.`;
  }

  return (
    <div style={{ ...styles.container, background: statusBg, borderColor: statusColor }}>
      <div style={styles.content}>
        <div style={styles.iconWrapper}>
          <span style={styles.icon}>{icon}</span>
        </div>
        <div style={styles.textContent}>
          <div style={{ ...styles.status, color: statusColor }}>{status}</div>
          <div style={styles.message}>{message}</div>
        </div>
      </div>

      {criticalSizes.length > 0 && (
        <div style={styles.details}>
          <div style={styles.detailsTitle}>Coverage by Size:</div>
          <div style={styles.sizeList}>
            {Object.entries(coverages)
              .sort((a, b) => a[1] - b[1])
              .slice(0, 5)
              .map(([size, coverage]) => {
                const isCritical = coverage < CRITICAL_THRESHOLD;
                const isUrgent = coverage < leadTimeMonths;
                return (
                  <span
                    key={size}
                    style={{
                      ...styles.sizeBadge,
                      background: isUrgent ? 'rgba(239, 68, 68, 0.2)' :
                                 isCritical ? 'rgba(249, 115, 22, 0.2)' :
                                 'rgba(0,0,0,0.3)',
                      borderColor: isUrgent ? '#ef4444' :
                                   isCritical ? '#f97316' : 'transparent'
                    }}
                  >
                    {size}: {coverage.toFixed(1)}mo
                  </span>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px'
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  iconWrapper: {
    flexShrink: 0
  },
  icon: {
    fontSize: '28px'
  },
  textContent: {
    flex: 1
  },
  status: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  },
  message: {
    fontSize: '15px',
    color: '#d4d4d8',
    lineHeight: '1.4'
  },
  details: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  detailsTitle: {
    fontSize: '12px',
    color: '#71717a',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  sizeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  sizeBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    color: '#fafafa',
    border: '1px solid transparent'
  }
};
