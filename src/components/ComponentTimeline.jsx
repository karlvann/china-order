import React from 'react';

// 12-month timeline forecast for component inventory
export default function ComponentTimeline({ inventory, componentOrder, startingMonth = 0 }) {
  if (!componentOrder) {
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
    'Double': 6,
    'King Single': 3,
    'Single': 1
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const CONTAINER_ARRIVAL_MONTH = 3;

  // Get month name for a given offset from startingMonth
  const getMonthName = (offset) => {
    return MONTH_NAMES[(startingMonth + offset) % 12];
  };

  // Get component multipliers
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

  // Calculate stock level at a given month
  const getStockAtMonth = (componentId, monthOffset) => {
    const currentStock = getCurrentStock(componentId);
    const multiplier = getMultiplier(componentId);
    const monthlyUsage = calculateMonthlyUsage(componentId, multiplier);
    const orderAmount = getOrderAmount(componentId);

    if (monthOffset === 0) {
      // NOW - current stock
      return currentStock;
    } else if (monthOffset < CONTAINER_ARRIVAL_MONTH) {
      // Before arrival - just depletion
      return currentStock - (monthlyUsage * monthOffset);
    } else if (monthOffset === CONTAINER_ARRIVAL_MONTH) {
      // Arrival month - deplete 2.5 months (10 weeks) then add order
      return currentStock - (monthlyUsage * 2.5) + orderAmount;
    } else {
      // After arrival - continue depleting from the "after arrival" level
      const stockAfterArrival = currentStock - (monthlyUsage * 2.5) + orderAmount;
      const monthsSinceArrival = monthOffset - CONTAINER_ARRIVAL_MONTH;
      return stockAfterArrival - (monthlyUsage * monthsSinceArrival);
    }
  };

  return (
    <div style={{
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '8px',
      padding: '16px',
      overflowX: 'auto'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#fafafa'
      }}>
        Component Inventory Timeline
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px',
        whiteSpace: 'nowrap'
      }}>
        <thead>
          <tr style={{ background: '#27272a' }}>
            <th style={{
              ...headerStyle,
              position: 'sticky',
              left: 0,
              background: '#27272a',
              zIndex: 2
            }}>
              Component
            </th>
            <th style={{
              ...headerStyle,
              background: '#27272a'
            }}>
              Now
            </th>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => (
              <th
                key={offset}
                style={{
                  ...headerStyle,
                  background: offset === CONTAINER_ARRIVAL_MONTH ? '#1e3a8a' : '#27272a',
                  color: offset === CONTAINER_ARRIVAL_MONTH ? '#60a5fa' : '#a1a1aa'
                }}
              >
                {getMonthName(offset)}
                {offset === CONTAINER_ARRIVAL_MONTH && (
                  <div style={{ fontSize: '9px', marginTop: '2px' }}>ARRIVAL</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPONENT_TYPES.map(comp => {
            const multiplier = getMultiplier(comp.id);
            const monthlyUsage = calculateMonthlyUsage(comp.id, multiplier);
            const currentStock = getCurrentStock(comp.id);
            const orderAmount = getOrderAmount(comp.id);

            // Skip if no usage (shouldn't happen, but just in case)
            if (monthlyUsage === 0) {
              return null;
            }

            return (
              <tr key={comp.id} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{
                  padding: '10px 12px',
                  fontWeight: '600',
                  color: '#fafafa',
                  position: 'sticky',
                  left: 0,
                  background: '#18181b',
                  zIndex: 1
                }}>
                  {comp.name}
                </td>
                <td style={cellStyle}>
                  {Math.round(currentStock)}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => {
                  const stock = getStockAtMonth(comp.id, offset);
                  const isArrival = offset === CONTAINER_ARRIVAL_MONTH;
                  const isNegative = stock < 0;

                  return (
                    <td
                      key={offset}
                      style={{
                        ...cellStyle,
                        background: isArrival ? 'rgba(30, 58, 138, 0.3)' : 'transparent',
                        color: isNegative ? '#ef4444' : '#fafafa'
                      }}
                    >
                      <div>{Math.round(Math.max(0, stock))}</div>
                      {isArrival && orderAmount > 0 && (
                        <div style={{
                          fontSize: '10px',
                          color: '#22c55e',
                          marginTop: '2px'
                        }}>
                          +{Math.round(orderAmount)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: '#a1a1aa'
      }}>
        Based on spring sales rates × component multipliers. Container arrives in month 3.
      </div>
    </div>
  );
}

const headerStyle = {
  padding: '8px 10px',
  textAlign: 'center',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  color: '#a1a1aa'
};

const cellStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#fafafa'
};
