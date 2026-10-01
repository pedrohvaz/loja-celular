/* ============================================================
   PLANETA CELULAR — config.js
   Configuração da API e da loja exibida no site público.
============================================================ */
// Em localhost usa a API local; publicado, usa a API na Vercel.
const API_BASE_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:3333/api'
  : 'https://loja-celular-ashy.vercel.app/api';

// Loja do site público: ?loja=codigo abre o site de qualquer loja do SaaS
// e fica lembrada na aba; sem isso, usa a loja padrão.
const DEFAULT_TENANT_SLUG = 'demo';
const TENANT_SLUG = (() => {
  const fromUrl = new URLSearchParams(location.search).get('loja');
  try {
    if (fromUrl && /^[a-z0-9-]{3,40}$/.test(fromUrl)) sessionStorage.setItem('pc_store_slug', fromUrl);
    return sessionStorage.getItem('pc_store_slug') || DEFAULT_TENANT_SLUG;
  } catch {
    return fromUrl || DEFAULT_TENANT_SLUG;
  }
})();
