/* ============================================================
   PLANETA CELULAR — produtos.js
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  const grid       = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');
  const countEl    = document.getElementById('productCount');

  /* ── Badge do carrinho ── */
  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = CartDB.getCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  updateCartBadge();
  window.addEventListener('cart:updated', updateCartBadge);

  /* ── Toast de confirmação ── */
  let toastEl = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
        background:#0F172A;color:#fff;padding:.75rem 1.25rem;
        border-radius:12px;font-size:.88rem;font-weight:600;
        display:flex;align-items:center;gap:.5rem;
        box-shadow:0 8px 24px rgba(0,0,0,.2);
        border-left:4px solid #22C55E;
        animation:fadeIn .25s ease;
      `;
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<i class="fa-solid fa-cart-shopping" style="color:#22C55E"></i> ${msg}`;
    toastEl.hidden = false;
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => { toastEl.hidden = true; }, 2500);
  }

  /* ── Renderizar cards dinamicamente via ProductDB (catálogo público) ── */
  let productsCache = [];
  async function renderCards() {
    const products = await ProductDB.getAllPublic();
    productsCache = products;
    // Remove cards estáticos e substitui pelos do DB
    grid.innerHTML = '';
    products.forEach(p => {
      const condBadge = { novo: '', seminovo: 'pcard__badge--green', usado: 'pcard__badge--blue' }[p.condition] || '';
      const condLabel = conditionLabel(p.condition);
      const div = document.createElement('div');
      div.className = 'pcard';
      div.dataset.category = p.category;
      div.dataset.condicao  = p.condition;
      div.dataset.marca     = p.brand;
      div.dataset.price     = p.price;
      div.innerHTML = `
        <div class="pcard__img">
          <img src="${p.image}" alt="${p.name}" loading="lazy" />
          <span class="pcard__badge ${condBadge}">${condLabel}</span>
          ${!p.inStock ? '<span class="pcard__badge pcard__badge--blue" style="top:auto;bottom:.65rem;left:.65rem">Sem estoque</span>' : ''}
          <div class="pcard__actions">
            <button class="add-cart-icon" data-id="${p.id}" title="Adicionar ao carrinho" ${!p.inStock ? 'disabled' : ''}>
              <i class="fa-solid fa-cart-plus"></i>
            </button>
          </div>
        </div>
        <div class="pcard__body">
          <span class="pcard__category">${categoryLabel(p.category)}</span>
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="pcard__price">
            ${p.oldPrice ? `<span class="price-old">${formatCurrency(p.oldPrice)}</span>` : ''}
            <span class="price-new">${formatCurrency(p.price)}</span>
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.25rem">
            <button class="btn btn--primary btn--sm add-cart-btn" data-id="${p.id}" style="flex:1" ${!p.inStock ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
              <i class="fa-solid fa-cart-plus"></i> ${p.inStock ? 'Adicionar' : 'Indisponível'}
            </button>
            <a href="https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Tenho interesse no produto: ${p.name}`)}"
               class="btn btn--whatsapp btn--sm" target="_blank" rel="noopener" title="WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
          </div>
        </div>
      `;
      grid.appendChild(div);
    });

    // Eventos de carrinho
    grid.querySelectorAll('.add-cart-btn, .add-cart-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const product = productsCache.find(p => p.id === id);
        if (!product || !product.inStock) return;
        CartDB.addItem(product, 1);
        showToast(`"${product.name}" adicionado ao carrinho!`);
        updateCartBadge();
      });
    });

    return [...grid.querySelectorAll('.pcard')];
  }

  /* ── Estado dos filtros ── */
  const state = {
    search:    '',
    categoria: 'all',
    preco:     'all',
    condicoes: new Set(),
    marcas:    new Set(),
    sort:      'default',
  };

  /* ── Categorias dinâmicas (vindas do gerenciamento em Configurações) ── */
  async function populateCategoryFilters() {
    let cats = [];
    try { cats = await StoreCategoryDB.getAllPublic(); } catch { /* ignore */ }
    document.getElementById('categoriaFilterList').innerHTML = cats.map(c => `
      <label class="filter-check">
        <input type="radio" name="categoria" value="${c.slug}" /> ${c.nome}
      </label>
    `).join('');
    bindCategoriaRadios();
  }

  function bindCategoriaRadios() {
    document.querySelectorAll('[name="categoria"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state.categoria = radio.value;
        applyFilters();
      });
    });
  }

  await populateCategoryFilters();
  let cards = await renderCards();

  /* ── Aplicar filtros e ordenação ── */
  function applyFilters() {
    let visible = cards.filter(card => {
      const cat    = card.dataset.category;
      const cond   = card.dataset.condicao;
      const marca  = card.dataset.marca;
      const price  = parseFloat(card.dataset.price) || 0;
      const text   = card.querySelector('h3').textContent.toLowerCase()
                   + card.querySelector('p').textContent.toLowerCase()
                   + card.querySelector('.pcard__category').textContent.toLowerCase();

      if (state.search && !text.includes(state.search)) return false;
      if (state.categoria !== 'all' && cat !== state.categoria) return false;
      if (state.condicoes.size && !state.condicoes.has(cond)) return false;
      if (state.marcas.size && !state.marcas.has(marca)) return false;

      if (state.preco !== 'all') {
        const [min, max] = state.preco.split('-').map(Number);
        if (state.preco.endsWith('+')) {
          if (price < 1000) return false;
        } else {
          if (price < min || price > max) return false;
        }
      }
      return true;
    });

    // Ordenação
    if (state.sort === 'price-asc')  visible.sort((a, b) => +a.dataset.price - +b.dataset.price);
    if (state.sort === 'price-desc') visible.sort((a, b) => +b.dataset.price - +a.dataset.price);
    if (state.sort === 'name-asc')   visible.sort((a, b) =>
      a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent, 'pt-BR'));

    // Mostrar / esconder
    const visibleSet = new Set(visible);
    cards.forEach(c => c.classList.toggle('hidden', !visibleSet.has(c)));

    // Re-ordenar DOM
    visible.forEach(c => grid.appendChild(c));

    countEl.textContent = visible.length;
    emptyState.hidden = visible.length > 0;
  }

  /* ── Busca ── */
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');

  searchInput.addEventListener('input', () => {
    state.search = searchInput.value.trim().toLowerCase();
    clearSearch.hidden = !state.search;
    applyFilters();
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    state.search = '';
    clearSearch.hidden = true;
    applyFilters();
    searchInput.focus();
  });

  /* ── Preço (radio) ── */
  document.querySelectorAll('[name="preco"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.preco = radio.value;
      applyFilters();
    });
  });

  /* ── Condição (checkbox) ── */
  document.querySelectorAll('[name="condicao"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? state.condicoes.add(cb.value) : state.condicoes.delete(cb.value);
      applyFilters();
    });
  });

  /* ── Marca (checkbox) ── */
  document.querySelectorAll('[name="marca"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? state.marcas.add(cb.value) : state.marcas.delete(cb.value);
      applyFilters();
    });
  });

  /* ── Ordenação ── */
  document.getElementById('sortSelect').addEventListener('change', function () {
    state.sort = this.value;
    applyFilters();
  });

  /* ── Limpar filtros ── */
  document.getElementById('clearFilters').addEventListener('click', () => {
    state.search    = '';
    state.categoria = 'all';
    state.preco     = 'all';
    state.condicoes.clear();
    state.marcas.clear();
    state.sort      = 'default';
    searchInput.value = '';
    clearSearch.hidden = true;
    document.querySelectorAll('[name="categoria"]')[0].checked = true;
    document.querySelectorAll('[name="preco"]')[0].checked = true;
    document.querySelectorAll('[name="condicao"], [name="marca"]').forEach(cb => cb.checked = false);
    document.getElementById('sortSelect').value = 'default';
    applyFilters();
  });

  /* ── Toggle grid / lista ── */
  document.getElementById('viewGrid').addEventListener('click', function () {
    grid.classList.remove('list-view');
    this.classList.add('active');
    document.getElementById('viewList').classList.remove('active');
  });
  document.getElementById('viewList').addEventListener('click', function () {
    grid.classList.add('list-view');
    this.classList.add('active');
    document.getElementById('viewGrid').classList.remove('active');
  });

  /* ── Sidebar mobile (gaveta) ── */
  const sidebar      = document.getElementById('sidebar');
  const filterToggle = document.getElementById('filterToggle');

  filterToggle.addEventListener('click', () => sidebar.classList.add('open'));
  sidebar.addEventListener('click', e => {
    if (e.target === sidebar) sidebar.classList.remove('open');
  });

  /* ── Navbar hamburger ── */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
  }));

  /* ── Scroll: navbar shadow + scroll-top ── */
  const scrollTopBtn = document.getElementById('scrollTop');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Inicialização ── */
  applyFilters();
});
