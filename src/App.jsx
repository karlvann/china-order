import React, { useState, useEffect, useMemo } from 'react';

// Business Constants
const LEAD_TIME_WEEKS = 10;
const SPRINGS_PER_PALLET = 30;
const MIN_PALLETS = 4;
const MAX_PALLETS = 12;
const DEFAULT_PALLETS = 8;

const MATTRESS_SIZES = [
  { id: 'King', name: 'King', ratio: 0.3688 },
  { id: 'Queen', name: 'Queen', ratio: 0.5115 },
  { id: 'Double', name: 'Double', ratio: 0.0688 },
  { id: 'King Single', name: 'King Single', ratio: 0.0385 },
  { id: 'Single', name: 'Single', ratio: 0.0125 }
];

const FIRMNESS_TYPES = ['firm', 'medium', 'soft'];

const FIRMNESS_DISTRIBUTION = {
  'King': { firm: 0.1356, medium: 0.8446, soft: 0.0198 },
  'Queen': { firm: 0.1344, medium: 0.8269, soft: 0.0387 },
  'Double': { firm: 0.2121, medium: 0.6061, soft: 0.1818 },
  'King Single': { firm: 0.1622, medium: 0.6216, soft: 0.2162 },
  'Single': { firm: 0.2500, medium: 0.5833, soft: 0.1667 }
};

const MONTHLY_SALES_RATE = {
  'King': 30,
  'Queen': 41,
  'Double': 6,
  'King Single': 3,
  'Single': 1
};

// Seasonality: April-August is 30% busier
const BUSY_MONTHS = [3, 4, 5, 6, 7]; // April=3, May=4, June=5, July=6, August=7 (0-indexed)
const SEASONAL_MULTIPLIER_BUSY = 1.14; // 14% above average
const SEASONAL_MULTIPLIER_SLOW = 0.88; // 12% below average

const COMPONENT_TYPES = [
  { id: 'micro_coils', name: 'Micro Coils', multiplier: 1.5, lotSize: 20 },
  { id: 'thin_latex', name: 'Thin Latex', multiplier: 1.5, lotSize: 10 },
  { id: 'felt', name: 'Felt', multiplier: 1.0, lotSize: 10 },
  { id: 'top_panel', name: 'Top Panel', multiplier: 1.0, lotSize: 10 },
  { id: 'bottom_panel', name: 'Bottom Panel', multiplier: 1.0, lotSize: 20 },
  { id: 'side_panel', name: 'Side Panel', multiplier: 1.0, lotSize: 20 }
];

// Initialize empty inventory structure
const createEmptySpringInventory = () => ({
  firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
  medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
  soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
});

const createEmptyComponentInventory = () => {
  const inv = {};
  COMPONENT_TYPES.forEach(comp => {
    inv[comp.id] = { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 };
  });
  return inv;
};

// Algorithm 1: Coverage Calculation
const calculateCoverage = (inventory, size) => {
  const totalStock = FIRMNESS_TYPES.reduce((sum, firmness) => 
    sum + (inventory.springs[firmness][size] || 0), 0
  );
  const monthlySales = MONTHLY_SALES_RATE[size] || 0;
  
  if (monthlySales === 0) {
    return totalStock > 0 ? Infinity : 0;
  }
  return totalStock / monthlySales;
};

// Algorithm 2: Find Critical Small Size(s)
const findCriticalSmallSizes = (inventory, count = 1) => {
  const smallSizes = ['Double', 'King Single', 'Single'];
  
  // Calculate medium coverage for each size (using medium firmness as tiebreaker)
  const sizesWithCoverage = smallSizes.map(size => {
    const totalStock = FIRMNESS_TYPES.reduce((sum, firmness) => 
      sum + (inventory.springs[firmness][size] || 0), 0
    );
    const mediumStock = inventory.springs['medium'][size] || 0;
    const monthlySales = MONTHLY_SALES_RATE[size] || 0;
    const mediumRatio = FIRMNESS_DISTRIBUTION[size]['medium'];
    const mediumMonthlySales = monthlySales * mediumRatio;
    
    const totalCoverage = monthlySales === 0 ? (totalStock > 0 ? Infinity : 0) : totalStock / monthlySales;
    const mediumCoverage = mediumMonthlySales === 0 ? (mediumStock > 0 ? Infinity : 0) : mediumStock / mediumMonthlySales;
    
    return {
      size,
      totalCoverage,
      mediumCoverage
    };
  });
  
  // Sort by medium coverage first, then total coverage
  sizesWithCoverage.sort((a, b) => {
    if (a.mediumCoverage !== b.mediumCoverage) {
      return a.mediumCoverage - b.mediumCoverage;
    }
    return a.totalCoverage - b.totalCoverage;
  });
  
  return sizesWithCoverage.slice(0, count).map(item => item.size);
};

// Backward compatibility wrapper
const findCriticalSmallSize = (inventory) => {
  return findCriticalSmallSizes(inventory, 1)[0];
};

// Algorithm 3: Create Pallets for Size (with dynamic firmness allocation)
const createPalletsForSize = (size, numPallets, palletIdStart, palletType, inventory) => {
  const totalUnits = numPallets * SPRINGS_PER_PALLET;
  const monthlySales = MONTHLY_SALES_RATE[size];
  const targetCoverage = 8; // Target 8 months of coverage
  
  // Calculate current coverage and need for each firmness
  const firmnesNeeds = {};
  let totalNeed = 0;
  
  FIRMNESS_TYPES.forEach(firmness => {
    const currentStock = inventory.springs[firmness][size];
    const firmRatio = FIRMNESS_DISTRIBUTION[size][firmness];
    const monthlyDepletion = monthlySales * firmRatio;
    const currentCoverage = monthlyDepletion > 0 ? currentStock / monthlyDepletion : Infinity;
    const targetStock = monthlyDepletion * targetCoverage;
    const need = Math.max(0, targetStock - currentStock);
    
    firmnesNeeds[firmness] = need;
    totalNeed += need;
  });
  
  // Distribute springs based on need
  let firmUnits, mediumUnits, softUnits;
  
  if (totalNeed === 0) {
    // If no need, use default ratios
    const firmRatios = FIRMNESS_DISTRIBUTION[size];
    firmUnits = Math.round(totalUnits * firmRatios.firm);
    mediumUnits = Math.round(totalUnits * firmRatios.medium);
    softUnits = Math.round(totalUnits * firmRatios.soft);
  } else {
    // Distribute based on proportional need
    firmUnits = Math.round((firmnesNeeds.firm / totalNeed) * totalUnits);
    mediumUnits = Math.round((firmnesNeeds.medium / totalNeed) * totalUnits);
    softUnits = Math.round((firmnesNeeds.soft / totalNeed) * totalUnits);
  }
  
  // Adjust for rounding errors
  const total = firmUnits + mediumUnits + softUnits;
  if (total !== totalUnits) {
    const diff = totalUnits - total;
    mediumUnits += diff;
  }
  
  const remaining = { firm: firmUnits, medium: mediumUnits, soft: softUnits };
  const pallets = [];
  let palletId = palletIdStart;
  
  // Step 1: Create pure pallets
  ['firm', 'medium', 'soft'].forEach(firmness => {
    while (remaining[firmness] >= SPRINGS_PER_PALLET) {
      pallets.push({
        id: palletId++,
        size,
        type: 'Pure',
        firmness_breakdown: { [firmness]: SPRINGS_PER_PALLET },
        total: SPRINGS_PER_PALLET
      });
      remaining[firmness] -= SPRINGS_PER_PALLET;
    }
  });
  
  // Step 2: Create mixed pallets
  while (remaining.firm + remaining.medium + remaining.soft >= SPRINGS_PER_PALLET) {
    const pallet = {
      id: palletId++,
      size,
      type: palletType === 'Critical' ? 'Critical' : 'Mixed',
      firmness_breakdown: {},
      total: 0
    };
    
    ['firm', 'medium', 'soft'].forEach(firmness => {
      if (remaining[firmness] > 0) {
        const toAdd = Math.min(remaining[firmness], SPRINGS_PER_PALLET - pallet.total);
        if (toAdd > 0) {
          pallet.firmness_breakdown[firmness] = toAdd;
          remaining[firmness] -= toAdd;
          pallet.total += toAdd;
        }
      }
    });
    
    pallets.push(pallet);
  }
  
  // Step 3: Pad critical pallet if needed
  if (palletType === 'Critical' && pallets.length > 0) {
    const lastPallet = pallets[pallets.length - 1];
    if (lastPallet.total < SPRINGS_PER_PALLET) {
      const needed = SPRINGS_PER_PALLET - lastPallet.total;
      
      // Distribute based on need ratios
      let addFirm, addMedium, addSoft;
      if (totalNeed === 0) {
        const firmRatios = FIRMNESS_DISTRIBUTION[size];
        addFirm = Math.round(needed * firmRatios.firm);
        addMedium = Math.round(needed * firmRatios.medium);
        addSoft = needed - addFirm - addMedium;
      } else {
        addFirm = Math.round((firmnesNeeds.firm / totalNeed) * needed);
        addMedium = Math.round((firmnesNeeds.medium / totalNeed) * needed);
        addSoft = needed - addFirm - addMedium;
      }
      
      lastPallet.firmness_breakdown.firm = (lastPallet.firmness_breakdown.firm || 0) + addFirm;
      lastPallet.firmness_breakdown.medium = (lastPallet.firmness_breakdown.medium || 0) + addMedium;
      lastPallet.firmness_breakdown.soft = (lastPallet.firmness_breakdown.soft || 0) + addSoft;
      lastPallet.total = SPRINGS_PER_PALLET;
    }
  }
  
  return pallets;
};

// Algorithm 4: N+1 or N+2 Pallet Optimization
const calculateNPlus1Order = (totalPallets, inventory, smallSizePallets = 1) => {
  // Get the top N critical small sizes
  const criticalSizes = findCriticalSmallSizes(inventory, smallSizePallets);
  
  let pallets = [];
  let palletIdCounter = 1;
  
  // Allocate 1 pallet to each critical size
  criticalSizes.forEach(criticalSize => {
    const criticalPallets = createPalletsForSize(criticalSize, 1, palletIdCounter, 'Critical', inventory);
    pallets = [...pallets, ...criticalPallets];
    palletIdCounter += criticalPallets.length;
  });
  
  const kingCoverage = calculateCoverage(inventory, 'King');
  const queenCoverage = calculateCoverage(inventory, 'Queen');
  
  const remainingPallets = totalPallets - smallSizePallets;
  let queenPallets, kingPallets;
  
  if (queenCoverage <= kingCoverage) {
    queenPallets = Math.round(remainingPallets * 0.6);
    kingPallets = remainingPallets - queenPallets;
  } else {
    kingPallets = Math.round(remainingPallets * 0.6);
    queenPallets = remainingPallets - kingPallets;
  }
  
  const queenPalletList = createPalletsForSize('Queen', queenPallets, palletIdCounter, 'Mixed', inventory);
  pallets = [...pallets, ...queenPalletList];
  palletIdCounter += queenPalletList.length;
  
  const kingPalletList = createPalletsForSize('King', kingPallets, palletIdCounter, 'Mixed', inventory);
  pallets = [...pallets, ...kingPalletList];
  
  const springs = createEmptySpringInventory();
  
  pallets.forEach(pallet => {
    Object.entries(pallet.firmness_breakdown).forEach(([firmness, count]) => {
      springs[firmness][pallet.size] += count;
    });
  });
  
  const purePallets = pallets.filter(p => p.type === 'Pure').length;
  const mixedPallets = pallets.filter(p => p.type !== 'Pure').length;
  const totalSprings = pallets.reduce((sum, p) => sum + p.total, 0);
  
  return {
    springs,
    metadata: {
      total_pallets: totalPallets,
      total_springs: totalSprings,
      pure_pallets: purePallets,
      mixed_pallets: mixedPallets,
      critical_sizes: criticalSizes,
      small_size_pallets: smallSizePallets
    },
    pallets
  };
};

// Algorithm 5: Component Calculation
const calculateComponentOrder = (springOrder, componentInventory) => {
  const componentOrder = {};
  
  COMPONENT_TYPES.forEach(comp => {
    componentOrder[comp.id] = {};
    
    MATTRESS_SIZES.forEach(size => {
      const totalSprings = FIRMNESS_TYPES.reduce((sum, firmness) => 
        sum + (springOrder.springs[firmness][size.id] || 0), 0
      );
      const rawNeed = Math.ceil(totalSprings * comp.multiplier);
      componentOrder[comp.id][size.id] = rawNeed;
    });
  });
  
  // Apply consolidation rules
  // Micro Coils & Thin Latex: Don't order for small sizes
  ['micro_coils', 'thin_latex'].forEach(comp => {
    componentOrder[comp]['Double'] = 0;
    componentOrder[comp]['King Single'] = 0;
    componentOrder[comp]['Single'] = 0;
  });
  
  // Apply consolidation for side panels
  componentOrder['side_panel']['Double'] += componentOrder['side_panel']['Single'];
  componentOrder['side_panel']['Double'] += componentOrder['side_panel']['King Single'];
  componentOrder['side_panel']['Single'] = 0;
  componentOrder['side_panel']['King Single'] = 0;
  
  // Subtract current inventory
  COMPONENT_TYPES.forEach(comp => {
    MATTRESS_SIZES.forEach(size => {
      const currentStock = componentInventory[comp.id][size.id] || 0;
      componentOrder[comp.id][size.id] = Math.max(0, componentOrder[comp.id][size.id] - currentStock);
    });
  });
  
  return componentOrder;
};

// Algorithm 6: Export Optimization
const optimizeComponentOrder = (componentOrder, format) => {
  if (format === 'exact') return componentOrder;
  
  const optimized = {};
  
  COMPONENT_TYPES.forEach(comp => {
    optimized[comp.id] = {};
    
    MATTRESS_SIZES.forEach(size => {
      const quantity = componentOrder[comp.id][size.id];
      
      if (quantity === 0) {
        optimized[comp.id][size.id] = 0;
        return;
      }
      
      const lotSize = comp.lotSize;
      const bufferThreshold = lotSize === 20 ? 10 : 5;
      const bufferAdd = 20;
      
      const rounded = Math.ceil(quantity / lotSize) * lotSize;
      const difference = rounded - quantity;
      
      if (difference <= bufferThreshold) {
        optimized[comp.id][size.id] = rounded + bufferAdd;
      } else {
        optimized[comp.id][size.id] = rounded;
      }
    });
  });
  
  return optimized;
};

// Algorithm 7: TSV Export Generation
const generateTSV = (springOrder, componentOrder, format) => {
  const date = new Date().toISOString().split('T')[0];
  const lines = [];
  
  lines.push(`ULTRA ORDER - Container Order - ${date}`);
  lines.push(`Format: ${format === 'exact' ? 'Exact Calculations' : 'Optimized for Supplier'}`);
  lines.push(`Total Pallets: ${springOrder.metadata.total_pallets}`);
  lines.push(`Total Springs: ${springOrder.metadata.total_springs}`);
  lines.push(`Critical Small Size${springOrder.metadata.critical_sizes.length > 1 ? 's' : ''}: ${springOrder.metadata.critical_sizes.join(', ')}`);
  lines.push('');
  
  lines.push('PALLET BREAKDOWN');
  lines.push('Pallet ID\tSize\tType\tFirm\tMedium\tSoft\tTotal');
  springOrder.pallets.forEach(pallet => {
    lines.push([
      pallet.id,
      pallet.size,
      pallet.type,
      pallet.firmness_breakdown.firm || '',
      pallet.firmness_breakdown.medium || '',
      pallet.firmness_breakdown.soft || '',
      pallet.total
    ].join('\t'));
  });
  lines.push('');
  
  lines.push('SPRINGS ORDER');
  lines.push('Firmness\tKing\tQueen\tDouble\tKing Single\tSingle\tTotal');
  FIRMNESS_TYPES.forEach(firmness => {
    const row = [firmness.charAt(0).toUpperCase() + firmness.slice(1)];
    let total = 0;
    MATTRESS_SIZES.forEach(size => {
      const val = springOrder.springs[firmness][size.id];
      row.push(val);
      total += val;
    });
    row.push(total);
    lines.push(row.join('\t'));
  });
  lines.push('');
  
  lines.push('COMPONENTS ORDER');
  lines.push('Component\tKing\tQueen\tDouble\tKing Single\tSingle\tTotal');
  COMPONENT_TYPES.forEach(comp => {
    const row = [comp.name];
    let total = 0;
    MATTRESS_SIZES.forEach(size => {
      const val = componentOrder[comp.id][size.id];
      row.push(val);
      total += val;
    });
    row.push(total);
    lines.push(row.join('\t'));
  });
  lines.push('');
  
  lines.push('SUMMARY');
  lines.push(`Pure Pallets: ${springOrder.metadata.pure_pallets}`);
  lines.push(`Mixed Pallets: ${springOrder.metadata.mixed_pallets}`);
  const efficiency = Math.round((springOrder.metadata.pure_pallets / springOrder.metadata.total_pallets) * 100);
  lines.push(`Pure Pallet Efficiency: ${efficiency}%`);
  
  return lines.join('\n');
};

// Main App Component
export default function MattressOrderSystem() {
  const [activeTab, setActiveTab] = useState('goal');
  const [palletCount, setPalletCount] = useState(DEFAULT_PALLETS);
  const [smallSizePallets, setSmallSizePallets] = useState(1); // N+1 or N+2
  const [exportFormat, setExportFormat] = useState('optimized');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [inventory, setInventory] = useState({
    springs: createEmptySpringInventory(),
    components: createEmptyComponentInventory()
  });
  
  // Calculate spring order
  const springOrder = useMemo(() => {
    return calculateNPlus1Order(palletCount, inventory, smallSizePallets);
  }, [palletCount, inventory, smallSizePallets]);
  
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
            smallSizePallets={smallSizePallets}
            setSmallSizePallets={setSmallSizePallets}
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
function OrderBuilderTab({ inventory, updateSpringInventory, palletCount, setPalletCount, smallSizePallets, setSmallSizePallets, springOrder }) {
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
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#a1a1aa', marginBottom: '8px', fontWeight: '600' }}>
              Small Size Strategy
            </label>
            <select
              value={smallSizePallets}
              onChange={(e) => setSmallSizePallets(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <option value={1}>N+1 Strategy (1 pallet for critical small size)</option>
              <option value={2}>N+2 Strategy (2 pallets - 1 each to 2 critical small sizes)</option>
            </select>
            <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '8px' }}>
              {smallSizePallets === 1 ? 
                'Allocate 1 pallet (30 springs) to the small size with lowest Medium coverage' : 
                'Allocate 1 pallet each (30 springs) to the 2 small sizes with lowest Medium coverage'
              }
            </p>
          </div>
          
          <div>
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
        </div>
      </Card>
      
      {springOrder.metadata.critical_sizes && (
        <InfoCard variant="error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#f87171' }}>
                Critical Small Size{springOrder.metadata.critical_sizes.length > 1 ? 's' : ''}
              </div>
              <div>
                {springOrder.metadata.critical_sizes.length === 1 ? (
                  <>Allocated 1 pallet (30 springs) to <strong>{springOrder.metadata.critical_sizes[0]}</strong></>
                ) : (
                  <>Allocated 1 pallet each (30 springs) to <strong>{springOrder.metadata.critical_sizes.join(' and ')}</strong></>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
                Selected based on lowest Medium firmness coverage
              </div>
            </div>
          </div>
        </InfoCard>
      )}
      
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
