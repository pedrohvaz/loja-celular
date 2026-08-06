/* ============================================================
   PLANETA CELULAR — fin-db.js
   Financeiro via API ("/finance/transactions", "/finance/categories",
   "/finance/cash-register"). Mesmos métodos e campos PT-BR de
   antes; tradução para o formato da API acontece só aqui dentro.
============================================================ */

const FinDB = {
  _tipoToApi: { receita: 'INCOME', despesa: 'EXPENSE' },
  _tipoFromApi: { INCOME: 'receita', EXPENSE: 'despesa' },
  _statusToApi: { pendente: 'PENDING', pago: 'PAID', cancelado: 'CANCELLED' },
  _statusFromApi: { PENDING: 'pendente', PAID: 'pago', CANCELLED: 'cancelado' },

  /* ══════════════════════════════════════
     CATEGORIAS
  ══════════════════════════════════════ */
  async getCategories(tipo = null) {
    const list = await apiFetch('/finance/categories');
    const mapped = list.map(c => ({ id: c.id, nome: c.name, tipo: this._tipoFromApi[c.type] || 'receita', icone: c.icon || '' }));
    return tipo ? mapped.filter(c => c.tipo === tipo) : mapped;
  },

  async getCatById(id) {
    const list = await this.getCategories();
    return list.find(c => c.id === id) || null;
  },

  async addCategory(data) {
    const c = await apiFetch('/finance/categories', {
      method: 'POST',
      body: { name: data.nome, type: this._tipoToApi[data.tipo] || 'INCOME', icon: data.icone || undefined },
    });
    return { id: c.id, nome: c.name, tipo: this._tipoFromApi[c.type] || 'receita', icone: c.icon || '' };
  },

  /* ══════════════════════════════════════
     TRANSAÇÕES
  ══════════════════════════════════════ */
  _fromApi(t) {
    return {
      id: t.id,
      numero: t.number,
      tipo: this._tipoFromApi[t.type] || 'receita',
      categoria_id: t.categoryId,
      categoria_nome: t.category?.name || '',
      descricao: t.description || '',
      valor: Number(t.amount),
      data_transacao: (t.transactionDate || '').slice(0, 10),
      data_vencimento: t.dueDate ? t.dueDate.slice(0, 10) : null,
      status: this._statusFromApi[t.status] || 'pendente',
      forma_pagamento: t.paymentMethod || '',
      origem: t.source || 'manual',
      origem_id: t.sourceId || null,
      observacao: t.notes || '',
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      historico: t.history || [],
    };
  },

  _toApiCreate(data) {
    return {
      type: this._tipoToApi[data.tipo] || 'INCOME',
      categoryId: data.categoria_id,
      description: data.descricao || '',
      amount: parseFloat(data.valor) || 0,
      transactionDate: data.data_transacao || new Date().toISOString().slice(0, 10),
      dueDate: data.data_vencimento || undefined,
      status: this._statusToApi[data.status] || 'PENDING',
      paymentMethod: data.forma_pagamento || undefined,
      notes: data.observacao || undefined,
    };
  },

  _toApiUpdate(data) {
    const out = {};
    const setters = {
      tipo: v => { out.type = this._tipoToApi[v] || v; },
      categoria_id: v => { out.categoryId = v; },
      descricao: v => { out.description = v; },
      valor: v => { out.amount = parseFloat(v) || 0; },
      data_transacao: v => { out.transactionDate = v; },
      data_vencimento: v => { out.dueDate = v || undefined; },
      status: v => { out.status = this._statusToApi[v] || v; },
      forma_pagamento: v => { out.paymentMethod = v; },
      observacao: v => { out.notes = v; },
    };
    Object.entries(data).forEach(([k, v]) => { if (setters[k]) setters[k](v); });
    return out;
  },

  async getAll() {
    const res = await apiFetch('/finance/transactions', { query: { limit: 500 } });
    return res.data.map(t => this._fromApi(t));
  },

  async getById(id) {
    const t = await apiFetch(`/finance/transactions/${id}`);
    return this._fromApi(t);
  },

  async add(data) {
    const t = await apiFetch('/finance/transactions', { method: 'POST', body: this._toApiCreate(data) });
    return this._fromApi(t);
  },

  async update(id, data) {
    const t = await apiFetch(`/finance/transactions/${id}`, { method: 'PATCH', body: this._toApiUpdate(data) });
    return this._fromApi(t);
  },

  async delete(id) {
    await apiFetch(`/finance/transactions/${id}`, { method: 'DELETE' });
  },

  /* obs: ao contrário da versão local, a API não permite sobrescrever
     o valor ao registrar pagamento — só a forma de pagamento */
  async registrarPagamento(id, formaPagamento) {
    const t = await apiFetch(`/finance/transactions/${id}/pay`, {
      method: 'PATCH',
      body: { paymentMethod: formaPagamento || 'dinheiro' },
    });
    return this._fromApi(t);
  },

  /* ══════════════════════════════════════
     QUERIES E FILTROS
  ══════════════════════════════════════ */
  async _filter(f = {}) {
    const query = { limit: 500 };
    if (f.tipo) query.type = this._tipoToApi[f.tipo];
    if (f.categoria_id) query.categoryId = f.categoria_id;
    if (f.status) query.status = this._statusToApi[f.status];
    if (f.forma_pagamento) query.paymentMethod = f.forma_pagamento;
    if (f.start) query.dateFrom = f.start;
    if (f.end) query.dateTo = f.end;
    if (f.search) query.search = f.search;
    const res = await apiFetch('/finance/transactions', { query });
    let list = res.data.map(t => this._fromApi(t));
    if (f.origem) list = list.filter(t => t.origem === f.origem);
    return list;
  },

  /* paginado de verdade — usado na tabela de Lançamentos */
  async getPage(f = {}) {
    const query = { page: f.page || 1, limit: f.limit || 20 };
    if (f.tipo) query.type = this._tipoToApi[f.tipo];
    if (f.categoria_id) query.categoryId = f.categoria_id;
    if (f.status) query.status = this._statusToApi[f.status];
    if (f.forma_pagamento) query.paymentMethod = f.forma_pagamento;
    if (f.start) query.dateFrom = f.start;
    if (f.end) query.dateTo = f.end;
    if (f.search) query.search = f.search;
    const res = await apiFetch('/finance/transactions', { query });
    return { data: res.data.map(t => this._fromApi(t)), total: res.total, page: res.page, pages: res.pages };
  },

  async getReceitas(f = {}) { return this._filter({ ...f, tipo: 'receita' }); },
  async getDespesas(f = {}) { return this._filter({ ...f, tipo: 'despesa' }); },

  async getPendentes(tipo = null) {
    return this._filter({ ...(tipo ? { tipo } : {}), status: 'pendente' });
  },

  async getVencidos(tipo = null) {
    const today = new Date().toISOString().slice(0, 10);
    const list = await this.getPendentes(tipo);
    return list.filter(t => t.data_vencimento && t.data_vencimento < today);
  },

  async getProximosVencimentos(days = 7) {
    const now = new Date().toISOString().slice(0, 10);
    const futureD = new Date();
    futureD.setDate(futureD.getDate() + days);
    const future = futureD.toISOString().slice(0, 10);
    const list = await this.getPendentes();
    return list
      .filter(t => t.data_vencimento && t.data_vencimento >= now && t.data_vencimento <= future)
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
  },

  /* ══════════════════════════════════════
     ESTATÍSTICAS (via /finance/transactions/dashboard)
  ══════════════════════════════════════ */
  async _dashboard(ano, mes) {
    return apiFetch('/finance/transactions/dashboard', { query: { year: ano, month: mes } });
  },

  async getStats(ano, mes) {
    const d = await this._dashboard(ano, mes);
    return {
      receitas_pagas: d.summary.totalIncome,
      despesas_pagas: d.summary.totalExpense,
      lucro: d.summary.profit,
      a_receber: d.summary.toReceive,
      a_pagar: d.summary.toPay,
      saldo: d.summary.balance,
    };
  },

  async getLast6MonthsStats(ano, mes) {
    const now = new Date();
    const d = await this._dashboard(ano || now.getFullYear(), mes || now.getMonth() + 1);
    return d.last6.map(m => ({ label: m.month, receitas: m.income, despesas: m.expense, lucro: m.income - m.expense }));
  },

  async getDailyRevenueCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const pad = n => String(n).padStart(2, '0');
    const days = new Date(year, month, 0).getDate();
    const from = `${year}-${pad(month)}-01`;
    const to = `${year}-${pad(month)}-${pad(days)}`;
    const res = await apiFetch('/finance/transactions', {
      query: { type: 'INCOME', status: 'PAID', dateFrom: from, dateTo: to, limit: 500 },
    });
    const txs = res.data.map(t => this._fromApi(t));
    return Array.from({ length: days }, (_, i) => {
      const day = pad(i + 1);
      const val = txs.filter(t => t.data_transacao === `${year}-${pad(month)}-${day}`).reduce((s, t) => s + t.valor, 0);
      return { day: i + 1, valor: val };
    });
  },

  async getDistribuicaoPorCategoria(tipo, ano, mes) {
    const now = new Date();
    const d = await this._dashboard(ano || now.getFullYear(), mes || now.getMonth() + 1);
    const arr = tipo === 'despesa' ? d.expenseByCategory : d.incomeByCategory;
    return arr.map(c => [c.name, c.value]).sort((a, b) => b[1] - a[1]);
  },

  /* ══════════════════════════════════════
     CAIXA
  ══════════════════════════════════════ */
  _caixaFromApi(c) {
    return {
      id: c.id,
      data: (c.date || c.openedAt || '').slice(0, 10),
      abertura_em: c.openedAt,
      saldo_abertura: Number(c.openingBalance),
      fechamento_em: c.closedAt || null,
      saldo_contado: c.countedBalance != null ? Number(c.countedBalance) : null,
      saldo_esperado: c.expectedBalance != null ? Number(c.expectedBalance) : null,
      entradas: Number(c.cashIn || 0),
      saidas: Number(c.cashOut || 0),
      diferenca: c.difference != null ? Number(c.difference) : null,
      observacao: c.notes || '',
      status: c.status === 'OPEN' ? 'aberto' : 'fechado',
    };
  },

  async getCaixas() {
    const list = await apiFetch('/finance/cash-register');
    return list.map(c => this._caixaFromApi(c));
  },

  async getCaixaAberto() {
    try {
      const c = await apiFetch('/finance/cash-register/current');
      return c ? this._caixaFromApi(c) : null;
    } catch {
      return null;
    }
  },

  async abrirCaixa(valorAbertura, obs = '') {
    const c = await apiFetch('/finance/cash-register/open', {
      method: 'POST',
      body: { openingBalance: parseFloat(valorAbertura) || 0, notes: obs || undefined },
    });
    return this._caixaFromApi(c);
  },

  /* obs: o servidor sempre fecha o caixa aberto do tenant — o id
     é mantido no parâmetro só por compatibilidade com o call site */
  async fecharCaixa(_caixaId, valorFechamento, obs = '') {
    const c = await apiFetch('/finance/cash-register/close', {
      method: 'POST',
      body: { countedBalance: parseFloat(valorFechamento) || 0, notes: obs || undefined },
    });
    return this._caixaFromApi(c);
  },

  async getHistoricoCaixa() {
    const list = await this.getCaixas();
    return list.sort((a, b) => (b.abertura_em || '').localeCompare(a.abertura_em || ''));
  },

  /* ══════════════════════════════════════
     EXPORT CSV
  ══════════════════════════════════════ */
  async exportCSV(list) {
    const header = ['ID','Tipo','Categoria','Descrição','Valor','Data','Vencimento','Status','Pagamento','Origem','Observação'];
    const cats = await this.getCategories();
    const rows = list.map(t => {
      const cat = cats.find(c => c.id === t.categoria_id);
      return [
        t.id, t.tipo,
        cat?.nome || t.categoria_nome || '',
        `"${(t.descricao || '').replace(/"/g, '""')}"`,
        t.valor.toFixed(2).replace('.', ','),
        t.data_transacao,
        t.data_vencimento || '',
        t.status, t.forma_pagamento, t.origem,
        `"${(t.observacao || '').replace(/"/g, '""')}"`,
      ].join(';');
    });
    const csv = '﻿' + [header.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

/* ══════════════════════════════════════
   HELPERS GLOBAIS
══════════════════════════════════════ */
function finTipoLabel(tipo) {
  return { receita: 'Receita', despesa: 'Despesa' }[tipo] || tipo;
}

function finStatusLabel(status) {
  return { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }[status] || status;
}

function finPgtoLabel(pgto) {
  return {
    dinheiro:       'Dinheiro',
    pix:            'PIX',
    cartao_credito: 'Cartão Crédito',
    cartao_debito:  'Cartão Débito',
    transferencia:  'Transferência',
  }[pgto] || pgto || '—';
}

function finStatusBadge(status) {
  const map = {
    pago:      { cls: 'fin-badge--green',  lbl: 'Pago'      },
    pendente:  { cls: 'fin-badge--yellow', lbl: 'Pendente'  },
    cancelado: { cls: 'fin-badge--gray',   lbl: 'Cancelado' },
  };
  const s = map[status] || { cls: 'fin-badge--gray', lbl: status };
  return `<span class="fin-badge ${s.cls}">${s.lbl}</span>`;
}

function finTipoBadge(tipo) {
  const cls = tipo === 'receita' ? 'fin-badge--green' : 'fin-badge--red';
  const lbl = tipo === 'receita' ? '▲ Receita' : '▼ Despesa';
  return `<span class="fin-badge ${cls}">${lbl}</span>`;
}

function diasEmAberto(vencimento) {
  if (!vencimento) return 0;
  const diff = new Date().getTime() - new Date(vencimento + 'T00:00:00').getTime();
  return Math.floor(diff / 86400000);
}

function vencAlertCls(vencimento) {
  if (!vencimento) return '';
  const today = new Date().toISOString().slice(0, 10);
  if (vencimento < today)       return 'venc--red';
  const dias = Math.ceil((new Date(vencimento) - new Date()) / 86400000);
  if (dias <= 0)                return 'venc--yellow';
  if (dias <= 3)                return 'venc--orange';
  return '';
}

/* Obtém o primeiro/último dia de um mês */
function primeiroDia(ano, mes) {
  return `${ano}-${String(mes).padStart(2,'0')}-01`;
}
function ultimoDia(ano, mes) {
  return new Date(ano, mes, 0).toISOString().slice(0, 10);
}
