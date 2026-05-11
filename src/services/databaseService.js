const API_URL = import.meta.env.VITE_NEON_API_URL;
const API_KEY = import.meta.env.VITE_NEON_API_KEY;

const request = async (path, method = 'GET', body = null) => {
  if (!API_KEY || !API_URL) return null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation, resolution=merge-duplicates'
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Database Error (${response.status}):`, errorText);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error('Database request failed:', err);
    return null;
  }
};

export const databaseService = {
  // Save or update patient info
  async savePatient(patientData) {
    if (!patientData.mrn) return null;
    
    const payload = {
      mrn: patientData.mrn.toString(),
      name: patientData.patientName || '',
      age: parseInt(patientData.age) || 0,
      sex: patientData.gender || '',
      phone: patientData.phone || '',
      last_weight: patientData.weight || '',
      last_bp: patientData.bp || '',
      last_pulse: patientData.pulse || '',
      last_temp: patientData.temp || '',
      updated_at: new Date().toISOString()
    };

    console.log('Sending payload to Neon:', payload);

    return request('/MRN', 'POST', payload);
  },

  // Get patient by MRN
  async getPatient(mrn) {
    if (!mrn) return null;
    const result = await request(`/MRN?mrn=eq.${mrn}`);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }
};
