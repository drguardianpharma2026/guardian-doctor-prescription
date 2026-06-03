import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = getDb();

    // Auto-migrate columns if missing
    await sql`ALTER TABLE mrn ADD COLUMN IF NOT EXISTS dr_fees TEXT`;
    await sql`ALTER TABLE mrn ADD COLUMN IF NOT EXISTS med_fees TEXT`;

    if (req.method === 'GET') {
      const { mrn } = req.query;
      if (mrn) {
        const result = await sql`SELECT * FROM mrn WHERE mrn = ${mrn} LIMIT 1`;
        return res.status(200).json(result[0] || null);
      }
      const result = await sql`SELECT *, ROW_NUMBER() OVER (ORDER BY mrn::int ASC) AS row_id FROM mrn LIMIT 500`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const d = req.body;
      await sql`
        INSERT INTO mrn (mrn, name, age, sex, phone, last_weight, last_bp, last_pulse, last_temp, dr_fees, med_fees, updated_at)
        VALUES (${d.mrn}, ${d.name}, ${d.age}, ${d.sex}, ${d.phone}, ${d.last_weight}, ${d.last_bp}, ${d.last_pulse}, ${d.last_temp}, ${d.dr_fees}, ${d.med_fees}, NOW())
        ON CONFLICT (mrn) DO UPDATE SET
          name = EXCLUDED.name,
          age = EXCLUDED.age,
          sex = EXCLUDED.sex,
          phone = EXCLUDED.phone,
          last_weight = EXCLUDED.last_weight,
          last_bp = EXCLUDED.last_bp,
          last_pulse = EXCLUDED.last_pulse,
          last_temp = EXCLUDED.last_temp,
          dr_fees = EXCLUDED.dr_fees,
          med_fees = EXCLUDED.med_fees,
          updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { mrn, clearAll } = req.query;
      if (clearAll === 'true') {
        await sql`DELETE FROM prescriptions`;
        await sql`DELETE FROM mrn`;
        return res.status(200).json({ success: true, message: 'All patients and prescriptions deleted' });
      }
      if (!mrn) return res.status(400).json({ error: 'MRN or clearAll is required' });
      // Delete prescriptions first (cascade), then the patient record
      await sql`DELETE FROM prescriptions WHERE mrn = ${mrn}`;
      await sql`DELETE FROM mrn WHERE mrn = ${mrn}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('patients API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
