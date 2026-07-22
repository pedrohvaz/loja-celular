/* ============================================================
   PLANETA CELULAR — fin-caixa.js
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  AuthDB.requireAuth();

  /* ── Oculta menu Financeiro para funcionário ── */
  if (!AuthDB.isAdmin()) {
    const finNav = document.getElementById('financeiroNav');
    if (finNav) finNav.style.display = 'none';
  }
  const userNomeEl = document.getElementById('topbarUserName');
  if (userNomeEl) userNomeEl.textContent = AuthDB.getNome();

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

  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
  function formatDate(iso)    { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
  function formatDateTime(iso){ return iso ? new Date(iso).toLocaleString('pt-BR') : '—'; }

  /* ════════════════════════════════════
     STATUS CARD
  ════════════════════════════════════ */
  async function renderCaixaStatus() {
    const aberto = await FinDB.getCaixaAberto();
    const card   = document.getElementById('caixaStatusCard');

    if (aberto) {
      const duracao = Math.floor((Date.now() - new Date(aberto.abertura_em).getTime()) / 60000);
      const horas   = Math.floor(duracao / 60);
      const mins    = duracao % 60;
      card.innerHTML = `
        <div class="caixa-status-indicator caixa-status-indicator--open">
          <i class="fa-solid fa-lock-open"></i>
        </div>
        <div class="caixa-status-info">
          <div class="caixa-status-title">Caixa Aberto</div>
          <div class="caixa-status-sub">
            Aberto em ${formatDateTime(aberto.abertura_em)}
            ${aberto.observacao ? ` · ${aberto.observacao}` : ''}
          </div>
          <div class="caixa-status-sub" style="margin-top:.2rem;color:var(--primary);">
            <i class="fa-solid fa-clock"></i> Aberto há ${horas > 0 ? horas + 'h ' : ''}${mins}min
            · Saldo inicial: ${formatCurrency(aberto.saldo_abertura)}
          </div>
        </div>
      `;
      document.getElementById('caixaAbertoSection').style.display = '';
    } else {
      card.innerHTML = `
        <div class="caixa-status-indicator caixa-status-indicator--closed">
          <i class="fa-solid fa-lock"></i>
        </div>
        <div class="caixa-status-info">
          <div class="caixa-status-title">Caixa Fechado</div>
          <div class="caixa-status-sub">Nenhum caixa aberto no momento</div>
        </div>
        <button class="btn-primary" id="btnAbrirCaixa" style="margin-left:auto;display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.25rem;border-radius:8px;font-weight:700;border:none;cursor:pointer;background:#16A34A;color:#fff;font-size:.88rem;">
          <i class="fa-solid fa-lock-open"></i> Abrir Caixa
        </button>
      `;
      document.getElementById('caixaAbertoSection').style.display = 'none';
      document.getElementById('btnAbrirCaixa')?.addEventListener('click', openAbrirModal);
    }
  }

  /* ════════════════════════════════════
     RESUMO E MOVIMENTAÇÕES DO CAIXA ABERTO
  ════════════════════════════════════ */
  async function renderCaixaSummary() {
    const aberto = await FinDB.getCaixaAberto();
    if (!aberto) return;

    const hoje  = new Date().toISOString().slice(0, 10);
    const allTx = await FinDB.getAll();
    const txHoje = allTx.filter(t => t.data_transacao === hoje && t.status !== 'cancelado');
    const txDinheiro = txHoje.filter(t => t.forma_pagamento === 'dinheiro');

    const entradas  = txDinheiro.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const saidas    = txDinheiro.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    const esperado  = aberto.saldo_abertura + entradas - saidas;

    const totalRec = txHoje.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const totalDep = txHoje.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);

    document.getElementById('caixaSummary').innerHTML = `
      <div class="caixa-aberto-item">
        <span class="caixa-aberto-item__label"><i class="fa-solid fa-coins" style="color:#16A34A;"></i> Saldo inicial</span>
        <span class="caixa-aberto-item__value" style="color:var(--gray-700);">${formatCurrency(aberto.saldo_abertura)}</span>
      </div>
      <div class="caixa-aberto-item">
        <span class="caixa-aberto-item__label"><i class="fa-solid fa-arrow-down" style="color:#16A34A;"></i> Entradas (dinheiro)</span>
        <span class="caixa-aberto-item__value" style="color:#15803D;">${formatCurrency(entradas)}</span>
      </div>
      <div class="caixa-aberto-item">
        <span class="caixa-aberto-item__label"><i class="fa-solid fa-arrow-up" style="color:#DC2626;"></i> Saídas (dinheiro)</span>
        <span class="caixa-aberto-item__value" style="color:#B91C1C;">${formatCurrency(saidas)}</span>
      </div>
      <div class="caixa-aberto-item" style="border-top:2px solid var(--gray-200);margin-top:.5rem;padding-top:.75rem;">
        <span class="caixa-aberto-item__label" style="font-weight:700;"><i class="fa-solid fa-wallet" style="color:var(--primary);"></i> Saldo esperado em caixa</span>
        <span class="caixa-aberto-item__value" style="color:var(--primary);font-size:1.1rem;font-weight:800;">${formatCurrency(esperado)}</span>
      </div>
      <div class="caixa-aberto-item" style="border-top:1px solid var(--gray-200);margin-top:.5rem;padding-top:.75rem;">
        <span class="caixa-aberto-item__label" style="color:var(--gray-500);"><i class="fa-solid fa-chart-bar"></i> Receitas do dia (todas as formas)</span>
        <span class="caixa-aberto-item__value" style="color:#15803D;">${formatCurrency(totalRec)}</span>
      </div>
      <div class="caixa-aberto-item">
        <span class="caixa-aberto-item__label" style="color:var(--gray-500);"><i class="fa-solid fa-chart-bar"></i> Despesas do dia (todas as formas)</span>
        <span class="caixa-aberto-item__value" style="color:#B91C1C;">${formatCurrency(totalDep)}</span>
      </div>
    `;

    renderCaixaTx(txDinheiro);
    setupFechamentoCalc(esperado);
  }

  function renderCaixaTx(txDinheiro) {
    const tbody = document.getElementById('caixaTxBody');
    const empty = document.getElementById('caixaTxEmpty');
    tbody.innerHTML = '';
    empty.hidden = txDinheiro.length > 0;

    txDinheiro.sort((a, b) => {
      const ta = a.created_at || a.data_transacao;
      const tb = b.created_at || b.data_transacao;
      return tb.localeCompare(ta);
    });

    txDinheiro.forEach(t => {
      const hora = t.created_at ? new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
      const isRec = t.tipo === 'receita';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:.8rem;color:var(--gray-500);white-space:nowrap;">${hora}</td>
        <td class="td-name">${t.descricao}${t.observacao ? `<small>${t.observacao}</small>` : ''}</td>
        <td>${isRec
          ? '<span class="fin-badge fin-badge--green"><i class="fa-solid fa-arrow-trend-up"></i> Receita</span>'
          : '<span class="fin-badge fin-badge--red"><i class="fa-solid fa-arrow-trend-down"></i> Despesa</span>'
        }</td>
        <td style="text-align:right;font-weight:700;font-size:.9rem;${isRec ? 'color:#15803D;' : 'color:#B91C1C;'}">
          ${isRec ? '+' : '-'}${formatCurrency(t.valor)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function setupFechamentoCalc(esperado) {
    const input = document.getElementById('fechamentoValor');
    const diffEl = document.getElementById('fechamentoDiff');

    function calcDiff() {
      const contado = parseFloat(input.value) || 0;
      const diff    = contado - esperado;
      if (input.value === '') { diffEl.innerHTML = ''; return; }
      const cor   = diff >= 0 ? '#15803D' : '#B91C1C';
      const icon  = diff >= 0 ? 'fa-circle-check' : 'fa-triangle-exclamation';
      const label = diff >= 0 ? 'Sobra' : 'Falta';
      diffEl.innerHTML = `
        <span style="color:${cor};font-weight:700;">
          <i class="fa-solid ${icon}"></i> ${label}: ${formatCurrency(Math.abs(diff))}
        </span>
        <span style="color:var(--gray-400);margin-left:.75rem;">Esperado: ${formatCurrency(esperado)}</span>
      `;
    }

    input.removeEventListener('input', calcDiff);
    input.addEventListener('input', calcDiff);
  }

  /* ════════════════════════════════════
     HISTÓRICO
  ════════════════════════════════════ */
  async function renderHistorico() {
    const list  = await FinDB.getHistoricoCaixa();
    const tbody = document.getElementById('caixaHistBody');
    const empty = document.getElementById('caixaHistEmpty');
    tbody.innerHTML = '';
    empty.hidden = list.length > 0;

    list.forEach(c => {
      const diff = (c.saldo_contado ?? null) !== null ? (c.saldo_contado - c.saldo_esperado) : null;
      const statusBadge = c.status === 'aberto'
        ? '<span class="fin-badge fin-badge--green">Aberto</span>'
        : '<span class="fin-badge fin-badge--gray">Fechado</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:.82rem;white-space:nowrap;">${formatDate(c.data)}</td>
        <td style="font-size:.82rem;">${formatCurrency(c.saldo_abertura)}</td>
        <td style="font-size:.82rem;color:#15803D;font-weight:600;">${formatCurrency(c.entradas || 0)}</td>
        <td style="font-size:.82rem;color:#B91C1C;font-weight:600;">${formatCurrency(c.saidas || 0)}</td>
        <td style="font-size:.82rem;">${c.saldo_esperado !== undefined ? formatCurrency(c.saldo_esperado) : '—'}</td>
        <td style="font-size:.82rem;">${c.saldo_contado !== null && c.saldo_contado !== undefined ? formatCurrency(c.saldo_contado) : '—'}</td>
        <td style="font-size:.82rem;font-weight:700;${diff === null ? '' : diff >= 0 ? 'color:#15803D;' : 'color:#B91C1C;'}">
          ${diff === null ? '—' : (diff >= 0 ? '+' : '') + formatCurrency(diff)}
        </td>
        <td>${statusBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ════════════════════════════════════
     MODAL ABRIR CAIXA
  ════════════════════════════════════ */
  function openAbrirModal() {
    document.getElementById('aberturaSaldo').value = '';
    document.getElementById('aberturaObs').value   = '';
    document.getElementById('abrirModal').hidden   = false;
  }
  function closeAbrirModal() { document.getElementById('abrirModal').hidden = true; }

  document.getElementById('abrirModalClose').addEventListener('click', closeAbrirModal);
  document.getElementById('abrirModalCancel').addEventListener('click', closeAbrirModal);
  document.getElementById('abrirModal').addEventListener('click', e => {
    if (e.target === document.getElementById('abrirModal')) closeAbrirModal();
  });

  document.getElementById('abrirConfirm').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('aberturaSaldo').value);
    if (isNaN(val) || val < 0) {
      toast('Informe um valor de abertura válido.', 'error');
      return;
    }
    const obs = document.getElementById('aberturaObs').value.trim();
    await FinDB.abrirCaixa(val, obs);
    closeAbrirModal();
    renderAll();
    toast('Caixa aberto com sucesso!', 'success');
  });

  /* ════════════════════════════════════
     FECHAR CAIXA
  ════════════════════════════════════ */
  document.getElementById('btnFecharCaixa').addEventListener('click', async () => {
    const aberto = await FinDB.getCaixaAberto();
    if (!aberto) return;

    const contado = parseFloat(document.getElementById('fechamentoValor').value);
    if (isNaN(contado) || contado < 0) {
      toast('Informe o valor contado no caixa.', 'error');
      return;
    }
    const obs = document.getElementById('fechamentoObs').value.trim();

    if (!confirm('Confirmar fechamento do caixa?')) return;

    await FinDB.fecharCaixa(aberto.id, contado, obs);
    renderAll();
    toast('Caixa fechado com sucesso!', 'success');
  });

  /* ── Init ── */
  async function renderAll() {
    await Promise.all([renderCaixaStatus(), renderCaixaSummary(), renderHistorico()]);
  }

  await renderAll();
});
