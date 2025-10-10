import React, { useState, useMemo } from 'react';
import SaveLoadModal from './SaveLoadModal';
import InventoryTable from './components/InventoryTable';
import { CoverageGrid } from './components/CoverageCard';
import PalletList from './components/PalletList';
import RunwayMini from './components/RunwayMini';

// Import algorithms
import {
  calculateCoverage,
  calculateNPlus1Order,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from './lib/algorithms';

// Import constants
import {
  DEFAULT_PALLETS,
  MIN_PALLETS,
  MAX_PALLETS,
  MONTHLY_SALES_RATE
} from './lib/constants';

// Import utilities
import {
  createEmptySpringInventory,
  createEmptyComponentInventory
} from './lib/utils/inventory';

export default function App() {
  // State
  const [palletCount, setPalletCount] = useState(DEFAULT_PALLETS);
  const [exportFormat, setExportFormat] = useState('optimized');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showComponentsInput, setShowComponentsInput] = useState(false);
  const [showAdvancedDrawer, setShowAdvancedDrawer] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [inventory, setInventory] = useState({
    springs: createEmptySpringInventory(),
    components: createEmptyComponentInventory()
  });

  // Calculate spring order
  const springOrder = useMemo(() => {
    return calculateNPlus1Order(palletCount, inventory);
  }, [palletCount, inventory]);

  // Calculate component order
  const componentOrder = useMemo(() => {
    if (!springOrder) return null;
    return calculateComponentOrder(springOrder, inventory.components);
  }, [springOrder, inventory.components]);

  // Optimized component order
  const optimizedComponentOrder = useMemo(() => {
    if (!componentOrder) return null;
    return optimizeComponentOrder(componentOrder, exportFormat);
  }, [componentOrder, exportFormat]);

  // TSV export
  const tsvContent = useMemo(() => {
    if (!springOrder || !optimizedComponentOrder) return '';
    return generateTSV(springOrder, optimizedComponentOrder, exportFormat);
  }, [springOrder, optimizedComponentOrder, exportFormat]);

  // Calculate coverage for all sizes (for status cards)
  const coverageData = useMemo(() => {
    const MATTRESS_SIZES = ['King', 'Queen', 'Double', 'King Single', 'Single'];
    const coverage = {};

    MATTRESS_SIZES.forEach(size => {
      const totalStock = ['firm', 'medium', 'soft'].reduce((sum, firmness) =>
        sum + (inventory.springs[firmness][size] || 0), 0
      );
      const monthlySales = MONTHLY_SALES_RATE[size];
      coverage[size] = monthlySales > 0 ? totalStock / monthlySales : 0;
    });

    return coverage;
  }, [inventory.springs]);

  // Identify priority sizes (low coverage)
  const prioritySizes = useMemo(() => {
    return Object.entries(coverageData)
      .filter(([_, months]) => months < 3)
      .map(([size, _]) => size);
  }, [coverageData]);

  // Update functions
  const updateSpringInventory = (firmness, size, value) => {
    setInventory(prev => ({
      ...prev,
      springs: {
        ...prev.springs,
        [firmness]: {
          ...prev.springs[firmness],
          [size]: value
        }
      }
    }));
  };

  const updateComponentInventory = (component, size, value) => {
    setInventory(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [component]: {
          ...prev.components[component],
          [size]: value
        }
      }
    }));
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  // Download TSV
  const downloadTSV = () => {
    const date = new Date().toISOString().split('T')[0];
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `china-order-${date}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save/Load functions
  const getCurrentSaveData = () => ({
    inventory,
    settings: {
      palletCount,
      exportFormat
    }
  });

  const applyLoadedData = (data) => {
    if (data.inventory) {
      setInventory(data.inventory);
    }
    if (data.settings) {
      if (data.settings.palletCount !== undefined) {
        setPalletCount(data.settings.palletCount);
      }
      if (data.settings.exportFormat !== undefined) {
        setExportFormat(data.settings.exportFormat);
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <div style={styles.headerTitle}>China Order System</div>
          <div style={styles.headerSubtitle}>Spring & Component Ordering</div>
        </div>
        <button onClick={() => setShowSaveModal(true)} style={styles.saveButton}>
          <span>💾</span>
          <span>Save/Load</span>
        </button>
      </header>

      {/* Main Content - Split Screen */}
      <div style={styles.mainContent}>
        {/* LEFT PANEL - Input */}
        <div style={styles.leftPanel}>
          <div style={styles.panelContent}>
            {/* Container Settings */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Container Size</h2>
              <div style={styles.sliderContainer}>
                <input
                  type="range"
                  min={MIN_PALLETS}
                  max={MAX_PALLETS}
                  value={palletCount}
                  onChange={(e) => setPalletCount(parseInt(e.target.value))}
                  style={styles.slider}
                />
                <div style={styles.sliderValue}>
                  <div style={styles.sliderValueNumber}>{palletCount}</div>
                  <div style={styles.sliderValueLabel}>pallets</div>
                </div>
              </div>
            </section>

            {/* Spring Inventory */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Spring Inventory</h2>
              <p style={styles.sectionDescription}>
                Enter current stock for each size and firmness
              </p>
              <InventoryTable
                type="springs"
                inventory={inventory.springs}
                onChange={updateSpringInventory}
                coverage={coverageData}
                showCoverage={false}
              />
            </section>

            {/* Component Inventory (Collapsible) */}
            <section style={styles.section}>
              <button
                onClick={() => setShowComponentsInput(!showComponentsInput)}
                style={styles.collapsibleButton}
              >
                <span style={styles.collapsibleIcon}>
                  {showComponentsInput ? '▼' : '▶'}
                </span>
                <span>Component Inventory</span>
                <span style={styles.collapsibleHint}>(Optional)</span>
              </button>

              {showComponentsInput && (
                <div style={{ marginTop: '12px' }}>
                  <p style={styles.sectionDescription}>
                    Enter current component stock. Micro coils & thin latex only for King/Queen.
                  </p>
                  <InventoryTable
                    type="components"
                    inventory={inventory.components}
                    onChange={updateComponentInventory}
                  />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* RIGHT PANEL - Live Results */}
        <div style={styles.rightPanel}>
          <div style={styles.panelContent}>
            {/* Coverage Status Cards */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Current Status</h2>
              <CoverageGrid
                coverageData={coverageData}
                prioritySizes={prioritySizes}
              />
            </section>

            {/* Smart Suggestions */}
            {prioritySizes.length > 0 && (
              <div style={styles.warningBox}>
                <div style={styles.warningTitle}>⚡ Priority Alert</div>
                <div style={styles.warningText}>
                  <strong>{prioritySizes.join(', ')}</strong> {prioritySizes.length === 1 ? 'needs' : 'need'} attention
                  (coverage below 3 months). System automatically allocating pallets.
                </div>
              </div>
            )}

            {/* Order Summary */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Your Order</h2>
              <PalletList springOrder={springOrder} compact={true} />
            </section>

            {/* Coverage After Order */}
            <section style={styles.section}>
              <RunwayMini
                inventory={inventory}
                springOrder={springOrder}
                showDetails={false}
              />
            </section>

            {/* Export Actions */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Export Order</h2>

              {/* Export Format Toggle */}
              <div style={styles.exportFormatContainer}>
                <button
                  onClick={() => setExportFormat('exact')}
                  style={{
                    ...styles.exportFormatButton,
                    ...(exportFormat === 'exact' ? styles.exportFormatButtonActive : {})
                  }}
                >
                  Exact
                </button>
                <button
                  onClick={() => setExportFormat('optimized')}
                  style={{
                    ...styles.exportFormatButton,
                    ...(exportFormat === 'optimized' ? styles.exportFormatButtonActive : {})
                  }}
                >
                  Optimized
                </button>
              </div>

              {/* Export Buttons */}
              <div style={styles.exportActions}>
                <button onClick={copyToClipboard} style={styles.exportButtonPrimary}>
                  {copyFeedback ? '✓ Copied!' : '📋 Copy TSV'}
                </button>
                <button onClick={downloadTSV} style={styles.exportButtonSecondary}>
                  💾 Download
                </button>
              </div>

              <div style={styles.exportHint}>
                Paste directly into Google Sheets or send to supplier
              </div>
            </section>

            {/* Advanced Details Toggle */}
            <div style={styles.advancedToggle}>
              <button
                onClick={() => setShowAdvancedDrawer(!showAdvancedDrawer)}
                style={styles.advancedToggleButton}
              >
                {showAdvancedDrawer ? '▲' : '▼'} Advanced Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Drawer */}
      {showAdvancedDrawer && (
        <div style={styles.advancedDrawer}>
          <div style={styles.advancedContent}>
            {/* Full Pallet Breakdown */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Detailed Pallet Breakdown</h2>
              <PalletList springOrder={springOrder} compact={false} />
            </section>

            {/* Full Runway Table */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Detailed Runway Forecast</h2>
              <RunwayMini
                inventory={inventory}
                springOrder={springOrder}
                showDetails={true}
              />
            </section>

            {/* TSV Preview */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>TSV Preview</h2>
              <pre style={styles.tsvPreview}>{tsvContent}</pre>
            </section>
          </div>
        </div>
      )}

      {/* Save/Load Modal */}
      <SaveLoadModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        currentData={getCurrentSaveData()}
        onLoad={applyLoadedData}
      />
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    color: '#fafafa',
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  header: {
    position: 'sticky',
    top: 0,
    height: '64px',
    background: 'rgba(24, 24, 27, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#a1a1aa'
  },
  saveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #27272a',
    fontWeight: '600',
    cursor: 'pointer',
    background: '#18181b',
    color: '#60a5fa',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px'
  },
  mainContent: {
    display: 'flex',
    minHeight: 'calc(100vh - 64px)',
    gap: '1px',
    background: '#27272a'
  },
  leftPanel: {
    flex: '0 0 42%',
    background: '#000000',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 64px)'
  },
  rightPanel: {
    flex: '1',
    background: '#000000',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 64px)'
  },
  panelContent: {
    padding: '24px'
  },
  section: {
    marginBottom: '28px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#fafafa'
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#a1a1aa',
    marginBottom: '12px'
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    background: '#27272a',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none'
  },
  sliderValue: {
    textAlign: 'center',
    minWidth: '70px'
  },
  sliderValueNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    lineHeight: 1
  },
  sliderValueLabel: {
    fontSize: '11px',
    color: '#a1a1aa'
  },
  collapsibleButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  collapsibleIcon: {
    fontSize: '12px',
    color: '#a1a1aa'
  },
  collapsibleHint: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#71717a',
    fontWeight: 'normal'
  },
  warningBox: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid #a16207',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '20px'
  },
  warningTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#facc15',
    marginBottom: '6px'
  },
  warningText: {
    fontSize: '13px',
    color: '#fafafa',
    lineHeight: '1.5'
  },
  exportFormatContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  exportFormatButton: {
    flex: 1,
    padding: '10px',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '6px',
    color: '#a1a1aa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  exportFormatButtonActive: {
    background: '#27272a',
    borderColor: '#ffffff',
    color: '#ffffff'
  },
  exportActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px'
  },
  exportButtonPrimary: {
    flex: 1,
    padding: '12px 20px',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  exportButtonSecondary: {
    padding: '12px 20px',
    background: '#18181b',
    color: '#fafafa',
    border: '1px solid #27272a',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  exportHint: {
    fontSize: '12px',
    color: '#71717a',
    fontStyle: 'italic'
  },
  advancedToggle: {
    marginTop: '24px',
    textAlign: 'center'
  },
  advancedToggleButton: {
    padding: '10px 24px',
    background: 'transparent',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#a1a1aa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  advancedDrawer: {
    background: '#0a0a0a',
    borderTop: '2px solid #27272a',
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  advancedContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  tsvPreview: {
    background: '#000000',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '16px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '11px',
    maxHeight: '400px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    color: '#a1a1aa'
  }
};
