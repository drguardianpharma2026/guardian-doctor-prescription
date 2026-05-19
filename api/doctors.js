import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getDb();

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM doctors ORDER BY name`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { name, qualifications, role, reg_no } = req.body;
      // Try to update first; if no row exists, insert
      const existing = await sql`SELECT id FROM doctors WHERE name = ${name} LIMIT 1`;
      if (existing.length > 0) {
        await sql`
          UPDATE doctors SET
            qualifications = ${qualifications || ''},
            role = ${role || ''},
            reg_no = ${reg_no || ''}
          WHERE name = ${name}
        `;
      } else {
        await sql`
          INSERT INTO doctors (name, qualifications, role, reg_no)
          VALUES (${name}, ${qualifications || ''}, ${role || ''}, ${reg_no || ''})
        `;
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { name } = req.query;
      if (!name) return res.status(400).json({ error: 'name required' });
      await sql`DELETE FROM doctors WHERE name = ${name}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('doctors API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
