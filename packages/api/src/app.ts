import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'

import authRoutes from './modules/auth/auth.routes'
import productRoutes from './modules/products/products.routes'
import customerRoutes from './modules/customers/customers.routes'
import orderRoutes from './modules/orders/orders.routes'
import serviceOrderRoutes from './modules/service-orders/service-orders.routes'
import transactionRoutes from './modules/finance/transactions/transactions.routes'
import categoryRoutes from './modules/finance/categories/categories.routes'
import cashRegisterRoutes from './modules/finance/cash-register/cash-register.routes'
import salesRoutes from './modules/sales/sales.routes'
import campaignRoutes from './modules/campaigns/campaigns.routes'
import usersRoutes from './modules/users/users.routes'
import settingsRoutes from './modules/settings/settings.routes'
import uploadRoutes from './modules/upload/upload.routes'

import superAdminAuthRoutes from './modules/super-admin/auth/super-admin-auth.routes'
import superAdminTenantsRoutes from './modules/super-admin/tenants/tenants.routes'
import superAdminPlansRoutes from './modules/super-admin/plans/plans.routes'
import { authenticateSuperAdmin } from './shared/middleware/superAdminAuth'
import { checkTenantActive, requireModule } from './shared/middleware/tenantGuard'

import { errorHandler } from './shared/utils/errors'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Auth & registro públicos
app.use('/api/auth', authRoutes)

// Middleware global de status do tenant (seguro para rotas públicas)
app.use('/api', checkTenantActive)

// Rotas do tenant — cada grupo com seu requireModule
app.use('/api/products', requireModule('store'), productRoutes)
app.use('/api/orders', requireModule('store'), orderRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/service-orders', requireModule('service_orders'), serviceOrderRoutes)
app.use('/api/finance/transactions', requireModule('finance'), transactionRoutes)
app.use('/api/finance/categories', requireModule('finance'), categoryRoutes)
app.use('/api/finance/cash-register', requireModule('finance'), cashRegisterRoutes)
app.use('/api/sales', requireModule('sales'), salesRoutes)
app.use('/api/campaigns', requireModule('campaigns'), campaignRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/upload', uploadRoutes)

// Super Admin routes
app.use('/api/super-admin/auth', superAdminAuthRoutes)
app.use('/api/super-admin/tenants', authenticateSuperAdmin, superAdminTenantsRoutes)
app.use('/api/super-admin/plans', authenticateSuperAdmin, superAdminPlansRoutes)

app.use(errorHandler)

export default app
