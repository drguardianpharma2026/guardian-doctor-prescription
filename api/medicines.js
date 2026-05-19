import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getDb();

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM medicine ORDER BY name`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const medicines = req.body; // array
      if (!Array.isArray(medicines)) return res.status(400).json({ error: 'Expected array' });

      for (const m of medicines) {
        await sql`
          INSERT INTO medicine (id, name, type, composition, category)
          VALUES (${m.id}, ${m.name}, ${m.type || ''}, ${m.composition || ''}, ${m.category || ''})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            composition = EXCLUDED.composition,
            category = EXCLUDED.category
        `;
      }
      return res.status(200).json({ success: true, count: medicines.length });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      await sql`DELETE FROM medicine WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('medicines API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
