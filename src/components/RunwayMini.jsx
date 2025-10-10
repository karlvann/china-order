import React from 'react';

// Compact visual forecast showing inventory runway
export default function RunwayMini({ inventory, springOrder, showDetails = false }) {
  if (!springOrder) {
    return null;
  }

  const MATTRESS_SIZES = [
    { id: 'King', name: 'King' },
    { id: 'Queen', name: 'Queen' },
    { id: 'Double', name: 'Double' },
    { id: 'King Single', name: 'KS' },
    { id: 'Single', name: 'Single' }
  ];

  const MONTHLY_SALES_RATE = {
    'King': 30,
    'Queen': 41,
    'Double': 5,
    'King Single': 3,
    'Single': 2
  };

  // Calculate total coverage for each size (all firmnesses combined)
  const calculateCoverage = (sizeId) => {
    const currentStock = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
      sum + (inventory.springs[firmness][sizeId] || 0), 0
    );
    const monthlySales = MONTHLY_SALES_RATE[sizeId];
    return monthlySales > 0 ? currentStock / monthlySales : 0;
  };

  // Calculate coverage after container arrives
  const calculateCoverageAfter = (sizeId) => {
    const currentStock = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
      sum + (inventory.springs[firmness][sizeId] || 0), 0
    );
    const orderAmount = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
      sum + (springOrder.springs[firmness][sizeId] || 0), 0
    );
    const monthlySales = MONTHLY_SALES_RATE[sizeId];

    // Simulate 10 weeks (2.5 months) of sales before container arrives
    const stockAt10Weeks = Math.max(0, currentStock - (monthlySales * 2.5));
    const stockAfterContainer = stockAt10Weeks + orderAmount;

    return monthlySales > 0 ? stockAfterContainer / monthlySales : 0;
  };

  // Compact view - just bars
  if (!showDetails) {
    return (
      <div style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#fafafa'
        }}>
          Coverage After Order
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {MATTRESS_SIZES.map(size => {
            const coverageAfter = calculateCoverageAfter(size.id);
            const barWidth = Math.min(100, (coverageAfter / 6) * 100); // Max 6 months = 100%

            let barColor = '#22c55e';
            if (coverageAfter < 2) barColor = '#ef4444';
            else if (coverageAfter < 3) barColor = '#eab308';
            else if (coverageAfter < 4) barColor = '#60a5fa';

            return (
              <div key={size.id}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}>
                  <span style={{ color: '#a1a1aa' }}>{size.name}</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    color: barColor
                  }}>
                    {coverageAfter.toFixed(1)}mo
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: '#27272a',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #27272a',
          fontSize: '11px',
          color: '#a1a1aa'
        }}>
          Assumes container arrives in 10 weeks (2.5 months)
        </div>
      </div>
    );
  }

  // Detailed view - show before and after
  return (
    <div style={{
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#fafafa'
      }}>
        Inventory Runway Forecast
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#27272a' }}>
              <th style={headerStyle}>Size</th>
              <th style={headerStyle}>Current</th>
              <th style={headerStyle}>Order</th>
              <th style={headerStyle}>After Container</th>
              <th style={headerStyle}>Change</th>
            </tr>
          </thead>
          <tbody>
            {MATTRESS_SIZES.map(size => {
              const coverageBefore = calculateCoverage(size.id);
              const coverageAfter = calculateCoverageAfter(size.id);
              const change = coverageAfter - coverageBefore;

              let changeColor = '#22c55e';
              if (change < 0) changeColor = '#ef4444';

              return (
                <tr key={size.id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                    {size.name}
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    textAlign: 'center'
                  }}>
                    {coverageBefore.toFixed(1)}mo
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    color: '#60a5fa'
                  }}>
                    {['firm', 'medium', 'soft'].reduce((sum, f) =>
                      sum + (springOrder.springs[f][size.id] || 0), 0
                    )}
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {coverageAfter.toFixed(1)}mo
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    color: changeColor,
                    fontWeight: '600'
                  }}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}mo
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(96, 165, 250, 0.1)',
        border: '1px solid #1e40af',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#a1a1aa'
      }}>
        <strong style={{ color: '#60a5fa' }}>Note:</strong> Coverage calculated assuming
        container arrives in 10 weeks (2.5 months). Current stock depletes during transit,
        then new order arrives.
      </div>
    </div>
  );
}

const headerStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  color: '#a1a1aa'
};
