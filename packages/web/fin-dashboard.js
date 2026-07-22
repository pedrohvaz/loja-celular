/* ============================================================
   PLANETA CELULAR — fin-dashboard.js
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

  /* ── Seletor de mês ── */
  const mesSel = document.getElementById('mesSeletor');
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const opt = document.createElement('option');
    opt.value = `${d.getFullYear()}-${d.getMonth() + 1}`;
    opt.textContent = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (i === 0) opt.selected = true;
    mesSel.appendChild(opt);
  }
  mesSel.addEventListener('change', renderAll);

  /* ── Paleta dos gráficos ── */
  const COLORS = ['#0066FF','#22C55E','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#84CC16','#F97316','#10B981'];

  let barChart, pieRec, pieDep, lineChart;

  function getMesAno() {
    const [ano, mes] = mesSel.value.split('-').map(Number);
    return { ano, mes };
  }

  /* ════════════════════════════════════
     KPI CARDS
  ════════════════════════════════════ */
  async function renderKpi() {
    const { ano, mes } = getMesAno();
    const s = await FinDB.getStats(ano, mes);

    const cards = [
      { label: 'Saldo do mês',    value: formatCurrency(s.saldo),          icon: 'fa-scale-balanced',  cls: s.saldo >= 0 ? 'fin-kpi--blue' : 'fin-kpi--red', sub: 'Receitas pagas − Despesas pagas' },
      { label: 'Receitas (pagas)',value: formatCurrency(s.receitas_pagas),  icon: 'fa-arrow-trend-up',  cls: 'fin-kpi--green', sub: 'No mês selecionado' },
      { label: 'Despesas (pagas)',value: formatCurrency(s.despesas_pagas),  icon: 'fa-arrow-trend-down',cls: 'fin-kpi--red',   sub: 'No mês selecionado' },
      { label: 'Lucro do mês',    value: formatCurrency(s.lucro),           icon: 'fa-circle-dollar-to-slot', cls: s.lucro >= 0 ? 'fin-kpi--green' : 'fin-kpi--red', sub: 'Receitas − Despesas pagas' },
      { label: 'A receber',       value: formatCurrency(s.a_receber),       icon: 'fa-hourglass-half',  cls: 'fin-kpi--orange', sub: 'Receitas pendentes' },
      { label: 'A pagar',         value: formatCurrency(s.a_pagar),         icon: 'fa-file-invoice',    cls: 'fin-kpi--purple', sub: 'Despesas pendentes' },
    ];

    document.getElementById('kpiGrid').innerHTML = cards.map(c => `
      <div class="fin-kpi ${c.cls}">
        <div class="fin-kpi__label"><i class="fa-solid ${c.icon}"></i> ${c.label}</div>
        <div class="fin-kpi__value">${c.value}</div>
        <div class="fin-kpi__sub">${c.sub}</div>
      </div>
    `).join('');
  }

  /* ════════════════════════════════════
     GRÁFICO DE BARRAS (6 meses)
  ════════════════════════════════════ */
  async function renderBarChart() {
    const { ano, mes } = getMesAno();
    const data = await FinDB.getLast6MonthsStats(ano, mes);
    const ctx  = document.getElementById('chartBar').getContext('2d');
    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   data.map(d => d.label),
        datasets: [
          {
            label: 'Receitas',
            data:  data.map(d => d.receitas),
            backgroundColor: 'rgba(34,197,94,.75)',
            borderRadius: 5,
          },
          {
            label: 'Despesas',
            data:  data.map(d => d.despesas),
            backgroundColor: 'rgba(239,68,68,.75)',
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* ════════════════════════════════════
     GRÁFICOS DE PIZZA
  ════════════════════════════════════ */
  async function renderPieCharts() {
    const { ano, mes } = getMesAno();

    function buildPie(canvasId, raw, chartRef) {
      const ctx   = document.getElementById(canvasId).getContext('2d');
      if (chartRef) chartRef.destroy();

      if (!raw.length) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return null;
      }

      return new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels:   raw.map(([l]) => l),
          datasets: [{ data: raw.map(([, v]) => v), backgroundColor: COLORS, borderWidth: 2 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
            tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed)}` } },
          },
          cutout: '60%',
        },
      });
    }

    const [rawRec, rawDep] = await Promise.all([
      FinDB.getDistribuicaoPorCategoria('receita', ano, mes),
      FinDB.getDistribuicaoPorCategoria('despesa', ano, mes),
    ]);
    pieRec = buildPie('chartPieRec', rawRec, pieRec);
    pieDep = buildPie('chartPieDep', rawDep, pieDep);
  }

  /* ════════════════════════════════════
     GRÁFICO DE LINHA (faturamento diário)
  ════════════════════════════════════ */
  async function renderLineChart() {
    const data = await FinDB.getDailyRevenueCurrentMonth();
    const ctx  = document.getElementById('chartLine').getContext('2d');
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels:   data.map(d => d.day),
        datasets: [{
          label: 'Receita (R$)',
          data:  data.map(d => d.valor),
          borderColor: '#0066FF',
          backgroundColor: 'rgba(0,102,255,.08)',
          fill: true,
          tension: .35,
          pointRadius: 3,
          pointBackgroundColor: '#0066FF',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } },
          x: { title: { display: true, text: 'Dia do mês', font: { size: 10 } }, grid: { display: false } },
        },
      },
    });
  }

  /* ════════════════════════════════════
     PAINÉIS (listas rápidas)
  ════════════════════════════════════ */
  async function renderPanels() {
    const [allTx, cats, venc] = await Promise.all([
      FinDB.getAll(),
      FinDB.getCategories(),
      FinDB.getProximosVencimentos(7),
    ]);
    const catById = new Map(cats.map(c => [c.id, c]));

    // Últimas 5 transações
    const txs = allTx.slice(0, 5);
    const panelTx = document.getElementById('panelRecentTx');
    panelTx.innerHTML = txs.length ? txs.map(t => {
      const isRec = t.tipo === 'receita';
      const cat   = catById.get(t.categoria_id);
      return `
        <div class="fin-tx-row">
          <div class="fin-tx-row__icon ${isRec ? 'fin-tx-row__icon--green' : 'fin-tx-row__icon--red'}">
            <i class="fa-solid ${cat?.icone || (isRec ? 'fa-arrow-up' : 'fa-arrow-down')}"></i>
          </div>
          <div class="fin-tx-row__info">
            <div class="fin-tx-row__desc" title="${t.descricao}">${t.descricao}</div>
            <div class="fin-tx-row__meta">${formatDate(t.data_transacao)} · ${cat?.nome || '—'}</div>
          </div>
          <div class="fin-tx-row__valor ${isRec ? 'fin-tx-row__valor--green' : 'fin-tx-row__valor--red'}">
            ${isRec ? '+' : '-'}${formatCurrency(t.valor)}
          </div>
        </div>
      `;
    }).join('') : '<div class="fin-panel__empty">Nenhuma transação ainda</div>';

    // Próximos vencimentos (7 dias)
    const panelVenc = document.getElementById('panelVencimentos');
    panelVenc.innerHTML = venc.length ? venc.map(t => `
      <div class="fin-venc-row">
        <div class="fin-venc-row__desc" title="${t.descricao}">${t.descricao}</div>
        <div class="fin-venc-row__right">
          <span class="fin-badge fin-badge--yellow">${formatDate(t.data_vencimento)}</span>
          <span style="font-size:.75rem;color:var(--gray-400)">${formatCurrency(t.valor)}</span>
        </div>
      </div>
    `).join('') : '<div class="fin-panel__empty">Nenhum vencimento nos próximos 7 dias</div>';

    // OS com pagamento pendente
    const osPend = allTx.filter(t => t.origem === 'os' && t.status === 'pendente').slice(0, 5);
    const panelOs = document.getElementById('panelOsPendentes');
    panelOs.innerHTML = osPend.length ? osPend.map(t => `
      <div class="fin-venc-row">
        <div class="fin-venc-row__desc" title="${t.descricao}">${t.descricao}</div>
        <div class="fin-venc-row__right">
          <span class="fin-badge fin-badge--orange">${formatCurrency(t.valor)}</span>
        </div>
      </div>
    `).join('') : '<div class="fin-panel__empty">Nenhuma OS com pagamento pendente</div>';
  }

  async function renderAll() {
    await Promise.all([
      renderKpi(),
      renderBarChart(),
      renderPieCharts(),
      renderLineChart(),
      renderPanels(),
    ]);
  }

  await renderAll();

  /* helpers */
  function formatDate(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }
  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
});
