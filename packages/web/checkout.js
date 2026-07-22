/* ============================================================
   PLANETA CELULAR — checkout.js
============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  let currentStep = 1;
  let selectedShipping = { label: 'Retirar na loja', price: 0 };
  let selectedPayment  = 'pix';
  let savedCustomer    = {};
  let placedOrderId    = '';

  /* ── Helpers de step ── */
  function goTo(n) {
    document.querySelectorAll('.checkout-step').forEach((s, i) => {
      s.classList.toggle('active', i + 1 === n);
    });
    // Update indicators
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i + 1 < n)  el.classList.add('done');
      if (i + 1 === n) el.classList.add('active');
    });
    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSummary();
  }

  /* ── Render cart items (step 1) ── */
  function renderCartItems() {
    const items    = CartDB.getItems();
    const listEl   = document.getElementById('cartItemsList');
    const emptyEl  = document.getElementById('cartEmpty');
    const actEl    = document.getElementById('step1Actions');
    listEl.innerHTML = '';

    if (!items.length) {
      emptyEl.hidden = false;
      actEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    actEl.hidden = false;

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img class="cart-item__img" src="${item.image}" alt="${item.name}" />
        <div class="cart-item__info">
          <h4>${item.name}</h4>
          <p>${item.description || ''}</p>
          <div class="cart-item__controls">
            <button class="qty-btn" data-action="dec" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
            <button class="remove-btn" data-id="${item.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="cart-item__price">${formatCurrency(item.price * item.qty)}</div>
      `;
      listEl.appendChild(div);
    });

    // Eventos de qty / remove
    listEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = btn.dataset.id;
        const item = CartDB.getItems().find(i => i.id === id);
        if (!item) return;
        CartDB.updateQty(id, item.qty + (btn.dataset.action === 'inc' ? 1 : -1));
        renderCartItems();
        renderSummary();
      });
    });
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        CartDB.removeItem(btn.dataset.id);
        renderCartItems();
        renderSummary();
      });
    });
  }

  /* ── Render summary (sidebar) ── */
  function renderSummary() {
    const items    = CartDB.getItems();
    const itemsEl  = document.getElementById('summaryItems');
    const totalsEl = document.getElementById('summaryTotals');

    itemsEl.innerHTML = items.map(i => `
      <div class="summary-item">
        <span class="summary-item__name">${i.name}</span>
        <span class="summary-item__qty">×${i.qty}</span>
        <span class="summary-item__price">${formatCurrency(i.price * i.qty)}</span>
      </div>
    `).join('');

    const subtotal = CartDB.getSubtotal();
    const ship     = selectedShipping.price;
    const total    = subtotal + ship;

    totalsEl.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="summary-row"><span>Frete</span><span>${ship === 0 ? 'Grátis' : formatCurrency(ship)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
    `;
  }

  /* ── Validação step 2 ── */
  function validateCustomer() {
    const fields = [
      { id: 'cNome',    min: 3 },
      { id: 'cCpf',     min: 11 },
      { id: 'cEmail',   email: true },
      { id: 'cTel',     min: 8 },
      { id: 'cCep',     min: 8 },
      { id: 'cEndereco', min: 5 },
      { id: 'cCidade',  min: 2 },
    ];
    let ok = true;
    fields.forEach(f => {
      const el  = document.getElementById(f.id);
      const val = el.value.trim();
      let err   = '';
      if (!val) err = 'Campo obrigatório.';
      else if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) err = 'E-mail inválido.';
      else if (f.min && val.replace(/\D/g, '').length < f.min && f.id === 'cTel') err = 'Telefone inválido.';
      el.classList.toggle('error', !!err);
      if (err) ok = false;
    });
    return ok;
  }

  /* ── Montar mensagem WhatsApp ── */
  function buildWaMessage() {
    const items = CartDB.getItems();
    const subtotal = CartDB.getSubtotal();
    const total = subtotal + selectedShipping.price;
    const lines = [
      `🛒 *NOVO PEDIDO — Planeta Celular*`,
      `Pedido: *${placedOrderId}*`,
      ``,
      `*Cliente:* ${savedCustomer.nome}`,
      `*Telefone:* ${savedCustomer.tel}`,
      `*E-mail:* ${savedCustomer.email}`,
      `*Endereço:* ${savedCustomer.endereco}, ${savedCustomer.cidade}`,
      ``,
      `*Itens:*`,
      ...items.map(i => `• ${i.name} x${i.qty} — ${formatCurrency(i.price * i.qty)}`),
      ``,
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Frete (${selectedShipping.label}): ${selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)}`,
      `*Total: ${formatCurrency(total)}*`,
      ``,
      `*Pagamento:* ${selectedPayment === 'pix' ? 'PIX' : selectedPayment === 'whatsapp' ? 'A combinar' : 'Cartão'}`,
    ];
    return encodeURIComponent(lines.join('\n'));
  }

  /* ── Finalizar pedido ── */
  async function finishOrder() {
    const finishBtn = document.getElementById('finishBtn');
    finishBtn.disabled = true;
    let order;
    try {
      const items = CartDB.getItems();
      order = await OrderDB.add({
        customer: savedCustomer,
        items,
        subtotal: CartDB.getSubtotal(),
        shipping: selectedShipping,
        total: CartDB.getSubtotal() + selectedShipping.price,
        payment: selectedPayment,
      });
    } catch (e) {
      finishBtn.disabled = false;
      alert('Não foi possível finalizar o pedido: ' + e.message);
      return;
    }
    placedOrderId = order.id;
    finishBtn.disabled = false;
    CartDB.clear();

    document.getElementById('confirmName').textContent = savedCustomer.nome;
    document.getElementById('confirmOrderId').textContent = placedOrderId;
    document.getElementById('confirmPhone').textContent = savedCustomer.tel;
    document.getElementById('confirmWaBtn').href = `https://wa.me/5511999999999?text=${buildWaMessage()}`;

    goTo(4);

    // Abre WhatsApp automaticamente se método WA
    if (selectedPayment === 'whatsapp') {
      setTimeout(() => { window.open(document.getElementById('confirmWaBtn').href, '_blank', 'noopener'); }, 800);
    }
  }

  /* ── Navegação de steps ── */
  document.getElementById('toStep2Btn').addEventListener('click', () => {
    if (!CartDB.getItems().length) return;
    goTo(2);
  });

  document.getElementById('backToStep1').addEventListener('click', () => goTo(1));

  document.getElementById('toStep3Btn').addEventListener('click', () => {
    if (!validateCustomer()) return;
    // Salvar dados do cliente
    savedCustomer = {
      nome:      document.getElementById('cNome').value.trim(),
      cpf:       document.getElementById('cCpf').value.trim(),
      email:     document.getElementById('cEmail').value.trim(),
      tel:       document.getElementById('cTel').value.trim(),
      cep:       document.getElementById('cCep').value.trim(),
      endereco:  document.getElementById('cEndereco').value.trim(),
      complemento: document.getElementById('cComplemento').value.trim(),
      cidade:    document.getElementById('cCidade').value.trim(),
    };
    // Shipping selecionado
    const shipEl = document.querySelector('[name="shipping"]:checked');
    if (shipEl) {
      const shipMap = { retirada: { label: 'Retirar na loja', price: 0 }, motoboy: { label: 'Motoboy local', price: 15 }, correios: { label: 'Correios', price: 28 } };
      selectedShipping = shipMap[shipEl.value];
    }
    goTo(3);
  });

  document.getElementById('backToStep2').addEventListener('click', () => goTo(2));

  document.getElementById('finishBtn').addEventListener('click', () => finishOrder());

  /* ── Payment tabs ── */
  document.querySelectorAll('.pay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      selectedPayment = tab.dataset.tab;
    });
  });

  /* ── Copiar chave PIX ── */
  document.getElementById('copyPixBtn').addEventListener('click', () => {
    navigator.clipboard.writeText('11999999999').then(() => {
      const btn = document.getElementById('copyPixBtn');
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
      setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar'; }, 2000);
    });
  });

  /* ── Máscaras de input ── */
  function maskCPF(el) {
    el.addEventListener('input', () => {
      let v = el.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2');
      el.value = v;
    });
  }
  function maskPhone(el) {
    el.addEventListener('input', () => {
      let v = el.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
      else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
      el.value = v;
    });
  }
  function maskCEP(el) {
    el.addEventListener('input', () => {
      let v = el.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
      el.value = v;
    });
  }
  function maskCard(el) {
    el.addEventListener('input', () => {
      let v = el.value.replace(/\D/g, '').slice(0, 16);
      el.value = v.match(/.{1,4}/g)?.join(' ') || v;
    });
  }
  function maskExpiry(el) {
    el.addEventListener('input', () => {
      let v = el.value.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`;
      el.value = v;
    });
  }
  maskCPF(document.getElementById('cCpf'));
  maskPhone(document.getElementById('cTel'));
  maskCEP(document.getElementById('cCep'));
  maskCard(document.getElementById('cardNumber'));
  maskExpiry(document.getElementById('cardExpiry'));

  /* ── Init ── */
  renderCartItems();
  renderSummary();
  goTo(1);
});
