/* ============================================================
   PLANETA CELULAR — fin-lancamentos.js
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  AuthDB.requireAdmin();

  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !document.getElementById('sidebarToggle').contains(e.target))
      sidebar.classList.remove('open');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => { AuthDB.logout(); window.location.href = 'admin.html'; });

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

  /* ── Filtros ── */
  const state = { search: '', tipo: '', cat: '', status: '', pgto: '', periodo: '' };
  let txPage = 1;
  const TX_PAGE_SIZE = 20;

  /* ── Preenche filtro de categorias ── */
  async function populateCatFilter() {
    const sel = document.getElementById('filterCat');
    (await FinDB.getCategories()).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  }

  /* ── Render table ── */
  async function renderTable() {
    const f = buildFilter();
    const [totalsList, res, cats] = await Promise.all([
      FinDB._filter(f),
      FinDB.getPage({ ...f, page: txPage, limit: TX_PAGE_SIZE }),
      FinDB.getCategories(),
    ]);
    const list = res.data;
    const catById = new Map(cats.map(c => [c.id, c]));
    const tbody = document.getElementById('txTableBody');
    const empty = document.getElementById('txEmpty');
    tbody.innerHTML = '';
    empty.hidden = list.length > 0;
    renderPaginationControls(document.getElementById('txPagination'), res, newPage => {
      txPage = newPage;
      renderTable();
    });

    // Totalizadores (considerando todos os lançamentos filtrados, não só a página atual)
    const totalRec = totalsList.filter(t => t.tipo === 'receita' && t.status !== 'cancelado').reduce((s, t) => s + t.valor, 0);
    const totalDep = totalsList.filter(t => t.tipo === 'despesa' && t.status !== 'cancelado').reduce((s, t) => s + t.valor, 0);
    document.getElementById('txTotals').innerHTML = `
      <span style="background:#DCFCE7;color:#15803D;padding:.3rem .85rem;border-radius:100px;font-size:.82rem;font-weight:700;">
        <i class="fa-solid fa-arrow-trend-up"></i> Receitas: ${formatCurrency(totalRec)}
      </span>
      <span style="background:#FEE2E2;color:#B91C1C;padding:.3rem .85rem;border-radius:100px;font-size:.82rem;font-weight:700;">
        <i class="fa-solid fa-arrow-trend-down"></i> Despesas: ${formatCurrency(totalDep)}
      </span>
      <span style="background:#DBEAFE;color:#1D4ED8;padding:.3rem .85rem;border-radius:100px;font-size:.82rem;font-weight:700;">
        Saldo: ${formatCurrency(totalRec - totalDep)}
      </span>
      <span style="color:var(--gray-400);font-size:.8rem;padding:.3rem 0;">${res.total} lançamento(s)</span>
    `;

    list.forEach(t => {
      const cat   = catById.get(t.categoria_id);
      const isRec = t.tipo === 'receita';
      const tr    = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:.82rem;color:var(--gray-600);white-space:nowrap;">${formatDate(t.data_transacao)}</td>
        <td class="td-name td-desc">
          ${t.descricao}
          ${t.observacao ? `<small>${t.observacao}</small>` : ''}
          ${t.origem !== 'manual' ? `<small style="color:var(--primary)"><i class="fa-solid fa-link" style="font-size:.65rem;"></i> ${origemLabel(t.origem)}</small>` : ''}
        </td>
        <td><span class="badge badge--gray" style="font-size:.72rem;">${cat?.nome || '—'}</span></td>
        <td>${finTipoBadge(t.tipo)}</td>
        <td class="${isRec ? 'td-valor-pos' : 'td-valor-neg'}">${isRec ? '+' : '-'}${formatCurrency(t.valor)}</td>
        <td>${finStatusBadge(t.status)}</td>
        <td style="font-size:.8rem;color:var(--gray-600);">${finPgtoLabel(t.forma_pagamento)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-tx" data-id="${t.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            ${t.status === 'pendente' ? `<button class="action-btn pagar-tx" data-id="${t.id}" title="Marcar como pago" style="color:#16A34A;"><i class="fa-solid fa-circle-check"></i></button>` : ''}
            <button class="action-btn action-btn--danger del-tx" data-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos
    tbody.querySelectorAll('.edit-tx').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
    tbody.querySelectorAll('.pagar-tx').forEach(btn => {
      btn.addEventListener('click', async () => {
        await FinDB.update(btn.dataset.id, { status: 'pago', data_transacao: new Date().toISOString().slice(0, 10) });
        renderTable();
        toast('Lançamento marcado como pago.', 'success');
      });
    });
    tbody.querySelectorAll('.del-tx').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este lançamento?')) return;
        await FinDB.delete(btn.dataset.id);
        renderTable();
        toast('Lançamento excluído.', 'success');
      });
    });
  }

  function buildFilter() {
    const f = {};
    if (state.search)  f.search = state.search;
    if (state.tipo)    f.tipo   = state.tipo;
    if (state.cat)     f.categoria_id = state.cat;
    if (state.status)  f.status = state.status;
    if (state.pgto)    f.forma_pagamento = state.pgto;

    const now = new Date();
    if (state.periodo === 'hoje') {
      const d = now.toISOString().slice(0, 10);
      f.start = d; f.end = d;
    } else if (state.periodo === 'semana') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      f.start = start.toISOString().slice(0, 10);
      f.end   = now.toISOString().slice(0, 10);
    } else if (state.periodo === 'mes') {
      f.start = primeiroDia(now.getFullYear(), now.getMonth() + 1);
      f.end   = ultimoDia(now.getFullYear(), now.getMonth() + 1);
    } else if (state.periodo === 'mes_ant') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      f.start = primeiroDia(d.getFullYear(), d.getMonth() + 1);
      f.end   = ultimoDia(d.getFullYear(), d.getMonth() + 1);
    }
    return f;
  }

  /* ── Filter bindings ── */
  document.getElementById('txSearch').addEventListener('input', debounce(e => { state.search = e.target.value.trim(); txPage = 1; renderTable(); }));
  document.getElementById('filterTipo').addEventListener('change', function () { state.tipo = this.value; txPage = 1; renderTable(); });
  document.getElementById('filterCat').addEventListener('change', function () { state.cat = this.value; txPage = 1; renderTable(); });
  document.getElementById('filterStatus').addEventListener('change', function () { state.status = this.value; txPage = 1; renderTable(); });
  document.getElementById('filterPgto').addEventListener('change', function () { state.pgto = this.value; txPage = 1; renderTable(); });
  document.getElementById('filterPeriodo').addEventListener('change', function () { state.periodo = this.value; txPage = 1; renderTable(); });

  /* ── CSV Export ── */
  document.getElementById('btnExportCSV').addEventListener('click', async () => {
    await FinDB.exportCSV(await FinDB._filter(buildFilter()));
    toast('CSV exportado com sucesso.', 'success');
  });

  /* ════════════════════════════════════
     MODAL
  ════════════════════════════════════ */
  let currentTipo = 'receita';

  async function setTipo(tipo) {
    currentTipo = tipo;
    document.getElementById('btnTipoReceita').classList.toggle('active', tipo === 'receita');
    document.getElementById('btnTipoDespesa').classList.toggle('active', tipo === 'despesa');
    await populateCatSelect(tipo);
  }

  async function populateCatSelect(tipo) {
    const sel = document.getElementById('txCat');
    sel.innerHTML = '<option value="">Selecione...</option>';
    (await FinDB.getCategories(tipo)).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  }

  async function openModal(editId = null) {
    document.getElementById('txEditId').value = editId || '';
    document.getElementById('txModalTitle').textContent = editId ? 'Editar Lançamento' : 'Novo Lançamento';
    clearModalErrors();

    if (editId) {
      const tx = await FinDB.getById(editId);
      if (!tx) return;
      await setTipo(tx.tipo);
      document.getElementById('txDesc').value      = tx.descricao       || '';
      document.getElementById('txCat').value       = tx.categoria_id    || '';
      document.getElementById('txValor').value     = tx.valor           || '';
      document.getElementById('txData').value      = tx.data_transacao  || '';
      document.getElementById('txVencimento').value= tx.data_vencimento || '';
      document.getElementById('txStatus').value    = tx.status          || 'pendente';
      document.getElementById('txPgto').value      = tx.forma_pagamento || '';
      document.getElementById('txObs').value       = tx.observacao      || '';
      document.getElementById('tipoToggle').style.pointerEvents = 'none';
      document.getElementById('tipoToggle').style.opacity = '.5';
    } else {
      const tipo = new URLSearchParams(location.search).get('tipo') || 'receita';
      await setTipo(tipo === 'despesa' ? 'despesa' : 'receita');
      document.getElementById('txDesc').value       = '';
      document.getElementById('txValor').value      = '';
      document.getElementById('txData').value       = new Date().toISOString().slice(0, 10);
      document.getElementById('txVencimento').value = '';
      document.getElementById('txStatus').value     = 'pendente';
      document.getElementById('txPgto').value       = '';
      document.getElementById('txObs').value        = '';
      document.getElementById('tipoToggle').style.pointerEvents = '';
      document.getElementById('tipoToggle').style.opacity = '';
    }

    document.getElementById('txModal').hidden = false;
  }

  function closeModal() { document.getElementById('txModal').hidden = true; }

  function clearModalErrors() {
    ['TxDesc','TxCat','TxValor'].forEach(f => {
      const el = document.getElementById('err' + f);
      if (el) el.textContent = '';
    });
  }

  function validateModal() {
    clearModalErrors();
    let ok = true;
    if (!document.getElementById('txDesc').value.trim()) {
      document.getElementById('errTxDesc').textContent = 'Descrição obrigatória.'; ok = false;
    }
    if (!document.getElementById('txCat').value) {
      document.getElementById('errTxCat').textContent = 'Selecione uma categoria.'; ok = false;
    }
    const val = parseFloat(document.getElementById('txValor').value);
    if (isNaN(val) || val <= 0) {
      document.getElementById('errTxValor').textContent = 'Valor inválido.'; ok = false;
    }
    return ok;
  }

  document.getElementById('btnTipoReceita').addEventListener('click', () => setTipo('receita'));
  document.getElementById('btnTipoDespesa').addEventListener('click', () => setTipo('despesa'));
  document.getElementById('btnNovaReceita').addEventListener('click', () => { location.search = '?tipo=receita'; openModal(); });
  document.getElementById('btnNovaDespesa').addEventListener('click', () => { location.search = '?tipo=despesa'; openModal(); });

  document.getElementById('btnNovaReceita').addEventListener('click', () => {
    history.replaceState(null, '', '?tipo=receita');
    openModal();
  });
  document.getElementById('btnNovaDespesa').addEventListener('click', () => {
    history.replaceState(null, '', '?tipo=despesa');
    openModal();
  });

  document.getElementById('txModalClose').addEventListener('click', closeModal);
  document.getElementById('txModalCancel').addEventListener('click', closeModal);
  document.getElementById('txModal').addEventListener('click', e => {
    if (e.target === document.getElementById('txModal')) closeModal();
  });

  document.getElementById('txModalSave').addEventListener('click', async () => {
    if (!validateModal()) return;
    const data = {
      tipo:            currentTipo,
      categoria_id:    document.getElementById('txCat').value,
      descricao:       document.getElementById('txDesc').value.trim(),
      valor:           parseFloat(document.getElementById('txValor').value),
      data_transacao:  document.getElementById('txData').value,
      data_vencimento: document.getElementById('txVencimento').value || null,
      status:          document.getElementById('txStatus').value,
      forma_pagamento: document.getElementById('txPgto').value,
      observacao:      document.getElementById('txObs').value.trim(),
    };
    const editId = document.getElementById('txEditId').value;
    try {
      if (editId) {
        await FinDB.update(editId, data);
        toast('Lançamento atualizado.', 'success');
      } else {
        await FinDB.add(data);
        toast('Lançamento criado com sucesso.', 'success');
      }
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    closeModal();
    renderTable();
  });

  /* ── Auto-abrir modal se ?novo=1 ou editTxId no sessionStorage ── */
  const params = new URLSearchParams(location.search);
  if (params.get('novo')) {
    openModal();
  } else {
    const editTxId = sessionStorage.getItem('editTxId');
    if (editTxId) {
      sessionStorage.removeItem('editTxId');
      openModal(editTxId);
    }
  }

  /* ── Helpers ── */
  function formatDate(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
  function origemLabel(o) { return { os: 'OS', sale: 'Venda', venda_produto: 'Venda' }[o] || o; }

  /* ── Init ── */
  await populateCatFilter();
  await renderTable();
});
