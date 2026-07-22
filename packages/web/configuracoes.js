/* ============================================================
   PLANETA CELULAR — configuracoes.js
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  AuthDB.requireAuth();

  /* ── Sidebar ── */
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !document.getElementById('sidebarToggle').contains(e.target))
      sidebar.classList.remove('open');
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    AuthDB.logout();
    window.location.href = 'admin.html';
  });

  /* ── Papel / nome ── */
  const isAdmin = AuthDB.isAdmin();
  document.getElementById('topbarUserName').textContent = AuthDB.getNome();

  /* ── Status rápido da API na lista ── */
  const dbSub = document.getElementById('dbStatusSub');
  if (dbSub) {
    try {
      const [products, os] = await Promise.all([
        ProductDB.getAll(),
        typeof OSDB !== 'undefined' ? OSDB.getAll() : Promise.resolve([]),
      ]);
      dbSub.textContent = `✔ OK — ${products.length + os.length} registro(s) encontrado(s)`;
      dbSub.style.color = '#15803D';
    } catch {
      dbSub.textContent = '✘ Não foi possível conectar à API';
      dbSub.style.color = '#DC2626';
    }
  }
  if (!isAdmin) {
    const finNav = document.getElementById('financeiroNav');
    if (finNav) finNav.style.display = 'none';
    document.getElementById('cfgUsuariosItem').style.display = 'none';
  }

  /* ── Toast ── */
  const toastEl = document.getElementById('toast');
  function showToast(msg, type = 'success') {
    toastEl.textContent = msg;
    toastEl.className = `toast toast--${type}`;
    toastEl.hidden = false;
    setTimeout(() => { toastEl.hidden = true; }, 3000);
  }

  /* ══════════════════════════════════════
     DARK MODE
  ══════════════════════════════════════ */
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.checked = localStorage.getItem('pc_dark_mode') === '1';

  darkToggle.addEventListener('change', () => {
    if (darkToggle.checked) {
      document.body.classList.add('dark');
      localStorage.setItem('pc_dark_mode', '1');
    } else {
      document.body.classList.remove('dark');
      localStorage.removeItem('pc_dark_mode');
    }
  });

  /* ══════════════════════════════════════
     SUB-PAINEL
  ══════════════════════════════════════ */
  const overlay   = document.getElementById('cfgOverlay');
  const panelBody = document.getElementById('cfgPanelBody');
  const panelFoot = document.getElementById('cfgPanelFooter');
  const panelTitle = document.getElementById('cfgPanelTitle');
  const panelSave  = document.getElementById('cfgPanelSave');

  function openPanel(title, html, onSave = null) {
    panelTitle.textContent = title;
    panelBody.innerHTML    = html;
    if (onSave) {
      panelFoot.style.display = '';
      panelSave.onclick = onSave;
    } else {
      panelFoot.style.display = 'none';
    }
    overlay.classList.add('open');
  }

  function closePanel() { overlay.classList.remove('open'); }

  document.getElementById('cfgPanelBack').addEventListener('click', closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });

  /* ══════════════════════════════════════
     CLIQUES NOS ITENS
  ══════════════════════════════════════ */
  document.querySelectorAll('.cfg-item[data-cfg]').forEach(item => {
    item.addEventListener('click', () => {
      const cfg = item.dataset.cfg;
      if (cfg === 'breve') { showToast('Em desenvolvimento', 'info'); return; }
      PANELS[cfg]?.();
    });
  });

  /* ── Empresa (dados do tenant via API) ── */
  async function getEmpresa() {
    try {
      const tenant = await SettingsDB.get();
      return {
        nome: tenant.name || '',
        cnpj: tenant.document || '',
        telefone: tenant.phone || '',
        email: tenant.email || '',
        endereco: tenant.settings?.endereco || '',
        cidade: tenant.settings?.cidade || '',
        logo: tenant.settings?.logo || '',
        _settings: tenant.settings || {},
      };
    } catch {
      return {};
    }
  }

  async function saveEmpresa(data) {
    const current = await getEmpresa();
    await SettingsDB.update({
      name: data.nome,
      document: data.cnpj,
      phone: data.telefone,
      email: data.email,
      settings: { ...current._settings, endereco: data.endereco, cidade: data.cidade, logo: data.logo },
    });
  }

  /* ── Formas de pagamento ── */
  const PGTO_KEY = 'pc_pgto_config';
  const PGTO_DEFAULT = {
    dinheiro: true, pix: true, cartao_credito: true,
    cartao_debito: true, transferencia: true,
  };

  function getPgtoConfig() {
    try { return { ...PGTO_DEFAULT, ...JSON.parse(localStorage.getItem(PGTO_KEY)) }; }
    catch { return { ...PGTO_DEFAULT }; }
  }

  function savePgtoConfig(data) {
    localStorage.setItem(PGTO_KEY, JSON.stringify(data));
  }

  /* ══════════════════════════════════════
     DEFINIÇÕES DOS PAINÉIS
  ══════════════════════════════════════ */
  const PANELS = {

    /* ── Dados da empresa ── */
    async empresa() {
      const e = await getEmpresa();
      openPanel('Dados da empresa', `
        <div class="cfg-form-group">
          <label>Nome da empresa</label>
          <input id="empNome" value="${e.nome || 'Planeta Celular'}" placeholder="Nome da empresa" />
        </div>
        <div class="cfg-form-group">
          <label>CNPJ / CPF</label>
          <input id="empCnpj" value="${e.cnpj || ''}" placeholder="00.000.000/0000-00" />
        </div>
        <div class="cfg-form-group">
          <label>Telefone / WhatsApp</label>
          <input id="empTelefone" value="${e.telefone || ''}" placeholder="(00) 00000-0000" />
        </div>
        <div class="cfg-form-group">
          <label>E-mail</label>
          <input id="empEmail" type="email" value="${e.email || ''}" placeholder="contato@empresa.com.br" />
        </div>
        <div class="cfg-form-group">
          <label>Endereço</label>
          <input id="empEndereco" value="${e.endereco || ''}" placeholder="Rua, número, bairro" />
        </div>
        <div class="cfg-form-group">
          <label>Cidade / Estado</label>
          <input id="empCidade" value="${e.cidade || ''}" placeholder="Cidade — UF" />
        </div>
        <div class="cfg-form-group">
          <label>URL do logo (opcional)</label>
          <input id="empLogo" value="${e.logo || ''}" placeholder="https://..." />
        </div>
      `, async () => {
        try {
          await saveEmpresa({
            nome:     document.getElementById('empNome').value.trim(),
            cnpj:     document.getElementById('empCnpj').value.trim(),
            telefone: document.getElementById('empTelefone').value.trim(),
            email:    document.getElementById('empEmail').value.trim(),
            endereco: document.getElementById('empEndereco').value.trim(),
            cidade:   document.getElementById('empCidade').value.trim(),
            logo:     document.getElementById('empLogo').value.trim(),
          });
        } catch (e) {
          showToast(e.message, 'error');
          return;
        }
        showToast('Dados da empresa salvos!');
        closePanel();
      });
    },

    /* ── Usuários (apenas admin) ── */
    async usuarios() {
      if (!isAdmin) return;
      const currentUserId = JSON.parse(localStorage.getItem('user') || 'null')?.id;
      let users = [];
      try { users = await UsersDB.getAll(); } catch (e) { showToast(e.message, 'error'); }

      function renderUserList() {
        return `
          <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1rem;">
            <i class="fa-solid fa-info-circle"></i> Usuários do tenant.
          </p>
          ${users.map(u => `
            <div class="cfg-user-row">
              <div class="cfg-user-avatar"><i class="fa-solid fa-user"></i></div>
              <div class="cfg-user-info">
                <div class="cfg-user-name">${u.name}</div>
                <div class="cfg-user-role">${u.email}</div>
              </div>
              <span class="cfg-badge-role ${u.role === 'EMPLOYEE' ? 'func' : ''}">
                ${u.role === 'ADMIN' ? 'Admin' : 'Funcionário'}
              </span>
              ${u.id !== currentUserId ? `<button class="cfg-user-del" data-id="${u.id}" title="Excluir" style="background:none;border:none;color:#EF4444;cursor:pointer;margin-left:.5rem;"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          `).join('')}
          <button id="btnAddUser" style="margin-top:1rem;width:100%;padding:.55rem;border:1.5px dashed var(--gray-300);background:none;color:var(--primary);border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-plus"></i> Novo usuário
          </button>
          <div id="addUserForm" style="display:none;margin-top:1rem;">
            <div class="cfg-form-group"><label>Nome</label><input id="newUserName" placeholder="Nome" /></div>
            <div class="cfg-form-group"><label>E-mail</label><input id="newUserEmail" type="email" placeholder="email@empresa.com" /></div>
            <div class="cfg-form-group"><label>Senha</label><input id="newUserPassword" type="password" placeholder="Senha" /></div>
            <div class="cfg-form-group">
              <label>Perfil</label>
              <select id="newUserRole"><option value="EMPLOYEE">Funcionário</option><option value="ADMIN">Admin</option></select>
            </div>
            <button id="btnConfirmAddUser" style="width:100%;padding:.55rem;border:none;background:var(--primary);color:#fff;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;">Adicionar</button>
          </div>
        `;
      }

      function bindUserPanelEvents() {
        panelBody.querySelectorAll('.cfg-user-del').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Excluir este usuário?')) return;
            try {
              await UsersDB.delete(btn.dataset.id);
              users = users.filter(u => u.id !== btn.dataset.id);
              panelBody.innerHTML = renderUserList();
              bindUserPanelEvents();
              showToast('Usuário excluído.');
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
        document.getElementById('btnAddUser')?.addEventListener('click', () => {
          document.getElementById('addUserForm').style.display = 'block';
        });
        document.getElementById('btnConfirmAddUser')?.addEventListener('click', async () => {
          const name     = document.getElementById('newUserName').value.trim();
          const email    = document.getElementById('newUserEmail').value.trim();
          const password = document.getElementById('newUserPassword').value;
          const role     = document.getElementById('newUserRole').value;
          if (!name || !email || !password) { showToast('Preencha todos os campos.', 'error'); return; }
          try {
            const created = await UsersDB.add({ name, email, password, role });
            users.push(created);
            panelBody.innerHTML = renderUserList();
            bindUserPanelEvents();
            showToast('Usuário criado!');
          } catch (e) { showToast(e.message, 'error'); }
        });
      }

      openPanel('Usuários', renderUserList());
      bindUserPanelEvents();
    },

    /* ── Categorias da loja ── */
    async categorias() {
      let cats = [];
      try { cats = await StoreCategoryDB.getAll(); } catch (e) { showToast(e.message, 'error'); }

      function renderCatList() {
        return `
          <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1rem;">
            <i class="fa-solid fa-info-circle"></i>
            Essas categorias aparecem na loja e no cadastro de produtos. Excluir uma categoria não altera produtos que já usam ela.
          </p>
          ${cats.length ? cats.map(c => `
            <div class="cfg-user-row" data-id="${c.id}">
              <div class="cfg-user-avatar"><i class="fa-solid fa-tag"></i></div>
              <div class="cfg-user-info" style="flex:1;">
                <input class="cat-name-input" data-id="${c.id}" value="${c.nome}" style="width:100%;border:none;background:none;font-weight:600;color:var(--gray-900);padding:.2rem 0;" />
                <div class="cfg-user-role">${c.slug}</div>
              </div>
              <button class="cat-save-btn" data-id="${c.id}" title="Salvar" style="background:none;border:none;color:var(--primary);cursor:pointer;margin-right:.4rem;"><i class="fa-solid fa-check"></i></button>
              <button class="cat-del-btn" data-id="${c.id}" title="Excluir" style="background:none;border:none;color:#EF4444;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
          `).join('') : '<p style="font-size:.82rem;color:var(--gray-400);">Nenhuma categoria cadastrada.</p>'}
          <button id="btnAddCat" style="margin-top:1rem;width:100%;padding:.55rem;border:1.5px dashed var(--gray-300);background:none;color:var(--primary);border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-plus"></i> Nova categoria
          </button>
          <div id="addCatForm" style="display:none;margin-top:1rem;">
            <div class="cfg-form-group"><label>Nome da categoria</label><input id="newCatName" placeholder="Ex: Fones Bluetooth" /></div>
            <button id="btnConfirmAddCat" style="width:100%;padding:.55rem;border:none;background:var(--primary);color:#fff;border-radius:8px;font-size:.82rem;font-weight:700;cursor:pointer;">Adicionar</button>
          </div>
        `;
      }

      function bindCatPanelEvents() {
        panelBody.querySelectorAll('.cat-save-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const input = panelBody.querySelector(`.cat-name-input[data-id="${btn.dataset.id}"]`);
            const nome = input.value.trim();
            if (!nome) { showToast('Informe um nome.', 'error'); return; }
            try {
              const updated = await StoreCategoryDB.update(btn.dataset.id, { nome });
              cats = cats.map(c => c.id === updated.id ? updated : c);
              panelBody.innerHTML = renderCatList();
              bindCatPanelEvents();
              showToast('Categoria atualizada!');
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
        panelBody.querySelectorAll('.cat-del-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Excluir esta categoria?')) return;
            try {
              await StoreCategoryDB.delete(btn.dataset.id);
              cats = cats.filter(c => c.id !== btn.dataset.id);
              panelBody.innerHTML = renderCatList();
              bindCatPanelEvents();
              showToast('Categoria excluída.');
            } catch (e) { showToast(e.message, 'error'); }
          });
        });
        document.getElementById('btnAddCat')?.addEventListener('click', () => {
          document.getElementById('addCatForm').style.display = 'block';
        });
        document.getElementById('btnConfirmAddCat')?.addEventListener('click', async () => {
          const nome = document.getElementById('newCatName').value.trim();
          if (!nome) { showToast('Informe um nome.', 'error'); return; }
          try {
            const created = await StoreCategoryDB.add({ nome });
            cats.push(created);
            panelBody.innerHTML = renderCatList();
            bindCatPanelEvents();
            showToast('Categoria criada!');
          } catch (e) { showToast(e.message, 'error'); }
        });
      }

      openPanel('Categorias da loja', renderCatList());
      bindCatPanelEvents();
    },

    /* ── Formas de pagamento ── */
    formas_pgto() {
      const cfg = getPgtoConfig();
      const methods = [
        { key: 'dinheiro',      label: 'Dinheiro',          icon: 'fa-money-bill-wave' },
        { key: 'pix',           label: 'PIX',               icon: 'fa-pix' },
        { key: 'cartao_credito',label: 'Cartão de Crédito', icon: 'fa-credit-card' },
        { key: 'cartao_debito', label: 'Cartão de Débito',  icon: 'fa-credit-card' },
        { key: 'transferencia', label: 'Transferência',      icon: 'fa-arrow-right-arrow-left' },
      ];
      openPanel('Formas de pagamento', `
        <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1rem;">
          Ative ou desative os métodos que aparecem no caixa de vendas.
        </p>
        ${methods.map(m => `
          <div class="cfg-panel-toggle-row">
            <span><i class="fa-solid ${m.icon}" style="margin-right:.5rem;color:var(--gray-400);"></i>${m.label}</span>
            <label class="cfg-toggle">
              <input type="checkbox" data-pgto="${m.key}" ${cfg[m.key] ? 'checked' : ''} />
              <span class="cfg-toggle-track"></span>
            </label>
          </div>
        `).join('')}
      `, () => {
        const newCfg = {};
        panelBody.querySelectorAll('input[data-pgto]').forEach(inp => {
          newCfg[inp.dataset.pgto] = inp.checked;
        });
        savePgtoConfig(newCfg);
        showToast('Formas de pagamento salvas!');
        closePanel();
      });
    },

    /* ── Recibo / Devolução ── */
    recibo() {
      const KEY = 'pc_recibo_cfg';
      let rc = {};
      try { rc = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
      openPanel('Recibo / Devolução', `
        <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1rem;">
          Escolha o que aparece no comprovante de venda.
        </p>
        ${[
          { key: 'show_cnpj',     label: 'Mostrar CNPJ/CPF da empresa' },
          { key: 'show_endereco', label: 'Mostrar endereço da empresa' },
          { key: 'show_cliente',  label: 'Mostrar nome do cliente' },
          { key: 'show_pgto',     label: 'Mostrar forma de pagamento' },
          { key: 'show_obs',      label: 'Mostrar campo de observação' },
        ].map(o => `
          <div class="cfg-panel-toggle-row">
            <span>${o.label}</span>
            <label class="cfg-toggle">
              <input type="checkbox" data-rc="${o.key}" ${rc[o.key] !== false ? 'checked' : ''} />
              <span class="cfg-toggle-track"></span>
            </label>
          </div>
        `).join('')}
      `, () => {
        const newRc = {};
        panelBody.querySelectorAll('input[data-rc]').forEach(inp => {
          newRc[inp.dataset.rc] = inp.checked;
        });
        localStorage.setItem(KEY, JSON.stringify(newRc));
        showToast('Configurações de recibo salvas!');
        closePanel();
      });
    },

    /* ── Dados do usuário atual (edição local, cosmética) ── */
    meu_usuario() {
      const user = JSON.parse(localStorage.getItem('user') || 'null') || {};
      openPanel('Dados do usuário', `
        <div class="cfg-form-group">
          <label>Nome de exibição</label>
          <input id="userNomeInput" value="${user.name || ''}" placeholder="Seu nome" />
        </div>
        <div class="cfg-form-group">
          <label>Perfil</label>
          <input value="${user.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}" readonly
            style="background:var(--gray-100);color:var(--gray-400);cursor:not-allowed;" />
        </div>
        <p style="font-size:.78rem;color:var(--gray-400);margin-top:.5rem;">
          <i class="fa-solid fa-lock"></i> Senha e e-mail são gerenciados pelo administrador.
        </p>
      `, () => {
        const novoNome = document.getElementById('userNomeInput').value.trim();
        if (!novoNome) { showToast('Informe um nome', 'error'); return; }
        const updated = { ...user, name: novoNome };
        localStorage.setItem('user', JSON.stringify(updated));
        document.getElementById('topbarUserName').textContent = novoNome;
        showToast('Nome atualizado!');
        closePanel();
      });
    },

    /* ── Diagnóstico (contagens vindas da API) ── */
    async diagnostico() {
      openPanel('Diagnóstico do sistema', `
        <div style="margin-bottom:.75rem;padding:.65rem .85rem;border-radius:8px;background:#F0FFF4;border:1px solid #BBF7D0;">
          <strong style="color:#15803D;"><i class="fa-solid fa-server"></i> Dados armazenados no servidor</strong>
          <div style="font-size:.75rem;color:var(--gray-500);margin-top:.2rem;">Carregando contagens...</div>
        </div>
        <div class="cfg-list" id="diagList"></div>
      `);

      const resources = [
        { nome: 'Produtos', fn: () => ProductDB.getAll() },
        { nome: 'Pedidos', fn: () => OrderDB.getAll() },
        { nome: 'Ordens de Serviço', fn: () => OSDB.getAll() },
        { nome: 'Financeiro', fn: () => FinDB.getAll() },
        { nome: 'Caixa', fn: () => FinDB.getCaixas() },
        { nome: 'Clientes', fn: () => CustomerDB.getAll() },
      ];

      const counts = await Promise.all(resources.map(async r => {
        try { return (await r.fn()).length; } catch { return '—'; }
      }));

      const diagList = document.getElementById('diagList');
      if (diagList) {
        diagList.innerHTML = resources.map((r, i) => `
          <div class="cfg-item" style="cursor:default;">
            <div class="cfg-item__icon" style="background:#F8FAFC;"><i class="fa-solid fa-table"></i></div>
            <div class="cfg-item__body">
              <div class="cfg-item__label">${r.nome}</div>
            </div>
            <div class="cfg-item__right">
              <span style="font-size:.78rem;font-weight:700;color:var(--gray-600);">${counts[i]} registro${counts[i] === 1 ? '' : 's'}</span>
            </div>
          </div>
        `).join('');
      }
    },

    /* ── Instalar App ── */
    instalar() {
      openPanel('Instalar App', `
        <div style="text-align:center;padding:1.5rem 0;">
          <i class="fa-solid fa-mobile-screen-button" style="font-size:3rem;color:var(--primary);display:block;margin-bottom:1rem;"></i>
          <p style="font-size:.88rem;color:var(--gray-700);margin-bottom:1.25rem;line-height:1.6;">
            Para instalar o Planeta Celular como aplicativo no seu dispositivo:
          </p>
        </div>
        <div class="cfg-list">
          <div class="cfg-item" style="cursor:default;">
            <div class="cfg-item__icon" style="background:#E8F0FF;color:#0066FF;"><i class="fa-brands fa-chrome"></i></div>
            <div class="cfg-item__body">
              <div class="cfg-item__label">Chrome / Edge</div>
              <div class="cfg-item__sub">Menu (⋮) → "Instalar aplicativo"</div>
            </div>
          </div>
          <div class="cfg-item" style="cursor:default;">
            <div class="cfg-item__icon" style="background:#FFF0F0;color:#E24329;"><i class="fa-brands fa-safari"></i></div>
            <div class="cfg-item__body">
              <div class="cfg-item__label">Safari (iOS)</div>
              <div class="cfg-item__sub">Compartilhar → "Adicionar à Tela de Início"</div>
            </div>
          </div>
          <div class="cfg-item" style="cursor:default;">
            <div class="cfg-item__icon" style="background:#F0FFF4;color:#16A34A;"><i class="fa-brands fa-android"></i></div>
            <div class="cfg-item__body">
              <div class="cfg-item__label">Android</div>
              <div class="cfg-item__sub">Menu (⋮) → "Adicionar à tela inicial"</div>
            </div>
          </div>
        </div>
      `);
    },
  };

});
