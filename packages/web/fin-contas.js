/* ============================================================
   PLANETA CELULAR — fin-contas.js
   Contas a Receber e Contas a Pagar (página unificada com tabs)
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

  let toastTimer;
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  /* ── Tab state ── */
  let currentTipo = new URLSearchParams(location.search).get('tipo') || 'receber';
  const filterState = { search: '', cat: '', situacao: 'todos' };

  /* ── Tab styling ── */
  const TAB_ACTIVE = 'border-bottom:3px solid var(--primary) !important;color:var(--primary) !important;background:var(--primary-light,#E8F0FF);';
  const TAB_IDLE   = 'border-bottom:3px solid transparent;color:var(--gray-500);background:none;';

  async function setTab(tipo) {
    currentTipo = tipo;
    document.getElementById('tabReceber').setAttribute('style', (tipo === 'receber' ? TAB_ACTIVE : TAB_IDLE));
    document.getElementById('tabPagar').setAttribute('style',   (tipo === 'pagar'   ? TAB_ACTIVE : TAB_IDLE));
    document.getElementById('topbarTitle').textContent = tipo === 'receber' ? 'Contas a Receber' : 'Contas a Pagar';

    // Atualiza sidebar active
    document.getElementById('linkReceber').classList.toggle('active', tipo === 'receber');
    document.getElementById('linkPagar').classList.toggle('active',   tipo === 'pagar');

    await Promise.all([populateCatFilter(), renderTable(), renderKpi()]);
  }

  document.getElementById('tabReceber').addEventListener('click', () => setTab('receber'));
  document.getElementById('tabPagar').addEventListener('click',   () => setTab('pagar'));

  /* ── Categorias no filtro ── */
  async function populateCatFilter() {
    const tipo = currentTipo === 'receber' ? 'receita' : 'despesa';
    const sel  = document.getElementById('contasCatFilter');
    sel.innerHTML = '<option value="">Todas as categorias</option>';
    (await FinDB.getCategories(tipo)).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
  }

  /* ── KPI ── */
  async function renderKpi() {
    const tipo = currentTipo === 'receber' ? 'receita' : 'despesa';
    const all  = await FinDB.getPendentes(tipo);
    const hoje = new Date().toISOString().slice(0, 10);
    const venc = all.filter(t => t.data_vencimento && t.data_vencimento < hoje);
    const prox = all.filter(t => {
      if (!t.data_vencimento) return false;
      const d = (new Date(t.data_vencimento) - new Date()) / 86400000;
      return d >= 0 && d <= 7;
    });

    const totalPend = all.reduce((s, t) => s + t.valor, 0);
    const totalVenc = venc.reduce((s, t) => s + t.valor, 0);

    const verde = currentTipo === 'receber' ? 'fin-kpi--green' : 'fin-kpi--red';

    document.getElementById('contasKpi').innerHTML = `
      <div class="fin-kpi ${verde}">
        <div class="fin-kpi__label"><i class="fa-solid fa-hourglass-half"></i> Total Pendente</div>
        <div class="fin-kpi__value">${formatCurrency(totalPend)}</div>
        <div class="fin-kpi__sub">${all.length} lançamento(s)</div>
      </div>
      <div class="fin-kpi fin-kpi--red">
        <div class="fin-kpi__label"><i class="fa-solid fa-triangle-exclamation"></i> Vencidos</div>
        <div class="fin-kpi__value">${formatCurrency(totalVenc)}</div>
        <div class="fin-kpi__sub">${venc.length} lançamento(s)</div>
      </div>
      <div class="fin-kpi fin-kpi--orange">
        <div class="fin-kpi__label"><i class="fa-solid fa-clock"></i> Vencem em 7 dias</div>
        <div class="fin-kpi__value">${formatCurrency(prox.reduce((s, t) => s + t.valor, 0))}</div>
        <div class="fin-kpi__sub">${prox.length} lançamento(s)</div>
      </div>
    `;
  }

  /* ── Table ── */
  async function renderTable() {
    const tipo  = currentTipo === 'receber' ? 'receita' : 'despesa';
    const hoje  = new Date().toISOString().slice(0, 10);
    const prox3 = new Date(); prox3.setDate(prox3.getDate() + 3);
    const prox3Str = prox3.toISOString().slice(0, 10);

    let [list, cats] = await Promise.all([FinDB.getPendentes(tipo), FinDB.getCategories()]);
    const catById = new Map(cats.map(c => [c.id, c]));

    if (filterState.cat) list = list.filter(t => t.categoria_id === filterState.cat);

    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      list = list.filter(t => t.descricao?.toLowerCase().includes(q) || t.observacao?.toLowerCase().includes(q));
    }

    if (filterState.situacao === 'vencido') {
      list = list.filter(t => t.data_vencimento && t.data_vencimento < hoje);
    } else if (filterState.situacao === 'hoje') {
      list = list.filter(t => t.data_vencimento === hoje);
    } else if (filterState.situacao === 'semana') {
      list = list.filter(t => t.data_vencimento && t.data_vencimento >= hoje && t.data_vencimento <= prox3Str);
    }

    list.sort((a, b) => {
      if (!a.data_vencimento) return 1;
      if (!b.data_vencimento) return -1;
      return a.data_vencimento.localeCompare(b.data_vencimento);
    });

    const tbody = document.getElementById('contasTableBody');
    const empty = document.getElementById('contasEmpty');
    tbody.innerHTML = '';
    empty.hidden = list.length > 0;

    list.forEach(t => {
      const cat    = catById.get(t.categoria_id);
      const dias   = t.data_vencimento ? diasEmAberto(t.data_vencimento) : null;
      const vencido = t.data_vencimento && t.data_vencimento < hoje;
      const alertCls = vencAlertCls(t.data_vencimento);

      let diasBadge = '';
      if (dias !== null && dias > 0) {
        diasBadge = `<span class="dias-badge dias-badge--red"><i class="fa-solid fa-triangle-exclamation"></i> ${dias}d atraso</span>`;
      } else if (dias !== null && dias === 0) {
        diasBadge = `<span class="dias-badge dias-badge--yellow">Hoje</span>`;
      } else if (t.data_vencimento) {
        const falta = Math.ceil((new Date(t.data_vencimento) - new Date()) / 86400000);
        if (falta <= 3) diasBadge = `<span class="dias-badge dias-badge--orange">em ${falta}d</span>`;
        else diasBadge = `<span class="dias-badge dias-badge--gray">em ${falta}d</span>`;
      }

      const tr = document.createElement('tr');
      if (vencido) tr.classList.add('contas-alert-row', 'vencido');
      else if (alertCls === 'venc--orange') tr.classList.add('contas-alert-row');

      tr.innerHTML = `
        <td class="td-name">
          ${t.descricao}
          ${t.observacao ? `<small>${t.observacao}</small>` : ''}
        </td>
        <td><span class="badge badge--gray" style="font-size:.72rem;">${cat?.nome || '—'}</span></td>
        <td class="${tipo === 'receita' ? 'td-valor-pos' : 'td-valor-neg'}">${formatCurrency(t.valor)}</td>
        <td class="${alertCls}" style="font-size:.82rem;">
          ${t.data_vencimento ? formatDate(t.data_vencimento) : '<span style="color:var(--gray-400)">—</span>'}
        </td>
        <td>${diasBadge || '<span style="color:var(--gray-400)">—</span>'}</td>
        <td style="font-size:.78rem;color:var(--gray-500);">
          ${t.origem === 'os' ? `<a href="os-detalhes.html?id=${t.origem_id}" style="color:var(--primary);font-weight:600;font-size:.78rem;"><i class="fa-solid fa-screwdriver-wrench"></i> OS</a>` : (t.origem === 'sale' || t.origem === 'venda_produto' ? '<i class="fa-solid fa-box"></i> Venda' : 'Manual')}
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn pagar-btn" data-id="${t.id}" data-valor="${t.valor}" data-desc="${encodeURIComponent(t.descricao)}" title="Registrar pagamento" style="color:#16A34A;">
              <i class="fa-solid fa-circle-check"></i>
            </button>
            <a class="action-btn" href="fin-lancamentos.html" title="Editar" onclick="sessionStorage.setItem('editTxId','${t.id}');return true;">
              <i class="fa-solid fa-pen"></i>
            </a>
            <button class="action-btn action-btn--danger cancel-btn" data-id="${t.id}" title="Cancelar">
              <i class="fa-solid fa-ban"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos
    tbody.querySelectorAll('.pagar-btn').forEach(btn => {
      btn.addEventListener('click', () => openPgtoModal(btn.dataset.id, decodeURIComponent(btn.dataset.desc), parseFloat(btn.dataset.valor)));
    });
    tbody.querySelectorAll('.cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancelar este lançamento?')) return;
        await FinDB.update(btn.dataset.id, { status: 'cancelado' });
        renderTable();
        renderKpi();
        toast('Lançamento cancelado.', 'success');
      });
    });
  }

  /* ── Filter bindings ── */
  document.getElementById('contasSearch').addEventListener('input', function () { filterState.search = this.value.trim().toLowerCase(); renderTable(); });
  document.getElementById('contasCatFilter').addEventListener('change', function () { filterState.cat = this.value; renderTable(); });
  document.getElementById('contasSituacao').addEventListener('change', function () { filterState.situacao = this.value; renderTable(); });

  /* ════════════════════════════════════
     MODAL DE PAGAMENTO
  ════════════════════════════════════ */
  function openPgtoModal(id, desc, valor) {
    document.getElementById('pgtoTxId').value = id;
    document.getElementById('pgtoInfo').innerHTML = `
      <strong>${desc}</strong><br/>
      <span style="color:var(--gray-500);font-size:.82rem;">Valor total: <strong>${formatCurrency(valor)}</strong></span>
    `;
    document.getElementById('pgtoValor').value = '';
    document.getElementById('pgtoForma').value = 'pix';
    document.getElementById('pgtoObs').value   = '';
    document.getElementById('pgtoModal').hidden = false;
  }

  function closePgtoModal() { document.getElementById('pgtoModal').hidden = true; }
  document.getElementById('pgtoModalClose').addEventListener('click', closePgtoModal);
  document.getElementById('pgtoCancel').addEventListener('click', closePgtoModal);
  document.getElementById('pgtoModal').addEventListener('click', e => {
    if (e.target === document.getElementById('pgtoModal')) closePgtoModal();
  });

  document.getElementById('pgtoConfirm').addEventListener('click', async () => {
    const id    = document.getElementById('pgtoTxId').value;
    const forma = document.getElementById('pgtoForma').value;
    await FinDB.registrarPagamento(id, forma);
    closePgtoModal();
    renderTable();
    renderKpi();
    toast('Pagamento registrado com sucesso.', 'success');
  });

  /* ── Helpers ── */
  function formatDate(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }

  /* ── Init ── */
  await setTab(currentTipo);
});
