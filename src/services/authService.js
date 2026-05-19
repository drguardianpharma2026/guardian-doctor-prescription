/**
 * authService.js
 * Authentication now goes through the secure /api/auth serverless route.
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
    let msg = 'Database connection issue';
    try { msg = JSON.parse(text).error || msg; } catch {}
    throw new Error(msg);
  }
  if (!text) return null;
  return JSON.parse(text);
};

export const authService = {
  async signup(name, phone, password, extraData = {}) {
    const result = await api('/api/auth', 'POST', {
      action: 'signup',
      name,
      phone,
      password,
      qualification: extraData.qualification || '',
      consultant: extraData.consultant || '',
      reg_no: extraData.regNo || '',
    });
    if (!result) throw new Error('Registration failed. Please try again.');
    return result;
  },

  async login(phone, password) {
    const result = await api('/api/auth', 'POST', {
      action: 'login',
      phone,
      password,
    });
    return result; // null means wrong credentials
  },
};
