/**
 * databaseService.js
 * All data operations now go through secure Vercel API routes (/api/*)
 * which use @neondatabase/serverless with a server-side DATABASE_URL.
 * No credentials are ever exposed to the browser.
 */

const api = async (path, method = 'GET', body = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  };
  if (body !== null) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(path, opts);
    clearTimeout(timeoutId);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Database Error: ${text || res.statusText}`);
    }
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Database Request Timed Out (15s). Please check your connection.');
    }
    throw err;
  }
};

export const databaseService = {
  // ── Patient / MRN ──
  async savePatient(patientData) {
    if (!patientData.mrn) return null;
    const payload = {
      mrn: patientData.mrn.toString()
    };

    if (patientData.patientName !== undefined || patientData.name !== undefined) payload.name = patientData.patientName || patientData.name;
    if (patientData.age !== undefined && patientData.age !== '') payload.age = parseInt(patientData.age);
    if (patientData.gender !== undefined || patientData.sex !== undefined) payload.sex = patientData.gender || patientData.sex;
    if (patientData.phone !== undefined) payload.phone = patientData.phone;
    if (patientData.weight !== undefined || patientData.last_weight !== undefined) payload.last_weight = patientData.weight || patientData.last_weight;
    if (patientData.bp !== undefined || patientData.last_bp !== undefined) payload.last_bp = patientData.bp || patientData.last_bp;
    if (patientData.pulse !== undefined || patientData.last_pulse !== undefined) payload.last_pulse = patientData.pulse || patientData.last_pulse;
    if (patientData.temp !== undefined || patientData.last_temp !== undefined) payload.last_temp = patientData.temp || patientData.last_temp;
    if (patientData.dr_fees !== undefined) payload.dr_fees = patientData.dr_fees;
    if (patientData.med_fees !== undefined) payload.med_fees = patientData.med_fees;
    if (patientData.registration_date !== undefined || patientData.date !== undefined) payload.registration_date = patientData.registration_date || patientData.date;

    const res = await api('/api/patients', 'POST', payload);
    new BroadcastChannel('nexusrx_sync').postMessage('refresh');
    return res;
  },

  async getPatient(mrn) {
    if (!mrn) return null;
    return api(`/api/patients?mrn=${encodeURIComponent(mrn)}`);
  },

  async getAllPatients() {
    return api('/api/patients');
  },

  async deletePatient(mrn) {
    return api(`/api/patients?mrn=${encodeURIComponent(mrn)}`, 'DELETE');
  },

  // ── Fees & Visits ──
  async saveFees(mrn, date, patientName, drFees, medFees, rxId = null, labGiven = '', labCash = '') {
    // Save to prescriptions history
    const historyPromise = api('/api/prescriptions', 'POST', {
      id: rxId ? parseInt(rxId, 10) : null, // Ensure ID is passed as integer
      mrn: mrn.toString(),
      date,
      patient_name: patientName || '',
      dr_fees: drFees || '',
      med_fees: medFees || '',
      lab_given: labGiven || '',
      lab_cash: labCash || '',
    });

    // Save to fees history tracking table (log)
    const feesHistoryPromise = api('/api/fees', 'POST', {
      mrn: mrn.toString(),
      date,
      dr_fees: drFees || '',
      med_fees: medFees || '',
      lab_given: labGiven || '',
      lab_cash: labCash || '',
    });

    // Also save to patient record as fallback - safely partial update
    const patientPromise = api('/api/patients', 'POST', {
      mrn: mrn.toString(),
      name: patientName,
      dr_fees: drFees,
      med_fees: medFees,
      lab_given: labGiven,
      lab_cash: labCash,
    });

    return Promise.all([historyPromise, feesHistoryPromise, patientPromise]);
  },

  async getFeesHistory(mrn, date) {
    let url = '/api/fees';
    if (mrn && date) url += `?mrn=${encodeURIComponent(mrn)}&date=${encodeURIComponent(date)}`;
    else if (mrn) url += `?mrn=${encodeURIComponent(mrn)}`;
    return api(url);
  },

  async deleteFeesHistory(mrn, date) {
    if (!mrn || !date) return null;
    return api(`/api/fees?mrn=${encodeURIComponent(mrn)}&date=${encodeURIComponent(date)}`, 'DELETE');
  },

  // ── Medicines ──
  async getMedicines() {
    return api('/api/medicines');
  },

  async syncMedicines(medicines) {
    if (!Array.isArray(medicines) || medicines.length === 0) return null;
    const payload = medicines.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type || '',
      composition: m.composition || '',
      category: m.category || '',
    }));
    return api('/api/medicines', 'POST', payload);
  },

  async deleteMedicine(id) {
    return api(`/api/medicines?id=${encodeURIComponent(id)}`, 'DELETE');
  },

  // ── Prescriptions ──
  async savePrescription(prescriptionData) {
    const res = await api('/api/prescriptions', 'POST', {
      id: prescriptionData.id,
      mrn: prescriptionData.mrn,
      patient_name: prescriptionData.patientName,
      date: prescriptionData.date,
      diagnosis: prescriptionData.diagnosis || '',
      complaints: prescriptionData.complaints || '',
      medicines: JSON.stringify(prescriptionData.medicines || []),
      advice: prescriptionData.advice || '',
      follow_up: prescriptionData.followUp || '',
      doctor_name: prescriptionData.doctorName || '',
      doctor_reg_no: prescriptionData.doctorRegNo || '',
      visit_no: prescriptionData.visitNo || '',
      vitals: JSON.stringify({
        weight: prescriptionData.weight,
        bp: prescriptionData.bp,
        pulse: prescriptionData.pulse,
        temp: prescriptionData.temp,
      }),
    });
    new BroadcastChannel('nexusrx_sync').postMessage('refresh');
    return res;
  },

  async getPrescriptions(mrn, date, id = null) {
    let url = '/api/prescriptions';
    const params = [];
    if (id) params.push(`id=${encodeURIComponent(id)}`);
    if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
    if (date) params.push(`date=${encodeURIComponent(date)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return api(url);
  },

  async getPrescriptionsByMRN(mrn) {
    if (!mrn) return [];
    return api(`/api/prescriptions?mrn=${encodeURIComponent(mrn)}`);
  },

  async deletePrescription(id) {
    if (!id) return null;
    return api(`/api/prescriptions?id=${encodeURIComponent(id)}`, 'DELETE');
  },

  async clearAllPrescriptions() {
    return api('/api/prescriptions?clearAll=true', 'DELETE');
  },

  // ── Clinic Settings ──
  async getSettings() {
    return api('/api/settings');
  },

  async saveSettings(settings) {
    return api('/api/settings', 'POST', {
      name: settings.name,
      phone: settings.phone,
    });
  },

  // ── Doctor Accounts (dr login table) ──
  async getUsers() {
    return api('/api/auth');
  },

  async updateUser(user) {
    if (!user.phone) return null;
    return api('/api/auth', 'PATCH', user);
  },

  async deleteUser(phone) {
    if (!phone) return null;
    return api(`/api/auth?phone=${encodeURIComponent(phone)}`, 'DELETE');
  },

  // ── Saved Doctors dropdown ──
  async getSavedDoctors() {
    return api('/api/doctors');
  },

  async saveDoctor(doctor) {
    return api('/api/doctors', 'POST', {
      name: doctor.name,
      qualifications: doctor.qualifications || '',
      role: doctor.role || '',
      reg_no: doctor.regNo || doctor.reg_no || '',
    });
  },

  async deleteDoctor(name) {
    return api(`/api/doctors?name=${encodeURIComponent(name)}`, 'DELETE');
  },
};
