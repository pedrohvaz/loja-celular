import { PrismaClient, TransactionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Super Admin ────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('superadmin123', 10)
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@sistema.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@sistema.com',
      passwordHash: superAdminHash,
    },
  })

  // ── Plans ──────────────────────────────────────────────────────────────────
  const planBasico = await prisma.plan.upsert({
    where: { slug: 'basico' },
    update: {},
    create: {
      name: 'Básico',
      slug: 'basico',
      description: 'Ideal para lojas pequenas',
      price: 99.90,
      maxUsers: 3,
      modules: ['service_orders', 'sales'],
      isActive: true,
    },
  })

  const planPro = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Pro',
      slug: 'pro',
      description: 'Para lojas em crescimento',
      price: 199.90,
      maxUsers: 10,
      modules: ['store', 'service_orders', 'finance', 'sales', 'campaigns'],
      isActive: true,
    },
  })

  console.log(`Plans: ${planBasico.name}, ${planPro.name}`)
  console.log('Super Admin: superadmin@sistema.com / superadmin123')

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Minha Empresa',
      slug: 'demo',
      modules: ['store', 'service_orders', 'finance', 'sales'],
      settings: {
        whatsapp: '5511999999999',
        address: 'Rua Exemplo, 123 — São Paulo/SP',
        logo: null,
        primaryColor: '#0066FF',
      },
    },
  })

  const adminHash = await bcrypt.hash('admin123', 10)
  const employeeHash = await bcrypt.hash('func123', 10)

  await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrador',
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email_tenantId: { email: 'funcionario@demo.com', tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Funcionário',
      email: 'funcionario@demo.com',
      passwordHash: employeeHash,
      role: 'EMPLOYEE',
    },
  })

  const defaultCategories = [
    { name: 'Serviços de manutenção', type: TransactionType.INCOME, icon: 'wrench', isDefault: true },
    { name: 'Venda de produtos', type: TransactionType.INCOME, icon: 'smartphone', isDefault: true },
    { name: 'Venda de acessórios', type: TransactionType.INCOME, icon: 'package', isDefault: true },
    { name: 'Outros (receita)', type: TransactionType.INCOME, icon: 'plus-circle', isDefault: true },
    { name: 'Compra de peças', type: TransactionType.EXPENSE, icon: 'cpu', isDefault: true },
    { name: 'Compra de estoque', type: TransactionType.EXPENSE, icon: 'shopping-cart', isDefault: true },
    { name: 'Aluguel', type: TransactionType.EXPENSE, icon: 'home', isDefault: true },
    { name: 'Energia elétrica', type: TransactionType.EXPENSE, icon: 'zap', isDefault: true },
    { name: 'Internet e telefone', type: TransactionType.EXPENSE, icon: 'wifi', isDefault: true },
    { name: 'Salários', type: TransactionType.EXPENSE, icon: 'users', isDefault: true },
    { name: 'Marketing', type: TransactionType.EXPENSE, icon: 'megaphone', isDefault: true },
    { name: 'Frete', type: TransactionType.EXPENSE, icon: 'truck', isDefault: true },
    { name: 'Impostos', type: TransactionType.EXPENSE, icon: 'file-text', isDefault: true },
    { name: 'Outros (despesa)', type: TransactionType.EXPENSE, icon: 'minus-circle', isDefault: true },
  ]

  for (const cat of defaultCategories) {
    const existing = await prisma.financeCategory.findFirst({
      where: { tenantId: tenant.id, name: cat.name, type: cat.type },
    })
    if (!existing) {
      await prisma.financeCategory.create({ data: { ...cat, tenantId: tenant.id } })
    }
  }

  const products = [
    { name: 'iPhone 13', category: 'smartphones', brand: 'apple', condition: 'seminovo', price: 1799, oldPrice: 2099, description: '128GB · Preto · iOS 17 · Bateria 92%', imageUrl: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400', inStock: true },
    { name: 'iPhone 12', category: 'smartphones', brand: 'apple', condition: 'usado', price: 1299, oldPrice: null, description: '64GB · Branco · iOS 16 · Bateria 87%', imageUrl: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80?w=400', inStock: true },
    { name: 'Samsung Galaxy S23', category: 'smartphones', brand: 'samsung', condition: 'novo', price: 3499, oldPrice: 3999, description: '256GB · Phantom Black · Android 13', imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400', inStock: true },
    { name: 'Samsung Galaxy A54', category: 'smartphones', brand: 'samsung', condition: 'novo', price: 1599, oldPrice: null, description: '128GB · Branco · Android 13', imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400', inStock: true },
    { name: 'Motorola Edge 40', category: 'smartphones', brand: 'motorola', condition: 'novo', price: 1899, oldPrice: 2199, description: '256GB · Eclipse Black · Android 13', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', inStock: true },
    { name: 'Xiaomi Redmi Note 12', category: 'smartphones', brand: 'xiaomi', condition: 'novo', price: 899, oldPrice: null, description: '128GB · Midnight Black · Android 12', imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400', inStock: true },
    { name: 'Capinha iPhone 13 Premium', category: 'capinhas', brand: null, condition: 'novo', price: 49.90, oldPrice: null, description: 'Silicone premium, anti-impacto', imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400', inStock: true },
    { name: 'Capinha Samsung S23 Vidro', category: 'capinhas', brand: null, condition: 'novo', price: 59.90, oldPrice: null, description: 'Vidro temperado, acabamento premium', imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400', inStock: true },
    { name: 'Película Hydrogel iPhone 13', category: 'peliculas', brand: null, condition: 'novo', price: 29.90, oldPrice: null, description: 'Hydrogel full cover, auto-regenerativa', imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400', inStock: true },
    { name: 'Carregador 65W USB-C', category: 'carregadores', brand: null, condition: 'novo', price: 89.90, oldPrice: 119.90, description: 'Carregamento rápido, cabo incluso', imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400', inStock: true },
    { name: 'Fone Bluetooth TWS', category: 'audio', brand: null, condition: 'novo', price: 149.90, oldPrice: null, description: 'True wireless, 24h de bateria total', imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400', inStock: true },
    { name: 'Cabo USB-C Reforçado 1m', category: 'cabos', brand: null, condition: 'novo', price: 24.90, oldPrice: null, description: 'Nylon trançado, transferência 100W', imageUrl: 'https://images.unsplash.com/photo-1583394293214-0b4f05b89fe0?w=400', inStock: true },
  ]

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { tenantId: tenant.id, name: p.name } })
    if (!existing) {
      await prisma.product.create({ data: { ...p, tenantId: tenant.id, price: p.price, oldPrice: p.oldPrice ?? undefined } })
    }
  }

  console.log('Seed completed!')
  console.log(`Tenant: ${tenant.name} (slug: ${tenant.slug})`)
  console.log('Users: admin@demo.com / admin123  |  funcionario@demo.com / func123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
