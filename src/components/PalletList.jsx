import React from 'react';

// Live preview of allocated pallets
export default function PalletList({ springOrder, compact = false }) {
  if (!springOrder || !springOrder.pallets) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#a1a1aa',
        fontSize: '14px'
      }}>
        Enter inventory to see pallet allocation
      </div>
    );
  }

  const { pallets, metadata } = springOrder;

  // Compact view - just summary
  if (compact) {
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
          Order Summary
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Total Springs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#a1a1aa' }}>Total Springs:</span>
            <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
              {metadata.total_springs}
            </span>
          </div>

          {/* Total Pallets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#a1a1aa' }}>Total Pallets:</span>
            <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
              {metadata.total_pallets}
            </span>
          </div>

          {/* King Pallets */}
          {metadata.king_pallets > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#a1a1aa' }}>King:</span>
              <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                {metadata.king_pallets} {metadata.king_pallets === 1 ? 'pallet' : 'pallets'}
              </span>
            </div>
          )}

          {/* Queen Pallets */}
          {metadata.queen_pallets > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#a1a1aa' }}>Queen:</span>
              <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                {metadata.queen_pallets} {metadata.queen_pallets === 1 ? 'pallet' : 'pallets'}
              </span>
            </div>
          )}

          {/* Small Sizes */}
          {metadata.small_size_pallets > 0 && metadata.critical_sizes && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#a1a1aa' }}>
                {metadata.critical_sizes.join(', ')}:
              </span>
              <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                {metadata.small_size_pallets} {metadata.small_size_pallets === 1 ? 'pallet' : 'pallets'}
              </span>
            </div>
          )}

          {/* Efficiency */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            paddingTop: '8px',
            borderTop: '1px solid #27272a',
            marginTop: '4px'
          }}>
            <span style={{ color: '#a1a1aa' }}>Pure Pallets:</span>
            <span style={{ fontWeight: '600', color: '#22c55e', fontFamily: 'monospace' }}>
              {metadata.pure_pallets}/{metadata.total_pallets}
              {' '}
              ({Math.round((metadata.pure_pallets / metadata.total_pallets) * 100)}%)
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full view - show all pallets
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#fafafa'
      }}>
        Pallet Breakdown ({pallets.length} pallets)
      </div>

      {/* Pallet Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {pallets.map(pallet => (
          <PalletCard key={pallet.id} pallet={pallet} />
        ))}
      </div>
    </div>
  );
}

// Individual pallet card
function PalletCard({ pallet }) {
  const typeColors = {
    Pure: '#22c55e',
    Mixed: '#eab308',
    Critical: '#ef4444'
  };

  const typeColor = typeColors[pallet.type] || '#60a5fa';

  return (
    <div style={{
      background: '#27272a',
      border: '1px solid #3f3f46',
      borderRadius: '8px',
      padding: '14px',
      fontSize: '13px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <div style={{ fontWeight: '600', fontSize: '12px', color: '#a1a1aa' }}>
          Pallet {pallet.id}
        </div>
        <div style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          background: `${typeColor}20`,
          color: typeColor,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {pallet.type}
        </div>
      </div>

      {/* Size */}
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#fafafa'
      }}>
        {pallet.size}
      </div>

      {/* Firmness Breakdown */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '12px'
      }}>
        {Object.entries(pallet.firmness_breakdown).map(([firmness, count]) => {
          if (count === 0) return null;
          return (
            <div key={firmness} style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{
                textTransform: 'capitalize',
                color: '#a1a1aa'
              }}>
                {firmness}:
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontWeight: '600',
                color: '#fafafa'
              }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #3f3f46',
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        fontSize: '13px'
      }}>
        <span>Total:</span>
        <span style={{
          fontFamily: 'monospace',
          color: '#60a5fa'
        }}>
          {pallet.total}
        </span>
      </div>
    </div>
  );
}
