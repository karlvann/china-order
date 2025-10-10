import React from 'react';

// 12-month timeline forecast for spring inventory
export default function SpringTimeline({ inventory, springOrder, startingMonth = 0 }) {
  if (!springOrder) {
    return null;
  }

  const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const MONTHLY_SALES_RATE = {
    'King': 30,
    'Queen': 41,
    'Double': 6,
    'King Single': 3,
    'Single': 1
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const CONTAINER_ARRIVAL_MONTH = 3; // Month 3 (10 weeks ≈ 2.5 months)

  // Get month name for a given offset from startingMonth
  const getMonthName = (offset) => {
    return MONTH_NAMES[(startingMonth + offset) % 12];
  };

  // Calculate total current stock for a size (all firmnesses)
  const getCurrentStock = (size) => {
    return ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
      sum + (inventory.springs[firmness][size] || 0), 0
    );
  };

  // Calculate total order amount for a size (all firmnesses)
  const getOrderAmount = (size) => {
    return ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
      sum + (springOrder.springs[firmness][size] || 0), 0
    );
  };

  // Calculate stock level at a given month
  const getStockAtMonth = (size, monthOffset) => {
    const currentStock = getCurrentStock(size);
    const monthlySales = MONTHLY_SALES_RATE[size];
    const orderAmount = getOrderAmount(size);

    if (monthOffset === 0) {
      // NOW - current stock
      return currentStock;
    } else if (monthOffset < CONTAINER_ARRIVAL_MONTH) {
      // Before arrival - just depletion
      return currentStock - (monthlySales * monthOffset);
    } else if (monthOffset === CONTAINER_ARRIVAL_MONTH) {
      // Arrival month - deplete 2.5 months (10 weeks) then add order
      return currentStock - (monthlySales * 2.5) + orderAmount;
    } else {
      // After arrival - continue depleting from the "after arrival" level
      const stockAfterArrival = currentStock - (monthlySales * 2.5) + orderAmount;
      const monthsSinceArrival = monthOffset - CONTAINER_ARRIVAL_MONTH;
      return stockAfterArrival - (monthlySales * monthsSinceArrival);
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
        Spring Inventory Timeline
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
              Size
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
          {MATTRESS_SIZES.map(size => {
            const currentStock = getCurrentStock(size);
            const orderAmount = getOrderAmount(size);

            return (
              <tr key={size} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{
                  padding: '10px 12px',
                  fontWeight: '600',
                  color: '#fafafa',
                  position: 'sticky',
                  left: 0,
                  background: '#18181b',
                  zIndex: 1
                }}>
                  {size}
                </td>
                <td style={cellStyle}>
                  {currentStock}
                </td>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => {
                  const stock = getStockAtMonth(size, offset);
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
                          +{orderAmount}
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
        Container arrives in month 3 (10 weeks). Depletes at monthly sales rate.
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
