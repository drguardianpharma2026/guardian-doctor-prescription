import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = getDb();

    // Auto-migrate columns if missing
    await sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dr_fees TEXT`;
    await sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS med_fees TEXT`;
    await sql`ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS visit_no TEXT`;

    if (req.method === 'GET') {
      const { mrn, date, id } = req.query;
      if (id) {
        const result = await sql`SELECT * FROM prescriptions WHERE id = ${id}`;
        return res.status(200).json(result);
      }
      if (mrn && date) {
        // Chronological: oldest first for a specific patient+date
        const result = await sql`SELECT * FROM prescriptions WHERE mrn = ${mrn} AND date = ${date} ORDER BY created_at ASC`;
        return res.status(200).json(result);
      }
      if (mrn) {
        // Patient history: newest first
        const result = await sql`SELECT * FROM prescriptions WHERE mrn = ${mrn} ORDER BY created_at DESC`;
        return res.status(200).json(result);
      }
      if (date) {
        // Today's OP list: chronological (first registered = first shown)
        const result = await sql`SELECT * FROM prescriptions WHERE date = ${date} ORDER BY created_at ASC`;
        return res.status(200).json(result);
      }
      // All records: newest first
      const result = await sql`SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 500`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const d = req.body;

      // If an ID is provided, we update that specific prescription.
      // Otherwise, we always INSERT a new one to allow multiple visits/doctors per day.
      if (d.id) {
        await sql`
          UPDATE prescriptions SET
            patient_name = ${d.patient_name !== undefined ? d.patient_name : sql`patient_name`},
            diagnosis = ${d.diagnosis !== undefined ? d.diagnosis : sql`diagnosis`},
            complaints = ${d.complaints !== undefined ? d.complaints : sql`complaints`},
            medicines = ${d.medicines !== undefined ? d.medicines : sql`medicines`},
            advice = ${d.advice !== undefined ? d.advice : sql`advice`},
            follow_up = ${d.follow_up !== undefined ? d.follow_up : sql`follow_up`},
            doctor_name = ${d.doctor_name !== undefined ? d.doctor_name : sql`doctor_name`},
            doctor_reg_no = ${d.doctor_reg_no !== undefined ? d.doctor_reg_no : sql`doctor_reg_no`},
            vitals = ${d.vitals !== undefined ? d.vitals : sql`vitals`},
            dr_fees = ${d.dr_fees !== undefined ? d.dr_fees : sql`dr_fees`},
            med_fees = ${d.med_fees !== undefined ? d.med_fees : sql`med_fees`},
            visit_no = ${d.visit_no !== undefined ? d.visit_no : sql`visit_no`}
          WHERE id = ${d.id}
        `;
      } else {
        // Insert new record
        await sql`
          INSERT INTO prescriptions
            (mrn, patient_name, date, diagnosis, complaints, medicines, advice, follow_up, doctor_name, doctor_reg_no, vitals, dr_fees, med_fees, visit_no, created_at)
          VALUES
            (${d.mrn}, ${d.patient_name}, ${d.date}, ${d.diagnosis || ''}, ${d.complaints || ''},
             ${d.medicines || '[]'}, ${d.advice || ''}, ${d.follow_up || ''},
             ${d.doctor_name || ''}, ${d.doctor_reg_no || ''}, ${d.vitals || '{}'}, ${d.dr_fees || ''}, ${d.med_fees || ''}, ${d.visit_no || ''}, NOW())
        `;
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { mrn, date, clearAll } = req.query;
      if (clearAll === 'true') {
        await sql`DELETE FROM prescriptions`;
        return res.status(200).json({ success: true, message: 'All prescriptions deleted' });
      }
      if (req.query.id) {
        await sql`DELETE FROM prescriptions WHERE id = ${req.query.id}`;
        return res.status(200).json({ success: true, message: `Prescription ${req.query.id} deleted` });
      }
      if (mrn && date) {
        await sql`DELETE FROM prescriptions WHERE mrn = ${mrn} AND date = ${date}`;
        return res.status(200).json({ success: true, message: `Prescription for MRN ${mrn} on date ${date} deleted` });
      }
      if (mrn) {
        await sql`DELETE FROM prescriptions WHERE mrn = ${mrn}`;
        return res.status(200).json({ success: true, message: `Prescriptions for MRN ${mrn} deleted` });
      }
      return res.status(400).json({ error: 'Missing prescription ID or MRN' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('prescriptions API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
