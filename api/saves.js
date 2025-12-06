// Vercel Serverless Function for Save/Load with Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const NUM_SLOTS = 5;

// Initialize table on first request
async function initTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS china_order_saves (
      slot_number INTEGER PRIMARY KEY CHECK (slot_number >= 1 AND slot_number <= 5),
      name VARCHAR(255) NOT NULL DEFAULT 'Save',
      data JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Helper to create empty slot
const createEmptySlot = (slotNumber) => ({
  name: `Save ${slotNumber}`,
  timestamp: null,
  data: null
});

// Convert DB row to slot format
const rowToSlot = (row, slotNumber) => {
  if (!row) return createEmptySlot(slotNumber);
  return {
    name: row.name,
    timestamp: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    data: row.data
  };
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slot } = req.query;

  try {
    await initTable();

    // LIST ALL SAVES
    if (req.method === 'GET' && !slot) {
      const rows = await sql`
        SELECT slot_number, name, data, updated_at
        FROM china_order_saves
        ORDER BY slot_number
      `;

      // Build array with all 5 slots (empty or filled)
      const saves = [];
      for (let i = 1; i <= NUM_SLOTS; i++) {
        const row = rows.find(r => r.slot_number === i);
        saves.push(rowToSlot(row, i));
      }
      return res.status(200).json(saves);
    }

    // LOAD SPECIFIC SAVE
    if (req.method === 'GET' && slot) {
      const slotNumber = parseInt(slot);
      if (slotNumber < 1 || slotNumber > NUM_SLOTS) {
        return res.status(400).json({ error: 'Invalid slot number' });
      }

      const rows = await sql`
        SELECT slot_number, name, data, updated_at
        FROM china_order_saves
        WHERE slot_number = ${slotNumber}
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: `No save found in slot ${slotNumber}` });
      }

      return res.status(200).json(rowToSlot(rows[0], slotNumber));
    }

    // SAVE DATA
    if (req.method === 'POST' && slot) {
      const slotNumber = parseInt(slot);
      if (slotNumber < 1 || slotNumber > NUM_SLOTS) {
        return res.status(400).json({ error: 'Invalid slot number' });
      }

      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: 'No data provided' });
      }

      // Check if slot exists to preserve custom name
      const existing = await sql`
        SELECT name FROM china_order_saves WHERE slot_number = ${slotNumber}
      `;

      const saveName = existing.length > 0 ? existing[0].name : `Save ${slotNumber}`;

      // Upsert the save
      await sql`
        INSERT INTO china_order_saves (slot_number, name, data, updated_at)
        VALUES (${slotNumber}, ${saveName}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (slot_number)
        DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = NOW()
      `;

      const result = await sql`
        SELECT slot_number, name, data, updated_at
        FROM china_order_saves
        WHERE slot_number = ${slotNumber}
      `;

      return res.status(200).json(rowToSlot(result[0], slotNumber));
    }

    // UPDATE SLOT NAME
    if (req.method === 'PUT' && slot) {
      const slotNumber = parseInt(slot);
      if (slotNumber < 1 || slotNumber > NUM_SLOTS) {
        return res.status(400).json({ error: 'Invalid slot number' });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name provided' });
      }

      const existing = await sql`
        SELECT slot_number FROM china_order_saves WHERE slot_number = ${slotNumber}
      `;

      if (existing.length === 0) {
        return res.status(404).json({ error: `No save found in slot ${slotNumber}` });
      }

      await sql`
        UPDATE china_order_saves
        SET name = ${name.trim()}, updated_at = NOW()
        WHERE slot_number = ${slotNumber}
      `;

      const result = await sql`
        SELECT slot_number, name, data, updated_at
        FROM china_order_saves
        WHERE slot_number = ${slotNumber}
      `;

      return res.status(200).json(rowToSlot(result[0], slotNumber));
    }

    // DELETE SAVE
    if (req.method === 'DELETE' && slot) {
      const slotNumber = parseInt(slot);
      if (slotNumber < 1 || slotNumber > NUM_SLOTS) {
        return res.status(400).json({ error: 'Invalid slot number' });
      }

      await sql`DELETE FROM china_order_saves WHERE slot_number = ${slotNumber}`;
      return res.status(200).json({ success: true });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
