const API_URL = import.meta.env.VITE_NEON_API_URL;
const API_KEY = import.meta.env.VITE_NEON_API_KEY;

// Neon Data API (PostgREST style) helper
const request = async (path, method = 'GET', body = null) => {
  if (!API_KEY || !API_URL) {
    console.warn('Neon configuration missing. Using localStorage fallback.');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Data API Error:', errorText);
      throw new Error('Database connection issue');
    }

    return await response.json();
  } catch (err) {
    console.error('Request failed:', err.message);
    return null; // Fallback to localStorage
  }
};

// Local storage fallback helper
const getLocalUsers = () => {
  const users = localStorage.getItem('nexus_rx_users');
  return users ? JSON.parse(users) : [];
};

const saveLocalUser = (user) => {
  const users = getLocalUsers();
  users.push(user);
  localStorage.setItem('nexus_rx_users', JSON.stringify(users));
};

export const authService = {
  async signup(name, phone, password, extraData = {}) {
    // Attempt to insert into "dr login" table using Data API
    // Note: If you renamed your table to "users", change "/dr%20login" to "/users"
    const result = await request('/dr%20login', 'POST', { 
      name, 
      phone, 
      password,
      qualification: extraData.qualification || '',
      consultant: extraData.consultant || '',
      regNo: extraData.regNo || ''
    });
    
    if (result === null || (Array.isArray(result) && result.length === 0)) {
      console.log('Falling back to local storage for signup');
      const users = getLocalUsers();
      if (users.find(u => u.phone === phone)) {
        throw new Error('Phone number already registered (Local)');
      }
      const newUser = { 
        id: Date.now(), 
        name, 
        phone, 
        password,
        qualification: extraData.qualification || '',
        consultant: extraData.consultant || '',
        regNo: extraData.regNo || ''
      };
      saveLocalUser(newUser);
      return newUser;
    }
    return Array.isArray(result) ? result[0] : result;
  },

  async login(phone, password) {
    // Attempt to query "dr login" table using Data API filter
    const result = await request(`/dr%20login?phone=eq.${phone}&password=eq.${password}`);
    
    if (result === null) {
      console.log('Falling back to local storage for login');
      const users = getLocalUsers();
      const user = users.find(u => u.phone === phone && u.password === password);
      return user || null;
    }
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }
};



