import React from 'react';

// V2: Shows component inventory with multiple container arrivals
export default function ComponentTimelineV2({ projection, startingMonth = 0, placedOrders = {}, toggleOrderStatus, usageRates }) {
  if (!projection || !projection.orders) {
    return null;
  }

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Use scaled rates from usageRates if provided, otherwise use defaults
  const MONTHLY_SALES_RATE = usageRates?.MONTHLY_SALES_RATE || {
    'King': 30,
    'Queen': 41,
    'Double': 6,
    'King Single': 3,
    'Single': 1
  };

  const COMPONENT_TYPES = [
    { id: 'micro_coils', name: 'Micro Coils', sizes: ['King', 'Queen'], multiplier: 1.5 },
    { id: 'thin_latex', name: 'Thin Latex', sizes: ['King', 'Queen'], multiplier: 1.5 },
    { id: 'felt', name: 'Felt', sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'], multiplier: 1.0 },
    { id: 'top_panel', name: 'Top Panel', sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'], multiplier: 1.0 },
    { id: 'bottom_panel', name: 'Bottom Panel', sizes: ['King', 'Queen', 'Double', 'King Single', 'Single'], multiplier: 1.0 },
    { id: 'side_panel', name: 'Side Panel (Double)', sizes: ['Double'], multiplier: 1.0 }
  ];

  // Conversion constants
  const WEEKS_PER_MONTH = 52 / 12; // ≈ 4.333 weeks per month
  const TOTAL_WEEKS = 52;

  // Convert between weeks and months
  const weekToMonth = (weeks) => weeks / WEEKS_PER_MONTH;
  const monthToWeek = (months) => months * WEEKS_PER_MONTH;

  const getMonthName = (offset) => {
    return MONTH_NAMES[(startingMonth + offset) % 12];
  };

  const getWeekLabel = (weekOffset) => {
    // Calculate the actual date for this week
    const today = new Date();
    const daysToAdd = weekOffset * 7;
    const targetDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const monthName = MONTH_NAMES[targetDate.getMonth()];
    const day = targetDate.getDate();

    if (weekOffset === 0) {
      return `Now\n${monthName} ${day}`;
    }

    // Show month and day for every 4th week, otherwise just day
    if (weekOffset % 4 === 0) {
      return `${monthName}\n${day}`;
    }
    return `${day}`;
  };

  // Extract component quantity for a specific component/size from an order
  const getComponentQuantityFromOrder = (order, componentId, size) => {
    if (!order || !order.componentOrder) return 0;
    return order.componentOrder[componentId]?.[size] || 0;
  };

  // Calculate monthly usage for a component/size
  const getMonthlyUsage = (componentId, size) => {
    let monthlySales = MONTHLY_SALES_RATE[size];

    // Special case: Side Panel for Double includes Single + King Single
    if (componentId === 'side_panel' && size === 'Double') {
      monthlySales = MONTHLY_SALES_RATE['Double'] + MONTHLY_SALES_RATE['Single'] + MONTHLY_SALES_RATE['King Single'];
    }

    // Find the component config to get multiplier
    const component = COMPONENT_TYPES.find(c => c.id === componentId);
    const multiplier = component ? component.multiplier : 1.0;

    return monthlySales * multiplier;
  };

  // Calculate stock at any point in time, accounting for depletions and arrivals
  const calculateComponentStockAtPoint = (componentId, size, timePoint) => {
    // Start with initial inventory
    let stock = projection.snapshots[0].inventory.components[componentId]?.[size] || 0;

    // Get monthly usage rate
    const monthlyUsage = getMonthlyUsage(componentId, size);

    // Collect all events up to this timePoint
    const events = [];

    // Add depletion events (one per month)
    for (let m = 0; m < Math.floor(timePoint); m++) {
      events.push({
        type: 'depletion',
        time: m + 0.001
      });
    }

    // Add partial month depletion if timePoint is fractional
    if (timePoint % 1 !== 0) {
      const partialMonths = timePoint % 1;
      events.push({
        type: 'partial_depletion',
        time: timePoint,
        fraction: partialMonths
      });
    }

    // Add arrival events
    projection.orders.forEach(order => {
      if (order.arrivalMonth <= timePoint) {
        events.push({
          type: 'arrival',
          time: order.arrivalMonth,
          order: order
        });
      }
    });

    // Sort events chronologically
    events.sort((a, b) => a.time - b.time);

    // Apply events in order
    events.forEach(event => {
      if (event.type === 'depletion') {
        stock -= monthlyUsage;
      } else if (event.type === 'partial_depletion') {
        stock -= monthlyUsage * event.fraction;
      } else if (event.type === 'arrival') {
        const addedComponents = getComponentQuantityFromOrder(event.order, componentId, size);
        stock += addedComponents;
      }
    });

    return stock;
  };

  // Get stock at a specific week (convert to months internally)
  const getComponentStockAtWeek = (componentId, size, weekOffset) => {
    const monthOffset = weekToMonth(weekOffset);
    return calculateComponentStockAtPoint(componentId, size, monthOffset);
  };

  // Build column structure: insert ORDER and ARRIVAL columns between weeks
  const buildColumns = () => {
    const columns = [];

    // Assign order numbers and convert to weeks
    const ordersWithNumbers = projection.orders.map((order, index) => ({
      ...order,
      orderNumber: index + 1,
      orderWeek: monthToWeek(order.orderMonth),
      arrivalWeek: monthToWeek(order.arrivalMonth)
    }));

    for (let weekOffset = 0; weekOffset <= TOTAL_WEEKS - 1; weekOffset++) {
      // Check if any ORDER happens before/at this week (insert ORDER column before week)
      ordersWithNumbers.forEach(order => {
        const orderPoint = order.orderWeek;

        // If this is week 0 and order is at 0, insert before "Now"
        if (weekOffset === 0 && orderPoint >= -0.1 && orderPoint <= 0.1) {
          columns.push({
            type: 'order',
            order: order,
            orderNumber: order.orderNumber
          });
        }
        // If order falls between previous week and this week
        else if (weekOffset > 0 && orderPoint > weekOffset - 1 && orderPoint <= weekOffset) {
          columns.push({
            type: 'order',
            order: order,
            orderNumber: order.orderNumber
          });
        }
      });

      // Add the week column
      columns.push({
        type: 'week',
        weekOffset,
        label: getWeekLabel(weekOffset)
      });

      // Check if any ARRIVAL happens after this week (insert ARRIVAL column after week)
      ordersWithNumbers.forEach(order => {
        const arrivalPoint = order.arrivalWeek;

        // If arrival falls between this week and next week
        if (arrivalPoint > weekOffset && arrivalPoint <= weekOffset + 1) {
          columns.push({
            type: 'arrival',
            order: order,
            arrivalWeek: order.arrivalWeek,
            orderNumber: order.orderNumber
          });
        }
      });
    }

    return columns;
  };

  const columns = buildColumns();
  const totalColumns = columns.length + 1; // +1 for Component/Size column

  // Calculate date range for display
  const today = new Date();
  const endDate = new Date(today.getTime() + 364 * 24 * 60 * 60 * 1000); // 52 weeks
  const startDateStr = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  const endDateStr = `${MONTH_NAMES[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Component Timeline - Weekly View (6 components × applicable sizes)</h2>
      <p style={styles.sectionSubtitle}>
        {startDateStr} → {endDateStr} • Components calculated for equal runway with springs
      </p>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...headerStyle, position: 'sticky', left: 0, background: '#18181b', zIndex: 3 }}>
                Component / Size
              </th>
              {columns.map((col, idx) => {
                if (col.type === 'week') {
                  return (
                    <th key={`week-${idx}`} style={headerStyle}>
                      {col.label}
                    </th>
                  );
                } else if (col.type === 'order') {
                  // Order column - show order number with checkbox
                  const isPlaced = placedOrders[col.order.id];
                  return (
                    <th
                      key={`order-${idx}`}
                      style={{
                        ...headerStyle,
                        ...orderHeaderStyle,
                        ...(isPlaced ? placedOrderHeaderStyle : {})
                      }}
                    >
                      <div
                        onClick={() => toggleOrderStatus && toggleOrderStatus(col.order.id)}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title={isPlaced ? 'Click to mark as not placed' : 'Click to mark as placed'}
                      >
                        <input
                          type="checkbox"
                          checked={isPlaced || false}
                          onChange={() => {}}
                          style={{
                            cursor: 'pointer',
                            margin: 0,
                            width: '14px',
                            height: '14px'
                          }}
                        />
                        <div style={{ fontSize: '14px', fontWeight: '900' }}>
                          {col.orderNumber}
                        </div>
                      </div>
                    </th>
                  );
                } else {
                  // Arrival column - show order number + arrival info
                  const isPlaced = placedOrders[col.order.id];
                  return (
                    <th
                      key={`arrival-${idx}`}
                      style={{
                        ...headerStyle,
                        ...arrivalHeaderStyle,
                        ...(isPlaced ? {} : unplacedArrivalHeaderStyle)
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '4px' }}>
                        {col.orderNumber}
                      </div>
                      <div style={{ fontSize: '9px' }}>
                        Week {Math.round(col.arrivalWeek)}
                      </div>
                      {!isPlaced && (
                        <div style={{ fontSize: '8px', marginTop: '2px', opacity: 0.7 }}>
                          (Pending)
                        </div>
                      )}
                    </th>
                  );
                }
              })}
            </tr>
          </thead>
          <tbody>
            {COMPONENT_TYPES.map(comp => (
              <React.Fragment key={comp.id}>
                {/* Component header row */}
                <tr style={{ background: '#18181b' }}>
                  <td colSpan={totalColumns} style={{
                    padding: '8px 12px',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#fafafa',
                    borderBottom: '1px solid #27272a',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2
                  }}>
                    {comp.name}
                  </td>
                </tr>

                {/* Size rows */}
                {comp.sizes.map(size => {
                  return (
                    <tr key={`${comp.id}-${size}`}>
                      <td style={{
                        ...cellStyle,
                        position: 'sticky',
                        left: 0,
                        background: '#18181b',
                        zIndex: 2,
                        paddingLeft: '24px',
                        fontWeight: '500',
                        color: '#a1a1aa'
                      }}>
                        {size}
                      </td>
                      {columns.map((col, idx) => {
                        if (col.type === 'week') {
                          const stock = getComponentStockAtWeek(comp.id, size, col.weekOffset);
                          return (
                            <td key={`cell-${idx}`} style={cellStyle}>
                              {Math.round(stock)}
                            </td>
                          );
                        } else if (col.type === 'order') {
                          // Order column - empty, just a visual stripe
                          const isPlaced = placedOrders[col.order.id];
                          return (
                            <td
                              key={`order-cell-${idx}`}
                              style={{
                                ...cellStyle,
                                ...orderCellStyle,
                                ...(isPlaced ? placedOrderCellStyle : {})
                              }}
                            >
                            </td>
                          );
                        } else {
                          // Arrival column
                          const isPlaced = placedOrders[col.order.id];
                          const arrivalMonthOffset = weekToMonth(col.arrivalWeek);
                          const stockAtArrival = calculateComponentStockAtPoint(comp.id, size, arrivalMonthOffset);
                          const addedComponents = getComponentQuantityFromOrder(col.order, comp.id, size);

                          return (
                            <td
                              key={`arrival-cell-${idx}`}
                              style={{
                                ...cellStyle,
                                ...arrivalCellStyle,
                                ...(isPlaced ? {} : unplacedArrivalCellStyle)
                              }}
                            >
                              <div style={{ fontWeight: '700', fontSize: '13px', opacity: isPlaced ? 1 : 0.5 }}>
                                {Math.round(Math.max(0, stockAtArrival))}
                              </div>
                              {addedComponents > 0 && (
                                <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px', opacity: isPlaced ? 1 : 0.5 }}>
                                  +{Math.round(addedComponents)}
                                </div>
                              )}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.footnote}>
        Weekly granularity showing actual calendar dates. Component orders calculated to ensure equal depletion with springs. Scroll horizontally to view full year.
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: '8px'
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#a1a1aa',
    marginBottom: '16px'
  },
  tableContainer: {
    overflowX: 'auto',
    background: '#000000',
    border: '1px solid #27272a',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    fontFamily: 'monospace'
  },
  footnote: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#71717a',
    fontStyle: 'italic'
  }
};

const headerStyle = {
  padding: '8px 6px',
  textAlign: 'center',
  background: '#18181b',
  color: '#a1a1aa',
  fontWeight: '600',
  fontSize: '10px',
  borderBottom: '2px solid #27272a',
  borderRight: '1px solid #27272a',
  minWidth: '45px',
  whiteSpace: 'pre-line'
};

const orderHeaderStyle = {
  background: '#14532d',
  color: '#22c55e',
  fontWeight: '900',
  borderLeft: '2px solid #22c55e',
  borderRight: '2px solid #22c55e',
  width: '20px',
  minWidth: '20px',
  maxWidth: '20px',
  padding: '12px 4px',
  fontSize: '14px'
};

const arrivalHeaderStyle = {
  background: 'rgba(14, 165, 233, 0.3)',
  color: '#38bdf8',
  fontWeight: '700',
  borderLeft: '2px solid #0ea5e9',
  borderRight: '2px solid #0ea5e9',
  width: '80px',
  minWidth: '80px'
};

const cellStyle = {
  padding: '6px 4px',
  textAlign: 'center',
  color: '#d4d4d8',
  borderBottom: '1px solid #27272a',
  borderRight: '1px solid #27272a',
  fontSize: '11px'
};

const orderCellStyle = {
  background: 'rgba(20, 83, 45, 0.3)',
  borderLeft: '2px solid #22c55e',
  borderRight: '2px solid #22c55e',
  width: '20px',
  minWidth: '20px',
  maxWidth: '20px',
  padding: '10px 4px'
};

const arrivalCellStyle = {
  background: 'rgba(14, 165, 233, 0.2)',
  borderLeft: '2px solid #0ea5e9',
  borderRight: '2px solid #0ea5e9'
};

const placedOrderHeaderStyle = {
  background: '#166534',
  borderLeft: '3px solid #16a34a',
  borderRight: '3px solid #16a34a'
};

const placedOrderCellStyle = {
  background: 'rgba(22, 101, 52, 0.4)',
  borderLeft: '3px solid #16a34a',
  borderRight: '3px solid #16a34a'
};

const unplacedArrivalHeaderStyle = {
  background: 'rgba(14, 165, 233, 0.15)',
  opacity: 0.6
};

const unplacedArrivalCellStyle = {
  background: 'rgba(14, 165, 233, 0.1)',
  opacity: 0.6
};
