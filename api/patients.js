import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = getDb();

    // Auto-migrate columns if missing
    await sql`ALTER TABLE mrn ADD COLUMN IF NOT EXISTS dr_fees TEXT`;
    await sql`ALTER TABLE mrn ADD COLUMN IF NOT EXISTS med_fees TEXT`;
    await sql`ALTER TABLE mrn ADD COLUMN IF NOT EXISTS registration_date TEXT`;

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

      // Check if patient already exists
      const existing = await sql`SELECT * FROM mrn WHERE mrn = ${d.mrn} LIMIT 1`;

      if (existing.length > 0) {
        // Update existing record: only overwrite fields that are provided in the request
        await sql`
          UPDATE mrn SET
            name = ${d.name !== undefined ? d.name : sql`name`},
            age = ${d.age !== undefined ? d.age : sql`age`},
            sex = ${d.sex !== undefined ? d.sex : sql`sex`},
            phone = ${d.phone !== undefined ? d.phone : sql`phone`},
            last_weight = ${d.last_weight !== undefined ? d.last_weight : sql`last_weight`},
            last_bp = ${d.last_bp !== undefined ? d.last_bp : sql`last_bp`},
            last_pulse = ${d.last_pulse !== undefined ? d.last_pulse : sql`last_pulse`},
            last_temp = ${d.last_temp !== undefined ? d.last_temp : sql`last_temp`},
            dr_fees = ${d.dr_fees !== undefined ? d.dr_fees : sql`dr_fees`},
            med_fees = ${d.med_fees !== undefined ? d.med_fees : sql`med_fees`},
            registration_date = ${d.registration_date !== undefined ? d.registration_date : sql`registration_date`},
            updated_at = NOW()
          WHERE mrn = ${d.mrn}
        `;
      } else {
        // New patient: insert with provided data or defaults
        await sql`
          INSERT INTO mrn (mrn, name, age, sex, phone, last_weight, last_bp, last_pulse, last_temp, dr_fees, med_fees, registration_date, updated_at)
          VALUES (${d.mrn}, ${d.name || ''}, ${d.age || 0}, ${d.sex || ''}, ${d.phone || ''}, ${d.last_weight || ''}, ${d.last_bp || ''}, ${d.last_pulse || ''}, ${d.last_temp || ''}, ${d.dr_fees || ''}, ${d.med_fees || ''}, ${d.registration_date || ''}, NOW())
        `;
      }
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
