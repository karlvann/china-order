import { describe, it } from 'vitest';
import { calculateKingQueenFirstOrder } from '@/lib/algorithms/fillKingQueenFirst';
import type { Inventory } from '@/lib/types';

describe('Debug King Firmness', () => {
  it('should show King firmness breakdown in Low Stock', () => {
    const lowStockInventory: Inventory = {
      springs: {
        firm: { King: 8, Queen: 10, Double: 3, 'King Single': 2, Single: 1 },
        medium: { King: 50, Queen: 65, Double: 8, 'King Single': 4, Single: 1 },
        soft: { King: 2, Queen: 3, Double: 1, 'King Single': 0, Single: 0 }
      },
      components: {
        micro_coils: { King: 90, Queen: 120, Double: 0, 'King Single': 0, Single: 0 },
        thin_latex: { King: 90, Queen: 120, Double: 0, 'King Single': 0, Single: 0 },
        felt: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        top_panel: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        bottom_panel: { King: 60, Queen: 80, Double: 12, 'King Single': 6, Single: 2 },
        side_panel: { King: 60, Queen: 80, Double: 20, 'King Single': 0, Single: 0 }
      }
    };

    const order = calculateKingQueenFirstOrder(8, lowStockInventory);

    console.log('\n🔍 KING FIRMNESS BREAKDOWN (Low Stock)\n');
    console.log('King Pallets:');
    order.pallets.filter(p => p.size === 'King').forEach(pallet => {
      console.log(`  Pallet ${pallet.id}: ${JSON.stringify(pallet.firmness_breakdown)}`);
    });

    console.log('\nKing Spring Totals:');
    console.log(`  Firm: ${order.springs.firm.King} springs`);
    console.log(`  Medium: ${order.springs.medium.King} springs`);
    console.log(`  Soft: ${order.springs.soft.King} springs`);
    console.log(`  Total: ${order.springs.firm.King + order.springs.medium.King + order.springs.soft.King} springs`);
  });
});
