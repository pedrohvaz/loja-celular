/* ============================================================
   PLANETA CELULAR — db.js
   Camada de dados: cliente REST fino sobre a API (Express +
   Prisma), com os mesmos nomes de objeto/método do site
   original, mas agora assíncronos. Traduz nomes de campo/enum
   PT-BR (usados pela UI) ↔ inglês/camelCase (usados pela API)
   aqui dentro — as páginas continuam falando o "idioma" antigo.

   CartDB é a única coisa que continua 100% local (carrinho não
   tem equivalente no servidor até o checkout).
============================================================ */

/* ============================================================
   _storage — wrapper seguro para localStorage (usado só pelo
   carrinho e preferências locais, não mais pelos dados de negócio)
============================================================ */
const _storage = (() => {
  let available = true;
  try {
    const test = '__pc_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
  } catch (e) {
    available = false;
    console.error('[PlanetaCelular] localStorage não está disponível:', e);
    document.addEventListener('DOMContentLoaded', () => {
      const warn = document.createElement('div');
      warn.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#DC2626;color:#fff;text-align:center;padding:.75rem 1rem;font-size:.9rem;font-family:sans-serif;';
      warn.innerHTML = '⚠️ <strong>Atenção:</strong> O armazenamento local está bloqueado neste navegador. O carrinho <strong>não será salvo</strong>. Use o Chrome/Edge sem modo privado ou ative cookies.';
      document.body.prepend(warn);
    });
  }

  return {
    get(key) {
      if (!available) return null;
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      if (!available) return false;
      try { localStorage.setItem(key, value); return true; } catch (e) {
        console.error('[PlanetaCelular] Erro ao salvar:', key, e);
        return false;
      }
    },
    remove(key) {
      if (!available) return;
      try { localStorage.removeItem(key); } catch {}
    },
    getJSON(key) {
      try { return JSON.parse(this.get(key)); } catch { return null; }
    },
    setJSON(key, value) {
      return this.set(key, JSON.stringify(value));
    },
  };
})();

/* ============================================================
   ProductDB — CRUD de produtos via API
============================================================ */
const ProductDB = {
  _fromApi(p) {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand || '',
      condition: p.condition,
      price: Number(p.price),
      oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
      description: p.description || '',
      image: p.imageUrl || '',
      inStock: !!p.inStock,
    };
  },

  _toApi(data) {
    const out = {};
    if ('name' in data) out.name = data.name;
    if ('category' in data) out.category = data.category;
    if ('brand' in data) out.brand = data.brand || undefined;
    if ('condition' in data) out.condition = data.condition;
    if ('price' in data) out.price = Number(data.price);
    if ('oldPrice' in data) out.oldPrice = data.oldPrice != null && data.oldPrice !== '' ? Number(data.oldPrice) : undefined;
    if ('description' in data) out.description = data.description || undefined;
    if ('image' in data) out.imageUrl = data.image || undefined;
    if ('inStock' in data) out.inStock = data.inStock;
    return out;
  },

  /* uso autenticado (admin) */
  async getAll() {
    const res = await apiFetch('/products', { query: { limit: 500 } });
    return res.data.map(p => this._fromApi(p));
  },

  /* uso público (loja/vitrine, sem login) */
  async getAllPublic() {
    const res = await apiFetch(`/products/public/${TENANT_SLUG}`, { auth: false, query: { limit: 500 } });
    return res.data.map(p => this._fromApi(p));
  },

  /* paginado de verdade — usado na tabela de Produtos do painel */
  async getPage({ page = 1, limit = 20, search, category, inStock } = {}) {
    const query = { page, limit };
    if (search) query.search = search;
    if (category) query.category = category;
    if (inStock !== undefined && inStock !== '') query.inStock = inStock;
    const res = await apiFetch('/products', { query });
    return { data: res.data.map(p => this._fromApi(p)), total: res.total, page: res.page, pages: res.pages };
  },

  async getById(id) {
    const p = await apiFetch(`/products/${id}`);
    return this._fromApi(p);
  },

  async add(product) {
    const p = await apiFetch('/products', { method: 'POST', body: this._toApi({ inStock: true, ...product }) });
    return this._fromApi(p);
  },

  async update(id, data) {
    const p = await apiFetch(`/products/${id}`, { method: 'PATCH', body: this._toApi(data) });
    return this._fromApi(p);
  },

  async delete(id) {
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
  },

  async getCategories() {
    const list = await this.getAll();
    return [...new Set(list.map(p => p.category))];
  },

  async getStats() {
    const s = await apiFetch('/products/stats');
    return { total: s.total, inStock: s.inStock, outStock: s.outOfStock, categories: s.categories };
  },
};

/* ============================================================
   CartDB — Carrinho no localStorage (inalterado)
============================================================ */
const CartDB = {
  KEY: 'pc_cart',

  getItems() {
    return _storage.getJSON(this.KEY) || [];
  },

  addItem(product, qty = 1) {
    const items = this.getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({ ...product, qty });
    _storage.setJSON(this.KEY, items);
    this._dispatch();
  },

  removeItem(id) {
    _storage.setJSON(this.KEY, this.getItems().filter(i => i.id !== id));
    this._dispatch();
  },

  updateQty(id, qty) {
    if (qty < 1) { this.removeItem(id); return; }
    _storage.setJSON(this.KEY, this.getItems().map(i => i.id === id ? { ...i, qty } : i));
    this._dispatch();
  },

  clear() {
    _storage.remove(this.KEY);
    this._dispatch();
  },

  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  _dispatch() {
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: this.getCount() } }));
  },
};

/* ============================================================
   OrderDB — Pedidos via API ("/orders")
============================================================ */
const OrderDB = {
  _statusToApi: { pending: 'PENDING', confirmed: 'CONFIRMED', delivered: 'DELIVERED', cancelled: 'CANCELLED' },
  _statusFromApi: { PENDING: 'pending', CONFIRMED: 'confirmed', DELIVERED: 'delivered', CANCELLED: 'cancelled' },

  _fromApi(o) {
    return {
      id: o.id,
      customer: o.customer || {},
      items: o.items || [],
      subtotal: Number(o.subtotal),
      desconto: Number(o.discount || 0),
      shipping: o.shipping || null,
      total: Number(o.total),
      payment: o.payment,
      origem: o.source,
      date: o.createdAt,
      status: this._statusFromApi[o.status] || 'pending',
    };
  },

  async getAll() {
    const res = await apiFetch('/orders', { query: { limit: 500 } });
    return res.data.map(o => this._fromApi(o));
  },

  /* paginado de verdade — usado na tabela de Pedidos do painel */
  async getPage({ page = 1, limit = 20, search, status } = {}) {
    const query = { page, limit };
    if (search) query.search = search;
    if (status) query.status = this._statusToApi[status] || status;
    const res = await apiFetch('/orders', { query });
    return { data: res.data.map(o => this._fromApi(o)), total: res.total, page: res.page, pages: res.pages };
  },

  /* Checkout público (loja, sem login) — único uso restante de add() */
  async add(order) {
    const body = {
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.desconto ?? order.discount ?? 0,
      shipping: order.shipping,
      total: order.total,
      payment: order.payment,
      source: order.origem || 'ecommerce',
      slug: TENANT_SLUG,
    };
    const o = await apiFetch('/orders/public', { method: 'POST', auth: false, body });
    return this._fromApi(o);
  },

  async updateStatus(id, status) {
    const o = await apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status: this._statusToApi[status] || 'PENDING' } });
    return this._fromApi(o);
  },

  async delete(id) {
    await apiFetch(`/orders/${id}`, { method: 'DELETE' });
  },
};

/* ============================================================
   SalesDB — PDV / venda balcão via API ("/sales")
   Valida caixa aberto e preços no servidor; cria o Order por
   baixo (source:'pos') — usar isto, não OrderDB.add, no PDV.
============================================================ */
const SalesDB = {
  async checkout({ items, discount = 0, payment, customerName, customerPhone }) {
    const o = await apiFetch('/sales', {
      method: 'POST',
      body: { items, discount, payment, customerName, customerPhone },
    });
    return OrderDB._fromApi(o);
  },
};

/* ============================================================
   AuthDB — Autenticação real via API (JWT + tenant slug)
============================================================ */
const AuthDB = {
  _roleToLocal: { ADMIN: 'admin', EMPLOYEE: 'funcionario' },
  _lastError: 'Credenciais inválidas.',

  get lastError() { return this._lastError; },

  async login(email, password) {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: (email || '').trim(), password, slug: TENANT_SLUG },
      });
      ApiClient.tokens.set(data.accessToken, data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return true;
    } catch (e) {
      this._lastError = e.message || 'Credenciais inválidas.';
      return false;
    }
  },

  async logout() {
    const refreshToken = ApiClient.tokens.refresh;
    try {
      if (refreshToken) await apiFetch('/auth/logout', { method: 'POST', auth: false, body: { refreshToken } });
    } catch { /* ignore */ }
    ApiClient.tokens.clear();
  },

  _user() {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  },

  isLoggedIn() {
    return !!ApiClient.tokens.access && !!this._user();
  },

  getRole() {
    const role = this._user()?.role;
    return this._roleToLocal[role] || null;
  },

  getNome() {
    return this._user()?.name || 'Admin';
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  requireAuth() {
    if (!this.isLoggedIn()) window.location.href = 'admin.html';
  },

  requireAdmin() {
    if (!this.isLoggedIn()) { window.location.href = 'admin.html'; return; }
    if (!this.isAdmin()) { window.location.href = 'painel.html'; }
  },
};

/* ============================================================
   CustomerDB — Clientes via API ("/customers")
============================================================ */
const CustomerDB = {
  _fromApi(c) {
    return {
      id: c.id,
      nome: c.name,
      telefone: c.phone || '',
      email: c.email || '',
      cpf: c.cpf || '',
      nascimento: c.birthDate ? c.birthDate.slice(0, 10) : '',
      endereco: c.address || '',
      cidade: c.city || '',
      estado: c.state || '',
      observacoes: c.notes || '',
      createdAt: c.createdAt,
    };
  },

  _toApi(data) {
    const out = {};
    if ('nome' in data) out.name = data.nome;
    if ('telefone' in data) out.phone = data.telefone || undefined;
    if ('email' in data) out.email = data.email || '';
    if ('cpf' in data) out.cpf = data.cpf || undefined;
    if ('nascimento' in data) out.birthDate = data.nascimento || undefined;
    if ('endereco' in data) out.address = data.endereco || undefined;
    if ('cidade' in data) out.city = data.cidade || undefined;
    if ('estado' in data) out.state = data.estado || undefined;
    if ('observacoes' in data) out.notes = data.observacoes || undefined;
    return out;
  },

  async getAll() {
    const res = await apiFetch('/customers', { query: { limit: 500 } });
    return res.data.map(c => this._fromApi(c));
  },

  /* paginado de verdade — usado na tabela de Clientes do painel */
  async getPage({ page = 1, limit = 20, search, city } = {}) {
    const query = { page, limit };
    if (search) query.search = search;
    if (city) query.city = city;
    const res = await apiFetch('/customers', { query });
    return { data: res.data.map(c => this._fromApi(c)), total: res.total, page: res.page, pages: res.pages };
  },

  async getById(id) {
    const c = await apiFetch(`/customers/${id}`);
    return this._fromApi(c);
  },

  async add(customer) {
    const c = await apiFetch('/customers', { method: 'POST', body: this._toApi(customer) });
    return this._fromApi(c);
  },

  async update(id, data) {
    const c = await apiFetch(`/customers/${id}`, { method: 'PATCH', body: this._toApi(data) });
    return this._fromApi(c);
  },

  async delete(id) {
    await apiFetch(`/customers/${id}`, { method: 'DELETE' });
  },

  async importFromOrders() {
    const res = await apiFetch('/customers/import-from-orders', { method: 'POST' });
    return res.imported;
  },

  async getStats() {
    const s = await apiFetch('/customers/stats');
    return { total: s.total, novosMes: s.newThisMonth };
  },
};

/* ============================================================
   CampaignDB — Campanhas via API ("/campaigns")
============================================================ */
const CampaignDB = {
  _tipoToApi: { whatsapp: 'WHATSAPP', instagram: 'INSTAGRAM', email: 'EMAIL', sms: 'SMS' },
  _tipoFromApi: { WHATSAPP: 'whatsapp', INSTAGRAM: 'instagram', EMAIL: 'email', SMS: 'sms' },
  _statusToApi: { planejada: 'PLANNED', ativa: 'ACTIVE', pausada: 'PAUSED', encerrada: 'ENDED' },
  _statusFromApi: { PLANNED: 'planejada', ACTIVE: 'ativa', PAUSED: 'pausada', ENDED: 'encerrada' },

  _fromApi(c) {
    return {
      id: c.id,
      nome: c.name,
      tipo: this._tipoFromApi[c.type] || c.type,
      status: this._statusFromApi[c.status] || c.status,
      inicio: c.startDate ? c.startDate.slice(0, 10) : '',
      fim: c.endDate ? c.endDate.slice(0, 10) : '',
      publico: c.audience || '',
      mensagem: c.message || '',
      createdAt: c.createdAt,
    };
  },

  _toApi(data) {
    const out = {};
    if ('nome' in data) out.name = data.nome;
    if ('tipo' in data) out.type = this._tipoToApi[data.tipo] || data.tipo;
    if ('status' in data) out.status = this._statusToApi[data.status] || data.status;
    if ('inicio' in data) out.startDate = data.inicio || undefined;
    if ('fim' in data) out.endDate = data.fim || undefined;
    if ('publico' in data) out.audience = data.publico || undefined;
    if ('mensagem' in data) out.message = data.mensagem || undefined;
    return out;
  },

  async getAll() {
    const list = await apiFetch('/campaigns');
    return list.map(c => this._fromApi(c));
  },

  async getById(id) {
    const list = await this.getAll();
    return list.find(c => c.id === id) || null;
  },

  async add(campaign) {
    const c = await apiFetch('/campaigns', { method: 'POST', body: this._toApi(campaign) });
    return this._fromApi(c);
  },

  async update(id, data) {
    const c = await apiFetch(`/campaigns/${id}`, { method: 'PATCH', body: this._toApi(data) });
    return this._fromApi(c);
  },

  async delete(id) {
    await apiFetch(`/campaigns/${id}`, { method: 'DELETE' });
  },
};

/* ============================================================
   StoreCategoryDB — Categorias de produtos via API ("/product-categories")
============================================================ */
const StoreCategoryDB = {
  _cache: new Map(), // slug -> nome, alimentado a cada getAll()/getAllPublic()

  _fromApi(c) {
    this._cache.set(c.slug, c.name);
    return { id: c.id, nome: c.name, slug: c.slug, createdAt: c.createdAt };
  },

  async getAll() {
    const list = await apiFetch('/product-categories');
    return list.map(c => this._fromApi(c));
  },

  /* uso público (loja/vitrine, sem login) */
  async getAllPublic() {
    const list = await apiFetch(`/product-categories/public/${TENANT_SLUG}`, { auth: false });
    return list.map(c => this._fromApi(c));
  },

  async add(data) {
    const c = await apiFetch('/product-categories', { method: 'POST', body: { name: data.nome, slug: data.slug || undefined } });
    return this._fromApi(c);
  },

  async update(id, data) {
    const body = {};
    if ('nome' in data) body.name = data.nome;
    if ('slug' in data) body.slug = data.slug;
    const c = await apiFetch(`/product-categories/${id}`, { method: 'PATCH', body });
    return this._fromApi(c);
  },

  async delete(id) {
    await apiFetch(`/product-categories/${id}`, { method: 'DELETE' });
  },
};

/* ============================================================
   SettingsDB — Dados da empresa/tenant via API ("/settings")
============================================================ */
const SettingsDB = {
  async get() {
    return apiFetch('/settings');
  },
  async update(data) {
    return apiFetch('/settings', { method: 'PATCH', body: data });
  },
  /* uso público (loja/checkout, sem login) — só nome/telefone/e-mail */
  async getPublic() {
    return apiFetch(`/settings/public/${TENANT_SLUG}`, { auth: false });
  },
};

/* ============================================================
   WhatsappDB — número real da loja para os links "Falar no WhatsApp"
============================================================ */
const WhatsappDB = {
  _number: null,

  async resolve() {
    if (this._number) return this._number;
    try {
      const data = (typeof AuthDB !== 'undefined' && AuthDB.isLoggedIn())
        ? await SettingsDB.get()
        : await SettingsDB.getPublic();
      const raw = data.settings?.whatsapp || data.whatsapp || data.phone || '';
      const digits = raw.replace(/\D/g, '');
      this._number = digits ? (digits.length <= 11 ? '55' + digits : digits) : '5511999999999';
    } catch {
      this._number = '5511999999999';
    }
    return this._number;
  },

  /* Reescreve os links wa.me/tel: já presentes no DOM com o número real */
  async applyLinks(root = document) {
    const number = await this.resolve();
    root.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
      a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${number}`);
    });
    root.querySelectorAll('a[href^="tel:+55"]').forEach(a => {
      a.href = `tel:+${number}`;
    });
  },
};

/* ============================================================
   UploadDB — Upload de imagem via API ("/upload")
============================================================ */
const UploadDB = {
  async upload(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch('/upload', { method: 'POST', body: form, isForm: true });
    return res.url;
  },
};

/* ============================================================
   UsersDB — Usuários do tenant via API ("/users", admin only)
============================================================ */
const UsersDB = {
  async getAll() {
    return apiFetch('/users');
  },
  async add(data) {
    return apiFetch('/users', { method: 'POST', body: data });
  },
  async update(id, data) {
    return apiFetch(`/users/${id}`, { method: 'PATCH', body: data });
  },
  async delete(id) {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
  },
};

/* ── Dark mode: aplica na carga de qualquer página ── */
try {
  if (localStorage.getItem('pc_dark_mode') === '1') document.body.classList.add('dark');
} catch (e) { /* storage bloqueado */ }

/* ── Helpers globais ── */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function categoryLabel(key) {
  if (StoreCategoryDB._cache.has(key)) return StoreCategoryDB._cache.get(key);
  const fallback = {
    smartphones: 'Smartphone', capinhas: 'Capinha', peliculas: 'Película',
    carregadores: 'Carregador', audio: 'Áudio', cabos: 'Cabo/Acessório',
  };
  return fallback[key] || key;
}

function conditionLabel(key) {
  const map = { novo: 'Novo', seminovo: 'Seminovo', usado: 'Usado' };
  return map[key] || key;
}

/* ── Erro de módulo não disponível no plano: mensagem amigável ── */
function isModuleUnavailableError(e) {
  return /não está disponível no seu plano/i.test(e?.message || '');
}

/* ── Debounce: atrasa a chamada até parar de digitar ── */
function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Controles de paginação (Anterior/Próxima + "Página X de Y · N registros") ──
   containerEl: elemento onde os controles são renderizados
   info: { page, pages, total }
   onChange(novaPagina): chamado ao trocar de página */
function renderPaginationControls(containerEl, info, onChange) {
  if (!containerEl) return;
  const { page, pages, total } = info;
  if (!total || pages <= 1) {
    containerEl.innerHTML = total
      ? `<span style="font-size:.8rem;color:var(--gray-500);">${total} registro${total === 1 ? '' : 's'}</span>`
      : '';
    return;
  }
  containerEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:.75rem;justify-content:flex-end;padding:.75rem 0;">
      <span style="font-size:.8rem;color:var(--gray-500);">Página ${page} de ${pages} · ${total} registro${total === 1 ? '' : 's'}</span>
      <div style="display:flex;gap:.4rem;">
        <button type="button" class="btn-pagination-prev" ${page <= 1 ? 'disabled' : ''} style="padding:.4rem .75rem;border:1px solid var(--gray-200);border-radius:8px;background:#fff;cursor:${page <= 1 ? 'not-allowed' : 'pointer'};opacity:${page <= 1 ? '.5' : '1'};font-size:.82rem;">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <button type="button" class="btn-pagination-next" ${page >= pages ? 'disabled' : ''} style="padding:.4rem .75rem;border:1px solid var(--gray-200);border-radius:8px;background:#fff;cursor:${page >= pages ? 'not-allowed' : 'pointer'};opacity:${page >= pages ? '.5' : '1'};font-size:.82rem;">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
  if (page > 1) containerEl.querySelector('.btn-pagination-prev').addEventListener('click', () => onChange(page - 1));
  if (page < pages) containerEl.querySelector('.btn-pagination-next').addEventListener('click', () => onChange(page + 1));
}
