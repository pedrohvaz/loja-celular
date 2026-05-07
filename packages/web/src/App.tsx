import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '@/shared/components/layout/AuthGuard'
import AdminLayout from '@/shared/components/layout/AdminLayout'
import SuperAdminGuard from '@/shared/components/layout/SuperAdminGuard'
import SuperAdminLayout from '@/shared/components/layout/SuperAdminLayout'

import LandingPage from '@/modules/landing/LandingPage'
import LoginPage from '@/modules/auth/LoginPage'
import RegisterPage from '@/modules/register/RegisterPage'
import StorePage from '@/modules/store/StorePage'
import ConsultaOS from '@/modules/os-public/ConsultaOS'

import SuperAdminLoginPage from '@/modules/super-admin/auth/SuperAdminLoginPage'
import SuperAdminDashboard from '@/modules/super-admin/dashboard/SuperAdminDashboard'
import TenantsPage from '@/modules/super-admin/tenants/TenantsPage'
import TenantDetailPage from '@/modules/super-admin/tenants/TenantDetailPage'
import PlansPage from '@/modules/super-admin/plans/PlansPage'

import DashboardPage from '@/modules/admin/dashboard/DashboardPage'
import ProductsPage from '@/modules/admin/products/ProductsPage'
import OrdersPage from '@/modules/admin/orders/OrdersPage'
import CustomersPage from '@/modules/admin/customers/CustomersPage'
import ServiceOrdersPage from '@/modules/admin/service-orders/ServiceOrdersPage'
import ServiceOrderForm from '@/modules/admin/service-orders/ServiceOrderForm'
import ServiceOrderDetail from '@/modules/admin/service-orders/ServiceOrderDetail'
import SalesPage from '@/modules/admin/sales/SalesPage'
import FinanceDashboard from '@/modules/admin/finance/FinanceDashboard'
import TransactionsPage from '@/modules/admin/finance/TransactionsPage'
import CashRegisterPage from '@/modules/admin/finance/CashRegisterPage'
import CampaignsPage from '@/modules/admin/campaigns/CampaignsPage'
import SettingsPage from '@/modules/admin/settings/SettingsPage'

function AccountsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contas a Receber / Pagar</h1>
      <p className="text-muted-foreground">Acesse Lançamentos e filtre por status Pendente para ver suas contas.</p>
    </div>
  )
}

function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <p className="text-muted-foreground">Em breve — relatórios detalhados por período.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/loja/:slug" element={<StorePage />} />
        <Route path="/loja" element={<StorePage />} />
        <Route path="/consulta-os/:slug" element={<ConsultaOS />} />
        <Route path="/consulta-os" element={<ConsultaOS />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="produtos" element={<ProductsPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="clientes" element={<CustomersPage />} />
          <Route path="os" element={<ServiceOrdersPage />} />
          <Route path="os/nova" element={<ServiceOrderForm />} />
          <Route path="os/:id" element={<ServiceOrderDetail />} />
          <Route path="vendas" element={<SalesPage />} />
          <Route
            path="financeiro/dashboard"
            element={
              <AuthGuard requireAdmin>
                <FinanceDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="financeiro/lancamentos"
            element={
              <AuthGuard requireAdmin>
                <TransactionsPage />
              </AuthGuard>
            }
          />
          <Route
            path="financeiro/contas"
            element={
              <AuthGuard requireAdmin>
                <AccountsPage />
              </AuthGuard>
            }
          />
          <Route
            path="financeiro/caixa"
            element={
              <AuthGuard requireAdmin>
                <CashRegisterPage />
              </AuthGuard>
            }
          />
          <Route
            path="financeiro/relatorios"
            element={
              <AuthGuard requireAdmin>
                <ReportsPage />
              </AuthGuard>
            }
          />
          <Route path="campanhas" element={<CampaignsPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />

        </Route>

        {/* Super Admin */}
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route
          path="/super-admin"
          element={
            <SuperAdminGuard>
              <SuperAdminLayout />
            </SuperAdminGuard>
          }
        >
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
          <Route path="plans" element={<PlansPage />} />
        </Route>

        {/* Landing & catch-all */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
