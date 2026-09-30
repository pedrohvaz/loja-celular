/* ============================================================
   PLANETA CELULAR — config.js
   Configuração da API. Site é single-tenant: aponta sempre para
   a mesma empresa (TENANT_SLUG).
============================================================ */
// Em localhost usa a API local; publicado, usa a API na Vercel.
const API_BASE_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:3333/api'
  : 'https://loja-celular-ashy.vercel.app/api';
const TENANT_SLUG = 'demo';
