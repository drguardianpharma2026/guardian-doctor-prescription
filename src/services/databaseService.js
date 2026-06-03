/**
 * databaseService.js
 * All data operations now go through secure Vercel API routes (/api/*)
 * which use @neondatabase/serverless with a server-side DATABASE_URL.
 * No credentials are ever exposed to the browser.
 */

const api = async (path, method = 'GET', body = null) => {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Database Error: ${text}`);
  }
  if (!text) return null;
  return JSON.parse(text);
};

export const databaseService = {
  // ── Patient / MRN ──
  async savePatient(patientData) {
    if (!patientData.mrn) return null;
    const res = await api('/api/patients', 'POST', {
      mrn: patientData.mrn.toString(),
      name: patientData.patientName || patientData.name || '',
      age: parseInt(patientData.age) || 0,
      sex: patientData.gender || patientData.sex || '',
      phone: patientData.phone || '',
      last_weight: patientData.weight || patientData.last_weight || '',
      last_bp: patientData.bp || patientData.last_bp || '',
      last_pulse: patientData.pulse || patientData.last_pulse || '',
      last_temp: patientData.temp || patientData.last_temp || '',
      dr_fees: patientData.dr_fees || '',
      med_fees: patientData.med_fees || '',
    });
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
  async saveFees(mrn, date, patientName, drFees, medFees) {
    // Save to prescriptions history
    const historyPromise = api('/api/prescriptions', 'POST', {
      mrn: mrn.toString(),
      date,
      patient_name: patientName || '',
      dr_fees: drFees || '',
      med_fees: medFees || '',
    });

    // Save to fees history tracking table
    const feesHistoryPromise = api('/api/fees', 'POST', {
      mrn: mrn.toString(),
      date,
      dr_fees: drFees || '',
      med_fees: medFees || '',
    });

    // Also save to patient record as fallback
    const patientPromise = api('/api/patients', 'POST', {
      mrn: mrn.toString(),
      name: patientName || '',
      dr_fees: drFees || '',
      med_fees: medFees || '',
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

  async getPrescriptions(mrn, date) {
    let url = '/api/prescriptions';
    const params = [];
    if (mrn) params.push(`mrn=${encodeURIComponent(mrn)}`);
    if (date) params.push(`date=${encodeURIComponent(date)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return api(url);
  },

  async getPrescriptionsByMRN(mrn) {
    if (!mrn) return [];
    return api(`/api/prescriptions?mrn=${encodeURIComponent(mrn)}`);
  },

  async deletePrescription(mrn, date) {
    if (!mrn || !date) return null;
    return api(`/api/prescriptions?mrn=${encodeURIComponent(mrn)}&date=${encodeURIComponent(date)}`, 'DELETE');
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
