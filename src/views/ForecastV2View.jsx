import React, { useState } from 'react';
import SpringTimelineV2 from '../components/SpringTimelineV2';
import ComponentTimelineV2 from '../components/ComponentTimelineV2';

/**
 * Forecast V2: Same as original Forecast, but with multiple container arrivals
 */
export default function ForecastV2View({
  startingMonth,
  setStartingMonth,
  projection,
  usageRates,
  styles
}) {
  // Track which orders have been placed (order ID -> boolean)
  const [placedOrders, setPlacedOrders] = useState({});

  const toggleOrderStatus = (orderId) => {
    setPlacedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  if (!projection) {
    return (
      <div style={styles.forecastView}>
        <div style={styles.forecastContent}>
          <p style={{ color: '#a1a1aa' }}>Loading projection...</p>
        </div>
      </div>
    );
  }

  // Calculate actual date range
  const today = new Date();
  const endDate = new Date(today.getTime() + 364 * 24 * 60 * 60 * 1000); // 52 weeks = 1 year
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateRangeStr = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()} - ${MONTH_NAMES[endDate.getMonth()]} ${endDate.getFullYear()}`;

  return (
    <div style={styles.forecastView}>
      <div style={styles.forecastContent}>
        {/* Month Selector */}
        <div style={styles.forecastHeader}>
          <div>
            <h1 style={styles.forecastTitle}>
              52-Week Inventory Forecast ({dateRangeStr})
              {!projection.hasStockout && (
                <span style={styles.validationBadge}>
                  ✓ No Stockouts
                </span>
              )}
            </h1>
            <p style={styles.forecastSubtitle}>
              Weekly view with {projection.totalContainers} container arrival{projection.totalContainers !== 1 ? 's' : ''} scheduled throughout the year.
              {usageRates && (
                <span style={{ marginLeft: '12px', color: '#38bdf8' }}>
                  ({usageRates.TOTAL_MONTHLY_SALES} units/month)
                </span>
              )}
            </p>
          </div>
          <div style={styles.monthSelector}>
            <label style={styles.monthLabel}>Starting Month:</label>
            <select
              value={startingMonth}
              onChange={(e) => setStartingMonth(parseInt(e.target.value))}
              style={styles.monthSelect}
            >
              <option value={0}>January</option>
              <option value={1}>February</option>
              <option value={2}>March</option>
              <option value={3}>April</option>
              <option value={4}>May</option>
              <option value={5}>June</option>
              <option value={6}>July</option>
              <option value={7}>August</option>
              <option value={8}>September</option>
              <option value={9}>October</option>
              <option value={10}>November</option>
              <option value={11}>December</option>
            </select>
          </div>
        </div>

        {/* Spring Timeline Detailed */}
        <SpringTimelineV2
          projection={projection}
          startingMonth={startingMonth}
          placedOrders={placedOrders}
          toggleOrderStatus={toggleOrderStatus}
          usageRates={usageRates}
        />

        {/* Component Timeline Detailed */}
        <ComponentTimelineV2
          projection={projection}
          startingMonth={startingMonth}
          placedOrders={placedOrders}
          toggleOrderStatus={toggleOrderStatus}
          usageRates={usageRates}
        />
      </div>
    </div>
  );
}
