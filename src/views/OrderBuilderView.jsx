import React from 'react';
import InventoryTable from '../components/InventoryTable';
import PalletList from '../components/PalletList';
import ValidationBanner from '../components/ValidationBanner';
import HealthAlert from '../components/HealthAlert';
import OrderHero from '../components/OrderHero';
import { MIN_PALLETS, MAX_PALLETS } from '../lib/constants';

export default function OrderBuilderView({
  openSection,
  toggleSection,
  palletCount,
  setPalletCount,
  inventory,
  updateSpringInventory,
  updateComponentInventory,
  coverageData,
  springOrder,
  exportFormat,
  setExportFormat,
  copyToClipboard,
  downloadTSV,
  copyFeedback,
  validation,
  styles
}) {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {/* Health Alert - Shows inventory status at top */}
      <HealthAlert inventory={inventory.springs} />

      {/* Order Hero - Prominent order summary */}
      <OrderHero
        palletCount={palletCount}
        onPalletChange={setPalletCount}
        springOrder={springOrder}
        onCopyToClipboard={copyToClipboard}
        onDownload={downloadTSV}
        copyFeedback={copyFeedback}
      />

      <div style={styles.accordionContainer}>
      {/* Container Settings Card (Collapsible) */}
      <div style={styles.card}>
        <button
          onClick={() => toggleSection('containerSettings')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'containerSettings' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>Container Size</span>
        </button>

        {openSection === 'containerSettings' && (
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
          onClick={() => toggleSection('springInventory')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'springInventory' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>Spring Inventory</span>
        </button>

        {openSection === 'springInventory' && (
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
          onClick={() => toggleSection('componentInventory')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'componentInventory' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>Component Inventory</span>
        </button>

        {openSection === 'componentInventory' && (
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

      {/* Order Summary Card (Collapsible) */}
      <div style={styles.card}>
        <button
          onClick={() => toggleSection('yourOrder')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'yourOrder' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>Your Order</span>
        </button>

        {openSection === 'yourOrder' && (
          <div style={styles.cardContent}>
            <PalletList springOrder={springOrder} compact={true} />
          </div>
        )}
      </div>

      {/* Export Actions Card (Collapsible) */}
      <div style={styles.card}>
        <button
          onClick={() => toggleSection('export')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'export' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>Export Order</span>
        </button>

        {openSection === 'export' && (
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

      {/* How It Works Card (Collapsible) - Info about component orders */}
      <div style={styles.card}>
        <button
          onClick={() => toggleSection('howItWorks')}
          style={styles.cardHeader}
        >
          <span style={styles.cardHeaderIcon}>
            {openSection === 'howItWorks' ? '▼' : '▶'}
          </span>
          <span style={styles.cardHeaderTitle}>📦 How Component Orders Work</span>
          <span style={styles.cardHeaderBadge}>Info</span>
        </button>

        {openSection === 'howItWorks' && (
          <div style={styles.cardContent}>
            <p style={styles.infoCardText}>
              Components and springs ship together in the same container and <strong>must deplete at the same rate</strong>.
            </p>
            <p style={styles.infoCardText}>
              The system automatically calculates component quantities to ensure equal runway coverage.
            </p>
            <div style={styles.infoCardExample}>
              <strong>Example:</strong> If you order enough springs for 6 months, the system orders enough components for 6 months.
            </div>
          </div>
        )}
      </div>

      {/* Validation Warnings Card (Collapsible) - Only show if there are issues */}
      {validation && !validation.allValid && (
        <div style={styles.card}>
          <button
            onClick={() => toggleSection('validationWarnings')}
            style={styles.cardHeader}
          >
            <span style={styles.cardHeaderIcon}>
              {openSection === 'validationWarnings' ? '▼' : '▶'}
            </span>
            <span style={styles.cardHeaderTitle}>⚠️ Validation Warnings</span>
            <span style={{...styles.cardHeaderBadge, background: 'rgba(234, 179, 8, 0.2)', borderColor: '#a16207', color: '#facc15'}}>Alert</span>
          </button>

          {openSection === 'validationWarnings' && (
            <div style={styles.cardContent}>
              <ValidationBanner validation={validation} />
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
