/* ============================================================
   PLANETA CELULAR — sistema.js
   Página de vendas do SaaS: planos vindos da API e cadastro de
   nova loja (cria a conta, faz login e abre o painel).
============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ── Navbar ── */
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  window.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', window.scrollY > 20), { passive: true });
  document.getElementById('navToggle').addEventListener('click', () => navLinks.classList.toggle('is-open'));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('is-open')));

  /* ══════════════════════════════════════
     PLANOS
  ══════════════════════════════════════ */
  // Módulos que cada plano libera (Plan.modules na API)
  const MODULES = [
    { key: 'sales',          label: 'PDV — venda no balcão' },
    { key: 'service_orders', label: 'Ordens de serviço + consulta pública' },
    { key: 'finance',        label: 'Financeiro, caixa e relatórios' },
    { key: 'store',          label: 'Loja online com carrinho e checkout' },
    { key: 'campaigns',      label: 'Campanhas de marketing' },
  ];
  // Incluídos em todos os planos
  const ALWAYS = ['Clientes e produtos', 'Cores e banner personalizados'];

  const plansGrid = document.getElementById('plansGrid');
  const planSelect = document.getElementById('suPlan');
  const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function renderPlans(plans) {
    if (!plans.length) {
      plansGrid.innerHTML = '<p class="plans__empty">Fale com a gente para conhecer os planos.</p>';
      planSelect.innerHTML = '<option value="">Plano padrão</option>';
      return;
    }
    // Destaque: o plano com mais módulos
    const featured = plans.reduce((a, b) => (b.modules.length > a.modules.length ? b : a), plans[0]);

    plansGrid.innerHTML = plans.map(p => {
      const extras = Array.isArray(p.features) ? p.features : [];
      return `
        <article class="plan ${p.id === featured.id && plans.length > 1 ? 'plan--featured' : ''}">
          ${p.id === featured.id && plans.length > 1 ? '<span class="plan__badge">Mais completo</span>' : ''}
          <h3>${esc(p.name)}</h3>
          <p class="plan__desc">${esc(p.description)}</p>
          <div class="plan__price"><strong>${money(p.price)}</strong><span>/mês</span></div>
          <p class="plan__trial"><i class="fa-solid fa-gift"></i> 14 dias grátis para testar</p>
          <ul>
            <li><i class="fa-solid fa-check"></i> Até ${Number(p.maxUsers)} usuário${p.maxUsers > 1 ? 's' : ''}</li>
            ${MODULES.map(m => `
              <li class="${p.modules.includes(m.key) ? '' : 'is-off'}">
                <i class="fa-solid ${p.modules.includes(m.key) ? 'fa-check' : 'fa-xmark'}"></i> ${m.label}
              </li>`).join('')}
            ${ALWAYS.map(t => `<li><i class="fa-solid fa-check"></i> ${t}</li>`).join('')}
            ${extras.map(t => `<li><i class="fa-solid fa-check"></i> ${esc(t)}</li>`).join('')}
          </ul>
          <a href="#cadastro" class="btn ${p.id === featured.id ? 'btn--primary' : 'btn--ghost-dark'} btn--block" data-plan="${esc(p.id)}">
            Testar o ${esc(p.name)} grátis
          </a>
        </article>`;
    }).join('');

    planSelect.innerHTML = plans.map(p =>
      `<option value="${esc(p.id)}">${esc(p.name)} — ${money(p.price)}/mês</option>`).join('');
    planSelect.value = featured.id;

    // Clicar em "Testar" já escolhe o plano no formulário
    plansGrid.querySelectorAll('[data-plan]').forEach(a =>
      a.addEventListener('click', () => { planSelect.value = a.dataset.plan; }));
  }

  apiFetch('/settings/plans', { auth: false })
    .then(plans => renderPlans(plans || []))
    .catch(() => {
      plansGrid.innerHTML = '<p class="plans__empty">Não foi possível carregar os planos agora. Você ainda pode criar sua conta abaixo.</p>';
      planSelect.innerHTML = '<option value="">Plano padrão</option>';
    });

  /* ══════════════════════════════════════
     CADASTRO
  ══════════════════════════════════════ */
  const form      = document.getElementById('signupForm');
  const tenantEl  = document.getElementById('suTenant');
  const slugEl    = document.getElementById('suSlug');
  const slugHint  = document.getElementById('suSlugHint');
  const errorEl   = document.getElementById('suError');
  const submitBtn = document.getElementById('suSubmit');
  const SLUG_RE   = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
  let slugTouched = false;

  // "Cell Center Assistência" -> "cell-center-assistencia"
  const toSlug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

  function updateSlugHint() {
    const slug = slugEl.value;
    if (!slug) {
      slugHint.textContent = 'Usado para entrar no painel e no endereço do seu site.';
      slugHint.classList.remove('is-error');
    } else if (!SLUG_RE.test(slug)) {
      slugHint.textContent = 'Use de 3 a 40 letras minúsculas, números ou hífen (sem espaço nem acento).';
      slugHint.classList.add('is-error');
    } else {
      slugHint.textContent = `Seu site: ${location.origin}/?loja=${slug}`;
      slugHint.classList.remove('is-error');
    }
  }

  tenantEl.addEventListener('input', () => {
    if (!slugTouched) { slugEl.value = toSlug(tenantEl.value); updateSlugHint(); }
  });
  slugEl.addEventListener('input', () => {
    slugTouched = true;
    slugEl.value = slugEl.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    updateSlugHint();
  });

  function showError(msg, field) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    if (field) { field.classList.add('is-invalid'); field.focus(); }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.hidden = true;

    const data = {
      tenantName:    tenantEl.value.trim(),
      slug:          slugEl.value.trim(),
      adminName:     document.getElementById('suName').value.trim(),
      phone:         document.getElementById('suPhone').value.trim() || undefined,
      adminEmail:    document.getElementById('suEmail').value.trim().toLowerCase(),
      adminPassword: document.getElementById('suPassword').value,
      planId:        planSelect.value || undefined,
    };

    if (data.tenantName.length < 2) return showError('Informe o nome da loja.', tenantEl);
    if (!SLUG_RE.test(data.slug)) return showError('Código da loja inválido: use de 3 a 40 letras minúsculas, números ou hífen.', slugEl);
    if (data.adminName.length < 2) return showError('Informe seu nome.', document.getElementById('suName'));
    if (!/^\S+@\S+\.\S+$/.test(data.adminEmail)) return showError('Informe um e-mail válido.', document.getElementById('suEmail'));
    if (data.adminPassword.length < 8) return showError('A senha precisa ter pelo menos 8 caracteres.', document.getElementById('suPassword'));

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando sua conta...';

    try {
      await apiFetch('/auth/register', { method: 'POST', auth: false, body: data });

      // Conta criada: já entra no painel da loja nova
      try {
        const login = await apiFetch('/auth/login', {
          method: 'POST', auth: false,
          body: { email: data.adminEmail, password: data.adminPassword, slug: data.slug },
        });
        ApiClient.tokens.set(login.accessToken, login.refreshToken);
        localStorage.setItem('user', JSON.stringify(login.user));
        localStorage.setItem('pc_login_slug', data.slug);
        window.location.href = 'painel.html';
      } catch {
        // Conta existe, mas o login automático falhou: manda para o login já preenchido
        window.location.href = `admin.html?loja=${encodeURIComponent(data.slug)}`;
      }
    } catch (err) {
      const msg = err.message || 'Não foi possível criar a conta. Tente novamente.';
      showError(msg, /código/i.test(msg) ? slugEl : null);
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Criar minha conta grátis <i class="fa-solid fa-arrow-right"></i>';
    }
  });
});
