/* ============================================================
   PLANETA CELULAR — os-form.js
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
    toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
  }

  /* ── Edit mode: load existing OS ── */
  const params = new URLSearchParams(location.search);
  const editId = params.get('id');
  let editOs = null;

  if (editId) {
    editOs = await OSDB.getById(editId);
    if (editOs) {
      document.getElementById('topbarFormTitle').textContent = editOs.numero_os;
      document.getElementById('formPageTitle').textContent   = 'Editar OS — ' + editOs.numero_os;
      document.getElementById('saveBtnLabel').textContent    = 'Salvar Alterações';
      populateForm(editOs);
    }
  }

  /* ── Pre-fill date ── */
  if (!editOs) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('f_data_entrada').value = now.toISOString().slice(0, 16);
  }

  /* ── Populate form for editing ── */
  function populateForm(os) {
    document.getElementById('f_cliente_nome').value      = os.cliente_nome     || '';
    document.getElementById('f_cliente_cpf').value       = os.cliente_cpf      || '';
    document.getElementById('f_cliente_telefone').value  = os.cliente_telefone || '';
    document.getElementById('f_cliente_email').value     = os.cliente_email    || '';
    document.getElementById('f_cliente_endereco').value  = os.cliente_endereco || '';

    document.getElementById('f_aparelho_marca').value   = os.aparelho_marca  || '';
    document.getElementById('f_aparelho_modelo').value  = os.aparelho_modelo || '';
    document.getElementById('f_aparelho_cor').value     = os.aparelho_cor    || '';
    document.getElementById('f_aparelho_imei').value    = os.aparelho_imei   || '';
    document.getElementById('f_aparelho_senha').value   = os.aparelho_senha  || '';
    document.getElementById('f_condicoes_visuais').value = os.condicoes_visuais || '';

    (os.acessorios || []).forEach(val => {
      document.querySelectorAll('[name="acessorio"]').forEach(cb => {
        if (cb.value === val) cb.checked = true;
      });
    });

    document.getElementById('f_problema_relatado').value     = os.problema_relatado    || '';
    document.getElementById('f_tecnico').value               = os.tecnico              || '';
    document.getElementById('f_prioridade').value            = os.prioridade           || 'normal';
    document.getElementById('f_valor_estimado').value        = os.valor_estimado       || '';
    document.getElementById('f_observacoes_internas').value  = os.observacoes_internas || '';

    if (os.data_entrada) {
      const d = new Date(os.data_entrada);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      document.getElementById('f_data_entrada').value = d.toISOString().slice(0, 16);
    }
    if (os.previsao_entrega) {
      const d = new Date(os.previsao_entrega);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      document.getElementById('f_previsao_entrega').value = d.toISOString().slice(0, 16);
    }
  }

  /* ════════════════════════════════════
     AUTOCOMPLETE DE CLIENTE
  ════════════════════════════════════ */

  /* Preenche todos os campos com dados de um cliente */
  function fillCustomerFields(c) {
    if (!c) return;
    document.getElementById('f_cliente_nome').value     = c.nome      || '';
    document.getElementById('f_cliente_telefone').value = c.telefone  || '';
    document.getElementById('f_cliente_cpf').value      = c.cpf       || '';
    document.getElementById('f_cliente_email').value    = c.email     || '';
    document.getElementById('f_cliente_endereco').value = c.endereco  || '';
    document.getElementById('clientSearchResult').innerHTML =
      `<span style="color:#15803D"><i class="fa-solid fa-circle-check"></i> Cliente encontrado: <strong>${c.nome}</strong></span>`;
  }

  /* Cria dropdown de autocomplete abaixo de um input */
  function createDropdown(input) {
    const wrap = input.closest('.form-group') || input.parentElement;
    wrap.style.position = 'relative';

    const dd = document.createElement('div');
    dd.style.cssText = [
      'position:absolute', 'top:100%', 'left:0', 'right:0', 'z-index:999',
      'background:#fff', 'border:1.5px solid #E2E8F0', 'border-top:none',
      'border-radius:0 0 10px 10px', 'box-shadow:0 8px 24px rgba(0,0,0,.10)',
      'max-height:220px', 'overflow-y:auto', 'display:none',
    ].join(';');
    wrap.appendChild(dd);

    /* Fecha ao clicar fora */
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) dd.style.display = 'none';
    });

    return dd;
  }

  /* Renderiza itens no dropdown */
  function renderDropdown(dd, matches) {
    if (!matches.length) { dd.style.display = 'none'; return; }

    dd.innerHTML = matches.map(c => `
      <div class="ac-item" data-id="${c.id}" style="
        padding:.5rem .85rem; cursor:pointer;
        border-bottom:1px solid #F1F5F9; font-size:.83rem;
        display:flex; align-items:center; gap:.6rem;">
        <div style="width:28px;height:28px;border-radius:50%;background:#EFF6FF;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fa-solid fa-user" style="font-size:.65rem;color:#0066FF;"></i>
        </div>
        <div>
          <strong style="color:#0F172A">${c.nome}</strong>
          <div style="color:#64748B;font-size:.76rem;">
            ${c.telefone || ''}${c.cpf ? ' · ' + c.cpf : ''}
          </div>
        </div>
      </div>
    `).join('');

    dd.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('mouseenter', () => item.style.background = '#F8FAFC');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('mousedown', e => {
        e.preventDefault(); // evita blur antes do click
        fillCustomerFields(matches.find(c => c.id === item.dataset.id));
        dd.style.display = 'none';
      });
    });

    dd.style.display = 'block';
  }

  /* Configura autocomplete nos campos Nome e Telefone */
  function setupAutocomplete(inputId, matchFn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const dd = createDropdown(input);

    input.addEventListener('input', async () => {
      const q = input.value.trim();
      if (q.length < 2) { dd.style.display = 'none'; return; }
      const all = await CustomerDB.getAll();
      const matches = all.filter(c => matchFn(c, q)).slice(0, 7);
      renderDropdown(dd, matches);
    });

    input.addEventListener('focus', async () => {
      const q = input.value.trim();
      if (q.length >= 2) {
        const all = await CustomerDB.getAll();
        const matches = all.filter(c => matchFn(c, q)).slice(0, 7);
        renderDropdown(dd, matches);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => { dd.style.display = 'none'; }, 150);
    });
  }

  setupAutocomplete('f_cliente_nome', (c, q) =>
    (c.nome || '').toLowerCase().includes(q.toLowerCase())
  );
  setupAutocomplete('f_cliente_telefone', (c, q) =>
    (c.telefone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  );
  setupAutocomplete('f_cliente_cpf', (c, q) =>
    (c.cpf || '').replace(/\D/g, '').startsWith(q.replace(/\D/g, ''))
  );

  /* ── Botão "Buscar cliente" (CPF / telefone) ── */
  document.getElementById('clientSearchBtn').addEventListener('click', async () => {
    const q      = document.getElementById('clientSearchInput').value.trim();
    const qNum   = q.replace(/\D/g, '');
    const result = document.getElementById('clientSearchResult');
    if (!q) return;

    /* 1º: busca na tabela de clientes */
    const customers = await CustomerDB.getAll();
    const fromCustomers = customers.find(c =>
      (qNum && (c.cpf || '').replace(/\D/g, '') === qNum) ||
      (qNum && (c.telefone || '').replace(/\D/g, '') === qNum)
    );
    if (fromCustomers) { fillCustomerFields(fromCustomers); return; }

    /* 2º: busca no histórico de OS */
    const allOs = await OSDB.getAll();
    const fromOs = allOs.find(o =>
      (qNum && (o.cliente_cpf      || '').replace(/\D/g, '') === qNum) ||
      (qNum && (o.cliente_telefone || '').replace(/\D/g, '') === qNum)
    );
    if (fromOs) {
      fillCustomerFields({
        nome:     fromOs.cliente_nome,
        telefone: fromOs.cliente_telefone,
        cpf:      fromOs.cliente_cpf,
        email:    fromOs.cliente_email,
        endereco: fromOs.cliente_endereco,
      });
      result.innerHTML = `<span style="color:#15803D"><i class="fa-solid fa-circle-check"></i> Encontrado via OS anterior: <strong>${fromOs.cliente_nome}</strong></span>`;
      return;
    }

    result.innerHTML = `<span style="color:#EF4444"><i class="fa-solid fa-circle-xmark"></i> Nenhum cliente encontrado.</span>`;
  });

  /* ── Auto-salvar cliente na tabela CustomerDB ── */
  async function autoSaveCustomer(data) {
    const phone = (data.cliente_telefone || '').replace(/\D/g, '');
    const cpf   = (data.cliente_cpf      || '').replace(/\D/g, '');
    if (!data.cliente_nome || (!phone && !cpf)) return;

    const customers = await CustomerDB.getAll();
    const existing = customers.find(c =>
      (phone && (c.telefone || '').replace(/\D/g, '') === phone) ||
      (cpf   && (c.cpf      || '').replace(/\D/g, '') === cpf)
    );

    const payload = {
      nome:     data.cliente_nome,
      telefone: data.cliente_telefone,
      email:    data.cliente_email,
      cpf:      data.cliente_cpf,
      endereco: data.cliente_endereco,
    };

    if (existing) {
      await CustomerDB.update(existing.id, payload);
    } else {
      await CustomerDB.add(payload);
    }
  }

  /* ── Máscaras ── */
  document.getElementById('f_cliente_cpf').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
    this.value = v;
  });

  document.getElementById('f_cliente_telefone').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6)      v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    this.value = v;
  });

  /* ── Step navigation ── */
  function goTo(n) {
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`panel${i}`).classList.toggle('active', i === n);
      const tab = document.getElementById(`tab${i}`);
      tab.classList.remove('active', 'done');
      if (i === n)    tab.classList.add('active');
      else if (i < n) tab.classList.add('done');
    }
    currentStep = n;
  }

  /* ── Validação ── */
  function clearErr(id) {
    const el  = document.getElementById('err_' + id);
    const inp = document.getElementById('f_' + id);
    if (el)  el.textContent = '';
    if (inp) inp.classList.remove('err');
  }
  function setErr(id, msg) {
    const el  = document.getElementById('err_' + id);
    const inp = document.getElementById('f_' + id);
    if (el)  el.textContent = msg;
    if (inp) inp.classList.add('err');
  }

  function validateStep1() {
    let ok = true;
    ['cliente_nome', 'cliente_telefone'].forEach(clearErr);
    if (document.getElementById('f_cliente_nome').value.trim().length < 3) {
      setErr('cliente_nome', 'Nome obrigatório (mín. 3 chars).'); ok = false;
    }
    if (document.getElementById('f_cliente_telefone').value.replace(/\D/g,'').length < 8) {
      setErr('cliente_telefone', 'Telefone inválido.'); ok = false;
    }
    return ok;
  }

  function validateStep2() {
    let ok = true;
    ['aparelho_marca', 'aparelho_modelo'].forEach(clearErr);
    if (!document.getElementById('f_aparelho_marca').value) {
      setErr('aparelho_marca', 'Selecione a marca.'); ok = false;
    }
    if (!document.getElementById('f_aparelho_modelo').value.trim()) {
      setErr('aparelho_modelo', 'Informe o modelo.'); ok = false;
    }
    return ok;
  }

  function validateStep3() {
    clearErr('problema_relatado');
    if (document.getElementById('f_problema_relatado').value.trim().length < 5) {
      setErr('problema_relatado', 'Descreva o problema (mín. 5 chars).'); return false;
    }
    return true;
  }

  document.getElementById('next1').addEventListener('click', () => { if (validateStep1()) goTo(2); });
  document.getElementById('next2').addEventListener('click', () => { if (validateStep2()) goTo(3); });
  document.getElementById('back2').addEventListener('click', () => goTo(1));
  document.getElementById('back3').addEventListener('click', () => goTo(2));

  /* ── Salvar OS ── */
  document.getElementById('saveOs').addEventListener('click', async () => {
    if (!validateStep3()) return;

    const acessorios = [...document.querySelectorAll('[name="acessorio"]:checked')].map(cb => cb.value);

    const data = {
      cliente_nome:         document.getElementById('f_cliente_nome').value.trim(),
      cliente_cpf:          document.getElementById('f_cliente_cpf').value.trim(),
      cliente_telefone:     document.getElementById('f_cliente_telefone').value.trim(),
      cliente_email:        document.getElementById('f_cliente_email').value.trim(),
      cliente_endereco:     document.getElementById('f_cliente_endereco').value.trim(),
      aparelho_marca:       document.getElementById('f_aparelho_marca').value,
      aparelho_modelo:      document.getElementById('f_aparelho_modelo').value.trim(),
      aparelho_cor:         document.getElementById('f_aparelho_cor').value.trim(),
      aparelho_imei:        document.getElementById('f_aparelho_imei').value.trim(),
      aparelho_senha:       document.getElementById('f_aparelho_senha').value.trim(),
      acessorios,
      condicoes_visuais:    document.getElementById('f_condicoes_visuais').value.trim(),
      problema_relatado:    document.getElementById('f_problema_relatado').value.trim(),
      tecnico:              document.getElementById('f_tecnico').value,
      prioridade:           document.getElementById('f_prioridade').value,
      valor_estimado:       parseFloat(document.getElementById('f_valor_estimado').value) || 0,
      observacoes_internas: document.getElementById('f_observacoes_internas').value.trim(),
      data_entrada:         document.getElementById('f_data_entrada').value
                              ? new Date(document.getElementById('f_data_entrada').value).toISOString()
                              : new Date().toISOString(),
      previsao_entrega:     document.getElementById('f_previsao_entrega').value
                              ? new Date(document.getElementById('f_previsao_entrega').value).toISOString()
                              : null,
    };

    const saveBtn = document.getElementById('saveOs');
    saveBtn.disabled = true;
    let saved;
    try {
      /* Salva o cliente automaticamente */
      await autoSaveCustomer(data);

      if (editOs) {
        saved = await OSDB.update(editId, data);
        toast('OS atualizada com sucesso!', 'success');
      } else {
        saved = await OSDB.add(data);
        toast('Ordem de Serviço aberta com sucesso!', 'success');
      }
    } catch (e) {
      saveBtn.disabled = false;
      toast(e.message, 'error');
      return;
    }

    setTimeout(() => {
      window.location.href = 'os-detalhes.html?id=' + saved.id;
    }, 1200);
  });
});
