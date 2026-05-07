import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import api from '@/shared/api/axios'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
  const { isAuthenticated, user, updateUser } = useAuth()

  // Atualiza trial/status do tenant a cada mount
  useEffect(() => {
    if (!isAuthenticated) return
    api.get('/auth/me').then(({ data }) => {
      updateUser({
        tenantStatus: data.tenantStatus,
        tenantSlug: data.tenantSlug,
        tenantModules: data.tenantModules,
        tenantSettings: data.tenantSettings,
        tenantPlan: data.tenantPlan,
        trial: data.trial,
      })
    }).catch(() => {})
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireAdmin && user?.role !== 'ADMIN') return <Navigate to="/admin/dashboard" replace />

  return <>{children}</>
}
