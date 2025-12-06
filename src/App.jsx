import React, { useState, useMemo } from 'react';
import SaveLoadModal from './SaveLoadModal';
import OrderBuilderView from './views/OrderBuilderView';
import ForecastView from './views/ForecastView';
import ForecastV2View from './views/ForecastV2View';

// Import algorithms
import {
  calculateCoverage,
  calculateKingQueenFirstOrder,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV,
  calculateAnnualProjection
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
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [startingMonth, setStartingMonth] = useState(new Date().getMonth()); // 0-11 (Jan-Dec)
  const [currentView, setCurrentView] = useState('builder'); // 'builder' or 'forecast'

  // Single-expansion accordion state
  const [openSection, setOpenSection] = useState('springInventory');

  // Toggle section (single-expansion: clicking same section closes it, clicking different opens that one)
  const toggleSection = (sectionName) => {
    setOpenSection(openSection === sectionName ? null : sectionName);
  };

  const [inventory, setInventory] = useState({
    springs: createEmptySpringInventory(),
    components: createEmptyComponentInventory()
  });

  // Calculate spring order (NEW: Fill King/Queen First algorithm)
  const springOrder = useMemo(() => {
    return calculateKingQueenFirstOrder(palletCount, inventory);
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

  // Calculate annual projection for Forecast V2 (uses Order Builder order with smart timing)
  const annualProjection = useMemo(() => {
    if (!springOrder || !componentOrder) return null;
    try {
      // Pass Order Builder order to projection - it will use YOUR order but time it smartly
      return calculateAnnualProjection(
        inventory,
        startingMonth,
        springOrder,        // Use YOUR spring order
        componentOrder,     // Use YOUR component order
        palletCount         // Use YOUR pallet count
      );
    } catch (error) {
      console.error('Error calculating annual projection:', error);
      return null;
    }
  }, [inventory, startingMonth, springOrder, componentOrder, palletCount]);

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
          <div style={styles.brandRow}>
            <span style={styles.brandName}>AusBeds</span>
            <span style={styles.brandDivider}>|</span>
            <span style={styles.countryBadge}>CHINA</span>
            <span style={styles.brandDivider}>|</span>
            <span style={styles.appName}>Spring Order</span>
          </div>
          <div style={styles.headerSubtitle}>Springs & Components | Coverage-Equalized Ordering</div>
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
              Forecast 1
            </button>
            <button
              onClick={() => setCurrentView('forecastv2')}
              style={{
                ...styles.viewToggleButton,
                ...(currentView === 'forecastv2' ? styles.viewToggleButtonActive : {})
              }}
            >
              Forecast 2
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
        <OrderBuilderView
          openSection={openSection}
          toggleSection={toggleSection}
          palletCount={palletCount}
          setPalletCount={setPalletCount}
          inventory={inventory}
          updateSpringInventory={updateSpringInventory}
          updateComponentInventory={updateComponentInventory}
          coverageData={coverageData}
          springOrder={springOrder}
          copyToClipboard={copyToClipboard}
          downloadTSV={downloadTSV}
          copyFeedback={copyFeedback}
          validation={validation}
          styles={styles}
        />
      ) : currentView === 'forecast' ? (
        <ForecastView
          startingMonth={startingMonth}
          setStartingMonth={setStartingMonth}
          inventory={inventory}
          springOrder={springOrder}
          componentOrder={componentOrder}
          styles={styles}
        />
      ) : (
        <ForecastV2View
          startingMonth={startingMonth}
          setStartingMonth={setStartingMonth}
          projection={annualProjection}
          styles={styles}
        />
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
    background: '#0a0a0b',
    color: '#e5e5e5',
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  header: {
    position: 'sticky',
    top: 0,
    height: '64px',
    background: 'rgba(17, 17, 19, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #1f1f23',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '2px'
  },
  brandName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0ea5e9',
    letterSpacing: '-0.3px'
  },
  brandDivider: {
    fontSize: '18px',
    color: '#3f3f46',
    fontWeight: '300'
  },
  countryBadge: {
    padding: '3px 10px',
    background: 'rgba(14, 165, 233, 0.2)',
    border: '1px solid rgba(14, 165, 233, 0.4)',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    color: '#38bdf8'
  },
  appName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e5e5e5',
    letterSpacing: '-0.3px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  headerSubtitle: {
    fontSize: '11px',
    color: '#71717a'
  },
  saveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #27272a',
    fontWeight: '600',
    cursor: 'pointer',
    background: '#18181b',
    color: '#38bdf8',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px'
  },
  // Accordion Container - Single column full-width layout
  accordionContainer: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  },
  card: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #27272a',
    borderRadius: '0',
    padding: '12px 0',
    transition: 'all 0.2s',
    width: '100%',
    minWidth: 0,
    overflow: 'hidden'
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
    marginBottom: '10px'
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
    padding: '12px 0',
    margin: '0',
    background: 'transparent',
    border: 'none',
    borderBottom: 'none',
    color: '#fafafa',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  cardHeaderIcon: {
    fontSize: '12px',
    color: '#a1a1aa',
    transition: 'transform 0.2s',
    display: 'inline-block',
    width: '14px'
  },
  cardHeaderTitle: {
    flex: 1,
    color: '#fafafa',
    fontSize: '15px',
    fontWeight: '600'
  },
  cardHeaderBadge: {
    padding: '2px 8px',
    background: 'rgba(161, 161, 170, 0.1)',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  cardContent: {
    paddingTop: '12px',
    paddingBottom: '12px',
    animation: 'fadeIn 0.2s ease-in'
  },
  warningBox: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid #a16207',
    borderRadius: '6px',
    padding: '10px',
    marginBottom: '12px'
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
  // Info Card Styles
  infoCardText: {
    fontSize: '14px',
    color: '#d4d4d8',
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  infoCardExample: {
    padding: '12px',
    background: 'rgba(96, 165, 250, 0.1)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#60a5fa',
    lineHeight: '1.5'
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
    background: '#0a0a0b',
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
