import React from 'react';

/**
 * ValidationBanner - Displays equal runway validation warnings/violations
 * Only shows if there are issues detected
 */
export default function ValidationBanner({ validation }) {
  if (!validation) return null;
  if (validation.allValid && validation.warnings.length === 0) return null;

  const hasViolations = validation.violations.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div style={{
      ...styles.container,
      ...(hasViolations ? styles.containerError : styles.containerWarning)
    }}>
      <div style={styles.header}>
        {hasViolations ? '⚠️ Equal Runway Violations Detected' : '⚡ Equal Runway Warnings'}
      </div>

      <div style={styles.description}>
        {hasViolations ? (
          <>
            <strong>Critical:</strong> Components and springs will NOT deplete at the same rate.
            This may cause production stops.
          </>
        ) : (
          <>
            <strong>Notice:</strong> Minor rounding differences detected (typical in edge cases).
          </>
        )}
      </div>

      {hasViolations && validation.violations.length > 0 && (
        <div style={styles.details}>
          <strong>Violations:</strong>
          <ul style={styles.list}>
            {validation.violations.slice(0, 3).map((v, i) => (
              <li key={i}>
                <strong>{v.size}</strong> {v.componentId}:
                {' '}{Math.abs(v.springCoverage - v.componentCoverage).toFixed(1)} months difference
                {' '}(Springs: {v.springCoverage.toFixed(1)}mo, Component: {v.componentCoverage.toFixed(1)}mo)
              </li>
            ))}
            {validation.violations.length > 3 && (
              <li style={styles.moreItems}>+ {validation.violations.length - 3} more violations</li>
            )}
          </ul>
        </div>
      )}

      {hasWarnings && !hasViolations && validation.warnings.length > 0 && (
        <div style={styles.details}>
          <strong>Warnings:</strong>
          <ul style={styles.list}>
            {validation.warnings.slice(0, 2).map((w, i) => (
              <li key={i}>
                <strong>{w.size}</strong> {w.componentId}:
                {' '}{Math.abs(w.springCoverage - w.componentCoverage).toFixed(1)} months difference
              </li>
            ))}
            {validation.warnings.length > 2 && (
              <li style={styles.moreItems}>+ {validation.warnings.length - 2} more warnings</li>
            )}
          </ul>
        </div>
      )}

      <div style={styles.footer}>
        {hasViolations ? (
          <>This may indicate a calculation issue. Review component orders carefully.</>
        ) : (
          <>This is typical with side panel consolidation or odd container sizes. Generally safe to proceed.</>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: '1.5',
    border: '1px solid'
  },
  containerWarning: {
    backgroundColor: '#2d2400',
    borderColor: '#665500',
    color: '#ffeb99'
  },
  containerError: {
    backgroundColor: '#2d0000',
    borderColor: '#660000',
    color: '#ffcccc'
  },
  header: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '6px'
  },
  description: {
    marginBottom: '8px',
    opacity: 0.9
  },
  details: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  list: {
    margin: '6px 0 0 0',
    paddingLeft: '20px',
    fontSize: '13px'
  },
  moreItems: {
    opacity: 0.7,
    fontStyle: 'italic'
  },
  footer: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '12px',
    opacity: 0.8
  }
};
