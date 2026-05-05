import { create } from 'zustand'

interface SuperAdminUser {
  id: string
  name: string
  email: string
}

interface SuperAdminAuthStore {
  superAdmin: SuperAdminUser | null
  isAuthenticated: boolean
  login: (superAdmin: SuperAdminUser, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useSuperAdminAuth = create<SuperAdminAuthStore>(set => ({
  superAdmin: (() => {
    try {
      const u = localStorage.getItem('superAdmin')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })(),
  isAuthenticated: !!localStorage.getItem('superAdminAccessToken'),
  login: (superAdmin, accessToken, refreshToken) => {
    localStorage.setItem('superAdminAccessToken', accessToken)
    localStorage.setItem('superAdminRefreshToken', refreshToken)
    localStorage.setItem('superAdmin', JSON.stringify(superAdmin))
    set({ superAdmin, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('superAdminAccessToken')
    localStorage.removeItem('superAdminRefreshToken')
    localStorage.removeItem('superAdmin')
    set({ superAdmin: null, isAuthenticated: false })
  },
}))
