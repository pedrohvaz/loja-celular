import { create } from 'zustand'

interface TrialInfo {
  daysLeft: number
  expired: boolean
}

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EMPLOYEE'
  tenantId: string
  tenantName: string
  tenantModules: string[]
  tenantStatus?: string
  tenantSettings?: Record<string, unknown> | null
  tenantPlan?: { name: string; slug: string; maxUsers: number } | null
  trial?: TrialInfo | null
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  updateUser: (data: Partial<AuthUser>) => void
  logout: () => void
}

export const useAuth = create<AuthStore>(set => ({
  user: (() => {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  updateUser: (data) => set(state => {
    if (!state.user) return state
    const updated = { ...state.user, ...data }
    localStorage.setItem('user', JSON.stringify(updated))
    return { user: updated }
  }),
  logout: () => {
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
  },
}))
