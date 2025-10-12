import React from 'react';

// Detailed 12-month forecast showing all component × size combinations (22 rows)
export default function ComponentTimelineDetailed({ inventory, springOrder, componentOrder, startingMonth = 0 }) {
  if (!componentOrder) {
    return null;
  }

  const COMPONENT_TYPES = [
    { id: 'micro_coils', name: 'Micro Coils', multiplier: 1.5, sizes: ['King', 'Queen'] },
    { id: 'thin_latex', name: 'Thin Latex', multiplier: 1.5, sizes: ['King', 'Queen'] },
    { id: 'felt', name: 'Felt', multiplier: 1.0, sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'] },
    { id: 'top_panel', name: 'Top Panel', multiplier: 1.0, sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'] },
    { id: 'bottom_panel', name: 'Bottom Panel', multiplier: 1.0, sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'] },
    { id: 'side_panel', name: 'Side Panel', multiplier: 1.0, sizes: ['King', 'Queen', 'Double'] }
  ];

  const MONTHLY_SALES_RATE = {
    'King': 30,
    'Queen': 41,
    'Double': 6,
    'King Single': 3,
    'Single': 1
  };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get month name for a given offset from startingMonth
  const getMonthName = (offset) => {
    return MONTH_NAMES[(startingMonth + offset) % 12];
  };

  // Calculate monthly usage for a specific component/size
  const getMonthlyUsage = (componentId, size, multiplier) => {
    let monthlySales = MONTHLY_SALES_RATE[size];

    // Special case: Side Panel for Double includes Single + King Single
    if (componentId === 'side_panel' && size === 'Double') {
      monthlySales = MONTHLY_SALES_RATE['Double'] + MONTHLY_SALES_RATE['Single'] + MONTHLY_SALES_RATE['King Single'];
    }

    return monthlySales * multiplier;
  };

  // Calculate stock level at a given month for a specific component/size
  const getStockAtMonth = (componentId, size, multiplier, monthOffset) => {
    const currentStock = inventory.components[componentId][size] || 0;
    const monthlyUsage = getMonthlyUsage(componentId, size, multiplier);
    const orderedComponents = componentOrder[componentId][size] || 0;

    if (monthOffset === 0) {
      return currentStock;
    } else if (monthOffset < 2.5) {
      // Before container arrival
      return currentStock - (monthlyUsage * monthOffset);
    } else if (monthOffset === 2.5) {
      // Container arrival at 2.5 months (10 weeks)
      return currentStock - (monthlyUsage * 2.5) + orderedComponents;
    } else {
      // After container arrival
      const stockAtArrival = currentStock - (monthlyUsage * 2.5) + orderedComponents;
      return stockAtArrival - (monthlyUsage * (monthOffset - 2.5));
    }
  };

  return (
    <div style={{
      background: '#0a0a0a',
      borderRadius: '8px',
      padding: '24px',
      overflowX: 'auto',
      marginTop: '24px'
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#fafafa'
      }}>
        Component Inventory Forecast (12 Months)
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
              Component / Size
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
          {COMPONENT_TYPES.map(comp => (
            <React.Fragment key={comp.id}>
              {/* Component header row */}
              <tr style={{ background: '#18181b' }}>
                <td colSpan={15} style={{
                  padding: '8px 12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: '#22c55e',
                  position: 'sticky',
                  left: 0,
                  background: '#18181b',
                  zIndex: 2
                }}>
                  {comp.name}
                </td>
              </tr>

              {/* Size rows */}
              {comp.sizes.map(size => {
                const currentStock = inventory.components[comp.id][size] || 0;
                const orderedComponents = componentOrder[comp.id][size] || 0;
                const monthlyUsage = getMonthlyUsage(comp.id, size, comp.multiplier);

                // Skip if no usage (shouldn't happen, but safe)
                if (monthlyUsage === 0) {
                  return null;
                }

                return (
                  <tr key={`${comp.id}-${size}`} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{
                      ...cellStyle,
                      position: 'sticky',
                      left: 0,
                      background: '#0a0a0a',
                      zIndex: 1,
                      paddingLeft: '24px'
                    }}>
                      {size}
                      {comp.id === 'side_panel' && size === 'Double' && (
                        <span style={{ fontSize: '10px', color: '#71717a', marginLeft: '6px' }}>
                          (+S/KS)
                        </span>
                      )}
                    </td>
                    <td style={orderNowCellStyle}>
                      {/* Empty cell - visual marker for order point */}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(currentStock)}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(getStockAtMonth(comp.id, size, comp.multiplier, 1))}
                    </td>
                    <td style={cellStyle}>
                      {Math.round(getStockAtMonth(comp.id, size, comp.multiplier, 2))}
                    </td>
                    <td style={{ ...cellStyle, ...arrivalCellStyle }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>
                        {Math.round(Math.max(0, getStockAtMonth(comp.id, size, comp.multiplier, 2.5)))}
                      </div>
                      {orderedComponents > 0 && (
                        <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px' }}>
                          +{Math.round(orderedComponents)}
                        </div>
                      )}
                    </td>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(offset => {
                      const stock = getStockAtMonth(comp.id, size, comp.multiplier, offset);
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
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid #15803d',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#a1a1aa'
      }}>
        <strong style={{ color: '#22c55e' }}>Note:</strong> Component usage based on spring sales rates × multipliers.
        Component orders are calculated to ensure equal runway with springs (same depletion timeline).
        Side Panel "Double (+S/KS)" includes consolidated Single and King Single sales.
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
  background: '#1e3a8a',
  color: '#60a5fa',
  fontWeight: '700',
  borderLeft: '2px solid #3b82f6',
  borderRight: '2px solid #3b82f6'
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
  background: 'rgba(30, 58, 138, 0.3)',
  borderLeft: '2px solid #3b82f6',
  borderRight: '2px solid #3b82f6',
  fontWeight: '600'
};
