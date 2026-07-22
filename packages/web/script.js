/* ============================================================
   PLANETA CELULAR — script.js
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── 0. CART BADGE ── */
  function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge || typeof CartDB === 'undefined') return;
    const count = CartDB.getCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  updateCartBadge();
  window.addEventListener('cart:updated', updateCartBadge);

  /* ── 1. NAVBAR: sticky shadow + mobile hamburger ── */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Fecha menu ao clicar em um link
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
    });
  });

  /* ── 2. SMOOTH SCROLL ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--navbar-h')) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── 3. SCROLL REVEAL ── */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Atraso baseado na posição do elemento dentro de um grid
        const siblings = [...entry.target.parentElement.children]
          .filter(el => el.classList.contains('reveal'));
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(idx * 80, 400)}ms`;
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObs.observe(el));

  /* ── 4. CAROUSEL DE DEPOIMENTOS ── */
  const track   = document.getElementById('testimonialsTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsContainer = document.getElementById('carouselDots');

  let currentSlide = 0;
  let autoSlide;

  function getSlidesPerView() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  const cards = track ? [...track.children] : [];

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    const total = Math.ceil(cards.length / getSlidesPerView());
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsContainer) return;
    dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function goTo(idx) {
    const perView = getSlidesPerView();
    const total   = Math.ceil(cards.length / perView);
    currentSlide  = (idx + total) % total;
    if (!track) return;
    const cardWidth = track.parentElement.clientWidth / perView;
    track.style.transform = `translateX(-${currentSlide * cardWidth * perView}px)`;
    updateDots();
  }

  function next() { goTo(currentSlide + 1); }
  function prev() { goTo(currentSlide - 1); }

  function startAuto() {
    stopAuto();
    autoSlide = setInterval(next, 4500);
  }
  function stopAuto() { clearInterval(autoSlide); }

  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAuto(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAuto(); });

  if (track) {
    track.addEventListener('mouseenter', stopAuto);
    track.addEventListener('mouseleave', startAuto);

    // Touch support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
      startAuto();
    });
  }

  buildDots();
  startAuto();
  window.addEventListener('resize', () => { buildDots(); goTo(0); });

  /* ── 5. FILTRO DE PRODUTOS ── */
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      productCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
        // Re-trigger reveal se ficou escondido e depois voltou
        if (match && !card.classList.contains('visible')) {
          card.classList.add('visible');
        }
      });
    });
  });

  /* ── 6. CONTADOR ANIMADO (seção Sobre) ── */
  const counters = document.querySelectorAll('.counter__value');

  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const suffix   = el.dataset.target.includes('+') ? '+' : '';
    const duration = 1800;
    const step     = 16;
    const increment = target / (duration / step);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target.toLocaleString('pt-BR') + suffix;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current).toLocaleString('pt-BR') + suffix;
      }
    }, step);
  }

  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObs.observe(el));

  /* ── 7. FORMULÁRIO DE CONTATO ── */
  const form = document.getElementById('contactForm');

  function validateField(id, errorId, rules) {
    const el  = document.getElementById(id);
    const err = document.getElementById(errorId);
    let msg   = '';

    if (rules.required && !el.value.trim()) {
      msg = 'Este campo é obrigatório.';
    } else if (rules.minLen && el.value.trim().length < rules.minLen) {
      msg = `Mínimo de ${rules.minLen} caracteres.`;
    } else if (rules.pattern && !rules.pattern.test(el.value.trim())) {
      msg = rules.patternMsg || 'Valor inválido.';
    }

    el.classList.toggle('error', !!msg);
    err.textContent = msg;
    return !msg;
  }

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      const okNome = validateField('nome', 'nomeError', { required: true, minLen: 3 });
      const okTel  = validateField('telefone', 'telefoneError', {
        required: true,
        pattern: /^[\d\s\(\)\-\+]{8,}$/,
        patternMsg: 'Telefone inválido. Use apenas números.'
      });
      const okMsg  = validateField('mensagem', 'mensagemError', { required: true, minLen: 10 });

      if (!okNome || !okTel || !okMsg) return;

      // Abre WhatsApp com os dados do formulário
      const nome     = document.getElementById('nome').value.trim();
      const telefone = document.getElementById('telefone').value.trim();
      const mensagem = document.getElementById('mensagem').value.trim();
      const text     = encodeURIComponent(
        `Olá! Meu nome é ${nome} (${telefone}).\n\n${mensagem}`
      );

      window.open(`https://wa.me/5511999999999?text=${text}`, '_blank', 'noopener');

      const successEl = document.getElementById('formSuccess');
      successEl.hidden = false;
      form.reset();
      setTimeout(() => { successEl.hidden = true; }, 5000);
    });

    // Validação ao perder foco
    ['nome', 'telefone', 'mensagem'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', () => {
        validateField(id, `${id}Error`, {
          required: true,
          ...(id === 'telefone' ? {
            pattern: /^[\d\s\(\)\-\+]{8,}$/,
            patternMsg: 'Telefone inválido.'
          } : {}),
          ...(id !== 'telefone' ? { minLen: id === 'mensagem' ? 10 : 3 } : {})
        });
      });
    });
  }

  /* ── 8. SCROLL TO TOP ── */
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── 9. FORMATAÇÃO DE TELEFONE ── */
  const telInput = document.getElementById('telefone');
  if (telInput) {
    telInput.addEventListener('input', () => {
      let v = telInput.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 6)  v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
      else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
      telInput.value = v;
    });
  }

  /* ── 11. CONSULTA DE OS (home) ── */
  const homeInputOs      = document.getElementById('homeInputOs');
  const homeInputCpf     = document.getElementById('homeInputCpf');
  const homeInputImei    = document.getElementById('homeInputImei');
  const homeBtnConsultar = document.getElementById('homeBtnConsultar');
  const homeSearchError  = document.getElementById('homeSearchError');
  const homeResultArea   = document.getElementById('homeResultArea');
  const homeResultContent = document.getElementById('homeResultContent');

  if (homeInputOs && typeof OSDB !== 'undefined') {

    homeInputCpf.addEventListener('input', () => {
      let v = homeInputCpf.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9)      v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
      else if (v.length > 6) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
      else if (v.length > 3) v = v.slice(0,3)+'.'+v.slice(3);
      homeInputCpf.value = v;
    });

    homeInputImei.addEventListener('input', () => {
      homeInputImei.value = homeInputImei.value.replace(/\D/g, '').slice(0, 15);
    });

    [homeInputOs, homeInputCpf, homeInputImei].forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') homeConsultar(); });
    });

    homeBtnConsultar.addEventListener('click', homeConsultar);

    async function homeConsultar() {
      const numOs = homeInputOs.value.trim().toUpperCase();
      const cpf   = homeInputCpf.value.trim().replace(/\D/g, '');
      const imei  = homeInputImei.value.trim().replace(/\D/g, '');
      homeSearchError.textContent = '';

      if (!numOs && !cpf && !imei) {
        homeSearchError.textContent = 'Informe pelo menos um dado para consulta.';
        homeInputOs.focus();
        return;
      }

      document.getElementById('homeSearchIcon').style.display = 'none';
      document.getElementById('homeSpinner').style.display    = '';
      document.getElementById('homeBtnLabel').textContent     = 'Consultando...';
      homeBtnConsultar.disabled = true;

      const os = await OSDB.getPublic(numOs || cpf || imei);

      document.getElementById('homeSearchIcon').style.display = '';
      document.getElementById('homeSpinner').style.display    = 'none';
      document.getElementById('homeBtnLabel').textContent     = 'Consultar status';
      homeBtnConsultar.disabled = false;

      homeResultArea.style.display = 'block';
      homeResultContent.innerHTML  = os ? homeRenderCard(os) : homeRenderNotFound();
      homeResultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const STATUS_MAP = {
      aguardando_diagnostico: { label:'Aguardando Diagnóstico', cls:'--yellow', icon:'fa-hourglass-half',    msgCls:'msg--warning', msg:'Seu aparelho está aguardando diagnóstico técnico.' },
      em_reparo:              { label:'Em Reparo',              cls:'--blue',   icon:'fa-screwdriver-wrench', msgCls:'msg--info',    msg:'Seu aparelho está sendo reparado pela nossa equipe.' },
      aguardando_peca:        { label:'Aguardando Peça',        cls:'--purple', icon:'fa-box',               msgCls:'msg--warning', msg:'Estamos aguardando a chegada da peça necessária.' },
      aguardando_aprovacao:   { label:'Ag. Aprovação',          cls:'--orange', icon:'fa-circle-question',   msgCls:'msg--warning', msg:'Aguarda sua aprovação para prosseguir. Fale conosco.' },
      concluido:              { label:'Pronto p/ Retirada',     cls:'--green',  icon:'fa-circle-check',      msgCls:'msg--success', msg:'✅ Seu aparelho está pronto para retirada na loja!' },
      entregue:               { label:'Entregue',               cls:'--teal',   icon:'fa-hand-holding-heart',msgCls:'msg--neutral', msg:'Seu aparelho já foi entregue. Obrigado pela confiança!' },
      cancelado:              { label:'Cancelado',              cls:'--red',    icon:'fa-circle-xmark',      msgCls:'msg--neutral', msg:'Esta ordem de serviço foi cancelada.' },
    };

    function homeRenderCard(os) {
      const s = STATUS_MAP[os.status] || { label: os.status, cls:'--neutral', icon:'fa-info-circle', msgCls:'msg--neutral', msg:'' };
      const device      = [os.aparelho_marca, os.aparelho_modelo].filter(Boolean).join(' ') || 'Aparelho';
      const primeiroNome = (os.cliente_nome || '').split(' ')[0];
      const waText      = encodeURIComponent(`Olá! Estou consultando a OS *${os.numero_os}*. Pode me informar mais detalhes?`);

      return `
        <div class="home-result-card">
          <div class="home-result-card__top">
            <div>
              <div class="home-result-os">${os.numero_os}</div>
              <div class="home-result-device">${device}</div>
              ${primeiroNome ? `<div class="home-result-client">Olá, <strong>${primeiroNome}</strong>!</div>` : ''}
            </div>
            <span class="home-result-badge home-result-badge${s.cls}">
              <i class="fa-solid ${s.icon}"></i> ${s.label}
            </span>
          </div>
          <div class="home-result-msg ${s.msgCls}">
            <i class="fa-solid ${s.icon}"></i>
            <span>${s.msg}</span>
          </div>
          <div class="home-result-actions">
            <a href="consulta-os.html?os=${encodeURIComponent(os.numero_os)}" class="btn btn--primary btn--sm">
              <i class="fa-solid fa-file-lines"></i> Ver detalhes completos
            </a>
            <a href="https://wa.me/5511999999999?text=${waText}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm">
              <i class="fa-brands fa-whatsapp"></i> Falar com a loja
            </a>
            <button class="btn btn--outline btn--sm" id="homeBtnNova">
              <i class="fa-solid fa-rotate-right"></i> Nova consulta
            </button>
          </div>
        </div>`;
    }

    function homeRenderNotFound() {
      const waText = encodeURIComponent('Olá! Tentei consultar minha OS no site mas não encontrei. Pode me ajudar?');
      return `
        <div class="home-not-found">
          <i class="fa-solid fa-circle-xmark big-icon"></i>
          <h3>OS não encontrada</h3>
          <p>Não encontramos nenhuma OS com os dados informados.<br/>Verifique se digitou corretamente ou fale com a loja.</p>
          <div class="home-not-found-btns">
            <a href="https://wa.me/5511999999999?text=${waText}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm">
              <i class="fa-brands fa-whatsapp"></i> Falar com a loja
            </a>
            <button class="btn btn--outline btn--sm" id="homeBtnNova">
              <i class="fa-solid fa-rotate-right"></i> Tentar novamente
            </button>
          </div>
        </div>`;
    }

    homeResultContent.addEventListener('click', e => {
      if (!e.target.closest('#homeBtnNova')) return;
      homeResultArea.style.display = 'none';
      homeResultContent.innerHTML  = '';
      homeInputOs.value = homeInputCpf.value = homeInputImei.value = '';
      homeSearchError.textContent = '';
      homeInputOs.focus();
      document.getElementById('consultar-os').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ── 10. ACTIVE NAV LINK ao rolar ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar__menu a[href^="#"]');

  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = '';
          link.style.removeProperty('--after-width');
        });
        const active = document.querySelector(`.navbar__menu a[href="#${entry.target.id}"]`);
        if (active) active.style.color = 'var(--primary)';
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(sec => sectionObs.observe(sec));

});
