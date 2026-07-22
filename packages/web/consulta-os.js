/* ============================================================
   PLANETA CELULAR — consulta-os.js
   Lógica da página pública de consulta de OS
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  const WA_NUMBER = '5511999999999'; // Número da loja (altere aqui)

  const inputOs      = document.getElementById('inputOs');
  const inputCpf     = document.getElementById('inputCpf');
  const inputImei    = document.getElementById('inputImei');
  const btnConsultar = document.getElementById('btnConsultar');
  const searchError  = document.getElementById('searchError');
  const resultArea   = document.getElementById('resultArea');
  const resultContent = document.getElementById('resultContent');

  /* ── CPF mask ── */
  inputCpf.addEventListener('input', () => {
    let v = inputCpf.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
    inputCpf.value = v;
  });

  /* ── IMEI: digits only ── */
  inputImei.addEventListener('input', () => {
    inputImei.value = inputImei.value.replace(/\D/g, '').slice(0, 15);
  });

  /* ── Enter key ── */
  [inputOs, inputCpf, inputImei].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') consultar(); });
  });

  /* ── Auto-consulta se vier parâmetro ?os= na URL ── */
  const params = new URLSearchParams(location.search);
  const osParam = params.get('os');
  if (osParam) {
    inputOs.value = osParam.trim().toUpperCase();
    setTimeout(consultar, 300);
  }

  btnConsultar.addEventListener('click', consultar);

  /* ════════════════════════════════════════
     CONSULTA PRINCIPAL
  ════════════════════════════════════════ */
  async function consultar() {
    const numOs = inputOs.value.trim().toUpperCase();
    const cpf   = inputCpf.value.trim().replace(/\D/g, '');
    const imei  = inputImei.value.trim().replace(/\D/g, '');

    searchError.textContent = '';

    if (!numOs && !cpf && !imei) {
      searchError.textContent = 'Informe pelo menos um dado para consulta.';
      inputOs.focus();
      return;
    }

    setLoading(true);
    const os = await OSDB.getPublic(numOs || cpf || imei);
    setLoading(false);
    renderResultado(os);
  }

  /* ════════════════════════════════════════
     RENDERIZAÇÃO DO RESULTADO
  ════════════════════════════════════════ */
  function renderResultado(os) {
    resultArea.style.display = 'block';
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!os) {
      resultContent.innerHTML = renderNotFound();
      return;
    }

    resultContent.innerHTML = renderOsCard(os);

    // Bind "ver mais" do problema
    const verMaisBtn = document.getElementById('verMaisBtn');
    if (verMaisBtn) {
      verMaisBtn.addEventListener('click', () => {
        const el = document.getElementById('problemaText');
        const expandido = el.classList.toggle('expanded');
        verMaisBtn.textContent = expandido ? 'ver menos' : 'ver mais';
      });
    }
  }

  /* ── Card principal da OS ── */
  function renderOsCard(os) {
    const primeiroNome = (os.cliente_nome || '').split(' ')[0];
    const banner = getBanner(os.status);
    const statusCls  = getStatusPubClass(os.status);
    const statusLbl  = getStatusLabel(os.status);
    const vencida    = isVencida(os) && !['entregue','cancelado'].includes(os.status);
    const valorLabel = os.status === 'concluido' || os.status === 'entregue' ? 'Valor do serviço' : 'Valor estimado';
    const valor      = os.valor_total || os.valor_estimado || 0;
    const pgtoMap    = { pago: ['pago','fa-circle-check'], parcial: ['parcial','fa-circle-half-stroke'], pendente: ['pendente','fa-clock'] };
    const pgto       = pgtoMap[os.status_pagamento] || ['pendente','fa-clock'];
    const pgtoLbl    = { pago: 'Pagamento confirmado', parcial: 'Pago parcialmente', pendente: 'Pagamento pendente' }[os.status_pagamento] || 'Pendente';

    const waText = encodeURIComponent(
      `Olá! Estou consultando a OS *${os.numero_os}*. Poderia me passar mais informações?`
    );

    const servicosHtml = buildServicosHtml(os);
    const problemaFull = os.problema_relatado || '';
    const precisaVerMais = problemaFull.length > 180;

    return `
      <div class="result-card">

        <!-- Cabeçalho -->
        <div class="result-card__header">
          <div class="result-card__header-left">
            <div class="result-card__num">${os.numero_os}</div>
            <div class="result-card__client">
              <i class="fa-solid fa-user" style="font-size:.7rem;margin-right:.3rem;opacity:.6;"></i>
              ${primeiroNome ? `Olá, <strong style="color:#CBD5E1">${primeiroNome}</strong>` : 'Seu aparelho'}
            </div>
          </div>
          <div class="result-card__header-right">
            <span class="status-pub ${statusCls}">
              ${getStatusIcon(os.status)} ${statusLbl}
            </span>
          </div>
        </div>

        <!-- Banner de mensagem situacional -->
        <div class="status-banner ${banner.cls}">
          <i class="fa-solid ${banner.icon}"></i>
          <div>
            <div>${banner.msg}</div>
            ${banner.sub ? `<div style="font-size:.82rem;opacity:.85;margin-top:.2rem;">${banner.sub}</div>` : ''}
          </div>
        </div>

        <!-- Datas -->
        <div class="result-section">
          <div class="result-section__title">
            <i class="fa-solid fa-calendar"></i> Datas
          </div>
          <div class="dates-row">
            <div class="date-item">
              <span class="date-item__label">Entrada</span>
              <span class="date-item__value">${formatDate(os.data_entrada)}</span>
            </div>
            ${os.previsao_entrega ? `
            <div class="date-item">
              <span class="date-item__label">Previsão de entrega</span>
              <span class="date-item__value ${vencida ? 'warn' : ''}">${formatDate(os.previsao_entrega)}${vencida ? ' ⚠️' : ''}</span>
            </div>` : ''}
            ${os.data_conclusao ? `
            <div class="date-item">
              <span class="date-item__label">Concluído em</span>
              <span class="date-item__value">${formatDate(os.data_conclusao)}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Aparelho -->
        <div class="result-section">
          <div class="result-section__title">
            <i class="fa-solid fa-mobile-screen-button"></i> Aparelho
          </div>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-row__label">Marca / Modelo</span>
              <span class="info-row__value">${[os.aparelho_marca, os.aparelho_modelo].filter(Boolean).join(' ') || '—'}</span>
            </div>
            ${os.aparelho_cor ? `
            <div class="info-row">
              <span class="info-row__label">Cor</span>
              <span class="info-row__value">${os.aparelho_cor}</span>
            </div>` : ''}
            ${os.aparelho_imei ? `
            <div class="info-row">
              <span class="info-row__label">IMEI</span>
              <span class="info-row__value" style="font-family:monospace;letter-spacing:.02em;">${mascaraImei(os.aparelho_imei)}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Problema / Laudo -->
        <div class="result-section">
          <div class="result-section__title">
            <i class="fa-solid fa-comment-dots"></i> Problema relatado
          </div>
          <p class="problema-text ${precisaVerMais ? '' : 'expanded'}" id="problemaText">
            ${problemaFull || '—'}
          </p>
          ${precisaVerMais ? '<span class="ver-mais-btn" id="verMaisBtn">ver mais</span>' : ''}
        </div>

        ${servicosHtml}

        <!-- Financeiro -->
        ${valor > 0 ? `
        <div class="result-section">
          <div class="result-section__title">
            <i class="fa-solid fa-dollar-sign"></i> ${valorLabel}
          </div>
          <div class="financial-row">
            <div>
              <div class="financial-valor">${formatCurrency(valor)}</div>
              <div class="financial-label">${valorLabel}</div>
            </div>
            <span class="payment-badge payment-badge--${pgto[0]}">
              <i class="fa-solid ${pgto[1]}"></i> ${pgtoLbl}
            </span>
          </div>
        </div>` : ''}

        <!-- CTAs -->
        <div class="result-cta">
          <a href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank" rel="noopener" class="btn-wa-cta">
            <i class="fa-brands fa-whatsapp"></i> Falar com a loja
          </a>
          <button class="btn-nova-consulta" id="btnNovaConsulta">
            <i class="fa-solid fa-rotate-right"></i> Nova consulta
          </button>
        </div>

      </div>

      ${os.status === 'concluido' ? renderHorarios() : ''}
    `;
  }

  /* ── Not found ── */
  function renderNotFound() {
    const waText = encodeURIComponent('Olá! Preciso consultar o status da minha OS, mas não encontrei com os dados informados. Pode me ajudar?');
    return `
      <div class="not-found-card">
        <i class="fa-solid fa-circle-xmark"></i>
        <h3>OS não encontrada</h3>
        <p>
          Não encontramos nenhuma Ordem de Serviço com os dados informados.<br/>
          Verifique se digitou corretamente ou entre em contato com a loja.
        </p>
        <div style="display:flex;flex-direction:column;gap:.6rem;max-width:320px;margin:0 auto;">
          <a href="https://wa.me/${WA_NUMBER}?text=${waText}" target="_blank" rel="noopener" class="btn-wa-cta">
            <i class="fa-brands fa-whatsapp"></i> Falar com a loja
          </a>
          <button class="btn-nova-consulta" id="btnNovaConsulta">
            <i class="fa-solid fa-rotate-right"></i> Tentar novamente
          </button>
        </div>
      </div>
    `;
  }

  /* ── Serviços realizados (só mostra se houver e OS estiver concluída+) ── */
  function buildServicosHtml(os) {
    const statusMostrar = ['concluido', 'entregue'];
    if (!statusMostrar.includes(os.status)) return '';
    const servicos = os.servicos_realizados || [];
    if (!servicos.length) return '';

    const items = servicos.map(s => `
      <div class="servico-item">
        <span>${s.descricao}</span>
        <span>${formatCurrency(s.valor)}</span>
      </div>
    `).join('');

    return `
      <div class="result-section">
        <div class="result-section__title">
          <i class="fa-solid fa-list-check"></i> Serviços realizados
        </div>
        <div class="servico-list">${items}</div>
      </div>
    `;
  }

  /* ── Horários de funcionamento ── */
  function renderHorarios() {
    return `
      <div style="margin-top:1rem;padding:1.25rem 1.5rem;background:#FFFBEB;border:1px solid #FDE68A;border-radius:var(--radius-lg);">
        <div style="font-weight:700;color:#B45309;margin-bottom:.5rem;display:flex;align-items:center;gap:.4rem;">
          <i class="fa-solid fa-clock" style="font-size:.85rem;"></i>
          Horário de funcionamento
        </div>
        <div class="horarios-box">
          <p><strong>Seg — Sex</strong> <span>09h às 18h</span></p>
          <p><strong>Sábado</strong> <span>09h às 13h</span></p>
          <p><strong>Domingo</strong> <span>Fechado</span></p>
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════
     HELPERS DE STATUS
  ══════════════════════════════════════ */
  function getStatusLabel(status) {
    return {
      aguardando_diagnostico: 'Aguardando Diagnóstico',
      em_reparo:              'Em Reparo',
      aguardando_peca:        'Aguardando Peça',
      aguardando_aprovacao:   'Aguardando Aprovação',
      concluido:              'Pronto para Retirada',
      entregue:               'Entregue',
      cancelado:              'Cancelado',
    }[status] || status;
  }

  function getStatusPubClass(status) {
    return {
      aguardando_diagnostico: 'status-pub--yellow',
      em_reparo:              'status-pub--blue',
      aguardando_peca:        'status-pub--purple',
      aguardando_aprovacao:   'status-pub--orange',
      concluido:              'status-pub--green',
      entregue:               'status-pub--teal',
      cancelado:              'status-pub--red',
    }[status] || '';
  }

  function getStatusIcon(status) {
    return {
      aguardando_diagnostico: '<i class="fa-solid fa-hourglass-half"></i>',
      em_reparo:              '<i class="fa-solid fa-screwdriver-wrench"></i>',
      aguardando_peca:        '<i class="fa-solid fa-box"></i>',
      aguardando_aprovacao:   '<i class="fa-solid fa-circle-question"></i>',
      concluido:              '<i class="fa-solid fa-circle-check"></i>',
      entregue:               '<i class="fa-solid fa-hand-holding-heart"></i>',
      cancelado:              '<i class="fa-solid fa-circle-xmark"></i>',
    }[status] || '';
  }

  function getBanner(status) {
    const map = {
      aguardando_diagnostico: {
        cls: 'status-banner--info',
        icon: 'fa-hourglass-half',
        msg: 'Seu aparelho está aguardando diagnóstico técnico.',
        sub: 'Em breve nossa equipe identificará o problema.',
      },
      em_reparo: {
        cls: 'status-banner--info',
        icon: 'fa-screwdriver-wrench',
        msg: 'Seu aparelho está sendo reparado pela nossa equipe.',
        sub: null,
      },
      aguardando_peca: {
        cls: 'status-banner--warning',
        icon: 'fa-box',
        msg: 'Estamos aguardando a chegada da peça necessária.',
        sub: 'Assim que chegar, daremos continuidade ao reparo.',
      },
      aguardando_aprovacao: {
        cls: 'status-banner--action',
        icon: 'fa-circle-question',
        msg: 'Seu aparelho aguarda a sua aprovação para prosseguir com o serviço.',
        sub: 'Fale com nossa equipe pelo WhatsApp para autorizar o reparo.',
      },
      concluido: {
        cls: 'status-banner--success',
        icon: 'fa-circle-check',
        msg: '✅ Seu aparelho está pronto para retirada na loja!',
        sub: 'Confira nosso horário de funcionamento abaixo.',
      },
      entregue: {
        cls: 'status-banner--neutral',
        icon: 'fa-hand-holding-heart',
        msg: 'Seu aparelho já foi entregue. Obrigado pela confiança!',
        sub: null,
      },
      cancelado: {
        cls: 'status-banner--neutral',
        icon: 'fa-circle-xmark',
        msg: 'Esta ordem de serviço foi cancelada.',
        sub: 'Entre em contato com a loja para mais informações.',
      },
    };
    return map[status] || { cls: 'status-banner--neutral', icon: 'fa-info-circle', msg: 'Consulte nossa equipe.', sub: null };
  }

  /* ── Mascara IMEI: mostra primeiros 5 e últimos 3 ── */
  function mascaraImei(imei) {
    if (!imei || imei.length < 8) return imei;
    const clean = imei.replace(/\D/g, '');
    return clean.slice(0, 5) + '*'.repeat(Math.max(0, clean.length - 8)) + clean.slice(-3);
  }

  /* ── Loading state ── */
  function setLoading(on) {
    document.getElementById('searchIcon').style.display   = on ? 'none'  : '';
    document.getElementById('searchSpinner').style.display = on ? ''     : 'none';
    document.getElementById('btnLabel').textContent = on ? 'Consultando...' : 'Consultar status';
    btnConsultar.disabled = on;
  }

  /* ── Bind "Nova consulta" (delegação) ── */
  resultContent.addEventListener('click', e => {
    if (e.target.closest('#btnNovaConsulta')) {
      resultArea.style.display = 'none';
      resultContent.innerHTML = '';
      inputOs.value  = '';
      inputCpf.value = '';
      inputImei.value = '';
      searchError.textContent = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      inputOs.focus();
    }
  });

  /* ── Helpers de formatação (reutiliza os do os-db.js via global) ── */
  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  }

  function isVencida(os) {
    if (!os.previsao_entrega) return false;
    return new Date(os.previsao_entrega) < new Date();
  }
});
