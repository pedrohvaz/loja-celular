import nodemailer from 'nodemailer'

function createTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function send(to: string, subject: string, html: string) {
  const transport = createTransport()
  if (!transport) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
    return
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@sistema.com',
    to,
    subject,
    html,
  })
}

export async function sendWelcome(to: string, name: string, tenantName: string, slug: string, trialDays: number) {
  const loginUrl = `${process.env.APP_URL ?? 'http://localhost:5173'}/login`
  await send(to, `Bem-vindo ao sistema, ${name}!`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2>Bem-vindo, ${name}! 🎉</h2>
      <p>Sua empresa <strong>${tenantName}</strong> foi criada com sucesso.</p>
      <p>Você tem <strong>${trialDays} dias de trial gratuito</strong> para explorar todas as funcionalidades.</p>
      <p>Acesse o sistema com o slug: <code>${slug}</code></p>
      <a href="${loginUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">Acessar o sistema</a>
      <p style="color:#888;margin-top:32px;font-size:13px">Se precisar de ajuda, responda este e-mail.</p>
    </div>
  `)
}

export async function sendTrialExpiring(to: string, name: string, tenantName: string, daysLeft: number) {
  const loginUrl = `${process.env.APP_URL ?? 'http://localhost:5173'}/login`
  await send(to, `Seu trial vence em ${daysLeft} dia(s) — ${tenantName}`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2>⚠️ Seu trial está encerrando</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>O período de trial da empresa <strong>${tenantName}</strong> vence em <strong>${daysLeft} dia(s)</strong>.</p>
      <p>Entre em contato com nosso suporte para ativar seu plano e não perder o acesso.</p>
      <a href="${loginUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">Acessar o sistema</a>
    </div>
  `)
}

export async function sendTrialExpired(to: string, name: string, tenantName: string) {
  await send(to, `Trial expirado — ${tenantName}`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2>Seu trial expirou</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>O período de trial da empresa <strong>${tenantName}</strong> chegou ao fim.</p>
      <p>Entre em contato para reativar sua conta.</p>
    </div>
  `)
}

export async function sendAccountSuspended(to: string, name: string, tenantName: string) {
  await send(to, `Conta suspensa — ${tenantName}`, `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2>Conta suspensa</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>A conta da empresa <strong>${tenantName}</strong> foi suspensa.</p>
      <p>Entre em contato com o suporte para regularizar a situação.</p>
    </div>
  `)
}
