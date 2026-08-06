/* ============================================================
   PLANETA CELULAR — os-lista.js
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

  /* ── Filter state ── */
  const state = { search: '', status: '', tecnico: '', periodo: '' };
  let osPage = 1;
  const OS_PAGE_SIZE = 20;

  /* ── Stats ── */
  async function renderStats() {
    const s = await OSDB.getStats();
    const cards = [
      { icon: 'fa-folder-open',  label: 'Em Aberto',        value: s.abertas,          color: '#3B82F6', bg: '#EFF6FF' },
      { icon: 'fa-screwdriver-wrench', label: 'Em Reparo',  value: s.em_reparo,        color: '#8B5CF6', bg: '#F5F3FF' },
      { icon: 'fa-box',          label: 'Ag. Peça',         value: s.aguardando_peca,  color: '#F97316', bg: '#FFF7ED' },
      { icon: 'fa-triangle-exclamation', label: 'Vencidas', value: s.vencidas,         color: '#EF4444', bg: '#FEF2F2' },
      { icon: 'fa-circle-check', label: 'Prontas',          value: s.prontas,          color: '#22C55E', bg: '#F0FDF4' },
      { icon: 'fa-dollar-sign',  label: 'Fat. Mês',         value: formatCurrency(s.faturamento_mes), color: '#0066FF', bg: '#EFF6FF' },
    ];
    document.getElementById('osStatsGrid').innerHTML = cards.map(c => `
      <div class="os-stat">
        <div class="os-stat__icon" style="background:${c.bg};color:${c.color}">
          <i class="fa-solid ${c.icon}"></i>
        </div>
        <div>
          <div class="os-stat__value" style="color:${c.color}">${c.value}</div>
          <div class="os-stat__label">${c.label}</div>
        </div>
      </div>
    `).join('');
  }

  /* ── Populate technician filter ── */
  async function populateTecnicoFilter() {
    const all = await OSDB.getAll();
    const tecnicos = [...new Set(all.map(o => o.tecnico).filter(Boolean))];
    const sel = document.getElementById('filterTecnico');
    tecnicos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      sel.appendChild(opt);
    });
  }

  /* ── Render table ── */
  async function renderTable() {
    const res = await OSDB.getPage({
      page: osPage,
      limit: OS_PAGE_SIZE,
      search: state.search,
      status: state.status,
      tecnico: state.tecnico,
      periodo: state.periodo,
    });
    const list = res.data;

    const tbody = document.getElementById('osTableBody');
    const empty = document.getElementById('osEmpty');
    tbody.innerHTML = '';
    empty.hidden = list.length > 0;
    renderPaginationControls(document.getElementById('osPagination'), res, newPage => {
      osPage = newPage;
      renderTable();
    });

    list.forEach(os => {
      const vencida = isVencida(os);
      const prioMap  = { urgente: 'urgente', alta: 'alta', normal: 'normal' };
      const prioCls  = 'priority-badge--' + (prioMap[os.prioridade] || 'normal');
      const prioLbl  = { urgente: '🔴 Urgente', alta: '🟠 Alta', normal: 'Normal' }[os.prioridade] || 'Normal';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="os-number">${os.numero_os}</div>
          <small style="font-size:.72rem;color:var(--gray-400)">${os.id.slice(-6)}</small>
        </td>
        <td class="td-name">
          ${os.cliente_nome || '—'}
          <small>${os.cliente_telefone || ''}</small>
        </td>
        <td class="td-name">
          ${os.aparelho_marca ? `<strong>${os.aparelho_marca}</strong> ` : ''}${os.aparelho_modelo || '—'}
          <small>${os.aparelho_imei ? 'IMEI: ' + os.aparelho_imei : ''}</small>
        </td>
        <td>${os.tecnico || '<span style="color:var(--gray-400)">—</span>'}</td>
        <td style="font-size:.8rem;color:var(--gray-600)">${formatDate(os.data_entrada)}</td>
        <td class="${vencida ? 'os-vencida' : ''}" style="font-size:.8rem;">
          ${os.previsao_entrega ? formatDate(os.previsao_entrega) + (vencida ? ' ⚠️' : '') : '—'}
        </td>
        <td>${osStatusBadge(os.status)}</td>
        <td>
          <div class="action-btns">
            <a class="action-btn" href="os-detalhes.html?id=${os.id}" title="Ver detalhes">
              <i class="fa-solid fa-eye"></i>
            </a>
            <a class="action-btn" href="os-form.html?id=${os.id}" title="Editar">
              <i class="fa-solid fa-pen"></i>
            </a>
            <button class="action-btn action-btn--danger delete-os-btn" data-id="${os.id}" title="Excluir">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Delete buttons
    tbody.querySelectorAll('.delete-os-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir esta OS? Esta ação não pode ser desfeita.')) return;
        await OSDB.delete(btn.dataset.id);
        renderStats();
        renderTable();
        toast('OS excluída com sucesso.', 'success');
      });
    });
  }

  /* ── Filter bindings ── */
  document.getElementById('osSearch').addEventListener('input', debounce(e => {
    state.search = e.target.value.trim();
    osPage = 1;
    renderTable();
  }));
  document.getElementById('filterStatus').addEventListener('change', function () {
    state.status = this.value;
    osPage = 1;
    renderTable();
  });
  document.getElementById('filterTecnico').addEventListener('change', function () {
    state.tecnico = this.value;
    osPage = 1;
    renderTable();
  });
  document.getElementById('filterPeriodo').addEventListener('change', function () {
    state.periodo = this.value;
    osPage = 1;
    renderTable();
  });

  /* ── Init ── */
  renderStats();
  populateTecnicoFilter();
  await renderTable();
});
