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
    return api('/api/patients', 'POST', {
      mrn: patientData.mrn.toString(),
      name: patientData.patientName || '',
      age: parseInt(patientData.age) || 0,
      sex: patientData.gender || '',
      phone: patientData.phone || '',
      last_weight: patientData.weight || '',
      last_bp: patientData.bp || '',
      last_pulse: patientData.pulse || '',
      last_temp: patientData.temp || '',
    });
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
    return api('/api/prescriptions', 'POST', {
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
      vitals: JSON.stringify({
        weight: prescriptionData.weight,
        bp: prescriptionData.bp,
        pulse: prescriptionData.pulse,
        temp: prescriptionData.temp,
      }),
    });
  },

  async getPrescriptions() {
    return api('/api/prescriptions');
  },

  async getPrescriptionsByMRN(mrn) {
    if (!mrn) return [];
    return api(`/api/prescriptions?mrn=${encodeURIComponent(mrn)}`);
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
