import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getDb();

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM clinic_settings WHERE id = 1 LIMIT 1`;
      return res.status(200).json(result[0] || null);
    }

    if (req.method === 'POST') {
      const { name, phone } = req.body;
      await sql`
        INSERT INTO clinic_settings (id, name, phone, updated_at)
        VALUES (1, ${name}, ${phone}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
