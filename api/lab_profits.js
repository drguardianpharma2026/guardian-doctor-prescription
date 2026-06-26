import { getDb, cors } from './db.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const sql = getDb();

        if (req.method === 'GET') {
            const { month_key } = req.query;
            let result;
            if (month_key) {
                result = await sql`SELECT * FROM lab_profits WHERE month_key LIKE ${month_key + '%'}`;
            } else {
                result = await sql`SELECT * FROM lab_profits`;
            }
            return res.status(200).json(result);
        }

        if (req.method === 'POST') {
            const { month_key, doctor_name, profit_amount } = req.body;
            if (!month_key || !doctor_name) {
                return res.status(400).json({ error: 'month_key and doctor_name are required' });
            }

            // Upsert: Using UNIQUE constraint on (month_key, doctor_name)
            await sql`
                INSERT INTO lab_profits (month_key, doctor_name, profit_amount, updated_at)
                VALUES (${month_key}, ${doctor_name}, ${parseFloat(profit_amount) || 0}, NOW())
                ON CONFLICT (month_key, doctor_name)
                DO UPDATE SET
                    profit_amount = EXCLUDED.profit_amount,
                    updated_at = NOW()
            `;

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('lab_profits API error:', err);
        return res.status(500).json({ error: err.message });
    }
}
