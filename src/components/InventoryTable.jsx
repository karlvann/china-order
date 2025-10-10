import React from 'react';

// Reusable table component for spring and component inventory input
export default function InventoryTable({
  type = 'springs', // 'springs' or 'components'
  inventory,
  onChange,
  coverage = null, // Optional coverage data for live feedback
  showCoverage = false
}) {
  // Constants
  const MATTRESS_SIZES = [
    { id: 'King', name: 'King' },
    { id: 'Queen', name: 'Queen' },
    { id: 'Double', name: 'Double' },
    { id: 'King Single', name: 'King Single' },
    { id: 'Single', name: 'Single' }
  ];

  const FIRMNESS_TYPES = ['firm', 'medium', 'soft'];

  const COMPONENT_TYPES = [
    { id: 'micro_coils', name: 'Micro Coils' },
    { id: 'thin_latex', name: 'Thin Latex' },
    { id: 'felt', name: 'Felt' },
    { id: 'top_panel', name: 'Top Panel' },
    { id: 'bottom_panel', name: 'Bottom Panel' },
    { id: 'side_panel', name: 'Side Panel' }
  ];

  const handleChange = (row, col, value) => {
    onChange(row, col, value === '' ? 0 : parseInt(value) || 0);
  };

  // Springs table
  if (type === 'springs') {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#27272a' }}>
              <th style={headerStyle}>Size</th>
              <th style={headerStyle}>Firm</th>
              <th style={headerStyle}>Medium</th>
              <th style={headerStyle}>Soft</th>
              <th style={headerStyle}>Total</th>
              {showCoverage && <th style={headerStyle}>Coverage</th>}
            </tr>
          </thead>
          <tbody>
            {MATTRESS_SIZES.map(size => {
              const total = FIRMNESS_TYPES.reduce((sum, f) =>
                sum + (inventory[f]?.[size.id] || 0), 0
              );
              const sizeCoverage = coverage?.[size.id];

              return (
                <tr key={size.id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '10px 12px', fontWeight: '600' }}>{size.name}</td>
                  {FIRMNESS_TYPES.map(firmness => (
                    <td key={firmness} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={inventory[firmness]?.[size.id] || 0}
                        onChange={(e) => handleChange(firmness, size.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        style={inputStyle}
                      />
                    </td>
                  ))}
                  <td style={{
                    padding: '10px 12px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: '#60a5fa',
                    textAlign: 'center'
                  }}>
                    {total}
                  </td>
                  {showCoverage && sizeCoverage && (
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <CoverageIndicator months={sizeCoverage} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Components table
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#27272a' }}>
            <th style={headerStyle}>Component</th>
            {MATTRESS_SIZES.map(size => (
              <th key={size.id} style={headerStyle}>{size.name}</th>
            ))}
            <th style={headerStyle}>Total</th>
          </tr>
        </thead>
        <tbody>
          {COMPONENT_TYPES.map(comp => {
            const total = MATTRESS_SIZES.reduce((sum, size) =>
              sum + (inventory[comp.id]?.[size.id] || 0), 0
            );

            return (
              <tr key={comp.id} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>{comp.name}</td>
                {MATTRESS_SIZES.map(size => {
                  // Hide inputs for micro coils and thin latex in small sizes
                  const shouldHide = ['micro_coils', 'thin_latex'].includes(comp.id) &&
                                    ['Double', 'King Single', 'Single'].includes(size.id);

                  return (
                    <td key={size.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {shouldHide ? (
                        <div style={{ color: '#52525b' }}>-</div>
                      ) : (
                        <input
                          type="number"
                          value={inventory[comp.id]?.[size.id] || 0}
                          onChange={(e) => handleChange(comp.id, size.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          style={inputStyle}
                        />
                      )}
                    </td>
                  );
                })}
                <td style={{
                  padding: '10px 12px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#60a5fa',
                  textAlign: 'center'
                }}>
                  {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Helper component for coverage display
function CoverageIndicator({ months }) {
  let color = '#22c55e'; // Green - healthy
  let emoji = '✓';

  if (months < 2) {
    color = '#ef4444'; // Red - critical
    emoji = '⚠️';
  } else if (months < 3) {
    color = '#eab308'; // Yellow - warning
    emoji = '⚡';
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      color
    }}>
      <span>{emoji}</span>
      <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
        {months.toFixed(1)}mo
      </span>
    </div>
  );
}

// Styles
const headerStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  color: '#a1a1aa'
};

const inputStyle = {
  width: '70px',
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '6px',
  padding: '6px 8px',
  textAlign: 'center',
  fontFamily: 'monospace',
  color: '#fafafa',
  fontSize: '13px'
};
