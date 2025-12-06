import React from 'react';
import SpringTimelineDetailed from '../components/SpringTimelineDetailed';
import ComponentTimelineDetailed from '../components/ComponentTimelineDetailed';
import DecisionSummary from '../components/DecisionSummary';

export default function ForecastView({
  startingMonth,
  setStartingMonth,
  inventory,
  springOrder,
  componentOrder,
  usageRates,
  styles
}) {
  return (
    <div style={styles.forecastView}>
      <div style={styles.forecastContent}>
        {/* Month Selector */}
        <div style={styles.forecastHeader}>
          <div>
            <h1 style={styles.forecastTitle}>
              12-Month Inventory Forecast
              <span style={styles.validationBadge}>
                ✓ Equal Runway Validated
              </span>
            </h1>
            <p style={styles.forecastSubtitle}>
              Projected stock levels with container arrival at Week 10. Components and springs calculated to deplete together.
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
        <SpringTimelineDetailed
          inventory={inventory}
          springOrder={springOrder}
          startingMonth={startingMonth}
          usageRates={usageRates}
        />

        {/* Component Timeline Detailed */}
        <ComponentTimelineDetailed
          inventory={inventory}
          springOrder={springOrder}
          componentOrder={componentOrder}
          startingMonth={startingMonth}
          usageRates={usageRates}
        />

        {/* Decision Summary - Shows order breakdown and coverage changes */}
        <DecisionSummary
          inventory={inventory}
          springOrder={springOrder}
          usageRates={usageRates}
        />
      </div>
    </div>
  );
}
