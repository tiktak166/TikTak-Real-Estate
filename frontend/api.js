window.TikTakAPI = (() => {
  const DEFAULT_API = 'http://localhost:4000/api';
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
    } catch (error) {
      const detail = location.protocol === 'file:'
        ? 'Fungura urubuga ukoresheje Live Server cyangwa http-server.'
        : 'Reba ko backend ikora kuri http://localhost:4000 kandi ko CLIENT_ORIGIN yemera uru rubuga.';
      throw new Error(`Ntibishobotse kuvugana na API (${API_BASE}). ${detail}`);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || `Ikosa rya server (${response.status})`;
      if (response.status === 401) throw new Error(`${message}. Ongera winjire muri konti yawe.`);
      if (response.status === 403) throw new Error(`${message}. Iyi konti ntifite uburenganzira bwa Admin.`);
      throw new Error(message);
    }
    return data;
  }

  return {
    request,
    get token() { return token(); },
    get user() {
      try { return JSON.parse(localStorage.getItem('tiktak-user') || 'null'); }
      catch { return null; }
    },
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
