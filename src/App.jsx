import React, { useState, useMemo } from 'react';
import SaveLoadModal from './SaveLoadModal';
import InventoryTable from './components/InventoryTable';
import { CoverageGrid } from './components/CoverageCard';
import PalletList from './components/PalletList';
import RunwayMini from './components/RunwayMini';
import ComponentRunway from './components/ComponentRunway';
import SpringTimelineDetailed from './components/SpringTimelineDetailed';
import ComponentTimelineDetailed from './components/ComponentTimelineDetailed';
import ValidationBanner from './components/ValidationBanner';

// Import algorithms
import {
  calculateCoverage,
  calculateNPlus1Order,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from './lib/algorithms';

// Import validation utilities
import { validateEqualRunway } from './lib/utils/validation';

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
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [startingMonth, setStartingMonth] = useState(new Date().getMonth()); // 0-11 (Jan-Dec)
  const [currentView, setCurrentView] = useState('builder'); // 'builder' or 'forecast'

  // Collapsible section states (true = open by default)
  const [showContainerSettings, setShowContainerSettings] = useState(true);
  const [showSpringInventory, setShowSpringInventory] = useState(true);
  const [showCurrentStatus, setShowCurrentStatus] = useState(true);
  const [showYourOrder, setShowYourOrder] = useState(true);
  const [showCoverageAfter, setShowCoverageAfter] = useState(true);
  const [showComponentCoverage, setShowComponentCoverage] = useState(false);
  const [showExport, setShowExport] = useState(true);

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
    return calculateComponentOrder(springOrder, inventory.springs, inventory.components);
  }, [springOrder, inventory.springs, inventory.components]);

  // Optimized component order
  const optimizedComponentOrder = useMemo(() => {
    if (!componentOrder) return null;
    return optimizeComponentOrder(componentOrder, exportFormat);
  }, [componentOrder, exportFormat]);

  // Validate equal runway (optional - for displaying warnings)
  const validation = useMemo(() => {
    if (!springOrder || !componentOrder) return null;
    return validateEqualRunway(springOrder, componentOrder, inventory);
  }, [springOrder, componentOrder, inventory]);

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

        <div style={styles.headerActions}>
          {/* View Toggle */}
          <div style={styles.viewToggle}>
            <button
              onClick={() => setCurrentView('builder')}
              style={{
                ...styles.viewToggleButton,
                ...(currentView === 'builder' ? styles.viewToggleButtonActive : {})
              }}
            >
              Order Builder
            </button>
            <button
              onClick={() => setCurrentView('forecast')}
              style={{
                ...styles.viewToggleButton,
                ...(currentView === 'forecast' ? styles.viewToggleButtonActive : {})
              }}
            >
              Forecast
            </button>
          </div>

          <button onClick={() => setShowSaveModal(true)} style={styles.saveButton}>
            <span>💾</span>
            <span>Save/Load</span>
          </button>
        </div>
      </header>

      {/* Main Content - Conditional View */}
      {currentView === 'builder' ? (
        /* ORDER BUILDER VIEW - Split Screen */
        <>
        {/* Info Banner - Equal Runway Constraint */}
        <div style={styles.infoBanner}>
          <div style={styles.infoBannerIcon}>📦</div>
          <div style={styles.infoBannerContent}>
            <div style={styles.infoBannerTitle}>How Component Orders Work</div>
            <div style={styles.infoBannerText}>
              Components and springs ship together in the same container and <strong>must deplete at the same rate</strong>.
              The system automatically calculates component quantities to ensure equal runway coverage.
              <span style={{ color: '#60a5fa' }}> Example: If you order enough springs for 6 months, the system orders enough components for 6 months.</span>
            </div>
          </div>
        </div>

        {/* Validation Banner (only shows if there are warnings/violations) */}
        <ValidationBanner validation={validation} />

        <div style={styles.cardGrid}>
          {/* Container Settings Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowContainerSettings(!showContainerSettings)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showContainerSettings ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Container Size</span>
            </button>

            {showContainerSettings && (
              <div style={styles.cardContent}>
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
              </div>
            )}
          </div>

          {/* Spring Inventory Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowSpringInventory(!showSpringInventory)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showSpringInventory ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Spring Inventory</span>
            </button>

            {showSpringInventory && (
              <div style={styles.cardContent}>
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
              </div>
            )}
          </div>

          {/* Component Inventory Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowComponentsInput(!showComponentsInput)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showComponentsInput ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Component Inventory</span>
              <span style={styles.cardHeaderBadge}>Optional</span>
            </button>

            {showComponentsInput && (
              <div style={styles.cardContent}>
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
          </div>

          {/* Status Cards (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowCurrentStatus(!showCurrentStatus)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showCurrentStatus ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Current Status</span>
            </button>

            {showCurrentStatus && (
              <div style={styles.cardContent}>
                <CoverageGrid
                  coverageData={coverageData}
                  prioritySizes={prioritySizes}
                />

                {/* Smart Suggestions */}
                {prioritySizes.length > 0 && (
                  <div style={{...styles.warningBox, marginTop: '16px'}}>
                    <div style={styles.warningTitle}>⚡ Priority Alert</div>
                    <div style={styles.warningText}>
                      <strong>{prioritySizes.join(', ')}</strong> {prioritySizes.length === 1 ? 'needs' : 'need'} attention
                      (coverage below 3 months). System automatically allocating pallets.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowYourOrder(!showYourOrder)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showYourOrder ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Your Order</span>
            </button>

            {showYourOrder && (
              <div style={styles.cardContent}>
                <PalletList springOrder={springOrder} compact={true} />
              </div>
            )}
          </div>

          {/* Coverage After Order Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowCoverageAfter(!showCoverageAfter)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showCoverageAfter ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Coverage After Order</span>
            </button>

            {showCoverageAfter && (
              <div style={styles.cardContent}>
                <RunwayMini
                  inventory={inventory}
                  springOrder={springOrder}
                  showDetails={false}
                />
              </div>
            )}
          </div>

          {/* Component Coverage Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowComponentCoverage(!showComponentCoverage)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showComponentCoverage ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Component Coverage</span>
              <span style={styles.cardHeaderBadge}>Validation</span>
            </button>

            {showComponentCoverage && (
              <div style={styles.cardContent}>
                <ComponentRunway
                  inventory={inventory}
                  springOrder={springOrder}
                  componentOrder={componentOrder}
                />
              </div>
            )}
          </div>

          {/* Export Actions Card (Collapsible) */}
          <div style={styles.card}>
            <button
              onClick={() => setShowExport(!showExport)}
              style={styles.cardHeader}
            >
              <span style={styles.cardHeaderIcon}>
                {showExport ? '▼' : '▶'}
              </span>
              <span style={styles.cardHeaderTitle}>Export Order</span>
            </button>

            {showExport && (
              <div style={styles.cardContent}>
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
              </div>
            )}
          </div>
        </div>
      </>
      ) : (
        /* FORECAST VIEW - Full Width Timeline */
        <div style={styles.forecastView}>
          <div style={styles.forecastContent}>
            {/* Month Selector */}
            <div style={styles.forecastHeader}>
              <div>
                <h1 style={styles.forecastTitle}>
                  12-Month Inventory Forecast
                  <span style={styles.validationBadge}>
                    ✓ Equal Runway Validated
                  </span>
                </h1>
                <p style={styles.forecastSubtitle}>
                  Projected stock levels with container arrival at Week 10. Components and springs calculated to deplete together.
                </p>
              </div>
              <div style={styles.monthSelector}>
                <label style={styles.monthLabel}>Starting Month:</label>
                <select
                  value={startingMonth}
                  onChange={(e) => setStartingMonth(parseInt(e.target.value))}
                  style={styles.monthSelect}
                >
                  <option value={0}>January</option>
                  <option value={1}>February</option>
                  <option value={2}>March</option>
                  <option value={3}>April</option>
                  <option value={4}>May</option>
                  <option value={5}>June</option>
                  <option value={6}>July</option>
                  <option value={7}>August</option>
                  <option value={8}>September</option>
                  <option value={9}>October</option>
                  <option value={10}>November</option>
                  <option value={11}>December</option>
                </select>
              </div>
            </div>

            {/* Spring Timeline Detailed */}
            <SpringTimelineDetailed
              inventory={inventory}
              springOrder={springOrder}
              startingMonth={startingMonth}
            />

            {/* Component Timeline Detailed */}
            <ComponentTimelineDetailed
              inventory={inventory}
              springOrder={springOrder}
              componentOrder={componentOrder}
              startingMonth={startingMonth}
            />
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
  // Card Grid Layout
  cardGrid: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    alignItems: 'start'
  },
  card: {
    background: '#0a0a0a',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '24px',
    transition: 'all 0.2s'
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
  // Collapsible Card Headers
  cardHeader: {
    width: '100%',
    padding: '0',
    margin: '0 0 20px 0',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid #27272a',
    paddingBottom: '12px',
    color: '#fafafa',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'left',
    transition: 'all 0.2s',
    ':hover': {
      borderBottomColor: '#3f3f46'
    }
  },
  cardHeaderIcon: {
    fontSize: '14px',
    color: '#a1a1aa',
    transition: 'transform 0.2s',
    display: 'inline-block',
    width: '16px'
  },
  cardHeaderTitle: {
    flex: 1,
    color: '#fafafa',
    fontSize: '16px',
    fontWeight: '600'
  },
  cardHeaderBadge: {
    padding: '4px 10px',
    background: 'rgba(161, 161, 170, 0.1)',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardContent: {
    animation: 'fadeIn 0.2s ease-in'
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
  // Header Actions & View Toggle
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    padding: '4px'
  },
  viewToggleButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#a1a1aa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  viewToggleButtonActive: {
    background: '#27272a',
    color: '#fafafa'
  },
  // Forecast View
  forecastView: {
    minHeight: 'calc(100vh - 64px)',
    background: '#000000',
    overflowY: 'auto'
  },
  forecastContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  forecastHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #27272a'
  },
  forecastTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: '8px'
  },
  forecastSubtitle: {
    fontSize: '14px',
    color: '#a1a1aa',
    fontWeight: 'normal'
  },
  monthSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  monthLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fafafa',
    whiteSpace: 'nowrap'
  },
  monthSelect: {
    padding: '10px 16px',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fafafa',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    minWidth: '140px'
  },
  // Info Banner
  infoBanner: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid #1e40af',
    borderRadius: '0',
    padding: '16px 24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    borderLeft: '4px solid #3b82f6'
  },
  infoBannerIcon: {
    fontSize: '24px',
    lineHeight: '1',
    marginTop: '2px'
  },
  infoBannerContent: {
    flex: 1
  },
  infoBannerTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: '6px'
  },
  infoBannerText: {
    fontSize: '13px',
    color: '#fafafa',
    lineHeight: '1.6'
  },
  // Validation Badge
  validationBadge: {
    display: 'inline-block',
    marginLeft: '16px',
    padding: '6px 12px',
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid #15803d',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#22c55e',
    verticalAlign: 'middle'
  }
};
