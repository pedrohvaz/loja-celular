/* ============================================================
   PLANETA CELULAR — vendas.js
   Painel de Vendas (POS)
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  AuthDB.requireAuth();

  /* ── Role ── */
  const isAdmin = AuthDB.isAdmin();
  document.getElementById('topbarUserName').textContent = AuthDB.getNome();
  if (!isAdmin) {
    const finNav = document.getElementById('financeiroNav');
    if (finNav) finNav.style.display = 'none';
  }

  /* ── Sidebar mobile ── */
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

  function fmtCur(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
  function fmtDt(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'; }

  const PGTO_LABELS = {
    dinheiro: 'Dinheiro', pix: 'PIX',
    cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito',
    transferencia: 'Transferência',
  };

  /* ════════════════════════════════════
     CAIXA — verificação e abertura
  ════════════════════════════════════ */
  async function renderCaixaBanner() {
    const aberto = await FinDB.getCaixaAberto();
    const banner = document.getElementById('vendaCaixaBanner');
    const wrap   = document.getElementById('posWrap');

    if (aberto) {
      const hora = new Date(aberto.abertura_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      banner.innerHTML = `
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:.65rem 1.25rem;display:flex;align-items:center;gap:.75rem;">
          <i class="fa-solid fa-lock-open" style="color:#16A34A;font-size:1.05rem;"></i>
          <span style="font-size:.85rem;color:#15803D;font-weight:600;">
            Caixa aberto — saldo inicial: <strong>${fmtCur(aberto.saldo_abertura)}</strong>
          </span>
          <span style="font-size:.76rem;color:#166534;margin-left:auto;opacity:.75;">Aberto às ${hora}</span>
        </div>`;
      wrap.style.display = '';
    } else {
      banner.innerHTML = `
        <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:1.1rem 1.5rem;display:flex;align-items:center;gap:1rem;">
          <i class="fa-solid fa-lock" style="color:#DC2626;font-size:1.5rem;flex-shrink:0;"></i>
          <div>
            <div style="font-weight:700;color:#991B1B;font-size:.92rem;">Caixa fechado</div>
            <div style="font-size:.8rem;color:#B91C1C;margin-top:.1rem;">Abra o caixa antes de realizar vendas.</div>
          </div>
          <button id="btnAbrirCaixaVenda" style="margin-left:auto;background:#16A34A;color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-weight:700;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap;font-family:inherit;">
            <i class="fa-solid fa-lock-open"></i> Abrir Caixa
          </button>
        </div>`;
      wrap.style.display = 'none';
      document.getElementById('btnAbrirCaixaVenda').addEventListener('click', openAbrirModal);
    }
  }

  /* ── Modal abrir caixa ── */
  function openAbrirModal() {
    document.getElementById('aberturaSaldo').value = '';
    document.getElementById('aberturaObs').value   = '';
    document.getElementById('abrirCaixaModal').hidden = false;
    setTimeout(() => document.getElementById('aberturaSaldo').focus(), 50);
  }
  function closeAbrirModal() { document.getElementById('abrirCaixaModal').hidden = true; }

  document.getElementById('abrirModalClose').addEventListener('click', closeAbrirModal);
  document.getElementById('abrirModalCancel').addEventListener('click', closeAbrirModal);
  document.getElementById('abrirCaixaModal').addEventListener('click', e => {
    if (e.target === document.getElementById('abrirCaixaModal')) closeAbrirModal();
  });

  document.getElementById('abrirConfirm').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('aberturaSaldo').value);
    if (isNaN(val) || val < 0) { toast('Informe o valor de abertura.', 'error'); return; }
    const obs = document.getElementById('aberturaObs').value.trim();
    await FinDB.abrirCaixa(val, obs);
    closeAbrirModal();
    await renderCaixaBanner();
    toast('Caixa aberto! Pode realizar vendas.', 'success');
  });

  /* ════════════════════════════════════
     PRODUTOS
  ════════════════════════════════════ */
  let allProducts = [];
  let filterCat   = '';
  let filterSearch = '';

  async function loadProducts() {
    allProducts = (await ProductDB.getAll()).filter(p => p.inStock);
  }

  function getFiltered() {
    let list = allProducts;
    if (filterCat)    list = list.filter(p => p.category === filterCat);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
    }
    return list;
  }

  function renderCats() {
    const cats = [...new Set(allProducts.map(p => p.category))];
    const el = document.getElementById('posCats');
    el.innerHTML = `<button class="pos-cat-btn ${!filterCat ? 'active' : ''}" data-cat="">Todos</button>` +
      cats.map(c => `<button class="pos-cat-btn ${filterCat === c ? 'active' : ''}" data-cat="${c}">${categoryLabel(c)}</button>`).join('');

    el.querySelectorAll('.pos-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => { filterCat = btn.dataset.cat; renderCats(); renderGrid(); });
    });
  }

  function renderGrid() {
    const list = getFiltered();
    const el = document.getElementById('posGrid');

    if (!list.length) {
      el.innerHTML = '<div class="pos-grid-empty"><i class="fa-solid fa-box-open"></i><p>Nenhum produto encontrado</p></div>';
      return;
    }

    el.innerHTML = list.map(p => `
      <div class="pos-prod-card">
        <div class="pos-prod-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.style.display='none'" />
        </div>
        <div class="pos-prod-name" title="${p.name}">${p.name}</div>
        <div class="pos-prod-price">${fmtCur(p.price)}</div>
        <button class="pos-prod-add" data-id="${p.id}" title="Adicionar ao carrinho">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    `).join('');

    el.querySelectorAll('.pos-prod-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = allProducts.find(p => p.id === btn.dataset.id);
        if (prod) addToCart(prod);
      });
    });
  }

  document.getElementById('posSearch').addEventListener('input', function () {
    filterSearch = this.value.trim();
    renderGrid();
  });

  /* ════════════════════════════════════
     CARRINHO
  ════════════════════════════════════ */
  let cart = [];

  function addToCart(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) { existing.qty += 1; }
    else { cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, image: product.image, category: product.category }); }
    renderCart();
    toast(`${product.name} adicionado`, 'success');
  }

  function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
  }

  function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) removeFromCart(id);
    else renderCart();
  }

  function getSubtotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
  function getDesconto()  { return Math.min(parseFloat(document.getElementById('posDesconto').value) || 0, getSubtotal()); }
  function getTotal()     { return Math.max(0, getSubtotal() - getDesconto()); }

  function renderCart() {
    const empty  = document.getElementById('posCartEmpty');
    const footer = document.getElementById('posCartFooter');
    const list   = document.getElementById('posCartItems');

    if (!cart.length) {
      empty.style.display  = '';
      footer.style.display = 'none';
      return;
    }
    empty.style.display  = 'none';
    footer.style.display = '';

    list.querySelectorAll('.pos-cart-item').forEach(el => el.remove());

    cart.forEach(item => {
      const div = document.createElement('div');
      div.className = 'pos-cart-item';
      div.innerHTML = `
        <div class="pos-cart-item__name" title="${item.name}">${item.name}</div>
        <div class="pos-cart-item__controls">
          <button class="pos-qty-btn" data-id="${item.id}" data-delta="-1">−</button>
          <span class="pos-qty-val">${item.qty}</span>
          <button class="pos-qty-btn" data-id="${item.id}" data-delta="1">+</button>
        </div>
        <div class="pos-cart-item__price">${fmtCur(item.price * item.qty)}</div>
        <button class="pos-cart-item__remove" data-id="${item.id}" title="Remover">
          <i class="fa-solid fa-trash"></i>
        </button>`;
      list.appendChild(div);
    });

    list.querySelectorAll('.pos-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => changeQty(btn.dataset.id, parseInt(btn.dataset.delta)));
    });
    list.querySelectorAll('.pos-cart-item__remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });

    updateTotals();
  }

  function updateTotals() {
    const sub  = getSubtotal();
    const desc = getDesconto();
    const total = getTotal();

    document.getElementById('posSubtotal').textContent    = fmtCur(sub);
    document.getElementById('posDescontoRow').style.display = desc > 0 ? '' : 'none';
    document.getElementById('posDescontoVal').textContent  = '− ' + fmtCur(desc);
    document.getElementById('posTotal').textContent        = fmtCur(total);

    updateTroco();
  }

  document.getElementById('posDesconto').addEventListener('input', updateTotals);

  /* ── Limpar carrinho ── */
  document.getElementById('posClearCart').addEventListener('click', () => {
    if (!cart.length) return;
    if (!confirm('Limpar o carrinho?')) return;
    cart = [];
    renderCart();
  });

  /* ════════════════════════════════════
     FORMA DE PAGAMENTO
  ════════════════════════════════════ */
  let selectedPgto = 'dinheiro';

  document.getElementById('posPgtoBtns').addEventListener('click', e => {
    const btn = e.target.closest('.pos-pgto-btn');
    if (!btn) return;
    document.querySelectorAll('.pos-pgto-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPgto = btn.dataset.pgto;
    const trocoSec = document.getElementById('posTrocoSection');
    trocoSec.style.display = selectedPgto === 'dinheiro' ? '' : 'none';
    document.getElementById('posRecebido').value = '';
    document.getElementById('posTrocoDisplay').innerHTML = '';
  });

  function updateTroco() {
    if (selectedPgto !== 'dinheiro') return;
    const recebido = parseFloat(document.getElementById('posRecebido').value) || 0;
    const total    = getTotal();
    const trocoEl  = document.getElementById('posTrocoDisplay');
    if (!recebido) { trocoEl.innerHTML = ''; return; }
    const troco = recebido - total;
    trocoEl.innerHTML = troco >= 0
      ? `<span style="color:#15803D;font-weight:700;font-size:.88rem;"><i class="fa-solid fa-coins"></i> Troco: ${fmtCur(troco)}</span>`
      : `<span style="color:#DC2626;font-weight:600;font-size:.82rem;"><i class="fa-solid fa-triangle-exclamation"></i> Falta ${fmtCur(-troco)}</span>`;
  }

  document.getElementById('posRecebido').addEventListener('input', updateTroco);

  /* ════════════════════════════════════
     FINALIZAR VENDA
  ════════════════════════════════════ */
  document.getElementById('posFinalizar').addEventListener('click', async () => {
    if (!(await FinDB.getCaixaAberto())) {
      toast('Abra o caixa antes de realizar uma venda.', 'error');
      renderCaixaBanner();
      return;
    }
    if (!cart.length) {
      toast('Adicione produtos ao carrinho.', 'error');
      return;
    }

    const desc      = getDesconto();
    const total     = getTotal();
    const cliente   = document.getElementById('posCliente').value.trim() || 'Venda Balcão';
    const recebido  = parseFloat(document.getElementById('posRecebido').value) || 0;

    if (selectedPgto === 'dinheiro' && recebido > 0 && recebido < total) {
      toast('Valor recebido inferior ao total.', 'error');
      return;
    }

    const troco = selectedPgto === 'dinheiro' && recebido >= total ? recebido - total : null;

    const finalizarBtn = document.getElementById('posFinalizar');
    finalizarBtn.disabled = true;
    let order;
    try {
      order = await SalesDB.checkout({
        items: cart.map(i => ({ ...i })),
        discount: desc,
        payment: selectedPgto,
        customerName: cliente,
      });
    } catch (e) {
      toast(e.message, 'error');
      renderCaixaBanner();
      return;
    } finally {
      finalizarBtn.disabled = false;
    }

    renderRecibo(order, troco);

    cart = [];
    document.getElementById('posDesconto').value  = '0';
    document.getElementById('posRecebido').value  = '';
    document.getElementById('posCliente').value   = '';
    document.getElementById('posTrocoDisplay').innerHTML = '';
    renderCart();
  });

  /* ════════════════════════════════════
     RECIBO
  ════════════════════════════════════ */
  function renderRecibo(order, troco) {
    const now = new Date().toLocaleString('pt-BR');

    document.getElementById('reciboContent').innerHTML = `
      <div style="text-align:center;padding:.5rem 0 1rem;">
        <i class="fa-solid fa-circle-check" style="font-size:2.2rem;color:#16A34A;"></i>
        <div style="font-weight:800;font-size:1.05rem;color:#15803D;margin-top:.4rem;">Venda concluída!</div>
        <div style="font-size:.75rem;color:var(--gray-400);margin-top:.15rem;">${now} · ${order.id.slice(-8).toUpperCase()}</div>
      </div>

      <div style="border:1px solid var(--gray-200);border-radius:10px;overflow:hidden;margin-bottom:.85rem;">
        <div style="background:var(--gray-50);padding:.5rem 1rem;font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--gray-400);letter-spacing:.07em;">Itens</div>
        ${order.items.map(i => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.45rem 1rem;border-top:1px solid var(--gray-100);font-size:.83rem;">
            <span style="color:var(--gray-700);">${i.name} <span style="color:var(--gray-400);">×${i.qty}</span></span>
            <span style="font-weight:700;color:var(--gray-900);">${fmtCur(i.price * i.qty)}</span>
          </div>`).join('')}
      </div>

      <div style="border:1px solid var(--gray-200);border-radius:10px;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;padding:.45rem 1rem;font-size:.83rem;border-bottom:1px solid var(--gray-100);">
          <span style="color:var(--gray-500);">Subtotal</span><span>${fmtCur(order.subtotal)}</span>
        </div>
        ${order.desconto > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:.45rem 1rem;font-size:.83rem;border-bottom:1px solid var(--gray-100);color:#DC2626;">
          <span>Desconto</span><span>− ${fmtCur(order.desconto)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:.6rem 1rem;font-size:1.05rem;font-weight:800;">
          <span>Total</span><span style="color:#16A34A;">${fmtCur(order.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:.4rem 1rem;font-size:.8rem;border-top:1px solid var(--gray-100);color:var(--gray-500);">
          <span>Pagamento</span><span style="font-weight:600;">${PGTO_LABELS[selectedPgto] || selectedPgto}</span>
        </div>
        ${troco !== null ? `
        <div style="display:flex;justify-content:space-between;padding:.4rem 1rem;font-size:.82rem;border-top:1px solid var(--gray-100);color:#15803D;font-weight:700;">
          <span>Troco</span><span>${fmtCur(troco)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:.4rem 1rem;font-size:.8rem;border-top:1px solid var(--gray-100);color:var(--gray-400);">
          <span>Cliente</span><span>${order.customer?.nome || 'Balcão'}</span>
        </div>
      </div>
    `;

    document.getElementById('reciboModal').hidden = false;
  }

  document.getElementById('reciboClose').addEventListener('click', () => { document.getElementById('reciboModal').hidden = true; });
  document.getElementById('reciboNova').addEventListener('click', () => { document.getElementById('reciboModal').hidden = true; });
  document.getElementById('reciboPrint').addEventListener('click', () => window.print());

  /* ════════════════════════════════════
     INIT
  ════════════════════════════════════ */
  try { await StoreCategoryDB.getAll(); } catch { /* ignore */ }
  await loadProducts();
  renderCats();
  renderGrid();
  await renderCaixaBanner();
  renderCart();
});
