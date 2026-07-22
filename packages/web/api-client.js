/* ============================================================
   PLANETA CELULAR — api-client.js
   Cliente HTTP fino sobre fetch: anexa o access token, renova
   automaticamente em 401 (fila única de refresh) e normaliza
   erros da API em Error com mensagem legível.
============================================================ */

const _tokens = {
  get access() { return localStorage.getItem('accessToken'); },
  get refresh() { return localStorage.getItem('refreshToken'); },
  set(access, refresh) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

let _refreshPromise = null;

async function _doRefresh() {
  const refreshToken = _tokens.refresh;
  if (!refreshToken) throw new Error('Sessão expirada');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Sessão expirada');

  const data = await res.json();
  _tokens.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function _buildQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function _parseError(res) {
  try {
    const body = await res.json();
    if (body?.details) {
      const msgs = Array.isArray(body.details)
        ? body.details.map(d => d.message).join(', ')
        : JSON.stringify(body.details);
      return body.error ? `${body.error}: ${msgs}` : msgs;
    }
    return body?.error || `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

/**
 * apiFetch('/products', { method, body, auth, query, isForm })
 * - auth=true (padrão): anexa Authorization e tenta refresh em 401
 * - retorna null para respostas 204
 */
async function apiFetch(path, opts = {}) {
  const { method = 'GET', body, auth = true, query, isForm = false, _retried = false } = opts;

  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = _tokens.access;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}${_buildQuery(query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !_retried) {
    try {
      _refreshPromise = _refreshPromise || _doRefresh().finally(() => { _refreshPromise = null; });
      await _refreshPromise;
      return apiFetch(path, { ...opts, _retried: true });
    } catch {
      _tokens.clear();
      if (!location.pathname.endsWith('admin.html')) location.href = 'admin.html';
      throw new Error('Sessão expirada');
    }
  }

  if (!res.ok) throw new Error(await _parseError(res));
  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return res.json();
}

const ApiClient = { fetch: apiFetch, tokens: _tokens };
