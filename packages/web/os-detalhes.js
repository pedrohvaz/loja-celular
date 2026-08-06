/* ============================================================
   PLANETA CELULAR — os-detalhes.js
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  AuthDB.requireAuth();

  /* ── Sidebar mobile ── */
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !document.getElementById('sidebarToggle').contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthDB.logout();
    window.location.href = 'admin.html';
  });

  /* ── Toast ── */
  let toastTimer;
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  /* ── Load OS ── */
  const params = new URLSearchParams(location.search);
  const osId   = params.get('id');
  if (!osId) { window.location.href = 'os-lista.html'; return; }

  let os;
  try { os = await OSDB.getById(osId); } catch { os = null; }
  if (!os) { alert('OS não encontrada.'); window.location.href = 'os-lista.html'; return; }

  /* ── Render all ── */
  async function reload() {
    os = await OSDB.getById(osId);
    renderHeader();
    renderInfoCards();
    renderStatus();
    renderTimeline();
    renderServicos();
    renderPecas();
    renderFinancial();
    renderComprovante();
  }

  function renderHeader() {
    document.getElementById('topbarOsNum').textContent = os.numero_os;
    document.getElementById('detHeaderNum').textContent = os.numero_os;
    document.getElementById('detHeaderMeta').innerHTML =
      `${os.aparelho_marca || ''} ${os.aparelho_modelo || ''} · ${os.cliente_nome} · Entrada: ${formatDate(os.data_entrada)} ${osStatusBadge(os.status)}`;
  }

  function renderInfoCards() {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || '—';
    };
    set('det_cliente_nome',     os.cliente_nome);
    set('det_cliente_cpf',      os.cliente_cpf);
    set('det_cliente_telefone', os.cliente_telefone);
    set('det_cliente_email',    os.cliente_email);
    set('det_cliente_endereco', os.cliente_endereco);
    set('det_aparelho',   `${os.aparelho_marca || ''} ${os.aparelho_modelo || ''}`.trim());
    set('det_imei',       os.aparelho_imei);
    set('det_cor',        os.aparelho_cor);
    set('det_senha',      os.aparelho_senha);
    set('det_acessorios', (os.acessorios || []).join(', ') || '—');
    set('det_condicoes',  os.condicoes_visuais);
    set('det_data_entrada', formatDatetime(os.data_entrada));
    set('det_previsao',   os.previsao_entrega ? formatDatetime(os.previsao_entrega) + (isVencida(os) ? ' ⚠️ Vencida' : '') : '—');
    set('det_conclusao',  os.data_conclusao ? formatDatetime(os.data_conclusao) : '—');
    set('det_entrega',    os.data_entrega    ? formatDatetime(os.data_entrega)   : '—');
    set('det_tecnico',    os.tecnico);
    set('det_pagamento',  { dinheiro:'Dinheiro', pix:'PIX', cartao_credito:'Cartão de crédito', cartao_debito:'Cartão de débito' }[os.forma_pagamento] || '—');

    const prioEl = document.getElementById('det_prioridade');
    if (prioEl) {
      const map = { urgente: 'urgente', alta: 'alta', normal: 'normal' };
      const cls  = 'priority-badge--' + (map[os.prioridade] || 'normal');
      const lbl  = { urgente: '🔴 Urgente', alta: '🟠 Alta', normal: '⚪ Normal' }[os.prioridade] || 'Normal';
      prioEl.innerHTML = `<span class="priority-badge ${cls}">${lbl}</span>`;
    }
    set('det_problema', os.problema_relatado);

    document.getElementById('laudoTextarea').value         = os.laudo_tecnico        || '';
    document.getElementById('obsInternasTextarea').value   = os.observacoes_internas || '';
  }

  function renderStatus() {
    const sel = document.getElementById('statusSelect');
    sel.value = os.status;
    document.getElementById('statusBadgeEl').innerHTML = osStatusBadge(os.status);
  }

  function renderTimeline() {
    const hist = [...(os.historico_status || [])].reverse();
    document.getElementById('statusTimeline').innerHTML = hist.map(h => `
      <div class="os-timeline__item">
        <div class="os-timeline__dot"></div>
        <div class="os-timeline__content">
          <div class="os-timeline__status">${osStatusLabel(h.status)}</div>
          <div class="os-timeline__date">${formatDatetime(h.data)}</div>
          ${h.obs ? `<div class="os-timeline__obs">${h.obs}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderServicos() {
    const tbody = document.getElementById('servicosTableBody');
    const servicos = os.servicos_realizados || [];
    tbody.innerHTML = servicos.length
      ? servicos.map((s, i) => `
          <tr>
            <td>${s.descricao}</td>
            <td class="td-num">${formatCurrency(s.valor)}</td>
            <td class="td-action">
              <button class="btn-os-sm btn-os-sm--red del-servico" data-i="${i}" title="Remover">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </td>
          </tr>
        `).join('')
      : '<tr><td colspan="3" style="text-align:center;color:var(--gray-400);font-size:.83rem;padding:1rem;">Nenhum serviço registrado</td></tr>';

    tbody.querySelectorAll('.del-servico').forEach(btn => {
      btn.addEventListener('click', async () => {
        const arr = [...(os.servicos_realizados || [])];
        arr.splice(+btn.dataset.i, 1);
        await saveAndRecalc({ servicos_realizados: arr });
      });
    });
  }

  function renderPecas() {
    const tbody = document.getElementById('pecasTableBody');
    const pecas = os.pecas_utilizadas || [];
    tbody.innerHTML = pecas.length
      ? pecas.map((p, i) => `
          <tr>
            <td>${p.descricao}</td>
            <td class="td-num">${p.quantidade}</td>
            <td class="td-num">${formatCurrency(p.valor_unitario)}</td>
            <td class="td-num">${formatCurrency(p.valor_unitario * p.quantidade)}</td>
            <td class="td-action">
              <button class="btn-os-sm btn-os-sm--red del-peca" data-i="${i}" title="Remover">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);font-size:.83rem;padding:1rem;">Nenhuma peça registrada</td></tr>';

    tbody.querySelectorAll('.del-peca').forEach(btn => {
      btn.addEventListener('click', async () => {
        const arr = [...(os.pecas_utilizadas || [])];
        arr.splice(+btn.dataset.i, 1);
        await saveAndRecalc({ pecas_utilizadas: arr });
      });
    });
  }

  function calcTotals(osData) {
    const valorServicos = (osData.servicos_realizados || []).reduce((s, x) => s + (x.valor || 0), 0);
    const valorPecas    = (osData.pecas_utilizadas    || []).reduce((s, x) => s + (x.valor_unitario || 0) * (x.quantidade || 1), 0);
    const desconto      = parseFloat(osData.desconto) || 0;
    return {
      valor_servico: valorServicos,
      valor_pecas:   valorPecas,
      valor_total:   Math.max(0, valorServicos + valorPecas - desconto),
    };
  }

  async function saveAndRecalc(patch) {
    const merged = { ...os, ...patch };
    const totals = calcTotals(merged);
    try {
      await OSDB.update(osId, { ...patch, ...totals });
      await reload();
      toast('Salvo com sucesso.', 'success');
      return true;
    } catch (e) {
      toast('Não foi possível salvar: ' + e.message, 'error');
      return false;
    }
  }

  function renderFinancial() {
    const s = os.valor_servico || 0;
    const p = os.valor_pecas   || 0;
    const d = os.desconto      || 0;
    const t = os.valor_total   || 0;
    document.getElementById('financialSummary').innerHTML = `
      <div class="os-financial__row"><span>Serviços</span><span>${formatCurrency(s)}</span></div>
      <div class="os-financial__row"><span>Peças</span><span>${formatCurrency(p)}</span></div>
      ${d ? `<div class="os-financial__row"><span>Desconto</span><span style="color:#EF4444">-${formatCurrency(d)}</span></div>` : ''}
      <div class="os-financial__row"><span>Total</span><span>${formatCurrency(t)}</span></div>
    `;
    document.getElementById('descontoInput').value    = os.desconto        || 0;
    document.getElementById('formaPagamento').value   = os.forma_pagamento || '';
    document.getElementById('statusPagamento').value  = os.status_pagamento || 'pendente';
  }

  /* ── URL pública de consulta desta OS ── */
  function urlConsulta() {
    const base = location.href.replace(/painel|os-detalhes[^?#]*/i, 'consulta-os.html').split('?')[0];
    return base + '?os=' + encodeURIComponent(os.numero_os);
  }

  /* ── QR Code no comprovante ── */
  function gerarQrCode() {
    const container = document.getElementById('comp_qrcode');
    if (!container) return;
    container.innerHTML = '';
    if (typeof QRCode === 'undefined') return;
    new QRCode(container, {
      text:   urlConsulta(),
      width:  96,
      height: 96,
      colorDark:  '#0066FF',
      colorLight: '#ffffff',
    });
  }

  /* ── Comprovante (printed) ── */
  function renderComprovante() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    set('comp_numero',           os.numero_os);
    set('comp_data_entrada',     'Entrada: ' + formatDate(os.data_entrada));
    set('comp_cliente_nome',     os.cliente_nome);
    set('comp_cliente_cpf',      os.cliente_cpf);
    set('comp_cliente_telefone', os.cliente_telefone);
    set('comp_cliente_email',    os.cliente_email);
    set('comp_cliente_endereco', os.cliente_endereco);
    set('comp_aparelho',  `${os.aparelho_marca || ''} ${os.aparelho_modelo || ''}`.trim());
    set('comp_imei',      os.aparelho_imei);
    set('comp_cor',       os.aparelho_cor);
    set('comp_senha',     os.aparelho_senha);
    set('comp_acessorios', (os.acessorios || []).join(', ') || '—');
    set('comp_condicoes',  os.condicoes_visuais);
    set('comp_problema',   os.problema_relatado);
    set('comp_previsao',   os.previsao_entrega ? formatDate(os.previsao_entrega) : '—');
    set('comp_total',      formatCurrency(os.valor_total || 0));
    document.getElementById('comp_gerado_em').textContent = new Date().toLocaleString('pt-BR');
    gerarQrCode();

    const badge = document.getElementById('comp_status_badge');
    if (badge) badge.innerHTML = osStatusBadge(os.status);

    // Services + parts list
    const servicos = (os.servicos_realizados || []).map(s =>
      `<div style="display:flex;justify-content:space-between;font-size:9.5pt;padding:2pt 0;border-bottom:1px dotted #E2E8F0"><span>${s.descricao}</span><span>${formatCurrency(s.valor)}</span></div>`
    ).join('');
    const pecas = (os.pecas_utilizadas || []).map(p =>
      `<div style="display:flex;justify-content:space-between;font-size:9.5pt;padding:2pt 0;border-bottom:1px dotted #E2E8F0"><span>${p.descricao} ×${p.quantidade}</span><span>${formatCurrency(p.valor_unitario * p.quantidade)}</span></div>`
    ).join('');
    document.getElementById('comp_servicos_list').innerHTML = servicos + pecas || '<p style="font-size:9pt;color:#94A3B8">A definir</p>';

    const d = os.desconto || 0;
    document.getElementById('comp_financial').innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:9pt;padding:2pt 0"><span>Serviços:</span><span>${formatCurrency(os.valor_servico||0)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:9pt;padding:2pt 0"><span>Peças:</span><span>${formatCurrency(os.valor_pecas||0)}</span></div>
      ${d ? `<div style="display:flex;justify-content:space-between;font-size:9pt;padding:2pt 0"><span>Desconto:</span><span style="color:#EF4444">-${formatCurrency(d)}</span></div>` : ''}
    `;
  }

  /* ── Initial render ── */
  try {
    await reload();
  } catch (e) {
    toast('Erro ao carregar a OS: ' + e.message, 'error');
  }

  /* ── Status change ── */
  const statusSel = document.getElementById('statusSelect');
  statusSel.addEventListener('change', () => {
    document.getElementById('statusBadgeEl').innerHTML = osStatusBadge(statusSel.value);
  });
  document.getElementById('btnSaveStatus').addEventListener('click', async () => {
    const novoStatus = statusSel.value;
    const obs = document.getElementById('statusObs').value.trim();
    const btn = document.getElementById('btnSaveStatus');
    btn.disabled = true;
    try {
      await OSDB.setStatus(osId, novoStatus, obs);
      document.getElementById('statusObs').value = '';
      await reload();
      toast('Status atualizado.', 'success');
    } catch (e) {
      toast('Não foi possível atualizar o status: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Laudo save ── */
  document.getElementById('btnSaveLaudo').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveLaudo');
    btn.disabled = true;
    try {
      await OSDB.update(osId, { laudo_tecnico: document.getElementById('laudoTextarea').value.trim() });
      await reload();
      toast('Laudo salvo.', 'success');
    } catch (e) {
      toast('Não foi possível salvar o laudo: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Obs save ── */
  document.getElementById('btnSaveObs').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveObs');
    btn.disabled = true;
    try {
      await OSDB.update(osId, { observacoes_internas: document.getElementById('obsInternasTextarea').value.trim() });
      toast('Observações salvas.', 'success');
    } catch (e) {
      toast('Não foi possível salvar as observações: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Add serviço ── */
  document.getElementById('btnAddServico').addEventListener('click', () => {
    document.getElementById('addServicoRow').style.display = 'flex';
    document.getElementById('newServicoDesc').focus();
  });
  document.getElementById('cancelAddServico').addEventListener('click', () => {
    document.getElementById('addServicoRow').style.display = 'none';
  });
  document.getElementById('confirmAddServico').addEventListener('click', async () => {
    const desc  = document.getElementById('newServicoDesc').value.trim();
    const valor = parseFloat(document.getElementById('newServicoValor').value) || 0;
    if (!desc) { toast('Informe a descrição do serviço.', 'error'); return; }
    const arr = [...(os.servicos_realizados || []), { descricao: desc, valor }];
    if (!(await saveAndRecalc({ servicos_realizados: arr }))) return;
    document.getElementById('addServicoRow').style.display = 'none';
    document.getElementById('newServicoDesc').value  = '';
    document.getElementById('newServicoValor').value = '';
  });

  /* ── Add peça ── */
  document.getElementById('btnAddPeca').addEventListener('click', () => {
    document.getElementById('addPecaRow').style.display = 'flex';
    document.getElementById('newPecaDesc').focus();
  });
  document.getElementById('cancelAddPeca').addEventListener('click', () => {
    document.getElementById('addPecaRow').style.display = 'none';
  });
  document.getElementById('confirmAddPeca').addEventListener('click', async () => {
    const desc  = document.getElementById('newPecaDesc').value.trim();
    const qtd   = parseInt(document.getElementById('newPecaQtd').value) || 1;
    const valor = parseFloat(document.getElementById('newPecaValor').value) || 0;
    if (!desc) { toast('Informe a descrição da peça.', 'error'); return; }
    const arr = [...(os.pecas_utilizadas || []), { descricao: desc, quantidade: qtd, valor_unitario: valor }];
    if (!(await saveAndRecalc({ pecas_utilizadas: arr }))) return;
    document.getElementById('addPecaRow').style.display = 'none';
    document.getElementById('newPecaDesc').value  = '';
    document.getElementById('newPecaQtd').value   = '1';
    document.getElementById('newPecaValor').value = '';
  });

  /* ── Financial save ── */
  document.getElementById('btnSaveFinancial').addEventListener('click', async () => {
    const desconto       = parseFloat(document.getElementById('descontoInput').value) || 0;
    const formaPagamento = document.getElementById('formaPagamento').value;
    const statusPagamento = document.getElementById('statusPagamento').value;
    const patch = { forma_pagamento: formaPagamento, status_pagamento: statusPagamento, desconto };
    const merged = { ...os, ...patch };
    const totals = calcTotals(merged);
    const btn = document.getElementById('btnSaveFinancial');
    btn.disabled = true;
    try {
      await OSDB.update(osId, { ...patch, ...totals });
      await reload();
      toast('Dados financeiros salvos.', 'success');
    } catch (e) {
      toast('Não foi possível salvar os dados financeiros: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Action buttons ── */
  document.getElementById('btnEdit').addEventListener('click', () => {
    window.location.href = 'os-form.html?id=' + osId;
  });

  document.getElementById('btnWa').addEventListener('click', () => {
    const tel = (os.cliente_telefone || '').replace(/\D/g, '');
    if (!tel) { toast('Telefone do cliente não informado.', 'error'); return; }
    const lines = [
      `Olá *${os.cliente_nome}*! Aqui é a *Planeta Celular*.`,
      '',
      `📱 Aparelho: ${os.aparelho_marca} ${os.aparelho_modelo}`,
      `🔧 OS: *${os.numero_os}*`,
      `📋 Status: *${osStatusLabel(os.status)}*`,
    ];
    if (os.previsao_entrega) lines.push(`📅 Previsão de entrega: ${formatDate(os.previsao_entrega)}`);
    if (os.valor_total)      lines.push(`💰 Valor: *${formatCurrency(os.valor_total)}*`);
    lines.push('', 'Qualquer dúvida, estamos à disposição!');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  document.getElementById('btnPrint').addEventListener('click', () => {
    renderComprovante();
    window.print();
  });

  document.getElementById('btnDelete').addEventListener('click', async () => {
    if (!confirm(`Excluir a OS ${os.numero_os}? Esta ação não pode ser desfeita.`)) return;
    const btn = document.getElementById('btnDelete');
    btn.disabled = true;
    try {
      await OSDB.delete(osId);
      window.location.href = 'os-lista.html';
    } catch (e) {
      toast('Não foi possível excluir a OS: ' + e.message, 'error');
      btn.disabled = false;
    }
  });
});
