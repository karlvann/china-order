import React from 'react';

/**
 * CalendarView Component
 *
 * Displays a 12-month calendar showing recommended order dates based on
 * projected inventory depletion. Helps users plan container orders proactively
 * to prevent stockouts while optimizing capital efficiency.
 */
export default function CalendarView({ orderCalendar, styles }) {
  if (!orderCalendar) {
    return (
      <div style={styles.forecastView}>
        <div style={styles.forecastContent}>
          <p style={{ color: '#a1a1aa' }}>Loading calendar...</p>
        </div>
      </div>
    );
  }

  const { recommendations, nextOrder } = orderCalendar;

  return (
    <div style={styles.forecastView}>
      <div style={styles.forecastContent}>
        {/* Header */}
        <div style={styles.forecastHeader}>
          <div>
            <h1 style={styles.forecastTitle}>
              Order Timing Calendar
            </h1>
            <p style={styles.forecastSubtitle}>
              Recommended order dates for the next 12 months based on projected inventory depletion and 10-week lead time.
            </p>
          </div>
        </div>

        {/* Next Order Card (Prominent) */}
        {nextOrder && (
          <div style={calendarStyles.nextOrderCard}>
            <div style={calendarStyles.nextOrderHeader}>
              <div style={calendarStyles.nextOrderBadge}>NEXT ORDER</div>
              <div style={calendarStyles.nextOrderUrgency(nextOrder.urgency)}>
                {getUrgencyLabel(nextOrder.urgency)}
              </div>
            </div>
            <div style={calendarStyles.nextOrderMonth}>{nextOrder.monthName}</div>
            <div style={calendarStyles.nextOrderTiming}>
              {nextOrder.daysUntil === 0 ? 'Order now' : `In ~${Math.round(nextOrder.daysUntil / 30)} month${Math.round(nextOrder.daysUntil / 30) === 1 ? '' : 's'}`}
            </div>
            <div style={calendarStyles.nextOrderReason}>{nextOrder.reason}</div>
            <div style={calendarStyles.nextOrderSizes}>
              <strong>Critical sizes:</strong>{' '}
              {nextOrder.criticalSizes.map(s => `${s.size} (${s.coverage.toFixed(1)}mo)`).join(', ')}
            </div>
          </div>
        )}

        {/* No Orders Needed */}
        {recommendations.length === 0 && (
          <div style={calendarStyles.noOrdersCard}>
            <div style={calendarStyles.noOrdersIcon}>✓</div>
            <div style={calendarStyles.noOrdersTitle}>Inventory Healthy</div>
            <div style={calendarStyles.noOrdersText}>
              All sizes have comfortable coverage for the next 12 months. No orders needed at this time.
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        {recommendations.length > 0 && (
          <div style={calendarStyles.calendarGrid}>
            <div style={calendarStyles.calendarHeader}>All Recommendations</div>
            {recommendations.map((rec, index) => (
              <OrderRecommendationCard
                key={index}
                recommendation={rec}
                isNext={rec === nextOrder}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        <div style={calendarStyles.infoBox}>
          <div style={calendarStyles.infoTitle}>How This Works</div>
          <div style={calendarStyles.infoText}>
            The system projects inventory depletion for 12 months using your sales data and seasonality patterns.
            Order recommendations appear when any size is projected to drop below 3.5 months coverage
            (accounting for the 10-week lead time + 1 month safety buffer).
          </div>
          <div style={calendarStyles.infoText}>
            <strong>Urgency levels:</strong>
          </div>
          <ul style={calendarStyles.infoList}>
            <li style={calendarStyles.infoListItem}>
              <span style={{...calendarStyles.urgencyDot, background: '#ef4444'}}>●</span> Urgent: Order immediately (King/Queen at risk or &lt;1 month away)
            </li>
            <li style={calendarStyles.infoListItem}>
              <span style={{...calendarStyles.urgencyDot, background: '#eab308'}}>●</span> Plan Soon: Start planning (1-3 months away or King/Queen affected)
            </li>
            <li style={calendarStyles.infoListItem}>
              <span style={{...calendarStyles.urgencyDot, background: '#22c55e'}}>●</span> Comfortable: Plenty of time to plan (3+ months away, small sizes only)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual order recommendation card
 */
function OrderRecommendationCard({ recommendation, isNext }) {
  const { monthName, urgency, criticalSizes, reason, daysUntil } = recommendation;

  return (
    <div style={{
      ...calendarStyles.orderCard,
      ...(isNext ? calendarStyles.orderCardNext : {})
    }}>
      <div style={calendarStyles.orderCardHeader}>
        <div style={calendarStyles.orderCardMonth}>{monthName}</div>
        <div style={calendarStyles.orderCardUrgencyBadge(urgency)}>
          {getUrgencyLabel(urgency)}
        </div>
      </div>
      <div style={calendarStyles.orderCardTiming}>
        {daysUntil === 0 ? 'Now' : `In ~${Math.round(daysUntil / 30)} month${Math.round(daysUntil / 30) === 1 ? '' : 's'}`}
      </div>
      <div style={calendarStyles.orderCardReason}>{reason}</div>
      <div style={calendarStyles.orderCardSizes}>
        {criticalSizes.map((s, i) => (
          <div key={i} style={calendarStyles.sizeChip}>
            {s.size}: {s.coverage.toFixed(1)}mo
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Get human-readable urgency label
 */
function getUrgencyLabel(urgency) {
  switch (urgency) {
    case 'urgent': return '🔴 Urgent';
    case 'plan_soon': return '🟡 Plan Soon';
    case 'comfortable': return '🟢 Comfortable';
    default: return urgency;
  }
}

/**
 * Calendar-specific styles
 */
const calendarStyles = {
  // Next Order Card (Prominent)
  nextOrderCard: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
  },
  nextOrderHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  nextOrderBadge: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '0.5px'
  },
  nextOrderUrgency: (urgency) => ({
    padding: '6px 12px',
    background: urgency === 'urgent' ? 'rgba(239, 68, 68, 0.2)' :
                urgency === 'plan_soon' ? 'rgba(234, 179, 8, 0.2)' :
                'rgba(34, 197, 94, 0.2)',
    border: `1px solid ${urgency === 'urgent' ? '#dc2626' : urgency === 'plan_soon' ? '#ca8a04' : '#15803d'}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    color: urgency === 'urgent' ? '#fca5a5' : urgency === 'plan_soon' ? '#fde047' : '#86efac'
  }),
  nextOrderMonth: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px'
  },
  nextOrderTiming: {
    fontSize: '16px',
    color: '#bfdbfe',
    marginBottom: '12px'
  },
  nextOrderReason: {
    fontSize: '14px',
    color: '#e0e7ff',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  nextOrderSizes: {
    fontSize: '13px',
    color: '#dbeafe',
    lineHeight: '1.6'
  },

  // No Orders Card
  noOrdersCard: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '2px solid #15803d',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center',
    marginBottom: '32px'
  },
  noOrdersIcon: {
    fontSize: '48px',
    color: '#22c55e',
    marginBottom: '16px'
  },
  noOrdersTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: '12px'
  },
  noOrdersText: {
    fontSize: '14px',
    color: '#a1a1aa',
    maxWidth: '500px',
    margin: '0 auto'
  },

  // Calendar Grid
  calendarGrid: {
    marginBottom: '32px'
  },
  calendarHeader: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #27272a'
  },

  // Order Card
  orderCard: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '12px',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  orderCardNext: {
    borderColor: '#3b82f6',
    background: 'rgba(30, 58, 138, 0.2)'
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  orderCardMonth: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fafafa'
  },
  orderCardUrgencyBadge: (urgency) => ({
    padding: '4px 10px',
    background: urgency === 'urgent' ? 'rgba(239, 68, 68, 0.15)' :
                urgency === 'plan_soon' ? 'rgba(234, 179, 8, 0.15)' :
                'rgba(34, 197, 94, 0.15)',
    border: `1px solid ${urgency === 'urgent' ? '#dc2626' : urgency === 'plan_soon' ? '#ca8a04' : '#15803d'}`,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    color: urgency === 'urgent' ? '#fca5a5' : urgency === 'plan_soon' ? '#fde047' : '#86efac'
  }),
  orderCardTiming: {
    fontSize: '13px',
    color: '#71717a',
    marginBottom: '8px'
  },
  orderCardReason: {
    fontSize: '13px',
    color: '#d4d4d8',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  orderCardSizes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  sizeChip: {
    padding: '4px 10px',
    background: '#27272a',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#a1a1aa',
    fontWeight: '600'
  },

  // Info Box
  infoBox: {
    background: 'rgba(96, 165, 250, 0.1)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '32px'
  },
  infoTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: '12px'
  },
  infoText: {
    fontSize: '13px',
    color: '#d4d4d8',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  infoListItem: {
    fontSize: '13px',
    color: '#d4d4d8',
    lineHeight: '1.8',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  urgencyDot: {
    display: 'inline-block',
    fontSize: '16px'
  }
};
