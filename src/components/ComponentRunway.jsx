import React from 'react';

// Component runway forecast showing months of coverage
export default function ComponentRunway({ inventory, springOrder, componentOrder, showDetails = false }) {
  if (!springOrder || !componentOrder) {
    return null;
  }

  const COMPONENT_TYPES = [
    { id: 'micro_coils', name: 'Micro Coils' },
    { id: 'thin_latex', name: 'Thin Latex' },
    { id: 'felt', name: 'Felt' },
    { id: 'top_panel', name: 'Top Panel' },
    { id: 'bottom_panel', name: 'Bottom Panel' },
    { id: 'side_panel', name: 'Side Panel' }
  ];

  const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const MONTHLY_SALES_RATE = {
    'King': 30,
    'Queen': 41,
    'Double': 5,
    'King Single': 3,
    'Single': 2
  };

  // Calculate monthly component usage based on spring sales
  const calculateMonthlyUsage = (componentId, multiplier) => {
    let totalUsage = 0;

    MATTRESS_SIZES.forEach(size => {
      const monthlySpringSales = MONTHLY_SALES_RATE[size];

      // Skip micro coils and thin latex for small sizes
      if (['micro_coils', 'thin_latex'].includes(componentId) &&
          ['Double', 'King Single', 'Single'].includes(size)) {
        return;
      }

      // Skip Single and King Single for side panels (consolidated into Double)
      if (componentId === 'side_panel' && ['Single', 'King Single'].includes(size)) {
        return;
      }

      // Add consolidated amounts for side panels
      if (componentId === 'side_panel' && size === 'Double') {
        const doubleSales = MONTHLY_SALES_RATE['Double'];
        const singleSales = MONTHLY_SALES_RATE['Single'];
        const ksSales = MONTHLY_SALES_RATE['King Single'];
        totalUsage += (doubleSales + singleSales + ksSales) * multiplier;
      } else {
        totalUsage += monthlySpringSales * multiplier;
      }
    });

    return totalUsage;
  };

  // Calculate current total stock for a component
  const getCurrentStock = (componentId) => {
    let total = 0;
    MATTRESS_SIZES.forEach(size => {
      total += inventory.components[componentId]?.[size] || 0;
    });
    return total;
  };

  // Calculate total order amount for a component
  const getOrderAmount = (componentId) => {
    let total = 0;
    MATTRESS_SIZES.forEach(size => {
      total += componentOrder[componentId]?.[size] || 0;
    });
    return total;
  };

  // Get component multipliers from constants
  const getMultiplier = (componentId) => {
    const multipliers = {
      'micro_coils': 1.5,
      'thin_latex': 1.5,
      'felt': 1.0,
      'top_panel': 1.0,
      'bottom_panel': 1.0,
      'side_panel': 1.0
    };
    return multipliers[componentId] || 1.0;
  };

  // Detailed table view
  if (showDetails) {
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
          Component Runway Forecast
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={headerStyle}>Component</th>
                <th style={headerStyle}>Current</th>
                <th style={headerStyle}>Order</th>
                <th style={headerStyle}>After Container</th>
                <th style={headerStyle}>Change</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_TYPES.map(comp => {
                const multiplier = getMultiplier(comp.id);
                const monthlyUsage = calculateMonthlyUsage(comp.id, multiplier);
                const currentStock = getCurrentStock(comp.id);
                const orderAmount = getOrderAmount(comp.id);

                // Skip if no usage
                if (monthlyUsage === 0) {
                  return null;
                }

                // Calculate stock after lead time
                const stockAfterLeadTime = Math.max(0, currentStock - (monthlyUsage * 2.5));
                const stockAfterContainer = stockAfterLeadTime + orderAmount;
                const change = stockAfterContainer - currentStock;

                let changeColor = '#22c55e';
                if (change < 0) changeColor = '#ef4444';

                return (
                  <tr key={comp.id} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                      {comp.name}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}>
                      {currentStock}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      color: '#60a5fa'
                    }}>
                      {orderAmount}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      {Math.round(stockAfterContainer)}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      color: changeColor,
                      fontWeight: '600'
                    }}>
                      {change > 0 ? '+' : ''}{Math.round(change)}
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
          <strong style={{ color: '#60a5fa' }}>Note:</strong> Component usage calculated from spring sales rates × component multipliers. Stock depletes 2.5 months before container arrives, then new order arrives.
        </div>
      </div>
    );
  }

  // Compact bar view
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
        Component Coverage After Order
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {COMPONENT_TYPES.map(comp => {
          const multiplier = getMultiplier(comp.id);
          const monthlyUsage = calculateMonthlyUsage(comp.id, multiplier);
          const currentStock = getCurrentStock(comp.id);
          const orderAmount = getOrderAmount(comp.id);

          // Calculate coverage now and after order (assuming 2.5 month lead time)
          const coverageNow = monthlyUsage > 0 ? currentStock / monthlyUsage : 0;
          const stockAfterLeadTime = Math.max(0, currentStock - (monthlyUsage * 2.5));
          const coverageAfter = monthlyUsage > 0 ? (stockAfterLeadTime + orderAmount) / monthlyUsage : 0;

          // Skip if no usage (like micro coils only for K/Q)
          if (monthlyUsage === 0) {
            return null;
          }

          const barWidth = Math.min(100, (coverageAfter / 6) * 100); // Max 6 months = 100%

          let barColor = '#22c55e';
          if (coverageAfter < 2) barColor = '#ef4444';
          else if (coverageAfter < 3) barColor = '#eab308';
          else if (coverageAfter < 4) barColor = '#60a5fa';

          return (
            <div key={comp.id}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '12px'
              }}>
                <span style={{ color: '#a1a1aa' }}>{comp.name}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#71717a', fontSize: '11px' }}>
                    Now: {coverageNow.toFixed(1)}mo
                  </span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    color: barColor
                  }}>
                    After: {coverageAfter.toFixed(1)}mo
                  </span>
                </div>
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
        Based on spring sales rates and component multipliers
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
