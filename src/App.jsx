import React, { useState, useEffect, useMemo } from 'react';
import SaveLoadModal from './SaveLoadModal';

// Import algorithms from lib
import {
  calculateCoverage,
  calculateNPlus1Order,
  calculateComponentOrder,
  optimizeComponentOrder,
  generateTSV
} from './lib/algorithms';

// Import constants
import {
  LEAD_TIME_WEEKS,
  SPRINGS_PER_PALLET,
  MIN_PALLETS,
  MAX_PALLETS,
  DEFAULT_PALLETS,
  MATTRESS_SIZES,
  MONTHLY_SALES_RATE,
  FIRMNESS_TYPES,
  FIRMNESS_DISTRIBUTION,
  BUSY_MONTHS,
  SEASONAL_MULTIPLIER_BUSY,
  SEASONAL_MULTIPLIER_SLOW,
  COMPONENT_TYPES
} from './lib/constants';

// Import utilities
import { createEmptySpringInventory, createEmptyComponentInventory } from './lib/utils/inventory';

// Main App Component
export default function MattressOrderSystem() {
  const [activeTab, setActiveTab] = useState('goal');
  const [palletCount, setPalletCount] = useState(DEFAULT_PALLETS);
  const [exportFormat, setExportFormat] = useState('optimized');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [inventory, setInventory] = useState({
    springs: createEmptySpringInventory(),
    components: createEmptyComponentInventory()
  });

  // Calculate spring order (automatic N+0, N+1, or N+2 based on inventory)
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
  
  const updateSpringInventory = (firmness, size, value) => {
    setInventory(prev => ({
      ...prev,
      springs: {
        ...prev.springs,
        [firmness]: {
          ...prev.springs[firmness],
          [size]: value === '' ? 0 : parseInt(value) || 0
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
          [size]: value === '' ? 0 : parseInt(value) || 0
        }
      }
    }));
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };
  
  const downloadTSV = () => {
    const date = new Date().toISOString().split('T')[0];
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultra-order-${date}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get current state for saving
  const getCurrentSaveData = () => ({
    inventory,
    settings: {
      palletCount,
      exportFormat
    }
  });

  // Apply loaded state
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
    <div style={{ 
      minHeight: '100vh', 
      background: '#000000', 
      color: '#fafafa',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        height: '64px',
        background: 'rgba(24, 24, 27, 0.8)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 1000
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Mattress Order</div>
          <div style={{ fontSize: '12px', color: '#a1a1aa' }}>Inventory Management</div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
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
              gap: '6px'
            }}
          >
            <span>💾</span>
            <span>Save/Load</span>
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'goal', label: 'Goal & Strategy' },
              { id: 'order', label: 'Order Builder' },
              { id: 'components', label: 'Components' },
              { id: 'runway', label: 'Inventory Runway' },
              { id: 'export', label: 'Export' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#000000' : '#d4d4d8',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px' }}>
        {activeTab === 'goal' && <GoalTab setActiveTab={setActiveTab} />}
        {activeTab === 'order' && (
          <OrderBuilderTab
            inventory={inventory}
            updateSpringInventory={updateSpringInventory}
            palletCount={palletCount}
            setPalletCount={setPalletCount}
            springOrder={springOrder}
          />
        )}
        {activeTab === 'components' && (
          <ComponentsTab
            springOrder={springOrder}
            inventory={inventory}
            updateComponentInventory={updateComponentInventory}
            componentOrder={componentOrder}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'runway' && (
          <RunwayTab
            inventory={inventory}
            springOrder={springOrder}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'export' && (
          <ExportTab
            springOrder={springOrder}
            componentOrder={optimizedComponentOrder}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            tsvContent={tsvContent}
            copyToClipboard={copyToClipboard}
            downloadTSV={downloadTSV}
            copyFeedback={copyFeedback}
            setActiveTab={setActiveTab}
          />
        )}
      </div>

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

// Goal Tab Component
function GoalTab({ setActiveTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Business Context</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <li>• Warehouse contains springs (by size/firmness) and components (by type/size)</li>
          <li>• 10-week container lead time requires advance planning</li>
          <li>• Container holds 4-12 pallets (configurable)</li>
          <li>• Each pallet holds exactly 30 springs</li>
          <li>• Must account for current inventory and historical sales patterns</li>
          <li>• <strong>All ratios based on actual sales data:</strong> 960 units/year (81/month average)</li>
        </ul>
      </Card>
      
      <InfoCard variant="info">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>
          The N+1 (or N+2) Strategy (Simple Version)
        </h3>
        <div style={{ fontSize: '15px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>Step 1:</strong> Give <strong>1 or 2 pallets</strong> (your choice) to the small sizes (Double, King Single, or Single) 
            with lowest <strong>Medium firmness</strong> coverage. If N+2, pick the 2 most critical.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>Step 2:</strong> Compare how many months of King vs Queen you have left.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>Step 3:</strong> Give <strong>60%</strong> of remaining pallets to whoever is running lower, <strong>40%</strong> to the other.
          </p>
          <p style={{ marginBottom: '0' }}>
            <strong>Step 4:</strong> Split each size's pallets between Firm, Medium, and Soft based on what you're running lowest on.
          </p>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid #166534',
          borderRadius: '6px', 
          fontSize: '14px' 
        }}>
          <strong style={{ color: '#22c55e' }}>Why this works:</strong> Queen sells 37% faster than King, so with equal stock, 
          Queen will naturally be "running lower" and automatically get the bigger 60% share. The math handles it for you!
        </div>
      </InfoCard>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Size Distribution (Actual Sales)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {MATTRESS_SIZES.map(size => (
            <div key={size.id} style={{ padding: '12px', background: '#27272a', borderRadius: '6px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{size.name}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>
                {(size.ratio * 100).toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
                ~{MONTHLY_SALES_RATE[size.id]}/month
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Firmness Patterns (Actual Sales)</h2>
        <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '16px' }}>
          Real customer preferences show clear patterns across bed sizes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {MATTRESS_SIZES.map(size => {
            const dist = FIRMNESS_DISTRIBUTION[size.id];
            return (
              <div key={size.id} style={{ padding: '16px', background: '#27272a', borderRadius: '6px' }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>{size.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a1a1aa' }}>Firm:</span>
                    <span style={{ fontWeight: '600' }}>{(dist.firm * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a1a1aa' }}>Medium:</span>
                    <span style={{ fontWeight: '600', color: '#22c55e' }}>{(dist.medium * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#a1a1aa' }}>Soft:</span>
                    <span style={{ fontWeight: '600' }}>{(dist.soft * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '6px', fontSize: '14px' }}>
          <strong style={{ color: '#60a5fa' }}>Key Insight:</strong> Medium dominates at 80%+ for King/Queen sizes. 
          Soft is minimal (2-4%) in large beds. Small beds show more balanced distribution.
        </div>
      </Card>
      
      <InfoCard variant="warning">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#facc15' }}>
          📊 Seasonality Note
        </h3>
        <div style={{ fontSize: '14px' }}>
          <p style={{ marginBottom: '8px' }}>Your sales show seasonal patterns:</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>• <strong>Busy Season (Apr-Aug):</strong> ~92 units/month (14% above average)</li>
            <li>• <strong>Slow Season (Sep-Mar):</strong> ~71 units/month (12% below average)</li>
          </ul>
          <p style={{ marginTop: '8px', color: '#a1a1aa' }}>
            The Inventory Runway tab lets you select starting month and view seasonal vs average depletion projections.
          </p>
        </div>
      </InfoCard>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Next Steps</h2>
        <button
          onClick={() => setActiveTab('order')}
          style={{
            padding: '12px 24px',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Order Builder →
        </button>
      </Card>
    </div>
  );
}

// Order Builder Tab
function OrderBuilderTab({ inventory, updateSpringInventory, palletCount, setPalletCount, springOrder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Current Spring Inventory</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Enter current stock for each size and firmness combination</p>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={tableHeaderStyle}>Size</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Firm</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Medium</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Soft</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {MATTRESS_SIZES.map(size => {
                const total = FIRMNESS_TYPES.reduce((sum, f) => sum + inventory.springs[f][size.id], 0);
                return (
                  <tr key={size.id} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{size.name}</td>
                    {FIRMNESS_TYPES.map(firmness => (
                      <td key={firmness} style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={inventory.springs[firmness][size.id]}
                          onChange={(e) => updateSpringInventory(firmness, size.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          style={numberInputStyle}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa', textAlign: 'center' }}>
                      {total}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#27272a', fontWeight: 'bold' }}>
                <td style={{ padding: '12px' }}>TOTAL</td>
                {FIRMNESS_TYPES.map(firmness => {
                  const total = MATTRESS_SIZES.reduce((sum, size) => sum + inventory.springs[firmness][size.id], 0);
                  return (
                    <td key={firmness} style={{ padding: '12px', fontFamily: 'monospace', color: '#60a5fa', textAlign: 'center' }}>
                      {total}
                    </td>
                  );
                })}
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#60a5fa', textAlign: 'center' }}>
                  {FIRMNESS_TYPES.reduce((sum, f) =>
                    sum + MATTRESS_SIZES.reduce((s, size) => s + inventory.springs[f][size.id], 0), 0
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Order Strategy</h2>
        <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '20px' }}>
          System automatically allocates 0-2 pallets to small sizes (Double, King Single, Single) with coverage &lt;4 months.
          Remaining pallets distributed to King/Queen (60/40 split favoring lower coverage).
        </p>
        {/* Automatic allocation - no manual toggle needed */}

        <div style={{ maxWidth: '500px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px', fontWeight: '600' }}>
              Container Size
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min={MIN_PALLETS}
                max={MAX_PALLETS}
                value={palletCount}
                onChange={(e) => setPalletCount(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: '#27272a',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{ textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{palletCount}</div>
                <div style={{ fontSize: '12px', color: '#a1a1aa' }}>pallets</div>
              </div>
            </div>
        </div>
      </Card>
      
      <InfoCard variant="info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#60a5fa' }}>
              Automatic Small Size Allocation
            </div>
            <div>
              {springOrder.metadata.critical_sizes && springOrder.metadata.critical_sizes.length > 0 ? (
                <>
                  <strong>{springOrder.metadata.small_size_pallets} {springOrder.metadata.small_size_pallets === 1 ? 'pallet' : 'pallets'}</strong> allocated to critical small {springOrder.metadata.small_size_pallets === 1 ? 'size' : 'sizes'}:
                  {' '}<strong>{springOrder.metadata.critical_sizes.join(', ')}</strong>
                  {' '}(coverage &lt;4 months)
                </>
              ) : (
                <>
                  All small sizes have healthy coverage (&gt;4 months) -
                  {' '}<strong>all {springOrder.metadata.total_pallets} pallets</strong> allocated to King/Queen
                </>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
              System automatically determines optimal allocation: {springOrder.metadata.king_pallets} King pallets, {springOrder.metadata.queen_pallets} Queen pallets (60/40 split favoring lower coverage)
            </div>
          </div>
        </div>
      </InfoCard>
      
      <InfoCard variant="info">
        <div style={{ fontSize: '14px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa' }}>Smart Firmness Allocation</div>
          <div>
            Springs are distributed based on individual firmness coverage, not fixed ratios. 
            Firmnesses with lower coverage receive more springs, ensuring balanced inventory across all types.
          </div>
        </div>
      </InfoCard>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Summary Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Springs" value={springOrder.metadata.total_springs} />
          <StatCard label="Pure Pallets" value={springOrder.metadata.pure_pallets} color="#22c55e" />
          <StatCard label="Mixed Pallets" value={springOrder.metadata.mixed_pallets} color="#eab308" />
          <StatCard 
            label="Efficiency" 
            value={`${Math.round((springOrder.metadata.pure_pallets / springOrder.metadata.total_pallets) * 100)}%`} 
          />
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Pallet Breakdown</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {springOrder.pallets.map(pallet => (
            <PalletCard key={pallet.id} pallet={pallet} />
          ))}
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Totals by Size & Firmness</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={tableHeaderStyle}>Firmness</th>
                {MATTRESS_SIZES.map(size => (
                  <th key={size.id} style={tableHeaderStyle}>{size.name}</th>
                ))}
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {FIRMNESS_TYPES.map(firmness => {
                const total = MATTRESS_SIZES.reduce((sum, size) => 
                  sum + springOrder.springs[firmness][size.id], 0
                );
                return (
                  <tr key={firmness} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                      {firmness}
                    </td>
                    {MATTRESS_SIZES.map(size => (
                      <td key={size.id} style={{ padding: '12px', fontFamily: 'monospace', textAlign: 'center' }}>
                        {springOrder.springs[firmness][size.id]}
                      </td>
                    ))}
                    <td style={{ padding: '12px', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'bold', color: '#60a5fa' }}>
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Components Tab
function ComponentsTab({ springOrder, inventory, updateComponentInventory, componentOrder, setActiveTab }) {
  if (!springOrder) {
    return (
      <InfoCard variant="warning">
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#facc15' }}>No spring order found</div>
          <p style={{ marginBottom: '16px' }}>Please configure a spring order in Order Builder first.</p>
          <button
            onClick={() => setActiveTab('order')}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Go to Order Builder
          </button>
        </div>
      </InfoCard>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Current Component Inventory</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Enter current stock for each component and size</p>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={tableHeaderStyle}>Component</th>
                {MATTRESS_SIZES.map(size => (
                  <th key={size.id} style={tableHeaderStyle}>{size.name}</th>
                ))}
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_TYPES.map(comp => {
                const total = MATTRESS_SIZES.reduce((sum, size) => 
                  sum + inventory.components[comp.id][size.id], 0
                );
                return (
                  <tr key={comp.id} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{comp.name}</td>
                    {MATTRESS_SIZES.map(size => {
                      // Don't show inputs for micro coils and thin latex in small sizes
                      const shouldHideInput = ['micro_coils', 'thin_latex'].includes(comp.id) && 
                                             ['Double', 'King Single', 'Single'].includes(size.id);
                      
                      return (
                        <td key={size.id} style={{ padding: '12px' }}>
                          {shouldHideInput ? (
                            <div style={{ textAlign: 'center', color: '#52525b' }}>-</div>
                          ) : (
                            <input
                              type="number"
                              value={inventory.components[comp.id][size.id]}
                              onChange={(e) => updateComponentInventory(comp.id, size.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              style={numberInputStyle}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa' }}>
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      
      <InfoCard variant="info">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>
          Consolidation Rules
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div><strong>Micro Coils & Thin Latex:</strong></div>
          <ul style={{ marginLeft: '20px', marginBottom: '8px' }}>
            <li>Only ordered for King and Queen sizes</li>
            <li>Double, King Single, and Single are not ordered</li>
          </ul>
          <div><strong>Side Panels:</strong></div>
          <ul style={{ marginLeft: '20px' }}>
            <li>Single and King Single use Double panels</li>
          </ul>
        </div>
      </InfoCard>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Component Order Calculation</h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Final order amounts after inventory subtraction and consolidation</p>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={tableHeaderStyle}>Component</th>
                {MATTRESS_SIZES.map(size => (
                  <th key={size.id} style={tableHeaderStyle}>{size.name}</th>
                ))}
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_TYPES.map(comp => {
                const total = MATTRESS_SIZES.reduce((sum, size) => 
                  sum + componentOrder[comp.id][size.id], 0
                );
                return (
                  <tr key={comp.id} style={{ borderBottom: '1px solid #27272a' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{comp.name}</td>
                    {MATTRESS_SIZES.map(size => {
                      const orderQty = componentOrder[comp.id][size.id];
                      const stockQty = inventory.components[comp.id][size.id];
                      
                      // Don't show order info for micro coils and thin latex in small sizes
                      const shouldHide = ['micro_coils', 'thin_latex'].includes(comp.id) && 
                                        ['Double', 'King Single', 'Single'].includes(size.id);
                      
                      if (shouldHide) {
                        return (
                          <td key={size.id} style={{ padding: '12px' }}>
                            <div style={{ textAlign: 'center', color: '#52525b' }}>-</div>
                          </td>
                        );
                      }
                      
                      // Calculate needed (before inventory subtraction)
                      const totalSprings = FIRMNESS_TYPES.reduce((sum, firmness) => 
                        sum + (springOrder.springs[firmness][size.id] || 0), 0
                      );
                      let neededQty = Math.ceil(totalSprings * comp.multiplier);
                      
                      // Apply consolidation for side panels in calculation display
                      if (comp.id === 'side_panel') {
                        if (size.id === 'Double') {
                          const singleSprings = FIRMNESS_TYPES.reduce((sum, f) => sum + (springOrder.springs[f]['Single'] || 0), 0);
                          const ksSprings = FIRMNESS_TYPES.reduce((sum, f) => sum + (springOrder.springs[f]['King Single'] || 0), 0);
                          neededQty += Math.ceil(singleSprings * comp.multiplier);
                          neededQty += Math.ceil(ksSprings * comp.multiplier);
                        } else if (size.id === 'Single' || size.id === 'King Single') {
                          neededQty = 0;
                        }
                      }
                      
                      // Check if consolidated for display note
                      let consolidationNote = null;
                      if (orderQty === 0 && stockQty === 0 && neededQty === 0) {
                        if (comp.id === 'side_panel' && (size.id === 'Single' || size.id === 'King Single')) {
                          consolidationNote = 'Uses Double';
                        }
                      }
                      
                      return (
                        <td key={size.id} style={{ padding: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '2px' }}>
                            Needed: {neededQty}
                          </div>
                          <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
                            Stock: {stockQty}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#22c55e', fontSize: '16px' }}>
                            Order: {orderQty}
                          </div>
                          {consolidationNote && (
                            <div style={{ fontSize: '12px', color: '#facc15', marginTop: '4px' }}>
                              {consolidationNote}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa' }}>
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Inventory Runway Tab
function RunwayTab({ inventory, springOrder, setActiveTab }) {
  const [startingMonth, setStartingMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedScenario, setSelectedScenario] = useState('seasonal'); // 'average' or 'seasonal'
  
  if (!springOrder) {
    return (
      <InfoCard variant="warning">
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#facc15' }}>No spring order found</div>
          <p style={{ marginBottom: '16px' }}>Please configure a spring order in Order Builder first.</p>
          <button
            onClick={() => setActiveTab('order')}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Go to Order Builder
          </button>
        </div>
      </InfoCard>
    );
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Get seasonal multiplier for a given month
  const getSeasonalMultiplier = (monthIndex) => {
    return BUSY_MONTHS.includes(monthIndex) ? SEASONAL_MULTIPLIER_BUSY : SEASONAL_MULTIPLIER_SLOW;
  };
  
  // Calculate runway for each size/firmness combo
  const calculateRunway = (size, firmness, useSeasonal = false) => {
    const currentStock = inventory.springs[firmness][size];
    const baseMonthlySales = MONTHLY_SALES_RATE[size];
    const firmRatio = FIRMNESS_DISTRIBUTION[size][firmness];
    const baseMonthlyDepletion = baseMonthlySales * firmRatio;
    const containerAddition = springOrder.springs[firmness][size];
    
    const runway = [currentStock]; // Now
    const depletionRates = [0]; // No depletion for "Now"
    
    // Months 1-2 (before container)
    for (let month = 1; month <= 2; month++) {
      const currentMonthIndex = (startingMonth + month) % 12;
      const multiplier = useSeasonal ? getSeasonalMultiplier(currentMonthIndex) : 1;
      const monthlyDepletion = baseMonthlyDepletion * multiplier;
      
      const previous = runway[month - 1];
      runway.push(Math.max(0, previous - monthlyDepletion));
      depletionRates.push(monthlyDepletion);
    }
    
    // Container arrives (add new stock)
    const afterContainer = runway[2] + containerAddition;

    // Months 3-12 (after container)
    runway.push(afterContainer); // Month 3
    depletionRates.push(0); // No depletion on container arrival

    for (let month = 4; month <= 12; month++) {
      const currentMonthIndex = (startingMonth + month) % 12;
      const multiplier = useSeasonal ? getSeasonalMultiplier(currentMonthIndex) : 1;
      const monthlyDepletion = baseMonthlyDepletion * multiplier;

      const previous = runway[month - 1];
      runway.push(Math.max(0, previous - monthlyDepletion));
      depletionRates.push(monthlyDepletion);
    }
    
    return {
      runway,
      containerAddition,
      depletionRates
    };
  };
  
  // Generate month headers
  const getMonthHeaders = () => {
    const headers = [monthNames[startingMonth]];
    for (let i = 1; i <= 12; i++) {
      const monthIndex = (startingMonth + i) % 12;
      headers.push(monthNames[monthIndex]);
    }
    return headers;
  };
  
  const monthHeaders = getMonthHeaders();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <InfoCard variant="info">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>
          Seasonality Pattern
        </h3>
        <div style={{ fontSize: '14px' }}>
          <p style={{ marginBottom: '8px' }}>Based on your actual sales data (960 units/year):</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong style={{ color: '#facc15' }}>Busy Season (Apr-Aug):</strong> ~92 units/month (14% above average)</li>
            <li><strong style={{ color: '#60a5fa' }}>Slow Season (Sep-Mar):</strong> ~71 units/month (12% below average)</li>
            <li><strong>Annual Average:</strong> 81 units/month</li>
          </ul>
        </div>
      </InfoCard>

      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Inventory Runway Settings</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>
              Starting Month
            </label>
            <select
              value={startingMonth}
              onChange={(e) => setStartingMonth(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              {monthNamesFull.map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>
              Depletion Scenario
            </label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              <option value="average">Average (Flat 81/month)</option>
              <option value="seasonal">Seasonal (Apr-Aug +14%, Sep-Mar -12%)</option>
            </select>
          </div>
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          {selectedScenario === 'average' ? 'Average Depletion' : 'Seasonal Depletion'} Projection
        </h2>
        <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>
          Projected inventory levels over 12 months (full calendar year) starting from {monthNamesFull[startingMonth]}
        </p>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={{ ...tableHeaderStyle, position: 'sticky', left: 0, background: '#27272a', zIndex: 10 }}>
                  Size / Firmness
                </th>
                <th style={tableHeaderStyle}>{monthHeaders[0]}</th>
                <th style={tableHeaderStyle}>{monthHeaders[1]}</th>
                <th style={tableHeaderStyle}>{monthHeaders[2]}</th>
                <th style={{ ...tableHeaderStyle, background: '#1e40af', color: '#60a5fa', textAlign: 'center' }}>
                  <div>{monthHeaders[3]}</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>Container</div>
                </th>
                {monthHeaders.slice(4).map((month, idx) => (
                  <th key={idx} style={tableHeaderStyle}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATTRESS_SIZES.map(size => (
                FIRMNESS_TYPES.map((firmness, idx) => {
                  const { runway, containerAddition } = calculateRunway(
                    size.id, 
                    firmness, 
                    selectedScenario === 'seasonal'
                  );
                  
                  return (
                    <tr 
                      key={`${size.id}-${firmness}`}
                      style={{ 
                        borderBottom: idx === FIRMNESS_TYPES.length - 1 ? '2px solid #3f3f46' : '1px solid #27272a'
                      }}
                    >
                      <td style={{ 
                        padding: '10px 12px', 
                        position: 'sticky',
                        left: 0,
                        background: '#18181b',
                        borderRight: '1px solid #27272a',
                        minWidth: '150px',
                        fontWeight: '500'
                      }}>
                        {size.name} {firmness.charAt(0).toUpperCase() + firmness.slice(1)}
                      </td>
                      
                      {/* Now */}
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', textAlign: 'center' }}>
                        {Math.round(runway[0])}
                      </td>
                      
                      {/* Month 1 */}
                      <td style={{ 
                        padding: '10px 12px', 
                        fontFamily: 'monospace', 
                        textAlign: 'center',
                        background: runway[1] === 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                      }}>
                        {Math.round(runway[1])}
                      </td>
                      
                      {/* Month 2 */}
                      <td style={{ 
                        padding: '10px 12px', 
                        fontFamily: 'monospace', 
                        textAlign: 'center',
                        background: runway[2] === 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                      }}>
                        {Math.round(runway[2])}
                      </td>
                      
                      {/* Container Arrives (Month 3) */}
                      <td style={{
                        padding: '10px 12px',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#60a5fa',
                        fontWeight: 'bold'
                      }}>
                        <div>{Math.round(runway[3])}</div>
                        <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>+{containerAddition}</div>
                      </td>

                      {/* Months 4-12 */}
                      {runway.slice(4).map((stock, monthIdx) => (
                        <td
                          key={monthIdx + 4}
                          style={{ 
                            padding: '10px 12px', 
                            fontFamily: 'monospace', 
                            textAlign: 'center',
                            background: stock === 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                          }}
                        >
                          {Math.round(stock)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <InfoCard variant="info">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>
          How to Read This Table
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <li>• <strong>Now</strong> - Your current inventory levels</li>
          <li>• <strong>Months 1-2</strong> - Inventory depletes based on sales rates (container in transit)</li>
          <li>• <strong>Container</strong> - New stock arrives (~10 weeks), shown in blue</li>
          <li>• <strong>Following months</strong> - Continued depletion after container arrives</li>
          <li>• <strong>Red background</strong> - Stock has run out (0 remaining)</li>
          <li>• <strong>Seasonal mode</strong> - Busy months (Apr-Aug) deplete faster, slow months (Sep-Mar) deplete slower</li>
          <li>• Monthly depletion = Size Monthly Rate × Firmness % × Seasonal Multiplier (if applicable)</li>
        </ul>
      </InfoCard>
    </div>
  );
}

// Export Tab
function ExportTab({ springOrder, componentOrder, exportFormat, setExportFormat, tsvContent, copyToClipboard, downloadTSV, copyFeedback, setActiveTab }) {
  if (!springOrder) {
    return (
      <InfoCard variant="warning">
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#facc15' }}>No spring order found</div>
          <p style={{ marginBottom: '16px' }}>Please configure an order in Order Builder first.</p>
          <button
            onClick={() => setActiveTab('order')}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Go to Order Builder
          </button>
        </div>
      </InfoCard>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Export Format</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <button
            onClick={() => setExportFormat('exact')}
            style={{
              padding: '20px',
              background: exportFormat === 'exact' ? '#27272a' : '#18181b',
              border: `2px solid ${exportFormat === 'exact' ? '#ffffff' : '#27272a'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>Exact Calculations</div>
            <div style={{ color: '#a1a1aa', fontSize: '14px' }}>
              Precise calculated quantities for internal planning and validation
            </div>
          </button>
          <button
            onClick={() => setExportFormat('optimized')}
            style={{
              padding: '20px',
              background: exportFormat === 'optimized' ? '#27272a' : '#18181b',
              border: `2px solid ${exportFormat === 'optimized' ? '#ffffff' : '#27272a'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>Optimized for Supplier</div>
            <div style={{ color: '#a1a1aa', fontSize: '14px' }}>
              Rounded to supplier lot sizes with smart buffers (recommended for orders)
            </div>
          </button>
        </div>
      </Card>
      
      {exportFormat === 'optimized' && (
        <InfoCard variant="info">
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>
            Optimization Rules
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            <li>• Lot-20 components (micro coils, bottom/side panels): Round to 20 with buffer</li>
            <li>• Lot-10 components (top panels, thin latex, felt): Round to 10 with buffer</li>
            <li>• Springs: Already in pallets of 30, no additional rounding</li>
            <li>• Buffer logic: If within threshold of lot size, add extra lot as safety stock</li>
          </ul>
        </InfoCard>
      )}
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Export Actions</h2>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '12px 24px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {copyFeedback ? '✓ Copied!' : '📋 Copy to Clipboard'}
          </button>
          <button
            onClick={downloadTSV}
            style={{
              padding: '12px 24px',
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            💾 Download TSV
          </button>
        </div>
        <p style={{ color: '#a1a1aa', fontSize: '14px' }}>
          Paste directly into Google Sheets or send to your supplier
        </p>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Order Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard label="Total Pallets" value={springOrder.metadata.total_pallets} />
          <StatCard label="Total Springs" value={springOrder.metadata.total_springs} />
          <StatCard 
            label="Pure Pallet Efficiency" 
            value={`${Math.round((springOrder.metadata.pure_pallets / springOrder.metadata.total_pallets) * 100)}%`} 
          />
        </div>
      </Card>
      
      <Card>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Preview</h2>
        <pre style={{
          background: '#000000',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '16px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          maxHeight: '400px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {tsvContent}
        </pre>
      </Card>
    </div>
  );
}

// Helper Components
function Card({ children }) {
  return (
    <div style={{
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '8px',
      padding: '24px'
    }}>
      {children}
    </div>
  );
}

function InfoCard({ variant = 'info', children }) {
  const variants = {
    info: { bg: 'rgba(37, 99, 235, 0.1)', border: '#1e40af' },
    warning: { bg: 'rgba(234, 179, 8, 0.1)', border: '#a16207' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#991b1b' },
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#166534' }
  };
  
  const style = variants[variant];
  
  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '8px',
      padding: '24px'
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = '#fafafa' }) {
  return (
    <div style={{ padding: '16px', background: '#27272a', borderRadius: '8px' }}>
      <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function PalletCard({ pallet }) {
  const typeColors = {
    Pure: '#22c55e',
    Mixed: '#eab308',
    Critical: '#ef4444'
  };
  
  return (
    <div style={{
      background: '#27272a',
      border: '1px solid #3f3f46',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold' }}>Pallet {pallet.id}</div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          background: `${typeColors[pallet.type]}20`,
          color: typeColors[pallet.type]
        }}>
          {pallet.type}
        </div>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>{pallet.size}</div>
      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Object.entries(pallet.firmness_breakdown).map(([firmness, count]) => (
          <div key={firmness} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'capitalize', color: '#a1a1aa' }}>{firmness}:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{count}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #3f3f46',
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold'
      }}>
        <span>Total:</span>
        <span style={{ fontFamily: 'monospace' }}>{pallet.total}</span>
      </div>
    </div>
  );
}

// Styles
const tableHeaderStyle = {
  padding: '12px',
  textAlign: 'left',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  color: '#a1a1aa'
};

const numberInputStyle = {
  width: '80px',
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '6px',
  padding: '8px 12px',
  textAlign: 'center',
  fontFamily: 'ui-monospace, monospace',
  color: '#fafafa',
  fontSize: '14px'
};


<system-reminder>
Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>
