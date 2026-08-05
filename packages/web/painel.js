/* ============================================================
   PLANETA CELULAR — painel.js
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  // Protege a rota
  AuthDB.requireAuth();

  // Aplica restrições de role
  const isAdmin = AuthDB.isAdmin();
  const userNome = AuthDB.getNome();

  // Mostra nome do usuário logado no topbar
  const topbarUserEl = document.getElementById('topbarUserName');
  if (topbarUserEl) topbarUserEl.textContent = userNome;

  // Esconde módulo financeiro para funcionário
  if (!isAdmin) {
    const finNav = document.getElementById('financeiroNav');
    if (finNav) finNav.style.display = 'none';
    const finDash = document.getElementById('finDashStats');
    if (finDash) finDash.style.display = 'none';
  }

  /* ── Navegação de seções ── */
  const sections  = document.querySelectorAll('.content-section');
  const sideLinks = document.querySelectorAll('.sidebar__link[data-section]');
  const topbarTitle = document.getElementById('topbarTitle');

  async function showSection(id) {
    sections.forEach(s  => s.classList.toggle('active', s.id === 'section-' + id));
    sideLinks.forEach(l => l.classList.toggle('active', l.dataset.section === id));
    const labels = { dashboard: 'Dashboard', products: 'Produtos', orders: 'Pedidos', customers: 'Clientes', campaigns: 'Campanhas' };
    topbarTitle.textContent = labels[id] || id;
    try {
      if (id === 'dashboard') await renderDashboard();
      if (id === 'products')  await renderProductsTable();
      if (id === 'orders')    await renderOrdersTable();
      if (id === 'customers') await renderCustomersTable();
      if (id === 'campaigns') await renderCampaignsTable();
    } catch (e) {
      if (isModuleUnavailableError(e)) toast(e.message, 'error');
      else throw e;
    }
  }

  sideLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSection(link.dataset.section);
      sidebar.classList.remove('open');
    });
  });

  // "Ver todos" nos painéis do dashboard
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.goto));
  });

  /* ── Sidebar mobile ── */
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !document.getElementById('sidebarToggle').contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthDB.logout();
    window.location.href = 'admin.html';
  });

  /* ── Refresh ── */
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const active = document.querySelector('.content-section.active');
    if (active?.id === 'section-dashboard') await renderDashboard();
    if (active?.id === 'section-products')  await renderProductsTable();
    if (active?.id === 'section-orders')    await renderOrdersTable();
    if (active?.id === 'section-customers') await renderCustomersTable();
    if (active?.id === 'section-campaigns') await renderCampaignsTable();
    toast('Dados atualizados.', 'success');
  });

  /* ── Toast helper ── */
  let toastTimer;
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> ${msg}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  /* ════════════════════════════════════
     DASHBOARD
  ════════════════════════════════════ */
  async function renderDashboard() {
    const stats   = await ProductDB.getStats();
    const orders  = await OrderDB.getAll();
    const pending = orders.filter(o => o.status === 'pending').length;

    // Update sidebar badges
    document.getElementById('sidebarProdCount').textContent  = stats.total;
    document.getElementById('sidebarOrderCount').textContent = orders.length;

    // OS sidebar badge + mini stats
    const osStats = await OSDB.getStats();
    document.getElementById('sidebarOsCount').textContent = osStats.abertas;

    const osDashEl = document.getElementById('osDashStats');
    if (osDashEl) {
      const osCards = [
        { icon: 'fa-screwdriver-wrench', label: 'OS Abertas',     value: osStats.abertas,        color: '#3B82F6', bg: '#EFF6FF' },
        { icon: 'fa-wrench',             label: 'Em Reparo',      value: osStats.em_reparo,       color: '#8B5CF6', bg: '#F5F3FF' },
        { icon: 'fa-triangle-exclamation', label: 'Vencidas',     value: osStats.vencidas,        color: '#EF4444', bg: '#FEF2F2' },
        { icon: 'fa-dollar-sign',        label: 'Fat. Mês (OS)',  value: formatCurrency(osStats.faturamento_mes), color: '#22C55E', bg: '#F0FDF4' },
      ];
      osDashEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
          <h3 style="font-family:var(--font-heading);font-size:1rem;font-weight:700;color:var(--gray-900);">
            <i class="fa-solid fa-screwdriver-wrench" style="color:var(--primary);margin-right:.4rem;"></i>
            Assistência Técnica
          </h3>
          <a href="os-lista.html" style="font-size:.82rem;color:var(--primary);text-decoration:none;font-weight:600;">
            Ver todas <i class="fa-solid fa-arrow-right" style="font-size:.7rem;"></i>
          </a>
        </div>
        <div class="os-stats-grid" style="margin-bottom:0;">
          ${osCards.map(c => `
            <div class="os-stat">
              <div class="os-stat__icon" style="background:${c.bg};color:${c.color}">
                <i class="fa-solid ${c.icon}"></i>
              </div>
              <div>
                <div class="os-stat__value" style="color:${c.color}">${c.value}</div>
                <div class="os-stat__label">${c.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Stat cards
    const statsEl = document.getElementById('statsGrid');
    const cards = [
      { icon: 'fa-box',          label: 'Total de Produtos',    value: stats.total,    color: '#0066FF' },
      { icon: 'fa-circle-check', label: 'Em Estoque',           value: stats.inStock,  color: '#22C55E' },
      { icon: 'fa-circle-xmark', label: 'Sem Estoque',          value: stats.outStock, color: '#EF4444' },
      { icon: 'fa-receipt',      label: 'Pedidos Recebidos',    value: orders.length,  color: '#F59E0B' },
      { icon: 'fa-clock',        label: 'Pedidos Pendentes',    value: pending,        color: '#8B5CF6' },
      { icon: 'fa-layer-group',  label: 'Categorias',           value: stats.categories, color: '#06B6D4' },
    ];
    statsEl.innerHTML = cards.map(c => `
      <div class="stat-card" style="--stat-color:${c.color}">
        <div class="stat-card__icon"><i class="fa-solid ${c.icon}"></i></div>
        <div class="stat-card__value">${c.value}</div>
        <div class="stat-card__label">${c.label}</div>
      </div>
    `).join('');

    // Financeiro mini cards (somente admin)
    const finEl = document.getElementById('finDashStats');
    if (finEl && isAdmin && typeof FinDB !== 'undefined') {
      const now = new Date();
      const s   = await FinDB.getStats(now.getFullYear(), now.getMonth() + 1);
      const finCards = [
        { icon: 'fa-arrow-trend-up',   label: 'Receitas (mês)',  value: formatCurrency(s.receitas_pagas), color: '#16A34A', bg: '#F0FDF4' },
        { icon: 'fa-arrow-trend-down', label: 'Despesas (mês)',  value: formatCurrency(s.despesas_pagas), color: '#DC2626', bg: '#FEF2F2' },
        { icon: 'fa-scale-balanced',   label: 'Saldo do mês',    value: formatCurrency(s.saldo),          color: s.saldo >= 0 ? '#0066FF' : '#DC2626', bg: '#EFF6FF' },
        { icon: 'fa-hourglass-half',   label: 'A receber',       value: formatCurrency(s.a_receber),      color: '#D97706', bg: '#FFFBEB' },
      ];
      finEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
          <h3 style="font-family:var(--font-heading);font-size:1rem;font-weight:700;color:var(--gray-900);">
            <i class="fa-solid fa-chart-pie" style="color:var(--primary);margin-right:.4rem;"></i>
            Financeiro do Mês
          </h3>
          <a href="fin-dashboard.html" style="font-size:.82rem;color:var(--primary);text-decoration:none;font-weight:600;">
            Ver painel <i class="fa-solid fa-arrow-right" style="font-size:.7rem;"></i>
          </a>
        </div>
        <div class="os-stats-grid" style="margin-bottom:0;">
          ${finCards.map(c => `
            <div class="os-stat">
              <div class="os-stat__icon" style="background:${c.bg};color:${c.color}">
                <i class="fa-solid ${c.icon}"></i>
              </div>
              <div>
                <div class="os-stat__value" style="color:${c.color};font-size:.92rem;">${c.value}</div>
                <div class="os-stat__label">${c.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Recent products (last 5)
    const allProducts = await ProductDB.getAll();
    const products = allProducts.slice(-5).reverse();
    const recentPEl = document.getElementById('recentProducts');
    recentPEl.innerHTML = products.length
      ? products.map(p => `
          <div class="mini-product">
            <img src="${p.image}" alt="${p.name}" />
            <div class="mini-product__info">
              <strong>${p.name}</strong>
              <span>${categoryLabel(p.category)} · ${conditionLabel(p.condition)}</span>
            </div>
            <span class="mini-product__price">${formatCurrency(p.price)}</span>
          </div>
        `).join('')
      : '<p style="color:var(--gray-400);font-size:.88rem;">Nenhum produto cadastrado.</p>';

    // Recent orders (last 5)
    const recentOrders = orders.slice(0, 5);
    const recentOEl = document.getElementById('recentOrders');
    recentOEl.innerHTML = recentOrders.length
      ? recentOrders.map(o => `
          <div class="mini-order">
            <span class="mini-order__id">${o.id.slice(-6)}</span>
            <div class="mini-order__info">
              <strong>${o.customer?.nome || '—'}</strong>
              <span>${formatCurrency(o.total)} · ${paymentLabel(o.payment)}</span>
            </div>
            <span class="badge ${statusBadgeClass(o.status)}">${statusLabel(o.status)}</span>
          </div>
        `).join('')
      : '<p style="color:var(--gray-400);font-size:.88rem;">Nenhum pedido ainda.</p>';
  }

  /* ════════════════════════════════════
     PRODUTOS
  ════════════════════════════════════ */
  let productSearchVal = '';
  let productCategoryVal = '';
  let productStockVal = '';

  async function renderProductsTable() {
    const allProducts = await ProductDB.getAll();
    let products = allProducts;

    if (productSearchVal) {
      const q = productSearchVal.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (productCategoryVal) products = products.filter(p => p.category === productCategoryVal);
    if (productStockVal === 'in')  products = products.filter(p => p.inStock);
    if (productStockVal === 'out') products = products.filter(p => !p.inStock);

    const tbody = document.getElementById('productsTableBody');
    const empty = document.getElementById('productsEmpty');
    tbody.innerHTML = '';
    empty.hidden = products.length > 0;

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img class="table-thumb" src="${p.image}" alt="${p.name}" /></td>
        <td class="td-name">${p.name}<small>${p.description || ''}</small></td>
        <td><span class="badge badge--blue">${categoryLabel(p.category)}</span></td>
        <td><span class="badge badge--gray">${conditionLabel(p.condition)}</span></td>
        <td><strong style="color:var(--primary)">${formatCurrency(p.price)}</strong>${p.oldPrice ? `<br/><small style="text-decoration:line-through;color:var(--gray-400)">${formatCurrency(p.oldPrice)}</small>` : ''}</td>
        <td>
          <button class="stock-toggle ${p.inStock ? 'in' : 'out'}" data-id="${p.id}" title="Clique para alternar">
            <i class="fa-solid fa-circle"></i>
            ${p.inStock ? 'Em estoque' : 'Sem estoque'}
          </button>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-btn" data-id="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn--insta insta-btn" data-id="${p.id}" title="Publicar no Instagram"><i class="fa-brands fa-instagram"></i></button>
            <button class="action-btn action-btn--danger delete-btn" data-id="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Stock toggle
    tbody.querySelectorAll('.stock-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = products.find(x => x.id === btn.dataset.id);
        await ProductDB.update(btn.dataset.id, { inStock: !p.inStock });
        renderProductsTable();
        toast(`Estoque atualizado.`, 'success');
      });
    });
    // Edit
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      bindEditButton(btn, products.find(p => p.id === btn.dataset.id));
    });
    // Instagram
    tbody.querySelectorAll('.insta-btn').forEach(btn => {
      btn.addEventListener('click', () => openInstaModal(products.find(p => p.id === btn.dataset.id)));
    });
    // Delete
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este produto?')) return;
        await ProductDB.delete(btn.dataset.id);
        renderProductsTable();
        renderDashboard();
        toast('Produto excluído.', 'success');
      });
    });

    document.getElementById('sidebarProdCount').textContent = allProducts.length;
  }

  // Bind botão de editar com o produto já carregado (evita nova requisição)
  function bindEditButton(btn, p) {
    btn.addEventListener('click', () => {
      if (!p) return;
      document.getElementById('modalTitle').textContent = 'Editar Produto';
      document.getElementById('formId').value          = p.id;
      document.getElementById('formName').value        = p.name;
      document.getElementById('formCategory').value    = p.category;
      document.getElementById('formBrand').value       = p.brand;
      document.getElementById('formCondition').value   = p.condition;
      document.getElementById('formPrice').value       = p.price;
      document.getElementById('formOldPrice').value    = p.oldPrice || '';
      document.getElementById('formDescription').value = p.description;
      document.getElementById('formImage').value       = p.image;
      document.getElementById('formInStock').checked   = p.inStock;
      showImgPreview(p.image);
      document.getElementById('productModal').hidden = false;
    });
  }

  // Filters
  document.getElementById('productSearch').addEventListener('input', function () {
    productSearchVal = this.value.trim();
    renderProductsTable();
  });
  document.getElementById('categoryFilter').addEventListener('change', function () {
    productCategoryVal = this.value;
    renderProductsTable();
  });
  document.getElementById('stockFilter').addEventListener('change', function () {
    productStockVal = this.value;
    renderProductsTable();
  });

  // Add product button
  document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Novo Produto';
    document.getElementById('productForm').reset();
    document.getElementById('formId').value = '';
    document.getElementById('formInStock').checked = true;
    document.getElementById('imgPreview').hidden = true;
    clearFormErrors();
    document.getElementById('productModal').hidden = false;
  });

  /* ── Produto Modal ── */
  function showImgPreview(url) {
    const previewEl = document.getElementById('imgPreview');
    const imgEl     = document.getElementById('imgPreviewEl');
    if (url) { imgEl.src = url; previewEl.hidden = false; }
    else      { previewEl.hidden = true; }
  }

  document.getElementById('previewImgBtn').addEventListener('click', () => {
    showImgPreview(document.getElementById('formImage').value.trim());
  });
  document.getElementById('formImage').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); showImgPreview(e.target.value.trim()); }
  });

  document.getElementById('formImageFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const label = document.getElementById('uploadImageLabel');
    const originalLabel = label.textContent;
    label.textContent = 'Enviando...';
    try {
      const url = await UploadDB.upload(file);
      document.getElementById('formImage').value = url;
      showImgPreview(url);
      toast('Imagem enviada!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      label.textContent = originalLabel;
      e.target.value = '';
    }
  });

  function clearFormErrors() {
    ['Name','Category','Price','Description','Image'].forEach(f => {
      document.getElementById('err' + f).textContent = '';
      document.getElementById('form' + f)?.classList.remove('err-field');
    });
  }

  function validateProductForm() {
    clearFormErrors();
    let ok = true;
    const rules = [
      { field: 'Name',        el: 'formName',        msg: 'Nome obrigatório.', check: v => v.trim().length >= 2 },
      { field: 'Category',    el: 'formCategory',    msg: 'Selecione a categoria.', check: v => !!v },
      { field: 'Price',       el: 'formPrice',       msg: 'Preço inválido.', check: v => !isNaN(v) && +v > 0 },
      { field: 'Description', el: 'formDescription', msg: 'Descrição obrigatória.', check: v => v.trim().length >= 3 },
      { field: 'Image',       el: 'formImage',       msg: 'URL da imagem obrigatória.', check: v => v.startsWith('http') },
    ];
    rules.forEach(r => {
      const el = document.getElementById(r.el);
      if (!r.check(el.value)) {
        document.getElementById('err' + r.field).textContent = r.msg;
        el.classList.add('err-field');
        ok = false;
      }
    });
    return ok;
  }

  document.getElementById('modalSave').addEventListener('click', async () => {
    if (!validateProductForm()) return;
    const data = {
      name:        document.getElementById('formName').value.trim(),
      category:    document.getElementById('formCategory').value,
      brand:       document.getElementById('formBrand').value,
      condition:   document.getElementById('formCondition').value,
      price:       parseFloat(document.getElementById('formPrice').value),
      oldPrice:    parseFloat(document.getElementById('formOldPrice').value) || null,
      description: document.getElementById('formDescription').value.trim(),
      image:       document.getElementById('formImage').value.trim(),
      inStock:     document.getElementById('formInStock').checked,
    };
    const id = document.getElementById('formId').value;
    try {
      if (id) {
        await ProductDB.update(id, data);
        toast('Produto atualizado com sucesso!', 'success');
      } else {
        await ProductDB.add(data);
        toast('Produto cadastrado com sucesso!', 'success');
      }
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    document.getElementById('productModal').hidden = true;
    renderProductsTable();
    renderDashboard();
  });

  function closeProductModal() { document.getElementById('productModal').hidden = true; }
  document.getElementById('modalClose').addEventListener('click', closeProductModal);
  document.getElementById('modalCancel').addEventListener('click', closeProductModal);
  document.getElementById('productModal').addEventListener('click', e => {
    if (e.target === document.getElementById('productModal')) closeProductModal();
  });

  /* ════════════════════════════════════
     PEDIDOS
  ════════════════════════════════════ */
  let orderStatusFilterVal = '';

  async function renderOrdersTable() {
    const allOrders = await OrderDB.getAll();
    let orders = allOrders;
    if (orderStatusFilterVal) orders = orders.filter(o => o.status === orderStatusFilterVal);

    const tbody = document.getElementById('ordersTableBody');
    const empty = document.getElementById('ordersEmpty');
    tbody.innerHTML = '';
    empty.hidden = orders.length > 0;

    document.getElementById('sidebarOrderCount').textContent = allOrders.length;

    orders.forEach(o => {
      const tr = document.createElement('tr');
      const date = new Date(o.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
      tr.innerHTML = `
        <td><strong style="font-size:.82rem;color:var(--primary)">${o.id.slice(-8)}</strong></td>
        <td class="td-name">${o.customer?.nome || '—'}<small>${o.customer?.tel || ''}</small></td>
        <td><strong>${formatCurrency(o.total)}</strong></td>
        <td>${paymentLabel(o.payment)}</td>
        <td style="font-size:.8rem;color:var(--gray-600)">${date}</td>
        <td>
          <select class="status-select" data-id="${o.id}">
            <option value="pending"   ${o.status==='pending'   ? 'selected':''}>Pendente</option>
            <option value="confirmed" ${o.status==='confirmed' ? 'selected':''}>Confirmado</option>
            <option value="delivered" ${o.status==='delivered' ? 'selected':''}>Entregue</option>
            <option value="cancelled" ${o.status==='cancelled' ? 'selected':''}>Cancelado</option>
          </select>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn view-order-btn" data-id="${o.id}" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>
            <button class="action-btn action-btn--wa wa-order-btn" data-tel="${o.customer?.tel || ''}" data-id="${o.id}" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
            <button class="action-btn action-btn--danger delete-order-btn" data-id="${o.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Status change
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        await OrderDB.updateStatus(sel.dataset.id, sel.value);
        renderDashboard();
        toast('Status atualizado.', 'success');
      });
    });

    // View order
    tbody.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', () => openOrderModal(orders.find(o => o.id === btn.dataset.id)));
    });

    // WhatsApp
    tbody.querySelectorAll('.wa-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tel = btn.dataset.tel.replace(/\D/g, '');
        if (tel) window.open(`https://wa.me/55${tel}`, '_blank', 'noopener');
        else alert('Telefone não disponível para este pedido.');
      });
    });

    // Delete
    tbody.querySelectorAll('.delete-order-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este pedido?')) return;
        await OrderDB.delete(btn.dataset.id);
        renderOrdersTable();
        renderDashboard();
        toast('Pedido excluído.', 'success');
      });
    });
  }

  document.getElementById('orderStatusFilter').addEventListener('change', function () {
    orderStatusFilterVal = this.value;
    renderOrdersTable();
  });

  document.getElementById('clearOrdersBtn').addEventListener('click', async () => {
    if (!confirm('Limpar TODOS os pedidos? Esta ação não pode ser desfeita.')) return;
    const all = await OrderDB.getAll();
    await Promise.all(all.map(o => OrderDB.delete(o.id)));
    renderOrdersTable();
    renderDashboard();
    toast('Todos os pedidos foram removidos.', 'success');
  });

  /* ── Order detail modal ── */
  function openOrderModal(o) {
    if (!o) return;
    const date = new Date(o.date).toLocaleString('pt-BR');
    const itemsHtml = (o.items || []).map(i =>
      `<div class="order-item-row"><span>${i.name} ×${i.qty}</span><span>${formatCurrency(i.price * i.qty)}</span></div>`
    ).join('');

    document.getElementById('orderModalBody').innerHTML = `
      <div class="order-detail-section">
        <h4>Cliente</h4>
        <div class="order-detail-row"><strong>Nome:</strong><span>${o.customer?.nome || '—'}</span></div>
        <div class="order-detail-row"><strong>Telefone:</strong><span>${o.customer?.tel || '—'}</span></div>
        <div class="order-detail-row"><strong>E-mail:</strong><span>${o.customer?.email || '—'}</span></div>
        <div class="order-detail-row"><strong>Endereço:</strong><span>${o.customer?.endereco || '—'}, ${o.customer?.cidade || ''}</span></div>
      </div>
      <div class="order-detail-section">
        <h4>Pedido #${o.id.slice(-8)}</h4>
        <div class="order-detail-row"><strong>Data:</strong><span>${date}</span></div>
        <div class="order-detail-row"><strong>Pagamento:</strong><span>${paymentLabel(o.payment)}</span></div>
        <div class="order-detail-row"><strong>Entrega:</strong><span>${o.shipping?.label || '—'}</span></div>
      </div>
      <div class="order-detail-section">
        <h4>Itens</h4>
        <div class="order-items-list">
          ${itemsHtml}
          <div class="order-total-row">
            <span>Total</span>
            <span style="color:var(--primary)">${formatCurrency(o.total)}</span>
          </div>
        </div>
      </div>
    `;
    const tel = (o.customer?.tel || '').replace(/\D/g, '');
    document.getElementById('orderWaLink').href = tel
      ? `https://wa.me/55${tel}?text=${encodeURIComponent(`Olá ${o.customer?.nome}! Aqui é a Planeta Celular sobre seu pedido ${o.id.slice(-8)}.`)}`
      : '#';

    document.getElementById('orderModal').hidden = false;
  }

  function closeOrderModal() { document.getElementById('orderModal').hidden = true; }
  document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
  document.getElementById('orderModalCloseBtn').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', e => {
    if (e.target === document.getElementById('orderModal')) closeOrderModal();
  });

  /* ════════════════════════════════════
     INSTAGRAM — Gerador de Post
  ════════════════════════════════════ */
  const instaModal  = document.getElementById('instaModal');
  const instaCaption = document.getElementById('instaCaption');

  async function openInstaModal(p) {
    if (!p) return;

    // Empresa config
    let tenant = {};
    try { tenant = await SettingsDB.get(); } catch { /* ignore */ }
    const emp = {
      nome: tenant.name || 'Planeta Celular',
      telefone: tenant.settings?.whatsapp || tenant.phone || '(11) 99999-9999',
      endereco: tenant.settings?.endereco || '',
    };
    const nomeEmp = emp.nome;
    const tel     = emp.telefone;
    const handle  = '@' + nomeEmp.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

    // Preview de imagem e perfil
    document.getElementById('instaPreviewImg').src = p.image || '';
    document.getElementById('instaProfileName').textContent = handle;

    // Hashtags por categoria + marca
    const hashCat = {
      smartphones:  '#smartphone #celular #mobile',
      capinhas:     '#capinha #casedecelu #acessorios',
      peliculas:    '#pelicula #protecaodacela #vidrotempelado',
      carregadores: '#carregador #cargarapida #turbocarga',
      audio:        '#fone #bluetooth #somqualidade',
      cabos:        '#cabo #acessorios #usbc',
    };
    const hashMarca = p.brand && p.brand !== 'outros' ? `#${p.brand}` : '';
    const hashCond  = { novo: '#novo', seminovo: '#seminovo', usado: '#usado' }[p.condition] || '';
    const hashBase  = hashCat[p.category] || '#celular #eletronico';
    const allHashtags = `${hashBase} ${hashMarca} ${hashCond} #${nomeEmp.replace(/\s+/g,'').toLowerCase()} #assistenciatecnica #lojadecelular`.trim();

    // Preço
    const precoStr = p.oldPrice
      ? `De ${formatCurrency(p.oldPrice)} por apenas ${formatCurrency(p.price)} 🔥`
      : `${formatCurrency(p.price)} 💰`;

    // Condição
    const condStr = { novo: 'Novo', seminovo: 'Seminovo ✨', usado: 'Usado 👍' }[p.condition] || p.condition;

    // Legenda completa
    const caption = [
      `📱 ${p.name}`,
      '',
      p.description ? `${p.description}` : '',
      '',
      `💵 ${precoStr}`,
      `📦 Condição: ${condStr}`,
      '',
      `📍 ${emp.endereco || 'Venha nos visitar!'}`,
      `📲 WhatsApp: ${tel}`,
      '',
      allHashtags,
    ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim();

    instaCaption.value = caption;
    document.getElementById('instaPreviewCaption').textContent = caption;

    // Chips de hashtags clicáveis
    const hashEl = document.getElementById('instaHashtags');
    hashEl.innerHTML = allHashtags.split(' ').filter(Boolean).map(h =>
      `<span style="
        font-size:.7rem;font-weight:700;color:var(--primary);
        background:var(--primary-light);padding:.18rem .5rem;
        border-radius:100px;cursor:pointer;user-select:none;"
        title="Clique para copiar">${h}</span>`
    ).join('');
    hashEl.querySelectorAll('span').forEach(chip => {
      chip.addEventListener('click', () => {
        navigator.clipboard?.writeText(chip.textContent).then(() => toast('Hashtag copiada!'));
      });
    });

    // Sincroniza caption → preview ao editar
    instaCaption.oninput = () => {
      document.getElementById('instaPreviewCaption').textContent = instaCaption.value;
    };

    instaModal.hidden = false;
  }

  // Copiar legenda
  document.getElementById('instaCopyBtn').addEventListener('click', () => {
    const text = instaCaption.value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('Legenda copiada! Cole no Instagram.', 'success'));
    } else {
      instaCaption.select();
      document.execCommand('copy');
      toast('Legenda copiada!', 'success');
    }
  });

  function closeInstaModal() { instaModal.hidden = true; }
  document.getElementById('instaModalClose').addEventListener('click', closeInstaModal);
  document.getElementById('instaModalCancel').addEventListener('click', closeInstaModal);
  instaModal.addEventListener('click', e => { if (e.target === instaModal) closeInstaModal(); });

  /* ════════════════════════════════════
     CLIENTES
  ════════════════════════════════════ */
  let customerSearchVal = '';
  let customerCityVal   = '';

  async function renderCustomersTable() {
    let customers = await CustomerDB.getAll();
    const stats = await CustomerDB.getStats();
    document.getElementById('sidebarCustomerCount').textContent = stats.total;

    // Popula filtro de cidade
    const cities = [...new Set(customers.map(c => c.cidade).filter(Boolean))].sort();
    const cityFilter = document.getElementById('customerCityFilter');
    const citySelected = cityFilter.value;
    cityFilter.innerHTML = '<option value="">Todas as cidades</option>' +
      cities.map(c => `<option value="${c}" ${c === citySelected ? 'selected' : ''}>${c}</option>`).join('');

    if (customerSearchVal) {
      const q = customerSearchVal.toLowerCase();
      customers = customers.filter(c =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.telefone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }
    if (customerCityVal) customers = customers.filter(c => c.cidade === customerCityVal);

    const tbody = document.getElementById('customersTableBody');
    const empty = document.getElementById('customersEmpty');
    tbody.innerHTML = '';
    empty.hidden = customers.length > 0;

    customers.forEach(c => {
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—';
      const tel  = (c.telefone || '').replace(/\D/g, '');
      const tr   = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.title = 'Clique para editar';
      tr.innerHTML = `
        <td class="td-name">
          <strong>${c.nome || '—'}</strong>
          ${c.cpf ? `<small>CPF: ${c.cpf}</small>` : ''}
        </td>
        <td>${c.telefone || '—'}</td>
        <td style="font-size:.82rem;">${c.email || '—'}</td>
        <td>${c.cidade ? `${c.cidade}${c.estado ? '/' + c.estado : ''}` : '—'}</td>
        <td style="font-size:.8rem;color:var(--gray-600)">${date}</td>
        <td style="font-size:.8rem;color:var(--gray-600);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.observacoes || '—'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-customer-btn" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn--wa wa-customer-btn" data-tel="${tel}" data-nome="${c.nome || ''}" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
            <button class="action-btn action-btn--danger delete-customer-btn" data-id="${c.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tr.addEventListener('click', e => {
        if (e.target.closest('.action-btns')) return;
        openCustomerModal(c);
      });
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edit-customer-btn').forEach(btn => {
      btn.addEventListener('click', () => openCustomerModal(customers.find(c => c.id === btn.dataset.id)));
    });
    tbody.querySelectorAll('.wa-customer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tel = btn.dataset.tel;
        if (tel) window.open(`https://wa.me/55${tel}`, '_blank', 'noopener');
        else alert('Telefone não cadastrado.');
      });
    });
    tbody.querySelectorAll('.delete-customer-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este cliente?')) return;
        await CustomerDB.delete(btn.dataset.id);
        renderCustomersTable();
        toast('Cliente excluído.', 'success');
      });
    });
  }

  function openCustomerModal(c) {
    document.getElementById('customerModalTitle').textContent = c ? 'Editar Cliente' : 'Novo Cliente';
    document.getElementById('customerFormId').value          = c?.id || '';
    document.getElementById('customerFormNome').value        = c?.nome || '';
    document.getElementById('customerFormTelefone').value    = c?.telefone || '';
    document.getElementById('customerFormEmail').value       = c?.email || '';
    document.getElementById('customerFormCpf').value         = c?.cpf || '';
    document.getElementById('customerFormNascimento').value  = c?.nascimento || '';
    document.getElementById('customerFormEndereco').value    = c?.endereco || '';
    document.getElementById('customerFormCidade').value      = c?.cidade || '';
    document.getElementById('customerFormEstado').value      = c?.estado || '';
    document.getElementById('customerFormObs').value         = c?.observacoes || '';
    document.getElementById('errCustomerNome').textContent      = '';
    document.getElementById('errCustomerTelefone').textContent  = '';
    document.getElementById('customerModal').hidden = false;
  }

  document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal(null));

  document.getElementById('importCustomersBtn').addEventListener('click', async () => {
    const count = await CustomerDB.importFromOrders();
    renderCustomersTable();
    toast(count > 0 ? `${count} cliente(s) importado(s) dos pedidos.` : 'Nenhum cliente novo encontrado nos pedidos.', 'success');
  });

  document.getElementById('customerSearch').addEventListener('input', function () {
    customerSearchVal = this.value.trim();
    renderCustomersTable();
  });
  document.getElementById('customerCityFilter').addEventListener('change', function () {
    customerCityVal = this.value;
    renderCustomersTable();
  });

  document.getElementById('customerModalSave').addEventListener('click', async () => {
    const nome = document.getElementById('customerFormNome').value.trim();
    const tel  = document.getElementById('customerFormTelefone').value.trim();
    let ok = true;
    document.getElementById('errCustomerNome').textContent     = '';
    document.getElementById('errCustomerTelefone').textContent = '';
    if (!nome) { document.getElementById('errCustomerNome').textContent = 'Nome obrigatório.'; ok = false; }
    if (!tel)  { document.getElementById('errCustomerTelefone').textContent = 'Telefone obrigatório.'; ok = false; }
    if (!ok) return;

    const data = {
      nome,
      telefone: tel,
      email:       document.getElementById('customerFormEmail').value.trim(),
      cpf:         document.getElementById('customerFormCpf').value.trim(),
      nascimento:  document.getElementById('customerFormNascimento').value,
      endereco:    document.getElementById('customerFormEndereco').value.trim(),
      cidade:      document.getElementById('customerFormCidade').value.trim(),
      estado:      document.getElementById('customerFormEstado').value.trim().toUpperCase(),
      observacoes: document.getElementById('customerFormObs').value.trim(),
    };
    const id = document.getElementById('customerFormId').value;
    try {
      if (id) { await CustomerDB.update(id, data); toast('Cliente atualizado!', 'success'); }
      else    { await CustomerDB.add(data);        toast('Cliente cadastrado!', 'success'); }
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    document.getElementById('customerModal').hidden = true;
    renderCustomersTable();
  });

  function closeCustomerModal() { document.getElementById('customerModal').hidden = true; }
  document.getElementById('customerModalClose').addEventListener('click', closeCustomerModal);
  document.getElementById('customerModalCancel').addEventListener('click', closeCustomerModal);
  document.getElementById('customerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('customerModal')) closeCustomerModal();
  });

  /* ════════════════════════════════════
     CAMPANHAS
  ════════════════════════════════════ */
  let campaignSearchVal = '';
  let campaignTypeVal   = '';
  let campaignStatusVal = '';

  function campaignTypeLabel(k) {
    return { whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'E-mail', sms: 'SMS' }[k] || k || '—';
  }
  function campaignTypeIcon(k) {
    return { whatsapp: 'fa-brands fa-whatsapp', instagram: 'fa-brands fa-instagram', email: 'fa-solid fa-envelope', sms: 'fa-solid fa-comment-sms' }[k] || 'fa-solid fa-bullhorn';
  }
  function campaignTypeBadge(k) {
    return { whatsapp: 'badge--green', instagram: 'badge--blue', email: 'badge--gray', sms: 'badge--orange' }[k] || 'badge--gray';
  }
  function campaignStatusLabel(k) {
    return { planejada: 'Planejada', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' }[k] || k || '—';
  }
  function campaignStatusBadge(k) {
    return { planejada: 'badge--gray', ativa: 'badge--green', pausada: 'badge--orange', encerrada: 'badge--red' }[k] || 'badge--gray';
  }

  async function renderCampaignsTable() {
    let campaigns = await CampaignDB.getAll();
    document.getElementById('sidebarCampaignCount').textContent = campaigns.length;

    if (campaignSearchVal) {
      const q = campaignSearchVal.toLowerCase();
      campaigns = campaigns.filter(c => (c.nome || '').toLowerCase().includes(q) || (c.mensagem || '').toLowerCase().includes(q));
    }
    if (campaignTypeVal)   campaigns = campaigns.filter(c => c.tipo === campaignTypeVal);
    if (campaignStatusVal) campaigns = campaigns.filter(c => c.status === campaignStatusVal);

    const tbody = document.getElementById('campaignsTableBody');
    const empty = document.getElementById('campaignsEmpty');
    tbody.innerHTML = '';
    empty.hidden = campaigns.length > 0;

    campaigns.forEach(c => {
      const inicio = c.inicio ? new Date(c.inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
      const fim    = c.fim    ? new Date(c.fim    + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-name">
          <strong>${c.nome || '—'}</strong>
          ${c.mensagem ? `<small style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;display:block;">${c.mensagem.slice(0, 60)}${c.mensagem.length > 60 ? '…' : ''}</small>` : ''}
        </td>
        <td><span class="badge ${campaignTypeBadge(c.tipo)}"><i class="${campaignTypeIcon(c.tipo)}" style="margin-right:.3rem;"></i>${campaignTypeLabel(c.tipo)}</span></td>
        <td><span class="badge ${campaignStatusBadge(c.status)}">${campaignStatusLabel(c.status)}</span></td>
        <td style="font-size:.82rem;">${inicio}</td>
        <td style="font-size:.82rem;">${fim}</td>
        <td style="font-size:.82rem;color:var(--gray-600);">${c.publico || '—'}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-campaign-btn" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            ${c.tipo === 'whatsapp' && c.mensagem
              ? `<button class="action-btn action-btn--wa send-campaign-btn" data-mensagem="${encodeURIComponent(c.mensagem)}" title="Enviar via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>`
              : ''}
            <button class="action-btn action-btn--danger delete-campaign-btn" data-id="${c.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.edit-campaign-btn').forEach(btn => {
      btn.addEventListener('click', () => openCampaignModal(campaigns.find(c => c.id === btn.dataset.id)));
    });
    tbody.querySelectorAll('.send-campaign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = decodeURIComponent(btn.dataset.mensagem);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      });
    });
    tbody.querySelectorAll('.delete-campaign-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir esta campanha?')) return;
        await CampaignDB.delete(btn.dataset.id);
        renderCampaignsTable();
        toast('Campanha excluída.', 'success');
      });
    });
  }

  function openCampaignModal(c) {
    document.getElementById('campaignModalTitle').textContent = c ? 'Editar Campanha' : 'Nova Campanha';
    document.getElementById('campaignFormId').value           = c?.id || '';
    document.getElementById('campaignFormNome').value         = c?.nome || '';
    document.getElementById('campaignFormTipo').value         = c?.tipo || '';
    document.getElementById('campaignFormStatus').value       = c?.status || 'planejada';
    document.getElementById('campaignFormInicio').value       = c?.inicio || '';
    document.getElementById('campaignFormFim').value          = c?.fim || '';
    document.getElementById('campaignFormPublico').value      = c?.publico || '';
    document.getElementById('campaignFormMensagem').value     = c?.mensagem || '';
    document.getElementById('errCampaignNome').textContent    = '';
    document.getElementById('errCampaignTipo').textContent    = '';
    document.getElementById('campaignModal').hidden = false;
  }

  document.getElementById('addCampaignBtn').addEventListener('click', () => openCampaignModal(null));

  document.getElementById('campaignSearch').addEventListener('input', function () {
    campaignSearchVal = this.value.trim();
    renderCampaignsTable();
  });
  document.getElementById('campaignTypeFilter').addEventListener('change', function () {
    campaignTypeVal = this.value;
    renderCampaignsTable();
  });
  document.getElementById('campaignStatusFilter').addEventListener('change', function () {
    campaignStatusVal = this.value;
    renderCampaignsTable();
  });

  document.getElementById('campaignModalSave').addEventListener('click', async () => {
    const nome = document.getElementById('campaignFormNome').value.trim();
    const tipo = document.getElementById('campaignFormTipo').value;
    let ok = true;
    document.getElementById('errCampaignNome').textContent = '';
    document.getElementById('errCampaignTipo').textContent = '';
    if (!nome) { document.getElementById('errCampaignNome').textContent = 'Nome obrigatório.'; ok = false; }
    if (!tipo) { document.getElementById('errCampaignTipo').textContent = 'Selecione o tipo.'; ok = false; }
    if (!ok) return;

    const data = {
      nome,
      tipo,
      status:   document.getElementById('campaignFormStatus').value,
      inicio:   document.getElementById('campaignFormInicio').value,
      fim:      document.getElementById('campaignFormFim').value,
      publico:  document.getElementById('campaignFormPublico').value.trim(),
      mensagem: document.getElementById('campaignFormMensagem').value.trim(),
    };
    const id = document.getElementById('campaignFormId').value;
    try {
      if (id) { await CampaignDB.update(id, data); toast('Campanha atualizada!', 'success'); }
      else    { await CampaignDB.add(data);        toast('Campanha criada!', 'success'); }
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    document.getElementById('campaignModal').hidden = true;
    renderCampaignsTable();
  });

  function closeCampaignModal() { document.getElementById('campaignModal').hidden = true; }
  document.getElementById('campaignModalClose').addEventListener('click', closeCampaignModal);
  document.getElementById('campaignModalCancel').addEventListener('click', closeCampaignModal);
  document.getElementById('campaignModal').addEventListener('click', e => {
    if (e.target === document.getElementById('campaignModal')) closeCampaignModal();
  });

  /* ── Helpers de label ── */
  function paymentLabel(key) {
    return { pix: 'PIX', whatsapp: 'WhatsApp', card: 'Cartão' }[key] || key || '—';
  }
  function statusLabel(key) {
    return { pending: 'Pendente', confirmed: 'Confirmado', delivered: 'Entregue', cancelled: 'Cancelado' }[key] || key;
  }
  function statusBadgeClass(key) {
    return { pending: 'badge--orange', confirmed: 'badge--blue', delivered: 'badge--green', cancelled: 'badge--red' }[key] || 'badge--gray';
  }

  /* ── Categorias da loja (filtro + form de produto) ── */
  async function populateCategorySelects() {
    let cats = [];
    try { cats = await StoreCategoryDB.getAll(); } catch { /* ignore */ }
    const options = cats.map(c => `<option value="${c.slug}">${c.nome}</option>`).join('');
    const filterSel = document.getElementById('categoryFilter');
    const formSel = document.getElementById('formCategory');
    if (filterSel) filterSel.insertAdjacentHTML('beforeend', options);
    if (formSel) formSel.insertAdjacentHTML('beforeend', options);
  }

  /* ── Init ── */
  await populateCategorySelects();
  await showSection('dashboard');
});
