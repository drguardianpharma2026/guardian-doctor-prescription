/**
 * dev-server.js
 * Local Express server that runs the /api/* handlers for development.
 * The Vercel API routes use Express-compatible req/res, so this works seamlessly.
 * Run with: node --env-file=.env dev-server.js
 */
import express from 'express';
import patientsHandler from './api/patients.js';
import authHandler from './api/auth.js';
import medicinesHandler from './api/medicines.js';
import prescriptionsHandler from './api/prescriptions.js';
import settingsHandler from './api/settings.js';
import doctorsHandler from './api/doctors.js';
import migrateHandler from './api/migrate.js';
import feesHandler from './api/fees.js';


const app = express();
app.use(express.json());

// Log every API request
app.use((req, res, next) => {
  console.log(`[API] ${new Date().toLocaleTimeString()} ${req.method} ${req.path}`);
  next();
});

// Map all /api/* routes to their handlers
app.all('/api/patients', (req, res) => patientsHandler(req, res));
app.all('/api/auth', (req, res) => authHandler(req, res));
app.all('/api/medicines', (req, res) => medicinesHandler(req, res));
app.all('/api/prescriptions', (req, res) => prescriptionsHandler(req, res));
app.all('/api/settings', (req, res) => settingsHandler(req, res));
app.all('/api/doctors', (req, res) => doctorsHandler(req, res));
app.all('/api/migrate', (req, res) => migrateHandler(req, res));
app.all('/api/fees', (req, res) => feesHandler(req, res));


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ DATABASE_URL missing!'}`);
});
