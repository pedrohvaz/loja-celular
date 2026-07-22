/* ============================================================
   PLANETA CELULAR — fin-relatorios.js
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

  /* ── Helpers ── */
  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
  function formatDate(iso)   { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }

  /* ── Período selector ── */
  const periodoSel     = document.getElementById('relPeriodo');
  const customStartDiv = document.getElementById('relCustomStart');
  const customEndDiv   = document.getElementById('relCustomEnd');

  periodoSel.addEventListener('change', () => {
    const custom = periodoSel.value === 'personalizado';
    customStartDiv.style.display = custom ? '' : 'none';
    customEndDiv.style.display   = custom ? '' : 'none';
  });

  function getDateRange() {
    const now = new Date();
    const p   = periodoSel.value;
    let start, end;

    if (p === 'mes') {
      start = primeiroDia(now.getFullYear(), now.getMonth() + 1);
      end   = ultimoDia(now.getFullYear(), now.getMonth() + 1);
    } else if (p === 'mes_ant') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = primeiroDia(d.getFullYear(), d.getMonth() + 1);
      end   = ultimoDia(d.getFullYear(), d.getMonth() + 1);
    } else if (p === 'trimestre') {
      const d3 = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      start = primeiroDia(d3.getFullYear(), d3.getMonth() + 1);
      end   = ultimoDia(now.getFullYear(), now.getMonth() + 1);
    } else if (p === 'ano') {
      start = `${now.getFullYear()}-01-01`;
      end   = `${now.getFullYear()}-12-31`;
    } else {
      start = document.getElementById('relStart').value;
      end   = document.getElementById('relEnd').value;
      if (!start || !end) return null;
    }
    return { start, end };
  }

  function periodoLabel(range) {
    if (!range) return '';
    return `${formatDate(range.start)} até ${formatDate(range.end)}`;
  }

  /* ═══════════════════════════════════════
     FATURAMENTO
  ═══════════════════════════════════════ */
  async function renderRelFaturamento(range) {
    const [txs, cats] = await Promise.all([
      FinDB._filter({ start: range.start, end: range.end }),
      FinDB.getCategories(),
    ]);
    const catById = new Map(cats.map(c => [c.id, c]));
    const ativos = txs.filter(t => t.status !== 'cancelado');

    const totalRec = ativos.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
    const totalDep = ativos.filter(t => t.tipo === 'despesa' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
    const saldo    = totalRec - totalDep;
    const aRec     = ativos.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);
    const aPag     = ativos.filter(t => t.tipo === 'despesa' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);

    document.getElementById('relSummaryBox').innerHTML = `
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-arrow-trend-up" style="color:#16A34A;"></i> Receitas pagas</div>
        <div class="rel-kpi__value" style="color:#15803D;">${formatCurrency(totalRec)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-arrow-trend-down" style="color:#DC2626;"></i> Despesas pagas</div>
        <div class="rel-kpi__value" style="color:#B91C1C;">${formatCurrency(totalDep)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-scale-balanced" style="color:var(--primary);"></i> Saldo</div>
        <div class="rel-kpi__value" style="color:${saldo >= 0 ? '#15803D' : '#B91C1C'};">${formatCurrency(saldo)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-hourglass-half" style="color:#F59E0B;"></i> A receber</div>
        <div class="rel-kpi__value" style="color:#92400E;">${formatCurrency(aRec)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-file-invoice" style="color:#7C3AED;"></i> A pagar</div>
        <div class="rel-kpi__value" style="color:#5B21B6;">${formatCurrency(aPag)}</div>
      </div>
    `;

    // Por categoria
    const catMap = {};
    ativos.filter(t => t.tipo === 'receita').forEach(t => {
      const cat = catById.get(t.categoria_id);
      const nome = cat?.nome || 'Sem categoria';
      catMap[nome] = (catMap[nome] || 0) + t.valor;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const maxCat     = sortedCats[0]?.[1] || 1;

    document.getElementById('relPorCategoria').innerHTML = sortedCats.length
      ? sortedCats.map(([nome, val]) => `
        <div style="margin-bottom:.6rem;">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.2rem;">
            <span style="color:var(--gray-700);">${nome}</span>
            <span style="font-weight:700;color:var(--gray-800);">${formatCurrency(val)}</span>
          </div>
          <div style="height:6px;background:var(--gray-100);border-radius:100px;overflow:hidden;">
            <div style="height:100%;background:var(--primary);border-radius:100px;width:${(val / maxCat * 100).toFixed(1)}%;"></div>
          </div>
        </div>
      `).join('')
      : '<p style="font-size:.82rem;color:var(--gray-400);">Nenhum dado no período</p>';

    // Por forma de pagamento
    const pgtoMap = {};
    ativos.filter(t => t.status === 'pago' && t.forma_pagamento).forEach(t => {
      const label = finPgtoLabel(t.forma_pagamento);
      pgtoMap[label] = (pgtoMap[label] || 0) + t.valor;
    });
    const sortedPgto = Object.entries(pgtoMap).sort((a, b) => b[1] - a[1]);
    const maxPgto    = sortedPgto[0]?.[1] || 1;
    const pgtoColors = { 'Dinheiro': '#16A34A', 'PIX': '#0066FF', 'Cartão de Crédito': '#7C3AED', 'Cartão de Débito': '#0891B2', 'Boleto': '#D97706', 'Transferência': '#059669' };

    document.getElementById('relPorPgto').innerHTML = sortedPgto.length
      ? sortedPgto.map(([nome, val]) => {
          const cor = pgtoColors[nome] || '#64748B';
          return `
          <div style="margin-bottom:.6rem;">
            <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.2rem;">
              <span style="color:var(--gray-700);">${nome}</span>
              <span style="font-weight:700;color:var(--gray-800);">${formatCurrency(val)}</span>
            </div>
            <div style="height:6px;background:var(--gray-100);border-radius:100px;overflow:hidden;">
              <div style="height:100%;background:${cor};border-radius:100px;width:${(val / maxPgto * 100).toFixed(1)}%;"></div>
            </div>
          </div>
        `;
        }).join('')
      : '<p style="font-size:.82rem;color:var(--gray-400);">Nenhum pagamento registrado</p>';
  }

  /* ═══════════════════════════════════════
     RELATÓRIO DE OS
  ═══════════════════════════════════════ */
  async function renderRelOs(range) {
    const all = await OSDB.getAll();
    const allOs = all.filter(os => {
      if (!os.data_entrada) return false;
      const d = os.data_entrada.slice(0, 10);
      return d >= range.start && d <= range.end;
    });

    const concluidas  = allOs.filter(os => os.status === 'concluido').length;
    const emAndamento = allOs.filter(os => !['concluido', 'cancelado'].includes(os.status)).length;
    const canceladas  = allOs.filter(os => os.status === 'cancelado').length;
    const totalServicos = allOs.reduce((s, os) => {
      return s + (os.servicos_realizados || []).reduce((ss, sv) => ss + (sv.valor || 0), 0);
    }, 0);
    const totalPecas = allOs.reduce((s, os) => {
      return s + (os.pecas_utilizadas || []).reduce((ss, p) => ss + (p.valor_unitario || 0) * (p.quantidade || 1), 0);
    }, 0);
    const totalGeral = allOs.reduce((s, os) => s + (os.valor_total || 0), 0);

    document.getElementById('relOsSummary').innerHTML = `
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-screwdriver-wrench" style="color:var(--primary);"></i> Total de OS</div>
        <div class="rel-kpi__value">${allOs.length}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-circle-check" style="color:#16A34A;"></i> Concluídas</div>
        <div class="rel-kpi__value" style="color:#15803D;">${concluidas}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-gears" style="color:#F59E0B;"></i> Em andamento</div>
        <div class="rel-kpi__value" style="color:#92400E;">${emAndamento}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-ban" style="color:#DC2626;"></i> Canceladas</div>
        <div class="rel-kpi__value" style="color:#B91C1C;">${canceladas}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-circle-dollar-to-slot" style="color:#7C3AED;"></i> Faturamento total</div>
        <div class="rel-kpi__value" style="color:#5B21B6;">${formatCurrency(totalGeral)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-wrench" style="color:#0891B2;"></i> Total em serviços</div>
        <div class="rel-kpi__value" style="color:#0E7490;">${formatCurrency(totalServicos)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-microchip" style="color:#D97706;"></i> Total em peças</div>
        <div class="rel-kpi__value" style="color:#92400E;">${formatCurrency(totalPecas)}</div>
      </div>
    `;

    const tbody = document.getElementById('relOsBody');
    tbody.innerHTML = '';

    if (!allOs.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:1.5rem;font-size:.85rem;">Nenhuma OS no período</td></tr>`;
      return;
    }

    allOs.sort((a, b) => (b.data_entrada || '').localeCompare(a.data_entrada || '')).forEach(os => {
      const servsTxt = (os.servicos_realizados || []).map(s => s.descricao).join(', ') || '—';
      const pecasTxt = (os.pecas_utilizadas || []).map(p => p.descricao).join(', ') || '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size:.8rem;font-weight:700;color:var(--primary);">${os.numero_os || '—'}</td>
        <td style="font-size:.82rem;">${os.cliente_nome || '—'}</td>
        <td style="font-size:.82rem;">${os.aparelho_marca || ''} ${os.aparelho_modelo || ''}</td>
        <td style="font-size:.78rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${servsTxt}">${servsTxt}</td>
        <td style="font-size:.78rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${pecasTxt}">${pecasTxt}</td>
        <td style="font-weight:700;font-size:.88rem;color:#5B21B6;">${formatCurrency(os.valor_total || 0)}</td>
        <td style="font-size:.78rem;">${finPgtoLabel(os.forma_pagamento) || '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ═══════════════════════════════════════
     INADIMPLÊNCIA
  ═══════════════════════════════════════ */
  async function renderRelInadimplencia(range) {
    const hoje    = new Date().toISOString().slice(0, 10);
    const allTx   = await FinDB.getAll();
    const vencidos = allTx.filter(t => {
      if (t.status !== 'pendente') return false;
      if (!t.data_vencimento)      return false;
      if (t.data_vencimento >= hoje) return false;
      const d = t.data_transacao || t.data_vencimento;
      return d >= range.start && d <= range.end;
    });

    const total = vencidos.reduce((s, t) => s + t.valor, 0);
    document.getElementById('relInadSummary').innerHTML = `
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-triangle-exclamation" style="color:#DC2626;"></i> Total inadimplente</div>
        <div class="rel-kpi__value" style="color:#B91C1C;">${formatCurrency(total)}</div>
      </div>
      <div class="rel-kpi">
        <div class="rel-kpi__label"><i class="fa-solid fa-file-invoice" style="color:#D97706;"></i> Lançamentos vencidos</div>
        <div class="rel-kpi__value" style="color:#92400E;">${vencidos.length}</div>
      </div>
    `;

    const tbody = document.getElementById('relInadBody');
    const empty = document.getElementById('relInadEmpty');
    tbody.innerHTML = '';
    empty.hidden = vencidos.length > 0;

    vencidos.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)).forEach(t => {
      const dias = diasEmAberto(t.data_vencimento);
      const origemLabel = t.origem === 'os'
        ? `<a href="os-detalhes.html?id=${t.origem_id}" style="color:var(--primary);font-size:.78rem;"><i class="fa-solid fa-screwdriver-wrench"></i> OS</a>`
        : (t.origem === 'sale' || t.origem === 'venda_produto') ? '<i class="fa-solid fa-box"></i> Venda' : 'Manual';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-name">${t.descricao}${t.observacao ? `<small>${t.observacao}</small>` : ''}</td>
        <td style="font-size:.8rem;">${origemLabel}</td>
        <td style="font-weight:700;color:#B91C1C;font-size:.88rem;">${formatCurrency(t.valor)}</td>
        <td style="font-size:.82rem;" class="venc--red">${formatDate(t.data_vencimento)}</td>
        <td>
          <span class="dias-badge dias-badge--red">
            <i class="fa-solid fa-triangle-exclamation"></i> ${dias}d
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /* ═══════════════════════════════════════
     GERAR RELATÓRIO
  ═══════════════════════════════════════ */
  async function gerarRelatorio() {
    const range = getDateRange();
    if (!range) {
      alert('Selecione as datas do período personalizado.');
      return;
    }
    document.getElementById('relPeriodoLabel').textContent = periodoLabel(range);
    await Promise.all([
      renderRelFaturamento(range),
      renderRelOs(range),
      renderRelInadimplencia(range),
    ]);
  }

  document.getElementById('btnGerar').addEventListener('click', gerarRelatorio);

  /* ── Print ── */
  document.getElementById('btnPrint').addEventListener('click', () => window.print());

  /* ── CSV Export ── */
  document.getElementById('btnExportCSV').addEventListener('click', async () => {
    const range = getDateRange();
    if (!range) { alert('Selecione o período antes de exportar.'); return; }
    const txs = await FinDB._filter({ start: range.start, end: range.end });
    await FinDB.exportCSV(txs);
  });

  /* ── Init ── */
  await gerarRelatorio();
});
