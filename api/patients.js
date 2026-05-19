import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = getDb();
    if (req.method === 'GET') {
      const { mrn } = req.query;
      if (mrn) {
        const result = await sql`SELECT * FROM mrn WHERE mrn = ${mrn} LIMIT 1`;
        return res.status(200).json(result[0] || null);
      }
      const result = await sql`SELECT * FROM mrn ORDER BY updated_at DESC LIMIT 100`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const d = req.body;
      await sql`
        INSERT INTO mrn (mrn, name, age, sex, phone, last_weight, last_bp, last_pulse, last_temp, updated_at)
        VALUES (${d.mrn}, ${d.name}, ${d.age}, ${d.sex}, ${d.phone}, ${d.last_weight}, ${d.last_bp}, ${d.last_pulse}, ${d.last_temp}, NOW())
        ON CONFLICT (mrn) DO UPDATE SET
          name = EXCLUDED.name,
          age = EXCLUDED.age,
          sex = EXCLUDED.sex,
          phone = EXCLUDED.phone,
          last_weight = EXCLUDED.last_weight,
          last_bp = EXCLUDED.last_bp,
          last_pulse = EXCLUDED.last_pulse,
          last_temp = EXCLUDED.last_temp,
          updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('patients API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
