import { getDb, cors } from './db.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const sql = getDb();
    if (req.method === 'GET') {
      const { mrn } = req.query;
      if (mrn) {
        const result = await sql`SELECT * FROM prescriptions WHERE mrn = ${mrn} ORDER BY created_at DESC`;
        return res.status(200).json(result);
      }
      const result = await sql`SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 200`;
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const d = req.body;
      await sql`
        INSERT INTO prescriptions
          (mrn, patient_name, date, diagnosis, complaints, medicines, advice, follow_up, doctor_name, doctor_reg_no, vitals, created_at)
        VALUES
          (${d.mrn}, ${d.patient_name}, ${d.date}, ${d.diagnosis || ''}, ${d.complaints || ''},
           ${d.medicines}, ${d.advice || ''}, ${d.follow_up || ''},
           ${d.doctor_name || ''}, ${d.doctor_reg_no || ''}, ${d.vitals}, NOW())
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { mrn, clearAll } = req.query;
      if (clearAll === 'true') {
        await sql`DELETE FROM prescriptions`;
        return res.status(200).json({ success: true, message: 'All prescriptions deleted' });
      }
      if (mrn) {
        await sql`DELETE FROM prescriptions WHERE mrn = ${mrn}`;
        return res.status(200).json({ success: true, message: `Prescriptions for MRN ${mrn} deleted` });
      }
      return res.status(400).json({ error: 'Missing MRN or clearAll flag' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('prescriptions API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
