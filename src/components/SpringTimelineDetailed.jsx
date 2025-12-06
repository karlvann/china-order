import React from 'react';

// Detailed 12-month forecast showing all size × firmness combinations (15 rows)
export default function SpringTimelineDetailed({ inventory, springOrder, startingMonth = 0, usageRates }) {
  if (!springOrder) {
    return null;
  }

  const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const FIRMNESS_TYPES = ['firm', 'medium', 'soft'];

  // Use scaled rates from usageRates if provided, otherwise use defaults
  const MONTHLY_SALES_RATE = usageRates?.MONTHLY_SALES_RATE || {
    'King': 30,
    'Queen': 41,
    'Double': 6,
    'King Single': 3,
    'Single': 1
  };

  // Firmness distribution ratios (from constants/firmness.ts)
  const FIRMNESS_DISTRIBUTION = {
    'King': { firm: 0.133, medium: 0.833, soft: 0.034 },
    'Queen': { firm: 0.133, medium: 0.833, soft: 0.034 },
    'Double': { firm: 0.300, medium: 0.600, soft: 0.100 },
    'King Single': { firm: 0.300, medium: 0.600, soft: 0.100 },
    'Single': { firm: 0.300, medium: 0.600, soft: 0.100 }
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get month name for a given offset from startingMonth
  const getMonthName = (offset) => {
    return MONTH_NAMES[(startingMonth + offset) % 12];
  };

  // Calculate stock level at a given month for a specific size/firmness
  const getStockAtMonth = (size, firmness, monthOffset) => {
    const currentStock = inventory.springs[firmness][size] || 0;
    const monthlySales = MONTHLY_SALES_RATE[size] * FIRMNESS_DISTRIBUTION[size][firmness];
    const orderedSprings = springOrder.springs[firmness][size] || 0;

    if (monthOffset === 0) {
      return currentStock;
    } else if (monthOffset < 2.5) {
      // Before container arrival
      return currentStock - (monthlySales * monthOffset);
    } else if (monthOffset === 2.5) {
      // Container arrival at 2.5 months (10 weeks)
      return currentStock - (monthlySales * 2.5) + orderedSprings;
    } else {
      // After container arrival
      const stockAtArrival = currentStock - (monthlySales * 2.5) + orderedSprings;
      return stockAtArrival - (monthlySales * (monthOffset - 2.5));
    }
  };

  return (
    <div style={{
      background: '#0a0a0a',
      borderRadius: '8px',
      padding: '24px',
      overflowX: 'auto'
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#fafafa'
      }}>
        Spring Inventory Forecast (12 Months)
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px',
        whiteSpace: 'nowrap'
      }}>
        <thead>
          <tr style={{ background: '#18181b' }}>
            <th style={{ ...headerStyle, position: 'sticky', left: 0, background: '#18181b', zIndex: 3 }}>
              Size / Firmness
            </th>
            <th style={{ ...headerStyle, ...orderNowHeaderStyle }}>
              ORDER<br/>HERE
            </th>
            <th style={headerStyle}>Now</th>
            <th style={headerStyle}>{getMonthName(1)}</th>
            <th style={headerStyle}>{getMonthName(2)}</th>
            <th style={{ ...headerStyle, ...arrivalHeaderStyle }}>
              CONTAINER<br/>ARRIVAL<br/><span style={{ fontSize: '9px' }}>(Week 10)</span>
            </th>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => (
              <th key={offset} style={headerStyle}>{getMonthName(offset)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATTRESS_SIZES.map(size => (
            <React.Fragment key={size}>
              {/* Size header row */}
              <tr style={{ background: '#18181b' }}>
                <td colSpan={15} style={{
                  padding: '8px 12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: '#38bdf8',
                  position: 'sticky',
                  left: 0,
                  background: '#18181b',
                  zIndex: 2
                }}>
                  {size}
                </td>
              </tr>

              {/* Firmness rows */}
              {FIRMNESS_TYPES.map(firmness => {
                const currentStock = inventory.springs[firmness][size] || 0;
                const orderedSprings = springOrder.springs[firmness][size] || 0;

                return (
                  <tr key={`${size}-${firmness}`} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{
                      ...cellStyle,
                      position: 'sticky',
                      left: 0,
                      background: '#0a0a0a',
                      zIndex: 1,
                      paddingLeft: '24px',
                      textTransform: 'capitalize'
                    }}>
                      {firmness}
                    </td>
                    <td style={orderNowCellStyle}>
                      {/* Empty cell - visual marker for order point */}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(currentStock)}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(getStockAtMonth(size, firmness, 1))}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(getStockAtMonth(size, firmness, 2))}
                    </td>
                    <td style={{ ...cellStyle, ...arrivalCellStyle }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>
                        {Math.round(Math.max(0, getStockAtMonth(size, firmness, 2.5)))}
                      </div>
                      {orderedSprings > 0 && (
                        <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px' }}>
                          +{orderedSprings}
                        </div>
                      )}
                    </td>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => {
                      const stock = getStockAtMonth(size, firmness, offset);
                      const isNegative = stock < 0;

                      return (
                        <td key={offset} style={{
                          ...cellStyle,
                          color: isNegative ? '#ef4444' : '#fafafa'
                        }}>
                          {Math.round(Math.max(0, stock))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(14, 165, 233, 0.1)',
        border: '1px solid #0ea5e9',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#a1a1aa'
      }}>
        <strong style={{ color: '#38bdf8' }}>Note:</strong> Container arrives at Week 10 (2.5 months).
        Stock depletes at monthly sales rate based on firmness distribution.
        Components below are calculated to deplete at the same rate as springs.
        Red values indicate stockout risk.
      </div>
    </div>
  );
}

const headerStyle = {
  padding: '10px 8px',
  textAlign: 'center',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  color: '#a1a1aa',
  borderRight: '1px solid #27272a'
};

const orderNowHeaderStyle = {
  background: '#14532d',
  color: '#22c55e',
  fontWeight: '700',
  borderLeft: '2px solid #22c55e',
  borderRight: '2px solid #22c55e',
  width: '40px',
  minWidth: '40px',
  maxWidth: '40px'
};

const arrivalHeaderStyle = {
  background: 'rgba(14, 165, 233, 0.2)',
  color: '#38bdf8',
  fontWeight: '700',
  borderLeft: '2px solid #0ea5e9',
  borderRight: '2px solid #0ea5e9'
};

const cellStyle = {
  padding: '10px 12px',
  textAlign: 'center',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#fafafa',
  borderRight: '1px solid #27272a'
};

const orderNowCellStyle = {
  background: 'rgba(20, 83, 45, 0.3)',
  borderLeft: '2px solid #22c55e',
  borderRight: '2px solid #22c55e',
  padding: '10px 4px',
  textAlign: 'center',
  width: '40px',
  minWidth: '40px',
  maxWidth: '40px'
};

const arrivalCellStyle = {
  background: 'rgba(14, 165, 233, 0.15)',
  borderLeft: '2px solid #0ea5e9',
  borderRight: '2px solid #0ea5e9',
  fontWeight: '600'
};
