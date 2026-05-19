import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getDb();

  try {
    if (req.method === 'POST') {
      const { action, name, phone, password, qualification, consultant, reg_no } = req.body;

      if (action === 'login') {
        const result = await sql`
          SELECT * FROM "dr login" WHERE phone = ${phone} AND password = ${password} LIMIT 1
        `;
        if (result.length === 0) return res.status(200).json(null);
        return res.status(200).json(result[0]);
      }

      if (action === 'signup') {
        const existing = await sql`SELECT phone FROM "dr login" WHERE phone = ${phone} LIMIT 1`;
        if (existing.length > 0) {
          return res.status(409).json({ error: 'Phone number already registered.' });
        }
        await sql`
          INSERT INTO "dr login" (name, phone, password, qualification, consultant, reg_no)
          VALUES (${name}, ${phone}, ${password}, ${qualification || ''}, ${consultant || ''}, ${reg_no || ''})
        `;
        const newUser = await sql`SELECT * FROM "dr login" WHERE phone = ${phone} LIMIT 1`;
        return res.status(200).json(newUser[0]);
      }
    }

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM "dr login" ORDER BY name`;
      return res.status(200).json(result);
    }

    if (req.method === 'PATCH') {
      const { phone, ...updates } = req.body;
      if (!phone) return res.status(400).json({ error: 'phone required' });
      await sql`UPDATE "dr login" SET name = ${updates.name}, qualification = ${updates.qualification}, consultant = ${updates.consultant}, reg_no = ${updates.reg_no} WHERE phone = ${phone}`;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: 'phone required' });
      await sql`DELETE FROM "dr login" WHERE phone = ${phone}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('auth API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
