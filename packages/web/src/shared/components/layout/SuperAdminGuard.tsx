import { Navigate } from 'react-router-dom'
import { useSuperAdminAuth } from '@/shared/hooks/useSuperAdminAuth'

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSuperAdminAuth()
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />
  return <>{children}</>
}
