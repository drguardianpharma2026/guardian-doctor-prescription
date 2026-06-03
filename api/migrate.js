import { getDb, cors } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const sql = getDb();
        const sqlPath = path.resolve(__dirname, '../create_tables.sql');

        if (!fs.existsSync(sqlPath)) {
            return res.status(404).json({ error: 'create_tables.sql not found' });
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Remove -- comments and /* */ comments
        const cleanSql = sqlContent
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        // Split by semicolon and filter out empty strings
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`[MIGRATE] Running ${statements.length} statements...`);

        for (const statement of statements) {
            await sql(statement);
        }

        return res.status(200).json({ success: true, message: 'Database migrated successfully', count: statements.length });
    } catch (err) {
        console.error('Migration error:', err);
        return res.status(500).json({ error: err.message });
    }
}
