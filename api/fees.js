import { getDb, cors } from './db.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    try {
        const sql = getDb();

        // Auto-migrate columns if missing
        await sql`ALTER TABLE fees_history ADD COLUMN IF NOT EXISTS lab_given TEXT`;
        await sql`ALTER TABLE fees_history ADD COLUMN IF NOT EXISTS lab_cash TEXT`;

        if (req.method === 'GET') {
            const { mrn, date } = req.query;
            if (mrn && date) {
                const result = await sql`SELECT * FROM fees_history WHERE mrn = ${mrn} AND date = ${date} ORDER BY created_at DESC LIMIT 1`;
                return res.status(200).json(result[0] || null);
            }
            if (mrn) {
                const result = await sql`SELECT * FROM fees_history WHERE mrn = ${mrn} ORDER BY created_at DESC`;
                return res.status(200).json(result);
            }
            if (date) {
                // date-only: get all fees records for a given date
                const result = await sql`SELECT * FROM fees_history WHERE date = ${date} ORDER BY created_at DESC`;
                return res.status(200).json(result);
            }
            const result = await sql`SELECT * FROM fees_history ORDER BY created_at DESC LIMIT 500`;
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { mrn, date, dr_fees, med_fees, lab_given, lab_cash } = req.body;
            if (!mrn || !date) return res.status(400).json({ error: 'mrn and date required' });

            // Upsert: Try to update today's record first, or insert new if it doesn't exist
            const existing = await sql`SELECT id FROM fees_history WHERE mrn = ${mrn} AND date = ${date} LIMIT 1`;

            if (existing.length > 0) {
                await sql`
          UPDATE fees_history SET
            dr_fees = ${dr_fees || '0'},
            med_fees = ${med_fees || '0'},
            lab_given = ${lab_given || ''},
            lab_cash = ${lab_cash || ''},
            created_at = NOW()
          WHERE id = ${existing[0].id}
        `;
            } else {
                await sql`
          INSERT INTO fees_history (mrn, date, dr_fees, med_fees, lab_given, lab_cash, created_at)
          VALUES (${mrn}, ${date}, ${dr_fees || '0'}, ${med_fees || '0'}, ${lab_given || ''}, ${lab_cash || ''}, NOW())
        `;
            }
            return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { mrn, date } = req.query;
            if (mrn && date) {
                await sql`DELETE FROM fees_history WHERE mrn = ${mrn} AND date = ${date}`;
                return res.status(200).json({ success: true, message: `Fees for MRN ${mrn} on date ${date} deleted` });
            }
            if (mrn) {
                await sql`DELETE FROM fees_history WHERE mrn = ${mrn}`;
                return res.status(200).json({ success: true, message: `Fees history for MRN ${mrn} deleted` });
            }
            return res.status(400).json({ error: 'Missing MRN' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('fees history API error:', err);
        return res.status(500).json({ error: err.message });
    }
}
