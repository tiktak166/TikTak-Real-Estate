
window.TikTakAPI = (() => {
  const DEFAULT_API = 'https://tiktak-real-estate.onrender.com/api';
  const savedBase = localStorage.getItem('tiktak-api-base');
  const API_BASE = (savedBase || DEFAULT_API).replace(/\/+$/, '');
  const token = () => localStorage.getItem('tiktak-token');

  async function request(path, options = {}) {
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    };

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      throw new Error('Ntibyashobotse kugera kuri server. Reba internet cyangwa ugerageze nyuma.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ikosa rya server (${response.status})`);
    return data;
  }

  return {
    request,
    get token() { return token(); },
    saveSession(data) {
      localStorage.setItem('tiktak-token', data.token);
      localStorage.setItem('tiktak-user', JSON.stringify(data.user));
    },
    clearSession() {
      localStorage.removeItem('tiktak-token');
      localStorage.removeItem('tiktak-user');
    },
    get base() { return API_BASE; }
  };
})();
