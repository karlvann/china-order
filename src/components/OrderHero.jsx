import React from 'react';
import { MIN_PALLETS, MAX_PALLETS, SPRINGS_PER_PALLET } from '../lib/constants';

export default function OrderHero({
  palletCount,
  onPalletChange,
  springOrder,
  onCopyToClipboard,
  onDownload,
  copyFeedback
}) {
  // Extract data from springOrder structure
  const SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
  const metadata = springOrder?.metadata || {};
  const totalSprings = metadata.total_springs || 0;

  // Calculate springs per size from pallets
  const springsBySize = {};
  if (springOrder?.pallets) {
    springOrder.pallets.forEach(pallet => {
      if (!springsBySize[pallet.size]) {
        springsBySize[pallet.size] = 0;
      }
      springsBySize[pallet.size] += pallet.total || 0;
    });
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Recommended Spring Order</h2>
        <div style={styles.totalBadge}>
          {palletCount} pallets
        </div>
      </div>

      {/* Pallet Slider */}
      <div style={styles.sliderSection}>
        <label style={styles.sliderLabel}>
          Container Size: <strong>{palletCount} pallets</strong> ({totalSprings} springs)
        </label>
        <input
          type="range"
          min={MIN_PALLETS}
          max={MAX_PALLETS}
          value={palletCount}
          onChange={(e) => onPalletChange(parseInt(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.sliderMarks}>
          {Array.from({ length: MAX_PALLETS - MIN_PALLETS + 1 }, (_, i) => MIN_PALLETS + i).map(n => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>

      {/* Order Summary Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Springs</th>
              <th style={styles.th}>Pallets</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map(size => {
              const qty = springsBySize[size] || 0;
              const sizePallets = Math.ceil(qty / SPRINGS_PER_PALLET);
              return (
                <tr key={size}>
                  <td style={styles.tdLabel}>{size}</td>
                  <td style={styles.tdValue}>
                    {qty > 0 ? (
                      <span style={styles.orderQty}>+{qty}</span>
                    ) : (
                      <span style={styles.orderZero}>—</span>
                    )}
                  </td>
                  <td style={styles.tdPallet}>
                    {sizePallets > 0 ? `${sizePallets}p` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={styles.tdLabel}><strong>Total</strong></td>
              <td style={styles.tdGrandTotal}>{totalSprings}</td>
              <td style={styles.tdPallet}><strong>{metadata.total_pallets || palletCount}p</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button onClick={onCopyToClipboard} style={styles.primaryBtn}>
          {copyFeedback ? '✓ Copied!' : 'Copy TSV'}
        </button>
        <button onClick={onDownload} style={styles.secondaryBtn}>
          Download TSV
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: '#fafafa'
  },
  totalBadge: {
    background: '#22c55e',
    color: '#000',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: '700'
  },
  sliderSection: {
    marginBottom: '24px'
  },
  sliderLabel: {
    display: 'block',
    color: '#a1a1aa',
    marginBottom: '12px',
    fontSize: '14px'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: '#27272a',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#71717a',
    fontSize: '11px',
    marginTop: '6px'
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '15px'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'center',
    color: '#a1a1aa',
    fontWeight: '600',
    borderBottom: '2px solid #27272a',
    textTransform: 'uppercase',
    fontSize: '12px',
    letterSpacing: '0.5px'
  },
  tdLabel: {
    padding: '14px 16px',
    color: '#d4d4d8',
    borderBottom: '1px solid #27272a',
    fontWeight: '500'
  },
  tdValue: {
    padding: '14px 16px',
    textAlign: 'center',
    borderBottom: '1px solid #27272a',
    fontFamily: 'monospace',
    fontSize: '16px'
  },
  tdPallet: {
    padding: '14px 16px',
    textAlign: 'center',
    borderBottom: '1px solid #27272a',
    color: '#a1a1aa',
    fontWeight: '500'
  },
  tdGrandTotal: {
    padding: '14px 16px',
    textAlign: 'center',
    borderBottom: '1px solid #27272a',
    color: '#22c55e',
    fontWeight: '700',
    fontSize: '18px'
  },
  orderQty: {
    color: '#22c55e',
    fontWeight: '700'
  },
  orderZero: {
    color: '#52525b'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    flex: 1,
    minWidth: '140px',
    padding: '14px 24px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  secondaryBtn: {
    flex: 1,
    minWidth: '140px',
    padding: '14px 24px',
    background: 'transparent',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    color: '#3b82f6',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
