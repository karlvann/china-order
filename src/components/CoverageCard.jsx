import React from 'react';

// Visual status card showing coverage for each mattress size
export default function CoverageCard({ size, coverage, isHighPriority = false }) {
  // Determine status based on coverage months
  let status = 'healthy';
  let statusColor = '#22c55e';
  let bgColor = 'rgba(34, 197, 94, 0.1)';
  let emoji = '✓';

  if (coverage < 2) {
    status = 'critical';
    statusColor = '#ef4444';
    bgColor = 'rgba(239, 68, 68, 0.1)';
    emoji = '🚨';
  } else if (coverage < 3) {
    status = 'warning';
    statusColor = '#eab308';
    bgColor = 'rgba(234, 179, 8, 0.1)';
    emoji = '⚡';
  } else if (coverage < 4) {
    status = 'caution';
    statusColor = '#60a5fa';
    bgColor = 'rgba(96, 165, 250, 0.1)';
    emoji = '⚠️';
  }

  return (
    <div style={{
      background: bgColor,
      border: `2px solid ${statusColor}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '140px',
      position: 'relative'
    }}>
      {/* Priority Badge */}
      {isHighPriority && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#facc15',
          color: '#000000',
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          Priority
        </div>
      )}

      {/* Emoji & Size Name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#fafafa'
        }}>
          {size}
        </div>
        <div style={{ fontSize: '20px' }}>
          {emoji}
        </div>
      </div>

      {/* Coverage Display */}
      <div style={{
        fontSize: '28px',
        fontWeight: 'bold',
        color: statusColor,
        fontFamily: 'monospace',
        lineHeight: 1
      }}>
        {coverage.toFixed(1)}
        <span style={{ fontSize: '14px', marginLeft: '4px' }}>mo</span>
      </div>

      {/* Status Label */}
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: statusColor,
        fontWeight: '600'
      }}>
        {status}
      </div>
    </div>
  );
}

// Grid wrapper for multiple coverage cards
export function CoverageGrid({ coverageData, prioritySizes = [] }) {
  const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    }}>
      {MATTRESS_SIZES.map(size => (
        <CoverageCard
          key={size}
          size={size}
          coverage={coverageData[size] || 0}
          isHighPriority={prioritySizes.includes(size)}
        />
      ))}
    </div>
  );
}
