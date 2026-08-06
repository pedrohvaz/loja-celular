import rateLimit from 'express-rate-limit'

// Login/registro: alvo de força bruta -- limite apertado por IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
})

// Consultas públicas (produtos, OS, categorias, settings de uma loja) --
// sem login, então mais sujeitas a scraping/varredura automatizada
export const publicLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
})

// Consulta pública de OS por CPF/IMEI: busca parcial (contains) sobre dado
// pessoal sem login -- limite bem mais apertado para dificultar varredura
// de fragmentos de CPF/IMEI.
export const sensitiveLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas consultas. Tente novamente em alguns minutos.' },
})
