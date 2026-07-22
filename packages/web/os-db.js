/* ============================================================
   PLANETA CELULAR — os-db.js
   Ordens de Serviço via API ("/service-orders"). Mesmos métodos
   e nomes de campo PT-BR de antes; tradução para o formato da
   API acontece só aqui dentro.
============================================================ */

const OSDB = {
  _statusToApi: {
    aguardando_diagnostico: 'AWAITING_DIAGNOSIS',
    em_reparo: 'IN_REPAIR',
    aguardando_peca: 'AWAITING_PART',
    aguardando_aprovacao: 'AWAITING_APPROVAL',
    concluido: 'COMPLETED',
    entregue: 'DELIVERED',
    cancelado: 'CANCELLED',
  },
  _statusFromApi: {
    AWAITING_DIAGNOSIS: 'aguardando_diagnostico',
    IN_REPAIR: 'em_reparo',
    AWAITING_PART: 'aguardando_peca',
    AWAITING_APPROVAL: 'aguardando_aprovacao',
    COMPLETED: 'concluido',
    DELIVERED: 'entregue',
    CANCELLED: 'cancelado',
  },
  _prioridadeToApi: { normal: 'NORMAL', alta: 'HIGH', urgente: 'URGENT' },
  _prioridadeFromApi: { NORMAL: 'normal', HIGH: 'alta', URGENT: 'urgente' },
  _pagStatusToApi: { pendente: 'PENDING', pago: 'PAID', cancelado: 'CANCELLED' },
  _pagStatusFromApi: { PENDING: 'pendente', PAID: 'pago', CANCELLED: 'cancelado' },

  _fromApi(so) {
    return {
      id: so.id,
      numero_os: so.number,
      data_entrada: so.createdAt,
      previsao_entrega: so.estimatedDelivery || null,
      status: this._statusFromApi[so.status] || 'aguardando_diagnostico',
      status_pagamento: this._pagStatusFromApi[so.paymentStatus] || 'pendente',
      created_at: so.createdAt,
      updated_at: so.updatedAt,
      historico_status: (so.statusHistory || []).map(h => ({
        status: this._statusFromApi[h.status] || h.status,
        data: h.date,
        obs: h.note || '',
      })),
      cliente_nome: so.clientName || '',
      cliente_cpf: so.clientCpf || '',
      cliente_telefone: so.clientPhone || '',
      cliente_email: so.clientEmail || '',
      cliente_endereco: so.clientAddress || '',
      aparelho_marca: so.deviceBrand || '',
      aparelho_modelo: so.deviceModel || '',
      aparelho_imei: so.deviceImei || '',
      aparelho_cor: so.deviceColor || '',
      aparelho_senha: so.devicePassword || '',
      acessorios: so.accessories || [],
      condicoes_visuais: so.visualConditions || '',
      tecnico: so.technician || '',
      problema_relatado: so.reportedProblem || '',
      laudo_tecnico: so.technicalReport || '',
      servicos_realizados: (so.servicesPerformed || []).map(s => ({ descricao: s.description, valor: Number(s.value) || 0 })),
      pecas_utilizadas: (so.partsUsed || []).map(p => ({ descricao: p.description, quantidade: p.quantity, valor_unitario: Number(p.unitValue) || 0 })),
      valor_servico: Number(so.serviceValue || 0),
      valor_pecas: Number(so.partsValue || 0),
      valor_total: Number(so.totalValue || 0),
      desconto: Number(so.discount || 0),
      forma_pagamento: so.paymentMethod || '',
      data_conclusao: so.completedAt || null,
      data_entrega: so.deliveredAt || null,
      observacoes_internas: so.internalNotes || '',
      valor_estimado: Number(so.estimatedValue || 0),
      prioridade: this._prioridadeFromApi[so.priority] || 'normal',
      isOverdue: !!so.isOverdue,
    };
  },

  _toApiCreate(data) {
    return {
      priority: this._prioridadeToApi[data.prioridade] || 'NORMAL',
      clientName: data.cliente_nome || '',
      clientCpf: data.cliente_cpf || undefined,
      clientPhone: data.cliente_telefone || undefined,
      clientEmail: data.cliente_email || '',
      clientAddress: data.cliente_endereco || undefined,
      deviceBrand: data.aparelho_marca || '',
      deviceModel: data.aparelho_modelo || '',
      deviceImei: data.aparelho_imei || undefined,
      deviceColor: data.aparelho_cor || undefined,
      devicePassword: data.aparelho_senha || undefined,
      accessories: data.acessorios || [],
      visualConditions: data.condicoes_visuais || undefined,
      technician: data.tecnico || undefined,
      reportedProblem: data.problema_relatado || '',
      estimatedValue: parseFloat(data.valor_estimado) || 0,
      estimatedDelivery: data.previsao_entrega || undefined,
      internalNotes: data.observacoes_internas || undefined,
    };
  },

  _toApiUpdate(data) {
    const out = {};
    const setters = {
      prioridade: v => { out.priority = this._prioridadeToApi[v] || v; },
      cliente_nome: v => { out.clientName = v; },
      cliente_cpf: v => { out.clientCpf = v; },
      cliente_telefone: v => { out.clientPhone = v; },
      cliente_email: v => { out.clientEmail = v; },
      cliente_endereco: v => { out.clientAddress = v; },
      aparelho_marca: v => { out.deviceBrand = v; },
      aparelho_modelo: v => { out.deviceModel = v; },
      aparelho_imei: v => { out.deviceImei = v; },
      aparelho_cor: v => { out.deviceColor = v; },
      aparelho_senha: v => { out.devicePassword = v; },
      acessorios: v => { out.accessories = v; },
      condicoes_visuais: v => { out.visualConditions = v; },
      tecnico: v => { out.technician = v; },
      problema_relatado: v => { out.reportedProblem = v; },
      laudo_tecnico: v => { out.technicalReport = v; },
      servicos_realizados: v => { out.servicesPerformed = (v || []).map(s => ({ description: s.descricao, value: Number(s.valor) || 0 })); },
      pecas_utilizadas: v => { out.partsUsed = (v || []).map(p => ({ description: p.descricao, quantity: Number(p.quantidade) || 1, unitValue: Number(p.valor_unitario) || 0 })); },
      valor_servico: v => { out.serviceValue = Number(v) || 0; },
      valor_pecas: v => { out.partsValue = Number(v) || 0; },
      desconto: v => { out.discount = Number(v) || 0; },
      valor_estimado: v => { out.estimatedValue = Number(v) || 0; },
      forma_pagamento: v => { out.paymentMethod = v; },
      status_pagamento: v => { out.paymentStatus = this._pagStatusToApi[v] || v; },
      previsao_entrega: v => { out.estimatedDelivery = v || undefined; },
      observacoes_internas: v => { out.internalNotes = v; },
    };
    Object.entries(data).forEach(([k, v]) => { if (setters[k]) setters[k](v); });
    return out;
  },

  async getAll() {
    const res = await apiFetch('/service-orders', { query: { limit: 500 } });
    return res.data.map(o => this._fromApi(o));
  },

  async getById(id) {
    const o = await apiFetch(`/service-orders/${id}`);
    return this._fromApi(o);
  },

  async getByNumero(numero) {
    const list = await this.getAll();
    return list.find(o => o.numero_os === numero) || null;
  },

  async add(data) {
    const o = await apiFetch('/service-orders', { method: 'POST', body: this._toApiCreate(data) });
    return this._fromApi(o);
  },

  async update(id, data) {
    const o = await apiFetch(`/service-orders/${id}`, { method: 'PATCH', body: this._toApiUpdate(data) });
    return this._fromApi(o);
  },

  async setStatus(id, novoStatus, obs = '') {
    const o = await apiFetch(`/service-orders/${id}/status`, {
      method: 'PATCH',
      body: { status: this._statusToApi[novoStatus] || 'AWAITING_DIAGNOSIS', note: obs || undefined },
    });
    return this._fromApi(o);
  },

  async delete(id) {
    await apiFetch(`/service-orders/${id}`, { method: 'DELETE' });
  },

  async searchByImei(imei) {
    if (!imei) return [];
    const res = await apiFetch('/service-orders', { query: { search: imei.trim(), limit: 500 } });
    return res.data.map(o => this._fromApi(o)).filter(o => o.aparelho_imei?.includes(imei.trim()));
  },

  async getByCliente(cpf) {
    if (!cpf) return [];
    const res = await apiFetch('/service-orders', { query: { search: cpf, limit: 500 } });
    return res.data.map(o => this._fromApi(o)).filter(o => o.cliente_cpf === cpf);
  },

  async getStats() {
    const s = await apiFetch('/service-orders/stats');
    return {
      total: s.total,
      abertas: s.open,
      em_reparo: s.inRepair,
      aguardando_peca: s.awaitingPart,
      aguardando_aprov: s.awaitingApproval,
      prontas: s.completed,
      entregues: s.delivered,
      canceladas: s.cancelled,
      vencidas: s.overdue,
      faturamento_mes: s.revenueThisMonth,
      technicians: s.technicians || [],
    };
  },

  /* pública, sem login — consulta-os.html e widget da home */
  async getPublic(query) {
    if (!query) return null;
    try {
      const so = await apiFetch(`/service-orders/public/${TENANT_SLUG}/${encodeURIComponent(query)}`, { auth: false });
      return this._fromApi(so);
    } catch {
      return null;
    }
  },
};

/* ── Labels e helpers de OS ── */
const OS_STATUS = {
  aguardando_diagnostico: { label: 'Aguardando Diagnóstico', color: '#F59E0B',  bg: '#FEF3C7', cls: 'os-status--yellow'  },
  em_reparo:              { label: 'Em Reparo',              color: '#3B82F6',  bg: '#DBEAFE', cls: 'os-status--blue'    },
  aguardando_peca:        { label: 'Aguardando Peça',        color: '#8B5CF6',  bg: '#EDE9FE', cls: 'os-status--purple'  },
  aguardando_aprovacao:   { label: 'Aguardando Aprovação',   color: '#F97316',  bg: '#FFEDD5', cls: 'os-status--orange'  },
  concluido:              { label: 'Concluído',              color: '#22C55E',  bg: '#DCFCE7', cls: 'os-status--green'   },
  entregue:               { label: 'Entregue',               color: '#16A34A',  bg: '#BBF7D0', cls: 'os-status--teal'   },
  cancelado:              { label: 'Cancelado',              color: '#EF4444',  bg: '#FEE2E2', cls: 'os-status--red'    },
};

function osStatusBadge(status) {
  const s = OS_STATUS[status] || { label: status, color: '#64748B', bg: '#F1F5F9', cls: '' };
  return `<span class="os-badge ${s.cls}" style="color:${s.color};background:${s.bg}">${s.label}</span>`;
}

function osStatusLabel(status) {
  return OS_STATUS[status]?.label || status;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function isVencida(os) {
  if (!os.previsao_entrega || ['entregue','cancelado'].includes(os.status)) return false;
  return new Date(os.previsao_entrega) < new Date();
}
